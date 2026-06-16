export const DEFAULT_BASE_URL = 'https://ai.comfly.chat';
export const OPENROUTER_API_BASE_URL = 'https://openrouter.ai/api/v1';

export const JIMENG_API_BASE_URL = 'http://localhost:5100';
export const JIMENG_SESSION_ID = '7a16459fbd65d9c87b4ea44d3318f5fa';

export const DEFAULT_API_CONFIGS = [
    { id: 'gemini-3-pro', provider: 'Gemini 3 Pro', modelName: 'gemini-3-pro-preview', type: 'Chat', key: '', url: DEFAULT_BASE_URL },
    { id: 'gpt-5-1', provider: 'GPT 5.1', modelName: 'gpt-5.1', type: 'Chat', key: '', url: DEFAULT_BASE_URL },
    { id: 'gpt-5-2', provider: 'GPT 5.2', modelName: 'gpt-5.2', type: 'Chat', key: '', url: DEFAULT_BASE_URL },
    { id: 'deepseek-v3', provider: 'DeepSeek V3', modelName: 'deepseek-v3-1-250821', type: 'Chat', key: '', url: DEFAULT_BASE_URL },
    { id: 'gpt-4o', provider: 'GPT-4o', modelName: 'gpt-4o', type: 'Chat', key: '', url: DEFAULT_BASE_URL },

    { id: 'nano-banana', provider: 'Nano Banana', modelName: 'nano-banana', type: 'Image', key: '', url: DEFAULT_BASE_URL },
    { id: 'nano-banana-2', provider: 'Nano Banana 2', modelName: 'nano-banana-2', type: 'Image', key: '', url: DEFAULT_BASE_URL },
    { id: 'gpt-image', provider: 'GPT-4o Image', modelName: 'gpt-4o-image', type: 'Image', key: '', url: DEFAULT_BASE_URL },
    { id: 'gpt-image-1.5', provider: 'GPT Image 1.5', modelName: 'gpt-image-1.5', type: 'Image', key: '', url: DEFAULT_BASE_URL },
    { id: 'flux-kontext', provider: 'Flux Kontext', modelName: 'flux-kontext-pro', type: 'Image', key: '', url: DEFAULT_BASE_URL },
    { id: 'mj-v6', provider: 'Midjourney', modelName: 'MJ V6', type: 'Image', key: '', url: 'https://api.midjourney.com' },
    { id: 'jimeng-4.5', provider: 'Jimeng 4.5', modelName: 'jimeng-4.5', type: 'Image', key: '', url: JIMENG_API_BASE_URL },
    { id: 'jimeng-4.1', provider: 'Jimeng 4.1', modelName: 'jimeng-4.1', type: 'Image', key: '', url: JIMENG_API_BASE_URL },
    { id: 'jimeng-3.1', provider: 'Jimeng 3.1', modelName: 'jimeng-3.1', type: 'Image', key: '', url: JIMENG_API_BASE_URL },

    { id: 'sora-2', provider: 'Sora 2', modelName: 'sora-2', type: 'Video', key: '', url: DEFAULT_BASE_URL, durations: ['5s', '10s', '15s'] },
    { id: 'sora-2-pro', provider: 'Sora 2 Pro', modelName: 'openai/sora-2-pro', type: 'Video', key: '', url: OPENROUTER_API_BASE_URL, durations: ['4s', '8s', '12s', '16s', '20s'] },
    { id: 'google-veo3', provider: 'Google Veo 3', modelName: 'veo3.1-components', type: 'Video', key: '', url: 'https://ai.t8star.cn', durations: ['8s'] },
    { id: 'google-veo3.1', provider: 'Google Veo 3.1', modelName: 'veo3.1', type: 'Video', key: '', url: 'https://ai.t8star.cn', durations: ['8s'] },
    { id: 'grok-3', provider: 'Grok3 Video', modelName: 'grok-video-3', type: 'Video', key: '', url: 'https://ai.t8star.cn', durations: ['8s', '5s'] },
];

export const RATIOS = ['Auto', '1:1', '16:9', '9:16', '4:3', '3:4', '21:9', '3:2', '2:3'];
export const GROK_VIDEO_RATIOS = ['3:2', '2:3', '1:1'];
export const VIDEO_RES_OPTIONS = ['1080P', '720P'];
export const RESOLUTIONS = ['Auto', '1K', '2K', '4K'];

export const DELETED_MODEL_IDS = [
    'gemini-image',
    'qwen-image',
    'doubao-seedream',
    'jimeng',
    'hailuo-02',
    'kling-v1-6',
    'wan-2.5',
];

export const MJ_VERSIONS = [
    { label: 'MJ V7', value: '--v 7' },
    { label: 'MJ V6.1', value: '--v 6.1' },
    { label: 'MJ V6', value: '--v 6' },
    { label: 'MJ V5.2', value: '--v 5.2' },
    { label: 'MJ V5.1', value: '--v 5.1' },
    { label: 'Niji V6', value: '--niji 6' },
    { label: 'Niji V5', value: '--niji 5' },
    { label: 'Niji V4', value: '--niji 4' },
];

export const getRatiosForModel = (modelId) => {
    if (!modelId) return RATIOS;
    if (modelId.includes('grok')) return GROK_VIDEO_RATIOS;
    return RATIOS;
};

export const getResolutionsForModel = (modelId) => {
    if (!modelId) return RESOLUTIONS;
    if (modelId.includes('jimeng-4.5')) return ['2K', '4K'];
    return RESOLUTIONS;
};

export const calculateResolution = (ratio, baseResolution) => {
    let baseW = 1024;
    let baseH = 1024;

    if (baseResolution === '1080P') { baseW = 1920; baseH = 1080; }
    else if (baseResolution === '720P') { baseW = 1280; baseH = 720; }
    else if (baseResolution === '2K') { baseW = 2048; baseH = 2048; }
    else if (baseResolution === '4K') { baseW = 3840; baseH = 2160; }

    if (ratio === 'Auto') {
        return { str: `${baseW}x${baseH}`, w: baseW, h: baseH };
    }

    const [rW, rH] = ratio.split(':').map(Number);
    if (!rW || !rH) return { str: '1024x1024', w: 1024, h: 1024 };

    let targetW;
    let targetH;

    if (Math.abs(rW - rH) < 0.1) {
        targetW = baseW;
        targetH = baseH;
    } else if (rW > rH) {
        targetW = (baseResolution === 'Auto' || baseResolution === '1K') ? 1280 : baseW;
        targetH = Math.round(targetW * (rH / rW));
    } else {
        targetH = (baseResolution === 'Auto' || baseResolution === '1K') ? 1280 : baseW;
        targetW = Math.round(targetH * (rW / rH));
    }

    targetW = Math.round(targetW / 16) * 16;
    targetH = Math.round(targetH / 16) * 16;

    return { str: `${targetW}x${targetH}`, w: targetW, h: targetH };
};

export const getModelParams = (modelId, ratio, resolution) => {
    const { str, w, h } = calculateResolution(ratio, resolution);
    if (modelId.includes('minimax')) {
        return { sizeStr: resolution === '4K' ? '1080p' : '720p', w, h };
    }
    if (modelId.includes('jimeng') || modelId.includes('veo')) {
        return { sizeStr: ratio, w, h };
    }
    if (modelId.includes('grok')) {
        return { sizeStr: ratio, w, h };
    }
    return { sizeStr: str, w, h };
};
