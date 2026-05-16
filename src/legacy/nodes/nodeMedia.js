import {
    isImageInputNodeType,
    isPreviewNodeType,
    isStandardGenerationNodeType,
    isVideoInputNodeType,
} from './nodeCatalog.js';

export const getVideoInputImageUrls = (node, { firstOnly = false } = {}) => {
    const selectedUrls = (node?.selectedKeyframes || [])
        .map((frame) => frame?.url)
        .filter(Boolean);

    if (selectedUrls.length > 0) {
        return firstOnly ? [selectedUrls[0]] : selectedUrls;
    }

    const firstFrameUrl = node?.frames?.[0]?.url;
    return firstFrameUrl ? [firstFrameUrl] : [];
};

export const getPreviewImageUrls = (node) => {
    if (node?.selectedPreviewImage) return [node.selectedPreviewImage];
    if (node?.content) return [node.content];
    if (node?.previewMjImages?.length > 0) return [node.previewMjImages[0]];
    return [];
};

export const getLatestGenerationResultUrls = (node, history = []) => {
    const nodeHistory = history.filter((item) => item.sourceNodeId === node?.id && item.status === 'completed');
    if (nodeHistory.length === 0) return [];

    const latestResult = nodeHistory[nodeHistory.length - 1];
    if (latestResult.mjImages?.length > 0) return [...latestResult.mjImages];
    if (latestResult.resultUrl) return [latestResult.resultUrl];
    if (latestResult.resultUrls?.length > 0) return latestResult.resultUrls;
    return [];
};

export const getConnectableImageUrlsFromNode = (node, { history = [] } = {}) => {
    if (!node) return [];

    if (isVideoInputNodeType(node.type)) {
        return getVideoInputImageUrls(node);
    }

    if (isImageInputNodeType(node.type) && node.content) {
        return [node.content];
    }

    if (isPreviewNodeType(node.type)) {
        return getPreviewImageUrls(node);
    }

    if (isStandardGenerationNodeType(node.type)) {
        return getLatestGenerationResultUrls(node, history);
    }

    return [];
};

export const getPrimaryInputImageUrlFromNode = (node) => {
    if (!node) return null;

    if (isVideoInputNodeType(node.type)) {
        return getVideoInputImageUrls(node, { firstOnly: true })[0] || null;
    }

    if (isImageInputNodeType(node.type) && node.content) {
        return node.content;
    }

    return null;
};
