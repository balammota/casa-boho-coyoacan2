import { Suspense } from "react";
import { Hero } from "@/components/Hero";
import { AboutApartment } from "@/components/AboutApartment";
import { Neighborhood } from "@/components/Neighborhood";
import { Gallery } from "@/components/Gallery";
import { Testimonials } from "@/components/Testimonials";
import { HouseRules } from "@/components/HouseRules";
import { Location } from "@/components/Location";
import { BookTour } from "@/components/BookTour";
import { Footer } from "@/components/Footer";
import { AuthEmailCallbackHandler } from "@/components/AuthEmailCallbackHandler";

export default function Home() {
  return (
    <main>
      <Suspense fallback={null}>
        <AuthEmailCallbackHandler />
      </Suspense>
      <Hero />
      <AboutApartment />
      <Neighborhood />
      <Gallery />
      <Testimonials />
      <HouseRules />
      <Location />
      <BookTour />
      <Footer />
    </main>
  );
}
