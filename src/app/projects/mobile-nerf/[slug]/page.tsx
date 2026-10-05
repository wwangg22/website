import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NerfViewer } from "@/components/viewers/client";
import { ViewerPage } from "@/components/viewers/ui";
import { scenes } from "../scenes";

export const dynamicParams = false;

export function generateStaticParams() {
  return scenes.map(({ id }) => ({ slug: id }));
}

export async function generateMetadata(props: PageProps<"/projects/mobile-nerf/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  return { title: scenes.find((s) => s.id === slug)?.title };
}

export default async function NerfScenePage(props: PageProps<"/projects/mobile-nerf/[slug]">) {
  const { slug } = await props.params;
  const scene = scenes.find((s) => s.id === slug);
  if (!scene) notFound();

  return (
    <ViewerPage
      back={{ href: "/projects/mobile-nerf", label: "MobileNeRF with Instant-NGP" }}
      title={scene.title}
      square
      hint="Drag to orbit · Scroll or pinch to zoom · Right-drag or two-finger drag to pan"
    >
      <NerfViewer id={scene.id} />
    </ViewerPage>
  );
}
