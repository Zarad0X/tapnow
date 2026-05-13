import React from 'react';
import {
    FolderCog,
    LayoutGrid,
    Loader2,
    RefreshCw,
    Trash2,
    X,
    Zap,
} from '../../shared/icons.jsx';
import { HistoryItem } from '../support.jsx';
import {
    getHistoryImageLightboxItem,
    getHistoryLightboxItem,
} from './historyUtils.js';

const HISTORY_PERFORMANCE_MODES = ['off', 'normal', 'ultra'];

export const HistoryPanel = ({
    isOpen,
    theme,
    history,
    historyPerformanceMode,
    setHistoryPerformanceMode,
    localCacheServerConnected,
    localCacheSettingsOpen,
    setLocalCacheSettingsOpen,
    localServerConfig,
    setLocalServerConfig,
    updateLocalServerConfig,
    setHistory,
    lightboxItem,
    setLightboxItem,
    deleteHistoryItem,
    handleHistoryRightClick,
    pollVeoJob,
    pollSoraJob,
    onOpenBatchManagement,
    onClose,
}) => {
    if (!isOpen) return null;

    const isDark = theme === 'dark';

    const cyclePerformanceMode = () => {
        const currentIdx = HISTORY_PERFORMANCE_MODES.indexOf(historyPerformanceMode);
        const nextIdx = (currentIdx + 1) % HISTORY_PERFORMANCE_MODES.length;
        setHistoryPerformanceMode(HISTORY_PERFORMANCE_MODES[nextIdx]);
    };

    const clearLocalCacheRecords = async () => {
        if (!confirm('确定要重新缓存所有素材吗？这将清除本地缓存记录并重新下载到新路径。')) return;

        setHistory((prev) => prev.map((item) => ({
            ...item,
            localCacheUrl: null,
            mjLocalUrls: null,
            thumbnailUrl: null,
            mjThumbnails: null,
        })));

        alert('缓存记录已清除，素材将在下次访问时重新缓存到新路径。');
    };

    const openHistoryItem = (item) => {
        const nextLightboxItem = getHistoryLightboxItem(item);
        if (nextLightboxItem) setLightboxItem(nextLightboxItem);
    };

    const selectHistoryImage = (event, item, imgUrl, index) => {
        event.stopPropagation();
        setHistory((prev) => prev.map((historyItem) => (
            historyItem.id === item.id
                ? { ...historyItem, url: imgUrl, selectedMjImageIndex: index }
                : historyItem
        )));
        setLightboxItem(getHistoryImageLightboxItem(item, imgUrl, index));
    };

    const refreshHistoryItem = (item) => {
        if (!item.apiConfig) return;

        setHistory((prev) => prev.map((historyItem) => (
            historyItem.id === item.id
                ? { ...historyItem, status: 'generating', errorMsg: null, progress: 5 }
                : historyItem
        )));

        if ((item.modelName || '').includes('veo')) {
            pollVeoJob(
                item.remoteTaskId,
                item.id,
                item.apiConfig.baseUrl,
                item.apiConfig.apiKey,
                item.width,
                item.height,
            );
        } else {
            pollSoraJob(
                item.remoteTaskId,
                item.id,
                item.apiConfig.baseUrl,
                item.apiConfig.apiKey,
                item.width,
                item.height,
                item.apiConfig.modelId || '',
            );
        }
    };

    return (
        <div
            className={`w-72 z-30 flex flex-col animate-in slide-in-from-left border-r transition-colors duration-300 ${
                isDark ? 'bg-[#121214] border-zinc-800' : 'bg-zinc-50 border-zinc-200'
            }`}
        >
            <div
                className={`p-3 border-b flex justify-between items-center ${
                    isDark ? 'border-zinc-800' : 'border-zinc-200'
                }`}
            >
                <h3 className={`font-bold text-xs ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    生成历史
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={cyclePerformanceMode}
                        className={`p-1.5 rounded transition-colors flex items-center gap-1 ${
                            historyPerformanceMode === 'ultra'
                                ? isDark
                                    ? 'text-orange-400 bg-orange-500/20 hover:bg-orange-500/30'
                                    : 'text-orange-600 bg-orange-100 hover:bg-orange-200'
                                : historyPerformanceMode === 'normal'
                                    ? isDark
                                        ? 'text-green-400 bg-green-500/20 hover:bg-green-500/30'
                                        : 'text-green-600 bg-green-100 hover:bg-green-200'
                                    : isDark
                                        ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                                        : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200'
                        }`}
                        title={
                            historyPerformanceMode === 'ultra'
                                ? '极致性能模式（点击关闭）'
                                : historyPerformanceMode === 'normal'
                                    ? '普通性能模式（点击切换极致）'
                                    : '性能模式已关闭（点击开启）'
                        }
                    >
                        <Zap size={14} />
                        {historyPerformanceMode === 'ultra' && (
                            <span className="text-[9px] font-bold">MAX</span>
                        )}
                    </button>
                    {localCacheServerConnected && (
                        <button
                            onClick={() => setLocalCacheSettingsOpen(!localCacheSettingsOpen)}
                            className={`p-1.5 rounded transition-colors ${
                                localCacheSettingsOpen
                                    ? isDark
                                        ? 'text-blue-400 bg-blue-500/20 hover:bg-blue-500/30'
                                        : 'text-blue-600 bg-blue-100 hover:bg-blue-200'
                                    : isDark
                                        ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                                        : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200'
                            }`}
                            title="本地缓存设置"
                        >
                            <FolderCog size={14} />
                        </button>
                    )}
                    <button
                        onClick={onOpenBatchManagement}
                        className={`p-1.5 rounded transition-colors ${
                            isDark
                                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                                : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200'
                        }`}
                        title="批量管理"
                    >
                        <LayoutGrid size={14} />
                    </button>
                    <button onClick={onClose}>
                        <X size={12} className={isDark ? 'text-zinc-500' : 'text-zinc-400'} />
                    </button>
                </div>
            </div>

            {localCacheServerConnected && (
                <div className={`px-3 py-1.5 text-[10px] flex items-center gap-1.5 border-b ${
                    isDark ? 'bg-green-500/10 border-zinc-800 text-green-400' : 'bg-green-50 border-zinc-200 text-green-600'
                }`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                    本地缓存已连接 - 图片将优先从本地读取
                </div>
            )}

            {localCacheSettingsOpen && localCacheServerConnected && (
                <div className={`p-3 border-b space-y-3 ${
                    isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
                }`}>
                    <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">本地缓存设置</div>
                    <div className="space-y-1">
                        <label className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                            图片保存路径
                        </label>
                        <input
                            type="text"
                            value={localServerConfig.imageSavePath}
                            onChange={(event) => setLocalServerConfig((prev) => ({ ...prev, imageSavePath: event.target.value }))}
                            onBlur={(event) => updateLocalServerConfig({ image_save_path: event.target.value })}
                            placeholder="例如: D:/Pictures/TapnowImages"
                            className={`w-full px-2 py-1.5 text-[11px] rounded border ${
                                isDark
                                    ? 'bg-zinc-800 border-zinc-700 text-zinc-200 placeholder-zinc-500'
                                    : 'bg-white border-zinc-300 text-zinc-800 placeholder-zinc-400'
                            }`}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                            视频保存路径
                        </label>
                        <input
                            type="text"
                            value={localServerConfig.videoSavePath}
                            onChange={(event) => setLocalServerConfig((prev) => ({ ...prev, videoSavePath: event.target.value }))}
                            onBlur={(event) => updateLocalServerConfig({ video_save_path: event.target.value })}
                            placeholder="例如: D:/Videos/TapnowVideos"
                            className={`w-full px-2 py-1.5 text-[11px] rounded border ${
                                isDark
                                    ? 'bg-zinc-800 border-zinc-700 text-zinc-200 placeholder-zinc-500'
                                    : 'bg-white border-zinc-300 text-zinc-800 placeholder-zinc-400'
                            }`}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <div className={`text-[10px] ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                                PNG转高质量JPG
                            </div>
                            <div className={`text-[9px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                {localServerConfig.pilAvailable ? '自动转换PNG为JPG节省空间' : 'PIL未安装，功能不可用'}
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                const newValue = !localServerConfig.convertPngToJpg;
                                setLocalServerConfig((prev) => ({ ...prev, convertPngToJpg: newValue }));
                                updateLocalServerConfig({ convert_png_to_jpg: newValue });
                            }}
                            disabled={!localServerConfig.pilAvailable}
                            className={`w-10 h-5 rounded-full transition-colors relative ${
                                !localServerConfig.pilAvailable
                                    ? 'bg-zinc-700 cursor-not-allowed opacity-50'
                                    : localServerConfig.convertPngToJpg
                                        ? 'bg-green-500'
                                        : isDark ? 'bg-zinc-700' : 'bg-zinc-300'
                            }`}
                        >
                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                                localServerConfig.convertPngToJpg ? 'translate-x-5' : 'translate-x-0.5'
                            }`}></div>
                        </button>
                    </div>
                    <div className="pt-2 border-t border-zinc-700/50">
                        <button
                            onClick={clearLocalCacheRecords}
                            className={`w-full py-2 px-3 text-[11px] rounded flex items-center justify-center gap-2 transition-colors ${
                                isDark
                                    ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                                    : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                            }`}
                        >
                            <RefreshCw size={12} />
                            刷新缓存（重新下载到新路径）
                        </button>
                    </div>
                    <div className={`text-[9px] p-2 rounded ${
                        isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'
                    }`}>
                        提示：设置路径后，点击刷新缓存可将素材重新保存到新文件夹
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                {history.map((item) => (
                    <HistoryItem
                        key={item.id}
                        item={item}
                        theme={theme}
                        lightboxItem={lightboxItem}
                        onDelete={deleteHistoryItem}
                        onClick={() => openHistoryItem(item)}
                        onContextMenu={(event) => handleHistoryRightClick(event, item)}
                        onImageClick={selectHistoryImage}
                        onImageContextMenu={(event, item, imgUrl, index) => handleHistoryRightClick(event, item, imgUrl, index)}
                        onRefresh={refreshHistoryItem}
                        Loader2={Loader2}
                        Trash2={Trash2}
                        RefreshCw={RefreshCw}
                        performanceMode={historyPerformanceMode}
                        thumbnailUrl={item.thumbnailUrl}
                        localCacheUrl={item.localCacheUrl}
                    />
                ))}
            </div>
        </div>
    );
};
