#!/bin/sh
# Builds index.html (the deployable page) from src/page.html.
# src/page.html has no <html>/<head> wrapper so it can also be published as a Claude artifact preview.
set -e
cd "$(dirname "$0")"
{
cat <<'HEAD'
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="True Flow Pump & Well Services: well pump repair, pressure tanks, constant pressure systems and new installs. Same-day service when your water is out.">
<meta property="og:title" content="True Flow Pump & Well Services">
<meta property="og:description" content="No water? We'll get it flowing again. Well pump repair, pressure tanks and new installs.">
<meta property="og:type" content="website">
<meta name="theme-color" content="#0B6E99">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect x='16' y='2' width='8' height='36' rx='2' fill='%230E1C24'/%3E%3Cpath d='M20 10c-5 7-8 11-8 15a8 8 0 0 0 16 0c0-4-3-8-8-15Z' fill='%230B6E99'/%3E%3C/svg%3E">
<style>body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
HEAD
# <title>, font links and <style> belong in <head>; everything from the first <div> on is body.
sed -n '1,/^<\/style>$/p' src/page.html
echo '</head>'
echo '<body>'
sed '1,/^<\/style>$/d' src/page.html
echo '</body>'
echo '</html>'
} > index.html
echo "Built index.html"
