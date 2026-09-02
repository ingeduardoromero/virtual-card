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

## Notes

- **Save contact** builds a vCard 3.0 in the browser and downloads it as a
  `.vcf`, so the visitor lands in their contacts app.
- Phone numbers should stay in full international format so `tel:` links and the
  vCard work from any country. WhatsApp is separate and wants digits only, no `+`.
- The avatar falls back to `initials` until you set `photo`.
- Deployed by `.github/workflows/pages.yml` on every push to `main`. The
  workflow enables Pages itself on first run, so the repository's Pages source
  is *GitHub Actions*, not a branch. It publishes `index.html` plus any image
  files at the repository root — `README.md` and `.github/` are not served.
