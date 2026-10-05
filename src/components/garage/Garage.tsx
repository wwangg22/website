"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { asset } from "@/lib/assets";
import { modelTitle, models } from "./parts";

// three.js only ever loads in the browser.
const Viewer = dynamic(() => import("./Viewer"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[calc(55svh+6rem)] min-h-96 place-items-center sm:h-[calc(min(60svh,32rem)+6rem)] lg:h-[calc(100svh-20.5rem)]">
      <span className="font-display text-ink-soft">Loading viewer…</span>
    </div>
  ),
});

export default function Garage() {
  const [name, setName] = useState("actuator");
  const model = models.find((m) => m.name === name)!;

  return (
    <div className="clay grid gap-4 p-3 sm:p-4 lg:grid-cols-[9.5rem_minmax(0,1fr)]">
      <div role="group" aria-label="Model" className="grid grid-cols-4 gap-2 sm:gap-3 lg:grid-cols-1 lg:content-start">
        {models.map((m) => {
          const current = m.name === name;
          return (
            <button
              key={m.name}
              type="button"
              onClick={() => setName(m.name)}
              aria-pressed={current}
              className={`flex flex-col items-center gap-1 rounded-[1.25rem] p-1.5 transition-shadow sm:p-2 ${current ? "clay-inset" : "clay-sm"}`}
            >
              {m.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={asset(m.thumbnail)} alt="" className="aspect-[4/3] w-full object-contain lg:h-14" />
              )}
              <span className="flex items-center gap-1.5 whitespace-nowrap font-display text-xs font-medium sm:text-sm">
                {current && <span aria-hidden className="hidden h-1.5 w-1.5 rounded-full bg-sky sm:block" />}
                {modelTitle(m.name)}
              </span>
            </button>
          );
        })}
      </div>
      <Viewer key={model.name} model={model} />
    </div>
  );
}
