import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <div>
        <p className="text-7xl font-semibold tracking-tight text-primary">404</p>
        <h1 className="mt-3 text-xl font-semibold tracking-tight">This stop doesn&apos;t exist</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          The page you&apos;re looking for was moved, deleted, or never departed in the first place.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/">
          <Button variant="outline">Go home</Button>
        </Link>
        <Link href="/dashboard">
          <Button>Open dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
