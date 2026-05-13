export const getHistoryDisplayUrl = (item) => {
    if (!item) return '';
    if (item.localCacheUrl || item.url || item.originalUrl || item.mjOriginalUrl) {
        return item.localCacheUrl || item.url || item.originalUrl || item.mjOriginalUrl;
    }
    if (item.mjImages && item.mjImages.length > 0) {
        const index = item.selectedMjImageIndex !== undefined ? item.selectedMjImageIndex : 0;
        return item.mjImages[index] || item.mjImages[0] || '';
    }
    return '';
};

export const getCompletedVideoHistory = (history) => {
    return history.filter((item) => item.type === 'video' && item.status === 'completed' && item.url);
};

export const getHistoryLightboxItem = (item) => {
    const displayUrl = getHistoryDisplayUrl(item);
    if (!displayUrl) return null;

    const currentIndex = item.mjImages && item.mjImages.length > 1
        ? (item.selectedMjImageIndex !== undefined ? item.selectedMjImageIndex : 0)
        : 0;

    return {
        ...item,
        url: item.mjImages && item.mjImages.length > 1
            ? item.mjImages[currentIndex]
            : displayUrl,
        selectedMjImageIndex: currentIndex,
    };
};

export const getHistoryImageLightboxItem = (item, imageUrl, index) => {
    return {
        ...item,
        url: imageUrl,
        selectedMjImageIndex: index,
    };
};

export const getSelectedHistoryItems = (history, selectedIds) => {
    return history.filter((item) => selectedIds.has(item.id));
};

export const getLocalHistoryFiles = (items) => {
    return items
        .filter((item) => item.localCacheUrl || item.localFilePath)
        .map((item) => ({ url: item.localCacheUrl, path: item.localFilePath }));
};

export const splitHistoryCacheItems = (items) => {
    return {
        remote: items.filter((item) => item.url && !item.url.startsWith('http://127.0.0.1:9527')),
        local: items.filter((item) => item.localCacheUrl || item.localFilePath),
    };
};

export const getCanvasSendableHistoryItems = (history, selectedIds) => {
    return history.filter((item) => selectedIds.has(item.id) && (item.url || item.originalUrl || item.localCacheUrl));
};

export const getHistoryCanvasContentUrl = (item, { isVideoUrl }) => {
    let content = item.url || item.originalUrl || item.localCacheUrl;
    if (item.type === 'video' && content && !isVideoUrl(content)) {
        content += (content.includes('?') ? '&' : '?') + 'force_video_display=true';
    }
    return content;
};

export const getBatchHistoryCardDisplay = (item) => {
    const hasFourImages = item.mjImages && item.mjImages.length === 4;

    const getLocalUrl = (url) => {
        if (item.localCacheUrl) return item.localCacheUrl;
        if (!url) return url;
        if (item.mjLocalUrls && item.mjImages) {
            const index = item.mjImages.indexOf(url);
            if (index !== -1 && item.mjLocalUrls[index]) return item.mjLocalUrls[index];
        }
        return url;
    };

    const displayUrl = hasFourImages
        ? null
        : item.mjImages && item.mjImages.length > 1
            ? getLocalUrl(item.mjImages[item.selectedMjImageIndex || 0] || item.mjImages[0])
            : (item.localCacheUrl || item.url || item.originalUrl);

    return { hasFourImages, displayUrl, getLocalUrl };
};
