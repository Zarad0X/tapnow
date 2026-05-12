import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import {
  ArrowRightSquare,
  Bot,
  Brush,
  Camera,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  Code,
  CopyPlus,
  Download,
  Eraser,
  FileAudio,
  FileImage,
  FileSearch,
  FileText,
  FileVideo,
  FolderCog,
  FolderOpen,
  HardDrive,
  History,
  ImageIcon,
  ImagePlus,
  Layers,
  Layout,
  LayoutGrid,
  LinkIcon,
  Loader2,
  Maximize2,
  MessageSquare,
  Mic2,
  Moon,
  Paperclip,
  Play,
  Plus,
  RefreshCw,
  Save,
  Scissors,
  Send,
  Settings,
  Sparkles,
  Split,
  Sun,
  Trash2,
  Undo2,
  Unlink,
  User,
  Users,
  Video,
  Wand2,
  X,
  Zap
} from '../shared/icons.jsx';

// 全局屏蔽滚轮事件相关的控制台错误（在 React 渲染之前设置）
(function() {
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;
    
    const shouldFilter = (args) => {
        // 检查所有参数，包括字符串、对象、错误等
        for (let arg of args) {
            let msg = '';
            if (typeof arg === 'string') {
                msg = arg;
            } else if (arg && typeof arg === 'object') {
                // 检查错误对象的 message 属性
                if (arg.message) msg = arg.message;
                else if (arg.toString) msg = arg.toString();
                else msg = JSON.stringify(arg);
            } else if (arg != null) {
                msg = String(arg);
            }
            
            // 精确匹配 passive 事件监听器相关的错误
            if (msg.includes('Unable to preventDefault inside passive event listener') ||
                msg.includes('passive event listener invocation') ||
                (msg.includes('preventDefault') && msg.includes('passive'))) {
                return true;
            }
        }
        return false;
    };
    
    console.error = function(...args) {
        if (shouldFilter(args)) return;
        originalError.apply(console, args);
    };
    
    console.warn = function(...args) {
        if (shouldFilter(args)) return;
        originalWarn.apply(console, args);
    };
    
    console.log = function(...args) {
        if (shouldFilter(args)) return;
        originalLog.apply(console, args);
    };
})();

// --- MaskVisualFeedback 组件：蒙版视觉反馈层 ---
export const MaskVisualFeedback = ({ canvasRef, isDrawing }) => {
    const [maskUrl, setMaskUrl] = useState('');
    const rafRef = useRef(null);
    
    const updateMask = useCallback(() => {
        if (canvasRef.current) {
            setMaskUrl(canvasRef.current.toDataURL());
        }
    }, [canvasRef]);
    
    // 初始更新
    useEffect(() => {
        if (!canvasRef.current) return;
        updateMask();
    }, [canvasRef, updateMask]);
    
    // 仅在绘制时使用 requestAnimationFrame 更新
    useEffect(() => {
        if (!isDrawing) {
            // 绘制结束时更新一次
            updateMask();
            return;
        }
        
        // 绘制中：使用 requestAnimationFrame 更新
        const animate = () => {
            updateMask();
            if (isDrawing) {
                rafRef.current = requestAnimationFrame(animate);
            }
        };
        
        rafRef.current = requestAnimationFrame(animate);
        
        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [isDrawing, updateMask]);
    
    if (!maskUrl) return null;
    
    return (
        <div
            className="absolute inset-0 pointer-events-none"
            style={{
                background: 'rgba(255, 0, 0, 0.3)',
                mixBlendMode: 'multiply',
                WebkitMaskImage: `url(${maskUrl})`,
                maskImage: `url(${maskUrl})`,
                WebkitMaskSize: '100% 100%',
                maskSize: '100% 100%',
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
            }}
        />
    );
};

// --- LazyBase64Image 组件：将 Base64 转换为 Blob URL 的智能图片组件 ---
export const LazyBase64Image = ({ src, className, alt, onError, onLoad, ...props }) => {
    const [blobUrl, setBlobUrl] = useState(null);
    const [error, setError] = useState(false);
    const blobUrlRef = useRef(null);

    useEffect(() => {
        // 如果已经是 Blob URL 或 HTTP URL，直接使用
        if (!src || src.startsWith('blob:') || src.startsWith('http://') || src.startsWith('https://')) {
            setBlobUrl(src);
            return;
        }

        // 如果是 Base64 Data URL，转换为 Blob URL
        if (src.startsWith('data:')) {
            const convertToBlobUrl = async () => {
                try {
                    const res = await fetch(src);
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    blobUrlRef.current = url;
                    setBlobUrl(url);
                } catch (err) {
                    console.error('Base64转Blob失败', err);
                    setError(true);
                    setBlobUrl(src); // 失败时使用原始数据
                }
            };
            convertToBlobUrl();
        } else {
            setBlobUrl(src);
        }

        // 清理函数：组件卸载时释放 Blob URL
        return () => {
            if (blobUrlRef.current && blobUrlRef.current.startsWith('blob:')) {
                URL.revokeObjectURL(blobUrlRef.current);
                blobUrlRef.current = null;
            }
        };
    }, [src]);

    if (error && !blobUrl) {
        return null;
    }

    return (
        <img
            src={blobUrl || src}
            className={className}
            alt={alt}
            onError={onError}
            onLoad={onLoad}
            {...props}
        />
    );
};

// --- 极简艺术进度条组件 (Centered & Artistic) ---
export const ArtisticProgress = ({ visible, progress, status, type }) => {
    if (!visible) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-300 pointer-events-none select-none">
            <div className="relative bg-[#09090b]/90 border border-white/10 rounded-2xl p-8 shadow-2xl flex flex-col items-center min-w-[300px] backdrop-blur-xl">
                {/* 装饰性光晕 */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-blue-500/20 blur-[50px] rounded-full pointer-events-none" />
                
                {/* 标题与百分比 */}
                <div className="flex flex-col items-center gap-1 mb-6 z-10">
                    <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-zinc-500">
                        {type === 'import' ? 'DATA INGESTION' : 'SYSTEM ARCHIVING'}
                    </span>
                    <div className="text-4xl font-bold text-zinc-200 tracking-tighter font-sans">
                        {progress.toFixed(0)}<span className="text-sm text-zinc-500 ml-1">%</span>
                    </div>
                </div>

                {/* 进度条轨道 */}
                <div className="relative w-full h-[2px] bg-zinc-800 rounded-full overflow-hidden mb-4">
                    <div 
                        className="absolute top-0 left-0 h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-100 ease-linear"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* 状态文本 */}
                <span className="text-[10px] font-mono text-zinc-400 tracking-widest uppercase animate-pulse">
                    {status}
                </span>
            </div>
        </div>
    );
};

