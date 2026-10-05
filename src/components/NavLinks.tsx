"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { skipVT } from "@/lib/transitions";

const links = [
  { href: "/garage", label: "Garage" },
  { href: "/projects", label: "Projects" },
  { href: "/blog", label: "Blog" },
  { href: "/William_Wang_Resume_2025.pdf", label: "Resume" },
];

const base =
  "rounded-full px-1.5 py-2.5 text-[13px] font-semibold transition-colors hover:text-ink min-[400px]:px-2 min-[400px]:text-sm sm:px-3 sm:text-base";

export default function NavLinks() {
  const pathname = usePathname();
  return links.map((l) => {
    // A plain anchor for the PDF: the router can't navigate to a file.
    if (l.href.endsWith(".pdf")) {
      return (
        <a key={l.href} href={l.href} className={`${base} text-ink-soft max-[339px]:hidden`}>
          {l.label}
        </a>
      );
    }
    const current = pathname === l.href || pathname.startsWith(`${l.href}/`);
    return (
      <Link
        key={l.href}
        href={l.href}
        transitionTypes={skipVT(l.href)}
        aria-current={current ? "page" : undefined}
        className={`${base} ${current ? "text-ink underline decoration-coral decoration-2 underline-offset-8" : "text-ink-soft"}`}
      >
        {l.label}
      </Link>
    );
  });
}
