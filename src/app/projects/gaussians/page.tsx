import type { Metadata } from "next";
import PageHeader, { BackLink } from "@/components/PageHeader";
import { code } from "@/components/projects/ProjectShell";
import { asset } from "@/lib/assets";
import { GalleryGrid } from "@/components/viewers/ui";
import { flythroughScenes, freeLookScenes } from "./scenes";

const title = "Sora → 3D Gaussian Splats";

export const metadata: Metadata = { title };

const thumb = (slug: string) => asset(`data/gaussians/${slug}.png`);

export default function GaussiansGalleryPage() {
  return (
    <main className="page-wide flex flex-1 flex-col gap-section">
      <PageHeader
        back={{ href: "/projects", label: "Projects" }}
        title={title}
        morphId={`title-${title}`}
        lede={
          <>
            Each scene starts as a short <strong className="text-ink">Sora-generated video</strong>. I
            extract frames, estimate the camera motion across the clip, and then optimize a{" "}
            <strong className="text-ink">3D Gaussian Splat</strong> scene that reproduces those
            frames. The result is a lightweight <code className={code}>.splat</code> file that you can
            explore interactively in the browser.
          </>
        }
      />

      <section className="space-y-6">
        <h2 className="text-heading font-semibold">Free-look scenes</h2>
        <GalleryGrid
          items={freeLookScenes.map((s) => ({
            href: `/projects/gaussians/${s.slug}`,
            title: s.title,
            thumb: thumb(s.slug),
          }))}
        />
      </section>

      <section className="space-y-6">
        <h2 className="text-heading font-semibold">Guided flythroughs</h2>
        <GalleryGrid
          items={flythroughScenes.map((s) => ({
            href: `/projects/gaussians/path_viewer/${s.slug}`,
            title: s.title,
            thumb: thumb(s.slug),
          }))}
        />
      </section>

      <BackLink href="/projects">Projects</BackLink>
    </main>
  );
}
