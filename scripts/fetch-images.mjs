// Downloads Star Wars artwork from starwars.fandom.com (og:image) into public/sw/.
// Fandom blocks Node's fetch (403) but allows curl with browser-like headers,
// so all HTTP goes through curl. If your curl also gets 403, open the wiki
// pages in a browser and update MANIFEST with direct image URLs.
// Run: npm run images   (or: node scripts/fetch-images.mjs)
import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function curlText(url) {
  const r = spawnSync("curl", ["-sL", "-A", UA, "-H", "Accept: text/html", url], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  if (r.status !== 0 || !r.stdout) throw new Error(`page curl ${r.status}`);
  return r.stdout;
}

function curlImage(url, dest) {
  const r = spawnSync("curl", [
    "-s", "-A", UA,
    "-H", "Referer: https://starwars.fandom.com/",
    "-H", "Accept: image/avif,image/webp,image/png,image/*;q=0.8",
    "-o", dest, "-w", "%{http_code} %{content_type} %{size_download}",
    url,
  ], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`img curl ${r.status}`);
  return r.stdout.trim();
}

// key -> Fandom wiki page name. Key is the stable marking key used across the game data.
const MANIFEST = {
  // JEDI
  luke: "Luke_Skywalker",
  obiwan: "Obi-Wan_Kenobi",
  yoda: "Yoda",
  mace: "Mace_Windu",
  quigon: "Qui-Gon_Jinn",
  ahsoka: "Ahsoka_Tano",
  rey: "Rey_Skywalker",
  kiadi: "Ki-Adi-Mundi",
  plo: "Plo_Koon",
  anakin: "Anakin_Skywalker",
  // SITH
  vader: "Anakin_Skywalker",
  palpatine: "Darth_Sidious",
  maul: "Maul",
  dooku: "Dooku",
  kylo: "Ben_Solo",
  ventress: "Asajj_Ventress",
  grievous: "Grievous",
  snoke: "Snoke",
  graninquisidor: "The_Grand_Inquisitor",
  savage: "Savage_Opress",
  // CLONES
  rex: "Rex",
  cody: "Cody",
  fives: "Fives",
  echo: "Echo",
  hunter: "Hunter",
  wolffe: "Wolffe",
  jesse: "Jesse",
  crosshair: "Crosshair",
  boba: "Boba_Fett",
  jango: "Jango_Fett",
  // DROIDES
  r2d2: "R2-D2",
  c3po: "C-3PO",
  bb8: "BB-8",
  k2so: "K-2SO",
  ig11: "IG-11",
  droideka: "Droideka",
  chopper: "C1-10P",
  l3: "L3-37",
  d0: "D-O",
  r5d4: "R5-D4",
  // PLANETAS
  tatooine: "Tatooine",
  hoth: "Hoth",
  naboo: "Naboo",
  coruscant: "Coruscant",
  mustafar: "Mustafar",
  kamino: "Kamino",
  endor: "Endor",
  dagobah: "Dagobah",
  geonosis: "Geonosis",
  kashyyyk: "Kashyyyk",
  mandalore: "Mandalore",
  exegol: "Exegol",
};

const OUT = new URL("../public/sw/", import.meta.url);

function extractOgImage(html) {
  const m = html.match(/<meta property="og:image" content="([^"]+)"/);
  return m?.[1];
}

async function download(url, destUrl) {
  const dest = fileURLToPath(destUrl);
  const info = curlImage(url, dest); // "200 image/webp 118352"
  const [code, type, bytes] = info.split(" ");
  if (code !== "200" || !type.startsWith("image/")) throw new Error(`img ${info}`);
  if (Number(bytes) < 6000) throw new Error(`too small: ${bytes}B`);
  return { bytes: Number(bytes), type };
}

const results = {};
await mkdir(OUT, { recursive: true });

for (const [key, page] of Object.entries(MANIFEST)) {
  const dest = new URL(`${key}.webp`, OUT);
  try {
    const html = curlText(`https://starwars.fandom.com/wiki/${page}`);
    const og = extractOgImage(html);
    if (!og) throw new Error("no og:image");
    const info = await download(og, dest);
    results[key] = { ok: true, page, ...info };
    console.log(`OK   ${key} (${Math.round(info.bytes / 1024)}KB)`);
  } catch (err) {
    results[key] = { ok: false, page, error: String(err) };
    console.log(`FAIL ${key}: ${err}`);
  }
  await new Promise((r) => setTimeout(r, 400));
}

await writeFile(new URL("manifest.json", OUT), JSON.stringify(results, null, 2));
const fails = Object.values(results).filter((r) => !r.ok).length;
console.log(`\nDone: ${Object.keys(results).length - fails}/${Object.keys(results).length} OK, ${fails} failed`);
