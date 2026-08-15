# juniper-website

The Juniper marketing site. Four static files, no build step, no dependencies.

```
index.html     landing page
privacy.html   privacy policy — App Store / Play requirement
terms.html     terms of use — App Store / Play requirement
styles.css     shared styles
```

## Why static

See [`../juniper-design/DECISIONS.md`](../juniper-design/DECISIONS.md) **D1** and **D5**.
Short version: this site has three jobs — explain the app, satisfy the store requirement for
reachable privacy and terms URLs, and give people somewhere to land. Static HTML does all
three, deploys in seconds, has nothing to break, and produces no dependency alerts.

**This is not the app.** Juniper is a native app for iOS and Android. There is no web version
and one is not planned — the tactile parts of the design are exactly what degrades in a
browser, and when you're standing next to your plants you're holding your phone.

## Editing

Open the files. The palette and typography at the top of `styles.css` are copied verbatim
from [`../juniper-app/src/theme/tokens.ts`](../juniper-app/src/theme/tokens.ts) — if a colour
changes there, change it here too. There are no other colours.

Preview locally with any static server:

```bash
npx serve juniper-website
```

## Deploying

Vercel, from the repository root. `vercel.json` at the root sets
`outputDirectory: "juniper-website"`, so a push to `main` publishes these files and nothing
else. No framework preset, no install step, no build command.

## Before public release

- [ ] Buy the domain and point it at the Vercel project.
- [ ] Set up a real `support@` mailbox and replace the placeholder address in `privacy.html`
      and `terms.html`.
- [ ] Confirm the legal entity and governing-law jurisdiction in `terms.html`.
- [ ] Add App Store / Google Play badges to `index.html` and replace the "In development"
      status band once builds are live.
- [ ] Add a favicon and an `og:image`.
