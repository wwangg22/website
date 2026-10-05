"use client";

import { useRef, useState } from "react";

// Click to view full size; Esc or a click anywhere closes it.
export default function ZoomImage({ src, alt }: { src: string; alt: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  // Mount the full-size image only once opened, so closed dialogs don't defeat lazy loading.
  const [opened, setOpened] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpened(true);
          dialog.current?.showModal();
        }}
        className="block max-w-full cursor-zoom-in rounded-xl"
        aria-label={`Expand image: ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} loading="lazy" className="h-auto max-h-[70vh] w-auto max-w-full rounded-xl" />
      </button>
      <dialog
        ref={dialog}
        onClick={() => dialog.current?.close()}
        className="m-auto max-h-none max-w-none cursor-zoom-out bg-transparent p-0 backdrop:bg-black/75 backdrop:backdrop-blur-sm"
      >
        {opened && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} className="max-h-[90vh] max-w-[94vw] rounded-2xl object-contain" />
        )}
      </dialog>
    </>
  );
}
