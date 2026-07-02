import type { ActionState } from "@/actions/types";

/** Renders the top-level error or success banner from a form action's state. */
export function FormMessage({ state }: { state: ActionState }) {
  if (state?.error) {
    return (
      <div role="alert" className="animate-fade-in rounded-lg bg-danger-soft p-3 text-sm text-danger">
        {state.error}
      </div>
    );
  }
  if (state?.success) {
    return (
      <div role="status" className="animate-fade-in rounded-lg bg-success-soft p-3 text-sm text-success">
        {state.success}
      </div>
    );
  }
  return null;
}
