import type { Request, Response } from 'express';
import { authService } from './auth.service';
import { sendSuccess } from '../../utils/response';
import type { LogoutInput, RefreshInput, SendOtpInput, VerifyOtpInput } from './auth.schemas';

export const authController = {
  async sendOtp(req: Request, res: Response): Promise<void> {
    const { mobileNumber } = req.body as SendOtpInput;
    const result = await authService.sendOtp(mobileNumber);
    sendSuccess(res, { sent: true, ...result }, 200);
  },

  async verifyOtp(req: Request, res: Response): Promise<void> {
    const { mobileNumber, otp, name } = req.body as VerifyOtpInput;
    const result = await authService.verifyOtp(mobileNumber, otp, name, { ip: req.ip });
    sendSuccess(res, result, 200);
  },

  async refresh(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body as RefreshInput;
    const tokens = await authService.refresh(refreshToken, { ip: req.ip });
    sendSuccess(res, tokens, 200);
  },

  async logout(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body as LogoutInput;
    await authService.logout(refreshToken, { ip: req.ip, userId: req.user?.id });
    sendSuccess(res, { loggedOut: true }, 200);
  },

  /** Revoke every session for the authenticated user (requires a valid access token). */
  async logoutAll(req: Request, res: Response): Promise<void> {
    const result = await authService.logoutAll(req.user!.id, { ip: req.ip });
    sendSuccess(res, { loggedOut: true, ...result }, 200);
  },
};
