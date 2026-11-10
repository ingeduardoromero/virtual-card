#!/usr/bin/env node
// Builds index.html from card.json + src/card.html. No dependencies; Node 18+.
//
//   node scripts/build.mjs            validate card.json and write index.html
//   node scripts/build.mjs --check    exit 1 if index.html is out of date
//   node scripts/build.mjs --url https://example.com/card/   (only off GitHub Pages)
//
// index.html stays a single self-contained file: the card data is inlined,
// so the page makes no requests after the document itself.

import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const CHECK = args.includes("--check");
const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] || "" : "");
const urlArg = flag("--url");
const cardFile = flag("--card") || join(ROOT, "card.json");   // --card/--out are for tests
const outFile = flag("--out") || join(ROOT, "index.html");

const errors = [];
const warnings = [];

/* ---- Shape ------------------------------------------------------------ */

const LINK = { url: "", display: "" };
const SHAPE = {
  $schema: "",
  name: { full: "", given: "", additional: "", family: "" },
  initials: "", photo: "", role: "", org: "", tagline: "", location: "",
  email: "",
  phone: { display: "", dial: "" },
  whatsapp: { number: "", message: "" },
  linkedin: LINK, github: LINK, website: LINK,
  site: { url: "", previewImage: "" },
  vcardFilename: ""
};

// Fill every missing field with "" and reject unknown keys and non-strings,
// so a typo like "linkdin" fails loudly instead of silently hiding a tile.
function conform(value, shape, path) {
  if (typeof shape === "string") {
    if (value === undefined || value === null) { return ""; }
    if (typeof value !== "string") { errors.push(`${path} must be a string (in quotes).`); return ""; }
    return value.trim();
  }
  if (value === undefined || value === null) { value = {}; }
  if (typeof value !== "object" || Array.isArray(value)) {
    errors.push(`${path} must be an object { ... }.`); value = {};
  }
  const out = {};
  for (const key of Object.keys(value)) {
    if (!(key in shape)) {
      const near = Object.keys(shape).find((k) => k.toLowerCase().slice(0, 3) === key.toLowerCase().slice(0, 3));
      errors.push(`${path ? path + "." : ""}${key} is not a known field` + (near ? ` (did you mean "${near}"?)` : "."));
    }
  }
  for (const key of Object.keys(shape)) {
    out[key] = conform(value[key], shape[key], path ? `${path}.${key}` : key);
  }
  return out;
}

/* ---- Load ------------------------------------------------------------- */

let raw;
try {
  raw = JSON.parse(readFileSync(cardFile, "utf8"));
} catch (e) {
  console.error(`card.json could not be read: ${e.message}`);
  process.exit(1);
}
const card = conform(raw, SHAPE, "");

/* ---- Validate and fill defaults -------------------------------------- */

const E164 = /^\+[1-9]\d{6,14}$/;
const DIGITS = /^[1-9]\d{6,14}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

for (const part of ["full", "given", "family"]) {
  if (!card.name[part]) { errors.push(`name.${part} is required.`); }
}

if (!card.initials) {
  card.initials = (card.name.given.charAt(0) + card.name.family.charAt(0)).toUpperCase();
}
if (card.initials.length > 3) { errors.push("initials should be 1–3 letters."); }

if (card.email && !EMAIL.test(card.email)) { errors.push(`email "${card.email}" doesn't look like an email address.`); }

if (card.phone.dial) {
  const compact = card.phone.dial.replace(/[\s().-]/g, "");
  if (!E164.test(compact)) {
    errors.push(`phone.dial "${card.phone.dial}" must be + country code and number, e.g. "+525543634088".`);
  }
  card.phone.dial = compact;
  if (!card.phone.display) { card.phone.display = card.phone.dial; }
} else if (card.phone.display) {
  errors.push("phone.display is set but phone.dial is empty — add the dialable number.");
}

if (card.whatsapp.number) {
  const n = card.whatsapp.number;
  if (!DIGITS.test(n)) {
    const fixed = n.replace(/\D/g, "");
    errors.push(`whatsapp.number "${n}" must be digits only, country code first` +
                (DIGITS.test(fixed) ? ` — use "${fixed}".` : "."));
  }
} else if (card.whatsapp.message) {
  warnings.push("whatsapp.message is set but whatsapp.number is empty, so there is no WhatsApp tile.");
}

const defaultDisplay = (url) => {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").filter(Boolean).pop();
    return last || u.hostname.replace(/^www\./, "");
  } catch { return url; }
};
for (const key of ["linkedin", "github", "website"]) {
  const link = card[key];
  if (link.url) {
    if (!/^https:\/\/[^\s/]+\.[^\s]+$/.test(link.url)) {
      errors.push(`${key}.url "${link.url}" must be a full https:// address.`);
    }
    if (!link.display) { link.display = defaultDisplay(link.url); }
  } else if (link.display) {
    warnings.push(`${key}.display is set but ${key}.url is empty, so the ${key} tile is hidden.`);
  }
}
if (card.linkedin.url && !/linkedin\.com\//i.test(card.linkedin.url)) {
  warnings.push(`linkedin.url "${card.linkedin.url}" isn't a linkedin.com address.`);
}
if (card.github.url && !/github\.com\//i.test(card.github.url)) {
  warnings.push(`github.url "${card.github.url}" isn't a github.com address.`);
}

