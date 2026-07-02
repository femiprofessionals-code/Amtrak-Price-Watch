import { CountUp } from "./count-up";

const stats = [
  { value: 12000, suffix: "+", label: "fares tracked daily" },
  { value: 118, prefix: "$", label: "avg. saved per trip" },
  { value: 50, label: "stations covered" },
  { value: 2, suffix: " min", label: "to set up" },
];

export function Stats() {
  return (
    <section aria-label="Key numbers" className="border-y border-border bg-card/50">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-14 sm:px-6 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="text-3xl font-semibold tracking-tight text-primary sm:text-4xl">
              <CountUp
                value={stat.value}
                prefix={stat.prefix}
                suffix={stat.suffix}
              />
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
