import { useCallback } from 'react';
import { extractKeyFrames, getVideoMetadata } from '../utils/mediaUtils.js';
import { detectScenesAndCapture } from '../services/videoFrameService.js';

export const useVideoInputActions = ({
    nodesMap,
    setNodes,
}) => {
    const handleVideoFileUpload = useCallback((nodeId, file) => {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target.result;
            let videoMeta = { duration: 0, w: 0, h: 0 };
            try {
                videoMeta = await getVideoMetadata(content);
            } catch (error) {
                console.warn('读取视频元信息失败', error);
            }

            setNodes((prev) => prev.map((node) => (
                node.id === nodeId
                    ? {
                        ...node,
                        content,
                        videoMeta,
                        frames: [],
                        selectedKeyframes: [],
                        extractingFrames: false,
                        videoFileName: file.name,
                    }
                    : node
            )));
        };
        reader.readAsDataURL(file);
    }, [setNodes]);

    const handleVideoDrop = useCallback((nodeId, event) => {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.remove('drag-over');

        const files = Array.from(event.dataTransfer.files);
        const videoFile = files.find((file) => file.type.startsWith('video/'));
        if (videoFile) {
            handleVideoFileUpload(nodeId, videoFile);
        }
    }, [handleVideoFileUpload]);

    const handleAutoExtractKeyframes = useCallback(async (nodeId, fps = 2) => {
        const node = nodesMap.get(nodeId);
        if (!node?.content) return;

        setNodes((prev) => prev.map((item) => (item.id === nodeId ? { ...item, extractingFrames: true } : item)));
        try {
            const frames = await extractKeyFrames(node.content, { fps });
            setNodes((prev) => prev.map((item) => (
                item.id === nodeId ? { ...item, frames, selectedKeyframes: [], extractingFrames: false } : item
            )));
        } catch (error) {
            console.error('视频抽帧失败', error);
            setNodes((prev) => prev.map((item) => (item.id === nodeId ? { ...item, extractingFrames: false } : item)));
        }
    }, [nodesMap, setNodes]);

    const handleSmartExtractKeyframes = useCallback(async (nodeId, threshold = 30) => {
        const node = nodesMap.get(nodeId);
        if (!node?.content) return;

        setNodes((prev) => prev.map((item) => (item.id === nodeId ? { ...item, extractingFrames: true } : item)));
        try {
            const frames = await detectScenesAndCapture(node.content, threshold);
            setNodes((prev) => prev.map((item) => (
                item.id === nodeId ? { ...item, frames, selectedKeyframes: [], extractingFrames: false } : item
            )));
        } catch (error) {
            console.error('智能抽帧失败', error);
            alert(`智能抽帧失败: ${error.message}`);
            setNodes((prev) => prev.map((item) => (item.id === nodeId ? { ...item, extractingFrames: false } : item)));
        }
    }, [nodesMap, setNodes]);

    return {
        handleAutoExtractKeyframes,
        handleSmartExtractKeyframes,
        handleVideoDrop,
        handleVideoFileUpload,
    };
};
