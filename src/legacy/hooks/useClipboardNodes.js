import { useEffect, useRef } from 'react';

const isEditableTarget = (target) => {
    return target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;
};

const getSelectedNodeIds = ({ selectedNodeIdRef, selectedNodeIdsRef }) => {
    const currentSelectedId = selectedNodeIdRef.current;
    const currentSelectedIds = selectedNodeIdsRef.current;
    return currentSelectedId
        ? [currentSelectedId]
        : (currentSelectedIds && currentSelectedIds.size > 0 ? Array.from(currentSelectedIds) : []);
};

const getCanvasCenterWorldPoint = ({ canvasRef, view }) => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return { x: 0, y: 0 };

    const rect = canvasElement.getBoundingClientRect();
    return {
        x: (rect.left + rect.width / 2 - view.x) / view.zoom,
        y: (rect.top + rect.height / 2 - view.y) / view.zoom,
    };
};

const cloneCopiedNodesAtCenter = ({ copied, pastePoint }) => {
    const originalNodes = copied.nodes || [];
    if (originalNodes.length === 0) return { nodes: [], connections: [] };

    const minX = Math.min(...originalNodes.map((node) => node.x || 0));
    const minY = Math.min(...originalNodes.map((node) => node.y || 0));
    const maxX = Math.max(...originalNodes.map((node) => (node.x || 0) + (node.width || 0)));
    const maxY = Math.max(...originalNodes.map((node) => (node.y || 0) + (node.height || 0)));
    const originalCenterX = (minX + maxX) / 2;
    const originalCenterY = (minY + maxY) / 2;
    const offsetX = pastePoint.x - originalCenterX;
    const offsetY = pastePoint.y - originalCenterY;
    const idMap = new Map();
    const baseTime = Date.now();

    originalNodes.forEach((node, index) => {
        const newId = `node-${baseTime}-${index}-${Math.random().toString(36).substr(2, 9)}`;
        idMap.set(node.id, newId);
    });

    const nodes = originalNodes.map((node) => ({
        ...node,
        id: idMap.get(node.id),
        x: node.x + offsetX,
        y: node.y + offsetY,
    }));

    const connections = (copied.connections || [])
        .filter((connection) => connection && idMap.has(connection.from) && idMap.has(connection.to))
        .map((connection, index) => ({
            ...connection,
            id: `conn-${baseTime}-${index}-${Math.random().toString(36).substr(2, 9)}`,
            from: idMap.get(connection.from),
            to: idMap.get(connection.to),
        }));

    return { nodes, connections };
};

export const useClipboardNodes = ({
    nodesRef,
    connectionsRef,
    selectedNodeIdRef,
    selectedNodeIdsRef,
    canvasRef,
    view,
    setNodes,
    setConnections,
    setSelectedNodeId,
    setSelectedNodeIds,
    getImageDimensions,
    handleVideoFileUpload,
}) => {
    const copiedNodesRef = useRef(null);

    useEffect(() => {
        const pasteCopiedNodes = () => {
            const copied = copiedNodesRef.current;
            if (!copied?.nodes?.length) return false;

            const pastePoint = getCanvasCenterWorldPoint({ canvasRef, view });
            const { nodes: newNodes, connections: newConnections } = cloneCopiedNodesAtCenter({ copied, pastePoint });
            if (newNodes.length === 0) return false;

            setNodes((prev) => [...prev, ...newNodes]);
            setConnections((prev) => [...prev, ...newConnections]);

            if (newNodes.length === 1) {
                setSelectedNodeId(newNodes[0].id);
                setSelectedNodeIds(new Set([newNodes[0].id]));
            } else {
                setSelectedNodeId(null);
                setSelectedNodeIds(new Set(newNodes.map((node) => node.id)));
            }

            console.log(`已粘贴 ${newNodes.length} 个节点`);
            return true;
        };

        const handleCopy = async (event) => {
            if (isEditableTarget(event.target)) {
                const selection = window.getSelection();
                if (selection && selection.toString().trim()) return;
                event.preventDefault();
                return;
            }

            const selectedIds = getSelectedNodeIds({ selectedNodeIdRef, selectedNodeIdsRef });
            if (selectedIds.length === 0) return;

            event.preventDefault();
            event.stopPropagation();

            const selectedNodes = nodesRef.current.filter((node) => selectedIds.includes(node.id));
            const internalConnections = connectionsRef.current.filter((connection) => (
                selectedIds.includes(connection.from) && selectedIds.includes(connection.to)
            ));

            copiedNodesRef.current = {
                nodes: selectedNodes.map((node) => ({ ...node })),
                connections: internalConnections.map((connection) => ({ ...connection })),
                timestamp: Date.now(),
            };

            console.log(`已复制 ${selectedNodes.length} 个节点`);
        };

        const handlePaste = async (event) => {
            if (isEditableTarget(event.target)) return;

            const currentSelectedId = selectedNodeIdRef.current;
            const targetNode = currentSelectedId
                ? nodesRef.current.find((node) => node.id === currentSelectedId)
                : null;

            if (targetNode && (targetNode.type === 'input-image' || targetNode.type === 'video-input')) {
                const items = Array.from(event.clipboardData?.items || []);
                const imageItem = items.find((item) => item.type.startsWith('image/'));
                const videoItem = items.find((item) => item.type.startsWith('video/'));

                if (imageItem && targetNode.type === 'input-image') {
                    event.preventDefault();
                    const file = imageItem.getAsFile();
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = async (readerEvent) => {
                            const content = readerEvent.target.result;
                            let dimensions = { w: 0, h: 0 };
                            try {
                                dimensions = await getImageDimensions(content);
                            } catch {}
                            setNodes((prev) => prev.map((node) => (
                                node.id === targetNode.id
                                    ? { ...node, content, dimensions }
                                    : node
                            )));
                        };
                        reader.readAsDataURL(file);
                    }
                    return;
                }

                if (videoItem && targetNode.type === 'video-input') {
                    event.preventDefault();
                    const file = videoItem.getAsFile();
                    if (file) {
                        handleVideoFileUpload(targetNode.id, file);
                    }
                    return;
                }
            }

            if (copiedNodesRef.current?.nodes?.length) {
                event.preventDefault();
                event.stopPropagation();
                pasteCopiedNodes();
            }
        };

        const handleKeyDown = (event) => {
            if (isEditableTarget(event.target)) return;
            if (!(event.ctrlKey || event.metaKey) || event.key !== 'v') return;

            const currentSelectedId = selectedNodeIdRef.current;
            if (currentSelectedId) {
                const targetNode = nodesRef.current.find((node) => node.id === currentSelectedId);
                if (targetNode && (targetNode.type === 'input-image' || targetNode.type === 'video-input')) {
                    return;
                }
            }

            if (copiedNodesRef.current?.nodes?.length) {
                event.preventDefault();
                event.stopPropagation();
                pasteCopiedNodes();
            }
        };

        window.addEventListener('copy', handleCopy);
        window.addEventListener('paste', handlePaste);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('copy', handleCopy);
            window.removeEventListener('paste', handlePaste);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [
        canvasRef,
        connectionsRef,
        getImageDimensions,
        handleVideoFileUpload,
        nodesRef,
        selectedNodeIdRef,
        selectedNodeIdsRef,
        setConnections,
        setNodes,
        setSelectedNodeId,
        setSelectedNodeIds,
        view,
    ]);
};
