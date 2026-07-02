import { MarketingHeader } from "@/components/marketing/header";
import { Hero } from "@/components/marketing/hero";
import { Stats } from "@/components/marketing/stats";
import { Features } from "@/components/marketing/features";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { WhyUs } from "@/components/marketing/why-us";
import { Faq } from "@/components/marketing/faq";
import { Testimonials } from "@/components/marketing/testimonials";
import { CtaBanner } from "@/components/marketing/cta";
import { MarketingFooter } from "@/components/marketing/footer";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <MarketingHeader />
      <main className="flex-1">
        <Hero />
        <Stats />
        <Features />
        <HowItWorks />
        <WhyUs />
        <Testimonials />
        <Faq />
        <CtaBanner />
      </main>
      <MarketingFooter />
    </div>
  );
}
