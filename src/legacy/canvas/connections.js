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
