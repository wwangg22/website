import type { Metadata } from "next";
import Link from "next/link";
import { NO_VT } from "@/lib/transitions";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-gutter py-16">
      <div className="clay max-w-md p-card text-center">
        <p className="font-mono text-sm text-ink-soft">404</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight">Page not found</h1>
        <p className="mt-3 text-ink-soft">That page doesn&apos;t exist or has moved.</p>
        <Link href="/" transitionTypes={[NO_VT]} className="clay-btn accent-coral mt-6">
          Go to homepage
        </Link>
      </div>
    </main>
  );
}
