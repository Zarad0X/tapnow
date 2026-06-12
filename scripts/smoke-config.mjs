import {
    cloneClipboardPayloadAtPoint,
    createClipboardPayload,
    getSelectedNodeIdsForClipboard,
} from '../src/legacy/canvas/clipboard.js';
import {
    buildConnectedImageForInputCache,
    buildConnectedImagesCache,
    buildConnectedNodeTypeCache,
    findConnectedNodeOfType,
    getConnectedImageForInputFromCache,
    getConnectedInputImagesFromCache,
    getConnectedTextNodeContents,
} from '../src/legacy/canvas/connections.js';
import {
    arrangeNodesByGraphLayers,
} from '../src/legacy/canvas/layout.js';
import {
    DEFAULT_API_CONFIGS,
    DELETED_MODEL_IDS,
    calculateResolution,
    getModelParams,
    getRatiosForModel,
    getResolutionsForModel,
} from '../src/legacy/config/modelConfig.js';
import {
    CHARACTER_SHEET_PROMPT_TEXT,
    GRID_PROMPT_TEXT,
    MOOD_BOARD_PROMPT_TEXT,
    STORYBOARD_PROMPT_TEXT,
    UPSCALE_PROMPT_TEXT,
} from '../src/legacy/config/promptTemplates.js';
import {
    createDefaultNodeSettings,
    getDefaultNodeSize,
    getNodeLabel,
} from '../src/legacy/nodes/nodeCatalog.js';
import {
    ASYNC_IMAGE_STATUS,
    buildRequestHeaders,
    classifyAsyncImageStatus,
    denormalizePromptForSoraRequest,
    extractAsyncTaskId,
    extractAsyncImageItems,
    extractGenerationErrorMessage,
    findFirstHttpImageUrl,
    extractImageUrls,
    getAsyncImagePollDelay,
    getAsyncImageStatusValue,
    getAsyncImageTimeoutConfig,
    getImageModelFeatures,
    getJimengModelName,
    getMidjourneyPollConfig,
    getModelDisplayName,
    getNanoBanana2ImageSizeFlag,
    normalizeBananaResolution,
    normalizeImageItemsToUrls,
    normalizePromptForSora,
    normalizeDurationToMs,
    parseDurationSeconds,
    parseProgressValue,
    resolveAsyncImagePollUrl,
    resolveAsyncImageProgress,
    resolveGenerationDurationMs,
    resolveEndpointUrl,
    resolveMidjourneyPollUrl,
    shouldContinueAsyncImagePolling,
} from '../src/legacy/services/generationService.js';
import {
    createChatMediaFile,
    createUploadedChatFile,
    groupKeyframesByTime,
    toggleVideoFrameSelection,
} from '../src/legacy/utils/mediaUtils.js';
import {
    parseJsonWithRepair,
    repairRelaxedJsonText,
    stripMarkdownJsonFence,
} from '../src/legacy/utils/jsonUtils.js';
import {
    extractAiResponseContent,
} from '../src/legacy/utils/aiResponseUtils.js';
import {
    CHARACTER_TURNTABLE_SUFFIX,
    createAnalysisResultsFromDirectorScenes,
    ensureCharacterTurntablePrompt,
    filterCharacterPromptLocal,
    filterScenePromptLocal,
    generateCharacterPrompt,
    generateScenePrompt,
    getDescriptionNodeDefaultPrompt,
    getDefaultDurationForModel,
    getDefaultDurationsForModel,
    getStylePrefix,
    createVoiceoverResultsFromScript,
    removeCharacterTurntablePrompt,
} from '../src/legacy/services/storyboardService.js';
import {
    getBatchHistoryCardDisplay,
    getCanvasSendableHistoryItems,
    getCompletedVideoHistory,
    getHistoryCanvasContentUrl,
    getHistoryLightboxItem,
    getLocalHistoryFiles,
    getSelectedHistoryItems,
    splitHistoryCacheItems,
} from '../src/legacy/history/historyUtils.js';

const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
};

const ids = DEFAULT_API_CONFIGS.map((config) => config.id);
assert(ids.length > 0, 'default API config list must not be empty');
assert(new Set(ids).size === ids.length, 'default API config ids must be unique');
assert(DEFAULT_API_CONFIGS.every((config) => config.type && config.modelName && config.url), 'every default API config needs type, modelName, and url');
assert(DEFAULT_API_CONFIGS.every((config) => !DELETED_MODEL_IDS.includes(config.id)), 'default API configs must not include deleted model ids');

