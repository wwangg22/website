"use client";

import { createContext, useContext, ViewTransition } from "react";

// False under a template mounted by a navigation into or out of a WebGL page,
// where nothing may mount a <ViewTransition> (see app/template.tsx).
export const TransitionsOn = createContext(true);

// Marks one element as the same object on two pages: give both sides the same
// `id` and navigating between them morphs one into the other (see globals.css).
// Unpaired, it simply fades with the rest of the page.
export default function Morph({ id, media, children }: { id: string; media?: boolean; children: React.ReactNode }) {
  if (!useContext(TransitionsOn)) return children;
  return (
    <ViewTransition
      name={`m-${id.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
      share={media ? "morph-media" : "morph"}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
