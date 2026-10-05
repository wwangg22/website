import type { Metadata } from "next";
import Link from "next/link";
import { asset } from "@/lib/assets";
import ProjectShell, { Section, code } from "@/components/projects/ProjectShell";
import { Figure } from "@/components/projects/Media";

export const metadata: Metadata = { title: "Reinforcement learning with Garry" };

export default function GarryRLPage() {
  return (
    <ProjectShell
      title="Reinforcement learning with Garry"
      lede="From SolidWorks CAD to MuJoCo simulation to TD3 training: the pursuit of a stable bipedal gait on a custom-built robot."
    >
      <Figure src={asset("data/garry/model.jpg")} alt="Exploded CAD model of Garry" />

      <div className="grid items-center gap-8 md:grid-cols-2">
        <Section title="Getting Garry into MuJoCo">
          <p>
            I converted the SolidWorks assemblies to <code className={code}>.urdf</code> and then to MuJoCo XML. Passive
            joints weren’t preserved, so I exported <em>two variants</em> of the model, measured the offsets between
            them, and stitched them back together with <code className={code}>&lt;equality joint …/&gt;</code> tags.
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Dual export to recover passive joint coordinates</li>
            <li>Custom script to patch equality joints into the XML</li>
            <li>One-to-one sensor mapping for MuJoCo logs</li>
          </ul>
        </Section>
        <Figure src={asset("data/garry/mujoco.gif")} alt="CAD to MuJoCo" />
      </div>

      <div className="grid items-center gap-8 md:grid-cols-2">
        <div className="order-last md:order-first">
          <Figure src={asset("data/garry/walk.gif")} alt="Garry walking in simulation during TD3 training" />
        </div>
        <Section title="TD3 and reward shaping">
          <p>
            A lightweight MuJoCo wrapper mimics OpenAI Gym’s <code className={code}>step()</code> API. Experience is
            stored in a replay buffer and optimized with <strong>TD3</strong>. Most of the iteration went into reward
            design:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              Phase 1: rewarding <em>Δx</em> alone taught Garry to jump.
            </li>
            <li>Phase 2: adding an upright penalty produced a cautious one-legged hop.</li>
            <li>Phase 3: swapping the ankle joint for a ball joint produced baby steps.</li>
          </ul>
          <p>
            After fine-tuning the weights, Garry achieved a <em>semi-successful</em> walk in simulation, but the real
            servos couldn’t handle torque control, so deployment is waiting on a new hardware build.
          </p>
        </Section>
      </div>

      <Figure src={asset("data/garry/garry_thumbnail.gif")} alt="Semi-successful walk" />

      <Link href="/blog/000009" className="clay-btn accent-coral self-center px-8 py-4 text-lg">
        Read the full build log →
      </Link>
    </ProjectShell>
  );
}