assert(getRatiosForModel('grok-3').join(',') === '3:2,2:3,1:1', 'grok ratio list should stay constrained');
assert(getRatiosForModel('gpt-image').includes('16:9'), 'general image models should expose common ratios');
assert(getResolutionsForModel('jimeng-4.5').join(',') === '2K,4K', 'jimeng-4.5 should expose 2K/4K only');

assert(calculateResolution('16:9', '1080P').str === '1920x1088', '16:9 1080P resolution should be 16-aligned');
assert(calculateResolution('bad', 'Auto').str === '1024x1024', 'invalid ratios should fall back safely');
assert(getModelParams('grok-3', '1:1', '720P').sizeStr === '1:1', 'grok model params should use aspect ratio as size');

assert(getDefaultNodeSize('storyboard-node').w === 600, 'storyboard node default size should be cataloged');
assert(getNodeLabel('generate-scene-image') === '生成场景图片', 'node labels should be cataloged');
assert(createDefaultNodeSettings('extract-characters-scenes', { apiConfigs: DEFAULT_API_CONFIGS }).model, 'extract node should pick a chat model');

assert(getDefaultDurationForModel('sora-2-pro') === '15s', 'storyboard duration helper should keep sora pro default');
assert(getDefaultDurationsForModel('veo3').join(',') === '8s', 'storyboard duration helper should keep veo durations constrained');
assert(getStylePrefix('realistic') === '写实风格', 'style prefix helper should keep realistic style label');
assert(getStylePrefix('unknown') === '动漫风格', 'style prefix helper should keep anime fallback');
assert(ensureCharacterTurntablePrompt('角色提示').endsWith(CHARACTER_TURNTABLE_SUFFIX), 'turntable helper should append video suffix');
assert(ensureCharacterTurntablePrompt(`角色提示${CHARACTER_TURNTABLE_SUFFIX}`) === `角色提示${CHARACTER_TURNTABLE_SUFFIX}`, 'turntable helper should not duplicate suffix');
assert(removeCharacterTurntablePrompt(`角色提示${CHARACTER_TURNTABLE_SUFFIX}`) === '角色提示', 'turntable helper should remove exact video suffix');
const generatedCharacterPrompt = generateCharacterPrompt({ name: '阿青', age: '18', gender: '少女', description: '银色短发', role: '飞行员' }, 'image', 'manga');
assert(generatedCharacterPrompt.includes('漫画风格') && generatedCharacterPrompt.includes('阿青') && !generatedCharacterPrompt.includes('360度'), 'character prompt helper should build image prompts without video turntable suffix');
assert(generateCharacterPrompt({ name: '阿青' }).includes('360度全方位展示身体'), 'character prompt helper should keep video turntable suffix by default');
assert(generateScenePrompt({ description: '雨夜街道' }) === '雨夜街道', 'scene prompt helper should preserve provided scene description');
assert(generateScenePrompt({}).includes('星际战舰舰桥内部'), 'scene prompt helper should keep fallback scene description');
assert(getDescriptionNodeDefaultPrompt({ isCharacter: true, settings: { characterName: '阿青' } }).includes('名叫阿青') && !getDescriptionNodeDefaultPrompt({ isCharacter: true, settings: { characterName: '阿青' } }).includes('360度'), 'description node prompt helper should keep character image-mode defaults');
assert(getDescriptionNodeDefaultPrompt({ isCharacter: false, settings: { description: '雨夜街道' } }) === '雨夜街道', 'description node prompt helper should keep scene defaults');
assert(filterCharacterPromptLocal('动漫风格，全身视角，角色站在飞船场景里，说你好').includes('纯白色背景'), 'character prompt fallback filter should enforce white background');
assert(filterScenePromptLocal('角色站在大厅，背景是玻璃幕墙，城市灯光').includes('背景') || filterScenePromptLocal('角色站在大厅，背景是玻璃幕墙，城市灯光').includes('城市灯光'), 'scene prompt fallback filter should keep scene context');
assert(createVoiceoverResultsFromScript([{ text: '第一句' }, {}]).map((item) => item.text).join('|') === '第一句|', 'director voiceover helper should preserve indexed text payloads');
const directorAnalysis = createAnalysisResultsFromDirectorScenes([{
    scene_id: 3,
    time_range: '0-3s',
    visual_analysis: { camera_movement: '推镜', subject_dynamics: '人物转身', atmosphere: '紧张' },
    prompts: { mj_prompt: 'mj prompt', jimeng_prompt: 'jimeng prompt' },
}]);
assert(directorAnalysis[0].scene_index === 3 && directorAnalysis[0].keyframes[0].description === '推镜 人物转身' && directorAnalysis[0].global_tags.camera[0] === '推镜', 'director scene helper should convert scenes to analysis results');

