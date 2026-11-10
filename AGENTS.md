# Agent guide

A digital business card: a single self-contained `index.html` published on
GitHub Pages, plus a full-screen QR page at `qr/`.

## The one rule

**Personal details live only in `card.json`.** `index.html` is generated from
`card.json` + `src/card.html` by `scripts/build.mjs` and committed, so it still
works as a standalone file. Never hand-edit `index.html`.

## Setting up or changing someone's card

Follow `.agents/skills/make-card/SKILL.md`. Claude Code and Google's
Antigravity (the app and the `agy` CLI) both run it as `/make-card`; any other
agent can read it as plain instructions.
In short:
interview the person, never invent values, write `card.json`, build, test,
preview, and publish only with their go-ahead.

## Files

| Path | What it is |
|---|---|
| `card.json` | The person's details. The only file most changes touch. |
| `card.schema.json` | Field-by-field rules and descriptions for `card.json`. |
| `src/card.html` | Page template: markup, styles, render + vCard script. |
| `scripts/build.mjs` | Validates `card.json` and writes `index.html`. No dependencies, Node 18+. |
| `scripts/test.mjs` | Runs the page script in a fake DOM; checks tiles, vCard escaping and folding, and rejection of bad input. |
| `index.html` | Generated. Committed so the repo always holds a working card. |
| `qr/` | Full-screen QR page; encodes the URL one folder above itself, so it needs no edits. |
| `.github/workflows/pages.yml` | On push to `main`: build, test, commit `index.html` if stale, deploy. |
| `.agents/skills/make-card/` | The make-card workflow ([Agent Skills](https://agentskills.io) format; Antigravity and others). |
| `.claude/skills/make-card/` | Identical copy where Claude Code looks. `scripts/test.mjs` fails if the two differ. |

## Commands

```sh
node scripts/build.mjs           # validate card.json, write index.html
node scripts/build.mjs --check   # exit 1 if index.html is stale
node scripts/test.mjs            # all checks; must pass before pushing
```

## Constraints worth keeping

- No frameworks, no webfonts, no runtime requests: the card must paint
  instantly on a phone that just scanned a QR code.
- vCard 3.0 per RFC 2426: escape `\` `,` `;` and newlines in values, fold at 75
  characters with CRLF + space. `scripts/test.mjs` covers this — keep it green.
- Contact glyphs are drawn inline; don't add vendor logo files.
- Accessibility: visible focus, `prefers-reduced-motion`, contrast ≥ 4.5:1 for
  text.