function checkLocalFile(field, value, maxKB) {
  if (!value || /^(https:|data:)/.test(value)) { return; }
  if (/^[a-z]+:/i.test(value) || value.includes("..") || value.startsWith("/")) {
    errors.push(`${field} "${value}" must be a file next to index.html or an https:// URL.`); return;
  }
  const file = join(ROOT, value);
  if (!existsSync(file)) { errors.push(`${field} "${value}" was not found next to index.html.`); return; }
  const kb = Math.round(statSync(file).size / 1024);
  if (kb > maxKB) { warnings.push(`${field} "${value}" is ${kb} KB; under ${maxKB} KB keeps the card fast on mobile data.`); }
  if (!/\.(png|jpe?g|webp|svg)$/i.test(value)) { errors.push(`${field} "${value}" should be a .png, .jpg, .webp or .svg file.`); }
}
checkLocalFile("photo", card.photo, 150);
checkLocalFile("site.previewImage", card.site.previewImage, 300);

if (!card.vcardFilename) {
  card.vcardFilename = card.name.full.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + ".vcf";
}
if (!/^[^/\\]+\.vcf$/.test(card.vcardFilename)) { errors.push(`vcardFilename "${card.vcardFilename}" must end in .vcf.`); }

if (!card.email && !card.phone.dial && !card.whatsapp.number && !card.linkedin.url &&
    !card.github.url && !card.website.url) {
  errors.push("Add at least one way to reach you: email, phone, whatsapp, linkedin, github or website.");
}

/* ---- Which repository is this? ---------------------------------------- */

function currentRepo() {
  if (process.env.GITHUB_REPOSITORY) { return process.env.GITHUB_REPOSITORY; }
  try {
    const remote = execFileSync("git", ["remote", "get-url", "origin"], { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] })
      .toString().trim();
    const m = remote.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
    if (m) { return `${m[1]}/${m[2]}`; }
  } catch { /* not a git checkout */ }
  return "";
}
const repo = currentRepo();

/* ---- Copies must not publish the template author's card --------------- */

// This repository is a template. Until a copy replaces the details in
// card.json, building it would publish the original author's card under
// someone else's address. Stored as one-way fingerprints so the details
// aren't duplicated here; update them if the author's details change.
const TEMPLATE_REPO = "ingeduardoromero/virtual-card";
const TEMPLATE_AUTHOR = "Eduardo Angel Romero Diaz";
const TEMPLATE_FINGERPRINTS = {
  "name.full": "6ef7ae88aef71be2",
  "email": "b64460e875ccdaa3",
  "phone.dial": "63cd5379cd7d0906",
  "whatsapp.number": "813b998a1460f046",
  "linkedin.url": "d3d01fd98bdd8489"
};

const fingerprint = (field, value) =>
  createHash("sha256").update(`${field}:${value}`).digest("hex").slice(0, 16);

function templateDetailsLeft() {
  const values = {
    "name.full": card.name.full.toLowerCase(),
    "email": card.email.toLowerCase(),
    "phone.dial": card.phone.dial,
    "whatsapp.number": card.whatsapp.number,
    "linkedin.url": card.linkedin.url.toLowerCase().replace(/\/+$/, "")
  };
  return Object.keys(TEMPLATE_FINGERPRINTS)
    .filter((f) => values[f] && fingerprint(f, values[f]) === TEMPLATE_FINGERPRINTS[f]);
}

if (repo.toLowerCase() !== TEMPLATE_REPO) {
  const left = templateDetailsLeft();
  if (left.length) {
    const msg = `card.json still has ${TEMPLATE_AUTHOR}'s details (${left.join(", ")}), ` +
      `so this copy would publish their card, not yours. Replace them with your own ` +
      `details — or run /make-card — and leave any field you don't want as "".`;
    if (process.env.GITHUB_ACTIONS) { console.log(`::error title=Card not published::${msg}`); }
    console.error(msg);
    process.exit(1);
  }
}

/* ---- Where the card lives (for link previews) ------------------------ */

function siteUrl() {
  const slash = (u) => (u.endsWith("/") ? u : u + "/");
  if (card.site.url) { return slash(card.site.url); }
  if (urlArg) { return slash(urlArg); }
  if (existsSync(join(ROOT, "CNAME"))) {
    const host = readFileSync(join(ROOT, "CNAME"), "utf8").trim();
    if (host) { return `https://${host}/`; }
  }
  if (!repo) { return ""; }
  const [owner, name] = repo.split("/");
  const host = `${owner.toLowerCase()}.github.io`;
  return name.toLowerCase() === host ? `https://${host}/` : `https://${host}/${name}/`;
}
const url = siteUrl();
if (url && !/^https?:\/\/[^\s]+\/$/.test(url)) { errors.push(`site.url "${url}" must be a full http(s):// address.`); }
if (!url) { warnings.push("No public URL found — set site.url so link previews and the canonical tag are filled in."); }

