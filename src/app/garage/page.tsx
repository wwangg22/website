import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import Garage from "@/components/garage/Garage";

export const metadata: Metadata = {
  title: "3D Garage",
  description: "Interactive CAD models of robots and actuators I've designed.",
};

export default function GaragePage() {
  return (
    <main className="page-wide flex flex-1 flex-col gap-6">
      <PageHeader
        title="3D garage"
        lede="CAD models of robots and mechanisms I've designed. Explode an assembly, or select a part to read its design notes."
      />
      <Garage />
    </main>
  );
}
