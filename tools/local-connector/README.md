# Tapnow Local Connector

This helper lets the browser app save generated media to local disk.

It starts a small HTTP server bound to `127.0.0.1`, defaulting to port `9527`.
tapnow uses it for:

- local cache checks
- image/video save workflows
- thumbnail caching
- serving cached media back to the browser
- deleting selected cached media

## Run

```bash
python3 tools/local-connector/tapnow-local-server.py
```

Default save directory:

```text
~/Downloads/tapnow
```

You can choose a test directory while experimenting:

```bash
python3 tools/local-connector/tapnow-local-server.py --dir /tmp/tapnow-studio
```

## Endpoints

- `GET /ping`
- `GET /config`
- `GET /list-files`
- `GET /file/<path>`
- `POST /save`
- `POST /save-batch`
- `POST /save-thumbnail`
- `POST /save-cache`
- `POST /delete-file`
- `POST /delete-batch`
- `POST /config`

## Safety

This service accepts requests from browser pages and can write/delete local
media files under configured paths. Run it only when needed and stop it after
testing.
