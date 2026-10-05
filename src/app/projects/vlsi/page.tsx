import type { Metadata } from "next";
import { asset } from "@/lib/assets";
import ProjectShell, { Section, Tags } from "@/components/projects/ProjectShell";
import { Figure } from "@/components/projects/Media";

export const metadata: Metadata = { title: "VLSI 8-bit microprocessor core" };

const vlsi = (name: string) => asset(`data/vlsi/${name}`);

type Fig = { src: string; alt: string; caption: string };

const features: { title: string; blurb: string; tags: string[]; figures: Fig[] }[] = [
  {
    title: "Floorplanning: living with early layout decisions",
    blurb:
      "We laid out the adder and shifter first. Those early layouts turned out much larger and less dense than the blocks we designed later: good for learning, bad for floorplanning. We had aimed for a clean, compact floorplan, but with the adder and shifter already committed (and physically large), we settled on a less elegant floorplan that could actually fit them.",
    tags: ["Floorplanning", "Block density", "Adder and shifter placement"],
    figures: [
      { src: vlsi("goal_floorplan.png"), alt: "Goal floorplan", caption: "Goal floorplan." },
      { src: vlsi("actual_floorplan.png"), alt: "Actual floorplan", caption: "Actual floorplan." },
    ],
  },
  {
    title: "SRAM: pushing density to the DRC limit",
    blurb:
      "The SRAM was the most enjoyable module to build. Over many iterations, and a great deal of work with the ruler tool, we squeezed every spacing down to the minimum that still passes DRC. It uses a classic 6T bitcell sized for read/write stability. The read path is deliberately simple: bit and bit_bar are precharged while the clock is low, the selected cell pulls one side down during a read, and an inverter reads bit_bar. This keeps the design simple and area-efficient, but read speed is limited by how long the cell takes to discharge a precharged node; many modern SRAMs use sense amplifiers to detect small differentials faster. For writes, we drive bit or bit_bar low according to the value being written. A highlight: through heavy diffusion sharing and spacing optimization, we fit the read/write logic inside the SRAM bit pitch.",
    tags: ["6T bitcell", "Precharge/discharge read", "Inverter sensing", "Diffusion sharing", "Pitch-matched periphery"],
    figures: [
      { src: vlsi("bit_stack_schematic.png"), alt: "SRAM read/write logic schematic", caption: "Read/write logic schematic for the SRAM bit stack." },
      { src: vlsi("m2_m3_m4.png"), alt: "SRAM routing across M2/M3/M4", caption: "Routing detail across metal layers M2, M3 and M4." },
      { src: vlsi("bit_stack_w_rulers.png"), alt: "Bit stack with ruler measurements", caption: "Bit-stack layout with the ruler measurements used during optimization." },
      { src: vlsi("bit_stack_sram_together.png"), alt: "Bit stack integrated with SRAM", caption: "Bit stack integrated with the SRAM (pitch alignment and routing check)." },
      { src: vlsi("bit_stack_no_ruler.png"), alt: "Bit stack layout without rulers", caption: "Bit-stack layout without rulers." },
      { src: vlsi("sram_module.png"), alt: "Full SRAM module layout", caption: "Full SRAM module layout." },
      { src: vlsi("po_od.png"), alt: "SRAM PO/OD detail", caption: "SRAM PO/OD detail, showing tight diffusion sharing." },
    ],
  },
  {
    title: "PLA decoder: built last, and denser for it",
    blurb:
      "We built the PLA control block near the end of the project, and it shows how compact our later layouts became. Starting from a truth table of control signals derived from the opcodes, we minimized the sum-of-products with Espresso and implemented it as a very compact AND plane and OR plane. As with the SRAM, diffusion sharing and careful routing were the key techniques.",
    tags: ["Truth table → control signals", "Espresso SOP minimization", "AND/OR planes", "Diffusion sharing"],
    figures: [
      { src: vlsi("pla_po_od.png"), alt: "PLA PO/OD detail", caption: "PLA PO/OD detail (compact diffusion-level implementation)." },
      { src: vlsi("pla_m1_m2.png"), alt: "PLA M1/M2 routing detail", caption: "PLA routing detail (M1/M2)." },
      { src: vlsi("pla_decoder.png"), alt: "PLA decoder layout", caption: "Decoder layout (AND/OR planes and outputs)." },
      { src: vlsi("pla_decoder_schematic.png"), alt: "PLA decoder schematic", caption: "Decoder schematic derived from the minimized SOP." },
    ],
  },
  {
    title: "Shifter: an early block, built wide to match the adder",
    blurb:
      "The shifter is where our early design choices show. It is an 8-bit logical left shifter built from 2:1 muxes in a three-level logarithmic structure. Each mux is a pair of transmission gates (one pMOS and one nMOS). Because chains of pass transistors weaken the signal, we added inverter restore stages at depths of two and beyond. We also made the shifter deliberately wide so it could sit directly on top of the adder and match its (already wide) bit pitch.",
    tags: ["Logarithmic mux network", "Transmission-gate mux", "Inverter restoration", "Bit-pitch alignment"],
    figures: [
      { src: vlsi("shifter_handdrawing_schematic.png"), alt: "Hand-drawn shifter schematic", caption: "Hand sketch of the shifter structure (mux levels and data flow)." },
      { src: vlsi("shifter_full_layout.png"), alt: "Full shifter layout", caption: "Full shifter layout, deliberately wide to match the adder pitch." },
      { src: vlsi("shifter_full_schematic.png"), alt: "Full shifter schematic", caption: "Full shifter schematic (mux network and inverter restoration)." },
    ],
  },
  {
    title: "Adder: our first layout, still stackable",
    blurb:
      "The adder was the very first layout we did, and it shows: it is larger and less dense than our later blocks. Functionally, it is an 8-bit ripple-carry adder built from eight full adders, with overflow computed by XOR’ing the final carry-out with the carry-in to the MSB. Even this early, we designed around physical data flow: the full-adder tile is shaped so the carry chain stacks cleanly and the carry-in/out routing stays simple.",
    tags: ["8-bit ripple-carry", "Stackable full-adder tile", "Carry-chain routing", "Overflow (Cout ⊕ Cin)"],
    figures: [
      { src: vlsi("full_adder_dataflow.png"), alt: "Full adder dataflow", caption: "Full-adder data flow, designed to tile and chain the carry cleanly." },
      { src: vlsi("full_adder_schematic.png"), alt: "Full adder schematic", caption: "Full-adder schematic used as the repeating bit slice." },
      { src: vlsi("full_adder_full_layout.png"), alt: "Full adder full layout", caption: "Full-adder layout: early density, but physically composable." },
    ],
  },
];

