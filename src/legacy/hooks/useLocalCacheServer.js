import { useCallback, useEffect, useRef, useState } from 'react';
import {
    LOCAL_CACHE_SERVER_URL,
    checkLocalCacheServer,
    getFilenameFromUrl,
    saveImageToLocalCache as saveImageToLocalCacheRequest,
    saveVideoToLocalCache as saveVideoToLocalCacheRequest,
    updateLocalServerConfigRequest,
} from '../services/localCacheService.js';

const DEFAULT_LOCAL_SERVER_CONFIG = {
    imageSavePath: '',
    videoSavePath: '',
    convertPngToJpg: true,
    jpgQuality: 95,
};

export const useLocalCacheServer = ({
    history,
    setHistory,
    characterLibrary,
    setCharacterLibrary,
}) => {
    const [localCacheServerConnected, setLocalCacheServerConnected] = useState(false);
    const [localServerConfig, setLocalServerConfig] = useState(DEFAULT_LOCAL_SERVER_CONFIG);
    const [localCacheSettingsOpen, setLocalCacheSettingsOpen] = useState(false);
    const triedCacheIdsRef = useRef(new Set());

    const localCacheServerUrl = LOCAL_CACHE_SERVER_URL;

    const refreshLocalCacheServer = useCallback(async () => {
        try {
            const result = await checkLocalCacheServer(localCacheServerUrl);
            if (result.connected) {
                setLocalCacheServerConnected(true);
                setLocalServerConfig((prev) => ({ ...prev, ...result.config }));
                console.log('[缓存] 本地缓存服务器已连接', result.data);
            } else {
                setLocalCacheServerConnected(false);
            }
        } catch (error) {
            setLocalCacheServerConnected(false);
        }
    }, [localCacheServerUrl]);

    useEffect(() => {
        if (!localCacheSettingsOpen) return;
        refreshLocalCacheServer();
        const interval = setInterval(refreshLocalCacheServer, 30000);
        return () => clearInterval(interval);
    }, [localCacheSettingsOpen, refreshLocalCacheServer]);

    const updateLocalServerConfig = useCallback(async (newConfig) => {
        if (!localCacheServerConnected) return false;
        try {
            const config = await updateLocalServerConfigRequest(newConfig, localCacheServerUrl);
            if (!config) return false;
            setLocalServerConfig((prev) => ({ ...prev, ...config }));
            return true;
        } catch (error) {
            console.error('[缓存] 更新配置失败:', error);
        }
        return false;
    }, [localCacheServerConnected, localCacheServerUrl]);

    const saveImageToLocalCache = useCallback(async (itemId, imageUrl, category = 'characters') => {
        if (!localCacheServerConnected) return null;
        try {
            const result = await saveImageToLocalCacheRequest({ itemId, imageUrl, category, serverUrl: localCacheServerUrl });
            if (result) {
                console.log('[缓存] 图片已缓存到本地:', result.url, '路径:', result.path);
            }
            return result;
        } catch (error) {
            console.warn('[缓存] 保存图片缓存失败:', error);
        }
        return null;
    }, [localCacheServerConnected, localCacheServerUrl]);

    const saveVideoToLocalCache = useCallback(async (itemId, videoUrl, category = 'history') => {
        if (!localCacheServerConnected) return null;
        try {
            console.log('[缓存] 开始缓存视频:', itemId);
            const result = await saveVideoToLocalCacheRequest({ itemId, videoUrl, category, serverUrl: localCacheServerUrl });
            if (result) {
                console.log('[缓存] 视频已缓存到本地:', result.url, '路径:', result.path);
            }
            return result;
        } catch (error) {
            console.warn('[缓存] 保存视频缓存失败:', error);
        }
        return null;
    }, [localCacheServerConnected, localCacheServerUrl]);

    useEffect(() => {
        if (!localCacheServerConnected) return;

        const cacheCharacterImages = async () => {
            for (const char of characterLibrary) {
                if (char.localCacheUrl) continue;
                if (!char.imageUrl || char.imageUrl.startsWith('blob:')) continue;

                try {
                    const result = await saveImageToLocalCache(char.id, char.imageUrl, 'characters');
                    if (result) {
                        setCharacterLibrary((prev) => prev.map((item) =>
                            item.id === char.id ? { ...item, localCacheUrl: result.url, localFilePath: result.path } : item
                        ));
                    }
                } catch (error) {
                    console.warn('[角色库缓存] 缓存失败:', char.name, error);
                }
            }
        };

        const timer = setTimeout(cacheCharacterImages, 2000);
        return () => clearTimeout(timer);
    }, [characterLibrary, localCacheServerConnected, saveImageToLocalCache, setCharacterLibrary]);

    useEffect(() => {
        if (!localCacheServerConnected) return;

        const cacheHistoryImages = async () => {
            for (const item of history) {
                if (item.status !== 'completed' || item.type !== 'image') continue;
                if (item.localCacheUrl) continue;
                if (triedCacheIdsRef.current.has(item.id)) continue;

                triedCacheIdsRef.current.add(item.id);

                const imageUrl = item.url || item.originalUrl || item.mjOriginalUrl;
                const filenameFromUrl = imageUrl ? getFilenameFromUrl(imageUrl) : null;
                const baseDir = localServerConfig.imageSavePath ? 'history' : '.tapnow_cache/history';
                let foundLocal = false;
                const filenamesToCheck = [filenameFromUrl, item.id].filter(Boolean);

                for (const filename of filenamesToCheck) {
                    if (foundLocal) break;
                    for (const ext of ['.jpg', '.png']) {
                        try {
                            const basePath = `${baseDir}/${filename}${ext}`;
                            const checkUrl = `${localCacheServerUrl}/file/${basePath}`;
                            const checkRes = await fetch(checkUrl, { method: 'HEAD' });
                            if (checkRes.ok) {
                                console.log('[历史缓存] 发现已有本地缓存:', filename + ext);
                                setHistory((prev) => prev.map((historyItem) =>
                                    historyItem.id === item.id ? { ...historyItem, localCacheUrl: checkUrl, localFilePath: basePath } : historyItem
                                ));
                                foundLocal = true;
                                break;
                            }
                        } catch (error) {}
                    }
                }
                if (foundLocal) continue;

                if (!imageUrl || imageUrl.startsWith('blob:') || imageUrl.includes('...')) continue;

                try {
                    const result = await saveImageToLocalCache(item.id, imageUrl, 'history');
                    if (result) {
                        setHistory((prev) => prev.map((historyItem) =>
                            historyItem.id === item.id ? { ...historyItem, localCacheUrl: result.url, localFilePath: result.path } : historyItem
                        ));
                    }
                } catch (error) {
                    console.warn('[历史缓存] 缓存失败:', item.id, error);
                }
            }
        };

        const timer = setTimeout(cacheHistoryImages, 3000);
        return () => clearTimeout(timer);
    }, [history, localCacheServerConnected, localCacheServerUrl, localServerConfig.imageSavePath, saveImageToLocalCache, setHistory]);

    useEffect(() => {
        if (!localCacheServerConnected) return;

        const cacheHistoryVideos = async () => {
            for (const item of history) {
                if (item.status !== 'completed' || item.type !== 'video') continue;
                if (item.localCacheUrl) continue;
                if (triedCacheIdsRef.current.has(item.id)) continue;

                triedCacheIdsRef.current.add(item.id);

                const videoUrl = item.url || item.originalUrl;
                if (videoUrl && (videoUrl.includes('localhost:') || videoUrl.includes('127.0.0.1:'))) continue;

                const filenameFromUrl = videoUrl ? getFilenameFromUrl(videoUrl) : null;
                const filenamesToCheck = [filenameFromUrl, item.id].filter(Boolean);
                let foundLocalVideo = false;

                for (const filename of filenamesToCheck) {
                    if (foundLocalVideo) break;
                    try {
                        const basePath = localServerConfig.videoSavePath
                            ? `history/${filename}.mp4`
                            : `.tapnow_cache/history/${filename}.mp4`;
                        const checkUrl = `${localCacheServerUrl}/file/${basePath}`;
                        const checkRes = await fetch(checkUrl, { method: 'HEAD' });
                        if (checkRes.ok) {
                            console.log('[历史缓存] 发现已有本地视频缓存:', filename);
                            setHistory((prev) => prev.map((historyItem) =>
                                historyItem.id === item.id ? { ...historyItem, localCacheUrl: checkUrl, localFilePath: basePath } : historyItem
                            ));
                            foundLocalVideo = true;
                        }
                    } catch (error) {}
                }
                if (foundLocalVideo) continue;

                if (!videoUrl || videoUrl.startsWith('blob:') || videoUrl.includes('...')) continue;

                try {
                    const result = await saveVideoToLocalCache(item.id, videoUrl, 'history');
                    if (result) {
                        setHistory((prev) => prev.map((historyItem) =>
                            historyItem.id === item.id ? { ...historyItem, localCacheUrl: result.url, localFilePath: result.path } : historyItem
                        ));
                    }
                } catch (error) {
                    console.warn('[历史缓存] 视频缓存失败:', item.id, error);
                }
            }
        };

        const timer = setTimeout(cacheHistoryVideos, 5000);
        return () => clearTimeout(timer);
    }, [history, localCacheServerConnected, localCacheServerUrl, localServerConfig.videoSavePath, saveVideoToLocalCache, setHistory]);

    return {
        localCacheServerConnected,
        localServerConfig,
        setLocalServerConfig,
        localCacheSettingsOpen,
        setLocalCacheSettingsOpen,
        updateLocalServerConfig,
        refreshLocalCacheServer,
    };
};
