import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/async-handler';
import { authGuard } from '../../middleware/auth-guard';
import { optionalAuth } from '../../middleware/optional-auth';
import { otpSendIpLimiter, otpVerifyIpLimiter } from '../../middleware/rate-limit';
import { sendOtpSchema, verifyOtpSchema, refreshSchema, logoutSchema } from './auth.schemas';

const router = Router();

// POST /api/auth/otp/send — generate + send OTP (Epic 3.1)
router.post(
  '/otp/send',
  otpSendIpLimiter,
  validate({ body: sendOtpSchema }),
  asyncHandler(authController.sendOtp),
);

// POST /api/auth/otp/verify — verify OTP, issue tokens (Epic 3.2). Per-IP limited
// to blunt distributed OTP brute-force on top of the per-number attempt cap.
router.post(
  '/otp/verify',
  otpVerifyIpLimiter,
  validate({ body: verifyOtpSchema }),
  asyncHandler(authController.verifyOtp),
);

// POST /api/auth/refresh — rotate refresh token, new access token (Epic 3.3)
router.post('/refresh', validate({ body: refreshSchema }), asyncHandler(authController.refresh));

// POST /api/auth/logout — revoke refresh token (Epic 3.3)
router.post('/logout', optionalAuth, validate({ body: logoutSchema }), asyncHandler(authController.logout));

// POST /api/auth/logout-all — revoke all sessions for the authenticated user
router.post('/logout-all', authGuard, asyncHandler(authController.logoutAll));

export const authRoutes = router;
