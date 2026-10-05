import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { media } from "@/lib/assets";
import { SplatViewer } from "@/components/viewers/client";
import { ViewerPage } from "@/components/viewers/ui";
import { freeLookScenes } from "../scenes";

export const dynamicParams = false;

export function generateStaticParams() {
  return freeLookScenes.map(({ slug }) => ({ slug }));
}

export async function generateMetadata(props: PageProps<"/projects/gaussians/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  return { title: freeLookScenes.find((s) => s.slug === slug)?.title };
}

export default async function FreeLookScenePage(props: PageProps<"/projects/gaussians/[slug]">) {
  const { slug } = await props.params;
  const scene = freeLookScenes.find((s) => s.slug === slug);
  if (!scene) notFound();

  return (
    <ViewerPage
      back={{ href: "/projects/gaussians", label: "Sora → 3D Gaussian Splats" }}
      title={scene.title}
      hint="Drag to look around · Scroll or use the slider to move through the room"
    >
      <SplatViewer splatUrl={media(`gaussians/${slug}.splat`)} />
    </ViewerPage>
  );
}