assert(normalizeBananaResolution('2k') === '2K', 'banana resolution normalization should preserve API casing');
assert(normalizePromptForSora('hello @alice', 'sora-2') === 'hello @{alice}', 'sora prompt references should be normalized');
assert(denormalizePromptForSoraRequest('hello @{alice}') === 'hello @alice', 'sora API request prompt references should be denormalized');
assert(parseDurationSeconds('15s') === 15, 'duration parsing should strip units');
assert(normalizeDurationToMs(49) === 49000, 'numeric backend durations below 10000 should be treated as seconds');
assert(normalizeDurationToMs(12000) === 12000, 'large numeric backend durations should be treated as milliseconds');
assert(normalizeDurationToMs('2.5s') === 2500, 'duration normalization should parse seconds strings');
assert(normalizeDurationToMs('800ms') === 800, 'duration normalization should parse millisecond strings');
assert(resolveGenerationDurationMs({ data: { data: { cost_time: '3秒' } }, startTime: 100, endTime: 1000 }).durationMs === 3000, 'generation duration should prefer nested backend timing');
assert(resolveGenerationDurationMs({ data: {}, startTime: 100, endTime: 1000 }).durationMs === 900, 'generation duration should fall back to frontend timing');
const cyclicImageResponse = { data: [{ metadata: { imageUrl: 'https://example.com/image.png' } }] };
cyclicImageResponse.self = cyclicImageResponse;
assert(findFirstHttpImageUrl(cyclicImageResponse) === 'https://example.com/image.png', 'image URL deep search should handle nested arrays and cycles');
assert(findFirstHttpImageUrl({ data: { src: 'blob:image' } }) === null, 'image URL deep search should ignore non-http URLs');
assert(classifyAsyncImageStatus('success') === ASYNC_IMAGE_STATUS.COMPLETED, 'async image status classifier should normalize success states');
assert(classifyAsyncImageStatus('FAILURE') === ASYNC_IMAGE_STATUS.FAILED, 'async image status classifier should normalize failure states');
assert(classifyAsyncImageStatus('in_progress') === ASYNC_IMAGE_STATUS.RUNNING, 'async image status classifier should normalize running states');
assert(classifyAsyncImageStatus('weird') === ASYNC_IMAGE_STATUS.UNKNOWN, 'async image status classifier should preserve unknown states');
assert(getAsyncImageStatusValue({ data: { status: 'success' }, status: 'failed' }) === 'SUCCESS', 'async image status getter should prefer nested status');
assert(getAsyncImageStatusValue({ status: 'done' }) === 'DONE', 'async image status getter should normalize root status casing');
assert(!shouldContinueAsyncImagePolling(ASYNC_IMAGE_STATUS.COMPLETED), 'async image polling should stop on completed status');
assert(!shouldContinueAsyncImagePolling(ASYNC_IMAGE_STATUS.FAILED), 'async image polling should stop on failed status');
assert(shouldContinueAsyncImagePolling(ASYNC_IMAGE_STATUS.RUNNING), 'async image polling should continue on running status');
assert(shouldContinueAsyncImagePolling(ASYNC_IMAGE_STATUS.UNKNOWN), 'async image polling should continue on unknown status');
assert(parseProgressValue('72%') === 72, 'progress parser should parse percentage strings');
assert(parseProgressValue(48) === 48, 'progress parser should keep numeric values');
assert(parseProgressValue('bad') === null, 'progress parser should reject invalid strings');
assert(resolveAsyncImageProgress({ data: { data: { progress: '72%' } }, attempt: 2 }) === 72, 'async image progress should parse nested percentage strings');
assert(resolveAsyncImageProgress({ data: { progress: 120 }, attempt: 2 }) === 95, 'async image progress should clamp high values');
assert(resolveAsyncImageProgress({ data: {}, attempt: 4 }) === 18, 'async image progress should fall back to attempt-based running progress');
assert(resolveAsyncImageProgress({ data: {}, attempt: 4, isUnknownStatus: true }) === 16, 'async image progress should use slower unknown-status fallback');
assert(getAsyncImagePollDelay({ progress: 92, attempt: 1, isBananaModel: false, baseDelayMs: 5000 }) === 1000, 'async image poll delay should speed up near completion');
assert(getAsyncImagePollDelay({ progress: 72, attempt: 1, isBananaModel: false, baseDelayMs: 5000 }) === 2000, 'async image poll delay should speed up late progress');
assert(getAsyncImagePollDelay({ progress: 40, attempt: 51, isBananaModel: false, baseDelayMs: 5000 }) === 10000, 'async image poll delay should back off long non-banana tasks');
assert(getAsyncImagePollDelay({ progress: 40, attempt: 51, isBananaModel: true, baseDelayMs: 5000 }) === 5000, 'async image poll delay should not long-backoff banana tasks');
assert(getAsyncImageTimeoutConfig(false).maxAttempts === 300 && getAsyncImageTimeoutConfig(false).timeoutSeconds === 1500, 'async image timeout config should keep default model limits');
assert(getAsyncImageTimeoutConfig(true).maxAttempts === 160 && getAsyncImageTimeoutConfig(true).timeoutSeconds === 800, 'async image timeout config should keep banana model limits');
assert(getMidjourneyPollConfig().maxAttempts === 120, 'midjourney poll config should keep max attempts');
assert(getMidjourneyPollConfig().delayMs === 5000, 'midjourney poll config should keep poll delay');
assert(getImageModelFeatures('nano-banana-2', { modelName: 'nano-banana-2' }).isNanoBanana2, 'image model features should detect nano-banana-2');
assert(getJimengModelName('jimeng-4.1', {}) === 'jimeng-4.1', 'jimeng model name should follow selected model');
assert(getNanoBanana2ImageSizeFlag({ isNanoBanana2: true, resolution: '4k' }) === '4K', 'nano-banana-2 image_size should normalize casing');
assert(getModelDisplayName({ modelId: 'jimeng-3.1', config: {} }) === 'Jimeng 3.1', 'display name should special-case jimeng');
assert(buildRequestHeaders({ apiKey: 'k', useMultipart: true })['Content-Type'] === undefined, 'multipart requests should not force content-type');
assert(resolveEndpointUrl({ endpoint: '/v1/images', baseUrl: 'https://example.com/' }) === 'https://example.com/v1/images', 'relative endpoints should be resolved once');
assert(resolveAsyncImagePollUrl({ baseUrl: 'https://example.com///', taskIdForPoll: 'task-1' }) === 'https://example.com/v1/images/tasks/task-1', 'async image poll URL should normalize base URL slashes');
assert(resolveMidjourneyPollUrl({ baseUrl: 'https://example.com///', mjMode: 'fast', jobId: 'job-1' }) === 'https://example.com/fast/mj/task/job-1/fetch', 'midjourney poll URL should normalize base URL slashes');
assert(extractAsyncTaskId({ data: { task_id: 'task-1' } }) === 'task-1', 'async task id extraction should handle nested task_id');
assert(extractImageUrls({ data: [{ url: 'a.png' }, 'b.png'] }).join(',') === 'a.png,b.png', 'image URL extraction should handle OpenAI-like arrays');
assert(extractAsyncImageItems({ data: { data: [{ imageUrl: 'nested.png' }] } }).source === 'data.data.data', 'async image item extraction should prefer nested data arrays');
assert(extractAsyncImageItems({ data: { images: ['image-a.png'] } }).images[0] === 'image-a.png', 'async image item extraction should handle data.images arrays');
assert(extractAsyncImageItems({ data: { revised_prompt: '![x](https://example.com/revised.png)' } }).images[0].url === 'https://example.com/revised.png', 'async image item extraction should handle revised_prompt markdown');
assert(normalizeImageItemsToUrls([{ image_url: 'a.png' }, { imageUrl: 'b.png' }, 'c.png']).join(',') === 'a.png,b.png,c.png', 'image item URL normalization should support common URL fields and strings');
assert(extractGenerationErrorMessage({ error: { message: 'bad request' } }) === 'bad request', 'generation error helper should extract object error messages');
assert(extractGenerationErrorMessage({ data: { fail_reason: 'quota exceeded' } }) === 'quota exceeded', 'generation error helper should extract nested failure reasons');
assert(extractGenerationErrorMessage({}, 'fallback error') === 'fallback error', 'generation error helper should preserve fallback errors');

