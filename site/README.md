# Yap support and documents

Static HTML and CSS, with no dependencies, JavaScript or build step.

## Deploy on Vercel

1. Import this repository as a new Vercel project.
2. Set **Root Directory** to `site` and **Framework Preset** to **Other**.
3. Leave **Build Command** empty (override the default if needed). Serve the root
   directory itself; do not select `dist` or another build output.
4. Deploy and add **yap.samarxkx.dev** under the project's Domains settings. Follow
   Vercel's instructions for the domain's DNS configuration.
5. Verify `/`, `/privacy`, `/terms`, `/delete-account`, `/guidelines` and `/child-safety`
   on the public domain before using the URLs in store submissions.

`vercel.json` enables clean URLs: `/privacy` serves `privacy.html`.

## Maintain content

The policies in `docs/legal/privacy-policy.md`, `terms-of-service.md`,
`delete-account.md` and `child-safety.md` are the content sources. Update the matching
HTML whenever a source changes. `guidelines.html` mirrors `src/app/guidelines.tsx`.
Keep the shared header, navigation, footer and `style.css` consistent across pages.
The app icon is copied from `assets/images/icon.png`.

For local preview, use a static server that resolves extensionless paths to `.html`
(or visit the `.html` files directly with a basic server). Check every page in light
and dark mode at desktop and phone widths after edits. No deployment is performed
by the repository's app scripts.
