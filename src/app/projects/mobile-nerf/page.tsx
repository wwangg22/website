import type { Metadata } from "next";
import PageHeader, { BackLink } from "@/components/PageHeader";
import { Section, code, link } from "@/components/projects/ProjectShell";
import { asset } from "@/lib/assets";
import { GalleryGrid } from "@/components/viewers/ui";
import { scenes } from "./scenes";

const title = "MobileNeRF with Instant-NGP";

export const metadata: Metadata = { title };

export default function MobileNerfGalleryPage() {
  return (
    <main className="page-wide flex flex-1 flex-col gap-section">
      <PageHeader back={{ href: "/projects", label: "Projects" }} title={title} morphId={`title-${title}`} />

      <GalleryGrid
        items={scenes.map((s) => ({
          href: `/projects/mobile-nerf/${s.id}`,
          title: s.title,
          thumb: asset(s.thumb),
        }))}
      />

      <div className="max-w-3xl">
        <Section title="Technical details">
          <p>
            The original{" "}
            <a href="https://mobile-nerf.github.io/" target="_blank" rel="noopener noreferrer" className={link}>
              MobileNeRF paper
            </a>{" "}
            represents a scene as a <em>fixed-topology</em> triangle mesh whose per-face textures store
            an <strong>8-D learned feature vector</strong> plus a binary opacity mask. At render time the
            mesh is rasterized with a conventional Z-buffer, and a tiny, view-dependent MLP embedded in
            the fragment shader converts those features into final pixel colors. Training happens in
            three stages: (1)&nbsp;continuous vertex/feature optimization, (2)&nbsp;opacity binarization
            with a straight-through estimator, and (3)&nbsp;baking everything into an OBJ&nbsp;+ texture
            atlas so the scene ships as <code className={code}>OBJ + PNGs + 2-layer MLP</code>.
          </p>

          <ul className="list-disc space-y-4 pl-6 marker:text-ink-soft">
            <li>
              <strong>Instant-NGP hash encoding.</strong> I replaced MobileNeRF’s plain MLPs with the
              multiresolution hash-grid encoding from{" "}
              <a href="https://github.com/ashawkey/torch-ngp" target="_blank" rel="noopener noreferrer" className={link}>
                ashawkey’s torch-ngp
              </a>
              . The hash encoding captures high-frequency detail with far fewer parameters, and the
              tiny-cuda-nn kernels give a <em>6–8×</em> speed-up in the first optimization stage.
            </li>
            <li>
              <strong>CUDA / PyTorch rewrite.</strong> The original Google implementation is written in
              JAX. I re-implemented every stage in PyTorch and tiny-cuda-nn so that it trains on
              commodity NVIDIA GPUs without TPU or JAX tooling.
            </li>
            <li>
              <strong>Opacity-first ray marcher.</strong> Instant-NGP is density-based by default,
              whereas MobileNeRF expects alpha values. I modified the ray marcher and loss to predict
              opacity directly, which avoids an extra σ→α conversion and keeps the baked textures
              compatible with the WebGL viewer.
            </li>
          </ul>

          <p>
            <strong>Result:</strong> a full MobileNeRF trains from scratch in about 5&nbsp;hours on a
            single consumer GPU (roughly 2&nbsp;h continuous training, 2&nbsp;h binarized training and
            1&nbsp;h baking).
          </p>

          <p>
            I forked the Instant-NGP repository and implemented my training scripts there. The source
            code is on GitHub:{" "}
            <a href="https://github.com/wwangg22/torch-ngp/" target="_blank" rel="noopener noreferrer" className={`${link} break-words`}>
              github.com/wwangg22/torch-ngp
            </a>
            .
          </p>
        </Section>
      </div>

      <BackLink href="/projects">Projects</BackLink>
    </main>
  );
}