const sampleHistory = [
    { id: '1', type: 'video', status: 'completed', url: 'video.mp4' },
    { id: '2', type: 'image', status: 'completed', url: 'image.png' },
];
assert(getCompletedVideoHistory(sampleHistory).length === 1, 'history video picker should only include completed videos');
assert(getHistoryLightboxItem({ id: '3', mjImages: ['a.png', 'b.png'], selectedMjImageIndex: 1 }).url === 'b.png', 'history lightbox should preserve MJ image selection');
const selectedHistoryItems = getSelectedHistoryItems(sampleHistory, new Set(['1']));
assert(selectedHistoryItems.length === 1 && selectedHistoryItems[0].id === '1', 'selected history helper should filter by ids');
assert(getLocalHistoryFiles([{ localCacheUrl: 'u', localFilePath: 'p' }])[0].path === 'p', 'local history file helper should keep delete payload shape');
assert(splitHistoryCacheItems([{ url: 'https://remote/image.png' }, { localCacheUrl: 'local.png' }]).remote.length === 1, 'cache split helper should detect remote cache');
assert(getCanvasSendableHistoryItems(sampleHistory, new Set(['1', '2'])).length === 2, 'canvas send helper should keep items with content URLs');
assert(getHistoryCanvasContentUrl({ type: 'video', url: 'clip' }, { isVideoUrl: () => false }).includes('force_video_display=true'), 'video canvas URLs should opt into video display when needed');
assert(getBatchHistoryCardDisplay({ mjImages: ['a.png', 'b.png'], selectedMjImageIndex: 1 }).displayUrl === 'b.png', 'batch card display should preserve selected MJ image');

