import type { Metadata } from "next";
import { asset } from "@/lib/assets";
import ProjectShell from "@/components/projects/ProjectShell";
import { Figure } from "@/components/projects/Media";

export const metadata: Metadata = { title: "Diffraction grating analysis" };

// The old site had no write-up for this project; only the index card's summary exists.
export default function DiffractionAnalysisPage() {
  return (
    <ProjectShell
      title="Diffraction grating analysis"
      lede="Python scripts that quantify grating images for optical research."
    >
      <Figure src={asset("data/thumbnails/diff_thumbnail.jpg")} alt="Diffraction grating image" />
    </ProjectShell>
  );
}
