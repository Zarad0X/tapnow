import { useCallback, useMemo } from 'react';
import { isStandardGenerationNodeType } from '../nodes/nodeCatalog.js';

const buildConnectionsByNode = (connections) => {
    const byNode = {
        to: new Map(),
        from: new Map(),
    };

    connections.forEach((connection) => {
        if (!byNode.to.has(connection.to)) {
            byNode.to.set(connection.to, []);
        }
        byNode.to.get(connection.to).push(connection);

        if (!byNode.from.has(connection.from)) {
            byNode.from.set(connection.from, []);
        }
        byNode.from.get(connection.from).push(connection);
    });

    return byNode;
};

const buildNodeConnectedStatus = (connections) => {
    const status = new Map();
    connections.forEach((connection) => {
        if (!connection.inputType || connection.inputType === 'default') {
            status.set(connection.to, true);
        }
    });
    return status;
};

export const useConnectionQueries = ({ connections, nodesMap, selectedNodeId, selectedNodeIds }) => {
    const connectionsByNode = useMemo(() => buildConnectionsByNode(connections), [connections]);

    const nodeConnectedStatus = useMemo(() => buildNodeConnectedStatus(connections), [connections]);

    const getConnectedVideoAnalyzeNode = useCallback((targetNodeId) => {
        const incoming = connectionsByNode.to.get(targetNodeId) || [];
        for (const connection of incoming) {
            const sourceNode = nodesMap.get(connection.from);
            if (sourceNode?.type === 'video-analyze') {
                return sourceNode;
            }
        }
        return null;
    }, [connectionsByNode, nodesMap]);

    const getConnectedTextNodes = useCallback((targetNodeId) => {
        const texts = [];
        const incoming = connectionsByNode.to.get(targetNodeId) || [];
        incoming.forEach((connection) => {
            const sourceNode = nodesMap.get(connection.from);
            if (sourceNode?.type === 'text-node') {
                const text = sourceNode.settings?.text || '';
                if (text) texts.push(text);
            }
        });
        return texts;
    }, [connectionsByNode, nodesMap]);

    const getConnectedGenNodes = useCallback((sourceNodeId) => {
        const outgoing = connectionsByNode.from.get(sourceNodeId) || [];
        return outgoing
            .map((connection) => nodesMap.get(connection.to))
            .filter((node) => node && isStandardGenerationNodeType(node.type));
    }, [connectionsByNode, nodesMap]);

    const getAdjacentNodes = useCallback((nodeId) => {
        const adjacent = new Set();
        const fromConnections = connectionsByNode.from.get(nodeId) || [];
        const toConnections = connectionsByNode.to.get(nodeId) || [];
        fromConnections.forEach((connection) => adjacent.add(connection.to));
        toConnections.forEach((connection) => adjacent.add(connection.from));
        return adjacent;
    }, [connectionsByNode]);

    const adjacentNodesCache = useMemo(() => {
        const cache = new Map();
        if (!selectedNodeId && selectedNodeIds.size === 0) return cache;

        const selectedId = selectedNodeId || (selectedNodeIds.size === 1 ? Array.from(selectedNodeIds)[0] : null);
        if (selectedId) {
            cache.set(selectedId, getAdjacentNodes(selectedId));
        }
        return cache;
    }, [selectedNodeId, selectedNodeIds, getAdjacentNodes]);

    return {
        adjacentNodesCache,
        connectionsByNode,
        getConnectedGenNodes,
        getConnectedTextNodes,
        getConnectedVideoAnalyzeNode,
        nodeConnectedStatus,
    };
};
