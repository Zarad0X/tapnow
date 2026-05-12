# tapnow

tapnow is a personal, cleaned, Vite-based maintenance fork of Tapnow Studio, a
browser application for visual AI workflow prototyping.

The active app now runs as a Vite/React project. Older single-file HTML
snapshots are kept under `archive/html/` for reference.

## Run

```bash
npm install
./scripts/serve.sh
```

Then open:

```text
http://127.0.0.1:8765/
```

The development server runs on Vite and loads React, Tailwind, Lucide, Marked,
and DOMPurify from local npm dependencies.

For a production build:

```bash
npm run build
```

## Repository Layout

```text
index.html                    Vite HTML entry
src/main.jsx                  React entry point
src/legacy/TapnowStudio.jsx   Main Tapnow app shell and workflow logic
src/legacy/support.jsx        Shared app constants, helpers, and UI pieces
src/shared/icons.jsx          Tree-shaken Lucide icon adapter
src/shared/markdown.js        Sanitized Markdown rendering helper
archive/html/                 Older upstream HTML snapshots
docs/original-readme.md       Original upstream README
docs/CHANGELOG.md             Original upstream Chinese changelog
scripts/serve.sh              Local dev server helper
tools/local-connector/        Optional local file/cache helper service
```

## Original Source and License

This repository is based on the original Tapnow Studio project from:

```text
https://github.com/zhengxinlan1995-code/Tapnow-Studio--
```

The original README and changelog are preserved in `docs/original-readme.md`
and `docs/CHANGELOG.md`. Older upstream single-file HTML snapshots are
preserved in `archive/html/`.

This project keeps the original GPLv3 license. See `LICENSE`.

## Notes

- Compressed binary/helper bundles are intentionally not kept in this repo.
- API keys and session IDs are stored by the app in browser localStorage.
- Jimeng and local-file-save features require separate local helper services.
  Review those helpers before running them.
