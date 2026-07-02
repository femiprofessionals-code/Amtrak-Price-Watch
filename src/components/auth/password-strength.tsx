import { cn } from "@/lib/cn";

/** Score 0–4 from simple heuristics: length ≥ 8, length ≥ 12, mixed case, digit, symbol. */
function scorePassword(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}

const levels: Record<number, { label: string; bar: string; text: string }> = {
  1: { label: "Weak", bar: "bg-danger", text: "text-danger" },
  2: { label: "Fair", bar: "bg-warning", text: "text-warning" },
  3: { label: "Good", bar: "bg-success", text: "text-success" },
  4: { label: "Strong", bar: "bg-success", text: "text-success" },
};

export function PasswordStrength({ password }: { password: string }) {
  const score = scorePassword(password);
  const level = password ? levels[Math.max(score, 1)] : undefined;

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1.5" aria-hidden>
        {[1, 2, 3, 4].map((segment) => (
          <span
            key={segment}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-200",
              level && segment <= Math.max(score, 1) ? level.bar : "bg-muted",
            )}
          />
        ))}
      </div>
      <p aria-live="polite" className="min-h-4 text-xs">
        {level ? (
          <span className={cn("font-medium", level.text)}>{level.label} password</span>
        ) : (
          <span className="text-muted-foreground">Use 8+ characters with a mix of letters, numbers and symbols.</span>
        )}
      </p>
    </div>
  );
}
