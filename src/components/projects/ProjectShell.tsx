import PageHeader, { BackLink } from "@/components/PageHeader";

export const link =
  "font-semibold underline decoration-coral decoration-2 underline-offset-4 transition-colors hover:decoration-ink";
export const code = "clay-inset rounded-lg px-1.5 py-0.5 font-mono text-[0.85em]";

export function Tags({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((t) => (
        <li key={t} className="chip">
          {t}
        </li>
      ))}
    </ul>
  );
}

// Page frame for a project write-up: header (morphs from the index card title), then the sections.
export default function ProjectShell({
  title,
  lede,
  tags,
  children,
}: {
  title: string;
  lede?: React.ReactNode;
  tags?: readonly string[];
  children?: React.ReactNode;
}) {
  return (
    <main className="page-read flex flex-1 flex-col gap-section">
      <PageHeader title={title} lede={lede} back={{ href: "/projects", label: "Projects" }} morphId={`title-${title}`}>
        {tags && <Tags items={tags} />}
      </PageHeader>
      {children}
      <BackLink href="/projects">Projects</BackLink>
    </main>
  );
}

export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="clay-sm p-tile">
      <h3 className="mb-2 text-xl font-semibold">{title}</h3>
      <div className="text-base leading-relaxed text-ink-soft">{children}</div>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="reveal space-y-4 text-lg leading-relaxed">
      <h2 className="text-heading font-semibold">{title}</h2>
      {children}
    </section>
  );
}
