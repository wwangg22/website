import type { Metadata } from "next";
import { Outfit, DM_Sans, JetBrains_Mono } from "next/font/google";
import Nav from "@/components/Nav";
import "./globals.css";

const display = Outfit({ variable: "--font-display", subsets: ["latin"] });
const body = DM_Sans({ variable: "--font-body", subsets: ["latin"] });
const code = JetBrains_Mono({ variable: "--font-code", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "William Wang", template: "%s · William Wang" },
  description: "Robotics, graphics and hardware projects, a 3D garage, and a blog.",
};

// Runs before first paint: stored choice wins, otherwise follow the system,
// and keep following it until the visitor picks a theme themselves.
const themeInit = `(function(){var d=document.documentElement,m=matchMedia("(prefers-color-scheme: dark)");function s(){try{return localStorage.getItem("theme")}catch(e){return null}}function a(){var t=s();d.dataset.theme=t==="dark"||t==="light"?t:(m.matches?"dark":"light");window.dispatchEvent(new Event("themechange"))}a();m.addEventListener("change",a)})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${code.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <Nav />
        {children}
      </body>
    </html>
  );
}
