import { useCallback } from 'react';
import { arrangeNodesByDag } from '../services/autoArrangeService.js';

export const useAutoArrangeNodes = ({
    connectionsRef,
    nodesRef,
    selectedNodeIdRef,
    selectedNodeIdsRef,
    setNodes,
}) => {
    const autoArrangeNodes = useCallback(() => {
        const currentSelectedId = selectedNodeIdRef.current;
        const currentSelectedIds = selectedNodeIdsRef.current;

        let nodesToArrange = [];
        if (currentSelectedId) {
            const node = nodesRef.current.find((item) => item.id === currentSelectedId);
            if (node) nodesToArrange = [node];
        } else if (currentSelectedIds && currentSelectedIds.size > 0) {
            nodesToArrange = nodesRef.current.filter((node) => currentSelectedIds.has(node.id));
        }

        if (nodesToArrange.length < 2) {
            alert('请至少选中两个节点进行智能整理');
            return;
        }

        const updatedNodesMap = arrangeNodesByDag({
            connections: connectionsRef.current,
            nodesToArrange,
        });

        setNodes((prev) => prev.map((node) => (
            updatedNodesMap.has(node.id) ? updatedNodesMap.get(node.id) : node
        )));
    }, [connectionsRef, nodesRef, selectedNodeIdRef, selectedNodeIdsRef, setNodes]);

    return {
        autoArrangeNodes,
    };
};
