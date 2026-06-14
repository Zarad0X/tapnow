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

const extractMarkdownImageUrl = (text) => {
    if (!text) return null;
    const urlMatch = String(text).match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
    return urlMatch?.[1] || null;
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

    const nestedRevisedPromptUrl = extractMarkdownImageUrl(data?.data?.data?.[0]?.revised_prompt);
    if (nestedRevisedPromptUrl) {
        return { images: [{ url: nestedRevisedPromptUrl }], source: 'data.data.data.revised_prompt' };
    }

    const revisedPromptUrl = extractMarkdownImageUrl(data?.data?.revised_prompt);
    if (revisedPromptUrl) {
        return { images: [{ url: revisedPromptUrl }], source: 'data.data.revised_prompt' };
    }

    if (Array.isArray(data?.data?.data) && data.data.data.length > 0) {
        const itemsWithUrl = data.data.data.filter((item) => item?.url || item?.image_url || item?.imageUrl);
        if (itemsWithUrl.length > 0) {
            return { images: itemsWithUrl, source: 'data.data.data.url_fields' };
        }
    }

    return { images: [], source: null };
};

export const normalizeImageItemsToUrls = (images) => {
    return (images || [])
        .map((image) => {
            if (typeof image === 'string') return image;
            return image?.url || image?.image_url || image?.imageUrl || '';
        })
        .filter(Boolean);
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

export const getAsyncImageStatusValue = (data) => {
    return String(data?.data?.status || data?.status || '').toUpperCase();
};

export const classifyAsyncImageStatus = (status) => {
    const normalized = String(status || '').toUpperCase();
    if (ASYNC_IMAGE_COMPLETED_STATUSES.has(normalized)) return ASYNC_IMAGE_STATUS.COMPLETED;
    if (ASYNC_IMAGE_FAILED_STATUSES.has(normalized)) return ASYNC_IMAGE_STATUS.FAILED;
    if (ASYNC_IMAGE_RUNNING_STATUSES.has(normalized)) return ASYNC_IMAGE_STATUS.RUNNING;
    return ASYNC_IMAGE_STATUS.UNKNOWN;
};

export const shouldContinueAsyncImagePolling = (asyncImageStatus) => {
    return asyncImageStatus !== ASYNC_IMAGE_STATUS.COMPLETED &&
        asyncImageStatus !== ASYNC_IMAGE_STATUS.FAILED;
};

export const parseProgressValue = (value) => {
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

export const getAsyncImageTimeoutConfig = (isBananaModel) => {
    return {
        maxAttempts: isBananaModel ? 160 : 300,
        timeoutSeconds: isBananaModel ? 800 : 1500,
        baseDelayMs: 5000,
    };
};

export const getMidjourneyPollConfig = () => {
    return {
        maxAttempts: 120,
        delayMs: 5000,
    };
};

const stringifyErrorValue = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'object') {
        return value.message || value.msg || value.code || '';
    }
    return '';
};

export const extractGenerationErrorMessage = (data, fallback = '') => {
    return stringifyErrorValue(data?.message) ||
        stringifyErrorValue(data?.error) ||
        stringifyErrorValue(data?.fail_reason) ||
        stringifyErrorValue(data?.data?.message) ||
        stringifyErrorValue(data?.data?.error) ||
        stringifyErrorValue(data?.data?.fail_reason) ||
        fallback;
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

export const resolveAsyncImagePollUrl = ({ baseUrl, taskIdForPoll }) => {
    return resolveEndpointUrl({
        baseUrl,
        endpoint: `/v1/images/tasks/${taskIdForPoll}`,
    });
};

export const resolveMidjourneyPollUrl = ({ baseUrl, mjMode, jobId }) => {
    return resolveEndpointUrl({
        baseUrl,
        endpoint: `/${mjMode}/mj/task/${jobId}/fetch`,
    });
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

export const normalizeGenerationStatus = (status) => String(status || '').toUpperCase();

export const isAsyncImageSuccessStatus = (status) => {
    return classifyAsyncImageStatus(status) === ASYNC_IMAGE_STATUS.COMPLETED;
};

export const isAsyncImageFailureStatus = (status) => {
    return classifyAsyncImageStatus(status) === ASYNC_IMAGE_STATUS.FAILED;
};

export const isAsyncImageRunningStatus = (status) => {
    return classifyAsyncImageStatus(status) === ASYNC_IMAGE_STATUS.RUNNING;
};

export const parseGenerationProgressValue = (progress, fallback) => {
    return parseProgressValue(progress) ?? fallback;
};

export const resolveAsyncImageRunningProgress = ({ data, attempt }) => {
    return resolveAsyncImageProgress({ data, attempt });
};

export const resolveAsyncImageUnknownProgress = ({ attempt }) => {
    return resolveAsyncImageProgress({ data: {}, attempt, isUnknownStatus: true });
};

export const resolveAsyncImagePollDelayMs = ({ progress, attempt, isBananaModel, baseDelayMs = 5000 }) => {
    return getAsyncImagePollDelay({ progress, attempt, isBananaModel, baseDelayMs });
};

export const getAsyncImagePollMaxAttempts = (isBananaModel) => {
    return getAsyncImageTimeoutConfig(isBananaModel).maxAttempts;
};

export const getAsyncImageTimeoutSeconds = (isBananaModel) => {
    return getAsyncImageTimeoutConfig(isBananaModel).timeoutSeconds;
};

export const buildAsyncImageTaskPollUrl = ({ baseUrl, taskIdForPoll }) => {
    return resolveAsyncImagePollUrl({ baseUrl, taskIdForPoll });
};

export const findFirstHttpUrlDeep = (value, { maxDepth = 5 } = {}) => {
    return findFirstHttpImageUrl(value, { maxDepth });
};