// --- VirtualList 组件：虚拟列表，只渲染可见项 ---
export const VirtualList = memo(({ 
    items, 
    itemHeight = 200, 
    containerHeight = 500,
    renderItem,
    overscan = 2,
    className = ''
}) => {
    const containerRef = useRef(null);
    const [scrollTop, setScrollTop] = useState(0);
    
    const totalHeight = items.length * itemHeight;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(items.length - 1, Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan);
    
    const visibleItems = [];
    for (let i = startIndex; i <= endIndex; i++) {
        visibleItems.push({
            item: items[i],
            index: i,
            style: {
                position: 'absolute',
                top: i * itemHeight,
                left: 0,
                right: 0,
                height: itemHeight
            }
        });
    }
    
    const handleScroll = useCallback((e) => {
        setScrollTop(e.target.scrollTop);
    }, []);
    
    return (
        <div 
            ref={containerRef}
            className={className}
            style={{ overflow: 'auto', height: containerHeight }}
            onScroll={handleScroll}
        >
            <div style={{ height: totalHeight, position: 'relative' }}>
                {visibleItems.map(({ item, index, style }) => (
                    <div key={item.id || index} style={style}>
                        {renderItem(item, index)}
                    </div>
                ))}
            </div>
        </div>
    );
});

// --- HistoryItem 组件：历史记录项，使用 React.memo 优化 ---
export const HistoryItem = memo(({ 
    item, 
    theme, 
    lightboxItem, 
    onDelete, 
    onClick, 
    onContextMenu, 
    onImageClick, 
    onImageContextMenu,
    onRefresh,
    Loader2,
    Trash2,
    RefreshCw,
    performanceMode = 'off',
    thumbnailUrl = null,
    localCacheUrl = null
}) => {
    // 获取显示URL：优先本地缓存，其次性能模式缩略图，最后原始URL
    const getDisplayUrl = (originalUrl) => {
        // 如果有本地缓存，优先使用（无论性能模式）
        if (localCacheUrl) return localCacheUrl;
        // 性能模式下使用缩略图
        if (performanceMode !== 'off' && thumbnailUrl) return thumbnailUrl;
        // 最后使用原始URL
        return originalUrl;
    };
    
    return (
        <div
            className={`group rounded-lg overflow-hidden border relative cursor-pointer hover:border-blue-500/50 transition-colors ${
                theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
            }`}
            style={{
                contentVisibility: 'auto',
                containIntrinsicSize: '1px 300px'
            }}
            onClick={onClick}
            onContextMenu={onContextMenu}
        >
            {/* 性能模式标识 */}
            {performanceMode !== 'off' && (localCacheUrl || thumbnailUrl) && (
                <div className={`absolute top-1 left-1 z-10 px-1 py-0.5 rounded text-[8px] bg-black/60 ${
                    performanceMode === 'ultra' ? 'text-orange-400' : 'text-zinc-400'
                }`}>
                    {localCacheUrl ? '本地' : performanceMode === 'ultra' ? '极速' : '缩略'}
                </div>
            )}
            <div className={`bg-black relative ${
                ((item.mjImages && (item.mjImages.length === 4 || item.mjImages.length > 1)) || (item.mjNeedsSplit && item.apiConfig?.modelId?.includes('mj')))
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
            }`}>
                {item.status === 'completed' ? (
                    item.mjImages && (item.mjImages.length === 4 || item.mjImages.length > 1) ? (
                        <div className={`w-full h-full grid gap-0.5 p-0.5 ${item.mjImages.length === 4 ? 'grid-cols-2 grid-rows-2' : 'grid-cols-2'}`}>
                            {item.mjImages.map((imgUrl, idx) => {
                                const imgInfo = item.mjImageInfo && item.mjImageInfo[idx];
                                // 性能模式下MJ图片也使用缩略图
                                const displayImgUrl = performanceMode !== 'off' && item.mjThumbnails && item.mjThumbnails[idx] 
                                    ? item.mjThumbnails[idx] 
                                    : imgUrl;
                                return (
                                    <div
                                        key={idx}
                                        onClick={(e) => onImageClick && onImageClick(e, item, imgUrl, idx)}
                                        onContextMenu={(e) => onImageContextMenu && onImageContextMenu(e, item, imgUrl, idx)}
                                        className={`relative w-full h-full cursor-pointer border-2 transition-all overflow-hidden ${
                                            item.selectedMjImageIndex === idx && lightboxItem && lightboxItem.id === item.id
                                                ? 'border-blue-500 scale-95'
                                                : 'border-transparent hover:border-blue-500/50'
                                        }`}
                                    >
                                        <LazyBase64Image
                                            src={displayImgUrl}
                                            loading="lazy"
                                            className="w-full h-full object-contain"
                                            alt={`生成图 ${idx + 1}`}
                                            onError={(e) => {
                                                console.error(`图片 ${idx + 1} 加载失败`);
                                                e.target.style.display = 'none';
                                            }}
                                        />
                                        {item.selectedMjImageIndex === idx && lightboxItem && lightboxItem.id === item.id && (
                                            <div className="absolute top-1 right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center z-10">
                                                <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        item.type === 'image' ? (
                            <LazyBase64Image
                                src={getDisplayUrl(item.url || item.originalUrl || item.mjOriginalUrl)}
                                loading="lazy"
                                className="w-full h-full object-cover"
                                alt={item.prompt || '生成的图片'}
                                onError={(e) => {
                                    console.error('图片加载失败:', item.url || item.originalUrl || item.mjOriginalUrl);
                                    e.target.style.display = 'none';
                                }}
                            />
                        ) : (
                            <video
                                src={getDisplayUrl(item.url || item.originalUrl)}
                                className="w-full h-full object-cover"
                                muted
                                loop
                                playsInline
                                onError={(e) => {
                                    console.error('视频加载失败:', item.url || item.originalUrl);
                                }}
                            />
                        )
                    )
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Loader2 className="animate-spin text-zinc-600" />
                    </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
                    <div className="h-full bg-blue-500 transition-all" style={{ width: `${item.progress}%` }}></div>
                </div>
            </div>
            <div className="p-2">
                <div className="flex justify-between items-start gap-2">
                    <p
                        className={`text-[10px] line-clamp-1 flex-1 ${
                            theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'
                        }`}
                    >
                        {item.prompt}
                    </p>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete && onDelete(item.id); }}
                        className={`shrink-0 p-0.5 mr-1 ${
                            theme === 'dark'
                                ? 'text-zinc-500 hover:text-red-500'
                                : 'text-zinc-400 hover:text-red-500'
                        }`}
                        title="删除"
                    >
                        <Trash2 size={12} />
                    </button>
                    {item.type === 'video' && (item.status === 'generating' || item.status === 'failed') && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRefresh && onRefresh(item);
                            }}
                            className={`shrink-0 p-0.5 ${
                                theme === 'dark'
                                    ? 'text-zinc-500 hover:text-white'
                                    : 'text-zinc-400 hover:text-zinc-900'
                            }`}
                            title="刷新状态"
                        >
                            <RefreshCw size={12} />
                        </button>
                    )}
                </div>
                {item.status === 'failed' && item.errorMsg && (
                    <p className="text-[9px] text-red-500 mt-1 break-words whitespace-pre-wrap">
                        {item.errorMsg.split('\n').map((line, idx) => (
                            <span key={idx}>
                                {line}
                                {idx < item.errorMsg.split('\n').length - 1 && <br />}
                            </span>
                        ))}
                    </p>
                )}
                {item.status === 'generating' && (
                    <p className="text-[9px] text-blue-500 mt-1">
                        {item.errorMsg || '生成中...'}
                    </p>
                )}
            </div>
            <div className="flex items-center justify-between px-3 py-2 text-[11px]">
                <div className="flex flex-col">
                    <span className={theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}>
                        {item.prompt?.slice(0, 40) || 'Untitled'}
                        {item.prompt && item.prompt.length > 40 ? '…' : ''}
                    </span>
                    <span className={theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}>
                        {item.time} · {item.modelName}
                        {typeof item.durationMs === 'number' && item.durationMs > 0 && (
                            <> · 用时 {(item.durationMs / 1000).toFixed(1)}s</>
                        )}
                    </span>
                </div>
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // 自定义对比函数：只检查关键属性变化
    return (
        prevProps.item === nextProps.item &&
        prevProps.theme === nextProps.theme &&
        prevProps.lightboxItem?.id === nextProps.lightboxItem?.id
    );
});

// --- MaskEditor 组件：图片标注/局部重绘 ---
export const MaskEditor = ({ nodeId, imageUrl, imageDimensions, isActive, onClose, onSave, theme, view, maskContent, onUpdateNode, isPerformanceMode = false }) => {
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);
    const [brushSize, setBrushSize] = useState(30);
    const [isDrawing, setIsDrawing] = useState(false);
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const maxHistory = 10;

    // 初始化 Canvas
    useEffect(() => {
        if (!isActive || !canvasRef.current || !imageDimensions) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctxRef.current = ctx;
        
        // 设置 Canvas 尺寸为图片原始分辨率
        canvas.width = imageDimensions.w;
        canvas.height = imageDimensions.h;
        
        // 清空画布（透明背景）
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 如果有保存的蒙版，恢复它
        if (maskContent) {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0);
                saveToHistory();
            };
            img.src = maskContent;
        } else {
            saveToHistory();
        }
    }, [isActive, imageDimensions, nodeId, maskContent]);

    // 保存当前状态到历史记录
    const saveToHistory = () => {
        if (!canvasRef.current || !ctxRef.current) return;
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(imageData);
        if (newHistory.length > maxHistory) {
            newHistory.shift();
        }
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    // 获取鼠标在 Canvas 上的真实像素坐标
    const getCanvasCoordinates = (e) => {
        if (!canvasRef.current) return null;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        
        // 使用 getBoundingClientRect 获取 Canvas 在视口中的绝对位置
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // 计算缩放比例（图片原始尺寸 / DOM 显示尺寸）
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        // 映射回真实像素坐标
        return {
            x: Math.round(x * scaleX),
            y: Math.round(y * scaleY)
        };
    };

    // 绘制函数
    const draw = (e) => {
        if (!isDrawing || !canvasRef.current || !ctxRef.current) return;
        const coords = getCanvasCoordinates(e);
        if (!coords) return;
        
        const ctx = ctxRef.current;
        
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#FFFFFF'; // 白色（蒙版标准格式）
        ctx.beginPath();
        ctx.arc(coords.x, coords.y, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
    };

    // 鼠标事件处理
    const handleMouseDown = (e) => {
        if (e.button !== 0) return; // 只处理左键
        e.preventDefault();
        e.stopPropagation();
        setIsDrawing(true);
        saveToHistory();
        draw(e);
    };

    const handleMouseMove = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        e.stopPropagation();
        draw(e);
    };

    const handleMouseUp = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDrawing(false);
        saveToHistory();
    };

    // 撤销
    const handleUndo = () => {
        if (historyIndex <= 0 || !canvasRef.current || !ctxRef.current) return;
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        const ctx = ctxRef.current;
        ctx.putImageData(history[newIndex], 0, 0);
    };

    // 清空
    const handleClear = () => {
        if (!canvasRef.current || !ctxRef.current) return;
        const ctx = ctxRef.current;
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        saveToHistory();
    };

    // 保存蒙版
    const handleSave = () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const maskDataUrl = canvas.toDataURL('image/png');
        
        // 更新节点状态
        if (onUpdateNode) {
            onUpdateNode(nodeId, { maskContent: maskDataUrl, isMasking: false });
        }
        
        if (onSave) onSave(maskDataUrl);
        if (onClose) onClose();
    };

    // 键盘快捷键：Ctrl+Z 撤销
    useEffect(() => {
        if (!isActive) return;
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                handleUndo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isActive, historyIndex, history]);

    if (!isActive || !imageUrl || !imageDimensions) return null;

    return (
        <div 
            className="absolute inset-0 z-50 pointer-events-auto"
            style={{ 
                mixBlendMode: 'normal',
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseMove={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
        >
            {/* Canvas 层：用于绘制蒙版 */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                style={{
                    opacity: 0.5,
                    mixBlendMode: 'multiply',
                    cursor: 'crosshair',
                    pointerEvents: 'auto',
                    imageRendering: 'pixelated'
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            />
            
            {/* 视觉反馈层：半透明红色覆盖 - 使用 Canvas 作为 mask */}
            <MaskVisualFeedback canvasRef={canvasRef} isDrawing={isDrawing} />
            
            {/* 工具栏 - 底部居中悬浮 */}
            <div
                className={`absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-row items-center gap-4 p-2 rounded-full border ${isPerformanceMode ? '' : 'backdrop-blur-md shadow-xl'} ${
                    theme === 'dark'
                        ? 'bg-zinc-900/90 border-zinc-700 text-zinc-200'
                        : 'bg-white/90 border-zinc-300 text-zinc-800'
                }`}
                onMouseDown={(e) => e.stopPropagation()}
            >
                {/* 笔刷粗细 */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium whitespace-nowrap">笔刷</span>
                    <input
                        type="range"
                        min="10"
                        max="100"
                        value={brushSize}
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                        className="w-20"
                        onMouseDown={(e) => e.stopPropagation()}
                    />
                    <span className="text-[10px] w-8 text-right whitespace-nowrap">{brushSize}px</span>
                </div>
                
                {/* 按钮组 */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleUndo}
                        disabled={historyIndex <= 0}
                        className={`p-1.5 rounded-full transition-colors ${
                            theme === 'dark'
                                ? 'hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed'
                                : 'hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed'
                        }`}
                        title="撤销 (Ctrl+Z)"
                    >
                        <Undo2 size={14} />
                    </button>
                    <button
                        onClick={handleClear}
                        className={`p-1.5 rounded-full transition-colors ${
                            theme === 'dark'
                                ? 'hover:bg-zinc-800'
                                : 'hover:bg-zinc-100'
                        }`}
                        title="清空"
                    >
                        <Eraser size={14} />
                    </button>
                    <button
                        onClick={handleSave}
                        className="p-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                        title="保存/完成"
                    >
                        <Check size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- 虚拟画布尺寸 ---
export const VIRTUAL_CANVAS_WIDTH = 4000;
export const VIRTUAL_CANVAS_HEIGHT = 4000;

// --- 默认配置 ---
export const DEFAULT_BASE_URL = 'https://ai.comfly.chat';

// 即梦API配置（代理地址，默认本地5100端口）
export const JIMENG_API_BASE_URL = 'http://localhost:5100';
export const JIMENG_SESSION_ID = '7a16459fbd65d9c87b4ea44d3318f5fa';

export const DEFAULT_API_CONFIGS = [
    // Chat Models
    { id: 'gemini-3-pro', provider: 'Gemini 3 Pro', modelName: 'gemini-3-pro-preview', type: 'Chat', key: '', url: DEFAULT_BASE_URL },
    { id: 'gpt-5-1', provider: 'GPT 5.1', modelName: 'gpt-5.1', type: 'Chat', key: '', url: DEFAULT_BASE_URL },
    { id: 'gpt-5-2', provider: 'GPT 5.2', modelName: 'gpt-5.2', type: 'Chat', key: '', url: DEFAULT_BASE_URL },
    { id: 'deepseek-v3', provider: 'DeepSeek V3', modelName: 'deepseek-v3-1-250821', type: 'Chat', key: '', url: DEFAULT_BASE_URL },
    { id: 'gpt-4o', provider: 'GPT-4o', modelName: 'gpt-4o', type: 'Chat', key: '', url: DEFAULT_BASE_URL },
    
    // Image Models
    { id: 'nano-banana', provider: 'Nano Banana', modelName: 'nano-banana', type: 'Image', key: '', url: DEFAULT_BASE_URL },
    { id: 'nano-banana-2', provider: 'Nano Banana 2', modelName: 'nano-banana-2', type: 'Image', key: '', url: DEFAULT_BASE_URL },
    { id: 'gpt-image', provider: 'GPT-4o Image', modelName: 'gpt-4o-image', type: 'Image', key: '', url: DEFAULT_BASE_URL },
    { id: 'gpt-image-1.5', provider: 'GPT Image 1.5', modelName: 'gpt-image-1.5', type: 'Image', key: '', url: DEFAULT_BASE_URL },
    { id: 'flux-kontext', provider: 'Flux Kontext', modelName: 'flux-kontext-pro', type: 'Image', key: '', url: DEFAULT_BASE_URL },
    { id: 'mj-v6', provider: 'Midjourney', modelName: 'MJ V6', type: 'Image', key: '', url: 'https://api.midjourney.com' },
    // 即梦模型（使用sessionid作为key，首次打开时为空，需要用户输入）
    { id: 'jimeng-4.5', provider: 'Jimeng 4.5', modelName: 'jimeng-4.5', type: 'Image', key: '', url: JIMENG_API_BASE_URL },
    { id: 'jimeng-4.1', provider: 'Jimeng 4.1', modelName: 'jimeng-4.1', type: 'Image', key: '', url: JIMENG_API_BASE_URL },
    { id: 'jimeng-3.1', provider: 'Jimeng 3.1', modelName: 'jimeng-3.1', type: 'Image', key: '', url: JIMENG_API_BASE_URL },
    
    // Video Models
    { id: 'sora-2', provider: 'Sora 2', modelName: 'sora-2', type: 'Video', key: '', url: DEFAULT_BASE_URL, durations: ['5s', '10s', '15s'] },
    { id: 'sora-2-pro', provider: 'Sora 2 Pro', modelName: 'sora-2-pro', type: 'Video', key: '', url: DEFAULT_BASE_URL, durations: ['15s', '25s'] },
    { id: 'google-veo3', provider: 'Google Veo 3', modelName: 'veo3.1-components', type: 'Video', key: '', url: 'https://ai.t8star.cn', durations: ['8s'] },
    // Veo 3.1（首尾帧）：images 最多两个，分别为首帧/尾帧
    { id: 'google-veo3.1', provider: 'Google Veo 3.1', modelName: 'veo3.1', type: 'Video', key: '', url: 'https://ai.t8star.cn', durations: ['8s'] },
    { id: 'grok-3', provider: 'Grok3 Video', modelName: 'grok-video-3', type: 'Video', key: '', url: 'https://ai.t8star.cn', durations: ['8s', '5s'] },
];

export const RATIOS = ['Auto', '1:1', '16:9', '9:16', '4:3', '3:4', '21:9', '3:2', '2:3'];
export const GROK_VIDEO_RATIOS = ['3:2', '2:3', '1:1'];
export const VIDEO_RES_OPTIONS = ['1080P', '720P'];
export const PROMPT_LIBRARY_KEY = 'tapnow_prompt_library';
export const GRID_PROMPT_TEXT = `基于我上传的这张参考图，生成一张九宫格（3x3 grid）布局的分镜脚本。请严格保持角色与参考图一致（Keep character strictly consistent），但在9个格子中展示该角色不同的动作、表情和拍摄角度（如正面、侧面、背面、特写等）。要求风格高度统一，形成一张完整的角色动态表（Character Sheet）。`;
export const UPSCALE_PROMPT_TEXT = `请对参考图片进行无损高清放大（Upscale）。请严格保持原图的构图、色彩、光影和所有细节元素不变，不要进行任何创造性的重绘或添加新内容。仅专注于提升分辨率、锐化边缘（Sharpening）和去除噪点（Denoising），实现像素级的高清修复。Best quality, 8k, masterpiece, highres, ultra detailed, sharp focus, image restoration, upscale, faithful to original.`;
export const STORYBOARD_PROMPT_TEXT = `you are a veteran Hollywood storyboard artist with years of experience. You have the ability to accurately analyze character features and scene characteristics based on images. Provide me with the most suitable camera angles and storyboards. Strictly base this on the uploaded character and scene images, while maintaining a consistent visual style.

MANDATORY LAYOUT: Create a precise 3x3 GRID containing exactly 9 distinct panels.

- The output image MUST be a single image divided into a 3 (rows) by 3 (columns) matrix.
- There must be EXACTLY 3 horizontal rows and 3 vertical columns.
- Each panel must be completely separated by a thin, distinct, solid black line.
- DO NOT create a collage. DO NOT overlap images. DO NOT create random sizes. 
- The grid structure must be perfectly aligned for slicing.

Subject Content: "[在此处填充你对故事的描述]"

Styling Instructions:
- Each panel shows the SAME subject/scene from a DIFFERENT angle (e.g., Front, Side, Back, Action, Close-up).
- Maintain perfect consistency of the character/object across all panels.
- Cinematic lighting, high fidelity, 8k resolution.

Negative Constraints:
- No text, no captions, no UI elements.
- No watermarks.
- No broken grid lines.`;

export const CHARACTER_SHEET_PROMPT_TEXT = `(strictly mimic source image art style:1.5), (same visual style:1.4),
score_9, score_8_up, masterpiece, best quality, (character sheet:1.4), (reference sheet:1.3), (consistent art style:1.3), matching visual style, 

[Structure & General Annotations]:
multiple views, full body central figure, clean background, 
(heavy annotation:1.4), (text labels with arrows:1.3), handwriting, data readout,

[SPECIAL CHARACTER DESCRIPTION AREA]:
(prominent character profile text box:1.6), (dedicated biography section:1.5), large descriptive text block,
[在此处填写特殊角色说明，例如：姓名、种族、背景故事等],

[Clothing Breakdown]:
(clothing breakdown:1.5), (outfit decomposition:1.4), garment analysis, (floating apparel:1.3), 
displaying outerwear, displaying upper body garment, displaying lower body garment, 

[Footwear Focus]:
(detailed footwear display:1.5), (floating shoes:1.4), shoe design breakdown, focus on shoes, 

[Inventory & Details]:
(inventory knolling:1.2), open container, personal accessories, organized items display, expression panels`;

export const MOOD_BOARD_PROMPT_TEXT = `# Directive: Create a "Rich Narrative Mood Board" (8-Grid Layout)

## 1. PROJECT INPUT 

**A. [Story & Concept / 故事与核心想法]**
> [跟据自身内容书写]

**B. [Key Symbols / 核心意象 (Optional)]**
> [深度理解参考图，自行创作]

**C. [Color Preferences / 色彩倾向 (Optional)]**
> [深度理解参考图，自行创作]

**D. [Reference Images / 参考图]**
> (See attached images / 请读取我上传的图片)

---

## 2. Role Definition
Act as a **Senior Art Director**. Synthesize the Input above into a single, cohesive, high-density **Visual Mood Board** using a complex **8-Panel Asymmetrical Grid Layout**.

## 3. Layout Mapping (Strict Adherence)
You must design a visual composition that tells the story through **8 distinct panels** within one image. **Do not** generate random grids. Map the content exactly as follows:

* **Panel 1 (The World):** A wide, cinematic establishing shot of the environment (based on Input A).
* **Panel 2 (The Protagonist):** A portrait close-up (based on reference images), focusing on micro-expressions.
* **Panel 3 (The Metaphor):** An **abstract symbolic object** representing the core theme (based on Input B).
* **Panel 4 (The Palette):** A graphical **Color Palette Strip** showcasing 5 specific colors extracted from the scene.
* **Panel 5 (The Texture):** Extreme macro close-up of a material surface (e.g., rust, skin, fabric) to add tactile richness.
* **Panel 6 (The Motion):** A motion-blurred or long-exposure shot representing time/chaos.
* **Panel 7 (The Detail):** A focused shot of a specific prop or accessory relevant to the plot.
* **Panel 8 (The AI Art Interpretation - CRITICAL):** This is your **free creative space**. Generate an artistic, surreal, or abstract re-interpretation of the story's emotion. **Do not just copy the inputs.** Create a "Vibe Image" (e.g., Double Exposure, Oil Painting style, or abstract geometry) that captures the *soul* of the narrative.

## 4. Execution Requirements
* **Composition Style:** High-end Editorial / Magazine Layout. Clean, thin white borders.
* **Visual Unity:** All panels must share the same lighting conditions and color grading logic (Unified Aesthetic).
* **Task:** Provide the **Final English Image Prompt** that explicitly describes this 8-grid layout, ensuring Panel 8 stands out as an artistic variation.`;
// 已删除的模型ID列表（用于过滤）
export const DELETED_MODEL_IDS = [
    'gemini-image',
    'qwen-image', 
    'doubao-seedream',
    'jimeng', // Jimeng Video
    'hailuo-02',
    'kling-v1-6',
    'wan-2.5'
];

export const getRatiosForModel = (modelId) => {
    if (!modelId) return RATIOS;
    if (modelId.includes('grok')) return GROK_VIDEO_RATIOS;
    return RATIOS;
};
export const RESOLUTIONS = ['Auto', '1K', '2K', '4K'];
// 根据模型返回不同的分辨率选项
export const getResolutionsForModel = (modelId) => {
    if (!modelId) return RESOLUTIONS;
    // jimeng-4.5模型只显示2K和4K两个选项
    if (modelId.includes('jimeng-4.5')) return ['2K', '4K'];
    return RESOLUTIONS;
}; 
// Midjourney版本列表
export const MJ_VERSIONS = [
    { label: 'MJ V7', value: '--v 7' },
    { label: 'MJ V6.1', value: '--v 6.1' },
    { label: 'MJ V6', value: '--v 6' },
    { label: 'MJ V5.2', value: '--v 5.2' },
    { label: 'MJ V5.1', value: '--v 5.1' },
    { label: 'Niji V6', value: '--niji 6' },
    { label: 'Niji V5', value: '--niji 5' },
    { label: 'Niji V4', value: '--niji 4' }
]; 

// --- 辅助：计算真实分辨率 ---
export const calculateResolution = (ratio, baseResolution) => {
    let baseW = 1024;
    let baseH = 1024;
    
    if (baseResolution === '1080P') { baseW = 1920; baseH = 1080; }
    else if (baseResolution === '720P') { baseW = 1280; baseH = 720; }
    else if (baseResolution === '2K') { baseW = 2048; baseH = 2048; }
    else if (baseResolution === '4K') { baseW = 3840; baseH = 2160; }

    if (ratio === 'Auto') {
        return { str: `${baseW}x${baseH}`, w: baseW, h: baseH };
    }

    const [rW, rH] = ratio.split(':').map(Number);
    if (!rW || !rH) return { str: '1024x1024', w: 1024, h: 1024 };

    let targetW;
    let targetH;

    if (Math.abs(rW - rH) < 0.1) {
        targetW = baseW; targetH = baseH;
    } else if (rW > rH) {
        targetW = (baseResolution === 'Auto' || baseResolution === '1K') ? 1280 : baseW;
        targetH = Math.round(targetW * (rH / rW));
    } else {
        targetH = (baseResolution === 'Auto' || baseResolution === '1K') ? 1280 : baseW;
        targetW = Math.round(targetH * (rW / rH));
    }

    targetW = Math.round(targetW / 16) * 16;
    targetH = Math.round(targetH / 16) * 16;

    return { str: `${targetW}x${targetH}`, w: targetW, h: targetH };
};

export const getModelParams = (modelId, ratio, resolution) => {
    const { str, w, h } = calculateResolution(ratio, resolution);
    if (modelId.includes('minimax')) {
        return { sizeStr: resolution === '4K' ? '1080p' : '720p', w, h };
    }
    if (modelId.includes('jimeng') || modelId.includes('veo')) {
        return { sizeStr: ratio, w, h };
    }
    if (modelId.includes('grok')) {
        // Grok 接口需要传 aspect_ratio，size 传比例字符串即可
        return { sizeStr: ratio, w, h };
    }
    return { sizeStr: str, w, h };
};

// --- Helper: Get Image Dimensions ---
export const getImageDimensions = (src) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = src;
    });
};

// --- Helper: Check if URL is video ---
export const isVideoUrl = (url) => {
    if (!url) return false;
    if (url.startsWith('data:video')) return true;
    if (url.includes('force_video_display=true')) return true;
    const ext = url.split('.').pop().split('?')[0].toLowerCase();
    return ['mp4', 'webm', 'ogg', 'mov'].includes(ext);
};

// --- Helper: Load Video Metadata ---
export const getVideoMetadata = (src) => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;
        video.onloadedmetadata = () => {
            resolve({
                duration: Number(video.duration) || 0,
                w: video.videoWidth || 0,
                h: video.videoHeight || 0,
            });
        };
        video.onerror = () => reject(new Error('视频加载失败'));
        video.src = src;
    });
};

// --- Helper: Extract Key Frames from video using <video> + <canvas> ---
export const extractKeyFrames = (src, { fps = 2 } = {}) => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        video.muted = true;
        video.playsInline = true;
        video.crossOrigin = 'anonymous';
        video.src = src;
        const frames = [];

        const handleError = () => reject(new Error('视频抽帧失败'));
        video.onerror = handleError;

        video.onloadedmetadata = () => {
            const duration = Number(video.duration) || 0;
            if (!duration || !isFinite(duration)) {
                reject(new Error('无法读取视频时长'));
                return;
            }
            canvas.width = video.videoWidth || 1280;
            canvas.height = video.videoHeight || 720;
            const interval = 1 / Math.max(0.1, fps);
            let current = 0;

            const captureFrame = () => {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                frames.push({
                    time: Number(current.toFixed(2)),
                    url: canvas.toDataURL('image/jpeg', 0.82),
                });
                current += interval;
                if (current <= duration) {
                    video.currentTime = Math.min(current, duration);
                } else {
                    resolve(frames);
                }
            };

            video.onseeked = captureFrame;
            // 启动首次抽帧
            video.currentTime = 0;
        };
    });
};

