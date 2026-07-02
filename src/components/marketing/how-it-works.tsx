import { SectionHeading } from "./section-heading";

const steps = [
  {
    title: "Pick your trip",
    description:
      "Choose your origin, destination, and travel date — any Amtrak route we cover, from the Northeast Corridor to cross-country lines.",
  },
  {
    title: "Set a target price",
    description:
      "Tell us the fare you'd happily pay. We start checking prices right away and keep a history of every change.",
  },
  {
    title: "Book when we ping you",
    description:
      "When the fare drops below your target, we email you instantly with a link to book directly on Amtrak.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="scroll-mt-20 border-y border-border bg-card/50 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          id="how-it-works-heading"
          eyebrow="How it works"
          title="From setup to savings in three steps"
          description="It takes about two minutes to create your first price watch."
        />
        <ol className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="relative rounded-2xl border border-border bg-card p-6 shadow-soft"
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-soft"
                aria-hidden
              >
                {i + 1}
              </span>
              <h3 className="mt-4 text-[15px] font-semibold tracking-tight">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
