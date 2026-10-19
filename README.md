# Site Scanner

A Node.js/Express tool that scans websites for common security
misconfigurations and returns a report with severity ratings and fixes.

## Features (so far)
- Security header checks (HSTS, CSP, X-Frame-Options, etc.)

## Tech stack
Node.js, Express, Helmet

## Run locally
npm install
npm run dev

## Usage
POST /api/scan with JSON body: { "url": "https://example.com" }

## Disclaimer
Only scan websites you own or have permission to test.