# Agent guide

A digital business card: a single self-contained `index.html` published on
GitHub Pages, plus a full-screen QR page at `qr/`.

## The one rule

**No personal details in the repository.** They live in `card.json`, which is
git-ignored and kept on the owner's machine, and in the `CARD_JSON` repository
secret. The deploy workflow writes the secret to `card.json` and runs
`scripts/build.mjs`, which generates `index.html` (also git-ignored) from
`card.json` + `src/card.html`. Never commit `card.json`, `index.html` or
photos of people, and never put real details in docs, tests or examples —
use the fictional values in `card.example.json`.

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
| `card.json` | The person's details. **Git-ignored**; local only, published via the `CARD_JSON` secret. |
| `card.example.json` | Fictional example with every field. Tests build from it. |
| `card.schema.json` | Field-by-field rules and descriptions for `card.json`. |
| `src/card.html` | Page template: markup, styles, render + vCard script. |
| `scripts/build.mjs` | Validates `card.json` and writes `index.html`. No dependencies, Node 18+. |
| `scripts/test.mjs` | Builds the example card and runs the page script in a fake DOM: tiles, vCard escaping and folding, rejection of bad input, no values in CI logs. |
| `index.html` | Generated, **git-ignored**. |
| `qr/` | Full-screen QR page; encodes the URL one folder above itself, so it needs no edits. |
| `.github/workflows/pages.yml` | On push to `main` or manual run: test, build from the `CARD_JSON` secret, deploy. |
| `.agents/skills/make-card/` | The make-card workflow ([Agent Skills](https://agentskills.io) format; Antigravity and others). |
| `.claude/skills/make-card/` | Identical copy where Claude Code looks. `scripts/test.mjs` fails if the two differ. |

## Commands

```sh
node scripts/build.mjs                                    # validate card.json, write index.html
node scripts/test.mjs                                     # all checks; must pass before pushing
gh secret set CARD_JSON < card.json && gh workflow run pages.yml   # publish card changes
```

## Constraints worth keeping

- Build output in GitHub Actions must not print personal values: logs of a
  public repository are public.
- No frameworks, no webfonts, no runtime requests: the card must paint
  instantly on a phone that just scanned a QR code.
- vCard 3.0 per RFC 2426: escape `\` `,` `;` and newlines in values, fold at 75
  characters with CRLF + space. `scripts/test.mjs` covers this — keep it green.
- Contact glyphs are drawn inline; don't add vendor logo files.
- Accessibility: visible focus, `prefers-reduced-motion`, contrast ≥ 4.5:1 for
  text.
