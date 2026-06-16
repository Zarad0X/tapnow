import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import RunwayML from '@runwayml/sdk';

const DEFAULT_PROMPT = 'A 5 second cinematic shot of a tiny delivery drone flying through a neon night market, rain reflections on the ground, smooth camera tracking, realistic lighting.';
const DEFAULT_RATIO = '1280:720';
const DEFAULT_DURATION = 5;
const DEFAULT_MODEL = 'gen4.5';
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.join(__dirname, 'live-output');

const printHelp = () => {
    console.log(`
DrawOrchestrator live video API demo using Runway.

Required:
  RUNWAYML_API_SECRET=key_...

Examples:
  npm run demo:runway
  npm run demo:runway -- --prompt "A robot barista making coffee in a rainy cyberpunk alley"
  npm run demo:runway -- --image "https://example.com/input.png" --prompt "Animate this scene with slow camera movement"

Options:
  --prompt <text>       Prompt text. Defaults to a short DrawOrchestrator-friendly prompt.
  --image <url/data>    Optional prompt image URL or data URI for image-to-video.
  --ratio <ratio>       Output ratio, default ${DEFAULT_RATIO}.
  --duration <seconds>  Output duration, default ${DEFAULT_DURATION}.
  --model <id>          Runway model, default ${DEFAULT_MODEL}.
  --timeout <seconds>   Wait timeout, default ${DEFAULT_TIMEOUT_MS / 1000}.
`);
};

const readArg = (name, fallback = '') => {
    const index = process.argv.indexOf(name);
    if (index === -1) return fallback;
    return process.argv[index + 1] || fallback;
};

const hasFlag = (name) => process.argv.includes(name);

const sanitizeFilenamePart = (value) => {
    return String(value || 'runway-live')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || 'runway-live';
};

const getFirstOutputUrl = (task) => {
    if (Array.isArray(task?.output) && task.output[0]) return task.output[0];
    if (typeof task?.output === 'string') return task.output;
    if (Array.isArray(task?.outputs) && task.outputs[0]) return task.outputs[0];
    if (typeof task?.videoUrl === 'string') return task.videoUrl;
    return '';
};

const downloadFile = async (url, targetPath) => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Download failed: HTTP ${response.status} ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(targetPath, buffer);
    return buffer.byteLength;
};

const main = async () => {
    if (hasFlag('--help') || hasFlag('-h')) {
        printHelp();
        return;
    }

    if (!process.env.RUNWAYML_API_SECRET) {
        console.error('Missing RUNWAYML_API_SECRET. Get a Runway API key and run:');
        console.error('  export RUNWAYML_API_SECRET="key_..."');
        process.exitCode = 1;
        return;
    }

    const prompt = readArg('--prompt', process.env.DRAWORCHESTRATOR_LIVE_PROMPT || DEFAULT_PROMPT);
    const promptImage = readArg('--image', process.env.DRAWORCHESTRATOR_LIVE_IMAGE || '');
    const ratio = readArg('--ratio', process.env.DRAWORCHESTRATOR_LIVE_RATIO || DEFAULT_RATIO);
    const duration = Number(readArg('--duration', process.env.DRAWORCHESTRATOR_LIVE_DURATION || DEFAULT_DURATION));
    const model = readArg('--model', process.env.DRAWORCHESTRATOR_LIVE_MODEL || DEFAULT_MODEL);
    const timeoutSeconds = Number(readArg('--timeout', process.env.DRAWORCHESTRATOR_LIVE_TIMEOUT || DEFAULT_TIMEOUT_MS / 1000));

    const client = new RunwayML();
    const payload = {
        model,
        promptText: prompt,
        ratio,
        duration: Number.isFinite(duration) && duration > 0 ? duration : DEFAULT_DURATION,
    };

    if (promptImage) {
        payload.promptImage = promptImage;
    }

    console.log('[DrawOrchestrator live demo] Starting Runway video generation...');
    console.log({
        model: payload.model,
        ratio: payload.ratio,
        duration: payload.duration,
        mode: promptImage ? 'image-to-video' : 'text-to-video',
        prompt: payload.promptText,
    });

    const taskRequest = client.imageToVideo.create(payload);
    const startedTask = await taskRequest;
    console.log(`[DrawOrchestrator live demo] Task created: ${startedTask.id}`);
    console.log('[DrawOrchestrator live demo] Waiting for output...');

    const completedTask = await taskRequest.waitForTaskOutput({
        timeout: Number.isFinite(timeoutSeconds) && timeoutSeconds > 0
            ? timeoutSeconds * 1000
            : DEFAULT_TIMEOUT_MS,
    });

    const outputUrl = getFirstOutputUrl(completedTask);
    if (!outputUrl) {
        throw new Error(`Runway task completed but no output URL was found: ${JSON.stringify(completedTask)}`);
    }

    await fs.mkdir(outputDir, { recursive: true });
    const filename = `${Date.now()}-${sanitizeFilenamePart(prompt)}.mp4`;
    const targetPath = path.join(outputDir, filename);
    const size = await downloadFile(outputUrl, targetPath);

    console.log('[DrawOrchestrator live demo] Done.');
    console.log(`Video URL: ${outputUrl}`);
    console.log(`Saved MP4: ${targetPath}`);
    console.log(`Size: ${(size / 1024 / 1024).toFixed(2)} MB`);
    console.log('');
    console.log('DrawOrchestrator usage: open the app, add a 视频输入 node, and paste the Video URL or use the saved MP4 as demo evidence.');
};

main().catch((error) => {
    if (error?.taskDetails) {
        console.error('[DrawOrchestrator live demo] Runway task failed:');
        console.error(JSON.stringify(error.taskDetails, null, 2));
    } else {
        console.error('[DrawOrchestrator live demo] Failed:');
        console.error(error?.stack || error?.message || error);
    }
    process.exitCode = 1;
});
