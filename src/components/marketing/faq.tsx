import { AccordionItem } from "@/components/ui/accordion";
import { SectionHeading } from "./section-heading";

const faqs = [
  {
    question: "How does Travel Price Watch work?",
    answer:
      "You tell us a route, a travel date, and the price you want to pay. We check Amtrak fares for that trip automatically and email you as soon as the fare drops to or below your target.",
  },
  {
    question: "Is it free?",
    answer:
      "Yes. Creating an account and tracking fares is completely free while we're in beta — no credit card, no trial clock.",
  },
  {
    question: "How often are prices checked?",
    answer:
      "Fares are checked continuously throughout the day, typically multiple times per hour for every active watch, so a drop rarely goes unnoticed for long.",
  },
  {
    question: "Which routes can I track?",
    answer:
      "We cover around 50 major Amtrak stations, including the full Northeast Corridor (Boston, New York, Philadelphia, Washington DC) and popular long-distance routes. We're adding more stations regularly.",
  },
  {
    question: "Can I pause alerts?",
    answer:
      "Yes. Every watch can be paused and resumed with one click, so you can put a trip on hold without losing its price history.",
  },
  {
    question: "Do you sell tickets?",
    answer:
      "No — we never sit between you and your ticket. When your target price is hit, we link you straight to Amtrak.com to book directly with them.",
  },
];

export function Faq() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="scroll-mt-20 border-y border-border bg-card/50 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHeading
          id="faq-heading"
          eyebrow="FAQ"
          title="Questions, answered"
        />
        <div className="mt-12 flex flex-col gap-3">
          {faqs.map((faq) => (
            <AccordionItem key={faq.question} question={faq.question}>
              {faq.answer}
            </AccordionItem>
          ))}
        </div>
      </div>
    </section>
  );
}
