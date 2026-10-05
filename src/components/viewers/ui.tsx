import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { NO_VT } from "@/lib/transitions";

export function GalleryGrid({
  items,
}: {
  items: { href: string; title: string; thumb: string }[];
}) {
  return (
    <ul className="grid-cards gap-card">
      {items.map((s) => (
        <li key={s.href} className="reveal">
          <Link href={s.href} transitionTypes={[NO_VT]} className="clay clay-lift flex h-full flex-col p-3">
            <div className="clay-inset overflow-hidden p-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.thumb}
                alt=""
                loading="lazy"
                className="h-48 w-full rounded-[0.9rem] object-cover"
              />
            </div>
            <h3 className="px-3 pt-4 pb-2 text-xl font-semibold">{s.title}</h3>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// Page frame for a single viewer: back link, title, the stage, then a controls hint.
export function ViewerPage({
  back,
  title,
  hint,
  square,
  children,
}: {
  back: { href: string; label: string };
  title: string;
  hint: string;
  square?: boolean;
  children: React.ReactNode;
}) {
  // On wider screens the column is as wide as the stage can be while the page still fits the viewport.
  const width = square
    ? "sm:w-[min(100%,max(24rem,calc(100svh_-_22rem)))]"
    : "sm:w-[min(100%,max(32rem,calc((100svh_-_26rem)*16/9)))]";
  return (
    <main className="page-wide flex-1">
      <div className={`mx-auto flex w-full flex-col gap-tile ${width}`}>
        <PageHeader title={title} back={back} />
        {children}
        <p className="text-center text-sm text-ink-soft">{hint}</p>
      </div>
    </main>
  );
}

// Covers the stage until the scene has something to show.
export function LoadingOverlay({
  text,
  progress,
  detail,
  error,
}: {
  text: string;
  progress?: number;
  detail?: string;
  error?: string | null;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-well/90 p-4">
      <div className="clay-sm w-full max-w-xs space-y-3 p-5 text-center">
        {error ? (
          <div className="space-y-3" role="alert">
            <p className="font-display text-lg font-semibold text-coral">Unable to load the scene</p>
            <p className="text-sm break-words text-ink-soft">{error}</p>
          </div>
        ) : (
          <>
            <p className="font-display text-lg font-semibold" role="status">
              {text}
            </p>
            <div
              className="clay-inset h-4 overflow-hidden rounded-full p-0.5"
              role="progressbar"
              aria-label="Loading progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress === undefined ? undefined : Math.round(progress * 100)}
            >
              {progress === undefined ? (
                <div className="h-full w-1/3 animate-pulse rounded-full bg-coral" />
              ) : (
                <div
                  className="h-full rounded-full bg-coral transition-[width] duration-300"
                  style={{ width: `${Math.max(4, Math.round(progress * 100))}%` }}
                />
              )}
            </div>
            {detail && <p className="font-mono text-xs text-ink-soft">{detail}</p>}
          </>
        )}
      </div>
    </div>
  );
}