export default function VLSIPage() {
  return (
    <ProjectShell
      title="VLSI 8-bit microprocessor core"
      lede={
        <>
          For our VLSI project, we designed a simple <strong className="text-ink">8-bit microprocessor core</strong> end
          to end, from schematic to layout to verification. The focus was on physical blocks that tile well, route
          cleanly and pass <strong className="text-ink">DRC/LVS</strong>. The design was built in TSMC N65 technology.
        </>
      }
      tags={["Full-custom layout", "DRC/LVS", "Datapath + control"]}
    >
      <Figure
        src={vlsi("final_layout.png")}
        alt="Final full layout of the 8-bit microprocessor core"
        caption="Final layout of the complete 8-bit microprocessor core."
      />

      <Section title="Overview: block diagram and instruction set">
        <p>
          The big picture: the modules and how data flows between them, plus the opcode-level behavior that drives the
          control logic.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          <Figure src={vlsi("block_dia.png")} alt="8-bit microprocessor block diagram" caption="Block diagram of the full 8-bit core." />
          <Figure src={vlsi("inst.png")} alt="Instruction set and encoding" caption="Instruction set and encoding, used to derive the control signals." />
        </div>
      </Section>

      <Section title="Modules">
        <p>The core is assembled from reusable, layout-first blocks:</p>
        <Tags items={["Latch", "Bus driver", "SRAM", "Adder", "Shifter"]} />
      </Section>

      {features.map((f) => (
        <Section key={f.title} title={f.title}>
          <p>{f.blurb}</p>
          <Tags items={f.tags} />
          <div className="grid gap-6 pt-2 sm:grid-cols-2">
            {f.figures.map((fig) => (
              <Figure key={fig.src} {...fig} />
            ))}
          </div>
        </Section>
      ))}

      <p className="text-center text-lg text-ink-soft">
        This page will be updated with deep-dives on the remaining modules (latch, bus driver and mux).
      </p>
    </ProjectShell>
  );
}
