import { useCallback } from 'react';

export const useImageNodeDrop = ({ getImageDimensions, setNodes }) => {
    const handleDrop = useCallback((nodeId, event) => {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.remove('drag-over');

        const imageFile = Array.from(event.dataTransfer.files).find((file) => file.type.startsWith('image/'));
        if (!imageFile) return;

        const reader = new FileReader();
        reader.onload = async (readerEvent) => {
            const content = readerEvent.target.result;
            let dimensions = { w: 0, h: 0 };
            try {
                dimensions = await getImageDimensions(content);
            } catch (error) {}
            setNodes((prev) => prev.map((node) => (
                node.id === nodeId ? { ...node, content, dimensions } : node
            )));
        };
        reader.readAsDataURL(imageFile);
    }, [getImageDimensions, setNodes]);

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
        handleDragLeave,
        handleDragOver,
        handleDrop,
    };
};
