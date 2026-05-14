const CAMERA_TAG_KEYWORDS = ['推', '拉', '摇', '移', '跟', '升', '降', 'Dolly', 'Pan', 'Tilt', 'Zoom'];
const CAMERA_FIELD_KEYWORDS = ['推', '拉', '摇', '移', '跟', 'Dolly', 'Pan', 'Tilt', 'Zoom'];

const inferCameraTags = (description) => {
    if (!description) return [];
    return CAMERA_TAG_KEYWORDS.filter((keyword) => description.includes(keyword));
};

const findCameraTag = (tags) => {
    return tags.find((tag) => CAMERA_FIELD_KEYWORDS.some((keyword) => tag.includes(keyword))) || '';
};

export const getDefaultDurationForModel = (modelId) => {
    if (!modelId) return '5s';
    if (modelId === 'sora-2-pro') return '15s';
    if (modelId.includes('sora-2') || modelId === 'sora-2') return '15s';
    if (modelId.includes('veo') || modelId === 'google-veo3') return '8s';
    if (modelId.includes('grok') || modelId === 'grok-3') return '8s';
    return '5s';
};

export const getDefaultDurationsForModel = (modelId) => {
    if (!modelId) return ['5s', '10s', '8s'];
    if (modelId === 'sora-2-pro') return ['15s', '25s'];
    if (modelId.includes('sora-2') || modelId === 'sora-2') return ['5s', '10s', '15s'];
    if (modelId.includes('veo') || modelId === 'google-veo3') return ['8s'];
    if (modelId.includes('grok') || modelId === 'grok-3') return ['8s', '5s'];
    return ['5s', '10s', '8s'];
};

export const createEmptyStoryboardShot = ({ shotCount = 0, defaultModel = '' } = {}) => ({
    id: `shot-${Date.now()}`,
    scene_index: shotCount + 1,
    time_range: '',
    image_url: '',
    description: '',
    prompt: '',
    camera: '',
    tags: [],
    status: 'draft',
    model: defaultModel,
    ratio: '16:9',
    duration: getDefaultDurationForModel(defaultModel),
});

export const renumberStoryboardShots = (shots) => {
    return shots.map((shot, index) => ({
        ...shot,
        scene_index: index + 1,
    }));
};

export const updateStoryboardShot = (shots, shotId, updates) => {
    return shots.map((shot) => (shot.id === shotId ? { ...shot, ...updates } : shot));
};

export const createShotsFromAnalysisResults = (
    analysisResults,
    {
        includeGlobalCamera = false,
        idFactory = (index) => `shot-${Date.now()}-${index}`,
    } = {},
) => {
    return analysisResults.map((result, index) => {
        const keyframe = result.keyframes?.find((item) => item.type === 'current') || result.keyframes?.[0];
        const mjPrompt = keyframe?.mj_prompt || '';
        const jimengPrompt = keyframe?.jimeng_prompt || '';
        const description = keyframe?.description || result.keyframes?.[0]?.description || '';
        const tags = [];

        if (result.global_tags?.style?.[0]) tags.push(result.global_tags.style[0]);
        if (includeGlobalCamera && result.global_tags?.camera?.[0]) tags.push(result.global_tags.camera[0]);
        tags.push(...inferCameraTags(description));

        return {
            id: idFactory(index),
            scene_index: index + 1,
            time_range: result.time_range || '',
            image_url: '',
            description,
            prompt: mjPrompt || jimengPrompt,
            camera: (includeGlobalCamera && result.global_tags?.camera?.[0]) || findCameraTag(tags),
            tags,
            status: 'draft',
        };
    });
};
