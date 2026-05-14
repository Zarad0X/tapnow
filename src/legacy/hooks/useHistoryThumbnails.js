import { useEffect } from 'react';
import { createImageThumbnailDataUrl } from '../utils/mediaProcessing.js';

const HISTORY_THUMBNAIL_BATCH_SIZE = 5;

export const useHistoryThumbnails = ({ history, setHistory, historyPerformanceMode }) => {
    useEffect(() => {
        if (historyPerformanceMode === 'off') return undefined;

        const generateThumbnailsForHistory = async () => {
            const config = historyPerformanceMode === 'ultra'
                ? { maxSize: 80, jpegQuality: 0.3 }
                : { maxSize: 150, jpegQuality: 0.6 };

            const itemsNeedThumbnail = history.filter((item) => (
                item.status === 'completed' &&
                item.type === 'image' &&
                (item.url || item.originalUrl) &&
                !item.thumbnailUrl
            ));

            for (let index = 0; index < Math.min(itemsNeedThumbnail.length, HISTORY_THUMBNAIL_BATCH_SIZE); index++) {
                const item = itemsNeedThumbnail[index];
                try {
                    const thumbnail = await createImageThumbnailDataUrl(item.url || item.originalUrl, config);
                    let mjThumbnails = null;

                    if (item.mjImages && item.mjImages.length > 0) {
                        mjThumbnails = await Promise.all(
                            item.mjImages.map((url) => createImageThumbnailDataUrl(url, config)),
                        );
                    }

                    if (thumbnail || mjThumbnails) {
                        setHistory((prev) => prev.map((historyItem) => (
                            historyItem.id === item.id
                                ? {
                                    ...historyItem,
                                    thumbnailUrl: thumbnail || historyItem.thumbnailUrl,
                                    mjThumbnails: mjThumbnails || historyItem.mjThumbnails,
                                }
                                : historyItem
                        )));
                    }
                } catch (error) {
                    console.warn('[缩略图] 生成失败:', error);
                }
            }
        };

        const timer = setTimeout(generateThumbnailsForHistory, 100);
        return () => clearTimeout(timer);
    }, [historyPerformanceMode, history.length]);
};
