# Tapnow Demo Pack

This folder contains a ready-to-load software engineering demo project for Tapnow.

## Files

- `tapnow-demo-project.json`: import this from Tapnow with the left sidebar "load project" button.
- `demo-script.md`: a short Chinese presentation script for a 3-5 minute demo.
- `generate-demo-project.mjs`: regenerates the demo JSON with embedded demo assets.
- `validate-demo-project.mjs`: checks that the demo JSON has the required nodes and links.

## Regenerate

```bash
node demo/generate-demo-project.mjs
node demo/validate-demo-project.mjs
```

## Run The App

```bash
npm install
./scripts/serve.sh
```

Then open:

```text
http://127.0.0.1:8765/
```

## Demo Flow

1. Open Tapnow.
2. Click the left sidebar load-project icon.
3. Choose `demo/tapnow-demo-project.json`.
4. Show the prepared workflow:
   - story input
   - character and scene extraction
   - video input and precomputed keyframes
   - video analysis results
   - storyboard table
   - image/video generation nodes
   - preview and local-save nodes
5. Use only stable interactions live: drag nodes, inspect history, send media to preview/canvas, edit a storyboard prompt.

Avoid live video generation during a class demo. The generated results are already prepared in the project history.
