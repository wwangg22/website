export const sections = [
  { id: "garage", href: "/garage", label: "3D Garage", blurb: "Interactive CAD models" },
  { id: "projects", href: "/projects", label: "Projects", blurb: "Robotics, chips, graphics" },
  { id: "blog", href: "/blog", label: "Blog", blurb: "Build notes and write-ups" },
  { id: "resume", href: "/William_Wang_Resume_2025.pdf", label: "Resume", blurb: "One-page PDF" },
] as const;

export type SectionId = (typeof sections)[number]["id"];
