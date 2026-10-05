// Routes that mount a WebGL scene. Navigations into or out of them skip view
// transitions: next to a busy GPU the browser can't take the snapshot before its
// timeout. app/template.tsx mounts no boundary for them, which covers leaving one;
// links *into* one carry NO_VT (skipVT) so the outgoing page's boundary stays still.
const heavy = /^\/(garage|projects\/gaussians\/.+|projects\/mobile-nerf\/.+)?$/;

export const isHeavy = (path: string) => heavy.test(path);

export const NO_VT = "no-vt";

export const skipVT = (href: string) => (isHeavy(href) ? [NO_VT] : undefined);
