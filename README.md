# virtual-card

A digital business card that someone opens by scanning a QR code: your name,
a **Save contact** button that drops you straight into their phone's contacts,
and one-tap WhatsApp, call, email and LinkedIn.

One self-contained page on GitHub Pages: no frameworks, no webfonts, no
requests after the page itself, so it paints instantly on mobile data.

**Live:** https://ingeduardoromero.github.io/virtual-card/ ·
**QR for your phone:** https://ingeduardoromero.github.io/virtual-card/qr/

## Your details stay out of the repository

This repository holds only code. Your details live in two places:

- **`card.json` on your computer.** Git ignores it, so it's never committed.
- **A repository secret named `CARD_JSON`**, with the same contents. Secrets
  are encrypted, never copied to forks or template copies, and hidden from
  logs. The deploy workflow builds the page from it.

The published card is public, of course — that's its job. What stays private
is everything else: copies of this repo, clones, and its history get no
personal data.

## Make your own

**With an AI coding agent.** Paste this into
[Claude Code](https://claude.com/claude-code), Google
[Antigravity](https://antigravity.google) (the app, or `agy` in a terminal),
or any coding agent that can run commands:

```text
Make me my own digital business card from the GitHub template
ingeduardoromero/virtual-card.

1. Check the GitHub CLI is installed and signed in (`gh auth status`).
   If it isn't, walk me through installing it and `gh auth login`.
2. Create my copy and go into it:
   gh repo create my-card --template ingeduardoromero/virtual-card --public --clone
   cd my-card
3. Follow .agents/skills/make-card/SKILL.md exactly. Ask me for my
   details; don't invent anything, and don't reuse the example values.
```

Change `my-card` if you want a different address. Your card ends up at
`https://<your-username>.github.io/my-card/`.

Already have your copy open? Just run `/make-card`. The agent asks for your
details, builds and tests the card, shows you a preview, and publishes it when
you say so. (Chat apps like the Gemini or Claude websites can't do this: the
agent has to run commands and talk to GitHub.)

**By hand.**

1. **Use this template → Create a new repository** (public).
2. **Settings → Pages → Source: GitHub Actions.**
3. Copy [`card.example.json`](card.example.json), replace every value with
   yours (`""` hides a field), and check it locally if you have Node:
   `cp card.example.json card.json && node scripts/build.mjs`.
4. **Settings → Secrets and variables → Actions → New repository secret**:
   name `CARD_JSON`, value = your whole `card.json`.
5. **Actions → Deploy card to Pages → Run workflow.**

The first automatic run on a new copy fails with *No card details yet* until
step 4 is done. That's expected.

## Changing your card

Edit your local `card.json`, then publish it:

```sh
node scripts/build.mjs                      # check it (and preview index.html)
gh secret set CARD_JSON < card.json         # upload it
gh workflow run pages.yml                   # deploy
```

Or paste the new contents into the `CARD_JSON` secret in Settings and run the
workflow from the Actions tab. **Keep `card.json` safe**: secrets can't be read
back, so it's your only editable copy.

[`card.schema.json`](card.schema.json) documents every field; editors like VS
Code show those notes as you type.

- `phone.dial` is full international format (`+12025550123`); `phone.display`
  is how it reads (`+1 202 555 0123`).
- `whatsapp.number` is digits only, no `+`. Some Mexican mobiles need `521…`
  instead of `52…`; Argentine mobiles need `549…`.
- `photo`: an `https://` image URL (your GitHub avatar works), or a small
  `data:` URI (about 256×256, under 25 KB). Without one, the card shows your
  initials.
- `site.previewImage`: optional 1200×630 image URL for link previews in chats.

## Showing the QR

Open `…/qr/` on your phone and use **Add to Home Screen**. It opens full screen
like an app, keeps the screen from dimming, and always encodes the card one
folder above it, so every copy gets a QR for its own card with no edits.

## How it's built

| Path | |
|---|---|
| `card.example.json` | Fictional example with every field |
| `src/card.html` | Page template: markup, styles, rendering and vCard code |
| `scripts/build.mjs` | Validates `card.json` and writes `index.html` (Node 18+, no dependencies) |
| `scripts/test.mjs` | Builds the example card, runs the page script in a fake DOM, checks the vCard |
| `qr/` | Full-screen QR page |
| `.github/workflows/pages.yml` | Test, build from the `CARD_JSON` secret, deploy |
| `.agents/skills/make-card/` | The `/make-card` agent workflow (copied to `.claude/skills/` for Claude Code) |

**Save contact** builds a vCard 3.0 in the browser (RFC 2426 escaping and line
folding) and downloads it as a `.vcf`. Link previews, the page title and the
canonical URL are generated at build time, since chat apps don't run
JavaScript.

## License

MIT — see [`LICENSE`](LICENSE). The QR page uses Project Nayuki's QR Code
generator library (MIT).
