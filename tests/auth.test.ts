// Mock the repository + OTP provider so auth logic is tested end-to-end over HTTP
// without a live DB or WhatsApp gateway.
jest.mock('../src/modules/auth/auth.repository', () => ({
  authRepository: {
    countOtpRequestsSince: jest.fn(),
    invalidatePreviousOtps: jest.fn(),
    createOtpRequest: jest.fn(),
    findLatestUnverifiedOtp: jest.fn(),
    markOtpVerified: jest.fn(),
    incrementOtpAttempts: jest.fn(),
    findUserByMobile: jest.fn(),
    createUser: jest.fn(),
    createRefreshToken: jest.fn(),
    findRefreshTokenByHash: jest.fn(),
    revokeRefreshToken: jest.fn(),
    revokeRefreshTokenByHash: jest.fn(),
    revokeAllForUser: jest.fn(),
    rotateRefreshToken: jest.fn(),
  },
}));
jest.mock('../src/modules/auth/otp', () => ({
  otpProvider: { name: 'test', sendOtp: jest.fn().mockResolvedValue(undefined) },
}));

import request from 'supertest';
import { createApp } from '../src/app';
import { authRepository } from '../src/modules/auth/auth.repository';
import { otpProvider } from '../src/modules/auth/otp';
import { hashOtp } from '../src/utils/crypto';
import { signAccessToken } from '../src/utils/jwt';
import { authGuard } from '../src/middleware/auth-guard';
import { AppError } from '../src/utils/app-error';
import type { NextFunction, Request, Response } from 'express';

const repo = authRepository as jest.Mocked<typeof authRepository>;
const sms = otpProvider as unknown as { sendOtp: jest.Mock };
const app = createApp();

const MOBILE = '+919876543210';

const otpRecord = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'otp-1',
  mobileNumber: MOBILE,
  otpHash: 'placeholder',
  expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  verified: false,
  attempts: 0,
  createdAt: new Date(),
  ...overrides,
});

