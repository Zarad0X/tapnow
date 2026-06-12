export const getNodeOutputImages = (sourceNode, history = []) => {
    if (!sourceNode) return [];

    if (sourceNode.type === 'video-input') {
        const selected = sourceNode.selectedKeyframes?.length
            ? sourceNode.selectedKeyframes.map((frame) => frame.url).filter(Boolean)
            : [];
        if (selected.length > 0) return selected;
        if (sourceNode.frames?.length > 0 && sourceNode.frames[0]?.url) {
            return [sourceNode.frames[0].url];
        }
        return [];
    }

    if (sourceNode.type === 'input-image' && sourceNode.content) {
        return [sourceNode.content];
    }

    if (sourceNode.type === 'preview') {
        if (sourceNode.selectedPreviewImage) return [sourceNode.selectedPreviewImage];
        if (sourceNode.content) return [sourceNode.content];
        if (sourceNode.previewMjImages?.length > 0) return [sourceNode.previewMjImages[0]];
        return [];
    }

    if (sourceNode.type === 'gen-image' || sourceNode.type === 'gen-video') {
        const nodeHistory = history.filter((item) =>
            item.sourceNodeId === sourceNode.id && item.status === 'completed'
        );
        const latestResult = nodeHistory[nodeHistory.length - 1];
        if (!latestResult) return [];
        if (latestResult.mjImages?.length > 0) return [...latestResult.mjImages];
        if (latestResult.resultUrl) return [latestResult.resultUrl];
        if (latestResult.resultUrls?.length > 0) return latestResult.resultUrls;
    }

    return [];
};

export const buildConnectedImagesCache = ({ connections, nodesMap, history }) => {
    const cache = new Map();

    connections.forEach((connection) => {
        const inputType = connection.inputType || 'default';
        if (!cache.has(connection.to)) {
            cache.set(connection.to, new Map());
        }

        const nodeConnections = cache.get(connection.to);
        if (!nodeConnections.has(inputType)) {
            nodeConnections.set(inputType, []);
        }

        const images = getNodeOutputImages(nodesMap.get(connection.from), history);
        if (images.length > 0) {
            nodeConnections.get(inputType).push(...images);
        }
    });

    return cache;
};

export const getConnectedInputImagesFromCache = (cache, targetNodeId, inputType = 'default') => {
    const nodeCache = cache.get(targetNodeId);
    if (!nodeCache) return [];
    return nodeCache.get(inputType) || [];
};

export const buildConnectedNodeTypeCache = ({ connections, nodesMap, nodeType }) => {
    const cache = new Map();

    connections.forEach((connection) => {
        if (cache.has(connection.to)) return;
        const sourceNode = nodesMap.get(connection.from);
        if (sourceNode?.type === nodeType) {
            cache.set(connection.to, sourceNode);
        }
    });

    return cache;
};

export const findConnectedNodeOfType = ({ connections, nodesMap, targetNodeId, nodeType }) => {
    for (const connection of connections) {
        if (connection.to !== targetNodeId) continue;
        const sourceNode = nodesMap.get(connection.from);
        if (sourceNode?.type === nodeType) return sourceNode;
    }
    return null;
};

export const getConnectedTextNodeContents = ({ connections, nodesMap, targetNodeId }) => {
    const texts = [];

    connections.forEach((connection) => {
        if (connection.to !== targetNodeId) return;
        const sourceNode = nodesMap.get(connection.from);
        if (sourceNode?.type !== 'text-node') return;
        const text = sourceNode.settings?.text || '';
        if (text) texts.push(text);
    });

    return texts;
};

export const buildConnectedImageForInputCache = ({ connections, nodesMap }) => {
    const cache = new Map();

    connections.forEach((connection) => {
        const inputType = connection.inputType || 'default';
        const key = `${connection.to}:${inputType}`;
        if (cache.has(key)) return;

        const sourceNode = nodesMap.get(connection.from);
        let imageUrl = null;
        if (sourceNode?.type === 'video-input') {
            imageUrl = sourceNode.selectedKeyframes?.[0]?.url || sourceNode.frames?.[0]?.url || null;
        } else if (sourceNode?.type === 'input-image' && sourceNode.content) {
            imageUrl = sourceNode.content;
        }

        if (imageUrl) cache.set(key, imageUrl);
    });

    return cache;
};

