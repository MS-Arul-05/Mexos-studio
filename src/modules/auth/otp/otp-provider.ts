/**
 * Pluggable OTP delivery provider. WhatsApp (Meta Cloud API) is the only real
 * channel — SMS was dropped per client decision (2026-07-09); `console` remains
 * for dev/CI. Swapping providers is a config change (OTP_PROVIDER env), not a
 * code change.
 */
export interface OtpProvider {
  readonly name: string;
  /** Send an OTP code to a mobile number (E.164). Resolves when accepted for delivery. */
  sendOtp(mobileNumber: string, code: string): Promise<void>;
}
