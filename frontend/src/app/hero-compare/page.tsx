import Navbar from "@/components/layout/Navbar";
import HeroOptionA from "@/components/sections/HeroOptionA";
import HeroOptionB from "@/components/sections/HeroOptionB";
import HeroOptionC from "@/components/sections/HeroOptionC";

export default function HeroCompare() {
  return (
    <>
      <Navbar />
      <main>
        {/* Label A */}
        <div style={{ backgroundColor: "#1F2937", padding: "14px 28px", textAlign: "center", position: "relative", zIndex: 20 }}>
          <span style={{ color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "'Poppins', sans-serif", letterSpacing: 2, textTransform: "uppercase" }}>
            Option A — Seamless Edge Fade
          </span>
        </div>
        <HeroOptionA />

        {/* Label B */}
        <div style={{ backgroundColor: "#1F2937", padding: "14px 28px", textAlign: "center" }}>
          <span style={{ color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "'Poppins', sans-serif", letterSpacing: 2, textTransform: "uppercase" }}>
            Option B — Editorial Rounded Frame
          </span>
        </div>
        <HeroOptionB />

        {/* Label C */}
        <div style={{ backgroundColor: "#1F2937", padding: "14px 28px", textAlign: "center" }}>
          <span style={{ color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "'Poppins', sans-serif", letterSpacing: 2, textTransform: "uppercase" }}>
            Option C — Full Overlap Composition
          </span>
        </div>
        <HeroOptionC />
      </main>
    </>
  );
}
