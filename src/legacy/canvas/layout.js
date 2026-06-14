export const arrangeNodesByGraphLayers = ({
    nodesToArrange,
    connections,
    hSpacing = 150,
    vSpacing = 40,
    maxDepth = 20,
} = {}) => {
    if (!nodesToArrange || nodesToArrange.length === 0) return new Map();

    const targetNodeIds = new Set(nodesToArrange.map((node) => node.id));
    const graph = {};

    nodesToArrange.forEach((node) => {
        graph[node.id] = {
            id: node.id,
            node,
            parents: [],
            children: [],
            level: 0,
            barycenter: 0,
        };
    });

    connections.forEach((connection) => {
        if (!targetNodeIds.has(connection.from) || !targetNodeIds.has(connection.to)) return;
        graph[connection.from].children.push(connection.to);
        graph[connection.to].parents.push(connection.from);
    });

    let roots = Object.values(graph).filter((node) => node.parents.length === 0);
    if (roots.length === 0 && nodesToArrange.length > 0) {
        roots = [Object.values(graph)[0]];
    }

    const queue = roots.map((root) => ({ node: root, level: 0 }));
    while (queue.length > 0) {
        const { node, level } = queue.shift();
        if (level < node.level) continue;
        node.level = level;
        node.children.forEach((childId) => {
            const childNode = graph[childId];
            if (childNode && level < maxDepth) {
                queue.push({ node: childNode, level: level + 1 });
            }
        });
    }

    const maxLevel = Math.max(...Object.values(graph).map((node) => node.level));
    const layers = Array.from({ length: maxLevel + 1 }, () => []);
    Object.values(graph).forEach((node) => {
        layers[node.level].push(node);
    });

    layers.forEach((layer) => {
        layer.sort((a, b) => a.node.y - b.node.y);
    });

    for (let i = 0; i < 3; i++) {
        for (let level = 1; level < layers.length; level++) {
            const layer = layers[level];
            layer.forEach((node) => {
                if (node.parents.length > 0) {
                    const sumRank = node.parents.reduce((sum, parentId) => {
                        const parentNode = graph[parentId];
                        const parentLayerIndex = layers[level - 1].indexOf(parentNode);
                        return parentLayerIndex !== -1 ? sum + parentLayerIndex : sum;
                    }, 0);
                    node.barycenter = sumRank / node.parents.length;
                } else {
                    node.barycenter = layer.indexOf(node);
                }
            });
            layer.sort((a, b) => (a.barycenter || 0) - (b.barycenter || 0));
        }

        for (let level = layers.length - 2; level >= 0; level--) {
            const layer = layers[level];
            layer.forEach((node) => {
                if (node.children.length > 0) {
                    const sumRank = node.children.reduce((sum, childId) => {
                        const childNode = graph[childId];
                        const childLayerIndex = layers[level + 1].indexOf(childNode);
                        return childLayerIndex !== -1 ? sum + childLayerIndex : sum;
                    }, 0);
                    node.barycenter = sumRank / node.children.length;
                } else {
                    node.barycenter = layer.indexOf(node);
                }
            });
            layer.sort((a, b) => (a.barycenter || 0) - (b.barycenter || 0));
        }
    }

    const startX = Math.min(...nodesToArrange.map((node) => node.x));
    const startY = Math.min(...nodesToArrange.map((node) => node.y));
    const updatedNodesMap = new Map();
    let currentX = startX;

    layers.forEach((layer) => {
        if (layer.length === 0) return;

        const maxWidth = Math.max(...layer.map((graphNode) => graphNode.node.width || 260));
        let currentY = startY;

        layer.forEach((graphNode) => {
            updatedNodesMap.set(graphNode.id, {
                ...graphNode.node,
                x: currentX,
                y: currentY,
            });
            currentY += (graphNode.node.height || 200) + vSpacing;
        });

        currentX += maxWidth + hSpacing;
    });

    return updatedNodesMap;
};
