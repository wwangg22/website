import type { Metadata } from "next";
import { asset } from "@/lib/assets";
import ProjectShell, { Card, Section } from "@/components/projects/ProjectShell";
import { Pdf, YouTube } from "@/components/projects/Media";

export const metadata: Metadata = { title: "In-hand manipulation with raw tactile signals" };

const overview = [
  {
    title: "Goal",
    body: (
      <p>
        Enable a 12-DOF robotic hand to <em>continuously rotate a 40 mm lug nut</em> in the real world, recovering from
        slips and unexpected pushes, by using its built-in raw tactile sensors.
      </p>
    ),
  },
  {
    title: "Approach",
    body: (
      <ol className="list-decimal space-y-1 pl-5">
        <li>Train a PPO expert policy in Isaac Gym.</li>
        <li>Collect about 45k real trajectories with RGB-D and 28-channel touch data.</li>
        <li>
          Distill that data into a Transformer (BAKU) policy that takes raw tactile and visual input, with no tactile
          simulation required.
        </li>
      </ol>
    ),
  },
  {
    title: "Result",
    body: (
      <p>
        On the hardest test, the multimodal policy lasts <strong>about 180 s versus 13 s</strong> for the RL expert, a
        roughly 14× improvement. Raw tactile feedback dramatically improves robustness and self-recovery.
      </p>
    ),
  },
];

export default function IHMTactilePage() {
  return (
    <ProjectShell title="In-hand manipulation with raw tactile signals">
      <Section title="Overview">
        <div className="grid gap-6 md:grid-cols-3">
          {overview.map((o) => (
            <Card key={o.title} title={o.title}>
              {o.body}
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Demo video">
        <YouTube id="ldG13yCEtFQ" title="In-hand manipulation demo video" />
      </Section>

      <Section title="Paper">
        <Pdf src={asset("data/COMS6698_Final_Report.pdf")} title="COMS 6698 final report PDF" />
      </Section>
    </ProjectShell>
  );
}
