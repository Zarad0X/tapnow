import { useEffect, useMemo, useState } from 'react';
import { debounce } from '../support.jsx';

const loadHistory = () => {
    try {
        const saved = localStorage.getItem('tapnow_history');
        if (!saved) return [];
        const parsed = JSON.parse(saved);
        return parsed.map((item) => {
            if (item.mjNeedsSplit && item.mjOriginalUrl && item.apiConfig?.modelId?.includes('mj')) {
                return { ...item, url: item.mjOriginalUrl, mjImages: null, mjNeedsSplit: true };
            }
            return item;
        });
    } catch (error) {
        console.error('加载历史记录失败:', error);
        return [];
    }
};

const reduceHistoryForStorage = (historyToSave) => historyToSave.map((item) => {
    const saved = { ...item };
    if (item.mjImages && item.mjImages.length === 4) {
        saved.mjImages = null;
        saved.mjNeedsSplit = true;
        saved.mjOriginalUrl = item.mjOriginalUrl || item.url;
    }
    if (item.url && item.url.startsWith('data:') && item.url.length > 5000) {
        saved.url = `${item.url.substring(0, 100)}...`;
    }
    delete saved.mjImageInfo;
    return saved;
});

const saveHistoryWithFallback = (historyToSave) => {
    try {
        localStorage.setItem('tapnow_history', JSON.stringify(historyToSave));
    } catch (error) {
        console.error('保存历史记录失败（可能超出存储配额）:', error);
        try {
            const reduced = historyToSave.slice(0, 20).map((item) => {
                const saved = { ...item };
                if (saved.url && saved.url.startsWith('data:')) {
                    saved.url = `${saved.url.substring(0, 100)}...`;
                }
                if (saved.mjImages) saved.mjImages = null;
                if (saved.mjImageInfo) delete saved.mjImageInfo;
                return saved;
            });
            localStorage.setItem('tapnow_history', JSON.stringify(reduced));
        } catch (secondError) {
            console.error('清理后仍无法保存:', secondError);
            try {
                const minimal = historyToSave.slice(0, 10).map((item) => ({
                    id: item.id,
                    type: item.type,
                    prompt: item.prompt?.substring(0, 100),
                    time: item.time,
                    status: item.status,
                    modelName: item.modelName,
                }));
                localStorage.setItem('tapnow_history', JSON.stringify(minimal));
            } catch (thirdError) {
                console.error('最小化保存也失败:', thirdError);
            }
        }
    }
};

export const useHistory = () => {
    const [history, setHistory] = useState(loadHistory);

    const debouncedSaveHistory = useMemo(() => debounce((historyToSave) => {
        saveHistoryWithFallback(historyToSave);
    }, 1000), []);

    useEffect(() => {
        try {
            debouncedSaveHistory(reduceHistoryForStorage(history));
        } catch (error) {
            console.error('保存历史记录失败（可能超出存储配额）:', error);
            saveHistoryWithFallback(history);
        }
    }, [history, debouncedSaveHistory]);

    return [history, setHistory];
};

