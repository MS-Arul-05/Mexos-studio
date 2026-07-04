export default function Loading() {
  return (
    <main style={{
      minHeight: "100vh", backgroundColor: "#FFF8F3",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ textAlign: "center" }}>
        <div className="mexo-loader" style={{
          width: 44, height: 44, borderRadius: 12,
          background: "linear-gradient(135deg, #F6B49A, #E9987A)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 16px",
          animation: "loaderPulse 1.2s ease-in-out infinite",
        }}>
          <span style={{
            fontFamily: "var(--font-playfair), serif", fontSize: 22,
            fontWeight: 800, color: "#fff", lineHeight: 1,
          }}>
            M
          </span>
        </div>
        <p style={{
          fontSize: 13, color: "#9CA3AF", fontFamily: "var(--font-poppins), sans-serif",
        }}>
          Loading...
        </p>
        <style>{`
          @keyframes loaderPulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(0.9); opacity: 0.6; }
          }
        `}</style>
      </div>
    </main>
  );
}
