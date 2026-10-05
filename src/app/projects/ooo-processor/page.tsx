import type { Metadata } from "next";
import { asset } from "@/lib/assets";
import ProjectShell, { Section } from "@/components/projects/ProjectShell";
import { Figure, Pdf } from "@/components/projects/Media";

export const metadata: Metadata = { title: "P6-style out-of-order RISC-V processor" };

const ooo = (name: string) => asset(`data/ooo/${name}`);

const baselineCharts = [
  { src: ooo("cpi.png"), alt: "CPI per program (baseline)" },
  { src: ooo("rob_util.png"), alt: "ROB utilization (baseline)" },
  { src: ooo("lsq_util.png"), alt: "LSQ utilization (baseline)" },
  { src: ooo("dc_util.png"), alt: "D-Cache utilization (baseline)" },
  { src: ooo("hit_rate.png"), alt: "Cache hit-rate (baseline)" },
  { src: ooo("miss_rate.png"), alt: "Cache miss-rate (baseline)" },
];

const compareCharts = [
  { src: ooo("compare_baseline_vs_mult_pipelined_cpi.png"), alt: "Baseline vs. pipelined: CPI" },
  { src: ooo("compare_baseline_vs_mult_pipelined_d$_util.png"), alt: "Baseline vs. pipelined: D$ utilization" },
  { src: ooo("compare_baseline_vs_mult_pipelined_dc_util.png"), alt: "Baseline vs. pipelined: D-Cache utilization" },
  { src: ooo("compare_baseline_vs_mult_pipelined_lsq_util.png"), alt: "Baseline vs. pipelined: LSQ utilization" },
  { src: ooo("compare_baseline_vs_mult_pipelined_rob_util.png"), alt: "Baseline vs. pipelined: ROB utilization" },
  { src: ooo("compare_baseline_vs_mult_pipelined_hit_rate.png"), alt: "Baseline vs. pipelined: cache hit-rate" },
  { src: ooo("compare_baseline_vs_mult_pipelined_miss_rate.png"), alt: "Baseline vs. pipelined: cache miss-rate" },
];

export default function OOOProcessorPage() {
  return (
    <ProjectShell title="P6-style out-of-order RISC-V processor">
      <Section title="Design highlights">
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Six-stage pipeline</strong> (IF → ID → IS → EX → CP → RT) with single-issue, out-of-order execution
            inspired by Intel’s P6 core.
          </li>
          <li>
            <strong>Register renaming</strong> via a 32-entry Map Table and a 32-entry ROB removes WAR/WAW hazards and
            supports precise exceptions.
          </li>
          <li>
            <strong>Unified 8-entry LSQ</strong> enables speculative loads and enforces memory ordering; ties into a
            direct-mapped, write-back, non-blocking D-cache.
          </li>
          <li>
            <strong>Multiple functional units</strong>—dual ALUs for branches/arithmetic plus an 8-stage pipelined
            multiplier; arbitration favors multiplier results.
          </li>
          <li>
            <strong>Misprediction recovery</strong> is handled in the Retire stage; a BTB/RAS predictor is future work,
            but the full pipeline-flush logic is already in place.
          </li>
        </ul>
      </Section>

      <Section title="Performance snapshot">
        <p>
          On the single-FU core we measured an <strong>average CPI of 10.3</strong> across 30+ assembly tests (best
          3.8, worst 30). Enabling the pipelined multiplier raises the average CPI to <strong>10.6</strong>: some
          programs speed up, while others slow down due to extra LSQ/ROB pressure.
        </p>
      </Section>

      <Section title="Baseline core metrics">
        <div className="grid gap-6 sm:grid-cols-2">
          {baselineCharts.map((c) => (
            <Figure key={c.src} {...c} caption={c.alt} />
          ))}
        </div>
      </Section>

      <Section title="Baseline vs. pipelined-multiplier core">
        <div className="grid gap-6 sm:grid-cols-2">
          {compareCharts.map((c) => (
            <Figure key={c.src} {...c} caption={c.alt} />
          ))}
        </div>
      </Section>

      <Section title="Full report">
        <Pdf src={asset("data/CSEE_4824_Final_Report.pdf")} title="CSEE 4824 Final Report PDF" />
      </Section>
    </ProjectShell>
  );
}
