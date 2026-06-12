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

export const extractBackendDuration = (data) => {
    return data?.data?.duration ??
        data?.data?.cost_time ??
        data?.data?.elapsed_time ??
        data?.data?.time_cost ??
        data?.data?.spent_time ??
        data?.duration ??
        data?.cost_time ??
        data?.elapsed_time ??
        data?.time_cost ??
        data?.spent_time ??
        null;
};

export const normalizeDurationToMs = (duration) => {
    if (duration === null || duration === undefined) return null;

    if (typeof duration === 'number') {
        return Number.isFinite(duration) ? (duration < 10000 ? duration * 1000 : duration) : null;
    }

    if (typeof duration === 'string') {
        const match = duration.match(/(\d+\.?\d*)\s*(s|ms|秒|毫秒)/i);
        if (match) {
            const value = parseFloat(match[1]);
            if (!Number.isFinite(value)) return null;
            const unit = match[2].toLowerCase();
            return (unit === 's' || unit === '秒') ? value * 1000 : value;
        }

        const parsed = parseFloat(duration);
        if (Number.isFinite(parsed)) {
            return parsed < 10000 ? parsed * 1000 : parsed;
        }
    }

    return null;
};

export const resolveGenerationDurationMs = ({ data, startTime, endTime = Date.now() }) => {
    const backendDuration = extractBackendDuration(data);
    const durationMs = normalizeDurationToMs(backendDuration);
    if (durationMs !== null) {
        return { durationMs, backendDuration, usedBackendDuration: true };
    }

    return {
        durationMs: endTime - (startTime || endTime),
        backendDuration,
        usedBackendDuration: false,
    };
};

export const findFirstHttpImageUrl = (value, { maxDepth = 5 } = {}) => {
    const urlFields = ['url', 'image_url', 'imageUrl', 'image', 'src', 'link', 'href'];

    const visit = (current, depth, visited) => {
        if (depth > maxDepth) return null;
        if (!current || typeof current !== 'object') return null;
        if (visited.has(current)) return null;
        visited.add(current);

        for (const field of urlFields) {
            const candidate = current[field];
            if (typeof candidate === 'string' && candidate.startsWith('http')) {
                return candidate;
            }
        }

        if (Array.isArray(current)) {
            for (const item of current) {
                const result = visit(item, depth + 1, visited);
                if (result) return result;
            }
            return null;
        }

        for (const key in current) {
            if (!Object.prototype.hasOwnProperty.call(current, key) || urlFields.includes(key)) continue;
            const result = visit(current[key], depth + 1, visited);
            if (result) return result;
        }

        return null;
    };

    return visit(value, 0, new WeakSet());
};

export const ASYNC_IMAGE_STATUS = {
    COMPLETED: 'completed',
    FAILED: 'failed',
    RUNNING: 'running',
    UNKNOWN: 'unknown',
};

const ASYNC_IMAGE_COMPLETED_STATUSES = new Set(['COMPLETED', 'SUCCESS', 'FINISHED', 'DONE']);
const ASYNC_IMAGE_FAILED_STATUSES = new Set(['FAILED', 'ERROR', 'CANCELLED', 'FAILURE']);
const ASYNC_IMAGE_RUNNING_STATUSES = new Set(['PENDING', 'PROCESSING', 'GENERATING', 'IN_PROGRESS', 'RUNNING']);

export const classifyAsyncImageStatus = (status) => {
    const normalized = String(status || '').toUpperCase();
    if (ASYNC_IMAGE_COMPLETED_STATUSES.has(normalized)) return ASYNC_IMAGE_STATUS.COMPLETED;
    if (ASYNC_IMAGE_FAILED_STATUSES.has(normalized)) return ASYNC_IMAGE_STATUS.FAILED;
    if (ASYNC_IMAGE_RUNNING_STATUSES.has(normalized)) return ASYNC_IMAGE_STATUS.RUNNING;
    return ASYNC_IMAGE_STATUS.UNKNOWN;
};

const parseProgressValue = (value) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value !== 'string') return null;
    const parsed = parseInt(value.replace('%', ''), 10);
    return Number.isFinite(parsed) ? parsed : null;
};

export const resolveAsyncImageProgress = ({ data, attempt, isUnknownStatus = false }) => {
    const fallback = isUnknownStatus
        ? Math.min(90, 10 + (attempt * 1.5))
        : 10 + (attempt * 2);
    const progress = parseProgressValue(data?.data?.progress) ??
        parseProgressValue(data?.progress) ??
        fallback;

    return Math.min(95, Math.max(10, progress));
};

export const getAsyncImagePollDelay = ({ progress, attempt, isBananaModel, baseDelayMs }) => {
    if (progress >= 90) return 1000;
    if (progress >= 70) return 2000;
    if (progress >= 50) return 3000;
    if (attempt > 50 && !isBananaModel) return 10000;
    return baseDelayMs;
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

export const extractImageUrls = (data) => {
    if (data?.data && Array.isArray(data.data)) {
        return data.data.map((item) => item.url || item.image_url || item).filter((url) => typeof url === 'string');
    }
    if (data?.data?.data && Array.isArray(data.data.data)) {
        return data.data.data.map((item) => item.url).filter(Boolean);
    }
    return [];
};
