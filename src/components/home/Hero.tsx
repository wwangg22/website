"use client";

import { useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sections, type SectionId } from "./sections";

const HomeScene = dynamic(() => import("./HomeScene"), { ssr: false });

// The 3D scene is decoration over the link tiles, so skip it where WebGL is
// unavailable instead of letting the canvas throw.
let webglSupport: boolean | undefined;
function hasWebGL() {
  if (webglSupport === undefined) {
    try {
      const canvas = document.createElement("canvas");
      webglSupport = !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}
const noop = () => () => {};

export default function Hero() {
  const router = useRouter();
  const webgl = useSyncExternalStore(noop, hasWebGL, () => true);
  const [hovered, setHovered] = useState<SectionId | null>(null);

  const activate = (id: SectionId) => {
    const { href } = sections.find((s) => s.id === id)!;
    if (href.endsWith(".pdf")) window.location.assign(href);
    else router.push(href);
  };

  return (
    <>
      {webgl && (
        <div className="clay h-[clamp(23.75rem,21.5rem+6vw,26.25rem)] overflow-hidden">
          <HomeScene hovered={hovered} onHover={setHovered} onActivate={activate} />
        </div>
      )}

      <nav aria-label="Sections" className="grid grid-cols-2 gap-tile lg:grid-cols-4">
        {sections.map((s) => {
          const className = `clay-sm clay-lift flex flex-col gap-1 p-tile ${
            hovered === s.id ? "-translate-y-1" : ""
          }`;
          const events = {
            onPointerEnter: () => setHovered(s.id),
            onPointerLeave: () => setHovered(null),
            onFocus: () => setHovered(s.id),
            onBlur: () => setHovered(null),
          };
          const body = (
            <>
              <span className="font-display text-lg font-medium">{s.label}</span>
              <span className="text-sm text-ink-soft">{s.blurb}</span>
            </>
          );
          return s.href.endsWith(".pdf") ? (
            <a key={s.id} href={s.href} className={className} {...events}>
              {body}
            </a>
          ) : (
            <Link key={s.id} href={s.href} className={className} {...events}>
              {body}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
