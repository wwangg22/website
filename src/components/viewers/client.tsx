"use client";

import dynamic from "next/dynamic";

// The viewers touch WebGL/window on mount, so they only ever render in the browser.
export const SplatViewer = dynamic(() => import("./SplatViewer"), { ssr: false });
export const NerfViewer = dynamic(() => import("./NerfViewer"), { ssr: false });
