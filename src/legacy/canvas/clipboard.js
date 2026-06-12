export const isEditableElement = (target) => {
    if (!target) return false;
    return target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;
};

export const getSelectedNodeIdsForClipboard = ({ selectedNodeId, selectedNodeIds }) => {
    if (selectedNodeId) return [selectedNodeId];
    if (selectedNodeIds && selectedNodeIds.size > 0) return Array.from(selectedNodeIds);
    return [];
};

export const createClipboardPayload = ({ nodes, connections, selectedIds, timestamp = Date.now() }) => {
    const selectedIdSet = new Set(selectedIds);
    const selectedNodes = nodes.filter((node) => selectedIdSet.has(node.id));
    const internalConnections = connections.filter((connection) =>
        selectedIdSet.has(connection.from) && selectedIdSet.has(connection.to)
    );

    return {
        nodes: selectedNodes.map((node) => ({ ...node })),
        connections: internalConnections.map((connection) => ({ ...connection })),
        timestamp,
    };
};

export const getCanvasCenterWorldPoint = ({ canvasElement, view }) => {
    if (!canvasElement) return { x: 0, y: 0 };
    const rect = canvasElement.getBoundingClientRect();
    return {
        x: (rect.left + rect.width / 2 - view.x) / view.zoom,
        y: (rect.top + rect.height / 2 - view.y) / view.zoom,
    };
};

const getNodeBoundsCenter = (nodes) => {
    const minX = Math.min(...nodes.map((node) => node.x || 0));
    const minY = Math.min(...nodes.map((node) => node.y || 0));
    const maxX = Math.max(...nodes.map((node) => (node.x || 0) + (node.width || 0)));
    const maxY = Math.max(...nodes.map((node) => (node.y || 0) + (node.height || 0)));

    return {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
    };
};

export const cloneClipboardPayloadAtPoint = ({
    payload,
    pastePoint,
    now = Date.now,
    random = Math.random,
}) => {
    const originalNodes = payload?.nodes || [];
    if (originalNodes.length === 0) {
        return { nodes: [], connections: [] };
    }

    const baseTime = now();
    const originalCenter = getNodeBoundsCenter(originalNodes);
    const offsetX = pastePoint.x - originalCenter.x;
    const offsetY = pastePoint.y - originalCenter.y;
    const idMap = new Map();

    originalNodes.forEach((node, index) => {
        const randomPart = random().toString(36).slice(2, 11);
        idMap.set(node.id, `node-${baseTime}-${index}-${randomPart}`);
    });

    const nodes = originalNodes.map((node) => ({
        ...node,
        id: idMap.get(node.id),
        x: (node.x || 0) + offsetX,
        y: (node.y || 0) + offsetY,
    }));

    const connections = (payload?.connections || [])
        .filter((connection) => connection && idMap.has(connection.from) && idMap.has(connection.to))
        .map((connection, index) => {
            const randomPart = random().toString(36).slice(2, 11);
            return {
                ...connection,
                id: `conn-${baseTime}-${index}-${randomPart}`,
                from: idMap.get(connection.from),
                to: idMap.get(connection.to),
            };
        });

    return { nodes, connections };
};
