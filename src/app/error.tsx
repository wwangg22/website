"use client";

export default function Error({ retry }: { error: Error; retry: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-gutter py-16">
      <div className="clay max-w-md p-card text-center">
        <h1 className="text-3xl font-medium tracking-tight">Something went wrong</h1>
        <p className="mt-3 text-ink-soft">This page failed to load. Trying again usually fixes it.</p>
        <button type="button" onClick={() => retry()} className="clay-btn accent-coral mt-6">
          Try again
        </button>
      </div>
    </main>
  );
}