// --- Component: ImageCompareView (Beautified & Optimized) ---
export const ImageCompareView = React.memo(({ img1, img2 }) => {
    const [pos, setPos] = useState(50);
    const containerRef = useRef(null);
    const [isHovering, setIsHovering] = useState(false);
    const requestRef = useRef();

    const handleMove = useCallback((e) => {
        if (!containerRef.current) return;
        
        // 使用 requestAnimationFrame 优化性能
        if (requestRef.current) return;
        
        requestRef.current = requestAnimationFrame(() => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
            setPos((x / rect.width) * 100);
            requestRef.current = null;
        });
    }, []);

    useEffect(() => {
        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, []);

    const displayImg1 = img1;
    const displayImg2 = img2 || img1; 

    if (!displayImg1) return (
        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 bg-zinc-900/50 rounded-lg border border-zinc-800 border-dashed pointer-events-none">
            <Split size={24} className="mb-2 opacity-50" />
            <span className="text-xs font-medium">连接图片以对比</span>
        </div>
    );

    return (
        <div 
            ref={containerRef}
            className="relative w-full h-full cursor-col-resize overflow-hidden group rounded-lg select-none shadow-2xl border border-zinc-800 bg-[#09090b]"
            onMouseMove={handleMove}
            onTouchMove={handleMove}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            {/* Checkered Background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" 
                 style={{ 
                     backgroundImage: 'conic-gradient(#333 90deg, transparent 90deg), conic-gradient(transparent 90deg, #333 90deg)', 
                     backgroundSize: '20px 20px', 
                     backgroundPosition: '0 0, 10px 10px' 
                 }} 
            />
            <img src={displayImg1} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none" draggable={false} />
            <div 
                className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none"
                style={{ clipPath: `inset(0 0 0 ${pos}%)` }} 
            >
                <img src={displayImg2} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-contain" draggable={false} />
            </div>
            <div 
                className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow-[0_0_10px_rgba(0,0,0,0.5)] pointer-events-none"
                style={{ left: `${pos}%` }}
            >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center text-black">
                    <Split size={12} className="rotate-90" />
                </div>
            </div>
            <div className={`absolute bottom-2 left-2 bg-black/70 text-white text-[10px] font-medium px-2 py-0.5 rounded border border-white/10 transition-opacity duration-200 pointer-events-none ${isHovering ? 'opacity-100' : 'opacity-60'}`}>
                原始
            </div>
            <div className={`absolute bottom-2 right-2 bg-blue-600/80 text-white text-[10px] font-medium px-2 py-0.5 rounded border border-white/10 transition-opacity duration-200 pointer-events-none ${isHovering ? 'opacity-100' : 'opacity-60'}`}>
                生成
            </div>
        </div>
    );
});

// --- 辅助组件 ---
export const Button = React.memo(({ children, onClick, className = '', variant = 'primary', icon: Icon, disabled = false, title = '' }) => {
    const baseStyle = 'flex items-center justify-center px-3 py-1.5 rounded-lg transition-all duration-200 font-medium text-xs select-none disabled:opacity-50 disabled:cursor-not-allowed';
    const variants = {
        primary: 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 active:scale-95',
        secondary: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 active:scale-95',
        ghost: 'bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-white',
        danger: 'bg-red-900/30 hover:bg-red-800 text-red-200 border border-red-800 active:scale-95',
    };
    return (
        <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`} title={title}>
            {Icon && <Icon size={14} className={children ? 'mr-1.5' : ''} />}
            {children}
        </button>
    );
});

// --- 性能优化工具函数 ---
export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

export const Modal = ({ isOpen, onClose, title, children, theme = 'dark' }) => {
    if (!isOpen) return null;
    const isDark = theme === 'dark';
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className={`rounded-xl shadow-2xl w-[680px] max-w-[90vw] overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh] border ${
                    isDark ? 'bg-[#09090b] border-zinc-800' : 'bg-white border-zinc-200'
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    className={`flex items-center justify-between p-5 border-b shrink-0 ${
                        isDark ? 'border-zinc-800/50' : 'border-zinc-200'
                    }`}
                >
                    <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-zinc-900'}`}>{title}</h3>
                    <button
                        onClick={onClose}
                        className={isDark ? 'text-zinc-500 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className={`p-0 overflow-y-auto custom-scrollbar flex-1 ${isDark ? 'bg-[#09090b]' : 'bg-white'}`}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export const Lightbox = ({ item, onClose, onNavigate }) => {
    if (!item) return null;
    
    // 使用ref存储最新的item值，避免闭包问题
    const itemRef = useRef(item);
    useEffect(() => {
        itemRef.current = item;
    }, [item]);
    
    // 键盘事件处理：左右方向键切换图片
    useEffect(() => {
        if (!item) return;
        
        const handleKeyDown = (e) => {
            // 使用ref获取最新的item值
            const currentItem = itemRef.current;
            if (!currentItem) return;
            
            // 只在有多张图片时响应方向键
            if (!currentItem.mjImages || currentItem.mjImages.length <= 1) return;
            
            // 防止在输入框中触发
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            if (e.key === 'ArrowLeft' || e.key === 'Left') {
                e.preventDefault();
                e.stopPropagation();
                // 切换到上一张（只在当前item的mjImages范围内）
                const currentIndex = currentItem.selectedMjImageIndex !== undefined ? currentItem.selectedMjImageIndex : 0;
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : currentItem.mjImages.length - 1;
                // 确保索引在有效范围内，并且只操作当前item的mjImages
                if (prevIndex >= 0 && prevIndex < currentItem.mjImages.length && onNavigate) {
                    onNavigate(prevIndex);
                }
            } else if (e.key === 'ArrowRight' || e.key === 'Right') {
                e.preventDefault();
                e.stopPropagation();
                // 切换到下一张（只在当前item的mjImages范围内）
                const currentIndex = currentItem.selectedMjImageIndex !== undefined ? currentItem.selectedMjImageIndex : 0;
                const nextIndex = currentIndex < currentItem.mjImages.length - 1 ? currentIndex + 1 : 0;
                // 确保索引在有效范围内，并且只操作当前item的mjImages
                if (nextIndex >= 0 && nextIndex < currentItem.mjImages.length && onNavigate) {
                    onNavigate(nextIndex);
                }
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [item, onNavigate]);
    
    return (
        <div className="fixed inset-0 z-[200] lightbox-overlay flex flex-col items-center justify-center animate-in fade-in duration-200" onClick={onClose}>
            <button className="absolute top-4 right-4 text-white/70 hover:text-white p-2 bg-black/50 rounded-full transition-colors" onClick={onClose}><X size={24} /></button>
            <div className="max-w-[90vw] max-h-[85vh] relative" onClick={(e) => e.stopPropagation()}>
                {item.type === 'image' ? (
                    <img src={item.url || item.originalUrl} alt={item.prompt} className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain" />
                ) : (
                    <video src={item.url || item.originalUrl} controls autoPlay className="max-w-full max-h-[85vh] rounded-lg shadow-2xl" />
                )}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full text-white text-sm font-medium border border-white/10 text-center shadow-2xl">
                    <div className="line-clamp-1 max-w-xl">{item.prompt}</div>
                    <div className="text-[10px] text-zinc-400 mt-1">
                        {item.width}x{item.height} • {item.modelName}
                        {item.mjImages && item.mjImages.length > 1 && (
                            <span className="ml-2">({(item.selectedMjImageIndex !== undefined ? item.selectedMjImageIndex : 0) + 1}/{item.mjImages.length})</span>
                        )}
                    </div>
                </div>
                {/* 左右切换提示 */}
                {item.mjImages && item.mjImages.length > 1 && (
                    <>
                        <button
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-3 bg-black/50 rounded-full transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                const currentIndex = item.selectedMjImageIndex !== undefined ? item.selectedMjImageIndex : 0;
                                const prevIndex = currentIndex > 0 ? currentIndex - 1 : item.mjImages.length - 1;
                                if (onNavigate) onNavigate(prevIndex);
                            }}
                            title="上一张 (←)"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <button
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-3 bg-black/50 rounded-full transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                const currentIndex = item.selectedMjImageIndex !== undefined ? item.selectedMjImageIndex : 0;
                                const nextIndex = currentIndex < item.mjImages.length - 1 ? currentIndex + 1 : 0;
                                if (onNavigate) onNavigate(nextIndex);
                            }}
                            title="下一张 (→)"
                        >
                            <ChevronRight size={24} />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
