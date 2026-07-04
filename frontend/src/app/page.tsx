import Navbar from "@/components/layout/Navbar";
// Switch between hero options to compare visually:
import Hero from "@/components/sections/HeroOptionA";  // Option A: Seamless edge fade
// import Hero from "@/components/sections/HeroOptionB";  // Option B: Editorial rounded frame
// import Hero from "@/components/sections/HeroOptionC";  // Option C: Full overlap composition
import Categories from "@/components/sections/Categories";
import HowItWorks from "@/components/sections/HowItWorks";
import BulkOrders from "@/components/sections/BulkOrders";
import FeaturedProducts from "@/components/sections/FeaturedProducts";
import Testimonials from "@/components/sections/Testimonials";
import Location from "@/components/sections/Location";
import Footer from "@/components/sections/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Categories />
        <HowItWorks />
        <BulkOrders />
        <FeaturedProducts />
        <Testimonials />
        <Location />
      </main>
      <Footer />
    </>
  );
}