const selectedNodeIds = getSelectedNodeIdsForClipboard({
    selectedNodeId: null,
    selectedNodeIds: new Set(['node-a', 'node-b']),
});
assert(selectedNodeIds.join(',') === 'node-a,node-b', 'clipboard should preserve multi-selected node ids');
const clipboardPayload = createClipboardPayload({
    nodes: [
        { id: 'node-a', x: 0, y: 0, width: 100, height: 100 },
        { id: 'node-b', x: 200, y: 0, width: 100, height: 100 },
        { id: 'node-c', x: 500, y: 0, width: 100, height: 100 },
    ],
    connections: [
        { id: 'conn-a-b', from: 'node-a', to: 'node-b' },
        { id: 'conn-a-c', from: 'node-a', to: 'node-c' },
    ],
    selectedIds: selectedNodeIds,
    timestamp: 1,
});
assert(clipboardPayload.nodes.length === 2, 'clipboard payload should only include selected nodes');
assert(clipboardPayload.connections.length === 1, 'clipboard payload should only include internal selected connections');
const clonedClipboard = cloneClipboardPayloadAtPoint({
    payload: clipboardPayload,
    pastePoint: { x: 500, y: 500 },
    now: () => 100,
    random: () => 0.123456789,
});
assert(clonedClipboard.nodes.length === 2, 'clipboard clone should keep copied node count');
assert(clonedClipboard.connections.length === 1, 'clipboard clone should recreate internal connections');
assert(clonedClipboard.connections[0].from !== 'node-a' && clonedClipboard.connections[0].to !== 'node-b', 'clipboard clone should remap connection endpoints');
assert(clonedClipboard.nodes[0].x === 350 && clonedClipboard.nodes[0].y === 450, 'clipboard clone should center nodes on paste point');
const historyChatFile = createChatMediaFile({ name: 'Generated-1.png', content: 'image.png', mediaType: 'image', fromHistory: true });
assert(historyChatFile.type === 'image/png' && historyChatFile.isImage && historyChatFile.fromHistory, 'chat media helper should create history image files');
const previewChatFile = createChatMediaFile({ name: 'Preview.mp4', content: 'video.mp4', mediaType: 'video', fromPreview: true });
assert(previewChatFile.type === 'video/mp4' && previewChatFile.isVideo && previewChatFile.fileExt === 'mp4', 'chat media helper should create preview video files');
const unknownChatFile = createChatMediaFile({ name: 'Generated-x.file', content: 'asset.bin', mediaType: 'file' });
assert(unknownChatFile.type === 'application/octet-stream' && unknownChatFile.fileExt === 'file', 'chat media helper should preserve generic file fallback');
const uploadedImageFile = createUploadedChatFile({ file: { name: 'shot.PNG', type: 'image/png' }, content: 'data:image/png;base64,a' });
assert(uploadedImageFile.isImage && uploadedImageFile.fileExt === 'png', 'uploaded chat file helper should classify image uploads');
const uploadedDocFile = createUploadedChatFile({ file: { name: 'brief.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }, content: 'doc-data' });
assert(uploadedDocFile.isDoc && !uploadedDocFile.isCode, 'uploaded chat file helper should classify document uploads');
const uploadedSheetFile = createUploadedChatFile({ file: { name: 'plan.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }, content: 'sheet-data' });
assert(uploadedSheetFile.isExcel, 'uploaded chat file helper should classify spreadsheet uploads');
const uploadedCodeFile = createUploadedChatFile({ file: { name: 'index.tsx', type: 'text/plain' }, content: 'code-data' });
assert(uploadedCodeFile.isCode && uploadedCodeFile.fileExt === 'tsx', 'uploaded chat file helper should classify code uploads');
assert(stripMarkdownJsonFence('```json\n{"ok":true}\n```') === '{"ok":true}', 'json helper should strip markdown fences');
assert(repairRelaxedJsonText('{"a":1,}').includes('{"a":1}'), 'json helper should remove trailing commas');
const repairedJson = parseJsonWithRepair('```json\n{"items":[1,2,],}\n```');
assert(repairedJson.value.items.length === 2 && repairedJson.repaired, 'json helper should parse fenced relaxed json');
assert(extractAiResponseContent({ choices: [{ message: { content: 'root choice' } }] }) === 'root choice', 'ai response helper should read OpenAI-like choices');
assert(extractAiResponseContent({ data: { choices: [{ message: { content: 'nested choice' } }] } }) === 'nested choice', 'ai response helper should read nested choices');
assert(extractAiResponseContent({ data: { result: { content: 'nested result' } } }) === 'nested result', 'ai response helper should read nested object content');
const sampleFrames = [
    { time: 0, url: 'frame-0.png' },
    { time: 1, url: 'frame-1.png' },
    { time: 2, url: 'frame-2.png' },
];
const singleFrameSelection = toggleVideoFrameSelection({
    frames: sampleFrames,
    selectedKeyframes: [],
    frame: sampleFrames[1],
    index: 1,
});
assert(singleFrameSelection.selectedKeyframes[0].url === 'frame-1.png' && singleFrameSelection.lastSelectedIndex === 1, 'video frame selection should add clicked frames');
const removedFrameSelection = toggleVideoFrameSelection({
    frames: sampleFrames,
    selectedKeyframes: singleFrameSelection.selectedKeyframes,
    frame: sampleFrames[1],
    index: 1,
});
assert(removedFrameSelection.selectedKeyframes.length === 0, 'video frame selection should remove clicked selected frames');
const rangeFrameSelection = toggleVideoFrameSelection({
    frames: sampleFrames,
    selectedKeyframes: [sampleFrames[0]],
    frame: sampleFrames[2],
    index: 2,
    lastSelectedIndex: 0,
    shiftKey: true,
});
assert(rangeFrameSelection.selectedKeyframes.map((frame) => frame.url).join(',') === 'frame-0.png,frame-1.png,frame-2.png', 'video frame selection should include shift ranges');
const groupedFrames = groupKeyframesByTime([
    { time: 5, url: 'late.png' },
    { time: 0, url: 'start.png' },
    { time: 2, url: 'middle.png' },
    { time: 7, url: 'end.png' },
], 4);
assert(groupedFrames.length === 2 && groupedFrames[0].map((frame) => frame.url).join(',') === 'start.png,middle.png', 'keyframe grouping should sort frames and split by segment duration');
const connectedNodes = [
    { id: 'video-1', type: 'video-input', selectedKeyframes: [{ url: 'frame-a.png' }, { url: 'frame-b.png' }] },
    { id: 'image-1', type: 'input-image', content: 'input.png' },
    { id: 'preview-1', type: 'preview', previewMjImages: ['preview-a.png'] },
    { id: 'gen-1', type: 'gen-image' },
    { id: 'text-1', type: 'text-node', settings: { text: 'hello prompt' } },
    { id: 'analyze-1', type: 'video-analyze' },
    { id: 'target-1', type: 'gen-image' },
];
const connectedNodesMap = new Map(connectedNodes.map((node) => [node.id, node]));
const sampleConnections = [
    { id: 'c-video', from: 'video-1', to: 'target-1' },
    { id: 'c-image', from: 'image-1', to: 'target-1', inputType: 'oref' },
    { id: 'c-preview', from: 'preview-1', to: 'target-1', inputType: 'sref' },
    { id: 'c-gen', from: 'gen-1', to: 'target-1' },
    { id: 'c-text', from: 'text-1', to: 'target-1' },
    { id: 'c-analyze', from: 'analyze-1', to: 'target-1' },
];
const connectedImagesCache = buildConnectedImagesCache({
    connections: sampleConnections,
    nodesMap: connectedNodesMap,
    history: [{ sourceNodeId: 'gen-1', status: 'completed', mjImages: ['mj-a.png', 'mj-b.png'] }],
});
assert(getConnectedInputImagesFromCache(connectedImagesCache, 'target-1').join(',') === 'frame-a.png,frame-b.png,mj-a.png,mj-b.png', 'connected image cache should include video frames and generated history');
assert(getConnectedInputImagesFromCache(connectedImagesCache, 'target-1', 'oref')[0] === 'input.png', 'connected image cache should preserve input types');
assert(getConnectedInputImagesFromCache(connectedImagesCache, 'target-1', 'sref')[0] === 'preview-a.png', 'connected image cache should read preview images');
const videoNodeCache = buildConnectedNodeTypeCache({ connections: sampleConnections, nodesMap: connectedNodesMap, nodeType: 'video-input' });
assert(videoNodeCache.get('target-1').id === 'video-1', 'connected node cache should keep first matching node type');
assert(findConnectedNodeOfType({ connections: sampleConnections, nodesMap: connectedNodesMap, targetNodeId: 'target-1', nodeType: 'video-analyze' }).id === 'analyze-1', 'connected node finder should locate analyze nodes');
assert(getConnectedTextNodeContents({ connections: sampleConnections, nodesMap: connectedNodesMap, targetNodeId: 'target-1' })[0] === 'hello prompt', 'connected text helper should read text node content');
const imageForInputCache = buildConnectedImageForInputCache({ connections: sampleConnections, nodesMap: connectedNodesMap });
assert(getConnectedImageForInputFromCache(imageForInputCache, 'target-1') === 'frame-a.png', 'input image cache should prefer first selected video frame');
assert(getConnectedImageForInputFromCache(imageForInputCache, 'target-1', 'oref') === 'input.png', 'input image cache should preserve named input image');
const arrangedNodes = arrangeNodesByGraphLayers({
    nodesToArrange: [
        { id: 'layout-a', x: 500, y: 300, width: 100, height: 50 },
        { id: 'layout-b', x: 100, y: 100, width: 100, height: 50 },
        { id: 'layout-c', x: 300, y: 200, width: 120, height: 60 },
    ],
    connections: [
        { from: 'layout-b', to: 'layout-c' },
        { from: 'layout-c', to: 'layout-a' },
    ],
});
assert(arrangedNodes.get('layout-b').x === 100 && arrangedNodes.get('layout-c').x === 350 && arrangedNodes.get('layout-a').x === 620, 'graph layout should arrange connected nodes by layer');
const branchingLayout = arrangeNodesByGraphLayers({
    nodesToArrange: [
        { id: 'root', x: 0, y: 0, width: 100, height: 50 },
        { id: 'low', x: 0, y: 200, width: 100, height: 50 },
        { id: 'high', x: 0, y: 10, width: 100, height: 50 },
    ],
    connections: [
        { from: 'root', to: 'low' },
        { from: 'root', to: 'high' },
    ],
});
assert(branchingLayout.get('high').y < branchingLayout.get('low').y, 'graph layout should preserve layer vertical order from existing positions');

[
    CHARACTER_SHEET_PROMPT_TEXT,
    GRID_PROMPT_TEXT,
    MOOD_BOARD_PROMPT_TEXT,
    STORYBOARD_PROMPT_TEXT,
    UPSCALE_PROMPT_TEXT,
].forEach((prompt, index) => {
    assert(typeof prompt === 'string' && prompt.trim().length > 40, `prompt template ${index} should be non-empty`);
});

console.log('config smoke checks passed');
