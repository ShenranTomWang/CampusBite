# Campus Bites

A scroll-first campus dining demo built with React, Vite, and a Python + SQLite API.

## Run locally

Requires Node.js 18+ and Python 3.9+.

```sh
npm install
python3 backend/server.py
```

In a second terminal:

```sh
npm run dev
```

Open http://127.0.0.1:5173. The Vite server proxies `/api` to Python on port 8000.

## Included

- 20 kitchen windows, each with a featured dish and three seeded student comments.
- Snap-scrolling feed, campus favorites, and taste profile.
- Upvote/downvote toggling, separate dish/window star ratings and comments.
- Recommendations combine cuisine preferences, budget, average ratings, and votes. Vegetarian mode filters the feed.
- SQLite persists feedback and preferences. Delete `backend/campus.db` to reset the demo.
- Responsive layout, keyboard accessible buttons, loading and API error states.

This is a single-user local demo: feedback belongs to one shared demo identity. Production would need authentication, per-user records, moderation, and deployment configuration. Food photography and fonts load from Unsplash and Google Fonts; they require internet access. The API binds only to localhost. Seeded ratings and popularity are illustrative.

## Checks

```sh
npm run build
python3 -m unittest discover -s backend -p 'test_*.py'
```

## GitHub Pages project demo

Published at https://ShenranTomWang.github.io/CampusBite/ as a repository-specific project site. This leaves the account's root site and other repositories independent.

The Pages build uses `VITE_STATIC_DEMO=true`. Ratings, votes, comments, and taste preferences persist in this browser's local storage and are not shared between visitors. The Python API is still used by `npm run dev` locally. The **New** feed sorts seeded windows/dishes by stored addition date, newest first.

To build the hosted version locally:

```sh
npm run build:pages
```

GitHub Actions builds and deploys on pushes to `main`. In repository **Settings → Pages**, set **Source** to **GitHub Actions**. To refresh mock seed data, run `python3 scripts/export_seed.py`; this uses a temporary database and never exports local user activity.
