#!/bin/sh
# Builds preview/preview.html: index.html without its <html>/<head>/<body> wrapper,
# for publishing as a Claude artifact preview. The real site is index.html itself; no build needed.
set -e
cd "$(dirname "$0")"
mkdir -p preview
sed -e '/^<!doctype html>$/d' -e '/^<html /d' -e '/^<\/html>$/d' -e '/^<head>$/d' -e '/^<\/head>$/d' \
    -e '/^<body>$/d' -e '/^<\/body>$/d' -e '/^<meta charset/d' -e '/^<meta name="viewport"/d' \
    -e '/^<link rel="icon"/d' -e '/Content-Security-Policy/d' -e '/If you change form providers/d' index.html > preview/preview.html
echo "Built preview/preview.html"
