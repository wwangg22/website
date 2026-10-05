import Link from "next/link";
import Morph from "./Morph";

// Quiet text link back to a parent page. Used at the top of every sub-page (and
// repeated at the bottom of long ones).
// `transitionTypes` lets WebGL pages opt this navigation out of view transitions.
export function BackLink({
  href,
  transitionTypes,
  children,
}: {
  href: string;
  transitionTypes?: string[];
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      transitionTypes={transitionTypes}
      className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-ink-soft transition-colors hover:text-ink"
    >
      <span aria-hidden>←</span>
      {children}
    </Link>
  );
}

// The one page header: optional back link, title, optional lede, then any extras
// (tags, metadata). `morphId` pairs the title with a card title on the previous page.
export default function PageHeader({
  title,
  lede,
  back,
  morphId,
  children,
}: {
  title: string;
  lede?: React.ReactNode;
  back?: { href: string; label: string; transitionTypes?: string[] };
  morphId?: string;
  children?: React.ReactNode;
}) {
  const heading = <h1 className="text-title font-semibold tracking-tight">{title}</h1>;
  return (
    <header className="flex flex-col gap-3">
      {back && (
        <BackLink href={back.href} transitionTypes={back.transitionTypes}>
          {back.label}
        </BackLink>
      )}
      {morphId ? <Morph id={morphId}>{heading}</Morph> : heading}
      {lede && <p className="max-w-2xl text-lede text-ink-soft">{lede}</p>}
      {children}
    </header>
  );
}
