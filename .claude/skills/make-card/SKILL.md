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
- **Personal details never go into the repository.** They live in `card.json`
  on this machine (git-ignored) and in the `CARD_JSON` repository secret, which
  the deploy builds from. Never commit `card.json`, `index.html` or a photo
  file, and never paste their details into any other tracked file.
- **Edit `card.json` only.** `index.html` is generated — never edit it by hand.
  The template is `src/card.html`; change it only if the person asks for a
  design change.
- **Ask before you publish.** Publishing puts their phone number on the public
  web.
- Keep the conversation short: ask everything in one message, confirm once,
  then do the work.

## 1. Look at what's there

Read `card.schema.json` (field-by-field rules) and run
`git remote get-url origin` to learn the GitHub owner and repository name.

- **No `card.json`** (a fresh copy, or a new computer): this is a new card.
  `card.example.json` shows the shape; its values are fictional — never reuse
  them. If they already have a published card, ask them for their current
  details; the secret can't be read back.
- **`card.json` exists**: you're updating. Show the current values and ask
  only what should change.

## 2. Interview

Ask in one message. Required:

- **Full name as it should appear**, and which part is the **family name** —
  contacts apps file people under it. (Spanish and Portuguese names often have
  two surnames: "María José García López" → given "María José", family
  "García López".)
- **Role or headline**, e.g. "Product Designer" or "Data Engineer".
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
  (`+12025550123`). **phone.display** is how they'd write it for a human
  (`+1 202 555 0123`).
- **whatsapp.number** is digits only, no `+` (`12025550123`). Country quirks
  that matter for `wa.me` links:
  - Mexico: some mobiles are registered as `521…`. Default to `52…`; tell them
    to try `521…` if WhatsApp says the number is invalid.
  - Argentina: mobiles need a `9` after `54` (`549…`).
- **LinkedIn**: keep the `https://www.linkedin.com/in/<slug>` form. A good
  `display` is the readable part of the slug; drop trailing ID digits
  (`alex-rivera-8a1b2c3d` → `alex-rivera`).
- **GitHub**: `display` is the username.
- **initials**: leave empty to derive from given + family name, unless they want
  something else.
- **site.url**: leave empty on GitHub Pages; the build works it out.

Show the person a short summary of exactly what will be on the card and in the
saved contact, and get a yes before writing anything.

## 4. Photo (only if they gave one)

The photo can't be a file in the repository, so it goes inside `card.json`:

- **Easiest:** a public image URL they already have, such as their GitHub
  avatar (`https://avatars.githubusercontent.com/u/<id>`).
- **Otherwise:** make a centered square crop, 256×256, JPEG, **under 25 KB**,
  and set `"photo"` to a `data:image/jpeg;base64,...` URI. (GitHub secrets
  hold at most 48 KB, and the build checks.) Use whatever is available —
  Python Pillow, `sips` on macOS, ImageMagick (`magick`). Look at the result
  before using it. If nothing can crop images, use initials.

## 5. Build and test

```sh
node scripts/build.mjs   # validates card.json, writes index.html (both git-ignored)
node scripts/test.mjs    # checks the build and the vCard
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

Publishing means putting `card.json` into the repository's `CARD_JSON` secret
and running the deploy. With their go-ahead, and the GitHub CLI signed in
(`gh auth status`):

```sh
gh api -X POST "repos/{owner}/{repo}/pages" -f build_type=workflow   # first time only
gh secret set CARD_JSON < card.json
gh workflow run pages.yml
```

(A "409" from the first command means Pages is already on — fine.) If you
changed code files too, commit and push those; **check `git status` first
and never stage `card.json`, `index.html` or images of the person.**

Without the GitHub CLI, tell them to: Settings → Pages → Source → **GitHub
Actions**; Settings → Secrets and variables → Actions → **New repository
secret**, name `CARD_JSON`, value = the full contents of `card.json`; then
Actions → *Deploy card to Pages* → **Run workflow**.

The live card is at `https://<owner>.github.io/<repo>/` (or
`https://<owner>.github.io/` when the repository is named `<owner>.github.io`).

If it doesn't go live in a couple of minutes:

1. **Forked repositories have Actions switched off.** Actions tab → enable
   workflows, then run *Deploy card to Pages*.
2. *No card details yet* in the run: the `CARD_JSON` secret is missing.
3. On a free GitHub plan the repository must be **public** for Pages to work.
   The secret stays private either way.

Confirm the deploy from the Actions run status. If you can fetch the URL, check
that it returns 200; if you can't, say that you're reporting the run status,
not a page you loaded.

Remind them that `card.json` on this machine is now their only editable copy
— the secret can't be read back — so keep it somewhere safe.

## 8. Hand-off

Give them:

- The card URL.
- The QR page: `<card URL>qr/` — open it on their phone and **Add to Home
  Screen**. It shows a full-screen QR and keeps the screen awake.
- One thing to do before they rely on it: scan the QR from **another** phone,
  tap **Save contact**, and tap the WhatsApp tile. That's the real test.