describe('POST /api/auth/otp/send (Epic 3.1)', () => {
  it('sends a 6-digit OTP and returns success', async () => {
    repo.countOtpRequestsSince.mockResolvedValue(0);
    repo.createOtpRequest.mockResolvedValue(otpRecord() as never);

    const res = await request(app).post('/api/auth/otp/send').send({ mobileNumber: MOBILE });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: { sent: true } });
    expect(sms.sendOtp).toHaveBeenCalledTimes(1);
    const [, code] = sms.sendOtp.mock.calls[0];
    expect(code).toMatch(/^\d{6}$/);
  });

  it('rejects a malformed mobile number with the validation envelope', async () => {
    const res = await request(app).post('/api/auth/otp/send').send({ mobileNumber: '12345' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } });
    expect(sms.sendOtp).not.toHaveBeenCalled();
  });

  it('returns 429 when the per-number hourly limit is reached', async () => {
    repo.countOtpRequestsSince.mockResolvedValue(3); // OTP_MAX_PER_HOUR default = 3

    const res = await request(app).post('/api/auth/otp/send').send({ mobileNumber: MOBILE });

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('OTP_RATE_LIMITED');
    expect(sms.sendOtp).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/otp/verify (Epic 3.2)', () => {
  it('verifies a correct OTP, creates the user on first login, and issues tokens', async () => {
    repo.findLatestUnverifiedOtp.mockResolvedValue(
      otpRecord({ otpHash: await hashOtp('123456') }) as never,
    );
    repo.markOtpVerified.mockResolvedValue(otpRecord({ verified: true }) as never);
    repo.findUserByMobile.mockResolvedValue(null);
    repo.createUser.mockResolvedValue({ id: 'user-1', mobileNumber: MOBILE } as never);
    repo.createRefreshToken.mockResolvedValue({ id: 'rt-1' } as never);

    const res = await request(app)
      .post('/api/auth/otp/verify')
      .send({ mobileNumber: MOBILE, otp: '123456', name: 'Asha' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ isNewUser: true });
    expect(typeof res.body.data.accessToken).toBe('string');
    expect(typeof res.body.data.refreshToken).toBe('string');
    expect(repo.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ mobileNumber: MOBILE, name: 'Asha' }),
    );
  });

  it('rejects an incorrect OTP and increments attempts', async () => {
    repo.findLatestUnverifiedOtp.mockResolvedValue(
      otpRecord({ otpHash: await hashOtp('000000') }) as never,
    );

    const res = await request(app)
      .post('/api/auth/otp/verify')
      .send({ mobileNumber: MOBILE, otp: '123456' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_OTP');
    expect(repo.incrementOtpAttempts).toHaveBeenCalledWith('otp-1');
    expect(repo.markOtpVerified).not.toHaveBeenCalled();
  });

  it('rejects an expired OTP with the SAME generic error (no enumeration oracle)', async () => {
    repo.findLatestUnverifiedOtp.mockResolvedValue(
      otpRecord({
        expiresAt: new Date(Date.now() - 1000),
        otpHash: await hashOtp('123456'),
      }) as never,
    );

    const res = await request(app)
      .post('/api/auth/otp/verify')
      .send({ mobileNumber: MOBILE, otp: '123456' });

    expect(res.status).toBe(400);
    // Expired and "no outstanding OTP" must be indistinguishable → generic INVALID_OTP.
    expect(res.body.error.code).toBe('INVALID_OTP');
  });

  it('returns INVALID_OTP when no outstanding OTP exists', async () => {
    repo.findLatestUnverifiedOtp.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/otp/verify')
      .send({ mobileNumber: MOBILE, otp: '123456' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_OTP');
  });
});

describe('POST /api/auth/refresh (Epic 3.3)', () => {
  it('rotates a valid refresh token and returns a new pair', async () => {
    repo.rotateRefreshToken.mockResolvedValue({
      status: 'ok',
      user: { id: 'user-1', mobileNumber: MOBILE },
    } as never);

    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'raw-token' });

    expect(res.status).toBe(200);
    expect(typeof res.body.data.accessToken).toBe('string');
    expect(typeof res.body.data.refreshToken).toBe('string');
    expect(repo.rotateRefreshToken).toHaveBeenCalledTimes(1); // atomic rotate-and-issue
  });

  it('rejects a revoked/expired/unknown refresh token', async () => {
    repo.rotateRefreshToken.mockResolvedValue({ status: 'invalid' } as never);

    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'nope' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('REFRESH_TOKEN_INVALID');
  });

  it('detects refresh-token reuse and forces re-auth (breach response)', async () => {
    repo.rotateRefreshToken.mockResolvedValue({ status: 'reuse', userId: 'user-1' } as never);

    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'stolen' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('REFRESH_TOKEN_INVALID');
  });
});

describe('POST /api/auth/logout (Epic 3.3)', () => {
  it('revokes the refresh token', async () => {
    repo.revokeRefreshTokenByHash.mockResolvedValue(1);

    const res = await request(app).post('/api/auth/logout').send({ refreshToken: 'raw-token' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ loggedOut: true });
    expect(repo.revokeRefreshTokenByHash).toHaveBeenCalledTimes(1);
  });
});

describe('authGuard middleware (Epic 3.4)', () => {
  const makeRes = () => ({}) as Response;

  it('rejects a request with no Authorization header', () => {
    const next = jest.fn() as NextFunction;
    authGuard({ header: () => undefined } as unknown as Request, makeRes(), next);
    const err = (next as jest.Mock).mock.calls[0][0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.httpStatus).toBe(401);
    expect(err.code).toBe('MISSING_TOKEN');
  });

  it('rejects an invalid token', () => {
    const next = jest.fn() as NextFunction;
    authGuard({ header: () => 'Bearer not-a-real-jwt' } as unknown as Request, makeRes(), next);
    const err = (next as jest.Mock).mock.calls[0][0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe('TOKEN_INVALID');
  });

  it('accepts a valid access token and populates req.user', () => {
    const token = signAccessToken({ sub: 'user-1', mobileNumber: MOBILE });
    const req = { header: () => `Bearer ${token}` } as unknown as Request;
    const next = jest.fn() as NextFunction;

    authGuard(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith(); // no error
    expect(req.user).toEqual({ id: 'user-1', mobileNumber: MOBILE });
  });
});
