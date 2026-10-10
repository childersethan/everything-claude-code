# True Flow Pump & Well website

Static site with no build step. Open `index.html` in a browser, or deploy it on Netlify (below).

| Path | What it is |
|---|---|
| `index.html` | The page markup |
| `css/site.css` | All styles, with light and dark themes |
| `js/config.js` | **Business details and page content. Edit this to update the site.** |
| `js/sizing.js` | Pure calculations (pump sizing, tank pre-charge, open hours, form checks) |
| `js/icons.js` | Inline SVG icons |
| `js/app.js` | Wires the page together |
| `tests/` | Unit tests for `sizing.js` and Playwright end-to-end tests |
| `build.sh` | Builds `preview/preview.html`, a copy without the `<head>` wrapper for the Claude artifact preview. The real site doesn't need it. |

## Business details

Phone, email, hours, time zone, home base, service radius and the towns shown on the service-area map are in `biz` in `js/config.js`. Each town has a latitude and longitude so the map plots its real direction and distance from Hoxie. There are no reviews yet; add a section once real ones come in.

## Hosting on Netlify and turning on the request form

The site is set up for Netlify; `netlify.toml` at the repo root tells Netlify to publish only `trueflow-site/` and adds security headers.

1. Sign in at netlify.com with GitHub, choose "Add new project" then "Import an existing project", and pick this repository. Leave the base directory, build command and publish directory fields blank; `netlify.toml` sets them.
2. In the project's Forms page, enable form detection, then redeploy. The `service-request` form appears there.
3. Under Forms, "Form notifications", add an email notification to trueflow2026@gmail.com.
4. To use a domain, add it under "Domain management". Netlify provides HTTPS automatically.

The form posts to Netlify only when the page is served over http(s) with the `data-netlify` attribute, so opening `index.html` from disk or viewing the artifact preview shows a "doesn't send yet" message instead. The hidden `_gotcha` field is a honeypot Netlify uses to drop bot submissions. To use another provider (e.g. Formspree), paste its https endpoint into `formEndpoint` in `js/config.js` and add its origin to `connect-src` in the Content-Security-Policy meta tag in `index.html`.

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

Once the site has a domain, add `<meta property="og:image" content="https://YOUR-DOMAIN/images/windmill-repair-crew.jpg">` to `index.html` so Facebook link previews show a photo (it must be a full https URL).
