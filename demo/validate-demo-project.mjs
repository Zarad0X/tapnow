import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectFile = path.join(__dirname, 'draworchestrator-demo-project.json');
const project = JSON.parse(fs.readFileSync(projectFile, 'utf8'));

const requiredNodeTypes = [
    'novel-input',
    'extract-characters-scenes',
    'character-description',
    'scene-description',
    'video-input',
    'video-analyze',
    'storyboard-node',
    'gen-image',
    'gen-video',
    'preview',
    'local-save',
];

const fail = (message) => {
    throw new Error(message);
};

if (!project.projectName) fail('projectName is missing');
if (!Array.isArray(project.nodes) || project.nodes.length < requiredNodeTypes.length) fail('nodes are missing');
if (!Array.isArray(project.connections) || project.connections.length === 0) fail('connections are missing');
if (!Array.isArray(project.history) || project.history.length < 3) fail('history examples are missing');
if (!Array.isArray(project.chatSessions) || project.chatSessions.length === 0) fail('chat session is missing');
if (!Array.isArray(project.characterLibrary) || project.characterLibrary.length === 0) fail('character library is missing');

const nodeTypes = new Set(project.nodes.map((node) => node.type));
for (const type of requiredNodeTypes) {
    if (!nodeTypes.has(type)) fail(`required node type missing: ${type}`);
}

const nodeIds = new Set(project.nodes.map((node) => node.id));
for (const connection of project.connections) {
    if (!nodeIds.has(connection.from)) fail(`connection source missing: ${connection.id}`);
    if (!nodeIds.has(connection.to)) fail(`connection target missing: ${connection.id}`);
}

const storyboard = project.nodes.find((node) => node.type === 'storyboard-node');
if (!storyboard?.settings?.shots?.length) fail('storyboard shots are missing');

const analyze = project.nodes.find((node) => node.type === 'video-analyze');
if (!analyze?.analysisResults?.length) fail('video analysis results are missing');

console.log(JSON.stringify({
    ok: true,
    projectName: project.projectName,
    nodeCount: project.nodes.length,
    connectionCount: project.connections.length,
    historyCount: project.history.length,
    shotCount: storyboard.settings.shots.length,
}, null, 2));
