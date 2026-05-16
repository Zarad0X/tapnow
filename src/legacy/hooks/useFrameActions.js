import { useCallback } from 'react';
import {
    isImageInputNodeType,
    isPreviewNodeType,
} from '../nodes/nodeCatalog.js';

const frameKey = (frame) => `${frame.time}-${frame.url}`;

export const useFrameActions = ({
    addNode,
    frameContextMenu,
    frameSelectionRef,
    getImageDimensions,
    nodesMap,
    screenToWorld,
    selectedNodeId,
    selectedNodeIdRef,
    selectedNodeIdsRef,
    setChatFiles,
    setFrameContextMenu,
    setIsChatOpen,
    setNodes,
}) => {
    const closeFrameContextMenu = useCallback(() => {
        setFrameContextMenu({ visible: false, x: 0, y: 0, nodeId: null, frame: null });
    }, [setFrameContextMenu]);

    const handleToggleKeyframe = useCallback((nodeId, frame, index = 0, event = null) => {
        const shiftKey = !!event?.shiftKey;
        setNodes((prev) => prev.map((node) => {
            if (node.id !== nodeId) return node;
            const frames = node.frames || [];
            const frameMap = new Map(frames.map((item) => [frameKey(item), item]));
            const currentSelected = node.selectedKeyframes || [];
            let nextSelected = [...currentSelected];

            if (shiftKey && frameSelectionRef.current[nodeId] !== undefined && frameSelectionRef.current[nodeId] !== null && frames.length > 0) {
                const lastIndex = frameSelectionRef.current[nodeId];
                const start = Math.min(lastIndex, index);
                const end = Math.max(lastIndex, index);
                const rangeFrames = frames.slice(start, end + 1);
                const selectedKeys = new Set(nextSelected.map(frameKey));
                rangeFrames.forEach((item) => selectedKeys.add(frameKey(item)));
                nextSelected = Array.from(selectedKeys).map((key) => frameMap.get(key)).filter(Boolean);
            } else {
                const exists = nextSelected.some((item) => frameKey(item) === frameKey(frame));
                nextSelected = exists
                    ? nextSelected.filter((item) => frameKey(item) !== frameKey(frame))
                    : [...nextSelected, frame];
            }

            frameSelectionRef.current[nodeId] = index;
            return { ...node, selectedKeyframes: nextSelected };
        }));
    }, [frameSelectionRef, setNodes]);

    const openFrameContextMenu = useCallback((event, nodeId, frame) => {
        event.preventDefault();
        event.stopPropagation();
        setFrameContextMenu({ visible: true, x: event.clientX, y: event.clientY, nodeId, frame });
    }, [setFrameContextMenu]);

    const sendFrameToChat = useCallback(() => {
        const { frame } = frameContextMenu;
        if (!frame?.url) return;

        setChatFiles((prev) => [...prev, {
            name: `Frame-${(frame.time ?? 0).toFixed(2)}s.png`,
            type: 'image/png',
            content: frame.url,
            isImage: true,
            isVideo: false,
            isAudio: false,
            fromHistory: true,
            fileExt: 'png',
        }]);
        setIsChatOpen(true);
        closeFrameContextMenu();
    }, [closeFrameContextMenu, frameContextMenu, setChatFiles, setIsChatOpen]);

    const sendFrameToCanvas = useCallback(async () => {
        const { frame } = frameContextMenu;
        if (!frame?.url) return;

        const world = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
        let dimensions;
        try {
            const realDimensions = await getImageDimensions(frame.url);
            if (realDimensions?.w && realDimensions?.h) {
                dimensions = { w: realDimensions.w, h: realDimensions.h };
            }
        } catch (error) {}

        addNode('input-image', world.x + 50, world.y + 50, null, frame.url, dimensions);
        closeFrameContextMenu();
    }, [addNode, closeFrameContextMenu, frameContextMenu, getImageDimensions, screenToWorld]);

    const sendFrameToPreview = useCallback(() => {
        const { frame } = frameContextMenu;
        if (!frame?.url) return;

        setNodes((prev) => {
            const selectedId = selectedNodeIdRef.current;
            const selectedIds = selectedNodeIdsRef.current;
            const previews = prev.filter((node) => isPreviewNodeType(node.type));
            if (!previews.length) return prev;

            let targetId = null;
            if (selectedId) {
                const selectedPreview = previews.find((preview) => preview.id === selectedId);
                if (selectedPreview) targetId = selectedPreview.id;
            }
            if (!targetId && selectedIds && selectedIds.size > 0) {
                const selectedPreview = previews.find((preview) => selectedIds.has(preview.id));
                if (selectedPreview) targetId = selectedPreview.id;
            }
            if (!targetId) {
                targetId = previews[previews.length - 1].id;
            }

            return prev.map((node) => (
                node.id === targetId
                    ? { ...node, content: frame.url, previewType: 'image' }
                    : node
            ));
        });
        closeFrameContextMenu();
    }, [closeFrameContextMenu, frameContextMenu, selectedNodeIdRef, selectedNodeIdsRef, setNodes]);

    const applyFrameToSelectedNode = useCallback(() => {
        const { frame } = frameContextMenu;
        if (!frame?.url) return;

        const targetNode = nodesMap.get(selectedNodeId);
        if (targetNode && isImageInputNodeType(targetNode.type)) {
            setNodes((prev) => prev.map((node) => (
                node.id === selectedNodeId ? { ...node, content: frame.url } : node
            )));
        } else {
            alert('请先选择一个"图片输入"节点');
        }
        closeFrameContextMenu();
    }, [closeFrameContextMenu, frameContextMenu, nodesMap, selectedNodeId, setNodes]);

    return {
        applyFrameToSelectedNode,
        closeFrameContextMenu,
        handleToggleKeyframe,
        openFrameContextMenu,
        sendFrameToCanvas,
        sendFrameToChat,
        sendFrameToPreview,
    };
};
