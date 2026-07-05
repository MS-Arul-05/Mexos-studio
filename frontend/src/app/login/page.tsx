"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/sections/Footer";
import { Smartphone, ArrowRight, Shield, RefreshCw, User, Sparkles } from "lucide-react";
import { auth, toE164, ApiError } from "@/lib/api";

type Step = "phone" | "otp" | "name";

export default function LoginPage() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [name, setName] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sectionRef = useRef<HTMLElement>(null);
  const [vis, setVis] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [resendTimer]);

  const sendOtp = async () => {
    if (phone.length < 10) return;
    setLoading(true);
    setError("");
    try {
      await auth.sendOtp(toE164(phone));
      setStep("otp");
      setResendTimer(30);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not send OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const verifyOtp = async () => {
    const code = otp.join("");
    if (code.length < 6) return;
    setLoading(true);
    setError("");
    try {
      const profile = await auth.verifyOtp(toE164(phone), code);
      // Returning users with a name skip onboarding.
      if (profile.name) window.location.href = "/account";
      else setStep("name");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Verification failed. Try again.");
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const completeSignup = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      await auth.setName(name.trim());
      window.location.href = "/account";
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save your name.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main ref={sectionRef} style={{ backgroundColor: "#FFF8F3", paddingTop: 72, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 440, width: "100%", padding: "60px 28px 80px" }}>
          {/* Card */}
          <div
            style={{
              backgroundColor: "#fff", borderRadius: 24, border: "1px solid rgba(241,229,220,0.5)",
              padding: "40px 36px", boxShadow: "0 8px 40px rgba(0,0,0,0.04)",
              opacity: vis ? 1 : 0, transform: vis ? "translateY(0) scale(1)" : "translateY(16px) scale(0.98)",
              transition: "all 0.7s cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            {/* Logo mark */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16,
                background: "linear-gradient(135deg, #F6B49A, #E9987A)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 6px 20px rgba(233,152,122,0.3)",
              }}>
                {step === "phone" && <Smartphone size={22} color="#fff" strokeWidth={1.8} />}
                {step === "otp" && <Shield size={22} color="#fff" strokeWidth={1.8} />}
                {step === "name" && <User size={22} color="#fff" strokeWidth={1.8} />}
              </div>
            </div>

            {error && (
              <p style={{ fontSize: 13, color: "#DC2626", textAlign: "center", margin: "0 0 16px", fontFamily: "var(--font-poppins), sans-serif" }}>
                {error}
              </p>
            )}

            {/* ── PHONE STEP ── */}
            {step === "phone" && (
              <>
                <h1 style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: "#1F2937", margin: "0 0 8px", textAlign: "center" }}>
                  Welcome Back
                </h1>
                <p style={{ fontSize: 14, color: "#6B7280", textAlign: "center", margin: "0 0 32px", fontFamily: "var(--font-poppins), sans-serif" }}>
                  Enter your mobile number to continue
                </p>

                <label style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", display: "block", margin: "0 0 8px", fontFamily: "var(--font-poppins), sans-serif" }}>
                  Mobile Number
                </label>
                <div style={{ position: "relative", marginBottom: 24 }}>
                  <span style={{
                    position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
                    fontSize: 14, fontWeight: 600, color: "#6B7280", fontFamily: "var(--font-poppins), sans-serif",
                  }}>
                    +91
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="99999 99999"
                    maxLength={10}
                    autoFocus
                    style={{
                      width: "100%", padding: "15px 16px 15px 52px", borderRadius: 14,
                      border: "1.5px solid rgba(241,229,220,0.7)", backgroundColor: "#FFF8F3",
                      fontSize: 16, color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif",
                      outline: "none", transition: "border-color 0.3s", letterSpacing: 1,
                    }}
                    className="login-input"
                  />
                </div>

                <button
                  onClick={sendOtp}
                  disabled={phone.length < 10 || loading}
                  className="login-btn"
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "15px", borderRadius: 14,
                    backgroundColor: phone.length >= 10 ? "#E9987A" : "#E5E7EB",
                    color: phone.length >= 10 ? "#fff" : "#9CA3AF",
                    fontSize: 15, fontWeight: 700, border: "none",
                    cursor: phone.length >= 10 ? "pointer" : "not-allowed",
                    fontFamily: "var(--font-poppins), sans-serif",
                    boxShadow: phone.length >= 10 ? "0 8px 28px rgba(233,152,122,0.35)" : "none",
                    transition: "all 0.35s cubic-bezier(0.22,1,0.36,1)",
                  }}
                >
                  {loading ? "Sending..." : <> Send OTP <ArrowRight size={15} /></>}
                </button>
              </>
            )}

            {/* ── OTP STEP ── */}
            {step === "otp" && (
              <>
                <h1 style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: "#1F2937", margin: "0 0 8px", textAlign: "center" }}>
                  Verify OTP
                </h1>
                <p style={{ fontSize: 14, color: "#6B7280", textAlign: "center", margin: "0 0 32px", fontFamily: "var(--font-poppins), sans-serif" }}>
                  We sent a 6-digit code to <span style={{ fontWeight: 600, color: "#1F2937" }}>+91 {phone}</span>
                </p>

                {/* OTP boxes */}
                <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 24 }}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      style={{
                        width: 48, height: 56, borderRadius: 12, textAlign: "center",
                        border: digit ? "2px solid #E9987A" : "1.5px solid rgba(241,229,220,0.7)",
                        backgroundColor: digit ? "rgba(233,152,122,0.04)" : "#FFF8F3",
                        fontSize: 22, fontWeight: 700, color: "#1F2937",
                        fontFamily: "var(--font-poppins), sans-serif",
                        outline: "none", transition: "all 0.25s ease",
                      }}
                      className="otp-box"
                    />
                  ))}
                </div>

                {/* Resend */}
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                  {resendTimer > 0 ? (
                    <p style={{ fontSize: 13, color: "#9CA3AF", fontFamily: "var(--font-poppins), sans-serif" }}>
                      Resend in <span style={{ fontWeight: 600, color: "#E9987A" }}>{resendTimer}s</span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { void auth.sendOtp(toE164(phone)).catch(() => undefined); setResendTimer(30); setOtp(["","","","","",""]); }}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: 13, fontWeight: 600, color: "#E9987A",
                        fontFamily: "var(--font-poppins), sans-serif",
                      }}
                    >
                      <RefreshCw size={13} /> Resend OTP
                    </button>
                  )}
                </div>

                <button
                  onClick={verifyOtp}
                  disabled={otp.join("").length < 6 || loading}
                  className="login-btn"
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "15px", borderRadius: 14,
                    backgroundColor: otp.join("").length >= 6 ? "#E9987A" : "#E5E7EB",
                    color: otp.join("").length >= 6 ? "#fff" : "#9CA3AF",
                    fontSize: 15, fontWeight: 700, border: "none",
                    cursor: otp.join("").length >= 6 ? "pointer" : "not-allowed",
                    fontFamily: "var(--font-poppins), sans-serif",
                    boxShadow: otp.join("").length >= 6 ? "0 8px 28px rgba(233,152,122,0.35)" : "none",
                    transition: "all 0.35s cubic-bezier(0.22,1,0.36,1)",
                  }}
                >
                  {loading ? "Verifying..." : "Verify & Continue"}
                </button>

                <button
                  onClick={() => { setStep("phone"); setOtp(["","","","","",""]); }}
                  style={{
                    display: "block", width: "100%", marginTop: 12, padding: 10,
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 13, color: "#6B7280", fontFamily: "var(--font-poppins), sans-serif",
                    textAlign: "center",
                  }}
                >
                  Change number
                </button>
              </>
            )}

            {/* ── NAME STEP ── */}
            {step === "name" && (
              <>
                <h1 style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: "#1F2937", margin: "0 0 8px", textAlign: "center" }}>
                  Almost There!
                </h1>
                <p style={{ fontSize: 14, color: "#6B7280", textAlign: "center", margin: "0 0 32px", fontFamily: "var(--font-poppins), sans-serif" }}>
                  What should we call you?
                </p>

                <label style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", display: "block", margin: "0 0 8px", fontFamily: "var(--font-poppins), sans-serif" }}>
                  Your Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  autoFocus
                  style={{
                    width: "100%", padding: "15px 16px", borderRadius: 14,
                    border: "1.5px solid rgba(241,229,220,0.7)", backgroundColor: "#FFF8F3",
                    fontSize: 15, color: "#1F2937", fontFamily: "var(--font-poppins), sans-serif",
                    outline: "none", transition: "border-color 0.3s", marginBottom: 24,
                  }}
                  className="login-input"
                />

                <button
                  onClick={completeSignup}
                  disabled={!name.trim() || loading}
                  className="login-btn"
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "15px", borderRadius: 14,
                    backgroundColor: name.trim() ? "#E9987A" : "#E5E7EB",
                    color: name.trim() ? "#fff" : "#9CA3AF",
                    fontSize: 15, fontWeight: 700, border: "none",
                    cursor: name.trim() ? "pointer" : "not-allowed",
                    fontFamily: "var(--font-poppins), sans-serif",
                    boxShadow: name.trim() ? "0 8px 28px rgba(233,152,122,0.35)" : "none",
                    transition: "all 0.35s cubic-bezier(0.22,1,0.36,1)",
                  }}
                >
                  {loading ? "Setting up..." : <><Sparkles size={15} /> Get Started</>}
                </button>
              </>
            )}

            {/* Trust */}
            <p style={{ fontSize: 11.5, color: "#9CA3AF", textAlign: "center", marginTop: 20, fontFamily: "var(--font-poppins), sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <Shield size={11} /> Your data is secured & never shared
            </p>
          </div>
        </div>
      </main>
      <Footer />

      <style jsx global>{`
        .login-input:focus, .otp-box:focus {
          border-color: #E9987A !important;
        }
        .login-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 36px rgba(233,152,122,0.4) !important;
        }
        @media (max-width: 480px) {
          .otp-box {
            width: 40px !important;
            height: 48px !important;
            font-size: 18px !important;
            border-radius: 10px !important;
          }
        }
        @media (max-width: 360px) {
          .otp-box {
            width: 36px !important;
            height: 44px !important;
            font-size: 16px !important;
          }
        }
      `}</style>
    </>
  );
}
