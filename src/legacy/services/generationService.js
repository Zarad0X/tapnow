export const isSoraModel = (modelId) => {
    return !!modelId && (modelId.includes('sora') || modelId === 'sora-2' || modelId === 'sora-2-pro');
};

export const normalizePromptForSora = (text, modelId) => {
    if (!text || !isSoraModel(modelId)) return text;
    return text
        .replace(/@([a-zA-Z0-9_.]+)(?![a-zA-Z0-9_.])/g, (match, username) => `@{${username}}`)
        .replace(/@\{([^}]+)\}/g, (match, username) => ` @{${username}} `)
        .replace(/\s{2,}/g, ' ')
        .trim();
};

export const denormalizePromptForSoraRequest = (text) => {
    return (text || '').replace(/@\{([^}]+)\}/g, (match, username) => `@${username}`);
};

export const normalizeBananaResolution = (resolution) => {
    if (typeof resolution !== 'string') return resolution;
    const trimmed = resolution.trim();
    if (!trimmed) return resolution;
    const lower = trimmed.toLowerCase();
    if (lower === '1k') return '1K';
    if (lower === '2k') return '2K';
    if (lower === '4k') return '4K';
    return resolution;
};

export const parseDurationSeconds = (duration, fallback = 8) => {
    if (duration === null || duration === undefined) return fallback;
    const cleaned = String(duration).trim().replace(/[^\d]/g, '');
    const parsed = parseInt(cleaned, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const getImageModelFeatures = (modelId, config = {}) => {
    const modelName = config?.modelName ?? '';
    const provider = config?.provider ?? '';
    const providerLower = provider.toLowerCase();

    const isGPTImage15 = modelId.includes('gpt-image-1.5') || modelName.includes('gpt-image-1.5');
    const isNanoBanana2 = modelName.includes('nano-banana-2') || modelId.includes('nano-banana-2');

    return {
        isBananaLike: (modelId.includes('banana') || modelId.includes('edit') || modelId.includes('qwen')) && !isNanoBanana2,
        isGPTImage15,
        isOpenAIImage: (modelId.includes('gpt') || modelName.includes('gpt-image') || providerLower.includes('gpt-4o image')) && !isGPTImage15,
        isFluxKontext: modelId.includes('flux') || modelName.includes('flux-kontext'),
        isNanoBanana2,
        isNanoBanana: !isNanoBanana2 && (modelName.includes('nano-banana') || modelId.includes('nano-banana')),
        isMidjourney: modelId.includes('mj') || providerLower.includes('midjourney'),
        isJimeng: modelId.includes('jimeng-4.5') ||
            modelId.includes('jimeng-4.1') ||
            modelId.includes('jimeng-3.1') ||
            modelName.includes('jimeng-4.5') ||
            modelName.includes('jimeng-4.1') ||
            modelName.includes('jimeng-3.1'),
    };
};

export const getJimengModelName = (modelId, config = {}) => {
    if (modelId.includes('jimeng-4.5')) return 'jimeng-4.5';
    if (modelId.includes('jimeng-4.1')) return 'jimeng-4.1';
    if (modelId.includes('jimeng-3.1')) return 'jimeng-3.1';
    if (
        config?.modelName &&
        (config.modelName.includes('jimeng-4.5') ||
            config.modelName.includes('jimeng-4.1') ||
            config.modelName.includes('jimeng-3.1'))
    ) {
        return config.modelName;
    }
    return 'jimeng-4.5';
};

export const getNanoBanana2ImageSizeFlag = ({ isNanoBanana2, resolution }) => {
    if (!isNanoBanana2) return undefined;
    const normalized = normalizeBananaResolution(resolution);
    if (normalized === '4K') return '4K';
    if (normalized === '2K') return '2K';
    return '1K';
};

export const getModelDisplayName = ({ modelId, config }) => {
    if (modelId.includes('jimeng-4.5')) return 'Jimeng 4.5';
    if (modelId.includes('jimeng-4.1')) return 'Jimeng 4.1';
    if (modelId.includes('jimeng-3.1')) return 'Jimeng 3.1';
    return config?.provider || modelId;
};

export const buildRequestHeaders = ({ apiKey, useMultipart = false }) => {
    return useMultipart
        ? { Authorization: `Bearer ${apiKey}` }
        : { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
};

export const resolveEndpointUrl = ({ endpoint, baseUrl }) => {
    if (endpoint.startsWith('http')) return endpoint;
    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
    return `${cleanBaseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

export const serializeGenerationPayload = ({ payload, useMultipart = false }) => {
    return useMultipart ? payload : JSON.stringify(payload);
};

export const submitGenerationRequest = async ({
    endpoint,
    baseUrl,
    apiKey,
    payload,
    useMultipart = false,
    fetchImpl = globalThis.fetch,
}) => {
    const fullUrl = resolveEndpointUrl({ endpoint, baseUrl });

    let response;
    try {
        response = await fetchImpl(fullUrl, {
            method: 'POST',
            headers: buildRequestHeaders({ apiKey, useMultipart }),
            body: serializeGenerationPayload({ payload, useMultipart }),
        });
    } catch (fetchError) {
        throw new Error(`网络请求失败：${fetchError.message}`);
    }

    const text = await response.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch (error) {
        throw new Error(`响应解析失败: ${text.substring(0, 100)}`);
    }

    return { response, text, data, fullUrl };
};

export const extractAsyncTaskId = (data) => {
    if (data?.task_id) return data.task_id;
    if (typeof data?.data === 'string' && (data.data.startsWith('task-') || data.data.length > 10)) return data.data;
    if (data?.data?.task_id) return data.data.task_id;
    if (data?.data?.data && typeof data.data.data === 'string' && (data.data.data.startsWith('task-') || data.data.data.length > 10)) {
        return data.data.data;
    }
    return null;
};

export const extractImageUrlFromItem = (item) => {
    if (typeof item === 'string') return item;
    return item?.url || item?.image_url || item?.imageUrl || '';
};

export const extractImageUrlsFromItems = (items) => {
    if (!Array.isArray(items)) return [];
    return items.map(extractImageUrlFromItem).filter(Boolean);
};

export const extractImageUrls = (data) => {
    if (data?.data && Array.isArray(data.data)) {
        return extractImageUrlsFromItems(data.data);
    }
    if (data?.data?.data && Array.isArray(data.data.data)) {
        return extractImageUrlsFromItems(data.data.data);
    }
    return [];
};

const extractMarkdownImageUrl = (text) => {
    if (typeof text !== 'string') return null;
    const match = text.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
    return match?.[1] ?? null;
};

export const extractAsyncImageItems = (data) => {
    if (Array.isArray(data?.data?.data) && data.data.data.length > 0) {
        return { images: data.data.data, source: 'data.data.data' };
    }

    if (Array.isArray(data?.data?.images) && data.data.images.length > 0) {
        return { images: data.data.images, source: 'data.data.images' };
    }

    if (Array.isArray(data?.images) && data.images.length > 0) {
        return { images: data.images, source: 'data.images' };
    }

    if (Array.isArray(data?.data) && data.data.length > 0) {
        return { images: data.data, source: 'data.data' };
    }

    const revisedPromptUrl = extractMarkdownImageUrl(data?.data?.revised_prompt);
    if (revisedPromptUrl) {
        return {
            images: [{ url: revisedPromptUrl }],
            source: 'data.data.revised_prompt',
            url: revisedPromptUrl,
        };
    }

    return { images: [], source: null };
};

export const getBackendDurationValue = (data) => {
    return data?.data?.duration ||
        data?.data?.cost_time ||
        data?.data?.elapsed_time ||
        data?.data?.time_cost ||
        data?.data?.spent_time ||
        data?.duration ||
        data?.cost_time ||
        data?.elapsed_time ||
        data?.time_cost ||
        data?.spent_time;
};

export const parseBackendDurationMs = (backendDuration) => {
    if (backendDuration === null || backendDuration === undefined) return null;

    if (typeof backendDuration === 'number') {
        return backendDuration < 10000 ? backendDuration * 1000 : backendDuration;
    }

    if (typeof backendDuration === 'string') {
        const match = backendDuration.match(/(\d+\.?\d*)\s*(s|ms|秒|毫秒)/i);
        if (match) {
            const value = parseFloat(match[1]);
            const unit = match[2].toLowerCase();
            return (unit === 's' || unit === '秒') ? value * 1000 : value;
        }

        const parsed = parseFloat(backendDuration);
        if (!Number.isNaN(parsed)) {
            return parsed < 10000 ? parsed * 1000 : parsed;
        }
    }

    return null;
};

export const resolveGenerationDurationMs = ({ data, startTime, now = Date.now() }) => {
    const backendDuration = getBackendDurationValue(data);
    const backendDurationMs = parseBackendDurationMs(backendDuration);

    return {
        backendDuration,
        durationMs: backendDurationMs ?? (now - (startTime || now)),
    };
};

const ASYNC_IMAGE_SUCCESS_STATUSES = new Set(['COMPLETED', 'SUCCESS', 'FINISHED', 'DONE']);
const ASYNC_IMAGE_FAILURE_STATUSES = new Set(['FAILED', 'ERROR', 'CANCELLED', 'FAILURE']);
const ASYNC_IMAGE_RUNNING_STATUSES = new Set(['PENDING', 'PROCESSING', 'GENERATING', 'IN_PROGRESS', 'RUNNING']);

export const normalizeGenerationStatus = (status) => String(status || '').toUpperCase();

export const isAsyncImageSuccessStatus = (status) => {
    return ASYNC_IMAGE_SUCCESS_STATUSES.has(normalizeGenerationStatus(status));
};

export const isAsyncImageFailureStatus = (status) => {
    return ASYNC_IMAGE_FAILURE_STATUSES.has(normalizeGenerationStatus(status));
};

export const isAsyncImageRunningStatus = (status) => {
    return ASYNC_IMAGE_RUNNING_STATUSES.has(normalizeGenerationStatus(status));
};

export const parseGenerationProgressValue = (progress, fallback) => {
    if (!progress) return fallback;

    if (typeof progress === 'number') {
        return progress;
    }

    const progressText = String(progress);
    if (progressText.includes('%')) {
        return parseInt(progressText.replace('%', ''), 10) || fallback;
    }

    return fallback;
};

export const resolveAsyncImageRunningProgress = ({ data, attempt }) => {
    let progress = 10 + (attempt * 2);

    if (data?.data?.progress) {
        progress = parseGenerationProgressValue(data.data.progress, progress);
    } else if (data?.progress) {
        progress = parseGenerationProgressValue(data.progress, progress);
    }

    return Math.min(95, Math.max(10, progress));
};

export const resolveAsyncImageUnknownProgress = ({ attempt }) => {
    return Math.min(90, 10 + (attempt * 1.5));
};

export const resolveAsyncImagePollDelayMs = ({ progress, attempt, isBananaModel, baseDelayMs = 5000 }) => {
    if (progress >= 90) return 1000;
    if (progress >= 70) return 2000;
    if (progress >= 50) return 3000;
    if (attempt > 50 && !isBananaModel) return 10000;
    return baseDelayMs;
};

export const getAsyncImagePollMaxAttempts = (isBananaModel) => {
    return isBananaModel ? 160 : 300;
};

export const getAsyncImageTimeoutSeconds = (isBananaModel) => {
    return isBananaModel ? 800 : 1500;
};

export const buildAsyncImageTaskPollUrl = ({ baseUrl, taskIdForPoll }) => {
    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
    return `${cleanBaseUrl}/v1/images/tasks/${taskIdForPoll}`;
};

export const findFirstHttpUrlDeep = (value, { maxDepth = 5 } = {}) => {
    const visited = new WeakSet();
    const urlFields = ['url', 'image_url', 'imageUrl', 'image', 'src', 'link', 'href'];

    const search = (current, depth = 0) => {
        if (depth > maxDepth) return null;
        if (!current || typeof current !== 'object') return null;

        if (visited.has(current)) return null;
        visited.add(current);

        for (const field of urlFields) {
            if (typeof current[field] === 'string' && current[field].startsWith('http')) {
                return current[field];
            }
        }

        if (Array.isArray(current) && current.length > 0) {
            const firstResult = search(current[0], depth + 1);
            if (firstResult) return firstResult;
        }

        for (const key in current) {
            if (Object.prototype.hasOwnProperty.call(current, key) && !urlFields.includes(key)) {
                const result = search(current[key], depth + 1);
                if (result) return result;
            }
        }

        return null;
    };

    return search(value);
};
