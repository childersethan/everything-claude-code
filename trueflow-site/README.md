# True Flow Pump & Well website

Static site with no build step. Open `index.html` in a browser, or upload it to any static host (GitHub Pages, Netlify, Cloudflare Pages).

- `index.html`: the deployable page.
- `src/page.html`: the same page without the `<html>/<head>` wrapper, used for the Claude artifact preview.

## Business details

Phone, email, hours, town, service radius, owner and towns served live in the `BIZ` object at the top of the `<script>` in `index.html`. They are all placeholders and show on the page in dashed orange until replaced. The reviews in `REVIEWS` are samples, and the request form does not send anywhere yet.
