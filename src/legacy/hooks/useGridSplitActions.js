import { useCallback } from 'react';
import {
    createGridImageNodes,
    splitGridImage,
} from '../services/gridSplitService.js';

export const useGridSplitActions = ({
    screenToWorld,
    selectedNodeIdsRef,
    setNodes,
}) => {
    const handleSplitGridFromUrl = useCallback(async (imageUrl, options = {}) => {
        if (!imageUrl) return;

        const {
            originX,
            originY,
            cols = 3,
            spacing = 20,
            nodeWidth = 260,
            nodeHeight = 260,
            replaceSelected = false,
        } = options;

        try {
            const croppedImages = await splitGridImage(imageUrl);
            if (croppedImages.length !== 9) {
                alert('切割失败：未能生成9张图片');
                return;
            }

            const currentSelectedIds = selectedNodeIdsRef.current;
            if (replaceSelected && currentSelectedIds && currentSelectedIds.size === 9) {
                const selectedIdsArray = Array.from(currentSelectedIds);
                setNodes((prev) => prev.map((node) => {
                    const index = selectedIdsArray.indexOf(node.id);
                    if (index === -1 || index >= croppedImages.length) return node;

                    return {
                        ...node,
                        content: croppedImages[index].url,
                        dimensions: {
                            w: croppedImages[index].width,
                            h: croppedImages[index].height,
                        },
                    };
                }));
                return;
            }

            const world = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
            const startX = originX !== undefined ? originX : world.x;
            const startY = originY !== undefined ? originY : world.y;
            const newNodes = createGridImageNodes(croppedImages, {
                startX,
                startY,
                cols,
                spacing,
                nodeWidth,
                nodeHeight,
            });
            setNodes((prev) => [...prev, ...newNodes]);
        } catch (error) {
            alert(`切割失败: ${error.message}`);
        }
    }, [screenToWorld, selectedNodeIdsRef, setNodes]);

    return {
        handleSplitGridFromUrl,
    };
};
