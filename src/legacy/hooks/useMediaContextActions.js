import { useCallback } from 'react';
import { createMediaChatFile } from '../services/chatService.js';
import { isImageInputNodeType } from '../nodes/nodeCatalog.js';

const withVideoDisplayHint = (url, type, isVideoUrl) => {
    if (type !== 'video' || isVideoUrl(url)) return url;
    return `${url}${url.includes('?') ? '&' : '?'}force_video_display=true`;
};

export const useMediaContextActions = ({
    addNode,
    getImageDimensions,
    historyContextMenu,
    inputImageContextMenu,
    isVideoUrl,
    nodesMap,
    previewContextMenu,
    screenToWorld,
    selectedNodeId,
    setChatFiles,
    setHistoryContextMenu,
    setInputImageContextMenu,
    setIsChatOpen,
    setNodes,
    setPreviewContextMenu,
}) => {
    const closePreviewContextMenu = useCallback(() => {
        setPreviewContextMenu({ visible: false, x: 0, y: 0, item: null });
    }, [setPreviewContextMenu]);

    const closeInputImageContextMenu = useCallback(() => {
        setInputImageContextMenu({ visible: false, x: 0, y: 0, nodeId: null });
    }, [setInputImageContextMenu]);

    const applyHistoryToSelectedNode = useCallback(() => {
        const item = historyContextMenu.item;
        const targetNode = nodesMap.get(selectedNodeId);

        if (item && targetNode && isImageInputNodeType(targetNode.type) && (item.url || item.originalUrl)) {
            setNodes((prev) => prev.map((node) => (
                node.id === selectedNodeId ? { ...node, content: item.url || item.originalUrl } : node
            )));
        } else {
            alert('请先选择一个"图片输入"节点');
        }
        setHistoryContextMenu({ visible: false, x: 0, y: 0, item: null });
    }, [historyContextMenu, nodesMap, selectedNodeId, setHistoryContextMenu, setNodes]);

    const sendHistoryToCanvas = useCallback(async () => {
        const item = historyContextMenu.item;
        if (!item?.url && !item?.originalUrl) return;

        const world = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
        const content = withVideoDisplayHint(item.url || item.originalUrl, item.type, isVideoUrl);

        let dimensions;
        if (item.type === 'image') {
            try {
                const realDimensions = await getImageDimensions(content);
                if (realDimensions?.w && realDimensions?.h) {
                    dimensions = { w: realDimensions.w, h: realDimensions.h };
                }
            } catch (error) {
                console.error('SendHistoryToCanvas getImageDimensions error', error);
            }
        }

        addNode('input-image', world.x + 50, world.y + 50, null, content, dimensions);
        setHistoryContextMenu({ visible: false, x: 0, y: 0, item: null });
    }, [addNode, getImageDimensions, historyContextMenu, isVideoUrl, screenToWorld, setHistoryContextMenu]);

    const sendHistoryToChat = useCallback(() => {
        const item = historyContextMenu.item;
        if (!item?.url) return;

        const isImage = item.type === 'image';
        const isVideo = item.type === 'video';
        const newFile = createMediaChatFile({
            baseName: 'Generated',
            id: item.id,
            content: item.url,
            isImage,
            isVideo,
            fromHistory: true,
        });

        setChatFiles((prev) => [...prev, newFile]);
        setIsChatOpen(true);
        setHistoryContextMenu({ visible: false, x: 0, y: 0, item: null });
    }, [historyContextMenu, setChatFiles, setHistoryContextMenu, setIsChatOpen]);

    const handlePreviewRightClick = useCallback((event, item) => {
        if (!item?.url) return;
        event.preventDefault();
        event.stopPropagation();
        setPreviewContextMenu({ visible: true, x: event.clientX, y: event.clientY, item });
    }, [setPreviewContextMenu]);

    const sendPreviewToChat = useCallback(() => {
        const item = previewContextMenu.item;
        if (!item?.url) return;

        const isImage = item.type !== 'video';
        const isVideo = item.type === 'video';
        const newFile = createMediaChatFile({
            baseName: 'Preview',
            content: item.url,
            isImage,
            isVideo,
        });
        setChatFiles((prev) => [...prev, newFile]);
        setIsChatOpen(true);
        closePreviewContextMenu();
    }, [closePreviewContextMenu, previewContextMenu, setChatFiles, setIsChatOpen]);

    const sendPreviewToCanvas = useCallback(async () => {
        const item = previewContextMenu.item;
        if (!item?.url) return;

        const world = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
        let dimensions = { w: 512, h: 512 };
        try {
            dimensions = await getImageDimensions(item.url);
        } catch (error) {
            console.warn('Preview dims fail', error);
        }

        addNode('input-image', world.x + 50, world.y + 50, null, item.url, dimensions);
        closePreviewContextMenu();
    }, [addNode, closePreviewContextMenu, getImageDimensions, previewContextMenu, screenToWorld]);

    const handleInputImageRightClick = useCallback((event, nodeId) => {
        event.preventDefault();
        event.stopPropagation();
        const node = nodesMap.get(nodeId);
        if (!node?.content) return;
        setInputImageContextMenu({ visible: true, x: event.clientX, y: event.clientY, nodeId });
    }, [nodesMap, setInputImageContextMenu]);

    const sendInputImageToChat = useCallback(() => {
        const node = nodesMap.get(inputImageContextMenu.nodeId);
        if (!node?.content) return;

        const isImage = !isVideoUrl(node.content);
        const isVideo = isVideoUrl(node.content);
        const newFile = createMediaChatFile({
            baseName: 'InputImage',
            content: node.content,
            isImage,
            isVideo,
        });
        setChatFiles((prev) => [...prev, newFile]);
        setIsChatOpen(true);
        closeInputImageContextMenu();
    }, [closeInputImageContextMenu, inputImageContextMenu, isVideoUrl, nodesMap, setChatFiles, setIsChatOpen]);

    return {
        applyHistoryToSelectedNode,
        closeInputImageContextMenu,
        closePreviewContextMenu,
        handleInputImageRightClick,
        handlePreviewRightClick,
        sendHistoryToCanvas,
        sendHistoryToChat,
        sendInputImageToChat,
        sendPreviewToCanvas,
        sendPreviewToChat,
    };
};
