# Hack Offer vacancy scanner

A small local Node.js/TypeScript CLI that collects remote or hybrid frontend vacancies from Hack Offer, spends at most a configurable number of detail requests, applies deterministic seniority and frontend-primary quality gates, removes near-duplicates, and exports Markdown plus JSON.

## Setup

Requires Node.js 20 or newer.

```sh
npm install
cp .env.example .env.local
```

Authentication requires a valid Hack Offer access token from your own authenticated account. Store it locally in `.env.local`:

```dotenv
HACK_OFFER_TOKEN=your-token-here
```

The CLI never attempts browser extraction or login. Environment files are ignored by Git except for `.env.example`.

## Commands

```sh
npm test
npm run check
npm run scan
```

Results are written to `output/vacancies.md` and `output/vacancies.json`. Full `source_text` is used when Hack Offer provides it; otherwise the list/detail `description` is used unchanged.

Optional environment settings:

- `HACK_OFFER_DETAIL_REQUEST_BUDGET` — maximum detail requests, default `40`
- `HACK_OFFER_TARGET_COUNT` — maximum exported vacancies, default `30`

Both settings must be positive integers. Invalid values fall back to their defaults.
