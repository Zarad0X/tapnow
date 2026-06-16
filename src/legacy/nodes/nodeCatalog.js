export const NODE_LABELS = {
    'input-image': '图片',
    'video-input': '视频',
    'gen-image': '生成图片',
    'gen-video': '生成视频',
    'text-node': '文字',
    preview: '预览',
    'novel-input': '小说输入',
    'extract-characters-scenes': '提取角色和场景',
    'character-description': '角色描述',
    'scene-description': '场景描述',
    'create-character': '创建角色',
    'create-scene': '创建场景',
    'generate-character-video': '生成角色视频',
    'generate-scene-video': '生成场景视频',
    'generate-character-image': '生成角色图片',
    'generate-scene-image': '生成场景图片',
    'local-save': '保存到本地',
};

export const NODE_DEFAULT_SIZES = {
    'gen-video': { w: 320, h: 420 },
    'gen-image': { w: 360, h: 340 },
    'video-input': { w: 360, h: 420 },
    'video-analyze': { w: 400, h: 500 },
    'storyboard-node': { w: 600, h: 500 },
    'image-compare': { w: 400, h: 300 },
    preview: { w: 320, h: 260 },
    'text-node': { w: 280, h: 200 },
    'novel-input': { w: 400, h: 500 },
    'extract-characters-scenes': { w: 400, h: 500 },
    'character-description': { w: 400, h: 400 },
    'scene-description': { w: 400, h: 400 },
    'create-character': { w: 350, h: 300 },
    'create-scene': { w: 350, h: 300 },
    'generate-character-video': { w: 400, h: 450 },
    'generate-scene-video': { w: 400, h: 450 },
    'generate-character-image': { w: 400, h: 450 },
    'generate-scene-image': { w: 400, h: 450 },
    'local-save': { w: 320, h: 380 },
};

export const FALLBACK_NODE_SIZE = { w: 260, h: 260 };

export const getNodeLabel = (type) => NODE_LABELS[type] || type || '节点';

export const getDefaultNodeSize = (type) => NODE_DEFAULT_SIZES[type] || FALLBACK_NODE_SIZE;

export const isStandardGenerationNodeType = (type) => type === 'gen-image' || type === 'gen-video';

export const isImageInputNodeType = (type) => type === 'input-image';

export const isVideoInputNodeType = (type) => type === 'video-input';

export const isPreviewNodeType = (type) => type === 'preview';

export const isInputMediaNodeType = (type) => {
    return isImageInputNodeType(type) || isVideoInputNodeType(type);
};

export const isDownloadableMediaNodeType = (type) => {
    return isInputMediaNodeType(type) || isPreviewNodeType(type);
};

export const isCharacterSceneVideoNodeType = (type) => {
    return type === 'generate-character-video' || type === 'generate-scene-video';
};

export const isCharacterSceneImageNodeType = (type) => {
    return type === 'generate-character-image' || type === 'generate-scene-image';
};

export const createDefaultNodeSettings = (type, { apiConfigs = [], initialContent = '' } = {}) => {
    const firstChatModel = apiConfigs.find((config) => config.type === 'Chat')?.id || '';

    if (type === 'gen-image') return { model: 'nano-banana', ratio: 'Auto', resolution: 'Auto', prompt: '' };
    if (type === 'gen-video') return { model: 'sora-2-pro', duration: '4s', ratio: '16:9', videoPrompt: '' };
    if (type === 'video-analyze') return { model: 'gemini-3-pro', segmentDuration: 3, analysisMode: 'manual', voiceoverResults: [], analysisResults: [] };
    if (type === 'storyboard-node') return { projectTitle: '未命名分镜', shots: [] };
    if (type === 'text-node') return { text: initialContent || '' };
    if (type === 'novel-input') return { content: '' };
    if (type === 'extract-characters-scenes') return { model: firstChatModel, analysisResults: null, lastAnalyzed: null };
    if (type === 'character-description') return { characterId: '', characterName: '', role: '', description: '', prompt: '', duration: '15s', style: 'none', mode: 'video', imageModel: '', imageRatio: '16:9', imageResolution: '2k', referenceImages: [] };
    if (type === 'scene-description') return { sceneId: '', sceneName: '', description: '', prompt: '', duration: '15s', style: 'none', mode: 'video', imageModel: '', imageRatio: '16:9', imageResolution: '2k', referenceImages: [], chatModel: '' };
    if (type === 'create-character') return { name: '', startSecond: 1, endSecond: 3, isCreating: false, createProgress: 0, createError: null };
    if (type === 'create-scene') return { name: '', timeRange: '' };
    if (isCharacterSceneVideoNodeType(type)) return { model: 'sora-2', duration: '15s', ratio: '16:9', videoPrompt: '', referenceImages: [], sourceType: '', sourceId: '', isGenerating: false, progress: 0, error: null, videoUrl: '' };
    if (isCharacterSceneImageNodeType(type)) return { model: 'nano-banana', ratio: 'Auto', resolution: 'Auto', prompt: '', referenceImages: [], chatModel: '', imageUrls: [], selectedImageIndex: null, isGenerating: false, progress: 0, error: null, imageUrl: '' };
    if (type === 'local-save') return { serverUrl: 'http://127.0.0.1:9527', savePath: '', subfolder: '', autoSave: false, serverStatus: 'unknown', lastSaved: null, savedFiles: [] };
    return {};
};
