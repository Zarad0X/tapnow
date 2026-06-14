import {
    isPreviewNodeType,
    isStandardGenerationNodeType,
} from '../nodes/nodeCatalog.js';

export const getGenerationResultUrl = ({ url, mjImages }) => {
    return url || (mjImages?.length > 0 ? mjImages[0] : null);
};

export const resolveTaskSourceNodeId = ({ taskId, sourceNodeIdOverride, historyMap }) => {
    if (sourceNodeIdOverride) return sourceNodeIdOverride;
    return historyMap.get(taskId)?.sourceNodeId || null;
};

export const findGeneratingStoryboardShotForSource = ({ sourceNodeId, nodesMap, connections }) => {
    const sourceNode = nodesMap.get(sourceNodeId);
    if (!sourceNode || !isStandardGenerationNodeType(sourceNode.type)) return null;

    const storyboardConnections = connections.filter((connection) => connection.to === sourceNodeId);
    for (const connection of storyboardConnections) {
        const fromNode = nodesMap.get(connection.from);
        const storyboardNode = fromNode?.type === 'storyboard-node' ? fromNode : null;
        const generatingShot = storyboardNode?.settings?.shots?.find((shot) => shot.status === 'generating');
        if (storyboardNode && generatingShot) {
            return { nodeId: storyboardNode.id, shotId: generatingShot.id };
        }
    }

    return null;
};

export const getConnectionsFromSource = ({ connections, sourceNodeId }) => {
    return connections.filter((connection) => connection.from === sourceNodeId);
};

export const getConnectedPreviewTargets = ({ nodes, connections, sourceNodeId }) => {
    const connectionsFromSource = getConnectionsFromSource({ connections, sourceNodeId });
    const targetIds = connectionsFromSource.map((connection) => connection.to);
    const previewNodes = nodes.filter((node) => targetIds.includes(node.id) && isPreviewNodeType(node.type));

    return { connectionsFromSource, targetIds, previewNodes };
};

export const updateConnectedPreviewNodes = ({ nodes, targetIds, url, contentType, mjImages }) => {
    const content = getGenerationResultUrl({ url, mjImages }) || url;
    return nodes.map((node) => (
        targetIds.includes(node.id) && isPreviewNodeType(node.type)
            ? { ...node, content, previewType: contentType, previewMjImages: mjImages }
            : node
    ));
};
