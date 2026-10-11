# True Flow Pump & Well website

Static site with no build step on the server. Open `index.html` in a browser, or deploy it on Netlify (below).

The site has seven pages: Home (`index.html`), Services, Diagnose (`tools.html`), Our work, About, Service area and Contact. Every page shares one header, footer and phone tab bar from `src/layout.html`. To change a page, edit `src/pages/<page>.html` (or the layout), then run `npm run pages` to regenerate the root `*.html` files, and commit both. `npm test` fails if they are out of sync.

| Path | What it is |
|---|---|
| `src/layout.html`, `src/pages/` | Page sources: the shared layout and each page's content |
| `scripts/pages.js` | Builds the root `*.html` pages from `src/`; the page list, titles and tab bar live here |
| `*.html` (root) | The generated pages Netlify serves |
| `css/site.css` | All styles, with light and dark themes |
| `js/config.js` | **Business details and page content. Edit this to update the site.** |
| `js/sizing.js` | Pure calculations (pump sizing, tank pre-charge, open hours, form checks, distances) |
| `js/icons.js` | Inline SVG icons |
| `js/app.js` | Wires each page together; each part runs only on the page that has it |
| `tests/` | Unit tests and Playwright end-to-end tests (served over http like Netlify) |
| `build.sh` | Builds `preview/` for the Claude artifact preview. The real site doesn't need it. |

## Business details

Phone, email, hours, time zone, home base, service radius and the towns shown on the service-area map are in `biz` in `js/config.js`. Each town has a latitude and longitude so the map plots its real direction and distance from Hoxie. There are no reviews yet; add a section once real ones come in.

## Hosting on Netlify and turning on the request form

The site is set up for Netlify; `netlify.toml` at the repo root tells Netlify to publish only `trueflow-site/` and adds security headers.

1. Sign in at netlify.com with GitHub, choose "Add new project" then "Import an existing project", and pick this repository. Leave the base directory, build command and publish directory fields blank; `netlify.toml` sets them.
2. In the project's Forms page, enable form detection, then redeploy. The `service-request` form appears there.
3. Under Forms, "Form notifications", add an email notification to trueflow2026@gmail.com.
4. To use a domain, add it under "Domain management". Netlify provides HTTPS automatically.

The form posts to Netlify only when the page is served over http(s) and the form has `data-delivery="netlify"` (Netlify strips `data-netlify` when it deploys, so the code can't rely on it), so opening `index.html` from disk or viewing the artifact preview shows a "doesn't send yet" message instead. The hidden `_gotcha` field is a honeypot Netlify uses to drop bot submissions. To use another provider (e.g. Formspree), paste its https endpoint into `formEndpoint` in `js/config.js` and add its origin to `connect-src` in the Content-Security-Policy meta tag in `index.html`.

## Adding job photos

Put photos in an `images/` folder and list them in `photos`, e.g. `{ src: "images/pump-pull.jpg", cap: "Pump replacement, 320 ft" }`. Until then the Recent work section shows empty photo slots.

## Tests

```sh
npm test            # unit tests (Node 18+)
npm run test:e2e    # browser tests (needs the playwright package and Chromium)
```

## Hosting headers

On Netlify, `netlify.toml` sends `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` and `Permissions-Policy` and `Strict-Transport-Security`, and returns 404 for repo files that are not part of the site. On another host, send the same headers.

## Before launch

The domain is trueflowpumpandwell.com. It appears in the canonical and `og:` tags in `index.html`, `website` in `js/config.js`, `robots.txt` and `sitemap.xml`; change all of them if the domain changes. `images/share.jpg` (1200×630) is the photo Facebook and texts show when the link is shared.
