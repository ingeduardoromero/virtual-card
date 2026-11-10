#!/usr/bin/env node
// Tests the build and the card's own script, with no browser and no dependencies.
//   node scripts/test.mjs
//
// Uses the fictional card.example.json, never your card.json, so it runs the
// same everywhere — including in CI before your details are written.
//
// The page script runs inside a tiny fake DOM, so the vCard checked here is the
// exact one a visitor's phone would download.

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BUILD = join(ROOT, "scripts", "build.mjs");
const tmp = mkdtempSync(join(tmpdir(), "card-test-"));
let failed = 0, passed = 0;

function ok(cond, label) {
  if (cond) { passed++; } else { failed++; console.error("  ✗ " + label); }
}

// Run builds as if on a laptop unless a test says otherwise.
const localEnv = { ...process.env };
delete localEnv.GITHUB_ACTIONS;

function build(card, extra = [], env = {}) {
  const cardFile = join(tmp, "card.json"), out = join(tmp, "index.html");
  writeFileSync(cardFile, JSON.stringify(card));
  try {
    const log = execFileSync("node", [BUILD, "--card", cardFile, "--out", out, "--url", "https://example.test/card/", ...extra],
                             { stdio: ["ignore", "pipe", "pipe"], env: { ...localEnv, ...env } }).toString();
    return { ok: true, html: readFileSync(out, "utf8"), log };
  } catch (e) {
    return { ok: false, log: e.stderr.toString() + e.stdout.toString() };
  }
}

// Minimal DOM: enough for the card script to render, then click Save contact.
function run(html) {
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].pop()[1];
  const els = {};
  const el = (id) => els[id] || (els[id] = {
    id, children: [], attrs: {}, style: {}, hidden: false, textContent: "", listeners: {},
    appendChild(c) { this.children.push(c); return c; }, removeChild() {},
    setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; },
    addEventListener(t, f) { this.listeners[t] = f; }, click() {}
  });
  let anon = 0, blob = null, downloadName = null;
  const document = {
    getElementById: el,
    createElement: (tag) => { const e = el("_" + tag + anon++); e.tag = tag;
      if (tag === "a") { e.click = function () { downloadName = this.download; }; } return e; },
    createElementNS: (_, tag) => el("_" + tag + anon++),
    createTextNode: (t) => ({ text: t }),
    body: el("body")
  };
  el("save").textContent = "Save contact";
  const sandbox = {
    document, navigator: {}, location: { href: "https://example.test/card/" },
    Blob: class { constructor(parts) { blob = parts.join(""); } },
    URL: { createObjectURL: () => "blob:x", revokeObjectURL() {} },
    setTimeout: () => 0, clearTimeout() {}, encodeURIComponent, Date
  };
  vm.runInNewContext(script, sandbox);
  els.save.listeners.click();
  const tiles = els.grid.children.map((t) => ({ href: t.href, label: t.children[1].textContent }));
  return { els, tiles, vcard: blob, downloadName };
}

const base = JSON.parse(readFileSync(join(ROOT, "card.example.json"), "utf8"));
const clone = (o) => JSON.parse(JSON.stringify(o));

/* ---- The example card builds and renders ------------------------------ */
{
  const r = build(base);
  ok(r.ok, "card.example.json builds: " + r.log);
  if (r.ok) {
    const { tiles, vcard, downloadName } = run(r.html);
    ok(tiles.length >= 1, "at least one contact tile renders");
    ok(/^BEGIN:VCARD\r\nVERSION:3\.0\r\n/.test(vcard), "vCard starts with BEGIN/VERSION 3.0 and CRLF");
    ok(vcard.endsWith("END:VCARD\r\n"), "vCard ends with END:VCARD and CRLF");
    ok(!/[^\r]\n/.test(vcard), "every line break is CRLF");
    ok(/\.vcf$/.test(downloadName), "download is named .vcf");
    ok(!/@CARD|@HEAD|@NOSCRIPT/.test(r.html), "no template markers left in the output");
  }
}

/* ---- vCard escaping and folding (RFC 2426) ----------------------------- */
{
  const c = clone(base);
  c.name = { full: "Ana, María; López", given: "Ana", additional: "", family: "López; Díaz" };
  c.role = "Engineer, Platform; \\ Infra";
  c.org = "A".repeat(120);
  const r = build(c);
  ok(r.ok, "tricky name builds: " + r.log);
  if (r.ok) {
    const { vcard } = run(r.html);
    const unfolded = vcard.replace(/\r\n /g, "");
    ok(unfolded.includes("N:López\\; Díaz;Ana;;;"), "semicolons in the family name are escaped in N:");
    ok(unfolded.includes("FN:Ana\\, María\\; López"), "commas and semicolons are escaped in FN:");
    ok(unfolded.includes("TITLE:Engineer\\, Platform\\; \\\\ Infra"), "backslashes are escaped in TITLE:");
    ok(vcard.split("\r\n").every((l) => l.length <= 75), "long lines are folded to 75 characters");
    ok(unfolded.includes("ORG:" + "A".repeat(120)), "folding round-trips");
  }
}

