import { useCallback, useMemo } from 'react';
import { isVideoInputNodeType } from '../nodes/nodeCatalog.js';
import {
    getConnectableImageUrlsFromNode,
    getPrimaryInputImageUrlFromNode,
} from '../nodes/nodeMedia.js';

const getConnectedImageSignature = (nodes) => {
    return nodes
        .map((node) => `${node.id}:${node.type}:${node.content ? 'hasContent' : ''}:${node.selectedKeyframes?.length || 0}:${node.frames?.length || 0}:${node.selectedPreviewImage || ''}:${node.previewMjImages?.length || 0}`)
        .join('|');
};

const getInputImageSignature = (nodes) => {
    return nodes
        .map((node) => `${node.id}:${node.type}:${node.content ? 'hasContent' : ''}:${node.selectedKeyframes?.[0]?.url || ''}:${node.frames?.[0]?.url || ''}`)
        .join('|');
};

export const useConnectedMedia = ({ connections, nodes, nodesMap, history }) => {
    const connectedImageSignature = useMemo(() => getConnectedImageSignature(nodes), [nodes]);
    const inputImageSignature = useMemo(() => getInputImageSignature(nodes), [nodes]);

    const connectedImagesCache = useMemo(() => {
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

            const sourceNode = nodesMap.get(connection.from);
            const images = getConnectableImageUrlsFromNode(sourceNode, { history });
            if (images.length > 0) {
                nodeConnections.get(inputType).push(...images);
            }
        });
        return cache;
    }, [connections, nodesMap, history, connectedImageSignature]);

    const getConnectedInputImages = useCallback((targetNodeId, inputType = 'default') => {
        const nodeCache = connectedImagesCache.get(targetNodeId);
        if (!nodeCache) return [];
        return nodeCache.get(inputType) || [];
    }, [connectedImagesCache]);

    const connectedVideoInputCache = useMemo(() => {
        const cache = new Map();
        connections.forEach((connection) => {
            if (cache.has(connection.to)) return;

            const sourceNode = nodesMap.get(connection.from);
            if (sourceNode && isVideoInputNodeType(sourceNode.type)) {
                cache.set(connection.to, sourceNode);
            }
        });
        return cache;
    }, [connections, nodesMap]);

    const getConnectedVideoInputNode = useCallback((targetNodeId) => {
        return connectedVideoInputCache.get(targetNodeId) || null;
    }, [connectedVideoInputCache]);

    const connectedImageForInputCache = useMemo(() => {
        const cache = new Map();
        connections.forEach((connection) => {
            const inputType = connection.inputType || 'default';
            const key = `${connection.to}:${inputType}`;
            if (cache.has(key)) return;

            const sourceNode = nodesMap.get(connection.from);
            const imageUrl = getPrimaryInputImageUrlFromNode(sourceNode);
            if (imageUrl) {
                cache.set(key, imageUrl);
            }
        });
        return cache;
    }, [connections, nodesMap, inputImageSignature]);

    const getConnectedImageForInput = useCallback((targetNodeId, inputType) => {
        const key = `${targetNodeId}:${inputType || 'default'}`;
        return connectedImageForInputCache.get(key) || null;
    }, [connectedImageForInputCache]);

    return {
        getConnectedImageForInput,
        getConnectedInputImages,
        getConnectedVideoInputNode,
    };
};
