# True Flow Pump & Well website

Static site with no build step. Open `index.html` in a browser, or upload it to any static host (GitHub Pages, Netlify, Cloudflare Pages).

- `index.html`: the deployable page.
- `src/page.html`: the source. Edit this, then run `sh build.sh` to rebuild `index.html`. It has no `<html>/<head>` wrapper so it can also be published as a Claude artifact preview.

## Business details

Phone, email, hours, town, service radius, owner and towns served live in the `BIZ` object at the top of the `<script>` in `index.html`. They are all placeholders and show on the page in dashed orange until replaced. The reviews in `REVIEWS` are samples, and the request form does not send anywhere yet.

## Turning on the request form

Create a free form endpoint (for example at formspree.io), then paste its URL into `formEndpoint` in `BIZ`. Until then the form shows a preview message instead of sending.

## Adding job photos

Put photos in an `images/` folder and list them in `photos` in `BIZ`, e.g. `{src: "images/pump-pull.jpg", cap: "Pump replacement, 320 ft"}`. Until then the Recent work section shows empty photo slots.
