import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { asset, media } from "@/lib/assets";
import { SplatViewer } from "@/components/viewers/client";
import { ViewerPage } from "@/components/viewers/ui";
import { flythroughScenes } from "../../scenes";

export const dynamicParams = false;

export function generateStaticParams() {
  return flythroughScenes.map(({ slug }) => ({ slug }));
}

export async function generateMetadata(
  props: PageProps<"/projects/gaussians/path_viewer/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  return { title: flythroughScenes.find((s) => s.slug === slug)?.title };
}

export default async function FlythroughPage(props: PageProps<"/projects/gaussians/path_viewer/[slug]">) {
  const { slug } = await props.params;
  const scene = flythroughScenes.find((s) => s.slug === slug);
  if (!scene) notFound();

  return (
    <ViewerPage
      back={{ href: "/projects/gaussians", label: "Sora → 3D Gaussian Splats" }}
      title={scene.title}
      hint="Scroll or use the slider to fly along the path · Drag to look around"
    >
      <SplatViewer
        splatUrl={media(`gaussians/${slug}.splat`)}
        camerasUrl={asset(`data/gaussians/${slug}_cameras.json`)}
      />
    </ViewerPage>
  );
}