if (errors.length) {
  console.error("card.json needs fixing:\n" + errors.map((e) => "  ✗ " + e).join("\n"));
  if (warnings.length) { console.error(warnings.map((w) => "  ! " + w).join("\n")); }
  process.exit(1);
}

/* ---- Render ----------------------------------------------------------- */

const attr = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                             .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const text = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function listOr(items) {
  if (items.length <= 1) { return items.join(""); }
  if (items.length === 2) { return items.join(" or "); }
  return items.slice(0, -1).join(", ") + ", or " + items[items.length - 1];
}
const channels = [
  card.whatsapp.number && "WhatsApp", card.phone.dial && "phone", card.email && "email",
  card.linkedin.url && "LinkedIn", card.github.url && "GitHub", card.website.url && "my website"
].filter(Boolean);
const pitch = `Save my contact details, or reach me by ${listOr(channels)}.`;
const full = card.name.full;
const description = card.role ? `${full} — ${card.role}. ${pitch}` : `${full}. ${pitch}`;
const ogDescription = card.role ? `${card.role}. ${pitch}` : pitch;

let image = card.site.previewImage;
if (image && !/^https:/.test(image)) {
  if (url) { image = url + image; }
  else { warnings.push("site.previewImage needs a public URL (site.url) to work in link previews."); image = ""; }
}

const head = [
  `<title>${text(full)}</title>`,
  `<meta name="description" content="${attr(description)}">`,
  ``,
  `<meta property="og:type" content="profile">`,
  `<meta property="og:title" content="${attr(full)}">`,
  `<meta property="og:description" content="${attr(ogDescription)}">`,
  ...(url ? [`<meta property="og:url" content="${attr(url)}">`] : []),
  `<meta property="og:site_name" content="${attr(full)}">`,
  `<meta property="profile:first_name" content="${attr(card.name.given)}">`,
  `<meta property="profile:last_name" content="${attr(card.name.family)}">`,
  ...(image ? [`<meta property="og:image" content="${attr(image)}">`,
               `<meta property="og:image:alt" content="${attr(full)}">`] : []),
  `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">`,
  `<meta name="twitter:title" content="${attr(full)}">`,
  `<meta name="twitter:description" content="${attr(ogDescription)}">`,
  ...(url ? [``, `<link rel="canonical" href="${attr(url)}">`] : [])
].join("\n");

const reach = [
  card.email && `Email: ${text(card.email).replace("@", "&#64;")}`,
  card.phone.display && `Phone: ${text(card.phone.display)}`
].filter(Boolean).join(" · ");
const noscript = `<noscript>
  <p style="max-width:27rem;margin:1rem auto;text-align:center;color:#667085">
    ${text(full)} — this card needs JavaScript to render.${reach ? " " + reach : ""}
  </p>
</noscript>`;

// What the page script reads. `$schema` and `site` are build-time only.
const config = {
  name: card.name, initials: card.initials, photo: card.photo,
  role: card.role, tagline: card.tagline, location: card.location, org: card.org,
  email: card.email, phone: card.phone, whatsapp: card.whatsapp,
  linkedin: card.linkedin, github: card.github, website: card.website,
  vcardFilename: card.vcardFilename
};
// Safe inside <script>: no "</script>", no line separators that break JS strings.
const json = JSON.stringify(config, null, 2)
  .replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029")
  .split("\n").join("\n  ");

const template = readFileSync(join(ROOT, "src", "card.html"), "utf8");
const markers = [
  [/<!-- @HEAD:[^\n]*-->/, head],
  [/<!-- @NOSCRIPT -->/, noscript],
  [/\/\*@CARD\*\/null/, json],
  [/<html lang="en">\n/, `<html lang="en">\n<!-- Generated by scripts/build.mjs from card.json and src/card.html. Edit those, not this file. -->\n`]
];
let html = template;
for (const [re, value] of markers) {
  if (!re.test(html)) { console.error(`src/card.html is missing the ${re} marker.`); process.exit(1); }
  html = html.replace(re, () => value);
}

/* ---- Write or check --------------------------------------------------- */

const current = existsSync(outFile) ? readFileSync(outFile, "utf8") : "";

for (const w of warnings) { console.warn("  ! " + w); }

if (CHECK) {
  if (current !== html) {
    console.error("index.html is out of date — run: node scripts/build.mjs");
    process.exit(1);
  }
  console.log("index.html is up to date.");
} else {
  if (current !== html) { writeFileSync(outFile, html); }
  console.log(`${current === html ? "Unchanged" : "Built"} index.html for ${full}` +
              ` — ${channels.length} ways to reach you` + (url ? `, published at ${url}` : "") + ".");
}
