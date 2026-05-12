# Helper Services

The upstream repository included compressed helper bundles. They have been moved
out of this source tree to avoid committing opaque archives.

## Jimeng API Helper

Purpose: runs a local proxy for Jimeng/Dreamina APIs, usually on
`http://localhost:5100`.

Tapnow Studio sends the configured Jimeng session ID/API key to this service,
and the service forwards requests to Jimeng.

## Local Connector

Purpose: runs a local file receiver, usually on `http://127.0.0.1:9527`.

The local connector source is kept in `tools/local-connector/` because it is a
small project-specific helper. The original compressed bundle is not tracked.

The browser app uses it for local cache and save-to-disk workflows:

- save images/videos
- save thumbnails
- list cached files
- serve cached media back to the browser
- delete selected cached media

Only run helper services when needed, and prefer a temporary save directory
while testing.
