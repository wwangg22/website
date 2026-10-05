import Link from "next/link";
import { NO_VT } from "@/lib/transitions";
import NavLinks from "./NavLinks";
import ThemeToggle from "./ThemeToggle";

export default function Nav() {
  return (
    <header
      className="sticky top-0 z-50 px-2 pt-3 min-[400px]:px-3 sm:px-6 sm:pt-4 pointer-events-none"
      // Held still while page content crossfades underneath (globals.css).
      style={{ viewTransitionName: "site-header" }}
    >
      <nav className="clay-sm pointer-events-auto mx-auto flex max-w-5xl items-center px-2 py-2 sm:gap-2 sm:px-5">
        <Link
          href="/"
          transitionTypes={[NO_VT]}
          className="font-display mr-auto px-1.5 text-base font-semibold min-[400px]:px-2 min-[400px]:text-lg sm:text-xl"
        >
          William
        </Link>
        <NavLinks />
        <ThemeToggle />
      </nav>
    </header>
  );
}
