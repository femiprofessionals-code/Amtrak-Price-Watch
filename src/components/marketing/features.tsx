import type { ReactNode } from "react";
import { SectionHeading } from "./section-heading";

function Icon({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden={!label}
      aria-label={label}
      role={label ? "img" : undefined}
    >
      {children}
    </svg>
  );
}

const features = [
  {
    title: "Automatic fare tracking",
    description:
      "Add a route and travel date once. We check Amtrak fares continuously so you never have to refresh a booking page again.",
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </Icon>
    ),
  },
  {
    title: "Target price alerts",
    description:
      "Set the price you want to pay. The moment a fare dips below your target, an email lands in your inbox.",
    icon: (
      <Icon>
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </Icon>
    ),
  },
  {
    title: "Price history at a glance",
    description:
      "See how each fare has moved since you started watching, so you know whether to book now or hold out for a better deal.",
    icon: (
      <Icon>
        <path d="M3 3v16a2 2 0 0 0 2 2h16" />
        <path d="m19 9-5 5-4-4-3 3" />
      </Icon>
    ),
  },
  {
    title: "Any route, any date",
    description:
      "Northeast Regional, Acela, long-distance lines and more. Watch one-way trips on the dates that fit your plans.",
    icon: (
      <Icon>
        <circle cx="6" cy="19" r="3" />
        <circle cx="18" cy="5" r="3" />
        <path d="M12 19h4.5a3.5 3.5 0 0 0 0-7h-8a3.5 3.5 0 0 1 0-7H12" />
      </Icon>
    ),
  },
  {
    title: "Flexible watch controls",
    description:
      "Pause a watch when plans are up in the air, tweak your target price anytime, and delete watches you no longer need.",
    icon: (
      <Icon>
        <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
        <path d="M10 9v6" />
        <path d="M14 9v6" />
      </Icon>
    ),
  },
  {
    title: "Book direct with Amtrak",
    description:
      "We never touch your booking. When a deal appears, we link you straight to Amtrak so you pay them, not us.",
    icon: (
      <Icon>
        <path d="M9 12l2 2 4-4" />
        <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </Icon>
    ),
  },
];

export function Features() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="scroll-mt-20 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          id="features-heading"
          eyebrow="Features"
          title="Everything you need to catch the low fare"
          description="Set it up once and let the watcher do the boring part. You only hear from us when it matters."
        />
        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-border bg-card p-6 shadow-soft transition-shadow hover:shadow-lifted"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                {feature.icon}
              </span>
              <h3 className="mt-4 text-[15px] font-semibold tracking-tight">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
