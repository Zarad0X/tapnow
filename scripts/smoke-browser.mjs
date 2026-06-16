import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const HOST = '127.0.0.1';
const PORT = 8876;
const URL = `http://${HOST}:${PORT}/`;

const chromeCandidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
].filter(Boolean);

const chromePath = chromeCandidates.find((candidate) => existsSync(candidate));
if (!chromePath) {
    throw new Error('No Chrome/Chromium executable found. Set CHROME_PATH to run browser smoke tests.');
}

const waitForServer = async (url, timeoutMs = 15000) => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        try {
            const response = await fetch(url);
            if (response.ok) return;
        } catch (error) {}
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(`Timed out waiting for ${url}`);
};

const vite = spawn(process.execPath, [
    'node_modules/vite/bin/vite.js',
    '--host',
    HOST,
    '--port',
    String(PORT),
    '--strictPort',
], {
    stdio: ['ignore', 'pipe', 'pipe'],
});

let serverOutput = '';
vite.stdout.on('data', (chunk) => { serverOutput += chunk.toString(); });
vite.stderr.on('data', (chunk) => { serverOutput += chunk.toString(); });

try {
    await waitForServer(URL);

    const browser = await chromium.launch({ executablePath: chromePath, headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const events = [];

    page.on('pageerror', (error) => events.push({ type: 'pageerror', message: error.message }));
    page.on('console', (message) => {
        if (message.type() === 'error') {
            events.push({ type: 'console', message: message.text(), location: message.location() });
        }
    });
    page.on('requestfailed', (request) => events.push({ type: 'requestfailed', url: request.url(), failure: request.failure()?.errorText }));
    page.on('response', (response) => {
        if (response.status() >= 400) events.push({ type: 'response', status: response.status(), url: response.url() });
    });

    await page.goto(URL, { waitUntil: 'networkidle', timeout: 20000 });
    await page.locator('#root').waitFor({ state: 'visible', timeout: 10000 });

    const title = await page.title();
    const bodyText = await page.locator('body').innerText({ timeout: 5000 });
    const buttonCount = await page.locator('button').count();
    const rootHtmlLength = (await page.locator('#root').innerHTML({ timeout: 5000 })).length;

    await browser.close();

    const result = {
        title,
        loadedPastInitialLoader: !bodyText.includes('Loading Resources') || buttonCount > 0,
        buttonCount,
        rootHtmlLength,
        eventCount: events.length,
        events,
    };

    console.log(JSON.stringify(result, null, 2));

    if (events.length > 0) throw new Error('Browser console/request errors detected');
    if (title !== 'draworchestrator') throw new Error(`Unexpected title: ${title}`);
    if (buttonCount === 0 || rootHtmlLength < 1000) throw new Error('App did not render expected interactive UI');
} catch (error) {
    console.error(error.message);
    if (serverOutput) console.error(serverOutput);
    process.exitCode = 1;
} finally {
    vite.kill('SIGTERM');
}
