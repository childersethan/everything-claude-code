# True Flow Pump & Well website

Static site with no build step. Open `index.html` in a browser, or upload the folder to any static host (GitHub Pages, Netlify, Cloudflare Pages).

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

Phone, email, hours, time zone, town, service radius, owner and towns served are in `biz` in `js/config.js`. They are placeholders and show on the page in dashed orange until replaced. The reviews in `reviews` are samples.

## Turning on the request form

Create a form at formspree.io and paste its `https://formspree.io/f/...` URL into `formEndpoint`. Until then the form shows a preview message instead of sending. The form has a hidden honeypot field (`_gotcha`) that Formspree uses to drop bot submissions; also turn on spam filtering and restrict the form to the site's domain in Formspree's settings. If you use a different provider, add its origin to `connect-src` in the Content-Security-Policy meta tag in `index.html`.

## Adding job photos

Put photos in an `images/` folder and list them in `photos`, e.g. `{ src: "images/pump-pull.jpg", cap: "Pump replacement, 320 ft" }`. Until then the Recent work section shows empty photo slots.

## Tests

```sh
npm test            # unit tests (Node 18+)
npm run test:e2e    # browser tests (needs the playwright package and Chromium)
```

## Hosting headers

If the host allows custom headers, also send `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security`, and `frame-ancestors 'none'` in the CSP header.
