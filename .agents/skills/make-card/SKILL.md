---
name: make-card
description: Make or update someone's digital business card in this repository. Interviews them for their details, writes card.json, builds and tests index.html, previews it, and publishes it to GitHub Pages with a QR page. Use when someone wants their own card (often right after forking or using this repo as a template), or wants to change anything on their card — phone, email, role, photo, links.
---

# Make a card

You are setting up a digital business card for **the person you're talking to**.
The card is shown to strangers who scan a QR code, so every detail on it must be
real and theirs.

## Ground rules

- **Never invent a value.** No placeholders, no guessed usernames, no "example.com".
  Ask. A field you don't have is left as `""`, which hides it cleanly.
- **Edit `card.json` only.** `index.html` is generated — never edit it by hand.
  The template is `src/card.html`; change it only if the person asks for a
  design change.
- **Ask before you push or publish.** Pushing to `main` makes their phone number
  public on the web.
- Keep the conversation short: ask everything in one message, confirm once,
  then do the work.

## 1. Look at what's there

Read `card.json` and `card.schema.json` (field-by-field rules), and run
`git remote get-url origin` to learn the GitHub owner and repository name.

If `card.json` holds someone else's details — usually the template author's,
when the repository was just forked — tell the person and start from blank.
**Carry nothing over** from another person's card. If it's already theirs,
you're updating: show the current values and ask only what should change.

## 2. Interview

Ask in one message. Required:

- **Full name as it should appear**, and which part is the **family name** —
  contacts apps file people under it. (Spanish and Portuguese names often have
  two surnames: "Eduardo Angel Romero Diaz" → given "Eduardo", additional
  "Angel", family "Romero Diaz".)
- **Role or headline**, e.g. "Product Designer" or "Master of Software Engineering".
- **At least one way to reach them.**

Optional — offer them, don't push:

- Email
- Mobile number, with country code
- WhatsApp: the same number, a different one, or none
- LinkedIn profile URL
- GitHub profile URL
- Website or portfolio URL
- Company / organization
- City and country
- A photo (otherwise the card shows their initials)
- A one-line tagline (default is fine: "Tap Save contact and skip the typing.")

## 3. Normalize — then read it back

- **phone.dial** is E.164: `+`, country code, number, no spaces
  (`+525543634088`). **phone.display** is how they'd write it for a human
  (`+52 55 4363 4088`).
- **whatsapp.number** is digits only, no `+` (`525543634088`). Country quirks
  that matter for `wa.me` links:
  - Mexico: some mobiles are registered as `521…`. Default to `52…`; tell them
    to try `521…` if WhatsApp says the number is invalid.
  - Argentina: mobiles need a `9` after `54` (`549…`).
- **LinkedIn**: keep the `https://www.linkedin.com/in/<slug>` form. A good
  `display` is the readable part of the slug; drop trailing ID digits
  (`eduardo-angel-romero-542a5350` → `eduardo-angel-romero`).
- **GitHub**: `display` is the username.
- **initials**: leave empty to derive from given + family name, unless they want
  something else.
- **site.url**: leave empty on GitHub Pages; the build works it out.

Show the person a short summary of exactly what will be on the card and in the
saved contact, and get a yes before writing anything.

## 4. Photo (only if they gave one)

Make a centered square crop, 400×400, JPEG, under 150 KB, saved as `photo.jpg`
at the repository root, and set `"photo": "photo.jpg"`. Use whatever is
available — Python Pillow, `sips` on macOS, ImageMagick (`magick`). If nothing
can crop images, ask them for a square image instead of shipping a distorted
one. Look at the result before using it.

## 5. Build and test

```sh
node scripts/build.mjs   # validates card.json, writes index.html
node scripts/test.mjs    # runs the card's own script, checks the vCard
```

If the build rejects a value, its message says why. Fix it **with the person**
when the fix means guessing; fix it yourself only when it's mechanical (like
removing spaces from a phone number). Both commands must pass before you go on.

## 6. Preview

If you can open a browser, serve the folder and look at it at phone width
(about 390 px), in light and dark mode:

```sh
python3 -m http.server 8000   # then open http://localhost:8000/
```

Check that the name fits, every tile they asked for is there, and **Save
contact** downloads a `.vcf`. If you can't open a browser, say so — don't
claim you previewed it.

## 7. Publish

With their go-ahead, commit `card.json`, `index.html` and any photo, and push
to `main`. `.github/workflows/pages.yml` builds, tests and deploys on every push.

The live card is at `https://<owner>.github.io/<repo>/` (or
`https://<owner>.github.io/` when the repository is named `<owner>.github.io`).

**First deploy on a new repository.** If the GitHub CLI is installed and signed
in (`gh auth status`), turn Pages on before the first push, with GitHub Actions
as the source:

```sh
gh api -X POST "repos/{owner}/{repo}/pages" -f build_type=workflow
```

(A "409 already exists" reply means it's already on; that's fine.) Otherwise,
or if it doesn't go live in a couple of minutes, tell them what to check:

1. **Forked repositories have Actions switched off.** Actions tab → enable
   workflows, then run "Deploy card to Pages" (or push again).
2. If the **Enable and configure Pages** step fails: Settings → Pages →
   Source → **GitHub Actions**, then re-run.
3. On a free GitHub plan the repository must be **public** for Pages to work.

Confirm the deploy from the Actions run status. If you can fetch the URL, check
that it returns 200; if you can't, say that you're reporting the run status,
not a page you loaded.

## 8. Hand-off

Give them:

- The card URL.
- The QR page: `<card URL>qr/` — open it on their phone and **Add to Home
  Screen**. It shows a full-screen QR and keeps the screen awake.
- One thing to do before they rely on it: scan the QR from **another** phone,
  tap **Save contact**, and tap the WhatsApp tile. That's the real test.
