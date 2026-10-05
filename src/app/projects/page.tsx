import type { Metadata } from "next";
import Link from "next/link";
import Morph from "@/components/Morph";
import PageHeader from "@/components/PageHeader";
import { asset } from "@/lib/assets";

export const metadata: Metadata = { title: "Projects" };

const projects = [
  {
    id: "vlsi",
    title: "VLSI 8-bit microprocessor core",
    img: "data/vlsi/final_layout.png",
    desc: "A full-custom 8-bit microprocessor core, from SRAM and datapath to PLA control, with DRC/LVS-clean layouts.",
  },
  {
    id: "gaussians",
    title: "Sora → 3D Gaussian splats",
    img: "data/thumbnails/gaussians.png",
    desc: "Sora-generated video reconstructed as 3D Gaussian splats, with free-look and guided-flythrough WebGL viewers.",
  },
  {
    id: "ihm-tactile",
    title: "In-hand manipulation with raw tactile signals",
    img: "data/thumbnails/ihm_thumbnail.gif",
    desc: "Training a diffusion-based controller for a tactile robotic hand.",
  },
  {
    id: "snap-3dar",
    title: "SNAP-AR3D",
    img: "data/thumbnails/snap.png",
    desc: "A pipeline that turns phone videos into textured 3D meshes in minutes.",
  },
  {
    id: "ooo-processor",
    title: "P6-style out-of-order RISC-V processor",
    img: "data/thumbnails/ooo_thumbnail.jpg",
    desc: "A SystemVerilog implementation of a P6-style out-of-order processor with a unified load/store queue.",
  },
  {
    id: "mobile-nerf",
    title: "MobileNeRF with Instant-NGP",
    img: "data/thumbnails/mobilenerf_thumbnail.jpg",
    desc: "A fast, high-quality neural radiance field implementation that renders at high frame rates on end-user devices.",
  },
  {
    id: "clash-ai",
    title: "Clash Royale AI",
    img: "data/thumbnails/clashroyale_thumbnail.png",
    desc: "A vision-based PPO agent that beats the in-game AI.",
  },
  {
    id: "garry-rl",
    title: "Reinforcement learning with Garry",
    img: "data/thumbnails/garry_thumbnail.gif",
    // The GIF has black pillarbox bars baked in; zoom past them.
    fit: "scale-[1.7]",
    desc: "Deep reinforcement learning for locomotion on a custom 8-DOF biped robot.",
  },
  {
    id: "personal-site",
    title: "Personal website",
    img: "data/thumbnails/garage_thumbnail.jpg",
    // Trim the white strip on the screenshot's right edge.
    fit: "origin-left scale-[1.06]",
    desc: "A Next.js blog and 3D garage, hosted serverlessly on AWS.",
  },
  {
    id: "diffraction-analysis",
    title: "Diffraction grating analysis",
    img: "data/thumbnails/diff_thumbnail.jpg",
    desc: "Python scripts that quantify diffraction grating images for optical research.",
  },
];

export default function ProjectsPage() {
  return (
    <main className="page-wide flex flex-1 flex-col gap-section">
      <PageHeader title="Projects" />
      {/* Two columns at desktop so the ten cards fill every row. */}
      <ul className="grid-cards gap-card [--card-min:24rem]">
        {projects.map((p, i) => (
          <li key={p.id} className="reveal">
            <Link href={`/projects/${p.id}`} className="clay-sm clay-lift flex h-full flex-col gap-4 p-tile">
              <div className="clay-inset aspect-video overflow-hidden p-1.5">
                <div className="h-full overflow-hidden rounded-[1rem]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset(p.img)}
                    alt=""
                    loading={i < 4 ? "eager" : "lazy"}
                    className={`h-full w-full object-cover ${p.fit ?? ""}`}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2 px-1">
                <Morph id={`title-${p.title}`}>
                  <h2 className="text-xl font-semibold leading-snug tracking-tight">{p.title}</h2>
                </Morph>
                <p className="line-clamp-3 text-sm leading-relaxed text-ink-soft">{p.desc}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
