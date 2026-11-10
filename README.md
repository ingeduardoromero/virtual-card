# virtual-card

A digital business card that someone opens by scanning a QR code: your name,
a **Save contact** button that drops you straight into their phone's contacts,
and one-tap WhatsApp, call, email and LinkedIn.

One self-contained `index.html` on GitHub Pages: no frameworks, no webfonts,
no requests after the page itself, so it paints instantly on mobile data.

**Live:** https://ingeduardoromero.github.io/virtual-card/ ·
**QR for your phone:** https://ingeduardoromero.github.io/virtual-card/qr/

## Make your own

**With an AI coding agent (easiest).** Use this repo as a template (or fork
it), open your copy in Claude Code and run:

```
/make-card
```

It asks for your details, never makes any up, builds and tests the card,
shows you a preview, and publishes it when you say so. Other agents can follow
the same steps from [`AGENTS.md`](AGENTS.md).

**By hand.** Use this repo as a template, then edit `card.json` on GitHub and
commit. The workflow rebuilds `index.html`, runs the tests and publishes.
Replace *every* field — leave any you don't want as `""`.

**Locally.**

```sh
# edit card.json, then:
node scripts/build.mjs   # validates and writes index.html
node scripts/test.mjs    # checks the vCard and the build
```

Your card will be at `https://<your-username>.github.io/<repo-name>/`, and
its QR page at `…/qr/`.

### First deploy on a new copy

- **Forks have Actions switched off** — open the Actions tab and enable them.
  ("Use this template" copies don't have this problem.)
- If the *Enable and configure Pages* step fails, set Settings → Pages →
  Source to **GitHub Actions** and re-run.
- On a free GitHub plan the repository must be **public** for Pages to work.
  The card itself is public either way: that's the point of it.

## Editing

Everything personal is in **`card.json`**; [`card.schema.json`](card.schema.json)
documents each field, and editors like VS Code show those notes as you type.

- An empty string `""` hides that item: no empty tile, no blank line in the
  contact.
- `phone.dial` is full international format (`+525543634088`); `phone.display`
  is how it reads (`+52 55 4363 4088`).
- `whatsapp.number` is digits only, no `+`. Some Mexican mobiles need `521…`
  instead of `52…`; Argentine mobiles need `549…`.
- `photo`: a square image next to `index.html` (about 400×400, under 150 KB).
  Without one, the card shows your initials.
- `site.previewImage`: optional 1200×630 image for link previews in chats.

`index.html` is generated — don't edit it directly. If you edit `card.json` on
GitHub, the workflow rebuilds and commits `index.html` for you.

## Showing the QR

Open `…/qr/` on your phone and use **Add to Home Screen**. It opens full screen
like an app, keeps the screen from dimming, and always encodes the card one
folder above it, so a copy of this repo gets a QR for its own card with no
edits.

## How it's built

| Path | |
|---|---|
| `card.json` | Your details |
| `src/card.html` | Page template: markup, styles, rendering and vCard code |
| `scripts/build.mjs` | Validates `card.json` and writes `index.html` (Node 18+, no dependencies) |
| `scripts/test.mjs` | Runs the page script in a fake DOM and checks the vCard |
| `qr/` | Full-screen QR page |
| `.github/workflows/pages.yml` | Build, test and deploy on every push to `main` |
| `.claude/skills/make-card/` | The `/make-card` agent workflow |

**Save contact** builds a vCard 3.0 in the browser (RFC 2426 escaping and line
folding) and downloads it as a `.vcf`. Link previews, the page title and the
canonical URL are generated from `card.json` at build time, since chat apps
don't run JavaScript.

This repository's Pages was first enabled from the `main` branch, so GitHub's
own *pages build and deployment* run also fires on each push; both publish the
same committed files. To keep only the workflow, set Settings → Pages → Source
to *GitHub Actions*.

## License

MIT — see [`LICENSE`](LICENSE). The QR page uses Project Nayuki's QR Code
generator library (MIT).
