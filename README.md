# draworchestrator

draworchestrator is a browser application for visual AI workflow prototyping.

The app runs as a Vite/React project.

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
src/legacy/DrawOrchestratorApp.jsx      Main draworchestrator app shell and workflow logic
src/legacy/support.jsx        Shared app constants, helpers, and UI pieces
src/shared/icons.jsx          Tree-shaken Lucide icon adapter
src/shared/markdown.js        Sanitized Markdown rendering helper
scripts/serve.sh              Local dev server helper
tools/local-connector/        Optional local file/cache helper service
```

## License

This project is distributed under GPLv3. It is a GPLv3 derivative of:

```text
https://github.com/zhengxinlan1995-code/Tapnow-Studio--
```

See `LICENSE`.

## Notes

- Compressed binary/helper bundles are intentionally not kept in this repo.
- API keys and session IDs are stored by the app in browser localStorage.
- Jimeng and local-file-save features require separate local helper services.
  Review those helpers before running them.
