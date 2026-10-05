"use client";

import { useEffect, useState, ViewTransition } from "react";
import { usePathname } from "next/navigation";
import { TransitionsOn } from "@/components/Morph";
import { isHeavy, NO_VT } from "@/lib/transitions";

// The page before the current one; updated after each navigation commits.
let lastPath = "";

// Templates remount on navigation, so each page fades out and the next fades in.
// Nested routes that navigate within one segment re-export this (blog/, projects/, …).
export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // React starts a view transition whenever a <ViewTransition> mounts, even one that
  // animates nothing, and next to a busy WebGL page the browser can time out taking
  // its snapshot. So a navigation into or out of one mounts none at all.
  const [on] = useState(() => !isHeavy(pathname) && !isHeavy(lastPath));
  useEffect(() => {
    lastPath = pathname;
  }, [pathname]);

  if (!on) return <TransitionsOn value={false}>{children}</TransitionsOn>;
  return (
    <ViewTransition enter="page-in" exit={{ [NO_VT]: "none", default: "page-out" }} default="none">
      {children}
    </ViewTransition>
  );
}
