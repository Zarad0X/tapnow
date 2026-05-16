import { useCallback } from 'react';

export const useImageNodeDrop = ({ getImageDimensions, setNodes }) => {
    const updateImageNodeContent = useCallback(async (nodeId, content) => {
        let dimensions = { w: 0, h: 0 };
        try {
            dimensions = await getImageDimensions(content);
        } catch (error) {}

        setNodes((prev) => prev.map((node) => (
            node.id === nodeId ? { ...node, content, dimensions } : node
        )));
    }, [getImageDimensions, setNodes]);

    const handleFileUpload = useCallback((nodeId, event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (readerEvent) => {
            updateImageNodeContent(nodeId, readerEvent.target.result);
        };
        reader.readAsDataURL(file);
    }, [updateImageNodeContent]);

    const handleDrop = useCallback((nodeId, event) => {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.remove('drag-over');

        const imageFile = Array.from(event.dataTransfer.files).find((file) => file.type.startsWith('image/'));
        if (!imageFile) return;

        const reader = new FileReader();
        reader.onload = (readerEvent) => {
            updateImageNodeContent(nodeId, readerEvent.target.result);
        };
        reader.readAsDataURL(imageFile);
    }, [updateImageNodeContent]);

    const handleDragOver = useCallback((event) => {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.add('drag-over');
    }, []);

    const handleDragLeave = useCallback((event) => {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.remove('drag-over');
    }, []);

    return {
        handleFileUpload,
        handleDragLeave,
        handleDragOver,
        handleDrop,
    };
};
