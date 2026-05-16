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

export const extractImageUrls = (data) => {
    if (data?.data && Array.isArray(data.data)) {
        return data.data.map((item) => item.url || item.image_url || item).filter((url) => typeof url === 'string');
    }
    if (data?.data?.data && Array.isArray(data.data.data)) {
        return data.data.data.map((item) => item.url).filter(Boolean);
    }
    return [];
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