/* ---- Hidden fields stay hidden ----------------------------------------- */
{
  const c = clone(base);
  c.whatsapp = { number: "", message: "" };
  c.linkedin = { url: "", display: "" };
  c.email = "a@b.co"; c.phone = { display: "", dial: "" };
  const r = build(c);
  ok(r.ok, "minimal card builds: " + r.log);
  if (r.ok) {
    const { tiles, vcard } = run(r.html);
    ok(tiles.length === 1 && tiles[0].label === "Email", "only the Email tile renders when it's the only channel");
    ok(!/TEL|wa\.me|linkedin/i.test(vcard), "empty fields are left out of the vCard");
  }
}

/* ---- Defaults ----------------------------------------------------------- */
{
  const c = clone(base);
  c.initials = ""; c.vcardFilename = undefined; c.phone = { display: "", dial: "+44 20 7946 0958" };
  c.github = { url: "https://github.com/octocat", display: "" };
  const r = build(c);
  ok(r.ok, "defaults build: " + r.log);
  if (r.ok) {
    const { els, tiles } = run(r.html);
    const mono = els.avatar.children[0];
    ok(mono && mono.textContent === (c.name.given[0] + c.name.family[0]).toUpperCase(), "initials default to given + family");
    ok(tiles.some((t) => t.href === "tel:+442079460958"), "spaces are stripped from phone.dial");
    ok(tiles.some((t) => t.label === "GitHub"), "GitHub tile appears once its url is set");
    ok(/"display": "octocat"/.test(r.html), "link display defaults to the last part of the URL");
  }
}

/* ---- Injection: card text can't break out of the page ------------------ */
{
  const c = clone(base);
  c.tagline = "</script><script>alert(1)</script>";
  c.name.full = c.name.full + ' "<b>"';
  const r = build(c);
  ok(r.ok, "hostile text builds: " + r.log);
  if (r.ok) {
    ok(r.html.split("</script>").length === 2, "card text cannot close the <script> tag");
    ok(!r.html.includes('"<b>"">'), "quotes in the name are escaped in meta tags");
    ok(run(r.html).els.tagline.textContent === c.tagline, "the text still renders exactly as written");
  }
}

/* ---- Bad input is rejected with a useful message ----------------------- */
const rejects = [
  ["whatsapp number with + and spaces", (c) => { c.whatsapp.number = "+1 202 555 0123"; }, /digits only.*"12025550123"/],
  ["phone without country code", (c) => { c.phone.dial = "2025550123"; }, /phone\.dial/],
  ["misspelled field", (c) => { c.linkdin = c.linkedin; }, /linkdin is not a known field.*linkedin/],
  ["missing family name", (c) => { c.name.family = ""; }, /name\.family is required/],
  ["http (not https) link", (c) => { c.website = { url: "http://example.com", display: "" }; }, /website\.url/],
  ["photo file that doesn't exist", (c) => { c.photo = "nope.jpg"; }, /photo "nope\.jpg" was not found/],
  ["no way to reach you", (c) => { c.email = ""; c.phone = {}; c.whatsapp = {}; c.linkedin = {}; c.github = {}; c.website = {}; },
   /at least one way to reach you/],
  ["number where text belongs", (c) => { c.role = 42; }, /role must be a string/]
];
for (const [label, mutate, message] of rejects) {
  const c = clone(base); mutate(c);
  const r = build(c);
  ok(!r.ok && message.test(r.log), `rejects ${label} — got: ${r.log.trim()}`);
}

/* ---- CI logs never show personal values -------------------------------- */
{
  const c = clone(base); c.email = "not-an-email"; c.whatsapp.number = "+1 202 555 0123";
  const r = build(c, [], { GITHUB_ACTIONS: "true" });
  ok(!r.ok && !r.log.includes("not-an-email") && !r.log.includes("202 555") && /hidden in CI logs/.test(r.log),
     "build errors in CI hide the values — got: " + r.log.trim());
  const good = build(base, [], { GITHUB_ACTIONS: "true" });
  ok(good.ok && !good.log.includes(base.name.full) && !good.log.includes(base.email),
     "a successful CI build doesn't print the name or email — got: " + good.log.trim());
}

/* ---- Personal files stay out of the repository --------------------------- */
{
  const ignored = readFileSync(join(ROOT, ".gitignore"), "utf8").split(/\r?\n/);
  ok(ignored.includes("card.json") && ignored.includes("index.html"), ".gitignore keeps card.json and index.html out of git");
  ok(!existsSync(join(ROOT, "card.example.json")) || !/@(?!example\.)/.test(readFileSync(join(ROOT, "card.example.json"), "utf8")),
     "card.example.json only uses example.* addresses");
}

/* ---- Every agent gets the same make-card instructions ------------------ */
{
  const shared = readFileSync(join(ROOT, ".agents", "skills", "make-card", "SKILL.md"), "utf8");
  const claude = readFileSync(join(ROOT, ".claude", "skills", "make-card", "SKILL.md"), "utf8");
  ok(shared === claude, ".claude/skills/make-card/SKILL.md differs from .agents/skills/make-card/SKILL.md — copy one over the other");
}

rmSync(tmp, { recursive: true, force: true });
console.log(failed ? `${failed} failed, ${passed} passed.` : `All ${passed} checks passed.`);
process.exit(failed ? 1 : 0);
