import React, { useMemo } from 'react';
import { ChevronDown, X } from '../../shared/icons.jsx';
import { getCompletedVideoHistory } from '../history/historyUtils.js';
import { validateClipTimeRange } from '../services/storyboardService.js';

const getSelectedVideoUrl = ({
    sourceType,
    videoUrl,
    selectedTaskId,
    historyMap,
}) => {
    if (sourceType === 'url' && videoUrl.trim()) return videoUrl.trim();
    if (sourceType === 'history' && selectedTaskId) {
        const selectedHistoryItem = historyMap.get(selectedTaskId);
        return selectedHistoryItem?.url || null;
    }
    return null;
};

export const CreateCharacterModal = ({
    isOpen,
    theme,
    history,
    historyMap,
    apiConfigs,
    sourceType,
    setSourceType,
    videoUrl,
    setVideoUrl,
    selectedTaskId,
    setSelectedTaskId,
    historyDropdownOpen,
    setHistoryDropdownOpen,
    startSecond,
    setStartSecond,
    endSecond,
    setEndSecond,
    endpoint,
    setEndpoint,
    submitting,
    setSubmitting,
    videoError,
    setVideoError,
    getDefaultEndpoint,
    createCharacter,
    onClose,
}) => {
    const completedVideoHistory = useMemo(() => getCompletedVideoHistory(history), [history]);

    if (!isOpen) return null;

    const isDark = theme === 'dark';
    const currentVideoUrl = getSelectedVideoUrl({
        sourceType,
        videoUrl,
        selectedTaskId,
        historyMap,
    });

    const submit = async () => {
        if (sourceType === 'url' && !videoUrl.trim()) {
            alert('请输入视频 URL');
            return;
        }
        if (sourceType === 'history' && !selectedTaskId) {
            alert('请选择历史记录中的视频');
            return;
        }
        if (!validateClipTimeRange(startSecond, endSecond)) {
            alert('时间范围必须在 1-3 秒之间');
            return;
        }

        setSubmitting(true);
        try {
            const endpointToUse = endpoint.trim() || null;
            if (sourceType === 'url') {
                await createCharacter(videoUrl, startSecond, endSecond, null, endpointToUse);
            } else {
                await createCharacter('', startSecond, endSecond, selectedTaskId, endpointToUse);
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center" onClick={onClose}>
            <div
                className={`w-[500px] max-h-[90vh] overflow-y-auto rounded-lg shadow-2xl flex flex-col ${
                    isDark ? 'bg-[#121214] border-zinc-800' : 'bg-white border-zinc-200'
                } border`}
                onClick={(event) => event.stopPropagation()}
            >
                <div className={`p-4 border-b flex justify-between items-center ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                    <h3 className={`font-bold text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                        新建角色
                    </h3>
                    <button onClick={onClose}>
                        <X size={16} className={isDark ? 'text-zinc-500' : 'text-zinc-400'} />
                    </button>
                </div>
                <div className="p-4 space-y-4">
                    <div>
                        <label className={`block text-xs mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                            视频源
                        </label>
                        <div className="flex gap-2 mb-2">
                            <button
                                onClick={() => {
                                    setSourceType('url');
                                    setSelectedTaskId('');
                                }}
                                className={`px-3 py-1.5 text-xs rounded transition-colors ${
                                    sourceType === 'url'
                                        ? isDark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                                        : isDark ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                }`}
                            >
                                输入视频 URL
                            </button>
                            <button
                                onClick={() => {
                                    setSourceType('history');
                                    setVideoUrl('');
                                    setVideoError(null);
                                }}
                                className={`px-3 py-1.5 text-xs rounded transition-colors ${
                                    sourceType === 'history'
                                        ? isDark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                                        : isDark ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                }`}
                            >
                                从历史记录选择
                            </button>
                        </div>

                        {sourceType === 'url' ? (
                            <input
                                type="text"
                                value={videoUrl}
                                onChange={(event) => setVideoUrl(event.target.value)}
                                placeholder="输入视频 URL..."
                                className={`w-full px-3 py-2 text-xs rounded border outline-none ${
                                    isDark
                                        ? 'bg-zinc-900 border-zinc-700 text-zinc-200 placeholder-zinc-600'
                                        : 'bg-white border-zinc-300 text-zinc-800 placeholder-zinc-400'
                                }`}
                            />
                        ) : (
                            <div className="relative">
                                <div
                                    onClick={() => setHistoryDropdownOpen(!historyDropdownOpen)}
                                    className={`w-full px-3 py-2 text-xs rounded border outline-none cursor-pointer flex items-center justify-between ${
                                        isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-200' : 'bg-white border-zinc-300 text-zinc-800'
                                    }`}
                                >
                                    <span className={selectedTaskId ? '' : 'opacity-60'}>
                                        {selectedTaskId
                                            ? (() => {
                                                const item = historyMap.get(selectedTaskId);
                                                return item ? `${item.prompt?.slice(0, 40) || '未命名'} - ${item.time}` : '选择历史记录中的视频...';
                                            })()
                                            : '选择历史记录中的视频...'}
                                    </span>
                                    <ChevronDown size={14} className={`transition-transform ${historyDropdownOpen ? 'rotate-180' : ''}`} />
                                </div>

                                {historyDropdownOpen && (
                                    <div className={`absolute z-50 w-full mt-1 rounded-lg border shadow-xl max-h-80 overflow-y-auto custom-scrollbar ${
                                        isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-300'
                                    }`}>
                                        {completedVideoHistory.length === 0 ? (
                                            <div className={`p-4 text-xs text-center ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                暂无已完成的视频
                                            </div>
                                        ) : (
                                            completedVideoHistory.map((item) => (
                                                <div
                                                    key={item.id}
                                                    onClick={() => {
                                                        setSelectedTaskId(item.id);
                                                        setHistoryDropdownOpen(false);
                                                        if (item.url) {
                                                            setSourceType('url');
                                                            setVideoUrl(item.url);
                                                            setSelectedTaskId('');
                                                        }
                                                    }}
                                                    className={`flex items-center gap-3 p-2 cursor-pointer transition-colors ${
                                                        isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
                                                    }`}
                                                >
                                                    <div className={`w-20 h-12 flex-shrink-0 rounded overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                                                        <video
                                                            src={item.localCacheUrl || item.url || item.originalUrl}
                                                            className="w-full h-full object-cover"
                                                            muted
                                                            preload="metadata"
                                                            onLoadedMetadata={(event) => {
                                                                event.target.currentTime = 0.1;
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className={`text-xs font-medium truncate ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                                                            {item.prompt?.slice(0, 50) || '未命名视频'}
                                                        </div>
                                                        <div className={`text-[10px] mt-0.5 flex items-center gap-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                            <span>{item.modelName || '未知模型'}</span>
                                                            <span>•</span>
                                                            <span>{item.time}</span>
                                                            {item.localCacheUrl && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span className="text-green-500">本地缓存</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}

                                {historyDropdownOpen && (
                                    <div className="fixed inset-0 z-40" onClick={() => setHistoryDropdownOpen(false)} />
                                )}
                            </div>
                        )}

                        {currentVideoUrl && (
                            <div className="mt-2 mb-2">
                                <video
                                    key={currentVideoUrl}
                                    controls
                                    crossOrigin="anonymous"
                                    className="w-full h-40 object-contain bg-black rounded-lg"
                                    src={currentVideoUrl}
                                    onError={(event) => {
                                        console.error('视频加载失败:', currentVideoUrl, event);
                                        setVideoError('无法加载视频预览，请检查链接有效性或跨域限制');
                                    }}
                                    onLoadStart={() => setVideoError(null)}
                                    onLoadedData={() => setVideoError(null)}
                                />
                                {videoError && (
                                    <div className="text-red-500 text-xs mt-1 text-center">
                                        {videoError}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className={`block text-xs mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                            时间范围（秒，间隔需在 1-3 秒之间）
                        </label>
                        <div className="flex gap-2 items-center">
                            <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={startSecond}
                                onChange={(event) => setStartSecond(parseFloat(event.target.value) || 0)}
                                className={`w-20 px-2 py-1.5 text-xs rounded border outline-none ${
                                    isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-200' : 'bg-white border-zinc-300 text-zinc-800'
                                }`}
                            />
                            <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>到</span>
                            <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={endSecond}
                                onChange={(event) => setEndSecond(parseFloat(event.target.value) || 0)}
                                className={`w-20 px-2 py-1.5 text-xs rounded border outline-none ${
                                    isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-200' : 'bg-white border-zinc-300 text-zinc-800'
                                }`}
                            />
                            <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                秒（间隔: {(endSecond - startSecond).toFixed(1)}s）
                            </span>
                        </div>
                    </div>

                    <div>
                        <label className={`block text-xs mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                            API 接口地址 (API Endpoint)
                        </label>
                        <input
                            type="text"
                            value={endpoint}
                            onChange={(event) => setEndpoint(event.target.value)}
                            placeholder="例如: https://your-domain.com/sora/v1/characters"
                            className={`w-full px-3 py-2 text-xs rounded border outline-none font-mono ${
                                isDark
                                    ? 'bg-zinc-900 border-zinc-700 text-zinc-200 placeholder-zinc-600'
                                    : 'bg-white border-zinc-300 text-zinc-800 placeholder-zinc-400'
                            }`}
                            onFocus={(event) => {
                                if (!event.target.value) setEndpoint(getDefaultEndpoint());
                            }}
                        />
                        <p className={`text-[10px] mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            默认自动填充，可根据服务商要求修改路径
                        </p>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            onClick={onClose}
                            className={`px-4 py-2 text-xs rounded transition-colors ${
                                isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                            }`}
                        >
                            取消
                        </button>
                        <button
                            onClick={submit}
                            disabled={submitting}
                            className={`px-4 py-2 text-xs rounded transition-colors ${
                                submitting
                                    ? 'bg-zinc-400 text-zinc-200 cursor-not-allowed'
                                    : isDark ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                        >
                            {submitting ? '创建中...' : '创建角色'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
