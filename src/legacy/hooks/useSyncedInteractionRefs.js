import { useEffect } from 'react';

export const useSyncedInteractionRefs = ({
    nodesRef,
    nodes,
    selectedNodeIdRef,
    selectedNodeId,
    selectedNodeIdsRef,
    selectedNodeIds,
    connectionsRef,
    connections,
    isSelectingRef,
    isSelecting,
}) => {
    useEffect(() => {
        nodesRef.current = nodes;
        selectedNodeIdRef.current = selectedNodeId;
        selectedNodeIdsRef.current = selectedNodeIds;
        connectionsRef.current = connections;
        isSelectingRef.current = isSelecting;
    }, [
        nodesRef,
        nodes,
        selectedNodeIdRef,
        selectedNodeId,
        selectedNodeIdsRef,
        selectedNodeIds,
        connectionsRef,
        connections,
        isSelectingRef,
        isSelecting,
    ]);
};
