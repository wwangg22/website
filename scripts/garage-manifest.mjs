// Scans media/garage/stl (parts) and public/assets/garage (notes, thumbnails) and writes src/data/garage.json for the /garage viewer.
// usage: node scripts/garage-manifest.mjs
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const garage = join(root, "public/assets/garage");
const stl = join(root, "media/garage/stl");
const out = join(root, "src/data/garage.json");

const dirs = (p) =>
  readdirSync(p, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
// STLs whose (misspelt) names don't match their description file.
const aliases = { "planetlockert-0-35-0-_110_(0(2(": "planetlocker-0-35-0-_110_(0(2(" };
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const byName = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

const models = dirs(stl)
  .sort(byName)
  .map((name) => {
    // Transparent clay renders captured from the viewer itself.
    const thumb = `thumbnails/${name.toLowerCase()}-clay.png`;
    const versions = dirs(join(stl, name))
      .sort((a, b) => Number(a) - Number(b))
      .map((version) => {
        const dir = join(stl, name, version);
        const files = readdirSync(dir);
        const parts = files
          .filter((f) => f.toLowerCase().endsWith(".stl"))
          .sort(byName)
          .map((file) => {
            // The old site looked descriptions up by the file name before its first ".".
            const key = file.split(".")[0];
            const desc = join(garage, "descriptions", `${aliases[key] ?? key}.json`);
            return { file, description: existsSync(desc) ? readJson(desc) : null };
          });
        const data = files.includes("data.json") ? readJson(join(dir, "data.json")) : {};
        return { version, data, parts };
      });
    return {
      name,
      thumbnail: existsSync(join(garage, thumb)) ? `garage/${thumb}` : null,
      versions,
    };
  });

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ models }, null, 2) + "\n");
console.log(`wrote ${out}: ${models.length} models`);
