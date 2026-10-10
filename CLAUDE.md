# Working rules for this repository

- `architecture.md` is the master specification. Every change to any file or foundational setting must update `architecture.md` in the same commit (affected sections plus a line in the Changelog), so it always contains everything needed to rebuild the site from scratch.
- Follow the design rules in `architecture.md` section 3 (e.g. no icons or emoji inside modules).
- The owner writes in Hebrew; reply in Hebrew.
- Pushing to `main` redeploys the live site on GitHub Pages.
- Publish every finished change right away (merge into `main`) without asking first: the live site is the owner's only way to see changes. Test in a headless browser before merging, then wait until the `pages build and deployment` run for that commit finishes with `success` (GitHub Actions API) and only then tell the owner it is ready to refresh (Cmd+Shift+R if the old version still shows).
- The site is an installable app (PWA, `sw.js` + `pwa.js`). Deploys need no extra step: there is no cache version to bump, and the installed app finds new versions by itself. Don't add a precache list or version constant to `sw.js`.
