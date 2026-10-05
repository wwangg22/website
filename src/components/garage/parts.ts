import garage from "@/data/garage.json";

export type Description = { title: string; purpose: string; design: string };
export type Paragraph = { type: "p" | "img" | "video" | "iframe"; text?: string; src?: string; alt?: string; title?: string; controls?: boolean };
export type CameraStop = {
  name: string;
  position: [number, number, number];
  lookAt: [number, number, number];
  page_info?: { container: { tailwind: string }; title: { text: string }; paragraph: Paragraph[] };
};
export type VersionData = { expand?: boolean; spin?: Record<string, number>; camera_positions?: CameraStop[] };
export type Part = { file: string; description: Description | null };
export type Model = {
  name: string;
  thumbnail: string | null;
  versions: { version: string; data: VersionData; parts: Part[] }[];
};

export const models = garage.models as Model[];

// Placement is encoded in each STL's file name, e.g. "planetlocker-0-n25-0-_0_(2(.STL":
// name-x-y-z-rotZ-rotY-rotX, "n" for minus, exploded y between underscores,
// and geometry x/z offsets after "(". Parsed exactly as the old site did.
export const readVal = (name: string | undefined) => {
  if (name === undefined) return 0;
  if (!isNaN(parseInt(name))) return parseInt(name);
  if (name[0] == "n") return -parseInt(name.split("n")[1]);
  return 0;
};

export const placement = (file: string) => {
  const d = file.split("-");
  return {
    x: readVal(d[1]),
    y: readVal(d[2]),
    z: readVal(d[3]),
    rz: readVal(d[4]),
    ry: readVal(d[5]),
    rx: readVal(d[6]),
    ofs: readVal(file.split("(")[1]),
    zofs: readVal(file.split("(")[2]),
    explodedY: readVal(file.split("_")[1]),
  };
};

const titles: Record<string, string> = { robotleg: "Robot Leg", testingjig: "Testing Jig" };
export const modelTitle = (name: string) => titles[name] ?? name[0].toUpperCase() + name.slice(1);

// Names for parts that have no description file, keyed by the STL name before the first "-".
const partNames: Record<string, string> = {
  sunspiralv5: "Sun Gear",
  garry: "Garry",
  actuator_joint: "Actuator Joint",
  actuatorjoint: "Actuator Joint",
  backleg: "Back Leg",
  leglowerfull: "Lower Leg",
  lowerleg: "Lower Leg",
  upperleg: "Upper Leg",
  legassm: "Leg Assembly",
  bottomPRT: "Bottom Part",
  topPRT: "Top Part",
  sliders: "Slider 1",
  sliders2: "Slider 2",
  sliders3: "Slider 3",
  sliders4: "Slider 4",
  stand: "Stand",
  woodenbar: "Wooden Bar 1",
  woodenbar2: "Wooden Bar 2",
};

export const partName = (part: Part) => part.description?.title ?? partNames[part.file.split("-")[0]] ?? partLabel(part.file);

// Readable fallback for parts without a description: "actuator_joint" -> "Actuator joint", "bottomPRT" -> "Bottom PRT".
export const partLabel = (file: string) => {
  const s = file
    .split("-")[0]
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
  return s[0].toUpperCase() + s.slice(1);
};

export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
