import { useEffect, useRef } from 'react';
import { splitMidjourneyImage } from '../services/gridSplitService.js';

const getMidjourneyRatio = (item) => {
    let ratio = item.mjRatio || '1:1';
    if (item.prompt && item.prompt.includes('--ar ')) {
        const arMatch = item.prompt.match(/--ar\s+([\d:]+)/);
        if (arMatch && arMatch[1]) {
            ratio = arMatch[1];
        }
    }
    return ratio;
};

export const useMidjourneyAutoSplit = ({ history, setHistory }) => {
    const splittingRef = useRef(new Set());

    useEffect(() => {
        history.forEach((item) => {
            if (!(item.mjNeedsSplit && item.mjOriginalUrl && item.apiConfig?.modelId?.includes('mj') && item.status === 'completed')) {
                return;
            }

            if (splittingRef.current.has(item.id)) {
                return;
            }
            splittingRef.current.add(item.id);

            setTimeout(() => {
                const ratio = getMidjourneyRatio(item);
                console.log(`Midjourney: 开始重新切割图片，任务ID: ${item.id}, 比例: ${ratio}`);

                splitMidjourneyImage(item.mjOriginalUrl, ratio)
                    .then((splitImages) => {
                        const imageUrls = splitImages.map((image) => (typeof image === 'string' ? image : image.url));
                        const firstImage = splitImages[0];
                        const firstUrl = typeof firstImage === 'string' ? firstImage : firstImage.url;

                        setHistory((prev) => prev.map((historyItem) => (
                            historyItem.id === item.id
                                ? {
                                    ...historyItem,
                                    mjImages: imageUrls,
                                    url: firstUrl,
                                    selectedMjImageIndex: 0,
                                    mjRatio: ratio,
                                    mjNeedsSplit: false,
                                    mjImageInfo: splitImages.map((image) => (
                                        typeof image === 'string'
                                            ? null
                                            : { width: image.width, height: image.height, ratio: image.ratio }
                                    )),
                                }
                                : historyItem
                        )));

                        splittingRef.current.delete(item.id);
                        console.log(`Midjourney: 重新切割完成，任务ID: ${item.id}`);
                    })
                    .catch((error) => {
                        console.error('Midjourney: 重新切割图片失败:', error);
                        splittingRef.current.delete(item.id);
                        setHistory((prev) => prev.map((historyItem) => (
                            historyItem.id === item.id
                                ? { ...historyItem, mjNeedsSplit: true }
                                : historyItem
                        )));
                    });
            }, 500);
        });
    }, [history, setHistory]);
};
