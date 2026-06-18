import { HomeHero } from "@/components/marketing/home-hero"
import { FeatureSlider } from "@/components/marketing/feature-slider"
import { AboutSection } from "@/components/marketing/about-section"
import { ContactSection } from "@/components/marketing/contact-section"
import { Footer } from "@/components/marketing/footer"

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <FeatureSlider />
      <AboutSection />
      <ContactSection />
      <Footer />
    </>
  )
}
