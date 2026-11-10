# virtual-card

A digital business card: one self-contained `index.html`, no frameworks, no build
step, no webfonts, no network requests after the document itself.

**Live:** https://ingeduardoromero.github.io/virtual-card/

## Editing

Every personal detail lives in the `CONFIG` object at the top of the `<script>`
block near the bottom of `index.html`. Change it there and nothing else — the
page renders itself and generates the vCard from that object.

Any field left as an empty string `""` hides itself: no empty row, no dangling
separator. To add a GitHub or website row, fill in its `url` and `display`.

## Showing the QR

`qr/` is a full-screen QR code that opens the card:
https://ingeduardoromero.github.io/virtual-card/qr/

Open it on your phone and use *Add to Home Screen*. It launches like an app,
keeps the screen from dimming while it's open, and needs no edits: it encodes
whatever URL sits one folder above it, so a fork gets a QR for its own card.
Set `CARD_URL` in `qr/index.html` only if the card lives somewhere else.

The QR is drawn in the browser by Project Nayuki's QR Code generator library
(MIT), inlined in the page.

## Notes

- **Save contact** builds a vCard 3.0 in the browser and downloads it as a
  `.vcf`, so the visitor lands in their contacts app.
- Phone numbers should stay in full international format so `tel:` links and the
  vCard work from any country. WhatsApp is separate and wants digits only, no `+`.
- The avatar falls back to `initials` until you set `photo`.
- Deployed by `.github/workflows/pages.yml` on every push to `main`. It
  publishes `index.html`, `qr/`, and any image files at the repository root.
  Pages was first enabled from the `main` branch, so GitHub's own *pages build
  and deployment* run also fires on each push. To keep only the workflow, set
  Settings → Pages → Source to *GitHub Actions*.
