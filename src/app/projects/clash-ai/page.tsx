import type { Metadata } from "next";
import Link from "next/link";
import { asset } from "@/lib/assets";
import ProjectShell, { Section } from "@/components/projects/ProjectShell";
import { Figure, YouTube } from "@/components/projects/Media";

export const metadata: Metadata = { title: "Clash Royale AI" };

export default function ClashRoyaleAIPage() {
  return (
    <ProjectShell
      title="Clash Royale AI"
      lede={
        <>
          A PPO agent, driven by computer vision, that learns to battle in <em>Supercell’s</em> real-time strategy
          arena with no game API required.
        </>
      }
    >
      <Figure src={asset("data/clash/clashroyale_thumbnail.png")} alt="Sample detection overlay" />

      <div className="grid gap-12 md:grid-cols-2">
        <Section title="Vision">
          <p>
            A custom-trained <strong>YOLOv5</strong> model detects troops, towers, elixir and the current deck cards
            directly from raw screenshots. To keep labeling manageable, I bootstrap with{" "}
            <span className="whitespace-nowrap">sprite-based</span> synthetic images, then fine-tune on about 1.1k
            hand-corrected real frames.
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>2,000 synthetic images for rapid bootstrapping</li>
            <li>Domain-randomized colors and noise to reduce overfitting</li>
            <li>A separate small detector for deck-slot recognition</li>
          </ul>
        </Section>

        <Section title="Reinforcement learning">
          <p>
            State vectors (ResNet-18 features, detections and elixir/deck stats) feed a <strong>PPO</strong> policy that
            chooses <em>what</em> to play and <em>where</em> to place it. Illegal actions are masked out of the softmax
            so training isn’t wasted on impossible moves.
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Discrete action space with dynamic masking</li>
            <li>Online self-play on a private Clash Royale server</li>
            <li>Pluggable reward shaping for aggressive or defensive play styles</li>
          </ul>
        </Section>
      </div>

      <YouTube id="v4Sv72j4RCk" title="Clash Royale AI demo" />

      <Link href="/blog/000010" className="clay-btn accent-coral self-center px-8 py-4 text-lg">
        Read the development blog →
      </Link>
    </ProjectShell>
  );
}
