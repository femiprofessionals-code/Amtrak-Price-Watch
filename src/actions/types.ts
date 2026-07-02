/** Shared result shape for form server actions consumed by useActionState. */
export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
} | null;

export function fieldErrorsFromZod(issues: Array<{ path: PropertyKey[]; message: string }>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