export const getConnectedImageForInputFromCache = (cache, targetNodeId, inputType = 'default') => {
    return cache.get(`${targetNodeId}:${inputType}`) || null;
};

export const getPreviewTargetNodeId = ({ nodes, selectedNodeId, selectedNodeIds }) => {
    const previews = (nodes || []).filter((node) => node.type === 'preview');
    if (!previews.length) return null;

    if (selectedNodeId) {
        const selectedPreview = previews.find((preview) => preview.id === selectedNodeId);
        if (selectedPreview) return selectedPreview.id;
    }

    if (selectedNodeIds && selectedNodeIds.size > 0) {
        const selectedPreview = previews.find((preview) => selectedNodeIds.has(preview.id));
        if (selectedPreview) return selectedPreview.id;
    }

    return previews[previews.length - 1].id;
};

export const buildNodeConnectedStatus = (connections) => {
    const status = new Map();
    (connections || []).forEach((connection) => {
        if (!connection.inputType || connection.inputType === 'default') {
            status.set(connection.to, true);
        }
    });
    return status;
};

export const filterConnectionsForVisibleNodes = ({ connections, visibleNodes }) => {
    const visibleNodeIds = new Set((visibleNodes || []).map((node) => node.id));
    return (connections || []).filter((connection) =>
        visibleNodeIds.has(connection.from) || visibleNodeIds.has(connection.to)
    );
};

const isMidjourneyModelConfig = (modelConfig) => {
    return !!modelConfig &&
        (modelConfig.id?.includes('mj') || modelConfig.provider?.toLowerCase().includes('midjourney'));
};

const getMidjourneyInputAnchorY = ({ node, inputType, relevantConnections = [] }) => {
    const paddingTop = 12;
    const titleHeight = 16;
    const titleMarginBottom = 8;
    const refAreaHeight = 60;
    const refAreaMarginBottom = 8;
    const promptAreaHeight = 100;
    const promptAreaMarginBottom = 8;
    const instructionGap = 6;
    const instructionItemHeight = 16;
    const owInputHeight = 28;
    const hasRefArea = relevantConnections.some((connection) => !connection.inputType || connection.inputType === 'default');

    let baseOffset = paddingTop + titleHeight + titleMarginBottom;
    if (hasRefArea) {
        baseOffset += refAreaHeight + refAreaMarginBottom;
    }
    baseOffset += promptAreaHeight + promptAreaMarginBottom;

    if (inputType === 'oref') {
        return node.y + baseOffset + instructionItemHeight * 0.5;
    }
    if (inputType === 'sref') {
        return node.y + baseOffset + instructionItemHeight + instructionGap + owInputHeight + instructionGap + instructionItemHeight * 0.5;
    }
    return node.y + node.height / 2;
};

export const getNodeInputAnchorY = ({
    node,
    inputType,
    connectionId = null,
    relevantConnections = [],
    modelConfig = null,
}) => {
    if (!node) return 0;

    if (node.type === 'image-compare' && connectionId) {
        const index = relevantConnections.findIndex((connection) => connection.id === connectionId);
        if (index === 0) return node.y + node.height * 0.33;
        if (index >= 1) return node.y + node.height * 0.66;
    }

    if (
        node.type === 'gen-image' &&
        (inputType === 'oref' || inputType === 'sref') &&
        isMidjourneyModelConfig(modelConfig)
    ) {
        return getMidjourneyInputAnchorY({ node, inputType, relevantConnections });
    }

    return node.y + node.height / 2;
};

export const buildConnectionCurve = ({ startX, startY, endX, endY }) => {
    const distance = Math.abs(endX - startX);
    const cp1X = startX + distance * 0.5;
    const cp2X = endX - distance * 0.5;
    return {
        path: `M ${startX} ${startY} C ${cp1X} ${startY}, ${cp2X} ${endY}, ${endX} ${endY}`,
        midX: (startX + endX) / 2,
        midY: (startY + endY) / 2,
        cp1X,
        cp2X,
    };
};
