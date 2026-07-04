/**
 * Pluggable SMS/OTP provider interface (Decision #5 in DECISIONS.md).
 * The default is the `console` provider until the client confirms MSG91 / Twilio;
 * swapping providers is a config change (SMS_PROVIDER env), not a code change.
 */
export interface SmsProvider {
  readonly name: string;
  /** Send an OTP code to a mobile number (E.164). Resolves when accepted for delivery. */
  sendOtp(mobileNumber: string, code: string): Promise<void>;
}
