#!/bin/sh
# Builds preview/ for the Claude artifact preview: preview/preview.html is index.html without its
# <html>/<head>/<body> wrapper, and the other pages are copied with the CSP and Netlify form markers
# removed (the preview host can't run Netlify Forms). The real site is the root *.html files; no build needed.
set -e
cd "$(dirname "$0")"
mkdir -p preview
sed -e '/^<!doctype html>$/d' -e '/^<html /d' -e '/^<\/html>$/d' -e '/^<head>$/d' -e '/^<\/head>$/d' \
    -e '/^<body/d' -e '/^<\/body>$/d' -e '/^<meta charset/d' -e '/^<meta name="viewport"/d' \
    -e '/^<link rel="icon"/d' -e '/Content-Security-Policy/d' -e '/If you change form providers/d' \
    -e 's/ data-netlify="true"//' -e 's/ data-delivery="netlify"//' -e 's/href="index.html"/href="preview.html"/g' index.html > preview/preview.html
for f in services tools lab work about area contact; do
  sed -e '/Content-Security-Policy/d' -e '/If you change form providers/d' \
      -e 's/ data-netlify="true"//' -e 's/ data-delivery="netlify"//' -e 's/href="index.html"/href="preview.html"/g' "$f.html" > "preview/$f.html"
done
echo "Built preview/"
