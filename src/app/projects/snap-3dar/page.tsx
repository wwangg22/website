import type { Metadata } from "next";
import { asset } from "@/lib/assets";
import ProjectShell, { Section, link } from "@/components/projects/ProjectShell";
import { Figure, YouTube } from "@/components/projects/Media";

export const metadata: Metadata = { title: "SNAP-AR3D" };

export default function SnapAR3DPage() {
  return (
    <ProjectShell
      title="SNAP-AR3D"
      lede={
        <>
          SNAP-AR3D uses AR guidance to help you capture optimal photos of an object while recording precise camera
          poses. The poses are converted into NeRF-compatible matrices and fed into NVIDIA’s <em>nvdiffrec</em> to
          produce detailed 3D reconstructions.
        </>
      }
    >
      <a
        href="https://devpost.com/software/snapar3d"
        target="_blank"
        rel="noopener noreferrer"
        className="clay-btn accent-coral -mt-6 self-start"
      >
        View the Devpost submission ↗
      </a>

      <Section title="Demo">
        <YouTube id="9cUk6gcapfg" title="SNAP-AR3D demo" />
      </Section>

      <Section title="Project story">
        <p>
          Our goal was a pipeline that turns phone videos into textured 3D meshes in minutes. Capturing ARKit poses
          lets us bypass COLMAP, halving reconstruction time, and we feed the images and poses to NVIDIA’s NVDiffRec
          for photorealistic output. The whole flow ships as a one-tap iOS app: capture, model, GLTF export.
        </p>
      </Section>

      <Section title="Technical details">
        <h3 className="pt-2 text-xl font-semibold">NVDiffRec (image to mesh)</h3>
        <p>
          We built on{" "}
          <a href="https://nvlabs.github.io/nvdiffrec/" target="_blank" rel="noopener noreferrer" className={link}>
            NVIDIA’s NVDiffRec
          </a>{" "}
          paper. The original method trains for about an hour on a V100; we needed about ten minutes on a laptop 3080,
          while keeping quality high.
        </p>
        <p>
          Our early high-resolution meshes were spiky, so we increased the Laplace-scale regularizer to suppress sharp
          changes between vertices. Because most objects are fairly smooth, a larger value, especially early in
          training, gave visibly better results.
        </p>
        <p>
          Tuning the resolution and the regularizer let us get solid reconstructions in ten minutes. The loss curve is
          shown below.
        </p>
        <Figure src={asset("data/snap/Frame_3.png")} alt="Results at different iterations" caption="Results at different iterations." />
        <p>
          The HDR map captures the scene lighting; <em>Kd</em>, <em>Korm</em> and the normal map are the recovered
          object textures.
        </p>

        <h3 className="pt-2 text-xl font-semibold">ARKit’s built-in SLAM</h3>
        <p>The standard pipeline is shown below.</p>
        <Figure src={asset("data/snap/snap.png")} alt="Standard pipeline compared with ours" />
        <p>
          Traditionally, camera poses are extracted from video with COLMAP, but it often fails on objects sitting on
          plain white surfaces because there aren’t enough background features to verify the transformations.
        </p>
        <p>
          ARKit’s SLAM provides continuous poses, but its frame quality varies. To guarantee sharp frames, we built a
          SwiftUI interface that overlays a tiled sphere on the object: the user aligns the camera with each tile until
          it disappears, which ensures uniform, high-quality coverage.
        </p>
        <p>
          Repeating this yields a robust set of photos and poses for reconstruction. The video above shows the full
          flow.
        </p>
        <p>
          We built this project at the{" "}
          <a href="https://www.treehacks.com/" target="_blank" rel="noopener noreferrer" className={link}>
            TreeHacks
          </a>{" "}
          hackathon.
        </p>
      </Section>
    </ProjectShell>
  );
}
