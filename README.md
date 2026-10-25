# amirpousti.com

Personal portfolio of Amir Pousti: finance and engineering projects, CV and contact.

Live site: https://www.amirpousti.com

## How it works

This is a static site with no build step. Vercel serves the files in this repository exactly as they are.

| Path | What it is |
| --- | --- |
| `index.html` | Home page |
| `finance/`, `engineering/` | Project listing pages and the three project pages |
| `notes/` | Three short research notes (linked from the home page) |
| `cv/`, `contact/`, `privacy/`, `404.html` | Utility pages |
| `assets/site.css` | The one stylesheet, including dark mode |
| `assets/*.mjs` | Small scripts: the interactive explorers, the scroll-driven assembly film, cookie consent and analytics |
| `assets/fonts/` | Geist (SIL Open Font License) |
| `downloads/` | Reports, the Excel model and the CV PDF |
| `api/scores.mjs` | The 404 game's leaderboard (a Vercel serverless function). Needs the `KV_REST_API_URL` and `KV_REST_API_TOKEN` variables that the connected Upstash Redis database provides; without them the page simply hides the board. Set `LEADERBOARD_ADMIN_KEY` to allow deleting a name with `DELETE /api/scores?name=…` and an `x-admin-key` header |
| `vercel.json` | Security headers, caching and the one redirect |

## Making a change

1. Edit the files on a branch (or straight on `main`).
2. Push. Vercel builds a preview for every branch and deploys `main` to production automatically.

Notes on the HTML:

- Each page carries its own `<title>`, description and social-card tags in `<head>`.
- Asset links use `?v=<hash>` for cache-busting. Change the hash when you change `site.css` or a script, otherwise visitors may see the old version for a long time.
- Download sizes shown next to the PDF links (`PDF · 5.5 MB`) are hand-written text; update them if you replace a file.
