import React from 'react';
import {
    ArrowRightSquare,
    Check,
    FileImage,
    HardDrive,
    Loader2,
    Maximize2,
    Trash2,
    X,
} from '../../shared/icons.jsx';
import {
    getBatchHistoryCardDisplay,
    getCanvasSendableHistoryItems,
    getHistoryCanvasContentUrl,
    getLocalHistoryFiles,
    getSelectedHistoryItems,
    splitHistoryCacheItems,
} from './historyUtils.js';

export const BatchHistoryModal = ({
    isOpen,
    theme,
    history,
    selectedIds,
    setSelectedIds,
    onClose,
    setHistory,
    setLightboxItem,
    screenToWorld,
    addNode,
    getImageDimensions,
    isVideoUrl,
}) => {
    if (!isOpen) return null;

    const isDark = theme === 'dark';
    const hasSelection = selectedIds.size > 0;

    const close = () => {
        onClose();
        setSelectedIds(new Set());
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === history.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(history.map((item) => item.id)));
        }
    };

    const toggleItemSelection = (itemId) => {
        const next = new Set(selectedIds);
        if (next.has(itemId)) {
            next.delete(itemId);
        } else {
            next.add(itemId);
        }
        setSelectedIds(next);
    };

    const deleteSelected = async () => {
        if (!hasSelection) return;
        const selectedItems = getSelectedHistoryItems(history, selectedIds);
        const filesToDelete = getLocalHistoryFiles(selectedItems);
        const hasLocalFiles = filesToDelete.length > 0;
        const confirmMsg = hasLocalFiles
            ? `确定要删除选中的 ${selectedIds.size} 项吗？\n\n注意：将同时删除本地文件！`
            : `确定要删除选中的 ${selectedIds.size} 项吗？`;

        if (!confirm(confirmMsg)) return;

        if (hasLocalFiles) {
            try {
                console.log('[批量删除] 删除本地文件:', filesToDelete);
                const response = await fetch('http://127.0.0.1:9527/delete-batch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ files: filesToDelete }),
                });
                const result = await response.json();
                console.log('[批量删除] 服务器响应:', result);
            } catch (error) {
                console.error('[批量删除] 删除本地文件失败:', error);
            }
        }

        setHistory((prev) => {
            const filtered = prev.filter((item) => !selectedIds.has(item.id));
            try {
                localStorage.setItem('draworchestrator_history', JSON.stringify(filtered));
            } catch (error) {
                console.error('立即保存历史记录失败:', error);
            }
            return filtered;
        });
        setSelectedIds(new Set());
    };

    const cleanSelectedCache = async () => {
        if (!hasSelection) return;
        const selectedItems = getSelectedHistoryItems(history, selectedIds);
        const { remote: itemsWithRemoteCache, local: itemsWithLocalCache } = splitHistoryCacheItems(selectedItems);
        const hasRemoteCache = itemsWithRemoteCache.length > 0;
        const hasLocalCache = itemsWithLocalCache.length > 0;

        if (!hasRemoteCache && !hasLocalCache) {
            alert('选中的项目中没有可清理的缓存');
            return;
        }

        let clearRemote = false;
        let deleteLocalFiles = false;

        if (hasRemoteCache && hasLocalCache) {
            const choice = confirm(`选中的项目包含：\n- 后端缓存: ${itemsWithRemoteCache.length} 项\n- 本地素材: ${itemsWithLocalCache.length} 项\n\n点击"确定"清理后端缓存\n点击"取消"删除本地素材`);
            clearRemote = choice;
            deleteLocalFiles = !choice;
        } else if (hasRemoteCache) {
            clearRemote = true;
        } else {
            deleteLocalFiles = true;
        }

        const cacheType = clearRemote ? '后端缓存' : '本地素材';
        const itemsToClear = clearRemote ? itemsWithRemoteCache : itemsWithLocalCache;
        const confirmMsg = deleteLocalFiles
            ? `将删除 ${itemsToClear.length} 项本地素材文件（同时删除本地文件和历史记录引用）。\n\n确定继续？`
            : `将清理 ${itemsToClear.length} 项${cacheType}的URL引用（不删除历史记录）。\n\n确定继续？`;

        if (!confirm(confirmMsg)) return;

        console.log('[删除] deleteLocalFiles:', deleteLocalFiles, 'clearRemote:', clearRemote);
        if (deleteLocalFiles) {
            try {
                const filesToDelete = getLocalHistoryFiles(itemsToClear);
                console.log('[删除] 准备删除的文件:', filesToDelete);
                console.log('[删除] itemsToClear:', itemsToClear.map((item) => ({ id: item.id, localCacheUrl: item.localCacheUrl, localFilePath: item.localFilePath })));

                if (filesToDelete.length > 0) {
                    console.log('[删除] 发送删除请求到服务器...');
                    const response = await fetch('http://127.0.0.1:9527/delete-batch', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ files: filesToDelete }),
                    });
                    const result = await response.json();
                    console.log('[删除] 服务器响应:', result);

                    if (result.results) {
                        const failed = result.results.filter((item) => !item.success);
                        if (failed.length > 0) console.warn('[删除] 部分文件删除失败:', failed);
                    }
                } else {
                    console.log('[删除] 没有找到要删除的文件');
                }
            } catch (error) {
                console.error('[删除] 删除本地文件失败:', error);
            }
        } else {
            console.log('[删除] 跳过本地文件删除（deleteLocalFiles=false）');
        }

        setHistory((prev) => {
            const updated = prev.map((item) => {
                if (!selectedIds.has(item.id)) return item;
                if (clearRemote && item.url && !item.url.startsWith('http://127.0.0.1:9527')) {
                    return { ...item, originalUrl: item.url, url: null, mjImages: null };
                }
                if (!clearRemote && (item.localCacheUrl || item.localFilePath)) {
                    return { ...item, localCacheUrl: null, localFilePath: null, mjLocalUrls: null };
                }
                return item;
            });
            try {
                localStorage.setItem('draworchestrator_history', JSON.stringify(updated));
            } catch (error) {
                console.error('保存历史记录失败:', error);
            }
            return updated;
        });
        setSelectedIds(new Set());
        alert(`已清理 ${itemsToClear.length} 项${cacheType}`);
    };

    const sendSelectedToCanvas = async () => {
        if (!hasSelection) return;
        const selectedItems = getCanvasSendableHistoryItems(history, selectedIds);
        if (selectedItems.length === 0) {
            alert('选中的项目中没有有效的素材');
            return;
        }

        const world = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
        const startX = world.x;
        const startY = world.y;

        selectedItems.forEach((item, index) => {
            const offsetX = (index % 5) * 20;
            const offsetY = Math.floor(index / 5) * 20;
            const content = getHistoryCanvasContentUrl(item, { isVideoUrl });

            if (item.type === 'image') {
                (async () => {
                    try {
                        const dims = await getImageDimensions(content);
                        addNode('input-image', startX + offsetX, startY + offsetY, null, content, dims);
                    } catch (error) {
                        addNode('input-image', startX + offsetX, startY + offsetY, null, content);
                    }
                })();
            } else if (item.type === 'video') {
                addNode('video-input', startX + offsetX, startY + offsetY, null, content);
            }
        });

        close();
    };

    const getLightboxItem = (item, hasFourImages, displayUrl, getLocalUrl) => ({
        ...item,
        url: hasFourImages ? getLocalUrl(item.mjImages[item.selectedMjImageIndex || 0]) : displayUrl,
        selectedMjImageIndex: item.mjImages && item.mjImages.length > 1 ? (item.selectedMjImageIndex || 0) : undefined,
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />
            <div className={`relative w-[90vw] h-[85vh] max-w-7xl rounded-lg shadow-2xl flex flex-col ${
                isDark ? 'bg-[#121214] border border-zinc-800' : 'bg-white border border-zinc-200'
            }`}>
                <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                    <div className="flex items-center gap-4">
                        <h2 className={`text-lg font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>批量素材管理</h2>
                        <span className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>已选中 {selectedIds.size} 项</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleSelectAll}
                            className={`px-3 py-1.5 text-xs rounded transition-colors ${
                                isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                            }`}
                        >
                            {selectedIds.size === history.length ? '取消全选' : '全选'}
                        </button>
                        <button
                            onClick={deleteSelected}
                            disabled={!hasSelection}
                            className={`px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-1.5 ${
                                !hasSelection
                                    ? isDark ? 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                                    : 'bg-red-600 text-white hover:bg-red-700'
                            }`}
                        >
                            <Trash2 size={14} />
                            批量删除
                        </button>
                        <button
                            onClick={cleanSelectedCache}
                            disabled={!hasSelection}
                            className={`px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-1.5 ${
                                !hasSelection
                                    ? isDark ? 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                                    : 'bg-orange-600 text-white hover:bg-orange-700'
                            }`}
                        >
                            <HardDrive size={14} />
                            清理缓存
                        </button>
                        <button
                            onClick={sendSelectedToCanvas}
                            disabled={!hasSelection}
                            className={`px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-1.5 ${
                                !hasSelection
                                    ? isDark ? 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                        >
                            <ArrowRightSquare size={14} />
                            发送到画布
                        </button>
                        <button
                            onClick={close}
                            className={`p-1.5 rounded transition-colors ${isDark ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200'}`}
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                    <div className="grid grid-cols-4 gap-4">
                        {history.map((item) => {
                            const isSelected = selectedIds.has(item.id);
                            const { hasFourImages, displayUrl, getLocalUrl } = getBatchHistoryCardDisplay(item);

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => toggleItemSelection(item.id)}
                                    onDoubleClick={(event) => {
                                        event.stopPropagation();
                                        setLightboxItem(getLightboxItem(item, hasFourImages, displayUrl, getLocalUrl));
                                    }}
                                    className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                                        isSelected
                                            ? 'border-blue-500 shadow-lg shadow-blue-500/20'
                                            : isDark ? 'border-zinc-800 hover:border-zinc-700' : 'border-zinc-200 hover:border-zinc-300'
                                    }`}
                                >
                                    {item.status === 'completed' && (
                                        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                                            {item.url && !item.url.startsWith('http://127.0.0.1:9527') && (
                                                <span className="px-1.5 py-0.5 text-[10px] rounded bg-orange-500/90 text-white backdrop-blur-sm">后端缓存</span>
                                            )}
                                            {(item.localCacheUrl || item.localFilePath) && (
                                                <span
                                                    className="px-1.5 py-0.5 text-[10px] rounded bg-green-500/90 text-white backdrop-blur-sm cursor-help"
                                                    title={item.localFilePath || (item.localCacheUrl ? '本地缓存' : '')}
                                                >
                                                    本地素材
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
                                        {isSelected && (
                                            <div className="bg-blue-500 rounded-full p-1">
                                                <Check size={16} className="text-white" />
                                            </div>
                                        )}
                                        {item.status === 'completed' && (displayUrl || hasFourImages) && (
                                            <button
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setLightboxItem(getLightboxItem(item, hasFourImages, displayUrl, getLocalUrl));
                                                }}
                                                className={`p-1.5 rounded-full transition-colors backdrop-blur-sm ${
                                                    isDark ? 'bg-black/60 text-white hover:bg-black/80' : 'bg-white/80 text-zinc-700 hover:bg-white'
                                                }`}
                                                title="查看大图 (双击也可查看)"
                                            >
                                                <Maximize2 size={14} />
                                            </button>
                                        )}
                                    </div>

                                    <div className={`relative ${
                                        hasFourImages
                                            ? 'aspect-square'
                                            : ((item.mjImages && item.mjImages.length > 1) || (item.mjNeedsSplit && item.apiConfig?.modelId?.includes('mj')))
                                                ? (() => {
                                                    const ratio = item.mjRatio || '1:1';
                                                    if (ratio === '16:9') return 'aspect-video';
                                                    if (ratio === '9:16') return 'aspect-[9/16]';
                                                    if (ratio === '4:3') return 'aspect-[4/3]';
                                                    if (ratio === '3:4') return 'aspect-[3/4]';
                                                    if (ratio === '21:9') return 'aspect-[21/9]';
                                                    return 'aspect-square';
                                                })()
                                                : 'aspect-video'
                                    } ${isDark ? 'bg-zinc-900' : 'bg-zinc-100'}`}>
                                        {item.status === 'completed' ? (
                                            hasFourImages ? (
                                                <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5">
                                                    {item.mjImages.map((imgUrl, index) => {
                                                        const localImgUrl = getLocalUrl(imgUrl);
                                                        return (
                                                            <div
                                                                key={index}
                                                                className={`relative overflow-hidden cursor-pointer transition-all ${
                                                                    item.selectedMjImageIndex === index ? 'ring-2 ring-blue-500 ring-inset' : 'hover:brightness-110'
                                                                }`}
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    setHistory((prev) => prev.map((historyItem) =>
                                                                        historyItem.id === item.id ? { ...historyItem, selectedMjImageIndex: index, url: imgUrl } : historyItem
                                                                    ));
                                                                }}
                                                                onDoubleClick={(event) => {
                                                                    event.stopPropagation();
                                                                    setLightboxItem({ ...item, url: localImgUrl, selectedMjImageIndex: index });
                                                                }}
                                                            >
                                                                <img
                                                                    src={localImgUrl}
                                                                    className="w-full h-full object-cover"
                                                                    alt={`生成图 ${index + 1}`}
                                                                    onError={(event) => {
                                                                        if (event.target.src !== imgUrl) {
                                                                            event.target.src = imgUrl;
                                                                        } else {
                                                                            event.target.style.display = 'none';
                                                                        }
                                                                    }}
                                                                />
                                                                <div className={`absolute bottom-0.5 left-0.5 text-[9px] px-1 rounded ${
                                                                    isDark ? 'bg-black/60 text-white' : 'bg-white/80 text-zinc-700'
                                                                }`}>
                                                                    {index + 1}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : displayUrl ? (
                                                item.type === 'video' || isVideoUrl(displayUrl) ? (
                                                    <video src={displayUrl} className="w-full h-full object-contain" muted playsInline />
                                                ) : (
                                                    <img
                                                        src={displayUrl}
                                                        className="w-full h-full object-contain"
                                                        alt="生成图"
                                                        onError={(event) => {
                                                            const originalUrl = item.mjImages && item.mjImages.length > 1
                                                                ? (item.mjImages[item.selectedMjImageIndex || 0] || item.mjImages[0])
                                                                : item.url;
                                                            if (event.target.src !== originalUrl && originalUrl) {
                                                                event.target.src = originalUrl;
                                                            } else {
                                                                event.target.style.display = 'none';
                                                            }
                                                        }}
                                                    />
                                                )
                                            ) : (
                                                <div className={`w-full h-full flex items-center justify-center ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                                                    <FileImage size={24} />
                                                </div>
                                            )
                                        ) : (
                                            <div className={`w-full h-full flex items-center justify-center ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                                                {item.status === 'generating' ? <Loader2 size={24} className="animate-spin" /> : <FileImage size={24} />}
                                            </div>
                                        )}
                                    </div>

                                    <div className={`p-2 text-xs ${isDark ? 'bg-zinc-900 text-zinc-300' : 'bg-zinc-50 text-zinc-700'}`}>
                                        <div className="truncate font-medium">{item.prompt || '未命名'}</div>
                                        <div className="text-[10px] opacity-70 mt-0.5">{item.modelName || '未知模型'} • {item.time}</div>
                                        {item.localFilePath && (
                                            <div className="text-[9px] opacity-50 mt-0.5 truncate cursor-help" title={item.localFilePath}>
                                                📁 {item.localFilePath.split(/[/\\]/).pop()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
