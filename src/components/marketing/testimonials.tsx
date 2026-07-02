import { SectionHeading } from "./section-heading";

const testimonials = [
  {
    quote:
      "I set a $60 target for New York to Boston and forgot about it. Four days later the alert hit and I booked in two minutes. Saved $31.",
    name: "Maya Rodriguez",
    role: "Weekly NYC ↔ BOS commuter",
    initials: "MR",
  },
  {
    quote:
      "I used to check the Amtrak site every morning like it was the weather. Now I just wait for the email. It genuinely changed how I book trips home.",
    name: "James Okafor",
    role: "Grad student, Philadelphia",
    initials: "JO",
  },
  {
    quote:
      "The price history chart is the killer feature for me. I could see the fare bouncing around and knew exactly when to pull the trigger.",
    name: "Sarah Lindqvist",
    role: "Frequent DC ↔ NYC traveler",
    initials: "SL",
  },
];

export function Testimonials() {
  return (
    <section
      aria-labelledby="testimonials-heading"
      className="py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          id="testimonials-heading"
          eyebrow="Testimonials"
          title="Riders who stopped guessing"
        />
        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-soft"
            >
              <blockquote className="text-sm leading-relaxed text-foreground">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span
                  aria-hidden
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary"
                >
                  {t.initials}
                </span>
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
