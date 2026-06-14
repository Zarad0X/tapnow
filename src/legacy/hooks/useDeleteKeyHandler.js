import { useEffect } from 'react';

const isEditableTarget = (target) => {
    return target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;
};

export const useDeleteKeyHandler = ({
    selectedNodeIdRef,
    selectedNodeIdsRef,
    deleteNode,
    setSelectedNodeId,
    setSelectedNodeIds,
}) => {
    useEffect(() => {
        const handleDeleteKey = (event) => {
            if (isEditableTarget(event.target)) return;
            if (event.key !== 'Delete' && event.key !== 'Del') return;

            event.preventDefault();
            event.stopPropagation();

            const currentSelectedId = selectedNodeIdRef.current;
            const currentSelectedIds = selectedNodeIdsRef.current;

            if (currentSelectedId) {
                deleteNode(currentSelectedId);
                setSelectedNodeId(null);
                return;
            }

            if (currentSelectedIds && currentSelectedIds.size > 0) {
                currentSelectedIds.forEach((id) => deleteNode(id));
                setSelectedNodeIds(new Set());
            }
        };

        window.addEventListener('keydown', handleDeleteKey);
        return () => {
            window.removeEventListener('keydown', handleDeleteKey);
        };
    }, [deleteNode, selectedNodeIdRef, selectedNodeIdsRef, setSelectedNodeId, setSelectedNodeIds]);
};
