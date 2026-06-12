import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import './styles.css';
import './app.css';
import {
  ArrowRightSquare,
  Brush,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCopy,
  Code,
  CopyPlus,
  Download,
  Eraser,
  FileSearch,
  FileText,
  FileVideo,
  FolderOpen,
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
  MousePointer2,
  Play,
  Plus,
  Save,
  Settings,
  Scissors,
  Sparkles,
  Sun,
  Trash2,
  Unlink,
  User,
  Users,
  Video,
  Wand2,
  X
} from '../shared/icons.jsx';

import {
  MaskVisualFeedback,
  LazyBase64Image,
  ArtisticProgress,
  VirtualList,
  MaskEditor,
  VIRTUAL_CANVAS_WIDTH,
  VIRTUAL_CANVAS_HEIGHT,
  DEFAULT_BASE_URL,
  RATIOS,
  GROK_VIDEO_RATIOS,
  VIDEO_RES_OPTIONS,
  DELETED_MODEL_IDS,
  createChatMediaFile,
  createUploadedChatFile,
  getRatiosForModel,
  RESOLUTIONS,
  getResolutionsForModel,
  MJ_VERSIONS,
  calculateResolution,
  getModelParams,
  getImageDimensions,
  isVideoUrl,
  getVideoMetadata,
  extractKeyFrames,
  ImageCompareView,
  Button,
  debounce,
  Lightbox
} from './support.jsx';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { useApiConfigs } from './hooks/useApiConfigs.js';
import { useApiConfigActions } from './hooks/useApiConfigActions.js';
import { useAutoLocalSave } from './hooks/useAutoLocalSave.js';
import { useCanvasWheelGuards } from './hooks/useCanvasWheelGuards.js';
import { useChatResize } from './hooks/useChatResize.js';
import { useHistory } from './hooks/useHistory.js';
import { useChatSessions } from './hooks/useChatSessions.js';
import { usePromptLibrary } from './hooks/usePromptLibrary.js';
import { useCharacterLibrary } from './hooks/useCharacterLibrary.js';
import { useCreateCharacterForm } from './hooks/useCreateCharacterForm.js';
import { useHistoryThumbnails } from './hooks/useHistoryThumbnails.js';
import { useLocalCacheServer } from './hooks/useLocalCacheServer.js';
import { useMidjourneyAutoSplit } from './hooks/useMidjourneyAutoSplit.js';
import { useNodeTimers } from './hooks/useNodeTimers.js';
import { saveProject, loadProjectFromFile } from './services/projectService.js';
import { saveSelectedWorkflow, importWorkflowFromFile } from './services/workflowService.js';
import {
  uploadImageToGetHttpUrl,
  uploadMidjourneyImages
} from './services/midjourneyUploadService.js';
import {
  createGridImageNodes,
  splitMidjourneyImage,
  splitGridImage
} from './services/gridSplitService.js';
import {
  createEmptyStoryboardShot,
  createShotsFromAnalysisResults,
  getDefaultDurationForModel,
  getDefaultDurationsForModel,
  renumberStoryboardShots,
  updateStoryboardShot
} from './services/storyboardService.js';
import { CanvasContextMenus } from './canvas/CanvasContextMenus.jsx';
import {
  cloneClipboardPayloadAtPoint,
  createClipboardPayload,
  getCanvasCenterWorldPoint,
  getSelectedNodeIdsForClipboard,
  isEditableElement
} from './canvas/clipboard.js';
import {
  buildConnectedImageForInputCache,
  buildConnectedImagesCache,
  buildConnectedNodeTypeCache,
  findConnectedNodeOfType,
  getConnectedImageForInputFromCache,
  getConnectedInputImagesFromCache,
  getConnectedTextNodeContents
} from './canvas/connections.js';
import {
  getCanvasDetailLevel,
  getVisibleNodes,
  screenToWorldPoint
} from './canvas/viewport.js';
import {
  createDefaultNodeSettings,
  getDefaultNodeSize,
  getNodeLabel
} from './nodes/nodeCatalog.js';
import {
  denormalizePromptForSoraRequest,
  extractAsyncTaskId,
  findFirstHttpImageUrl,
  extractImageUrls,
  getImageModelFeatures,
  getJimengModelName,
  getModelDisplayName,
  getNanoBanana2ImageSizeFlag,
  isSoraModel,
  normalizeBananaResolution,
  normalizePromptForSora,
  parseDurationSeconds,
  resolveGenerationDurationMs,
  classifyAsyncImageStatus,
  ASYNC_IMAGE_STATUS,
  submitGenerationRequest
} from './services/generationService.js';
import { BatchHistoryModal } from './history/BatchHistoryModal.jsx';
import { HistoryPanel } from './history/HistoryPanel.jsx';
import { CharacterPanel } from './characters/CharacterPanel.jsx';
import { CreateCharacterModal } from './characters/CreateCharacterModal.jsx';
import { ApiSettingsModal } from './settings/ApiSettingsModal.jsx';
import { ChatSidebar } from './chat/ChatSidebar.jsx';
import { LocalSaveNode } from './nodes/LocalSaveNode.jsx';
import { LowDetailNode } from './nodes/LowDetailNode.jsx';
import {
  base64ToBlobUrl,
  blobToDataURL,
  compressImage,
  getBase64FromUrl,
  getBlobFromUrl,
  getSora2CompliantSize,
  normalizeImageBlobToSize,
  processMaskForInpainting,
  resizeImageForVeo
} from './utils/mediaProcessing.js';

        function TapnowApp() {
            const [theme, setTheme] = useLocalStorage('tapnow_theme', 'dark', {
                serialize: String,
                deserialize: (value) => value || 'dark'
            });


            useEffect(() => {
                const root = document.documentElement;
                if (theme === 'dark') {
                    root.classList.add('theme-dark');
                    root.classList.remove('theme-light');
                    document.body.style.backgroundColor = '#09090b';
                } else {
                    root.classList.add('theme-light');
                    root.classList.remove('theme-dark');
                    document.body.style.backgroundColor = '#f4f4f5';
                }
            }, [theme]);

            const [isPerformanceMode, setPerformanceMode] = useLocalStorage('tapnow_performance_mode', false, {
                serialize: String,
                deserialize: (value) => value === 'true'
            });

            const [nodes, setNodes] = useState([]);
            const [connections, setConnections] = useState([]);
            const updateNodeSettings = useCallback((id, newSettings) => {
                setNodes((prev) => prev.map((n) => n.id === id ? { ...n, settings: { ...n.settings, ...newSettings } } : n));
            }, []);
            const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
            // 性能优化：使用 ref 存储 view 和拖拽状态，避免频繁 setState
            const viewRef = useRef({ x: 0, y: 0, zoom: 1 });
            const viewRafRef = useRef(null);
            const dragOffsetRef = useRef(new Map()); // nodeId -> { x, y }
            const dragStartPosRef = useRef(new Map()); // nodeId -> { x, y }
            const [selectedNodeId, setSelectedNodeId] = useState(null);

            const [apiConfigs, setApiConfigs] = useApiConfigs();
            const [globalApiKey, setGlobalApiKey] = useState(() => localStorage.getItem('tapnow_global_key') || '');

            // 即梦图生图使用本地文件设置（默认true，强制使用本地文件而不是URL）
            const [jimengUseLocalFile, setJimengUseLocalFile] = useLocalStorage('tapnow_jimeng_use_local_file', true, {
                serialize: String,
                deserialize: (value) => value !== null ? value === 'true' : true
            });

            // 项目名称状态
            const [projectName, setProjectName] = useLocalStorage('tapnow_project_name', '未命名项目', {
                serialize: String,
                deserialize: (value) => value || '未命名项目'
            });
            const [isEditingProjectName, setIsEditingProjectName] = useState(false);
            const projectNameInputRef = useRef(null);

            // 进度条状态
            const [progressState, setProgressState] = useState({
                visible: false,
                progress: 0,
                status: '',
                type: 'import' // 'import' | 'export'
            });

            const [history, setHistory] = useHistory();
            const {
                chatSessions,
                setChatSessions,
                currentChatId,
                setCurrentChatId,
                currentSession,
                chatInput,
                setChatInput,
                isChatOpen,
                setIsChatOpen,
                chatWidth,
                setChatWidth,
                chatFiles,
                setChatFiles,
                chatModel,
                setChatModel,
                isChatSending,
                setIsChatSending,
                chatSessionDropdownOpen,
                setChatSessionDropdownOpen,
            } = useChatSessions();

            const [lightboxItem, setLightboxItem] = useState(null);

            const {
                promptLibrary,
                setPromptLibrary,
                promptLibraryForm,
                setPromptLibraryForm,
                promptLibraryCollapsed,
                setPromptLibraryCollapsed,
                promptLibraryEditorOpen,
                setPromptLibraryEditorOpen,
            } = usePromptLibrary();

            // State management
            const [isPanning, setIsPanning] = useState(false);
            const [isDragging, setIsDragging] = useState(false);
            const [dragNodeId, setDragNodeId] = useState(null);
            const [resizingNodeId, setResizingNodeId] = useState(null);
            const [connectingSource, setConnectingSource] = useState(null);
            const [connectingTarget, setConnectingTarget] = useState(null); // 从输入端口开始的连接目标节点ID
            const [connectingInputType, setConnectingInputType] = useState(null); // 'default', 'oref', 'sref'
            const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
            const [hoverTargetId, setHoverTargetId] = useState(null);
            const [isMouseOverStoryboard, setIsMouseOverStoryboard] = useState(false); // 鼠标是否在智能分镜表窗口内

            // 框选相关状态
            const [isSelecting, setIsSelecting] = useState(false);
            const [selectionBox, setSelectionBox] = useState(null); // { startX, startY, endX, endY } (屏幕坐标)
            const [selectedNodeIds, setSelectedNodeIds] = useState(new Set()); // 多选节点ID集合
            const isSelectingRef = useRef(false); // 使用ref跟踪框选状态，确保即使Ctrl松开也能继续框选

            const [contextMenu, setContextMenu] = useState({ x: 0, y: 0, worldX: 0, worldY: 0, visible: false });
            const [historyContextMenu, setHistoryContextMenu] = useState({ visible: false, x: 0, y: 0, worldX: 0, worldY: 0, item: null });
            // 记录当前选中的分镜格，用于接收历史记录图片
            const [activeShot, setActiveShot] = useState({ nodeId: null, shotId: null });
            const [frameContextMenu, setFrameContextMenu] = useState({ visible: false, x: 0, y: 0, nodeId: null, frame: null });
            const [previewContextMenu, setPreviewContextMenu] = useState({ visible: false, x: 0, y: 0, item: null });
            const [inputImageContextMenu, setInputImageContextMenu] = useState({ visible: false, x: 0, y: 0, nodeId: null });
            const [settingsOpen, setSettingsOpen] = useState(false);
            const [historyOpen, setHistoryOpen] = useState(false);
            const [charactersOpen, setCharactersOpen] = useState(false);
            const [characterLibrary, setCharacterLibrary] = useCharacterLibrary();
            const {
                createCharacterOpen,
                setCreateCharacterOpen,
                createCharacterVideoSourceType,
                setCreateCharacterVideoSourceType,
                createCharacterVideoUrl,
                setCreateCharacterVideoUrl,
                createCharacterSelectedTaskId,
                setCreateCharacterSelectedTaskId,
                createCharacterHistoryDropdownOpen,
                setCreateCharacterHistoryDropdownOpen,
                createCharacterStartSecond,
                setCreateCharacterStartSecond,
                createCharacterEndSecond,
                setCreateCharacterEndSecond,
                createCharacterEndpoint,
                setCreateCharacterEndpoint,
                createCharacterSubmitting,
                setCreateCharacterSubmitting,
                createCharacterVideoError,
                setCreateCharacterVideoError,
                resetCreateCharacterForm
            } = useCreateCharacterForm();
            const [characterReferenceBarExpanded, setCharacterReferenceBarExpanded] = useState({});
            const [batchModalOpen, setBatchModalOpen] = useState(false);
            const [batchSelectedIds, setBatchSelectedIds] = useState(new Set());
            const [activeTool, setActiveTool] = useState('select');
            const [activeDropdown, setActiveDropdown] = useState(null);
            const nodeTimers = useNodeTimers(history);

            // 历史保存文件夹记忆
            const [savedFolderHistory, setSavedFolderHistory] = useLocalStorage('tapnow_saved_folder_history', []);

            // 框选节点右键菜单
            const [selectionContextMenu, setSelectionContextMenu] = useState({ visible: false, x: 0, y: 0 });

            // 性能模式：历史记录使用缩略图显示
            // 'off' = 关闭, 'normal' = 普通(150px/0.6), 'ultra' = 极致(80px/0.3)
            const [historyPerformanceMode, setHistoryPerformanceMode] = useLocalStorage('tapnow_history_performance_mode', 'normal', {
                serialize: String,
                deserialize: (value) => {
                    if (value === 'true') return 'normal';
                    if (value === 'false') return 'off';
                    return value || 'normal';
                }
            });

            const {
                localCacheServerConnected,
                localServerConfig,
                setLocalServerConfig,
                localCacheSettingsOpen,
                setLocalCacheSettingsOpen,
                updateLocalServerConfig,
            } = useLocalCacheServer({
                history,
                setHistory,
                characterLibrary,
                setCharacterLibrary,
            });

            const canvasRef = useRef(null);
            const lastMousePos = useRef({ x: 0, y: 0 });
            const chatEndRef = useRef(null);
            const nodesRef = useRef(nodes);
            const selectedNodeIdRef = useRef(selectedNodeId);
            const selectedNodeIdsRef = useRef(selectedNodeIds); // 存储多选节点ID的ref
            const connectionsRef = useRef(connections);
            const frameSelectionRef = useRef({});
            const copiedNodesRef = useRef(null); // 存储复制的节点数据
            const isPanningRef = useRef(false); // 使用ref跟踪画布拖动状态，避免状态丢失
            const panRafRef = useRef(null); // 画布拖动的 requestAnimationFrame
            const pendingPanUpdate = useRef(null); // 待处理的画布拖动更新
            const multiNodeDragStartPos = useRef(null); // 多节点拖动起始位置，用于防止累积误差
            const lastZoomRef = useRef(null); // 跟踪上次的 zoom 值，用于检测缩放切换

            // 添加文件夹到历史记录的函数
            const addFolderToHistory = useCallback((folder) => {
                if (!folder || folder.trim() === '') return;
                setSavedFolderHistory(prev => {
                    const filtered = prev.filter(f => f !== folder);
                    return [folder, ...filtered].slice(0, 10); // 最多保存10个
                });
            }, []);

            useHistoryThumbnails({ history, setHistory, historyPerformanceMode });

            // 全局 Delete 键删除节点
            useEffect(() => {
                const handleDeleteKey = (e) => {
                    // 防止在输入框中触发
                    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

                    // 检查是否按下了 Delete 或 Del 键
                    if (e.key === 'Delete' || e.key === 'Del') {
                        e.preventDefault();
                        e.stopPropagation();

                        const currentSelectedId = selectedNodeIdRef.current;
                        const currentSelectedIds = selectedNodeIdsRef.current;

                        // 删除选中的节点
                        if (currentSelectedId) {
                            deleteNode(currentSelectedId);
                            setSelectedNodeId(null);
                        } else if (currentSelectedIds && currentSelectedIds.size > 0) {
                            // 删除多选节点
                            currentSelectedIds.forEach(id => deleteNode(id));
                            setSelectedNodeIds(new Set());
                        }
                    }
                };

                window.addEventListener('keydown', handleDeleteKey);
                return () => {
                    window.removeEventListener('keydown', handleDeleteKey);
                };
            }, []);
            // 当视频 URL 改变时清除错误提示
            useEffect(() => {
                setCreateCharacterVideoError(null);
            }, [createCharacterVideoUrl, createCharacterSelectedTaskId, createCharacterVideoSourceType]);

            const debouncedSaveGlobalKey = useMemo(() => debounce((key) => {
                localStorage.setItem('tapnow_global_key', key);
            }, 1000), []);

            useEffect(() => { debouncedSaveGlobalKey(globalApiKey); }, [globalApiKey, debouncedSaveGlobalKey]);

            useEffect(() => {
                nodesRef.current = nodes;
                selectedNodeIdRef.current = selectedNodeId;
                selectedNodeIdsRef.current = selectedNodeIds; // 同步更新多选节点ref
                connectionsRef.current = connections;
                isSelectingRef.current = isSelecting; // 同步更新框选状态ref
            }, [nodes, selectedNodeId, selectedNodeIds, connections, isSelecting]);

            // 使用 useMemo 创建 nodes Map，优化节点查找性能（O(1) 查找）
            const nodesMap = useMemo(() => {
                const map = new Map();
                nodes.forEach(node => {
                    map.set(node.id, node);
                });
                return map;
            }, [nodes]);

            // 使用 useMemo 创建 apiConfigs Map，优化配置查找性能（O(1) 查找）
            const apiConfigsMap = useMemo(() => {
                const map = new Map();
                apiConfigs.forEach(config => {
                    map.set(config.id, config);
                });
                return map;
            }, [apiConfigs]);

            const {
                apiTesting,
                apiStatus,
                addNewModel,
                updateApiConfig,
                deleteApiConfig,
                testApiConnection,
                getStatusColor
            } = useApiConfigActions({
                apiConfigs,
                setApiConfigs,
                globalApiKey,
                defaultBaseUrl: DEFAULT_BASE_URL
            });

            // 使用 useMemo 创建 history Map，优化历史记录查找性能（O(1) 查找）
            const historyMap = useMemo(() => {
                const map = new Map();
                history.forEach(item => {
                    map.set(item.id, item);
                });
                return map;
            }, [history]);

            // 性能优化：计算可见节点（视口裁剪）
            const visibleNodes = useMemo(() => {
                return getVisibleNodes({
                    nodes,
                    canvasElement: canvasRef.current,
                    view: viewRef.current,
                });
            }, [nodes, view.x, view.y, view.zoom]);

            // 性能优化：根据 zoom 计算 LOD 细节等级
            const getDetailLevel = useCallback(getCanvasDetailLevel, []);

            // 同步 viewRef 和 view state
            useEffect(() => {
                viewRef.current = view;
            }, [view]);

            // 媒体降载：当节点完全离开视口时，隐藏其内部 img/video（保留骨架 DOM，不影响 React 状态）
            // 注意：节点本身仍由 visibleNodes 控制渲染范围（含 padding），这里只处理“仍在 padding 内但已离开可视区”的媒体开销
            const mediaObserverRef = useRef(null);
            const observedNodeElsRef = useRef(new Set());
            const mediaScanTimerRef = useRef(null);
            useEffect(() => {
                const rootEl = canvasRef.current;
                if (!rootEl) return;

                if (!mediaObserverRef.current) {
                    mediaObserverRef.current = new IntersectionObserver((entries) => {
                        entries.forEach((entry) => {
                            const el = entry.target;
                            // 完全离开视口：隐藏媒体
                            if (!entry.isIntersecting) {
                                el.classList.add('media-offscreen');
                            } else {
                                el.classList.remove('media-offscreen');
                            }
                        });
                    }, {
                        root: null,
                        threshold: 0
                    });
                }

                const obs = mediaObserverRef.current;

                // 节流扫描：避免在持续拖拽/缩放时频繁 querySelectorAll
                if (mediaScanTimerRef.current) clearTimeout(mediaScanTimerRef.current);
                mediaScanTimerRef.current = setTimeout(() => {
                    const nodeEls = rootEl.querySelectorAll('.node-wrapper');
                    nodeEls.forEach((el) => {
                        if (!observedNodeElsRef.current.has(el)) {
                            obs.observe(el);
                            observedNodeElsRef.current.add(el);
                        }
                    });
                    // 清理已卸载节点
                    Array.from(observedNodeElsRef.current).forEach((el) => {
                        if (!rootEl.contains(el)) {
                            try { obs.unobserve(el); } catch {}
                            observedNodeElsRef.current.delete(el);
                        }
                    });
                }, 120);

                return () => {
                    if (mediaScanTimerRef.current) {
                        clearTimeout(mediaScanTimerRef.current);
                        mediaScanTimerRef.current = null;
                    }
                };
            }, [visibleNodes]);

            // 使用 useMemo 缓存连接相关的计算，避免重复计算
            const connectionsByNode = useMemo(() => {
                const byNode = {
                    to: new Map(), // nodeId -> connections[]
                    from: new Map() // nodeId -> connections[]
                };
                connections.forEach(conn => {
                    if (!byNode.to.has(conn.to)) {
                        byNode.to.set(conn.to, []);
                    }
                    byNode.to.get(conn.to).push(conn);

                    if (!byNode.from.has(conn.from)) {
                        byNode.from.set(conn.from, []);
                    }
                    byNode.from.get(conn.from).push(conn);
                });
                return byNode;
            }, [connections]);

            useAutoLocalSave({
                nodes,
                connections,
                getConnectedInputImages,
                updateNodeSettings,
                isVideoUrl,
            });

            useMidjourneyAutoSplit({ history, setHistory });

            const { handleChatResizeStart } = useChatResize({ setChatWidth });
            useCanvasWheelGuards({ canvasRef, setView });

            const screenToWorld = useCallback((sx, sy) => {
                return screenToWorldPoint({
                    screenX: sx,
                    screenY: sy,
                    canvasElement: canvasRef.current,
                    view,
                });
            }, [view]);

            const handleMouseDown = (e) => {
                if (e.button === 0 || e.button === 1) {
                    if (e.currentTarget.id === 'canvas-bg') {
                        // 检查是否有文本选择，如果有则不启动拖动
                        const selection = window.getSelection();
                        if (selection && selection.toString().length > 0) {
                            return; // 如果有文本选择，不处理拖动
                        }

                        // 检查是否点击在可交互元素上（input, textarea, select, button等）
                        const target = e.target;
                        if (target && (
                            target.tagName === 'INPUT' ||
                            target.tagName === 'TEXTAREA' ||
                            target.tagName === 'SELECT' ||
                            target.tagName === 'BUTTON' ||
                            target.isContentEditable ||
                            target.closest('input, textarea, select, button, [contenteditable="true"]')
                        )) {
                            return; // 如果点击在可交互元素上，不处理拖动
                        }

                        // 检测Ctrl+鼠标左键，开始框选
                        if (e.button === 0 && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault();
                            setIsSelecting(true);
                            isSelectingRef.current = true; // 设置ref标志
                            setIsPanning(false);
                            const rect = canvasRef.current?.getBoundingClientRect();
                            const startX = e.clientX - (rect?.left || 0);
                            const startY = e.clientY - (rect?.top || 0);
                            setSelectionBox({ startX, startY, endX: startX, endY: startY });
                            setSelectedNodeIds(new Set()); // 清空之前的选择
                            setSelectedNodeId(null);
                            return;
                        }
                        // 普通拖动画布（只有在不是框选状态时才能拖拽）
                        // 修复：无论是否选中节点，只要点击的是 canvas-bg，都应该允许拖动
                        if (!isSelectingRef.current) {
                            setIsPanning(true);
                            isPanningRef.current = true; // 同步ref状态
                            setIsDragging(false);
                            lastMousePos.current = { x: e.clientX, y: e.clientY };
                        }
                    }
                }
            };

            const nodeUpdateRef = useRef(null);
            const nodeUpdateRaf = useRef(null);
            const multiNodeUpdateRef = useRef(null); // 多节点更新ref

            const flushNodeUpdate = useCallback(() => {
                // 优先处理多节点更新
                if (multiNodeUpdateRef.current) {
                    const updates = multiNodeUpdateRef.current;
                    // 处理大量节点时的性能优化：使用 Map 优化查找（O(1) 而不是 O(n)）
                    const nodeIdMap = new Map(updates.map(({ nodeId }) => [nodeId, true]));

                    setNodes((prev) => {
                        // 对于大量节点（50+），使用更高效的更新策略
                        if (prev.length > 50 && updates.length > 10) {
                            // 创建节点索引映射，避免重复查找
                            const nodeIndexMap = new Map();
                            prev.forEach((node, idx) => {
                                if (nodeIdMap.has(node.id)) {
                                    nodeIndexMap.set(node.id, idx);
                                }
                            });

                            // 批量更新，减少数组操作
                            const next = [...prev];
                            let hasChanges = false;
                            updates.forEach(({ nodeId, updater }) => {
                                const idx = nodeIndexMap.get(nodeId);
                                if (idx !== undefined) {
                                    const updatedNode = updater(next[idx]);
                                    if (updatedNode !== next[idx]) {
                                        next[idx] = updatedNode;
                                        hasChanges = true;
                                    }
                                }
                            });
                            return hasChanges ? next : prev;
                        } else {
                            // 少量节点时使用原有逻辑
                            const next = [...prev];
                            let hasChanges = false;
                            updates.forEach(({ nodeId, updater }) => {
                                const idx = next.findIndex((n) => n.id === nodeId);
                                if (idx !== -1) {
                                    const updatedNode = updater(next[idx]);
                                    if (updatedNode !== next[idx]) {
                                        next[idx] = updatedNode;
                                        hasChanges = true;
                                    }
                                }
                            });
                            return hasChanges ? next : prev;
                        }
                    });
                    multiNodeUpdateRef.current = null;
                    nodeUpdateRaf.current = null;
                    return;
                }

                if (!nodeUpdateRef.current) {
                    nodeUpdateRaf.current = null;
                    return;
                }
                const { nodeId, updater } = nodeUpdateRef.current;
                setNodes((prev) => {
                    const idx = prev.findIndex((n) => n.id === nodeId);
                    if (idx === -1) return prev;
                    // 使用函数式更新，避免创建新数组的开销
                    const updatedNode = updater(prev[idx]);
                    // 如果节点没有变化，直接返回原数组（引用相等检查）
                    if (updatedNode === prev[idx]) return prev;
                    const next = [...prev];
                    next[idx] = updatedNode;
                    return next;
                });
                nodeUpdateRef.current = null;
                nodeUpdateRaf.current = null;
            }, []);

            const scheduleNodeUpdate = useCallback((nodeId, updater) => {
                nodeUpdateRef.current = { nodeId, updater };
                if (!nodeUpdateRaf.current) {
                    nodeUpdateRaf.current = requestAnimationFrame(flushNodeUpdate);
                }
            }, [flushNodeUpdate]);

            const scheduleMultiNodeUpdate = useCallback((updates) => {
                // 处理竞态条件：如果已有待处理的更新，合并而不是覆盖
                // 这样可以确保快速连续操作时不会丢失更新
                if (multiNodeUpdateRef.current && nodeUpdateRaf.current) {
                    // 合并更新：对于相同的 nodeId，使用最新的 updater
                    const existingUpdates = multiNodeUpdateRef.current;
                    const updateMap = new Map();

                    // 先添加现有更新
                    existingUpdates.forEach(({ nodeId, updater }) => {
                        updateMap.set(nodeId, updater);
                    });

                    // 然后添加新更新（会覆盖相同 nodeId 的旧更新）
                    updates.forEach(({ nodeId, updater }) => {
                        updateMap.set(nodeId, updater);
                    });

                    // 转换回数组格式
                    multiNodeUpdateRef.current = Array.from(updateMap.entries()).map(([nodeId, updater]) => ({
                        nodeId,
                        updater
                    }));
                } else {
                    // 没有待处理的更新，直接设置
                    multiNodeUpdateRef.current = updates;
                }

                if (!nodeUpdateRaf.current) {
                    nodeUpdateRaf.current = requestAnimationFrame(flushNodeUpdate);
                }
            }, [flushNodeUpdate]);

            useEffect(() => {
                return () => {
                    if (nodeUpdateRaf.current) {
                        cancelAnimationFrame(nodeUpdateRaf.current);
                    }
                    if (panRafRef.current) {
                        cancelAnimationFrame(panRafRef.current);
                    }
                };
            }, []);

            // 使用 requestAnimationFrame 节流框选逻辑
            const selectionRafRef = useRef(null);
            const pendingSelectionUpdate = useRef(null);

            // 画布拖动微型节流：避免 rAF 包装 setView 导致的状态抖动（目标 ~10ms 一次）
            const panThrottleLastTsRef = useRef(0);

            const handleMouseMove = useCallback((e) => {
                const { clientX, clientY } = e;
                const worldPos = screenToWorld(clientX, clientY);
                setMousePos(worldPos);

                // 框选模式 - 使用 requestAnimationFrame 节流
                // 使用ref检查，确保即使Ctrl松开也能继续框选
                if (isSelecting || isSelectingRef.current) {
                    // 如果isSelecting为false但ref为true，说明Ctrl松开了，但框选应该继续
                    if (!isSelecting) {
                        setIsSelecting(true);
                    }
                    const rect = canvasRef.current?.getBoundingClientRect();
                    const endX = clientX - (rect?.left || 0);
                    const endY = clientY - (rect?.top || 0);

                    // 立即更新框选框位置（视觉反馈）
                    setSelectionBox(prev => {
                        if (!prev) return null;
                        return { ...prev, endX, endY };
                    });

                    // 节流节点选择计算
                    pendingSelectionUpdate.current = { endX, endY, rect };

                    if (!selectionRafRef.current) {
                        selectionRafRef.current = requestAnimationFrame(() => {
                            if (!pendingSelectionUpdate.current) {
                                selectionRafRef.current = null;
                                return;
                            }

                            const { endX, endY, rect } = pendingSelectionUpdate.current;
                            const currentSelectionBox = selectionBox;
                            if (!currentSelectionBox) {
                                selectionRafRef.current = null;
                                return;
                            }

                            // 计算被框选的节点
                            const boxStartX = Math.min(currentSelectionBox.startX, endX);
                            const boxStartY = Math.min(currentSelectionBox.startY, endY);
                            const boxEndX = Math.max(currentSelectionBox.startX, endX);
                            const boxEndY = Math.max(currentSelectionBox.startY, endY);

                            // 将屏幕坐标转换为世界坐标
                            const worldStart = screenToWorld(boxStartX + (rect?.left || 0), boxStartY + (rect?.top || 0));
                            const worldEnd = screenToWorld(boxEndX + (rect?.left || 0), boxEndY + (rect?.top || 0));

                            // 使用 ref 获取最新的 nodes，避免闭包问题
                            const currentNodes = nodesRef.current;
                            const selected = new Set();
                            currentNodes.forEach(node => {
                                const nodeRight = node.x + node.width;
                                const nodeBottom = node.y + node.height;
                                // 检查节点是否与框选框相交
                                if (node.x < worldEnd.x && nodeRight > worldStart.x &&
                                    node.y < worldEnd.y && nodeBottom > worldStart.y) {
                                    selected.add(node.id);
                                }
                            });
                            setSelectedNodeIds(selected);

                            pendingSelectionUpdate.current = null;
                            selectionRafRef.current = null;
                        });
                    }
                    return;
                }

                // 只有在不是框选状态时才能拖拽画布
                // 使用 ref 检查，确保即使状态更新延迟也能继续拖动
                if ((isPanning || isPanningRef.current) && !isSelectingRef.current) {
                    setIsDragging(true);
                    const dx = clientX - lastMousePos.current.x;
                    const dy = clientY - lastMousePos.current.y;

                    // 添加阈值判断，忽略微小移动（<1px）避免不必要的重渲染
                    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
                        return;
                    }

                    // 微型节流（约 10ms）：累积移动距离，确保 setView 更新频率低于浏览器渲染频率，减少抖动
                    if (pendingPanUpdate.current) {
                        pendingPanUpdate.current.dx += dx;
                        pendingPanUpdate.current.dy += dy;
                    } else {
                        pendingPanUpdate.current = { dx, dy };
                    }

                    const nowTs = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
                    const lastTs = panThrottleLastTsRef.current || 0;
                    if (nowTs - lastTs >= 10 && pendingPanUpdate.current) {
                        const { dx: accDx, dy: accDy } = pendingPanUpdate.current;
                        // 使用函数式更新，避免依赖 view
                        setView((prev) => {
                            const safeZoom = Math.max(0.2, Math.min(3.0, prev.zoom));
                            const precision = safeZoom < 0.5 || safeZoom > 2.5 ? 1000 : 100;
                            return {
                                ...prev,
                                zoom: safeZoom,
                                x: Math.round((prev.x + accDx) * precision) / precision,
                                y: Math.round((prev.y + accDy) * precision) / precision
                            };
                        });
                        pendingPanUpdate.current = null;
                        panThrottleLastTsRef.current = nowTs;
                    }

                    lastMousePos.current = { x: clientX, y: clientY };
                    return;
                }

                if (resizingNodeId) {
                    scheduleNodeUpdate(resizingNodeId, (node) => ({
                        ...node,
                        width: Math.max(250, worldPos.x - node.x),
                        height: Math.max(250, worldPos.y - node.y)
                    }));
                } else if (dragNodeId) {
                    // 确保 zoom 在有效范围内（0.2-3.0），防止极端缩放下的计算错误
                    const safeZoom = Math.max(0.2, Math.min(3.0, view.zoom));
                    // 使用 movementX/Y 更流畅，避免频繁计算
                    const deltaX = e.movementX / safeZoom;
                    const deltaY = e.movementY / safeZoom;
                    // 添加阈值，避免微小移动触发更新（提高到1px，减少不必要的更新）
                    // 在极端缩放下使用更小的阈值
                    const threshold = safeZoom < 0.5 || safeZoom > 2.5 ? 0.5 : 1;
                    if (Math.abs(deltaX) < threshold && Math.abs(deltaY) < threshold) {
                        return;
                    }

                    // 使用 ref 获取最新的多选节点集合，避免闭包问题
                    const currentSelectedNodeIds = selectedNodeIdsRef.current;
                    // 如果有多选节点（大于1个）且被拖动的节点在选中集合中，同时拖动所有选中的节点
                    if (currentSelectedNodeIds && currentSelectedNodeIds.size > 1 && currentSelectedNodeIds.has(dragNodeId)) {
                        // 拖动多个节点时，使用批量更新
                        // 使用累积的起始位置计算，防止累积误差
                        const currentNodes = nodesRef.current;
                        // 确保 zoom 在有效范围内（0.2-3.0），防止极端缩放下的计算错误
                        const currentZoom = Math.max(0.2, Math.min(3.0, view.zoom));
                        // 检测缩放切换：如果 zoom 发生变化，重新初始化起始位置，防止状态不一致
                        if (!multiNodeDragStartPos.current || (lastZoomRef.current !== null && Math.abs(lastZoomRef.current - currentZoom) > 0.01)) {
                            // 初始化或重新初始化起始位置（缩放切换时）
                            multiNodeDragStartPos.current = {
                                mouseX: clientX,
                                mouseY: clientY,
                                nodes: new Map(Array.from(currentSelectedNodeIds).map(nodeId => {
                                    const node = currentNodes.find(n => n.id === nodeId);
                                    return node ? [nodeId, { x: node.x, y: node.y }] : null;
                                }).filter(Boolean))
                            };
                        }
                        lastZoomRef.current = currentZoom;

                        // 计算从起始位置到当前位置的总偏移量（世界坐标）
                        const totalDeltaX = (clientX - multiNodeDragStartPos.current.mouseX) / currentZoom;
                        const totalDeltaY = (clientY - multiNodeDragStartPos.current.mouseY) / currentZoom;

                        // 使用起始位置 + 总偏移量，避免累积误差
                        const updates = Array.from(multiNodeDragStartPos.current.nodes.entries()).map(([nodeId, startPos]) => ({
                            nodeId,
                            updater: (node) => ({
                                ...node,
                                x: startPos.x + totalDeltaX,
                                y: startPos.y + totalDeltaY
                            })
                        }));
                        scheduleMultiNodeUpdate(updates);
                    } else {
                        // 单节点拖动，重置多节点拖动状态
                        multiNodeDragStartPos.current = null;
                        scheduleNodeUpdate(dragNodeId, (node) => ({
                            ...node,
                            x: node.x + deltaX,
                            y: node.y + deltaY
                        }));
                    }
                }
            }, [isPanning, isSelecting, selectionBox, dragNodeId, resizingNodeId, screenToWorld, view.zoom, scheduleNodeUpdate, scheduleMultiNodeUpdate]);

            const handleMouseUp = () => {
                // 清理画布拖动的 requestAnimationFrame
                if (panRafRef.current) {
                    cancelAnimationFrame(panRafRef.current);
                    panRafRef.current = null;
                }
                // 处理待处理的画布拖动更新
                if (pendingPanUpdate.current) {
                    const { dx, dy } = pendingPanUpdate.current;
                    // 使用 Math.round 处理高缩放级别下的浮点数精度问题
                    // 添加 zoom 边界检查，防止极端缩放下的位置漂移
                    setView((prev) => {
                        // 确保 zoom 在有效范围内（0.2-3.0）
                        const safeZoom = Math.max(0.2, Math.min(3.0, prev.zoom));
                        // 在极端缩放下使用更高精度的舍入
                        const precision = safeZoom < 0.5 || safeZoom > 2.5 ? 1000 : 100;
                        return {
                            ...prev,
                            zoom: safeZoom,
                            x: Math.round((prev.x + dx) * precision) / precision,
                            y: Math.round((prev.y + dy) * precision) / precision
                        };
                    });
                    pendingPanUpdate.current = null;
                }

                // 确保多节点更新被刷新（处理待处理的更新）
                if (multiNodeUpdateRef.current && nodeUpdateRaf.current) {
                    // 取消当前的 RAF，立即执行更新
                    cancelAnimationFrame(nodeUpdateRaf.current);
                    flushNodeUpdate();
                }

                // 结束框选
                if (isSelecting || isSelectingRef.current) {
                    setIsSelecting(false);
                    isSelectingRef.current = false; // 重置 ref 状态
                    setSelectionBox(null);
                    // 如果只选中一个节点，设置selectedNodeId
                    if (selectedNodeIds.size === 1) {
                        const nodeId = Array.from(selectedNodeIds)[0];
                        setSelectedNodeId(nodeId);
                    } else if (selectedNodeIds.size === 0) {
                        setSelectedNodeId(null);
                    }
                    // 确保清理拖动状态
                    setIsDragging(false);
                    setIsPanning(false);
                    isPanningRef.current = false;
                    // 清理多节点拖动状态
                    multiNodeDragStartPos.current = null;
                    // 清理 zoom 跟踪，防止缩放切换导致的状态不一致
                    lastZoomRef.current = null;
                    return;
                }

                if (isPanning || isPanningRef.current) {
                    setIsPanning(false);
                    isPanningRef.current = false;
                    setIsDragging(false); // 确保清理拖动状态
                    if (!connectingSource && !connectingTarget && !dragNodeId && !resizingNodeId) {
                        setSelectedNodeId(null);
                        setSelectedNodeIds(new Set());
                        setContextMenu(prev => ({ ...prev, visible: false }));
                        setActiveDropdown(null);
                        setHistoryContextMenu(prev => ({ ...prev, visible: false }));
                    }
                }
                if (!connectingSource && !connectingTarget) {
                    setDragNodeId(null);
                    setResizingNodeId(null);
                    // 清理多节点拖动状态
                    multiNodeDragStartPos.current = null;
                    // 清理 zoom 跟踪
                    lastZoomRef.current = null;
                }
                // 确保在所有情况下都清理拖动状态
                setIsDragging(false);
                // 重置 isSelectingRef（防止状态残留）
                isSelectingRef.current = false;
                // 重置 lastMousePos，防止状态残留导致后续拖动异常
                // 注意：不重置为 null，而是重置为初始值，保持类型一致
                lastMousePos.current = { x: 0, y: 0 };
            };

            // 优化后的全局指针事件监听：解决拖动中断和连线不跟随的问题
            // 使用 pointermove/pointerup 代替 mousemove/mouseup，性能更好且支持触摸
            useEffect(() => {
                // 定义需要全局监听的状态（使用 ref 确保状态不丢失）
                const isInteracting = isPanning || isPanningRef.current || isDragging || dragNodeId || resizingNodeId || isSelecting || isSelectingRef.current || connectingSource || connectingTarget;

                if (!isInteracting) return;

                const handleGlobalPointerMove = (e) => {
                    // 确保在任何交互状态下都更新鼠标位置
                    // pointer 事件和 mouse 事件在大多数属性上是兼容的，直接传递即可
                    // 如果 movementX/Y 不存在，则使用 0（不影响功能，因为画布拖动使用 clientX/Y 差值）
                    if (e.movementX === undefined) {
                        e.movementX = 0;
                    }
                    if (e.movementY === undefined) {
                        e.movementY = 0;
                    }
                    handleMouseMove(e);
                };

                const handleGlobalMouseMove = (e) => {
                    // mousemove 事件处理（降级方案）
                    handleMouseMove(e);
                };

                const handleGlobalPointerUp = () => {
                    handleMouseUp();
                };

                const handleGlobalMouseUp = () => {
                    // mouseup 事件处理（降级方案）
                    handleMouseUp();
                };

                // 绑定到 window，确保鼠标移出浏览器或 canvas 区域也能响应
                // 优先使用 pointermove/pointerup 获得更好的性能和触摸支持
                window.addEventListener('pointermove', handleGlobalPointerMove, { passive: false });
                window.addEventListener('pointerup', handleGlobalPointerUp, { passive: false });
                // 保留 mousemove/mouseup 作为降级方案，确保兼容性
                window.addEventListener('mousemove', handleGlobalMouseMove, { passive: false });
                window.addEventListener('mouseup', handleGlobalMouseUp, { passive: false });

                return () => {
                    window.removeEventListener('pointermove', handleGlobalPointerMove);
                    window.removeEventListener('pointerup', handleGlobalPointerUp);
                    window.removeEventListener('mousemove', handleGlobalMouseMove);
                    window.removeEventListener('mouseup', handleGlobalMouseUp);
                };
            }, [isPanning, isDragging, dragNodeId, resizingNodeId, isSelecting, connectingSource, connectingTarget, handleMouseMove, handleMouseUp]);

            const handleNodeMouseUp = useCallback((targetId, e, inputType = 'default') => {
                e.stopPropagation();
                // 从输出端口连接到输入端口（原有逻辑）
                if (connectingSource && connectingSource !== targetId) {
                    // 检查是否已存在相同输入点的连接
                    const exists = connections.some((c) =>
                        c.from === connectingSource &&
                        c.to === targetId &&
                        (c.inputType || 'default') === inputType
                    );
                    if (!exists) {
                        // 如果连接到特定输入点，先删除该输入点的旧连接
                        if (inputType !== 'default') {
                            setConnections((prev) => prev.filter((c) =>
                                !(c.to === targetId && (c.inputType || 'default') === inputType)
                            ));
                        }
                        setConnections((prev) => [...prev, {
                            id: `conn-${Date.now()}`,
                            from: connectingSource,
                            to: targetId,
                            inputType: inputType !== 'default' ? inputType : undefined
                        }]);
                    }
                }
                // 从输入端口连接到输出端口（新功能）
                else if (connectingTarget && connectingTarget !== targetId) {
                    // 使用connectingInputType而不是inputType参数（因为是从输入端口开始的连接）
                    const actualInputType = connectingInputType || inputType;
                    // 检查是否已存在相同输入点的连接
                    const exists = connections.some((c) =>
                        c.from === targetId &&
                        c.to === connectingTarget &&
                        (c.inputType || 'default') === actualInputType
                    );
                    if (!exists) {
                        // 如果连接到特定输入点，先删除该输入点的旧连接
                        if (actualInputType !== 'default') {
                            setConnections((prev) => prev.filter((c) =>
                                !(c.to === connectingTarget && (c.inputType || 'default') === actualInputType)
                            ));
                        }
                        setConnections((prev) => [...prev, {
                            id: `conn-${Date.now()}`,
                            from: targetId,
                            to: connectingTarget,
                            inputType: actualInputType !== 'default' ? actualInputType : undefined
                        }]);
                    }
                }
                setConnectingSource(null);
                setConnectingTarget(null);
                setConnectingInputType(null);
                setHoverTargetId(null);
                setIsPanning(false);
                setDragNodeId(null);
                setResizingNodeId(null);
            }, [connectingSource, connectingTarget, connectingInputType, connections]);

            const handleBackgroundClick = (e) => {
                if (connectingSource) {
                    const world = screenToWorld(e.clientX, e.clientY);
                    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, worldX: world.x, worldY: world.y, sourceNodeId: connectingSource });
                    setConnectingSource(null);
                } else if (connectingTarget) {
                    // 从输入端口开始的连接，点击背景时弹出参考图窗口
                    const world = screenToWorld(e.clientX, e.clientY);
                    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, worldX: world.x, worldY: world.y, targetNodeId: connectingTarget, inputType: connectingInputType });
                    setConnectingTarget(null);
                    setConnectingInputType(null);
                }
            };

            const handleDoubleClick = (e) => {
                if (e.currentTarget.id === 'canvas-bg') {
                    const world = screenToWorld(e.clientX, e.clientY);
                    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, worldX: world.x, worldY: world.y, sourceNodeId: undefined });
                }
            };

            // 使用 useMemo 缓存连接图片的计算结果，避免重复计算
            const connectedImagesCache = useMemo(() => {
                return buildConnectedImagesCache({
                    connections,
                    nodesMap,
                    history,
                });
            }, [connections, nodesMap, nodes.length, history, nodes.map(n => `${n.id}:${n.type}:${n.content ? 'hasContent' : ''}:${n.selectedKeyframes?.length || 0}:${n.frames?.length || 0}:${n.selectedPreviewImage || ''}:${n.previewMjImages?.length || 0}`).join('|')]);

            function getConnectedInputImages(targetNodeId, inputType = 'default') {
                return getConnectedInputImagesFromCache(connectedImagesCache, targetNodeId, inputType);
            }

            // 使用 useMemo 缓存 video-input 节点查找结果
            const connectedVideoInputCache = useMemo(() => {
                return buildConnectedNodeTypeCache({
                    connections,
                    nodesMap,
                    nodeType: 'video-input',
                });
            }, [connections, nodesMap]);

            // 获取连接的 video-input 节点（用于 video-analyze 节点）
            const getConnectedVideoInputNode = useCallback((targetNodeId) => {
                return connectedVideoInputCache.get(targetNodeId) || null;
            }, [connectedVideoInputCache]);

            // 获取连接的 video-analyze 节点（用于 storyboard-node 节点）
            const getConnectedVideoAnalyzeNode = useCallback((targetNodeId) => {
                return findConnectedNodeOfType({
                    connections,
                    nodesMap,
                    targetNodeId,
                    nodeType: 'video-analyze',
                });
            }, [connections, nodesMap]);

            // 功能2：获取连接的文字节点内容
            const getConnectedTextNodes = useCallback((targetNodeId) => {
                return getConnectedTextNodeContents({
                    connections,
                    nodesMap,
                    targetNodeId,
                });
            }, [connections, nodesMap]);

            // 使用 useMemo 缓存特定输入点的图片URL
            const connectedImageForInputCache = useMemo(() => {
                return buildConnectedImageForInputCache({
                    connections,
                    nodesMap,
                });
            }, [connections, nodesMap, nodes.length, nodes.map(n => `${n.id}:${n.type}:${n.content ? 'hasContent' : ''}:${n.selectedKeyframes?.[0]?.url || ''}:${n.frames?.[0]?.url || ''}`).join('|')]);

            // 获取连接到特定输入点的图片URL
            const getConnectedImageForInput = useCallback((targetNodeId, inputType) => {
                return getConnectedImageForInputFromCache(connectedImageForInputCache, targetNodeId, inputType || 'default');
            }, [connectedImageForInputCache]);


            // 将生成结果同步到连接的预览节点
            const updatePreviewFromTask = (taskId, url, contentType = 'image', sourceNodeIdOverride = null, mjImages = null) => {
                if (!url && (!mjImages || mjImages.length === 0)) return;
                // 找到对应的源节点ID
                let sourceNodeId = sourceNodeIdOverride;
                if (!sourceNodeId) {
                    const historyItem = historyMap.get(taskId);
                    sourceNodeId = historyItem?.sourceNodeId;
                }
                if (!sourceNodeId) {
                    console.warn('[Tapnow] updatePreviewFromTask: 未找到 sourceNodeId for taskId:', taskId);
                    return;
                }

                // 检查是否是从分镜表触发的生成，如果是则回填到分镜表
                // 使用 setTimeout 确保在下一个事件循环中执行，此时 nodes 和 connections 已更新
                setTimeout(() => {
                    const sourceNode = nodesMap.get(sourceNodeId);
                    if (sourceNode && (sourceNode.type === 'gen-image' || sourceNode.type === 'gen-video')) {
                        // 查找连接到该生成节点的分镜表节点
                        const storyboardConnections = connections.filter(c => c.to === sourceNodeId);
                        for (const conn of storyboardConnections) {
                            const fromNode = nodesMap.get(conn.from);
                            const storyboardNode = fromNode && fromNode.type === 'storyboard-node' ? fromNode : null;
                            if (storyboardNode && storyboardNode.settings?.shots) {
                                // 查找状态为 generating 的 shot，回填结果
                                const generatingShot = storyboardNode.settings.shots.find(s => s.status === 'generating');
                                if (generatingShot) {
                                    const finalUrl = url || (mjImages && mjImages.length > 0 ? mjImages[0] : null);
                                    if (finalUrl) {
                                        updateShot(storyboardNode.id, generatingShot.id, {
                                            image_url: finalUrl,
                                            status: 'done'
                                        });
                                        break; // 只回填第一个找到的
                                    }
                                }
                            }
                        }
                    }
                }, 0);

                // 使用 ref 获取最新的 connections 状态，避免闭包问题
                const latestConnections = connectionsRef.current;
                console.log('[Tapnow] updatePreviewFromTask: 更新预览窗口', { taskId, url, contentType, sourceNodeId, mjImages, connectionsCount: latestConnections.length });

                // 使用函数式更新，确保获取最新的 connections 状态
                setNodes((prevNodes) => {
                    // 使用 ref 中的最新 connections
                    const targetIds = latestConnections
                        .filter((c) => c.from === sourceNodeId)
                        .map((c) => c.to);

                    console.log('[Tapnow] updatePreviewFromTask: 检查连接', {
                        sourceNodeId,
                        allConnectionsFromSource: latestConnections.filter(c => c.from === sourceNodeId),
                        targetIds,
                        allNodes: prevNodes.map(n => ({ id: n.id, type: n.type }))
                    });

                    if (!targetIds.length) {
                        console.warn('[Tapnow] updatePreviewFromTask: 未找到连接到预览窗口的连接', {
                            sourceNodeId,
                            connectionsFromSource: latestConnections.filter(c => c.from === sourceNodeId),
                            allConnections: latestConnections
                        });
                        return prevNodes;
                    }

                    const previewNodes = prevNodes.filter(n => targetIds.includes(n.id) && n.type === 'preview');
                    console.log('[Tapnow] updatePreviewFromTask: 找到预览节点', {
                        targetIds,
                        previewNodes: previewNodes.map(n => ({ id: n.id, type: n.type }))
                    });

                    return prevNodes.map((n) =>
                        targetIds.includes(n.id) && n.type === 'preview'
                            ? { ...n, content: url || (mjImages && mjImages.length > 0 ? mjImages[0] : url), previewType: contentType, previewMjImages: mjImages }
                            : n
                    );
                });
            };

            const deleteHistoryItem = (id) => {
                setHistory(prev => {
                    const filtered = prev.filter(item => item.id !== id);
                    // 立即保存到 localStorage，不等待防抖
                    try {
                        localStorage.setItem('tapnow_history', JSON.stringify(filtered));
                    } catch (e) {
                        console.error('立即保存历史记录失败:', e);
                    }
                    return filtered;
                });
                if (historyContextMenu.item && historyContextMenu.item.id === id) {
                    setHistoryContextMenu({ visible: false, x: 0, y: 0, item: null });
                }
            };

            const scrollToBottom = () => {
                chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
            };

            useEffect(() => {
                scrollToBottom();
            }, [currentSession?.messages, isChatOpen]);

            const createNewChat = () => {
                const newId = `chat-${Date.now()}`;
                const newSession = { id: newId, title: '新对话', messages: [] };
                setChatSessions(prev => [newSession, ...prev]);
                setCurrentChatId(newId);
            };

            const deleteChatSession = (e, id) => {
                e.stopPropagation();
                const newSessions = chatSessions.filter(s => s.id !== id);
                if (newSessions.length === 0) {
                    const defaultSession = { id: 'default', title: '新对话', messages: [] };
                    setChatSessions([defaultSession]);
                    setCurrentChatId('default');
                } else {
                    setChatSessions(newSessions);
                    if (currentChatId === id) setCurrentChatId(newSessions[0].id);
                }
            };

            const handleChatFileUpload = (e) => {
                const files = Array.from(e.target.files);
                files.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        const content = ev.target.result;
                        setChatFiles(prev => [...prev, createUploadedChatFile({ file, content })]);
                    };

                    // 根据文件类型选择读取方式
                    if (file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.startsWith('audio/')) {
                        reader.readAsDataURL(file);
                    } else if (file.type === 'application/pdf') {
                        // PDF 也转换为 data URL
                        reader.readAsDataURL(file);
                    } else if (file.name.match(/\.(txt|md|js|jsx|ts|tsx|py|html|css|json|csv|xml|yaml|yml|sh|bash|java|cpp|c)$/i)) {
                        // 代码和文本文件读取为文本
                        reader.readAsText(file);
                    } else {
                        // 其他文件（如 Word、Excel）也尝试读取为 data URL
                        reader.readAsDataURL(file);
                    }
                });
                e.target.value = '';
            };

            const removeChatFile = (index) => {
                setChatFiles(prev => prev.filter((_, i) => i !== index));
            };

            const sendChatMessage = async () => {
                if ((!chatInput.trim() && chatFiles.length === 0) || isChatSending) return;

                const config = apiConfigsMap.get(chatModel);
                const apiKey = config?.key || globalApiKey;
                const baseUrl = (config?.url || DEFAULT_BASE_URL).replace(/\/+$/, '');

                if (!apiKey) {
                    alert('请先在 API 设置中配置 Key');
                    setSettingsOpen(true);
                    return;
                }

                // 确保使用当前激活的会话（避免新建对话后第一条消息被写入旧会话）
                const chatIdToUse = currentChatId || chatSessions[0]?.id;
                const sessionToUse = chatSessions.find(s => s.id === chatIdToUse) || chatSessions[0];
                const currentSessionMessages = sessionToUse?.messages || [];
                if (sessionToUse && sessionToUse.id !== currentChatId) setCurrentChatId(sessionToUse.id);

                setIsChatSending(true);

                const newUserMsg = {
                    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    role: 'user',
                    content: chatInput,
                    files: [...chatFiles],
                    timestamp: Date.now(),
                    modelId: chatModel // 保存发送消息时使用的模型ID
                };

                setChatSessions(prev => prev.map(s => {
                    if (s.id === chatIdToUse) {
                        return { ...s, messages: [...s.messages, newUserMsg], title: s.messages.length === 0 ? chatInput.slice(0, 20) : s.title };
                    }
                    return s;
                }));
                setChatInput('');
                setChatFiles([]);

                // 构建带上下文的对话历史，帮助模型回顾上下文
                // 使用当前会话的消息加上新消息
                const allMessages = [...currentSessionMessages, newUserMsg];
                const MAX_HISTORY_MESSAGES = 20;
                const recentMessages = allMessages.length > MAX_HISTORY_MESSAGES
                    ? allMessages.slice(-MAX_HISTORY_MESSAGES)
                    : allMessages;

                let apiMessages = [
                    {
                        role: 'system',
                        content: '你是一名多模态AI助手，需要结合整个对话的上下文进行连续回答。'
                    },
                    ...recentMessages.map(m => ({
                        role: m.role,
                        content: m.content
                    }))
                ];

                const currentContent = [];
                if (newUserMsg.content) currentContent.push({ type: "text", text: newUserMsg.content });

                newUserMsg.files.forEach(f => {
                    const isGeminiLike = (config?.modelName ?? '').toLowerCase().includes('gemini');

                    if (f.isImage) {
                        currentContent.push({
                            type: "image_url",
                            image_url: { url: f.content }
                        });
                    } else if (f.isVideo) {
                        if (isGeminiLike) {
                            // Gemini 视频分析：按官方规范也走 image_url，url 直接指向 mp4
                            currentContent.push({
                                type: "image_url",
                                image_url: { url: f.content }
                            });
                        } else {
                            currentContent.push({
                                type: "text",
                                text: `\n[User attached video: ${f.name}]\n`
                            });
                        }
                    } else if (f.isAudio) {
                        currentContent.push({
                            type: "text",
                            text: `\n[User attached audio: ${f.name}]\n`
                        });
                    } else if (f.isPDF || f.isDoc || f.isExcel) {
                        // PDF、Word、Excel 等文档文件，发送文件名和类型信息
                        currentContent.push({
                            type: "text",
                            text: `\n[User attached document: ${f.name} (${f.isPDF ? 'PDF' : f.isDoc ? 'Word' : 'Excel'})]\n`
                        });
                    } else if (f.isCode || (f.content && typeof f.content === 'string' && f.content.length < 50000)) {
                        // 代码文件或文本文件，直接发送内容
                        currentContent.push({
                            type: "text",
                            text: `\n[File: ${f.name}]\n\`\`\`${f.fileExt || 'text'}\n${f.content}\n\`\`\`\n`
                        });
                    } else {
                        // 其他文件或二进制文件
                        currentContent.push({
                            type: "text",
                            text: `\n[User attached file: ${f.name}]\n`
                        });
                    }
                });

                apiMessages.push({ role: 'user', content: currentContent });

                try {
                    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: config?.modelName || 'gemini-3-pro-preview',
                            messages: apiMessages,
                            stream: false
                        })
                    });

                    if (!response.ok) {
                        const errText = await response.text();
                        throw new Error(errText || `API Error: ${response.status}`);
                    }

                    const data = await response.json();
                    // 支持多种响应格式
                    let aiContent = null;
                    if (data.choices && data.choices.length > 0) {
                        // OpenAI 格式: data.choices[0].message.content
                        aiContent = data.choices[0]?.message?.content;
                    } else if (data.content) {
                        // 直接 content 字段
                        aiContent = data.content;
                    } else if (data.text) {
                        // text 字段
                        aiContent = data.text;
                    } else if (data.message) {
                        // message 字段
                        aiContent = typeof data.message === 'string' ? data.message : data.message.content;
                    } else if (data.result) {
                        // result 字段
                        aiContent = typeof data.result === 'string' ? data.result : data.result.content;
                    } else if (data.data?.choices?.[0]?.message?.content) {
                        // 嵌套 data.choices 格式
                        aiContent = data.data.choices[0].message.content;
                    } else if (data.data?.content) {
                        // 嵌套 data.content 格式
                        aiContent = data.data.content;
                    } else if (data.data?.text) {
                        // 嵌套 data.text 格式
                        aiContent = data.data.text;
                    } else if (data.data?.message) {
                        // 嵌套 data.message 格式
                        aiContent = typeof data.data.message === 'string' ? data.data.message : data.data.message.content;
                    } else if (data.data?.result) {
                        // 嵌套 data.result 格式
                        aiContent = typeof data.data.result === 'string' ? data.data.result : data.data.result.content;
                    }

                    if (!aiContent || aiContent.trim() === '') {
                        console.error('[聊天] API 响应内容为空:', data);
                        aiContent = "No response";
                    }

                    const newAssistantMsg = {
                        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        role: 'assistant',
                        content: aiContent,
                        timestamp: Date.now(),
                        modelId: chatModel // 保存回复消息时使用的模型ID
                    };

                    setChatSessions(prev => prev.map(s => {
                        if (s.id === currentChatId) {
                            return { ...s, messages: [...s.messages, newAssistantMsg] };
                        }
                        return s;
                    }));

                } catch (error) {
                    console.error("Chat Error", error);
                    const errorMsg = {
                        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        role: 'assistant',
                        content: `Error: ${error.message}`,
                        isError: true,
                        timestamp: Date.now()
                    };

                    setChatSessions(prev => prev.map(s => {
                        if (s.id === currentChatId) {
                            return { ...s, messages: [...s.messages, errorMsg] };
                        }
                        return s;
                    }));
                } finally {
                    setIsChatSending(false);
                }
            };

            const disconnectConnection = useCallback((connectionId) => {
                setConnections(prev => {
                    const filtered = prev.filter(conn => conn.id !== connectionId);
                    // 触发节点重新渲染，确保引用成功区域正确更新
                    return filtered;
                });
            }, []);

            const handleDrop = (nodeId, e) => {
                e.preventDefault(); e.stopPropagation();
                e.currentTarget.classList.remove('drag-over');
                const files = Array.from(e.dataTransfer.files);
                const imageFiles = files.filter(file => file.type.startsWith('image/'));
                if (imageFiles.length > 0) {
                    const file = imageFiles[0];
                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                        const content = ev.target.result;
                        let dimensions = { w: 0, h: 0 };
                        try { dimensions = await getImageDimensions(content); } catch (e) {}
                        setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, content: content, dimensions } : n));
                    };
                    reader.readAsDataURL(file);
                }
            };

            const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('drag-over'); };
            const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('drag-over'); };

            // 优化后的复制粘贴逻辑
            useEffect(() => {
                const hasCopiedNodes = () => {
                    const copied = copiedNodesRef.current;
                    return copied?.nodes && copied.nodes.length > 0;
                };

                const pasteCopiedNodesAtCanvasCenter = (event) => {
                    if (!hasCopiedNodes()) return false;

                    event.preventDefault();
                    event.stopPropagation();

                    const pastePoint = getCanvasCenterWorldPoint({
                        canvasElement: canvasRef.current,
                        view,
                    });
                    const cloned = cloneClipboardPayloadAtPoint({
                        payload: copiedNodesRef.current,
                        pastePoint,
                    });

                    if (cloned.nodes.length === 0) return false;

                    setNodes((prev) => [...prev, ...cloned.nodes]);
                    setConnections((prev) => [...prev, ...cloned.connections]);

                    if (cloned.nodes.length === 1) {
                        setSelectedNodeId(cloned.nodes[0].id);
                        setSelectedNodeIds(new Set([cloned.nodes[0].id]));
                    } else {
                        setSelectedNodeId(null);
                        setSelectedNodeIds(new Set(cloned.nodes.map((node) => node.id)));
                    }

                    console.log(`已粘贴 ${cloned.nodes.length} 个节点`);
                    return true;
                };

                // 复制功能（Ctrl+C / Cmd+C）
                const handleCopy = async (e) => {
                    // 优先级1：文本输入框 - 如果有选中文本，使用浏览器默认行为
                    if (isEditableElement(e.target)) {
                        const selection = window.getSelection();
                        if (selection && selection.toString().trim()) {
                            // 有选中文本，让浏览器默认处理
                            return;
                        }
                        // 没有选中文本，不触发任何动作
                        e.preventDefault();
                        return;
                    }

                    // 优先级2和3：节点复制（包括所有类型的节点）
                    const selectedIds = getSelectedNodeIdsForClipboard({
                        selectedNodeId: selectedNodeIdRef.current,
                        selectedNodeIds: selectedNodeIdsRef.current,
                    });

                    if (selectedIds.length > 0) {
                        e.preventDefault();
                        e.stopPropagation();
                        copiedNodesRef.current = createClipboardPayload({
                            nodes: nodesRef.current,
                            connections: connectionsRef.current,
                            selectedIds,
                        });

                        // 可选：给用户反馈
                        console.log(`已复制 ${copiedNodesRef.current.nodes.length} 个节点`);
                    }
                };

                // 粘贴功能（Ctrl+V / Cmd+V）
                const handlePaste = async (e) => {
                    // 优先级1：文本输入框 - 使用浏览器默认行为
                    if (isEditableElement(e.target)) {
                        // 让浏览器默认处理文本粘贴
                        return;
                    }

                    // 优先级2：图像节点截图粘贴
                    const currentSelectedId = selectedNodeIdRef.current;
                    let targetNode = null;
                    if (currentSelectedId) {
                        targetNode = nodesRef.current.find(n => n.id === currentSelectedId);
                    }
                    // 如果选中了图像或视频节点，尝试粘贴图像/视频
                    if (targetNode && (targetNode.type === 'input-image' || targetNode.type === 'video-input')) {
                        const items = Array.from(e.clipboardData?.items || []);
                        const imageItem = items.find(item => item.type.startsWith('image/'));
                        const videoItem = items.find(item => item.type.startsWith('video/'));

                        if (imageItem && targetNode.type === 'input-image') {
                            e.preventDefault();
                            const file = imageItem.getAsFile();
                            if (file) {
                                const reader = new FileReader();
                                reader.onload = async (ev) => {
                                    const content = ev.target.result;
                                    let dimensions = { w: 0, h: 0 };
                                    try {
                                        dimensions = await getImageDimensions(content);
                                    } catch (e) {}
                                    setNodes((prev) => prev.map((n) =>
                                        n.id === targetNode.id
                                            ? { ...n, content: content, dimensions }
                                            : n
                                    ));
                                };
                                reader.readAsDataURL(file);
                            }
                            return;
                        } else if (videoItem && targetNode.type === 'video-input') {
                            e.preventDefault();
                            const file = videoItem.getAsFile();
                            if (file) {
                                handleVideoFileUpload(targetNode.id, file);
                            }
                            return;
                        }
                    }

                    // 优先级3：节点粘贴
                    pasteCopiedNodesAtCanvasCenter(e);
                };

                // 添加keydown事件监听，确保Ctrl+V/Cmd+V能触发节点粘贴
                const handleKeyDown = (e) => {
                    // 如果不在文本输入框中，且按下了Ctrl+V或Cmd+V
                    if (!isEditableElement(e.target) && (e.ctrlKey || e.metaKey) && e.key === 'v') {
                        // 先检查是否选中了图像节点，如果是，让paste事件处理图像粘贴
                        const currentSelectedId = selectedNodeIdRef.current;
                        if (currentSelectedId) {
                            const targetNode = nodesRef.current.find(n => n.id === currentSelectedId);
                            if (targetNode && (targetNode.type === 'input-image' || targetNode.type === 'video-input')) {
                                // 选中了图像节点，让paste事件处理，不在这里处理
                                return;
                            }
                        }

                        // 检查是否有复制的节点
                        pasteCopiedNodesAtCanvasCenter(e);
                    }
                };

                window.addEventListener('copy', handleCopy);
                window.addEventListener('paste', handlePaste);
                window.addEventListener('keydown', handleKeyDown);

                return () => {
                    window.removeEventListener('copy', handleCopy);
                    window.removeEventListener('paste', handlePaste);
                    window.removeEventListener('keydown', handleKeyDown);
                };
            }, [updateNodeSettings, setNodes, setConnections, setSelectedNodeId, setSelectedNodeIds, view]);

            const pollVeoJob = async (jobId, taskId, baseUrl, apiKey, w, h, attempt = 0) => {
                const maxAttempts = 90; // 增加到90次，支持最长360秒（6分钟）的生成时间
                const delayMs = 4000;

                if (attempt > maxAttempts) {
                    setHistory((prev) => prev.map((hItem) => hItem.id === taskId ? { ...hItem, status: 'failed', errorMsg: 'Veo 轮询超时' } : hItem));

                    // 检查是否是分镜表的任务，如果是则更新状态为 draft
                    const storyboardTask = storyboardTaskMapRef.current.get(taskId);
                    if (storyboardTask) {
                        console.log('[分镜表] Veo轮询超时，更新状态:', { taskId, nodeId: storyboardTask.nodeId, shotId: storyboardTask.shotId });
                        updateShot(storyboardTask.nodeId, storyboardTask.shotId, {
                            status: 'draft'
                        });
                        // 清理任务映射
                        storyboardTaskMapRef.current.delete(taskId);
                    }
                    return;
                }

                fetch(`${baseUrl}/v2/videos/generations/${jobId}`, {
                    method: 'GET',
                    headers: { Authorization: `Bearer ${apiKey}` },
                })
                .then(async (resp) => {
                    const text = await resp.text();
                    let data;
                    try { data = JSON.parse(text); } catch (err) { setTimeout(() => pollVeoJob(jobId, taskId, baseUrl, apiKey, w, h, attempt + 1), delayMs); return; }

                    console.log('[Tapnow] Veo Poll:', data);
                    const status = data?.data?.status || data?.status || data?.data?.task_status;
                    const progress = data?.data?.progress || data?.progress || '0%';
                    const failReason = data?.data?.fail_reason || data?.fail_reason || '';

                    // 处理成功状态
                    if (status === 'SUCCESS' || status === 'succeeded' || status === 'FINISHED' || status === 'completed') {
                        const videoUrl = data?.data?.output || data?.output || data?.data?.video_url || data?.video_url || data?.data?.data?.output;
                        if (!videoUrl) {
                            console.warn('[Tapnow] Veo: 任务成功但未找到视频URL', data);
                            setHistory((prev) => prev.map((hItem) => hItem.id === taskId ? { ...hItem, status: 'failed', errorMsg: '未找到视频URL' } : hItem));
                            // 分镜表任务：解除 generating，避免一直转圈
                            const storyboardTask = storyboardTaskMapRef.current.get(taskId);
                            if (storyboardTask) {
                                updateShot(storyboardTask.nodeId, storyboardTask.shotId, { status: 'draft' });
                                storyboardTaskMapRef.current.delete(taskId);
                            }
                            return;
                        }
                        console.log('[Tapnow] Veo: 任务成功，视频URL:', videoUrl);
                        const endTime = Date.now();
                        // 在更新 history 之前，先获取 sourceNodeId 和 ratio
                        // 使用函数式更新来确保获取最新的 historyItem
                        setHistory((prev) => {
                            const historyItem = prev.find(h => h.id === taskId);
                            const sourceNodeId = historyItem?.sourceNodeId;
                            const originalRatio = historyItem?.ratio;
                            const durationMs = endTime - (historyItem?.startTime || endTime);

                            console.log('[Tapnow] Veo: 从历史记录获取信息', { taskId, originalRatio, sourceNodeId, historyItem });

                            // 对于 veo3.1，尝试从实际视频获取真实尺寸
                            let finalW = w, finalH = h;

                            // 异步获取视频尺寸并更新（使用 Promise）
                            (async () => {
                                try {
                                    const videoMeta = await getVideoMetadata(videoUrl);
                                    if (videoMeta && videoMeta.w > 0 && videoMeta.h > 0) {
                                        console.log('[Tapnow] Veo: 获取到视频实际尺寸', { w: videoMeta.w, h: videoMeta.h, requestedRatio: originalRatio });
                                        const actualW = videoMeta.w;
                                        const actualH = videoMeta.h;

                                        // 验证实际尺寸是否匹配请求的 aspect_ratio
                                        if (originalRatio === '16:9') {
                                            const actualRatio = actualW / actualH;
                                            const expectedRatio = 16/9;
                                            if (Math.abs(actualRatio - expectedRatio) > 0.1) {
                                                console.warn(`[Tapnow] Veo: 视频实际比例 ${actualRatio.toFixed(2)} 不匹配请求的 16:9 (${expectedRatio.toFixed(2)})，后端返回了错误的比例！`);
                                                console.warn(`[Tapnow] Veo: 实际尺寸: ${actualW}x${actualH}, 请求比例: 16:9`);
                                                console.warn(`[Tapnow] Veo: 强制使用请求的 16:9 比例，调整尺寸为: ${w}x${Math.round(w / (16/9))}`);
                                                // 如果后端返回了错误的比例，强制使用请求的比例
                                                finalW = w;
                                                finalH = Math.round(w / (16/9));
                                            } else {
                                                console.log(`[Tapnow] Veo: 视频实际比例匹配 16:9`);
                                                finalW = actualW;
                                                finalH = actualH;
                                            }
                                        } else if (originalRatio === '9:16') {
                                            const actualRatio = actualW / actualH;
                                            const expectedRatio = 9/16;
                                            if (Math.abs(actualRatio - expectedRatio) > 0.1) {
                                                console.warn(`[Tapnow] Veo: 视频实际比例 ${actualRatio.toFixed(2)} 不匹配请求的 9:16 (${expectedRatio.toFixed(2)})，后端返回了错误的比例！`);
                                                console.warn(`[Tapnow] Veo: 实际尺寸: ${actualW}x${actualH}, 请求比例: 9:16`);
                                                console.warn(`[Tapnow] Veo: 强制使用请求的 9:16 比例，调整尺寸为: ${Math.round(h * (9/16))}x${h}`);
                                                // 如果后端返回了错误的比例，强制使用请求的比例
                                                finalW = Math.round(h * (9/16));
                                                finalH = h;
                                            } else {
                                                console.log(`[Tapnow] Veo: 视频实际比例匹配 9:16`);
                                                finalW = actualW;
                                                finalH = actualH;
                                            }
                                        } else {
                                            // 如果没有指定比例，使用实际尺寸
                                            finalW = actualW;
                                            finalH = actualH;
                                        }

                                        // 更新历史记录
                                        setHistory((prevHistory) => {
                                            return prevHistory.map((hItem) =>
                                                hItem.id === taskId
                                                    ? { ...hItem, status: 'completed', progress: 100, url: videoUrl, width: finalW, height: finalH, durationMs, ratio: originalRatio || hItem.ratio }
                                                    : hItem
                                            );
                                        });

                                        // 检查是否是分镜表的任务，如果是则回填到分镜表
                                        const storyboardTask = storyboardTaskMapRef.current.get(taskId);
                                        if (storyboardTask) {
                                            console.log('[分镜表] Veo任务完成，回填视频:', { taskId, nodeId: storyboardTask.nodeId, shotId: storyboardTask.shotId, videoUrl });
                                            updateShot(storyboardTask.nodeId, storyboardTask.shotId, {
                                                video_url: videoUrl,
                                                status: 'done'
                                            });
                                            // 清理任务映射
                                            storyboardTaskMapRef.current.delete(taskId);
                                        } else {
                                            // 更新预览窗口（非分镜表任务）
                                        if (sourceNodeId) {
                                            setTimeout(() => {
                                                console.log('[Tapnow] Veo: 准备更新预览窗口', { taskId, videoUrl, sourceNodeId });
                                                updatePreviewFromTask(taskId, videoUrl, 'video', sourceNodeId);
                                                // 同步回填到“生成角色/场景视频”节点本身（用于节点内预览与右键发送到画布）
                                                setNodes(prevNodes => prevNodes.map(n => {
                                                    if (n.id !== sourceNodeId) return n;
                                                    if (n.type === 'generate-character-video' || n.type === 'generate-scene-video') {
                                                        return {
                                                            ...n,
                                                            content: videoUrl,
                                                            settings: {
                                                                ...n.settings,
                                                                videoUrl: videoUrl,
                                                                isGenerating: false,
                                                                progress: 100,
                                                                error: null
                                                            }
                                                        };
                                                    }
                                                    return n;
                                                }));
                                            }, 0);
                                            }
                                        }
                                    }
                                } catch (e) {
                                    console.warn('[Tapnow] Veo: 无法获取视频实际尺寸，使用请求尺寸', e);
                                    // 如果无法获取实际尺寸，使用请求的尺寸并根据 aspect_ratio 调整
                                    let fallbackW = w, fallbackH = h;
                                    if (originalRatio === '16:9') {
                                        const aspectRatioValue = fallbackW / fallbackH;
                                        if (Math.abs(aspectRatioValue - 16/9) > 0.1) {
                                            fallbackH = Math.round(fallbackW / (16/9));
                                        }
                                    } else if (originalRatio === '9:16') {
                                        const aspectRatioValue = fallbackW / fallbackH;
                                        if (Math.abs(aspectRatioValue - 9/16) > 0.1) {
                                            fallbackW = Math.round(fallbackH * (9/16));
                                        }
                                    }

                                    // 更新历史记录
                                    setHistory((prevHistory) => {
                                        return prevHistory.map((hItem) =>
                                            hItem.id === taskId
                                                ? { ...hItem, status: 'completed', progress: 100, url: videoUrl, width: fallbackW, height: fallbackH, durationMs, ratio: originalRatio || hItem.ratio }
                                                : hItem
                                        );
                                    });

                                    // 检查是否是分镜表的任务，如果是则回填到分镜表
                                    const storyboardTask = storyboardTaskMapRef.current.get(taskId);
                                    if (storyboardTask) {
                                        console.log('[分镜表] Veo任务完成（fallback），回填视频:', { taskId, nodeId: storyboardTask.nodeId, shotId: storyboardTask.shotId, videoUrl });
                                        updateShot(storyboardTask.nodeId, storyboardTask.shotId, {
                                            video_url: videoUrl,
                                            status: 'done'
                                        });
                                        // 清理任务映射
                                        storyboardTaskMapRef.current.delete(taskId);
                                    } else {
                                        // 更新预览窗口（非分镜表任务）
                                    if (sourceNodeId) {
                                        setTimeout(() => {
                                            console.log('[Tapnow] Veo: 准备更新预览窗口', { taskId, videoUrl, sourceNodeId });
                                            updatePreviewFromTask(taskId, videoUrl, 'video', sourceNodeId);
                                            // 同步回填到“生成角色/场景视频”节点本身（用于节点内预览与右键发送到画布）
                                            setNodes(prevNodes => prevNodes.map(n => {
                                                if (n.id !== sourceNodeId) return n;
                                                if (n.type === 'generate-character-video' || n.type === 'generate-scene-video') {
                                                    return {
                                                        ...n,
                                                        content: videoUrl,
                                                        settings: {
                                                            ...n.settings,
                                                            videoUrl: videoUrl,
                                                            isGenerating: false,
                                                            progress: 100,
                                                            error: null
                                                        }
                                                    };
                                                }
                                                return n;
                                            }));
                                        }, 0);
                                        }
                                    }
                                }
                            })();

                            // 先返回原始状态，等待异步操作完成后再更新
                            return prev;
                        });
                        return;
                    }

                    // 处理失败状态
                    if (status === 'FAILED' || status === 'ERROR' || status === 'CANCELLED') {
                        let errorMsg = `任务失败: ${status}`;
                        if (failReason) {
                            try {
                                const reasonObj = typeof failReason === 'string' ? JSON.parse(failReason) : failReason;
                                errorMsg = reasonObj?.message || reasonObj?.code || failReason;
                            } catch (e) {
                                errorMsg = failReason || errorMsg;
                            }
                        }
                        console.error('[Tapnow] Veo: 任务失败', { status, failReason, errorMsg });
                        setHistory((prev) => prev.map((hItem) => hItem.id === taskId ? { ...hItem, status: 'failed', errorMsg } : hItem));
                        // 分镜表任务：解除 generating，避免一直转圈
                        {
                            const storyboardTask = storyboardTaskMapRef.current.get(taskId);
                            if (storyboardTask) {
                                updateShot(storyboardTask.nodeId, storyboardTask.shotId, { status: 'draft' });
                                storyboardTaskMapRef.current.delete(taskId);
                            }
                        }
                        return;
                    }

                    // 处理 NOT_START 状态：可能是任务还在队列中，继续等待
                    if (status === 'NOT_START' || status === 'PENDING' || status === 'QUEUED') {
                        console.log(`[Tapnow] Veo: 任务状态 ${status}，进度 ${progress}，继续等待...`);
                        // 对于 NOT_START 状态，进度更新更慢一些，避免频繁更新
                        const currentProgress = parseInt(progress) || 0;
                        setHistory((prev) => prev.map((hItem) => hItem.id === taskId ? {
                            ...hItem,
                            status: 'generating',
                            progress: Math.max(5, currentProgress),
                            errorMsg: status === 'NOT_START' ? '任务已创建，等待处理中...' : undefined
                        } : hItem));
                        setTimeout(() => pollVeoJob(jobId, taskId, baseUrl, apiKey, w, h, attempt + 1), delayMs);
                        return;
                    }

                    // 其他状态（如 PROCESSING、GENERATING 等）：继续轮询
                    const currentProgress = parseInt(progress) || Math.min(95, (attempt * 2) + 10);
                    console.log(`[Tapnow] Veo: 任务状态 ${status}，进度 ${progress}，继续轮询...`);
                    setHistory((prev) => prev.map((hItem) => hItem.id === taskId ? { ...hItem, status: 'generating', progress: currentProgress } : hItem));
                    setTimeout(() => pollVeoJob(jobId, taskId, baseUrl, apiKey, w, h, attempt + 1), delayMs);
                })
                .catch((err) => setTimeout(() => pollVeoJob(jobId, taskId, baseUrl, apiKey, w, h, attempt + 1), delayMs));
            };

            const pollSoraJob = (jobId, taskId, baseUrl, apiKey, w, h, modelId = '', attempt = 0) => {
                // Sora 2 Pro 需要更长的等待时间（30分钟），其他模型保持原有设置（约6.5分钟）
                const maxAttempts = modelId === 'sora-2-pro' ? 360 : 80;
                const delayMs = 5000;

                if (attempt > maxAttempts) {
                    setHistory(prev => prev.map(hItem => hItem.id === taskId ? { ...hItem, status: 'failed', errorMsg: 'Sora 轮询超时' } : hItem));

                    // 检查是否是分镜表的任务，如果是则更新状态为 draft
                    const storyboardTask = storyboardTaskMapRef.current.get(taskId);
                    if (storyboardTask) {
                        console.log('[分镜表] Sora轮询超时，更新状态:', { taskId, nodeId: storyboardTask.nodeId, shotId: storyboardTask.shotId });
                        updateShot(storyboardTask.nodeId, storyboardTask.shotId, {
                            status: 'draft'
                        });
                        // 清理任务映射
                        storyboardTaskMapRef.current.delete(taskId);
                    }
                    return;
                }

                const pollEndpoint = modelId?.includes('grok')
                    ? `${baseUrl}/v2/videos/generations/${encodeURIComponent(jobId)}`
                    : `${baseUrl}/v1/videos/${encodeURIComponent(jobId)}`;

                fetch(pollEndpoint, {
                    method: 'GET',
                    headers: { Authorization: `Bearer ${apiKey}` },
                })
                .then(resp => {
                    if (!resp.ok) {
                        throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
                    }
                    return resp.text();
                })
                .then((text) => {
                    let data;
                    try {
                        data = JSON.parse(text);
                    } catch (err) {
                        console.error('[Tapnow] Sora/Grok Poll JSON 解析失败:', err, text);
                        setTimeout(() => pollSoraJob(jobId, taskId, baseUrl, apiKey, w, h, modelId, attempt + 1), delayMs);
                        return;
                    }

                    console.log('[Tapnow] Sora/Grok Poll:', data);
                    const status = data?.data?.status || data?.status || data?.data?.task_status || data?.task_status;

                    if (status === 'SUCCESS' || status === 'succeeded' || status === 'FINISHED' || status === 'completed') {
                        const videoUrl = data?.data?.output || data?.output || data?.data?.video_url || data?.data?.url || data?.video_url || data?.url;
                        if (!videoUrl) {
                            setHistory(prev => prev.map(hItem => hItem.id === taskId ? { ...hItem, status: 'failed', errorMsg: '未找到视频URL' } : hItem));
                            // 分镜表任务：解除 generating，避免一直转圈
                            const storyboardTask = storyboardTaskMapRef.current.get(taskId);
                            if (storyboardTask) {
                                updateShot(storyboardTask.nodeId, storyboardTask.shotId, { status: 'draft' });
                                storyboardTaskMapRef.current.delete(taskId);
                            }
                            return;
                        }
                        const endTime = Date.now();
                        // 在更新 history 之前，先获取 sourceNodeId
                        const historyItem = historyMap.get(taskId);
                        const sourceNodeId = historyItem?.sourceNodeId;
                        const durationMs = endTime - (historyItem?.startTime || endTime);
                        // 使用 setHistory 的回调来确保获取最新的 historyItem
                        setHistory((prev) => {
                            const updated = prev.map((hItem) => hItem.id === taskId ? { ...hItem, status: 'completed', progress: 100, url: videoUrl, width: w, height: h, durationMs } : hItem);
                            // 检查是否是分镜表的任务，如果是则回填到分镜表
                            const storyboardTask = storyboardTaskMapRef.current.get(taskId);
                            if (storyboardTask) {
                                console.log('[分镜表] Sora任务完成，回填视频:', { taskId, nodeId: storyboardTask.nodeId, shotId: storyboardTask.shotId, videoUrl });
                                updateShot(storyboardTask.nodeId, storyboardTask.shotId, {
                                    video_url: videoUrl,
                                    status: 'done'
                                });
                                // 清理任务映射
                                storyboardTaskMapRef.current.delete(taskId);
                            } else {
                                // 更新预览窗口（非分镜表任务）
                            const updatedItem = updated.find(h => h.id === taskId);
                            if (updatedItem?.sourceNodeId) {
                                setTimeout(() => {
                                    console.log('[Tapnow] Sora: 准备更新预览窗口', { taskId, videoUrl, sourceNodeId: updatedItem.sourceNodeId });
                                    updatePreviewFromTask(taskId, videoUrl, 'video', updatedItem.sourceNodeId);
                                    // 同步回填到“生成角色/场景视频”节点本身（用于节点内预览与右键发送到画布）
                                    setNodes(prevNodes => prevNodes.map(n => {
                                        if (n.id !== updatedItem.sourceNodeId) return n;
                                        if (n.type === 'generate-character-video' || n.type === 'generate-scene-video') {
                                            return {
                                                ...n,
                                                content: videoUrl,
                                                settings: {
                                                    ...n.settings,
                                                    videoUrl: videoUrl,
                                                    isGenerating: false,
                                                    progress: 100,
                                                    error: null
                                                }
                                            };
                                        }
                                        return n;
                                    }));
                                }, 0);
                            } else {
                                console.warn('[Tapnow] Sora: 未找到 sourceNodeId', { taskId, updatedItem });
                                }
                            }
                            return updated;
                        });
                        return;
                    }

                    if (status === 'FAILED' || status === 'ERROR' || status === 'CANCELLED') {
                        setHistory(prev => prev.map(hItem => hItem.id === taskId ? { ...hItem, status: 'failed', errorMsg: `任务失败: ${status}` } : hItem));
                        // 分镜表任务：解除 generating，避免一直转圈
                        {
                            const storyboardTask = storyboardTaskMapRef.current.get(taskId);
                            if (storyboardTask) {
                                updateShot(storyboardTask.nodeId, storyboardTask.shotId, { status: 'draft' });
                                storyboardTaskMapRef.current.delete(taskId);
                            }
                        }
                        // 同步失败状态到“生成角色/场景视频”节点进度条
                        const historyItem = historyMap.get(taskId);
                        const sourceNodeIdForNode = historyItem?.sourceNodeId;
                        if (sourceNodeIdForNode) {
                            requestAnimationFrame(() => {
                                setNodes(prevNodes => prevNodes.map(n => {
                                    if (n.id !== sourceNodeIdForNode) return n;
                                    if (n.type === 'generate-character-video' || n.type === 'generate-scene-video') {
                                        return {
                                            ...n,
                                            settings: {
                                                ...n.settings,
                                                isGenerating: false,
                                                error: `任务失败: ${status}`,
                                                progress: 0
                                            }
                                        };
                                    }
                                    return n;
                                }));
                            });
                        }
                        return;
                    }

                    setHistory(prev => prev.map(hItem => hItem.id === taskId ? { ...hItem, status: 'generating', progress: Math.min(95, (hItem.progress || 10) + 2) } : hItem));
                    // 同步进度到“生成角色/场景视频”节点进度条
                    {
                        const historyItem = historyMap.get(taskId);
                        const sourceNodeIdForNode = historyItem?.sourceNodeId;
                        const approxProgress = Math.min(95, ((historyItem?.progress || 10) + 2));
                        if (sourceNodeIdForNode) {
                            requestAnimationFrame(() => {
                                setNodes(prevNodes => prevNodes.map(n => {
                                    if (n.id !== sourceNodeIdForNode) return n;
                                    if (n.type === 'generate-character-video' || n.type === 'generate-scene-video') {
                                        return {
                                            ...n,
                                            settings: {
                                                ...n.settings,
                                                isGenerating: true,
                                                error: null,
                                                progress: approxProgress
                                            }
                                        };
                                    }
                                    return n;
                                }));
                            });
                        }
                    }
                    setTimeout(() => pollSoraJob(jobId, taskId, baseUrl, apiKey, w, h, modelId, attempt + 1), delayMs);
                })
                .catch(err => {
                    console.error('[Tapnow] Sora/Grok Poll 请求失败:', err);
                    // 如果是网络错误，继续重试；如果是其他错误，标记为失败
                    if (attempt < maxAttempts - 5) {
                        // 前75次尝试继续重试
                        setTimeout(() => pollSoraJob(jobId, taskId, baseUrl, apiKey, w, h, modelId, attempt + 1), delayMs);
                    } else {
                        // 最后5次尝试失败后，标记为失败
                        setHistory(prev => prev.map(hItem => hItem.id === taskId ? { ...hItem, status: 'failed', errorMsg: `轮询失败: ${err.message || '网络错误'}` } : hItem));
                        // 分镜表任务：解除 generating，避免一直转圈
                        const storyboardTask = storyboardTaskMapRef.current.get(taskId);
                        if (storyboardTask) {
                            updateShot(storyboardTask.nodeId, storyboardTask.shotId, { status: 'draft' });
                            storyboardTaskMapRef.current.delete(taskId);
                        }
                    }
                });
            };

            // 异步图像生成任务轮询函数
            const pollImageTask = (taskId, taskIdForPoll, baseUrl, apiKey, w, h, sourceNodeId, attempt = 0, isBananaModel = false) => {
                // banana模型使用800秒超时（160次 * 5秒），其他模型使用25分钟（300次 * 5秒）
                const maxAttempts = isBananaModel ? 160 : 300;
                const baseDelayMs = 5000; // 基础轮询间隔5秒

                if (attempt > maxAttempts) {
                    const timeoutSeconds = isBananaModel ? 800 : 1500;
                    setHistory((prev) => prev.map((hItem) =>
                        hItem.id === taskId
                            ? { ...hItem, status: 'failed', errorMsg: `图像生成轮询超时（已等待${timeoutSeconds}秒）` }
                            : hItem
                    ));
                    return;
                }

                const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
                const pollUrl = `${cleanBaseUrl}/v1/images/tasks/${taskIdForPoll}`;

                fetch(pollUrl, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                })
                .then((resp) => resp.text())
                .then((text) => {
                    let data;
                    try {
                        data = JSON.parse(text);
                    } catch (err) {
                        console.error('[Async Image] Failed to parse response:', err);
                        setTimeout(() => pollImageTask(taskId, taskIdForPoll, baseUrl, apiKey, w, h, sourceNodeId, attempt + 1, isBananaModel), delayMs);
                        return;
                    }

                    console.log('[Async Image] Poll:', data);

                    // 根据API规范，响应格式可能有多种：
                    // 1. { code, message, data: { status, images: [...] } }
                    // 2. { status: "SUCCESS", data: { data: [{ url: "..." }] } }
                    // 3. { task_id: "...", status: "SUCCESS", data: { data: [{ url: "..." }] } }
                    const status = (data?.data?.status || data?.status || '').toUpperCase();
                    const asyncImageStatus = classifyAsyncImageStatus(status);
                    console.log('[Async Image] 提取的状态:', status, '原始数据:', {
                        hasData: !!data?.data,
                        hasDataData: !!data?.data?.data,
                        hasDataStatus: !!data?.data?.status,
                        hasStatus: !!data?.status,
                        dataKeys: data ? Object.keys(data) : []
                    });

                    let images = [];

                    // 尝试多种方式提取图片数据（按优先级顺序）
                    // 方式1：data.data.data（嵌套格式，最常见）
                    if (data?.data?.data && Array.isArray(data.data.data) && data.data.data.length > 0) {
                        images = data.data.data;
                        console.log('[Async Image] 从 data.data.data 提取到图片:', images.length, '张');
                    }
                    // 方式2：data.data.images
                    else if (data?.data?.images && Array.isArray(data.data.images) && data.data.images.length > 0) {
                        images = data.data.images;
                        console.log('[Async Image] 从 data.data.images 提取到图片:', images.length, '张');
                    }
                    // 方式3：data.images
                    else if (data?.images && Array.isArray(data.images) && data.images.length > 0) {
                        images = data.images;
                        console.log('[Async Image] 从 data.images 提取到图片:', images.length, '张');
                    }
                    // 方式4：data.data（标准OpenAI格式）
                    else if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
                        images = data.data;
                        console.log('[Async Image] 从 data.data 提取到图片:', images.length, '张');
                    }

                    // 如果还是没有找到图片，尝试从revised_prompt中提取URL（备用方案）
                    if (images.length === 0) {
                        // 尝试从data.data.data[0].revised_prompt中提取
                        if (data?.data?.data && Array.isArray(data.data.data) && data.data.data.length > 0) {
                            const firstItem = data.data.data[0];
                            if (firstItem?.revised_prompt) {
                                const urlMatch = firstItem.revised_prompt.match(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/);
                                if (urlMatch && urlMatch[1]) {
                                    images = [{ url: urlMatch[1] }];
                                    console.log('[Async Image] 从 revised_prompt 中提取到图片URL:', urlMatch[1]);
                                }
                            }
                        }
                        // 尝试从data.data.revised_prompt中提取
                        if (images.length === 0 && data?.data?.revised_prompt) {
                            const urlMatch = data.data.revised_prompt.match(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/);
                            if (urlMatch && urlMatch[1]) {
                                images = [{ url: urlMatch[1] }];
                                console.log('[Async Image] 从 data.data.revised_prompt 中提取到图片URL:', urlMatch[1]);
                            }
                        }
                        // 最后尝试：如果data.data.data存在但images为空，可能是数据结构问题，直接使用data.data.data
                        if (images.length === 0 && data?.data?.data && Array.isArray(data.data.data) && data.data.data.length > 0) {
                            // 检查每个元素是否有url字段
                            const itemsWithUrl = data.data.data.filter(item => item?.url || item?.image_url || item?.imageUrl);
                            if (itemsWithUrl.length > 0) {
                                images = itemsWithUrl;
                                console.log('[Async Image] 从 data.data.data 中重新提取到图片（二次尝试）:', images.length, '张');
                            }
                        }

                        // 如果任务状态是SUCCESS但还没找到图片，立即执行深度搜索（不等待后续处理）
                        if (images.length === 0 && asyncImageStatus === ASYNC_IMAGE_STATUS.COMPLETED) {
                            console.log('[Async Image] 任务状态为成功但图片数量为0，立即执行深度搜索');
                            const foundUrl = findFirstHttpImageUrl(data);
                            if (foundUrl) {
                                images = [{ url: foundUrl }];
                                console.log('[Async Image] 通过立即深度搜索找到图片URL:', foundUrl);
                            } else {
                                console.warn('[Async Image] 深度搜索未找到图片URL，响应数据结构:', JSON.stringify(data, null, 2).substring(0, 500));
                            }
                        }
                    }

                    const errorMsg = data?.message || data?.error || data?.fail_reason || '';

                    // 更新历史记录
                    setHistory((prev) => {
                        const updated = prev.map((hItem) => {
                            if (hItem.id === taskId) {
                                // 支持多种成功状态值
                                if (asyncImageStatus === ASYNC_IMAGE_STATUS.COMPLETED) {
                                    console.log('[Async Image] 任务状态为成功:', status, '图片数量:', images.length);

                                    // 保存sourceNodeId，用于后续更新预览窗口
                                    const savedSourceNodeId = hItem.sourceNodeId || sourceNodeId;

                                    // 任务完成
                                    if (images && images.length > 0) {
                                        // 提取图片URL，支持多种字段名和格式
                                        const imageUrls = images.map(img => {
                                            if (typeof img === 'string') return img;
                                            return img?.url || img?.image_url || img?.imageUrl || '';
                                        }).filter(Boolean);

                                        console.log('[Async Image] 提取到的图片URLs:', imageUrls);

                                        if (imageUrls.length > 0) {
                                            const primaryUrl = imageUrls[0];

                                            const {
                                                durationMs,
                                                backendDuration,
                                                usedBackendDuration,
                                            } = resolveGenerationDurationMs({
                                                data,
                                                startTime: hItem.startTime,
                                            });

                                            console.log('[Async Image] 任务完成，准备更新UI:', {
                                                taskId,
                                                url: primaryUrl,
                                                sourceNodeId: savedSourceNodeId,
                                                imageCount: imageUrls.length,
                                                durationMs,
                                                backendDuration,
                                                frontendCalculated: usedBackendDuration ? null : durationMs
                                            });

                                            // 更新预览窗口（立即执行，不等待）
                                            // 即使savedSourceNodeId为空，也尝试调用updatePreviewFromTask，它会从history中查找
                                            const nodeIdToUse = savedSourceNodeId || hItem.sourceNodeId;
                                            console.log('[Async Image] 准备更新预览窗口', {
                                                taskId,
                                                url: primaryUrl,
                                                sourceNodeId: nodeIdToUse,
                                                savedSourceNodeId,
                                                hItemSourceNodeId: hItem.sourceNodeId,
                                                imageCount: imageUrls.length
                                            });
                                            // 使用requestAnimationFrame确保在下一个渲染周期更新，但比setTimeout更快
                                            requestAnimationFrame(() => {
                                                updatePreviewFromTask(taskId, primaryUrl, 'image', nodeIdToUse, imageUrls.length > 1 ? imageUrls : null);
                                                // 同步回填到“生成角色/场景图片”节点本身（用于节点内预览与右键发送到画布）
                                                if (nodeIdToUse) {
                                                    setNodes(prevNodes => prevNodes.map(n => {
                                                        if (n.id !== nodeIdToUse) return n;
                                                        if (n.type === 'generate-character-image' || n.type === 'generate-scene-image') {
                                                            return {
                                                                ...n,
                                                                content: primaryUrl,
                                                                settings: {
                                                                    ...n.settings,
                                                                    imageUrl: primaryUrl,
                                                                    imageUrls: imageUrls,
                                                                    isGenerating: false,
                                                                    progress: 100,
                                                                    error: null,
                                                                    selectedImageIndex: null
                                                                }
                                                            };
                                                        }
                                                        return n;
                                                    }));
                                                }
                                            });

                                            return {
                                                ...hItem,
                                                status: 'completed',
                                                progress: 100,
                                                url: primaryUrl,
                                                width: w,
                                                height: h,
                                                durationMs,
                                                errorMsg: null,
                                                sourceNodeId: savedSourceNodeId || hItem.sourceNodeId, // 确保sourceNodeId被保留
                                                ...(imageUrls.length > 1 ? { mjImages: imageUrls, selectedMjImageIndex: 0 } : {})
                                            };
                                        } else {
                                            console.error('[Async Image] 图片数组为空或无法提取URL:', images);
                                        }
                                    } else {
                                        console.error('[Async Image] 任务完成但未找到图片数据，尝试最后备用方案:', {
                                            status,
                                            hasData: !!data?.data,
                                            hasDataData: !!data?.data?.data,
                                            fullData: JSON.stringify(data, null, 2).substring(0, 1000)
                                        });

                                        const foundUrl = findFirstHttpImageUrl(data);
                                        if (foundUrl) {
                                            console.log('[Async Image] 通过深度搜索找到图片URL:', foundUrl);

                                            const { durationMs } = resolveGenerationDurationMs({
                                                data,
                                                startTime: hItem.startTime,
                                            });

                                            // 更新预览窗口（立即执行，不等待）
                                            // 即使savedSourceNodeId为空，也尝试调用updatePreviewFromTask，它会从history中查找
                                            const nodeIdToUse = savedSourceNodeId || hItem.sourceNodeId;
                                            console.log('[Async Image] 准备更新预览窗口（深度搜索）', {
                                                taskId,
                                                url: foundUrl,
                                                sourceNodeId: nodeIdToUse,
                                                savedSourceNodeId,
                                                hItemSourceNodeId: hItem.sourceNodeId
                                            });
                                            // 使用requestAnimationFrame确保在下一个渲染周期更新，但比setTimeout更快
                                            requestAnimationFrame(() => {
                                                updatePreviewFromTask(taskId, foundUrl, 'image', nodeIdToUse, null);
                                                // 同步回填到“生成角色/场景图片”节点本身（用于节点内预览与右键发送到画布）
                                                if (nodeIdToUse) {
                                                    setNodes(prevNodes => prevNodes.map(n => {
                                                        if (n.id !== nodeIdToUse) return n;
                                                        if (n.type === 'generate-character-image' || n.type === 'generate-scene-image') {
                                                            return {
                                                                ...n,
                                                                content: foundUrl,
                                                                settings: {
                                                                    ...n.settings,
                                                                    imageUrl: foundUrl,
                                                                    imageUrls: [foundUrl],
                                                                    isGenerating: false,
                                                                    progress: 100,
                                                                    error: null,
                                                                    selectedImageIndex: null
                                                                }
                                                            };
                                                        }
                                                        return n;
                                                    }));
                                                }
                                            });

                                            return {
                                                ...hItem,
                                                status: 'completed',
                                                progress: 100,
                                                url: foundUrl,
                                                width: w,
                                                height: h,
                                                durationMs,
                                                errorMsg: null,
                                                sourceNodeId: savedSourceNodeId || hItem.sourceNodeId // 确保sourceNodeId被保留
                                            };
                                        }
                                    }

                                    // 如果所有方法都失败，标记为失败
                                    return {
                                        ...hItem,
                                        status: 'failed',
                                        errorMsg: errorMsg || '任务完成但未返回图片，请检查控制台日志查看详细响应数据'
                                    };
                                } else if (asyncImageStatus === ASYNC_IMAGE_STATUS.FAILED) {
                                // 任务失败
                                return {
                                    ...hItem,
                                    status: 'failed',
                                    errorMsg: errorMsg || `任务失败: ${status}`
                                };
                            } else if (asyncImageStatus === ASYNC_IMAGE_STATUS.RUNNING) {
                                // 任务进行中，根据轮询次数和进度信息计算进度
                                let progress = 10 + (attempt * 2); // 基础进度

                                // 如果有进度百分比，使用实际进度
                                if (data?.data?.progress) {
                                    const progressStr = String(data.data.progress);
                                    if (progressStr.includes('%')) {
                                        progress = parseInt(progressStr.replace('%', ''), 10) || progress;
                                    } else if (typeof data.data.progress === 'number') {
                                        progress = data.data.progress;
                                    }
                                } else if (data?.progress) {
                                    const progressStr = String(data.progress);
                                    if (progressStr.includes('%')) {
                                        progress = parseInt(progressStr.replace('%', ''), 10) || progress;
                                    } else if (typeof data.progress === 'number') {
                                        progress = data.progress;
                                    }
                                }

                                progress = Math.min(95, Math.max(10, progress)); // 限制在10-95%之间

                                return {
                                    ...hItem,
                                    status: 'generating',
                                    progress,
                                    errorMsg: null
                                };
                            } else {
                                // 未知状态，继续轮询，但进度缓慢增加
                                const progress = Math.min(90, 10 + (attempt * 1.5));
                                return {
                                    ...hItem,
                                    status: 'generating',
                                    progress,
                                    errorMsg: null
                                };
                            }
                        }
                        return hItem;
                    });

                    // 获取更新后的进度，用于动态调整轮询间隔
                    const updatedItem = updated.find(h => h.id === taskId);
                    const currentProgress = updatedItem?.progress || 10;
                    const currentStatusForNode = updatedItem?.status;
                    const currentErrorForNode = updatedItem?.errorMsg;

                    // 同步进度到“生成角色/场景图片”节点（只同步这两类节点，避免影响现有 gen-image 行为）
                    if (sourceNodeId && (currentStatusForNode === 'generating' || currentStatusForNode === 'failed')) {
                        requestAnimationFrame(() => {
                            setNodes(prevNodes => prevNodes.map(n => {
                                if (n.id !== sourceNodeId) return n;
                                if (n.type === 'generate-character-image' || n.type === 'generate-scene-image') {
                                    return {
                                        ...n,
                                        settings: {
                                            ...n.settings,
                                            progress: currentProgress,
                                            isGenerating: currentStatusForNode === 'generating',
                                            error: currentStatusForNode === 'failed' ? (currentErrorForNode || '生成失败') : null
                                        }
                                    };
                                }
                                return n;
                            }));
                        });
                    }

                    return updated;
                });

                    // 如果任务未完成，继续轮询
                    // 动态调整轮询间隔：任务接近完成时缩短间隔，确保能快速检测到完成状态
                    const currentStatus = (data?.data?.status || data?.status || '').toUpperCase();
                    const currentAsyncImageStatus = classifyAsyncImageStatus(currentStatus);
                    const shouldContinuePolling = currentAsyncImageStatus !== ASYNC_IMAGE_STATUS.COMPLETED &&
                        currentAsyncImageStatus !== ASYNC_IMAGE_STATUS.FAILED;

                    if (shouldContinuePolling) {
                        // 动态轮询间隔策略：
                        // 1. 任务进度>90%：1秒间隔（快速检测完成）
                        // 2. 任务进度>70%：2秒间隔（加快检测）
                        // 3. 任务进度>50%：3秒间隔（中等速度）
                        // 4. 任务进行中（<50%）：5秒间隔（基础间隔）
                        // 5. 长时间运行（>50次轮询且非banana模型）：10秒间隔（节省资源）

                        // 从更新后的history中获取最新进度来计算延迟
                        setHistory((prev) => {
                            const latestItem = prev.find(h => h.id === taskId);
                            const progress = latestItem?.progress || 10;

                            let adjustedDelay = baseDelayMs;
                            if (progress >= 90) {
                                adjustedDelay = 1000; // 1秒：任务接近完成，快速检测
                            } else if (progress >= 70) {
                                adjustedDelay = 2000; // 2秒：任务进行中后期，加快检测
                            } else if (progress >= 50) {
                                adjustedDelay = 3000; // 3秒：任务进行中，中等速度
                            } else if (attempt > 50 && !isBananaModel) {
                                adjustedDelay = 10000; // 10秒：长时间运行，节省资源
                            }

                            // 在回调外执行setTimeout，避免闭包问题
                            setTimeout(() => {
                                pollImageTask(taskId, taskIdForPoll, baseUrl, apiKey, w, h, sourceNodeId, attempt + 1, isBananaModel);
                            }, adjustedDelay);

                            return prev; // 不修改，只是读取
                        });
                    }
                })
                .catch((err) => {
                    console.error('[Async Image] Poll error:', err);
                    setTimeout(() => pollImageTask(taskId, taskIdForPoll, baseUrl, apiKey, w, h, sourceNodeId, attempt + 1, isBananaModel), baseDelayMs);
                });
            };

            // Midjourney任务轮询函数
            const pollMidjourneyJob = (jobId, taskId, baseUrl, apiKey, mjMode = 'fast', w, h, attempt = 0) => {
                const maxAttempts = 120; // 最多轮询120次（约10分钟，假设每次5秒）
                const delayMs = 5000; // 每5秒轮询一次

                if (attempt > maxAttempts) {
                    setHistory((prev) => prev.map((hItem) =>
                        hItem.id === taskId
                            ? { ...hItem, status: 'failed', errorMsg: 'Midjourney 轮询超时' }
                            : hItem
                    ));
                    return;
                }

                fetch(`${baseUrl}/${mjMode}/mj/task/${jobId}/fetch`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                })
                .then((resp) => resp.text())
                .then((text) => {
                    let data;
                    try {
                        data = JSON.parse(text);
                    } catch (err) {
                        console.error('Midjourney: Failed to parse response:', err);
                        setTimeout(() => pollMidjourneyJob(jobId, taskId, baseUrl, apiKey, mjMode, w, h, attempt + 1), delayMs);
                        return;
                    }

                    console.log('[Tapnow] Midjourney Poll:', data);

                    const status = data?.status || '';
                    const progress = data?.progress || '0%';
                    const imageUrl = data?.imageUrl || '';
                    const failReason = data?.failReason || '';
                    const buttons = data?.buttons || [];

                    // 解析进度百分比
                    let progressNum = 0;
                    if (typeof progress === 'string' && progress.includes('%')) {
                        progressNum = parseInt(progress.replace('%', ''), 10) || 0;
                    } else if (typeof progress === 'number') {
                        progressNum = progress;
                    }

                    // 更新历史记录
                    setHistory((prev) => prev.map((hItem) => {
                        if (hItem.id === taskId) {
                            let newStatus = hItem.status;
                            let newErrorMsg = hItem.errorMsg;
                            let newProgress = progressNum;

                            if (status === 'SUCCESS' || status === 'FINISHED') {
                                newStatus = 'completed';
                                newProgress = 100;
                                newErrorMsg = null;

                                // 如果是Midjourney任务且有图片URL，切割成4张图（拓展图片任务不需要切割）
                                if (imageUrl && hItem.apiConfig?.modelId?.includes('mj') && hItem.apiConfig?.modelId !== 'mj-zoom') {
                                    // 获取比例信息（从prompt中提取或使用默认值）
                                    let ratio = '1:1';
                                    if (hItem.prompt && hItem.prompt.includes('--ar ')) {
                                        const arMatch = hItem.prompt.match(/--ar\s+([\d:]+)/);
                                        if (arMatch && arMatch[1]) {
                                            ratio = arMatch[1];
                                        }
                                    }

                                    // 异步切割图片，不阻塞状态更新
                                    // 先更新状态，显示原图，避免白屏
                                    setHistory((prev) => prev.map((hItem) =>
                                        hItem.id === taskId
                                            ? { ...hItem, url: imageUrl, mjRatio: ratio, mjOriginalUrl: imageUrl, mjNeedsSplit: true }
                                            : hItem
                                    ));

                                    // 立即将完整原图同步到预览窗口（不裁剪）
                                    // 直接传入 sourceNodeId，避免依赖可能未更新的 history 状态
                                    // 使用 setTimeout 确保在下一个事件循环中执行，避免状态更新冲突
                                    const sourceNodeIdForPreview = hItem.sourceNodeId;
                                    if (sourceNodeIdForPreview) {
                                        setTimeout(() => {
                                            console.log('[Tapnow] Midjourney: 准备更新预览窗口', { taskId, imageUrl, sourceNodeId: sourceNodeIdForPreview });
                                            updatePreviewFromTask(taskId, imageUrl, 'image', sourceNodeIdForPreview);
                                        }, 0);
                                    } else {
                                        console.warn('[Tapnow] Midjourney: 未找到 sourceNodeId，无法更新预览窗口', { taskId, hItem });
                                    }

                                    // 延迟切割，确保UI先更新显示原图，避免白屏
                                    setTimeout(() => {
                                        splitMidjourneyImage(imageUrl, ratio).then((splitImages) => {
                                            // 提取URL数组（兼容新旧格式）
                                            const imageUrls = splitImages.map(img => typeof img === 'string' ? img : img.url);
                                            const firstImage = splitImages[0];
                                            const firstUrl = typeof firstImage === 'string' ? firstImage : firstImage.url;

                                            setHistory((prev) => prev.map((hItem) =>
                                                hItem.id === taskId
                                                    ? {
                                                        ...hItem,
                                                        mjImages: imageUrls,
                                                        url: firstUrl,
                                                        selectedMjImageIndex: 0,
                                                        mjRatio: ratio,
                                                        mjOriginalUrl: imageUrl, // 保存原图URL
                                                        mjNeedsSplit: false, // 标记已切割
                                                        mjImageInfo: splitImages.map(img => typeof img === 'string' ? null : { width: img.width, height: img.height, ratio: img.ratio })
                                                    }
                                                    : hItem
                                            ));
                                        }).catch((err) => {
                                            console.error('Midjourney: Failed to split image:', err);
                                            // 如果切割失败，保持原图显示，标记需要重新切割
                                            setHistory((prev) => prev.map((hItem) =>
                                                hItem.id === taskId
                                                    ? { ...hItem, url: imageUrl, mjRatio: ratio, mjOriginalUrl: imageUrl, mjNeedsSplit: true }
                                                    : hItem
                                            ));
                                        });
                                    }, 300); // 延迟300ms，确保原图已完全显示

                                    // 计算并保存用时
                                    const endTime = Date.now();
                                    const durationMs = endTime - (hItem.startTime || endTime);

                                    // 先更新状态，图片切割异步进行
                                    return {
                                        ...hItem,
                                        status: newStatus,
                                        progress: newProgress,
                                        errorMsg: newErrorMsg,
                                        url: imageUrl, // 临时使用原图，切割完成后会更新
                                        width: w,
                                        height: h,
                                        mjButtons: buttons,
                                        mjOriginalUrl: imageUrl, // 保存完整原图URL
                                        durationMs: durationMs
                                    };
                                }
                            } else if (status === 'FAILURE' || status === 'ERROR' || status === 'CANCELLED') {
                                newStatus = 'failed';
                                newErrorMsg = failReason || `任务失败: ${status}`;
                            } else if (status === 'NOT_START' || status === 'SUBMITTED' || status === 'IN_PROGRESS' || status === 'MODAL') {
                                newStatus = 'generating';
                                newErrorMsg = null;
                                // 如果进度为0%，至少显示5%
                                if (newProgress === 0) newProgress = 5;
                            } else {
                                newStatus = 'generating';
                                newErrorMsg = null;
                                // 渐进式更新进度
                                newProgress = Math.min(95, (hItem.progress || 5) + 2);
                            }

                                console.log(`[Tapnow] Midjourney Poll Status Update: Task ${taskId}, Status: ${newStatus}, Progress: ${newProgress}%, ImageUrl: ${imageUrl ? 'Yes' : 'No'}`);

                            const updatedItem = {
                                ...hItem,
                                status: newStatus,
                                progress: newProgress,
                                errorMsg: newErrorMsg,
                                url: imageUrl || hItem.url,
                                width: w,
                                height: h,
                                mjButtons: buttons // 保存按钮信息，用于后续操作
                            };

                            // 如果任务成功且有图片URL，将结果同步到预览节点（使用完整原图，不裁剪）
                            // 注意：Midjourney任务已经在切割逻辑中处理了预览窗口更新，这里只处理非Midjourney任务
                            // 拓展图片任务（mj-zoom）也需要同步到节点
                            if ((status === 'SUCCESS' || status === 'FINISHED') && imageUrl && (!hItem.apiConfig?.modelId?.includes('mj') || hItem.apiConfig?.modelId === 'mj-zoom')) {
                                // 直接传入 sourceNodeId，避免依赖可能未更新的 history 状态
                                if (hItem.sourceNodeId) {
                                    console.log('[Tapnow] 图片生成: 准备更新节点', { taskId, imageUrl, sourceNodeId: hItem.sourceNodeId, modelId: hItem.apiConfig?.modelId });
                                    // 如果是拓展图片任务，更新拓展图片节点；否则更新预览窗口
                                    if (hItem.apiConfig?.modelId === 'mj-zoom') {
                                        setNodes((prev) => prev.map((n) =>
                                            n.id === hItem.sourceNodeId && n.type === 'expand-image'
                                                ? { ...n, content: imageUrl }
                                                : n
                                        ));
                                    } else {
                                        updatePreviewFromTask(taskId, imageUrl, 'image', hItem.sourceNodeId);
                                    }
                                } else {
                                    console.warn('[Tapnow] 图片生成: 未找到 sourceNodeId', { taskId, hItem });
                                }

                                // 计算并保存用时
                                const endTime = Date.now();
                                const durationMs = endTime - (hItem.startTime || endTime);
                                updatedItem.durationMs = durationMs;
                            }

                            return updatedItem;
                        }
                        return hItem;
                    }));

                    // 如果任务完成或失败，停止轮询
                    if (status === 'SUCCESS' || status === 'FINISHED') {
                        return;
                    }

                    if (status === 'FAILURE' || status === 'ERROR' || status === 'CANCELLED') {
                        return;
                    }

                    // 继续轮询
                    setTimeout(() => pollMidjourneyJob(jobId, taskId, baseUrl, apiKey, mjMode, w, h, attempt + 1), delayMs);
                })
                .catch((err) => {
                    console.error(`[Tapnow] Midjourney Poll Fetch Error for task ${taskId}:`, err);
                    setHistory((prev) => prev.map((hItem) =>
                        hItem.id === taskId
                            ? { ...hItem, status: 'failed', errorMsg: `轮询请求失败: ${err.message}` }
                            : hItem
                    ));
                    // 即使出错也继续重试（最多重试3次）
                    if (attempt < 3) {
                        setTimeout(() => pollMidjourneyJob(jobId, taskId, baseUrl, apiKey, mjMode, w, h, attempt + 1), delayMs);
                    }
                });
            };

            const startGeneration = async (prompt, type, sourceImages, nodeId, options = {}) => {
                const connectedImages = Array.isArray(sourceImages) ? sourceImages : (sourceImages ? [sourceImages] : []);
                const sourceImage = connectedImages.length > 0 ? connectedImages[0] : undefined;

                if (!prompt && !sourceImage) { alert('请输入提示词或连接参考图片'); return; }

                // 检查是否是分镜表的虚拟节点ID（格式：storyboard-${nodeId}-shot-${shotId}）
                let node = null;
                if (nodeId && nodeId.startsWith('storyboard-') && nodeId.includes('-shot-')) {
                    // 这是分镜表的任务，不需要查找实际节点
                    node = null;
                } else {
                    node = nodes.find((n) => n.id === nodeId);
                }

                // 处理蒙版：先检查当前节点，如果没有则从上游节点查找
                let finalMaskBlob = null;
                let finalMaskContent = node?.maskContent;
                if (!finalMaskContent) {
                    // 查找连接到当前节点的源节点（优先查找 default 输入，如果没有则查找所有输入）
                    let incomingConn = connections.find(c => c.to === nodeId && (!c.inputType || c.inputType === 'default'));
                    if (!incomingConn) {
                        // 如果没有 default 连接，查找任何连接到该节点的连接
                        incomingConn = connections.find(c => c.to === nodeId);
                    }
                    if (incomingConn) {
                        // 使用 nodesMap 进行 O(1) 查找
                        const sourceNode = nodesMap.get(incomingConn.from);
                        if (sourceNode && sourceNode.maskContent) {
                            finalMaskContent = sourceNode.maskContent;
                            console.log('[Inpainting] 从上游节点获取蒙版:', sourceNode.id);
                        }
                    }
                } else {
                    console.log('[Inpainting] 使用当前节点的蒙版:', nodeId);
                }

                // 如果存在蒙版，处理蒙版（反转逻辑）
                if (finalMaskContent) {
                    finalMaskBlob = await processMaskForInpainting(finalMaskContent);
                    if (finalMaskBlob) {
                        console.log('[Inpainting] 蒙版已处理（已反转）');
                    } else {
                        console.warn('[Inpainting] 蒙版处理失败，将使用原始蒙版');
                    }
                }

                // 优先使用 options 中的 model，其次使用节点设置，最后使用默认值
                const modelId = options.model || node?.settings?.model || (type === 'image' ? 'nano-banana' : 'sora-2');
                const config = apiConfigsMap.get(modelId);
                const apiKey = config?.key || globalApiKey;
                const baseUrl = (config?.url || DEFAULT_BASE_URL).replace(/\/+$/, '');

                if (!apiKey) { alert('请先在设置中配置 API Key'); setSettingsOpen(true); return; }

                // 规范化 prompt（确保角色引用 @{username} 前后有空格，仅对 Sora 2 模型）
                if (prompt && isSoraModel(modelId)) {
                    prompt = normalizePromptForSora(prompt, modelId);
                    console.log('[Sora 2] Normalized prompt:', prompt);
                }

                // 优先使用 options 中的 ratio，其次使用节点设置，最后使用默认值
                let ratio = options.ratio || node?.settings?.ratio || (modelId.includes('grok') ? '3:2' : '1:1');
                let resolution = node?.settings?.resolution || (modelId.includes('grok') ? '1080P' : 'Auto');

                // 兼容：部分 UI/旧数据会把分辨率写成 '2k'/'4k'（小写），会导致 Banana/Banana2 永远退回 1K
                // 按用户要求：仅对 banana 系列做修复，其他模型不改行为
                if ((modelId.includes('banana') || (config?.modelName ?? '').includes('nano-banana')) && typeof resolution === 'string') {
                    resolution = normalizeBananaResolution(resolution);
                }
                let { sizeStr, w, h } = getModelParams(modelId, ratio, resolution);

                // Auto Resolution Logic (Direct Source, No Scaling, Just Alignment)
                // Fix: Only use source dimensions if Ratio is ALSO Auto. If user picks a ratio (e.g. 1:1), respect that.
                if (resolution === 'Auto' && ratio === 'Auto' && sourceImage) {
                    try {
                        const dims = await getImageDimensions(sourceImage);
                        // Force original size (aligned to 64) without downscaling
                        const safeW = Math.round(dims.w / 64) * 64;
                        const safeH = Math.round(dims.h / 64) * 64;

                        w = safeW;
                        h = safeH;
                        sizeStr = `${safeW}x${safeH}`;
                        console.log(`[Auto Res] Using Source Dimensions: ${sizeStr}`);
                    } catch (e) { console.error("Auto Res Error", e); }
                } else {
                    if (!w || !h) {
                         const def = calculateResolution(ratio, resolution);
                         w = def.w;
                         h = def.h;
                         sizeStr = def.str;
                    }
                }

                // 当有参考图且选择了 Auto + (1K/2K/4K) 时：
                // 希望保持原图纵横比，只在原图分辨率基础上等比放大到目标级别（而不是变成固定 1:1 或 16:9）
                if (sourceImage && ratio === 'Auto' && ['1K', '2K', '4K'].includes(resolution)) {
                    try {
                        const dims = await getImageDimensions(sourceImage);
                        const longSideTarget = resolution === '4K'
                            ? 4096
                            : resolution === '2K'
                                ? 2048
                                : 1024;

                        const maxSide = Math.max(dims.w, dims.h) || 1;
                        const scale = longSideTarget / maxSide;
                        let newW = Math.round((dims.w * scale) / 16) * 16;
                        let newH = Math.round((dims.h * scale) / 16) * 16;

                        // 双保险，避免数值异常
                        newW = Math.max(16, newW);
                        newH = Math.max(16, newH);

                        w = newW;
                        h = newH;
                        sizeStr = `${newW}x${newH}`;
                        console.log(`[Auto+${resolution}] Upscale from ${dims.w}x${dims.h} -> ${sizeStr}`);
                    } catch (e) {
                        console.error('Auto+K Upscale Error', e);
                    }
                }

                // 优先使用 options 中的 duration，其次使用节点设置，最后使用默认值
                let duration = options.duration ? options.duration.replace('s', '') : (node?.settings?.duration?.replace('s', '') || '5');
                if (modelId.includes('veo')) duration = '8';

                const taskId = Date.now().toString();

                const now = Date.now();
                const actualSourceNodeId = node?.id || nodeId || null;

                setHistory((prev) => [{
                    id: taskId, type, url: '',
                    prompt: prompt || (sourceImage ? `Img2${type === 'image' ? 'Img' : 'Vid'}` : 'Untitled'),
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    status: 'generating', progress: 5, modelName: getModelDisplayName({ modelId, config }), width: w, height: h,
                    remoteTaskId: null,
                    apiConfig: { modelId, baseUrl, apiKey },
                    sourceNodeId: actualSourceNodeId,
                    startTime: now,
                    durationMs: null,
                    ratio: ratio // 保存比例信息，用于后续验证返回结果
                }, ...prev]);

                // 检查是否是分镜表的任务（sourceNodeId 格式：storyboard-${nodeId}-shot-${shotId}）
                if (actualSourceNodeId && actualSourceNodeId.startsWith('storyboard-') && actualSourceNodeId.includes('-shot-')) {
                    const parts = actualSourceNodeId.split('-shot-');
                    if (parts.length === 2) {
                        const storyboardNodeId = parts[0].replace('storyboard-', '');
                        const shotId = parts[1];
                        // 记录任务映射
                        storyboardTaskMapRef.current.set(taskId, { nodeId: storyboardNodeId, shotId: shotId });
                        console.log('[分镜表] 任务已记录:', { taskId, nodeId: storyboardNodeId, shotId });
                    }
                }

                // 交互要求：生成任务不自动弹出“生成历史”面板，只允许用户手动打开/关闭

                try {
                    if (type === 'image') {
                        let endpoint = `${baseUrl}/v1/images/generations`;
                        let payload;
                        let useMultipart = false;

                        const {
                            isBananaLike,
                            isGPTImage15,
                            isOpenAIImage,
                            isFluxKontext,
                            isNanoBanana2,
                            isNanoBanana,
                            isMidjourney,
                            isJimeng,
                        } = getImageModelFeatures(modelId, config);
                        const imageSizeFlag = getNanoBanana2ImageSizeFlag({ isNanoBanana2, resolution });
                        const aspect = ratio === 'Auto' ? undefined : ratio;

                        // --- 核心逻辑分支 ---

                        // 1. 旧版 Banana/Edit (必须有参考图) - 修复: 只有在有图时才进入此逻辑
                        if (connectedImages.length > 0 && isBananaLike) {
                            endpoint = `${baseUrl}/v1/images/edits`;
                            useMultipart = true;
                            const formData = new FormData();
                            formData.append('model', config?.modelName || 'nano-banana');
                            formData.append('prompt', prompt || 'enhance');
                            formData.append('n', '1');
                            formData.append('size', sizeStr);
                            if (aspect) formData.append('aspect_ratio', aspect);
                            if (imageSizeFlag) formData.append('image_size', imageSizeFlag);

                            const blobPromises = connectedImages.map(url => getBlobFromUrl(url));
                            const blobs = await Promise.all(blobPromises);
                            blobs.forEach((blob, i) => {
                                formData.append('image', blob, `input_${i}.png`);
                            });

                            // 尝试添加蒙版 (V2.5-4特性)
                            if (finalMaskBlob) {
                                formData.append('mask', finalMaskBlob, 'mask.png');
                            }

                            payload = formData;
                        }
                        // 2. GPT Image 1.5 (文生图用 generations 异步接口，图生图用 edits 接口)
                        else if (isGPTImage15) {
                            // 判断是否有参考图
                            const hasReferenceImage = connectedImages.length > 0 || sourceImage;

                            if (!hasReferenceImage) {
                                // 文生图：使用 /v1/images/generations?async=true 接口（异步模式）
                                const useAsync = true; // 默认启用异步模式
                                endpoint = `${baseUrl}/v1/images/generations${useAsync ? '?async=true' : ''}`;
                                useMultipart = false;
                                const jsonBody = {
                                    model: config?.modelName || 'gpt-image-1.5',
                                    prompt: prompt || '',
                                    n: 1,
                                    size: sizeStr,
                                    response_format: 'url'
                                };
                                if (ratio && ratio !== 'Auto') {
                                    jsonBody.aspect_ratio = ratio;
                                }
                                payload = jsonBody;
                            } else {
                                // 图生图：使用 /v1/images/edits 接口（异步模式，multipart/form-data 格式）
                                // 按照 OpenAPI 规范：必需参数 image、prompt、model，可选参数 mask、n、quality、response_format、size
                                const useAsync = true; // 默认启用异步模式
                                endpoint = `${baseUrl}/v1/images/edits${useAsync ? '?async=true' : ''}`;
                                useMultipart = true;
                                const formData = new FormData();

                                // 必需参数：image（必须先添加，因为规范要求）
                                if (connectedImages.length > 0) {
                                    const blobPromises = connectedImages.map(url => getBlobFromUrl(url));
                                    const blobs = await Promise.all(blobPromises);
                                    blobs.forEach((blob, i) => {
                                        formData.append('image', blob, `input_${i}.png`);
                                    });
                                } else if (sourceImage) {
                                    const blob = await getBlobFromUrl(sourceImage);
                                    formData.append('image', blob, 'input.png');
                                }

                                // 必需参数：prompt
                                formData.append('prompt', prompt || '');

                                // 必需参数：model
                                formData.append('model', config?.modelName || 'gpt-image-1.5');

                                // 可选参数：n（生成图片数量）
                                formData.append('n', '1');

                                // 可选参数：response_format
                                formData.append('response_format', 'url');

                                // 可选参数：size（gpt-image-1 支持 "1024x1024", "1536x1024", "1024x1536", "auto"）
                                if (sizeStr && sizeStr !== 'auto') {
                                    formData.append('size', sizeStr);
                                } else {
                                    formData.append('size', 'auto');
                                }

                                // 可选参数：mask（蒙版）
                                if (finalMaskBlob) {
                                    formData.append('mask', finalMaskBlob, 'mask.png');
                                }

                                payload = formData;
                            }
                        }
                        // 3. Flux Kontext
                        else if (isFluxKontext) {
                            endpoint = `${baseUrl}/v1/images/edits`;
                            useMultipart = true;
                            const formData = new FormData();
                            formData.append('model', config?.modelName || 'flux-kontext-pro');
                            formData.append('prompt', prompt || '');
                            if (aspect) formData.append('aspect_ratio', aspect);
                            if (sizeStr) formData.append('size', sizeStr);

                            const refs = connectedImages.length > 0 ? connectedImages : (sourceImage ? [sourceImage] : []);
                            if (refs.length > 0) {
                                const blobPromises = refs.map(url => getBlobFromUrl(url));
                                const blobs = await Promise.all(blobPromises);
                                blobs.forEach((blob, i) => formData.append('image', blob, `flux_ref_${i}.png`));
                            }
                            if (finalMaskBlob) {
                                formData.append('mask', finalMaskBlob, 'mask.png');
                            }
                            payload = formData;
                        }
                        // 4. OpenAI Image (GPT-4o Image，支持异步模式)
                        else if (isOpenAIImage) {
                            const useAsync = true; // 默认启用异步模式
                            const hasReferenceImage = connectedImages.length > 0 || sourceImage;

                            if (!hasReferenceImage) {
                                // 文生图：使用 /v1/images/generations?async=true 接口
                                endpoint = `${baseUrl}/v1/images/generations${useAsync ? '?async=true' : ''}`;
                                let finalPrompt = prompt || '';
                                const jsonBody = {
                                    model: config?.modelName || 'gpt-4o-image',
                                    prompt: finalPrompt,
                                    n: 1,
                                    response_format: 'url'
                                };

                                // size 参数（按照 gpt-image-1.5 格式）
                                if (sizeStr && sizeStr !== 'auto') {
                                    jsonBody.size = sizeStr;
                                } else {
                                    jsonBody.size = 'auto';
                                }

                                // aspect_ratio 参数（按照 gpt-image-1.5 格式）
                                if (ratio && ratio !== 'Auto') {
                                    jsonBody.aspect_ratio = ratio;
                                }

                                payload = jsonBody;
                            } else {
                                // 图生图：使用 /v1/images/edits?async=true 接口（multipart/form-data 格式，和 gpt-image-1.5 一样）
                                endpoint = `${baseUrl}/v1/images/edits${useAsync ? '?async=true' : ''}`;
                                useMultipart = true;
                                const formData = new FormData();
                                formData.append('model', config?.modelName || 'gpt-4o-image');
                                formData.append('prompt', prompt || '');
                                formData.append('n', '1');
                                formData.append('response_format', 'url');

                                // size 参数（按照 gpt-image-1.5 格式）
                                if (sizeStr && sizeStr !== 'auto') {
                                    formData.append('size', sizeStr);
                                } else {
                                    formData.append('size', 'auto');
                                }

                                // aspect_ratio 参数（按照 gpt-image-1.5 格式）
                                if (ratio && ratio !== 'Auto') {
                                    formData.append('aspect_ratio', ratio);
                                }

                                // 必需参数：image
                                if (connectedImages.length > 0) {
                                    const blobPromises = connectedImages.map(url => getBlobFromUrl(url));
                                    const blobs = await Promise.all(blobPromises);
                                    blobs.forEach((blob, i) => {
                                        formData.append('image', blob, `input_${i}.png`);
                                    });
                                } else if (sourceImage) {
                                    const blob = await getBlobFromUrl(sourceImage);
                                    formData.append('image', blob, 'input.png');
                                }

                                // 可选参数：mask（蒙版）
                                if (finalMaskBlob) {
                                    formData.append('mask', finalMaskBlob, 'mask.png');
                                }

                                payload = formData;
                            }
                        }
                        // 5. Nano Banana (Generations，对接文档推荐；仅处理文生图，图生图仍走 edits 分支)
                        else if (isNanoBanana) {
                            endpoint = `${baseUrl}/v1/images/generations`;
                            const jsonBody = {
                                model: config?.modelName || 'nano-banana',
                                prompt: prompt || '',
                                response_format: 'url',
                                ...(aspect ? { aspect_ratio: aspect } : {}),
                                // 兼容旧实现：保留 size，让服务端可按像素控制（即使文档未列出）
                                ...(sizeStr ? { size: sizeStr } : {}),
                            };
                            payload = jsonBody;
                        }
                        // 6. [关键] Nano Banana 2 (V2.5-4 核心逻辑，包含异步处理)
                        else if (isNanoBanana2) {
                            const useAsync = true; // 保持异步开启
                            if (connectedImages.length > 0) {
                                endpoint = `${baseUrl}/v1/images/edits${useAsync ? '?async=true' : ''}`;
                                useMultipart = true;
                                const formData = new FormData();
                                formData.append('model', config?.modelName || 'nano-banana-2');
                                formData.append('prompt', prompt || '');
                                formData.append('response_format', 'url');
                                if (aspect) formData.append('aspect_ratio', aspect);
                                if (imageSizeFlag) formData.append('image_size', imageSizeFlag);

                                const blobPromises = connectedImages.map(url => getBlobFromUrl(url));
                                const blobs = await Promise.all(blobPromises);
                                blobs.forEach((blob, i) => {
                                    formData.append('image', blob, `input_${i}.png`);
                                });
                                if (finalMaskBlob) {
                                    formData.append('mask', finalMaskBlob, 'mask.png');
                                }
                                payload = formData;
                            } else {
                                endpoint = `${baseUrl}/v1/images/generations${useAsync ? '?async=true' : ''}`;
                                const jsonBody = {
                                    model: config?.modelName || 'nano-banana-2',
                                    prompt: prompt || '',
                                    response_format: 'url',
                                    ...(aspect ? { aspect_ratio: aspect } : {}),
                                    ...(imageSizeFlag ? { image_size: imageSizeFlag } : {}),
                                };
                                if (sourceImage) {
                                    const trimmedImg = sourceImage.trim();
                                    if (trimmedImg.startsWith('http')) {
                                        jsonBody.image = [trimmedImg];
                                    } else if (trimmedImg.startsWith('data:')) {
                                        jsonBody.image = [trimmedImg];
                                    } else {
                                        const b64 = await getBase64FromUrl(trimmedImg);
                                        jsonBody.image = [`data:image/png;base64,${b64}`];
                                    }
                                }
                                payload = jsonBody;
                            }
                        }
                        // 6. Midjourney (V2.5-4 逻辑，支持 oref/sref)
                        else if (isMidjourney) {
                             const mjMode = node?.settings?.mjMode || 'fast';
                             const mjVersion = node?.settings?.mjVersion || '--v 7';
                             let mjPrompt = prompt || '';
                             if (ratio && ratio !== 'Auto') {
                                 if (!mjPrompt.includes('--ar ')) {
                                     mjPrompt = `${mjPrompt} --ar ${ratio}`.trim();
                                 }
                             }
                             const orefConnected = getConnectedImageForInput(nodeId, 'oref');
                             const srefConnected = getConnectedImageForInput(nodeId, 'sref');

                             const imagesToUpload = [];
                             const imageIndexMap = new Map();
                             let orefImageUrl = null;
                             let srefImageUrl = null;
                             let defaultImageUrls = [];

                             const orefUrl = orefConnected || (node?.settings?.mjOref && node.settings.mjOref.trim());
                             if (orefUrl && orefUrl.trim()) {
                                 let finalOrefUrl = orefUrl.trim();
                                 if (finalOrefUrl.startsWith('http')) { orefImageUrl = finalOrefUrl; }
                                 else if (finalOrefUrl.startsWith('data:')) { imagesToUpload.push(finalOrefUrl); imageIndexMap.set('oref', imagesToUpload.length - 1); }
                                 else { orefImageUrl = finalOrefUrl; }
                             }
                             const srefUrl = srefConnected || (node?.settings?.mjSref && node.settings.mjSref.trim());
                             if (srefUrl && srefUrl.trim()) {
                                 let finalSrefUrl = srefUrl.trim();
                                 if (finalSrefUrl.startsWith('http')) { srefImageUrl = finalSrefUrl; }
                                 else if (finalSrefUrl.startsWith('data:')) { imagesToUpload.push(finalSrefUrl); imageIndexMap.set('sref', imagesToUpload.length - 1); }
                                 else { srefImageUrl = finalSrefUrl; }
                             }
                             if (connectedImages.length > 0) {
                                 for (const img of connectedImages) {
                                     const isOrefImage = orefConnected && img === orefConnected;
                                     const isSrefImage = srefConnected && img === srefConnected;
                                     if (!isOrefImage && !isSrefImage) {
                                         if (img.startsWith('http')) { defaultImageUrls.push(img); }
                                         else if (img.startsWith('data:')) { imagesToUpload.push(img); imageIndexMap.set(`default_${defaultImageUrls.length}`, imagesToUpload.length - 1); defaultImageUrls.push(null); }
                                         else { defaultImageUrls.push(img); }
                                     }
                                 }
                             }
                             if (imagesToUpload.length > 0) {
                                 try {
                                     const uploadedUrls = await uploadMidjourneyImages(imagesToUpload, baseUrl, apiKey);
                                     if (imageIndexMap.has('oref')) orefImageUrl = uploadedUrls[imageIndexMap.get('oref')];
                                     if (imageIndexMap.has('sref')) srefImageUrl = uploadedUrls[imageIndexMap.get('sref')];
                                     for (let i = 0; i < defaultImageUrls.length; i++) {
                                         if (defaultImageUrls[i] === null) {
                                             const key = `default_${i}`;
                                             if (imageIndexMap.has(key)) defaultImageUrls[i] = uploadedUrls[imageIndexMap.get(key)];
                                         }
                                     }
                                 } catch (error) {
                                     setHistory((prev) => prev.map((hItem) => hItem.id === taskId ? { ...hItem, status: 'failed', progress: 0, errorMsg: `图片上传失败: ${error.message}` } : hItem));
                                     return;
                                 }
                             }
                             defaultImageUrls = defaultImageUrls.filter(url => url !== null);
                             let finalMjPrompt = '';
                             if (defaultImageUrls.length > 0) finalMjPrompt = defaultImageUrls.join(' ') + ' ';
                             finalMjPrompt += mjPrompt.trim();
                             if (!finalMjPrompt.includes('--v ') && !finalMjPrompt.includes('--niji ')) finalMjPrompt = `${finalMjPrompt} ${mjVersion}`.trim();
                             if (ratio && ratio !== 'Auto' && !finalMjPrompt.includes('--ar ')) finalMjPrompt = `${finalMjPrompt} --ar ${ratio}`.trim();
                             if (orefImageUrl && !finalMjPrompt.includes('--oref ')) finalMjPrompt = `${finalMjPrompt} --oref ${orefImageUrl}`.trim();
                             if (node?.settings?.mjOw && node.settings.mjOw > 0 && !finalMjPrompt.includes('--ow ')) finalMjPrompt = `${finalMjPrompt} --ow ${Math.min(1000, Math.max(1, node.settings.mjOw))}`.trim();
                             if (srefImageUrl && !finalMjPrompt.includes('--sref ')) finalMjPrompt = `${finalMjPrompt} --sref ${srefImageUrl}`.trim();

                             endpoint = `${baseUrl}/${mjMode}/mj/submit/imagine`;
                             payload = { prompt: finalMjPrompt, base64Array: [] };

                             const mjResp = await fetch(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                             const mjText = await mjResp.text();
                             if (!mjResp.ok) throw new Error(mjText || `Midjourney API error: ${mjResp.status}`);
                             let mjData = JSON.parse(mjText);
                             if (mjData.code !== 1 && mjData.code !== 22) throw new Error(mjData.description || `Midjourney提交失败: code ${mjData.code}`);
                             const remoteTaskId = mjData.result;
                             if (!remoteTaskId) throw new Error('未获取到任务ID');
                             setHistory((prev) => prev.map((hItem) => hItem.id === taskId ? { ...hItem, remoteTaskId, status: 'generating', progress: 5 } : hItem));
                             pollMidjourneyJob(remoteTaskId, taskId, baseUrl, apiKey, mjMode, w, h);
                             return;
                        }
                        // 6. 即梦 (Jimeng) - [修复] 恢复 V2.5-3 的稳定逻辑
                        else if (isJimeng) {
                            if (connectedImages.length > 0) {
                                // 图生图 (使用 compositions)
                                endpoint = `${baseUrl}/v1/images/compositions`;
                                if (!prompt || prompt.trim() === '') throw new Error('图生图功能需要提供提示词');

                                let jimengRatio = ratio;
                                let jimengResolution = '2k';

                                if (ratio === 'Auto' && sourceImage) {
                                    try {
                                        const sourceDims = await getImageDimensions(sourceImage);
                                        const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
                                        const divisor = gcd(sourceDims.w, sourceDims.h);
                                        jimengRatio = `${sourceDims.w / divisor}:${sourceDims.h / divisor}`;

                                        if (resolution === 'Auto') {
                                            const maxSide = Math.max(sourceDims.w, sourceDims.h);
                                            jimengResolution = maxSide <= 1024 ? '1k' : (maxSide <= 2048 ? '2k' : '4k');
                                        }
                                    } catch (e) { jimengRatio = '1:1'; }
                                } else {
                                    jimengRatio = ratio === 'Auto' ? '1:1' : ratio;
                                }

                                if (resolution !== 'Auto') {
                                    jimengResolution = resolution === '1K' ? '1k' : (resolution === '2K' ? '2k' : '4k');
                                }

                                // 注意：blob: URL 仅在当前浏览器上下文有效，不能当作“远程URL”传给后端。
                                // 这里统一把 blob/http 图片转换为 dataURL，避免后端尝试 fetch(blob:null/...) 导致上传失败。
                                const imagePromises = connectedImages.map(async (imgUrl) => {
                                    const safeUrl = (imgUrl || '').trim();
                                    if (!safeUrl) return safeUrl;
                                    if (safeUrl.startsWith('data:')) return safeUrl;
                                    if (
                                        safeUrl.startsWith('blob:') ||
                                        safeUrl.startsWith('http://') ||
                                        safeUrl.startsWith('https://')
                                    ) {
                                        const blob = await getBlobFromUrl(safeUrl);
                                        return await blobToDataURL(blob);
                                    }
                                    return safeUrl;
                                });
                                const base64Images = await Promise.all(imagePromises);
                                const jimengModelName = getJimengModelName(modelId, config);

                                payload = {
                                    model: jimengModelName,
                                    prompt: prompt.trim(),
                                    images: base64Images,
                                    ratio: jimengRatio,
                                    resolution: jimengResolution,
                                    response_format: 'url'
                                };
                            } else {
                                // 文生图 (使用 generations)
                                endpoint = `${baseUrl}/v1/images/generations`;
                                const jimengRatio = ratio === 'Auto' ? '1:1' : ratio;
                                let jimengResolution = '2k';
                                if (resolution === '1K') jimengResolution = '1k';
                                else if (resolution === '2K') jimengResolution = '2k';
                                else if (resolution === '4K') jimengResolution = '4k';

                                if (!prompt || prompt.trim() === '') throw new Error('提示词不能为空');

                                const jimengModelName = getJimengModelName(modelId, config);
                                payload = {
                                    model: jimengModelName,
                                    prompt: prompt.trim(),
                                    ratio: jimengRatio,
                                    resolution: jimengResolution,
                                    response_format: 'url'
                                };
                            }
                        }
                        // 7. [修复] 通用兜底 (修复 Banana T2I 问题)
                        // 这部分是 V2.5-4 缺失的，导致普通 Banana 模型和其他通用 OpenAI 格式模型无法进行文生图
                        else {
                            payload = {
                                model: config?.modelName || modelId,
                                prompt,
                                n: 1,
                                size: sizeStr,
                                response_format: 'url'
                            };
                        }

                        // --- 发送请求逻辑 (通用) ---
                        const { response: resp, text, data } = await submitGenerationRequest({
                            endpoint,
                            baseUrl,
                            apiKey,
                            payload,
                            useMultipart,
                        });

                        if (!resp.ok) {
                            let errorMsg = data?.message || data?.error?.message || text;
                            // 针对 GPT-4o 的 500 错误，提供更详细的错误信息
                            if (isOpenAIImage && resp.status === 500) {
                                const detailedError = data?.error?.message || data?.error || data?.message || text;
                                errorMsg = `GPT-4o 图片生成失败 (500错误): ${detailedError}\n\n请检查：\n1. API Key 是否正确\n2. 模型名称是否正确 (${config?.modelName || 'gpt-4o-image'})\n3. 提示词是否符合要求\n4. 服务是否正常运行`;
                                // 更新历史记录显示详细错误
                                setHistory((prev) => prev.map((hItem) =>
                                    hItem.id === taskId
                                        ? { ...hItem, status: 'failed', progress: 0, errorMsg }
                                        : hItem
                                ));
                            }
                            throw new Error(errorMsg);
                        }

                        // 处理即梦特定错误码
                        if (isJimeng && data?.code !== undefined && data.code !== 0 && data.code !== 1 && data.code !== 200) {
                            throw new Error(data.message || `即梦API错误: ${data.code}`);
                        }

                        // [保留 V2.5-4 特性] 处理异步任务 (Nano Banana 2、GPT Image 1.5、GPT-4o Image)
                        // 如果响应中包含 task_id，进入异步轮询模式（兼容多种返回格式）
                        if (isNanoBanana2 || isGPTImage15 || isOpenAIImage) {
                            const taskIdForPoll = extractAsyncTaskId(data);
                            if (taskIdForPoll) {
                                setHistory((prev) => prev.map((hItem) =>
                                    hItem.id === taskId ? { ...hItem, status: 'generating', progress: 10, remoteTaskId: taskIdForPoll } : hItem
                                ));
                                // GPT Image 1.5 / GPT-4o Image 也走异步轮询（使用与 Nano Banana 2 相同的超时策略）
                                pollImageTask(taskId, taskIdForPoll, baseUrl, apiKey, w, h, actualSourceNodeId, 0, true);
                                return;
                            }
                        }

                        // 处理同步返回结果 (标准 OpenAI 格式或嵌套格式)
                        const imageUrls = extractImageUrls(data);

                        if (imageUrls.length === 0) {
                            throw new Error('未能在响应中找到图片URL');
                        }

                        const primaryUrl = imageUrls[0];
                        const endTime = Date.now();
                        const durationMs = endTime - now;

                        setHistory((prev) => {
                            const updated = prev.map((hItem) => {
                                if (hItem.id === taskId) {
                                    const updatedItem = {
                                        ...hItem,
                                        status: 'completed',
                                        progress: 100,
                                        url: primaryUrl,
                                        urls: imageUrls, // 兼容 V2.6：保存所有图片 URLs，便于 UI 复用
                                        width: w,
                                        height: h,
                                        durationMs,
                                        mjImages: imageUrls.length > 1 ? imageUrls : null,
                                        selectedMjImageIndex: 0
                                    };

                                    // 更新预览窗口
                                    if (updatedItem.sourceNodeId) {
                                        setTimeout(() => {
                                            updatePreviewFromTask(taskId, primaryUrl, 'image', updatedItem.sourceNodeId, updatedItem.mjImages);

                                            // 同时更新“生成角色/场景图片”节点本身（同步返回也要回填，避免节点区域不显示）
                                            setNodes(prevNodes => {
                                                const node = prevNodes.find(n => n.id === updatedItem.sourceNodeId);
                                                if (node && (node.type === 'generate-character-image' || node.type === 'generate-scene-image')) {
                                                    return prevNodes.map(n =>
                                                        n.id === updatedItem.sourceNodeId
                                                            ? {
                                                                ...n,
                                                                content: primaryUrl,
                                                                settings: {
                                                                    ...n.settings,
                                                                    imageUrl: primaryUrl,
                                                                    imageUrls: imageUrls,
                                                                    isGenerating: false,
                                                                    progress: 100,
                                                                    error: null,
                                                                    selectedImageIndex: null
                                                                }
                                                            }
                                                            : n
                                                    );
                                                }
                                                return prevNodes;
                                            });
                                        }, 0);
                                    }
                                    return updatedItem;
                                }
                                return hItem;
                            });
                            return updated;
                        });
                        return;
                    }

                    if (type === 'video') {
                        // Veo 3.x 图生视频：按 /v2/videos/generations 规范发送 JSON，使用 images 数组而不是 input_image
                        if (modelId.includes('veo')) {
                            const endpoint = `${baseUrl}/v2/videos/generations`;

                            // 根据文档：images 支持 url 或 base64
                            // 对于Veo接口，如果图片过大，自动缩放到合理尺寸（1920x1080等）
                            // Veo 3.1（首尾帧）：当开启“首尾帧”时，优先使用 veo_start / veo_end 两个输入点，顺序为 [首帧, 尾帧]，最多 2 张
                            const currentNodeForVeo = nodesMap.get(nodeId);
                            const isVeo31FramesMode = (config?.modelName === 'veo3.1') && !!currentNodeForVeo?.settings?.veoFramesMode;
                            const veoStartFrame = isVeo31FramesMode ? getConnectedImageForInput(nodeId, 'veo_start') : null;
                            const veoEndFrame = isVeo31FramesMode ? getConnectedImageForInput(nodeId, 'veo_end') : null;
                            const veoFrameImages = [veoStartFrame, veoEndFrame].filter(Boolean);
                            const effectiveConnectedImages = (veoFrameImages.length > 0 ? veoFrameImages : connectedImages).slice(0, 2);
                            const effectiveSourceImage = (veoFrameImages.length > 0 ? veoFrameImages[0] : sourceImage);
                            let images = [];
                            if (effectiveConnectedImages && effectiveConnectedImages.length > 0) {
                                // 处理多张图片：先缩放，再转换为data URL
                                images = await Promise.all(effectiveConnectedImages
                                    .filter(img => img && typeof img === 'string' && img.trim().length > 0)
                                    .map(async (img) => {
                                        const trimmedImg = img.trim();

                                        // 如果是 http/https URL，先检查尺寸，如果太大就缩放
                                        if (trimmedImg.startsWith('http://') || trimmedImg.startsWith('https://')) {
                                            console.log('Veo: Processing HTTP URL for image');
                                            // 对于URL，先尝试获取尺寸，如果太大就缩放
                                            try {
                                                const dims = await getImageDimensions(trimmedImg);
                                                if (dims.w > 1920 || dims.h > 1920) {
                                                    console.log(`Veo: 图片尺寸 ${dims.w}x${dims.h} 过大，需要缩放`);
                                                    const resized = await resizeImageForVeo(trimmedImg, 1920, 1920);
                                                    return resized;
                                                }
                                                // 尺寸合适，直接使用URL
                                                return trimmedImg;
                                            } catch (e) {
                                                console.warn('Veo: 无法获取图片尺寸，尝试直接使用URL', e);
                                                return trimmedImg;
                                            }
                                        }

                                        // 对于 data URL、blob URL 或其他格式，统一缩放处理
                                        console.log('Veo: Processing image (data/blob/other format)');
                                        try {
                                            // 先获取尺寸
                                            const dims = await getImageDimensions(trimmedImg);
                                            if (dims.w > 1920 || dims.h > 1920) {
                                                console.log(`Veo: 图片尺寸 ${dims.w}x${dims.h} 过大，需要缩放`);
                                                const resized = await resizeImageForVeo(trimmedImg, 1920, 1920);
                                                return resized;
                                            }
                                            // 尺寸合适，转换为data URL格式
                                            if (trimmedImg.startsWith('data:')) {
                                                return trimmedImg;
                                            } else if (trimmedImg.startsWith('blob:')) {
                                                const base64 = await getBase64FromUrl(trimmedImg);
                                                return `data:image/png;base64,${base64}`;
                                            } else if (trimmedImg.length > 100 && !trimmedImg.includes('://') && !trimmedImg.startsWith('data:')) {
                                                return `data:image/png;base64,${trimmedImg}`;
                                            } else {
                                                const base64 = await getBase64FromUrl(trimmedImg);
                                                return `data:image/png;base64,${base64}`;
                                            }
                                        } catch (e) {
                                            console.error('Veo: Failed to process image:', e);
                                            throw new Error(`无法处理图片格式: ${trimmedImg.substring(0, 50)}...`);
                                        }
                                    }));
                            } else if (effectiveSourceImage) {
                                // 单张图片处理：先检查尺寸，如果太大就缩放
                                const trimmedSource = effectiveSourceImage.trim();

                                try {
                                    // 先获取图片尺寸
                                    const dims = await getImageDimensions(trimmedSource);
                                    console.log(`Veo: 源图片尺寸 ${dims.w}x${dims.h}`);

                                    // 如果图片过大，先缩放
                                    if (dims.w > 1920 || dims.h > 1920) {
                                        console.log(`Veo: 图片尺寸 ${dims.w}x${dims.h} 过大，缩放中...`);
                                        const resized = await resizeImageForVeo(trimmedSource, 1920, 1920);
                                        images = [resized];
                                    } else {
                                        // 尺寸合适，根据格式处理
                                        if (trimmedSource.startsWith('http://') || trimmedSource.startsWith('https://')) {
                                            console.log('Veo: Using HTTP URL for source image (尺寸合适)');
                                            images = [trimmedSource];
                                        } else if (trimmedSource.startsWith('data:')) {
                                            console.log('Veo: Using data URL for source image (尺寸合适)');
                                            images = [trimmedSource];
                                        } else if (trimmedSource.startsWith('blob:')) {
                                            console.log('Veo: Converting blob URL to base64 for source image');
                                            const base64 = await getBase64FromUrl(trimmedSource);
                                            images = [`data:image/png;base64,${base64}`];
                                        } else {
                                            if (trimmedSource.length > 100 && !trimmedSource.includes('://') && !trimmedSource.startsWith('data:')) {
                                                images = [`data:image/png;base64,${trimmedSource}`];
                                            } else {
                                                const base64 = await getBase64FromUrl(trimmedSource);
                                                images = [`data:image/png;base64,${base64}`];
                                            }
                                        }
                                    }
                                } catch (e) {
                                    console.error('Veo: Failed to process source image:', e);
                                    throw new Error(`无法处理图片格式: ${e.message}`);
                                }
                            }

                            // 构建 Veo 请求 payload
                            // 根据文档，images 是 required 字段，文生视频时传空数组，图生视频时传图片数据
                            // 图生视频时，确保 images 数组不为空
                            if (images.length === 0 && (connectedImages?.length > 0 || sourceImage)) {
                                console.error('Veo: 图片处理失败，images 数组为空', { connectedImages, sourceImage });
                                throw new Error('图片处理失败：无法获取图片数据');
                            }

                            // 验证图片数据格式：过滤掉无效数据，但不阻止请求发送
                            const validImages = images.filter((img, idx) => {
                                if (!img || typeof img !== 'string') {
                                    console.warn(`Veo: 跳过无效图片（索引 ${idx}）: 不是字符串`);
                                    return false;
                                }
                                if (img === 'base64_data' || img.trim() === 'base64_data') {
                                    console.warn(`Veo: 跳过占位符图片（索引 ${idx}）: base64_data`);
                                    return false;
                                }
                                return true;
                            });

                            if (validImages.length === 0 && (connectedImages?.length > 0 || sourceImage)) {
                                console.error('Veo: 所有图片数据都无效', { images, connectedImages, sourceImage });
                                throw new Error('图片数据格式错误：所有图片数据都无效');
                            }

                            // 对于 veo3.1 系列模型，确保 aspect_ratio 格式正确（只支持 '16:9' 和 '9:16'）
                            let aspectRatio = null;
                            if (ratio && ratio !== 'Auto') {
                                // 确保比例格式符合 API 要求
                                if (ratio === '16:9' || ratio === '9:16') {
                                    aspectRatio = ratio;
                                } else {
                                    // 对于其他比例，根据实际宽高计算最接近的比例
                                    const aspectRatioValue = w / h;
                                    if (Math.abs(aspectRatioValue - 16/9) < Math.abs(aspectRatioValue - 9/16)) {
                                        aspectRatio = '16:9';
                                    } else {
                                        aspectRatio = '9:16';
                                    }
                                }
                            }

                            const veoPayload = {
                                model: config?.modelName || 'veo3.1',
                                prompt,
                                enhance_prompt: false,
                                images: validImages.length > 0 ? validImages : [], // 使用验证后的图片数组
                                // 按接口说明：不传 aspect_ratio 时自动根据参考图匹配；只有非 Auto 时才显式传
                                ...(aspectRatio ? { aspect_ratio: aspectRatio } : {})
                            };

                            // 详细调试日志
                            console.log('Veo: 准备发送请求', {
                                endpoint,
                                model: veoPayload.model,
                                prompt: veoPayload.prompt?.substring(0, 50) + '...',
                                imagesCount: veoPayload.images.length,
                                firstImageType: veoPayload.images[0] ?
                                    (veoPayload.images[0].startsWith('http') ? 'HTTP URL' :
                                     veoPayload.images[0].startsWith('data:') ? 'Data URL' :
                                     'Unknown') : 'empty',
                                firstImagePreview: veoPayload.images[0] ?
                                    (veoPayload.images[0].startsWith('http') ?
                                        veoPayload.images[0].substring(0, 80) :
                                        veoPayload.images[0].substring(0, 100)) : 'empty',
                                aspect_ratio: veoPayload.aspect_ratio,
                                payloadSize: JSON.stringify(veoPayload).length
                            });

                            try {
                                console.log('Veo: 开始发送请求到', endpoint);
                                const resp = await fetch(endpoint, {
                                    method: 'POST',
                                    headers: {
                                        Authorization: `Bearer ${apiKey}`,
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify(veoPayload)
                                });

                                console.log('Veo: 收到响应', { status: resp.status, statusText: resp.statusText });
                                const text = await resp.text();
                                console.log('Veo: 响应内容', text.substring(0, 500));

                                if (!resp.ok) {
                                    console.error('Veo: 请求失败', { status: resp.status, text });
                                    throw new Error(text || `Veo error: ${resp.status}`);
                                }

                            const data = JSON.parse(text);
                                console.log('Veo: 解析后的响应数据', data);
                            const jobId = data?.data?.id || data?.id || data?.task_id || data?.data?.task_id;

                                if (!jobId) {
                                    console.error('Veo: 未找到 JobId', data);
                                    throw new Error('Veo No JobId');
                                }

                                console.log('Veo: 成功获取 JobId', jobId);
                            setHistory(prev => prev.map(h => h.id === taskId ? { ...h, status: 'generating', progress: 10 } : h));
                            pollVeoJob(jobId, taskId, baseUrl, apiKey, w, h);
                            return;
                            } catch (error) {
                                console.error('Veo: 请求发送失败', error);
                                setHistory(prev => prev.map(h => h.id === taskId ? { ...h, status: 'failed', errorMsg: error.message || '请求发送失败' } : h));
                                throw error;
                            }
                        }

                        let endpoint = '';
                        let body;
                        const headers = { Authorization: `Bearer ${apiKey}` };
                        // 统一将时长转为纯数字秒，避免后端期望 int 时收到字符串
                        const durationValueNum = parseDurationSeconds(duration);

                        // --- Grok-3 Video Logic (Pure JSON Strategy to fix Int type error, align spec /v2/videos/generations) ---
                        if (modelId.includes('grok')) {
                            const endpoint = `${baseUrl}/v2/videos/generations`;
                            // 1. 强制转换为整数 (解决 Go 后端类型错误)
                            const durationInt = parseInt(duration, 10);
                            const aspectRatioStr = ratio && ratio !== 'Auto' ? ratio : '3:2'; // 按官方枚举优先 3:2/2:3/1:1
                            const resolutionStr = (resolution && resolution !== 'Auto') ? resolution : '1080P'; // 官方支持 720P/1080P

                            console.log(`[Grok] Starting generation (JSON Mode). Duration: ${durationInt || 'N/A'} (type: ${typeof durationInt}), ratio: ${aspectRatioStr}, resolution: ${resolutionStr}`);

                            // 2. 准备基础 Payload
                            const payload = {
                                model: config?.modelName || 'grok-video-3',
                                prompt: prompt,
                                ratio: aspectRatioStr,
                                resolution: resolutionStr
                            };
                            if (Number.isFinite(durationInt) && durationInt > 0) {
                                payload.duration = durationInt;
                            }

                            // 3. 处理图片：转为 Base64 字符串
                            if (sourceImage) {
                                try {
                                    console.log('[Grok] Converting image to Base64...');
                                    let base64Data = '';

                                    if (sourceImage.startsWith('data:')) {
                                        base64Data = sourceImage; // 已经是 Base64
                                    } else {
                                        // 下载 blob 或 url 并转换
                                        const blob = await getBlobFromUrl(sourceImage);
                                        base64Data = await new Promise((resolve, reject) => {
                                            const reader = new FileReader();
                                            reader.onloadend = () => resolve(reader.result);
                                            reader.onerror = reject;
                                            reader.readAsDataURL(blob);
                                        });
                                    }

                                    // 将完整的 data URI 放入 images 数组（官方字段）
                                    payload.images = [base64Data];
                                } catch (e) {
                                    console.error('Grok Image Conversion Failed:', e);
                                    alert('图片处理失败，请检查图片链接或跨域设置');
                                    return;
                                }
                            }

                            // 4. 发送纯 JSON 请求
                            const resp = await fetch(endpoint, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${apiKey}`,
                                    'Content-Type': 'application/json' // 必须是 JSON
                                },
                                body: JSON.stringify(payload)
                            });

                            const text = await resp.text();

                            // 5. 错误处理
                            if (!resp.ok) {
                                console.error('[Grok API Error]', text);
                                throw new Error(text || `Grok API error: ${resp.status}`);
                            }

                            // 6. 解析响应
                            let data;
                            try {
                                data = JSON.parse(text);
                            } catch (e) {
                                throw new Error('API 返回了非 JSON 格式数据');
                            }

                            // 兼容多种 ID 返回格式
                            const jobId = data?.data?.id || data?.id || data?.task_id;
                            if (!jobId) {
                                console.error('Grok No Task ID:', data);
                                throw new Error('API 未返回 Task ID');
                            }

                            // 7. 进入轮询 (Grok 兼容 Sora 查询接口)
                            setHistory(prev => prev.map(h => h.id === taskId ? { ...h, status: 'generating', progress: 10, remoteTaskId: jobId } : h));
                            pollSoraJob(jobId, taskId, baseUrl, apiKey, w, h, modelId);

                            return; // 阻断后续代码执行
                        }

                        // Generic Video Logic (Sora/Kling/etc) - Force Multipart for Image Input with correct field names
                        if (sourceImage) {
                             const formData = new FormData();

                             if (modelId.includes('sora')) {
                                 endpoint = `${baseUrl}/v1/videos`;
                                 // 发送前移除大括号：将 @{username} 转换为 @username
                                 let finalPrompt = denormalizePromptForSoraRequest(prompt);
                                 console.log('[Sora 2] Sending prompt with character references:', finalPrompt);
                                 // Sora2: 强制 size 使用固定合法集合；并将输入图裁剪/缩放到对应尺寸，避免 invalid_size
                                 const enableSoraHD = (modelId === 'sora-2') && (options.isHD || node?.settings?.isHD);
                                 const soraParams = getSora2CompliantSize(ratio, w, h, enableSoraHD);
                                 sizeStr = soraParams.sizeStr;
                                 w = soraParams.w;
                                 h = soraParams.h;
                                 formData.append('model', config?.modelName || 'sora-2');
                                 formData.append('prompt', finalPrompt);
                                 formData.append('seconds', duration);
                                 formData.append('size', sizeStr);
                                 // Sora 2 HD 模式支持
                                 if (modelId === 'sora-2' && (options.isHD || node?.settings?.isHD)) {
                                     formData.append('quality', 'hd');
                                 }
                                 // 兼容：如果传入的是“纯base64字符串”而不是 data:，补齐前缀再 fetch 成 Blob
                                 const normalizedSoraSrc = (() => {
                                     const s = String(sourceImage || '').trim();
                                     if (!s) return s;
                                     if (s.startsWith('data:') || s.startsWith('blob:') || s.startsWith('http://') || s.startsWith('https://')) return s;
                                     if (s.length > 100 && !s.includes('://')) return `data:image/png;base64,${s.replace(/\s/g, '')}`;
                                     return s;
                                 })();
                                 const soraRawBlob = await getBlobFromUrl(normalizedSoraSrc);
                                 const soraFixedBlob = await normalizeImageBlobToSize(soraRawBlob, w, h, 'image/png');
                                 // Sora sometimes uses input_reference or image, append both for safety
                                 formData.append('input_reference', soraFixedBlob, 'ref.png');
                                 formData.append('image', soraFixedBlob, 'ref.png');
                            } else if (modelId.includes('jimeng')) {
                                 endpoint = `${baseUrl}/jimeng/submit/videos`;
                                 const blob = await getBlobFromUrl(sourceImage);
                                 formData.append('prompt', prompt);
                                 formData.append('duration', parseInt(duration));
                                 formData.append('aspect_ratio', ratio);
                                 formData.append('image', blob, 'input.png');
                            } else if (modelId.includes('grok')) {
                                endpoint = `${baseUrl}/v1/videos`;
                                const blob = await getBlobFromUrl(sourceImage);
                                formData.append('model', config?.modelName || 'grok-video-3');
                                formData.append('prompt', prompt);
                                formData.append('aspect_ratio', ratio);
                                formData.append('duration', durationValueNum);
                                formData.append('image', blob, 'input.png');
                             } else {
                                 endpoint = `${baseUrl}/v1/videos`;
                                 const blob = await getBlobFromUrl(sourceImage);
                                 formData.append('model', config?.modelName);
                                 formData.append('prompt', prompt);
                                 formData.append('image', blob, 'input.png');
                                 formData.append('size', sizeStr); // Ensure size is passed for generic
                             }
                             body = formData;
                        } else {
                             headers['Content-Type'] = 'application/json';
                             if (modelId.includes('sora')) {
                                 delete headers['Content-Type'];
                                 endpoint = `${baseUrl}/v1/videos`;
                                 const formData = new FormData();
                                 // 发送前移除大括号：将 @{username} 转换为 @username
                                 let finalPrompt = denormalizePromptForSoraRequest(prompt);
                                 console.log('[Sora 2] Sending prompt with character references:', finalPrompt);
                                 // Sora2: 强制 size 使用固定合法集合（T2V 也需要）
                                 const enableSoraHD = (modelId === 'sora-2') && (options.isHD || node?.settings?.isHD);
                                 const soraParams = getSora2CompliantSize(ratio, w, h, enableSoraHD);
                                 sizeStr = soraParams.sizeStr;
                                 w = soraParams.w;
                                 h = soraParams.h;
                                 formData.append('model', config?.modelName || 'sora-2');
                                 formData.append('prompt', finalPrompt);
                                 formData.append('seconds', duration);
                                 formData.append('size', sizeStr);
                                 // Sora 2 HD 模式支持
                                 if (modelId === 'sora-2' && (options.isHD || node?.settings?.isHD)) {
                                     formData.append('quality', 'hd');
                                 }
                                 body = formData;
                            } else if (modelId.includes('jimeng')) {
                                 endpoint = `${baseUrl}/jimeng/submit/videos`;
                                 body = JSON.stringify({ prompt, duration: parseInt(duration), aspect_ratio: ratio });
                            } else if (modelId.includes('grok')) {
                                endpoint = `${baseUrl}/v1/videos`;
                                body = JSON.stringify({
                                    model: config?.modelName || 'grok-video-3',
                                    prompt,
                                    aspect_ratio: ratio,
                                    duration: durationValueNum
                                });
                             } else {
                                 endpoint = `${baseUrl}/minimax/v1/video_generation`;
                                 body = JSON.stringify({ model: config?.modelName, prompt, resolution: sizeStr });
                             }
                        }

                        const resp = await fetch(endpoint, { method: 'POST', headers: body instanceof FormData ? { Authorization: headers.Authorization } : headers, body });
                        const text = await resp.text();
                        if (!resp.ok) throw new Error(text || `Video API error: ${resp.status}`);
                        const data = JSON.parse(text);

                        const immediateUrl = data?.video_url || data?.url || data?.data?.video_url;
                        if (immediateUrl) {
                            const endTime = Date.now();
                            // 在更新 history 之前，先获取 sourceNodeId
                            const historyItem = historyMap.get(taskId);
                            const sourceNodeId = historyItem?.sourceNodeId;
                            const durationMs = endTime - (historyItem?.startTime || endTime);
                            // 使用 setHistory 的回调来确保获取最新的 historyItem
                            setHistory((prev) => {
                                const updated = prev.map((hItem) => hItem.id === taskId ? { ...hItem, status: 'completed', progress: 100, url: immediateUrl, width: w, height: h, durationMs } : hItem);
                                // 检查是否是分镜表的任务，如果是则回填到分镜表
                                const storyboardTask = storyboardTaskMapRef.current.get(taskId);
                                if (storyboardTask) {
                                    console.log('[分镜表] 视频立即返回，回填视频:', { taskId, nodeId: storyboardTask.nodeId, shotId: storyboardTask.shotId, immediateUrl });
                                    updateShot(storyboardTask.nodeId, storyboardTask.shotId, {
                                        video_url: immediateUrl,
                                        status: 'done'
                                    });
                                    // 清理任务映射
                                    storyboardTaskMapRef.current.delete(taskId);
                                } else {
                                    // 更新预览窗口（非分镜表任务）
                                const updatedItem = updated.find(h => h.id === taskId);
                                if (updatedItem?.sourceNodeId) {
                                    setTimeout(() => {
                                        console.log('[Tapnow] 视频立即返回: 准备更新预览窗口', { taskId, immediateUrl, sourceNodeId: updatedItem.sourceNodeId });
                                        updatePreviewFromTask(taskId, immediateUrl, 'video', updatedItem.sourceNodeId);
                                    }, 0);
                                } else {
                                    console.warn('[Tapnow] 视频立即返回: 未找到 sourceNodeId', { taskId, updatedItem });
                                    }
                                }
                                return updated;
                            });
                            return;
                        }

                        const jobId = data?.data?.id || data?.id || data?.task_id || data?.data?.task_id;
                        if (!jobId) throw new Error('No Task/Job ID returned');

                        setHistory(prev => prev.map(h => h.id === taskId ? { ...h, status: 'generating', progress: 10, remoteTaskId: jobId } : h));
                        if (modelId.includes('veo')) pollVeoJob(jobId, taskId, baseUrl, apiKey, w, h);
                        else pollSoraJob(jobId, taskId, baseUrl, apiKey, w, h, modelId);
                    }
                } catch (err) {
                    console.error('[CONSOLE_ERROR]', err);
                    // 尝试解析错误信息，提取更友好的错误消息
                    let errorMsg = err?.message || '生成失败';
                    try {
                        // 如果错误信息是 JSON 字符串，尝试解析
                        if (typeof errorMsg === 'string' && errorMsg.trim().startsWith('{')) {
                            const errorData = JSON.parse(errorMsg);
                            if (errorData?.error?.message) {
                                errorMsg = errorData.error.message;
                            } else if (errorData?.error) {
                                errorMsg = typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error);
                            } else if (errorData?.message) {
                                errorMsg = errorData.message;
                            }
                        }

                        // 检查是否是后端服务模块缺失错误，优化错误信息显示
                        if (errorMsg.includes('Cannot find module') || errorMsg.includes('octetstream') || errorMsg.includes('MODULE_NOT_FOUND')) {
                            // 检查是否已经包含优化后的错误信息，避免重复
                            if (!errorMsg.includes('即梦API代理服务缺少必要模块') && !errorMsg.includes('❌')) {
                                // 提取原始错误信息（去掉可能的重复前缀）
                                const originalError = errorMsg.replace(/后端服务错误[：:].*?错误详情[：:]/g, '').trim();
                                errorMsg = `❌ 即梦API代理服务缺少必要模块\n\n错误：${originalError}\n\n🔧 解决方案：\n1. 停止jimeng-api.exe并重新下载最新版本\n2. 或使用Docker：docker pull ghcr.io/iptag/jimeng-api:latest`;
                            } else if (!errorMsg.includes('🔧')) {
                                // 如果已经有基本错误信息但没有解决方案，添加解决方案
                                errorMsg = errorMsg + '\n\n🔧 解决方案：\n1. 停止jimeng-api.exe并重新下载最新版本\n2. 或使用Docker：docker pull ghcr.io/iptag/jimeng-api:latest';
                            }
                        }
                    } catch (e) {
                        // 如果解析失败，使用原始错误信息
                        // 但仍然检查是否是模块缺失错误
                        if (errorMsg.includes('Cannot find module') || errorMsg.includes('octetstream') || errorMsg.includes('MODULE_NOT_FOUND')) {
                            // 检查是否已经包含优化后的错误信息
                            if (!errorMsg.includes('即梦API代理服务缺少必要模块') && !errorMsg.includes('❌')) {
                                errorMsg = `❌ 即梦API代理服务缺少必要模块\n\n🔧 解决方案：\n1. 停止jimeng-api.exe并重新下载最新版本\n2. 或使用Docker：docker pull ghcr.io/iptag/jimeng-api:latest`;
                            }
                        }
                    }
                    setHistory((prev) => prev.map((hItem) => hItem.id === taskId ? { ...hItem, status: 'failed', errorMsg } : hItem));
                    // 分镜表任务：提交阶段失败也必须解除 generating（否则分镜表会一直转圈）
                    const storyboardTask = storyboardTaskMapRef.current.get(taskId);
                    if (storyboardTask) {
                        updateShot(storyboardTask.nodeId, storyboardTask.shotId, { status: 'draft' });
                        storyboardTaskMapRef.current.delete(taskId);
                    }
                }
            };

            const handleToggleTheme = () => {
                setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
            };

            // 功能1：批量下载选中的图片/视频节点
            const handleBatchDownload = async () => {
                // 使用ref获取最新的状态，避免闭包问题
                const currentNodes = nodesRef.current;
                const currentSelectedId = selectedNodeIdRef.current;
                const currentSelectedIds = selectedNodeIdsRef.current;

                const selectedNodes = currentNodes.filter(node =>
                    (currentSelectedId === node.id || (currentSelectedIds && currentSelectedIds.has(node.id))) &&
                    (node.type === 'input-image' || node.type === 'video-input' || node.type === 'preview') &&
                    node.content
                );

                if (selectedNodes.length === 0) {
                    alert('请先选择要下载的图片或视频节点');
                    return;
                }

                for (const node of selectedNodes) {
                    try {
                        const url = node.content;
                        // 检查URL是否有效
                        if (!url || (typeof url !== 'string' && !url.startsWith('data:'))) {
                            console.warn(`节点 ${node.id} 的内容URL无效:`, url);
                            continue;
                        }
                        const response = await fetch(url);
                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                        }
                        const blob = await response.blob();
                        const blobUrl = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = blobUrl;

                        // 判断文件扩展名：对于预览窗口，根据previewType判断；对于其他节点，根据URL或节点类型判断
                        let extension = '.png';
                        if (node.type === 'preview') {
                            // 预览窗口：根据previewType判断
                            if (node.previewType === 'video') {
                                extension = '.mp4';
                            } else {
                                extension = isVideoUrl(url) ? '.mp4' : '.png';
                            }
                        } else if (node.type === 'video-input') {
                            extension = '.mp4';
                        } else {
                            extension = isVideoUrl(url) ? '.mp4' : '.png';
                        }

                        const filename = `${node.id}${extension}`;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(blobUrl);
                        // 添加小延迟避免浏览器阻止多个下载
                        await new Promise(resolve => setTimeout(resolve, 100));
                    } catch (error) {
                        console.error(`下载节点 ${node.id} 失败:`, error);
                        // 不中断其他节点的下载，继续处理下一个
                    }
                }
            };

            // 功能5：保存项目到JSON文件（流式写入，支持超大文件）
            const handleSaveProject = async () => {
                try {
                    const saved = await saveProject({
                        projectName,
                        nodes,
                        connections,
                        view,
                        history,
                        chatSessions,
                        characterLibrary
                    });
                    if (saved) alert('项目保存成功！');
                } catch (error) {
                    console.error('保存项目失败:', error);
                    if (error.name === 'AbortError') return;
                    alert('保存失败: ' + (error.message || '未知错误'));
                }
            };

            // 保存选中的工作流（框选节点后右键保存）
            const handleSaveSelectedWorkflow = async () => {
                try {
                    setSelectionContextMenu({ visible: false, x: 0, y: 0 });

                    const selectedIds = selectedNodeIds.size > 0 ? selectedNodeIds : (selectedNodeId ? new Set([selectedNodeId]) : new Set());
                    if (selectedIds.size === 0) {
                        alert('请先选择要保存的节点');
                        return;
                    }

                    const selectedNodes = nodes.filter(n => selectedIds.has(n.id));
                    const selectedConnections = connections.filter(
                        conn => selectedIds.has(conn.from) && selectedIds.has(conn.to)
                    );

                    const saved = await saveSelectedWorkflow({ selectedNodes, selectedConnections });
                    if (saved) alert('工作流保存成功！');
                } catch (error) {
                    console.error('保存工作流失败:', error);
                    if (error.name === 'AbortError') return;
                    alert('保存失败: ' + (error.message || '未知错误'));
                }
            };

            // 处理画布右键菜单（框选节点后）
            const handleCanvasContextMenu = (e) => {
                e.preventDefault();
                e.stopPropagation();

                // 检查是否有选中的节点
                const hasSelection = selectedNodeIds.size > 0 || selectedNodeId;
                if (hasSelection) {
                    setSelectionContextMenu({
                        visible: true,
                        x: e.clientX,
                        y: e.clientY
                    });
                }
            };

            // 导入工作流（将工作流节点添加到当前画布）
            const handleImportWorkflow = async () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    try {
                        const canvasElement = canvasRef.current;
                        let importPosition = { x: 100, y: 100 };
                        if (canvasElement) {
                            const rect = canvasElement.getBoundingClientRect();
                            const centerX = rect.width / 2;
                            const centerY = rect.height / 2;
                            importPosition = screenToWorld(centerX + rect.left, centerY + rect.top);
                        }

                        const { newNodes, newConnections } = await importWorkflowFromFile({ file, importPosition });
                        setNodes(prev => [...prev, ...newNodes]);
                        setConnections(prev => [...prev, ...newConnections]);
                        setSelectedNodeIds(new Set(newNodes.map(n => n.id)));

                        alert(`工作流导入成功！\n\n导入了 ${newNodes.length} 个节点和 ${newConnections.length} 个连接。`);
                    } catch (error) {
                        console.error('导入工作流失败:', error);
                        alert('导入失败: ' + (error.message || '无效的JSON文件'));
                    }
                };
                input.click();
            };

            // 功能5：从JSON文件加载项目（流式读取，支持超大文件，修复多行JSON解析问题，解决内存泄露）
            const handleLoadProject = () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    setProgressState({ visible: true, progress: 0, status: 'INITIALIZING...', type: 'import' });

                    try {
                        const tempState = await loadProjectFromFile({
                            file,
                            onProgress: ({ progress, status }) => {
                                setProgressState(prev => ({ ...prev, progress, status }));
                            }
                        });

                        setProgressState(prev => ({ ...prev, progress: 100, status: 'FINALIZING...' }));

                        setTimeout(() => {
                            if (tempState.projectName) setProjectName(tempState.projectName);
                            if (tempState.view) setView(tempState.view);
                            if (tempState.connections.length > 0) setConnections(tempState.connections);
                            if (tempState.chatSessions.length > 0) setChatSessions(tempState.chatSessions);
                            if (tempState.characterLibrary.length > 0) setCharacterLibrary(tempState.characterLibrary);
                            if (tempState.nodes.length > 0) setNodes(tempState.nodes);
                            if (tempState.history.length > 0) setHistory(tempState.history);

                            setProgressState(prev => ({ ...prev, visible: false }));
                            alert(`加载成功！\n${tempState.nodes.length} 个节点`);
                        }, 200);
                    } catch (error) {
                        console.error('加载失败:', error);
                        setProgressState(prev => ({ ...prev, visible: false }));
                        alert(`加载失败: ${error.message}`);
                    }
                };
                input.click();
            };

            // --- 节点操作 ---
            const addNode = (type, worldX, worldY, sourceId, initialContent = undefined, initialDimensions = undefined, targetId = undefined, inputType = undefined) => {
                const defaultSize = getDefaultNodeSize(type);
                const newNode = {
                    id: `node-${Date.now()}`,
                    type,
                    x: worldX - defaultSize.w / 2,
                    y: worldY - defaultSize.h / 2,
                    width: defaultSize.w,
                    height: defaultSize.h,
                    content: initialContent,
                    ...(initialDimensions ? { dimensions: initialDimensions } : {}),
                    settings: createDefaultNodeSettings(type, { apiConfigs, initialContent }),
                };
                setNodes(prev => [...prev, newNode]);
                // 从输出端口连接到新节点（原有逻辑）
                if (sourceId) {
                    setConnections(prev => [...prev, { id: `conn-${Date.now()}`, from: sourceId, to: newNode.id }]);
                }
                // 从输入端口连接到新节点（反向连接）
                if (targetId) {
                    setConnections(prev => {
                        // 如果连接到特定输入点，先删除该输入点的旧连接
                        if (inputType && inputType !== 'default') {
                            const filtered = prev.filter((c) =>
                                !(c.to === targetId && (c.inputType || 'default') === inputType)
                            );
                            return [...filtered, {
                                id: `conn-${Date.now()}`,
                                from: newNode.id,
                                to: targetId,
                                inputType: inputType !== 'default' ? inputType : undefined
                            }];
                        }
                        return [...prev, {
                            id: `conn-${Date.now()}`,
                            from: newNode.id,
                            to: targetId
                        }];
                    });
                }
                setContextMenu(prev => ({ ...prev, visible: false }));
                setConnectingSource(null);
                setConnectingTarget(null);
                setConnectingInputType(null);
            };

            const deleteNode = useCallback((id) => {
                setNodes((prev) => prev.filter((n) => n.id !== id));
                setConnections((prev) => prev.filter((c) => c.from !== id && c.to !== id));
                if (selectedNodeId === id) setSelectedNodeId(null);
            }, [selectedNodeId]);

            // 获取连接的 gen-image 或 gen-video 节点（用于 storyboard-node 节点）
            const getConnectedGenNodes = useCallback((sourceNodeId) => {
                const genNodes = [];
                for (const conn of connections) {
                    if (conn.from === sourceNodeId) {
                        const targetNode = nodesMap.get(conn.to);
                        if (targetNode && (targetNode.type === 'gen-image' || targetNode.type === 'gen-video')) {
                            genNodes.push(targetNode);
                        }
                    }
                }
                return genNodes;
            }, [connections, nodesMap]);

            // 获取模型的默认时长
            // 获取风格前缀
            const getStylePrefix = useCallback((style) => {
                switch(style) {
                    case '2d-anime': return '2D动漫风格';
                    case '3d-anime': return '3D动漫风格';
                    case 'realistic': return '写实风格';
                    case 'selfie': return '自拍风格';
                    case 'news': return '新闻风格';
                    case 'manga': return '漫画风格';
                    default: return '动漫风格';
                }
            }, []);

            // 本地提示词过滤函数（降级方案）- 角色专用，确保白色背景
            const filterCharacterPromptLocal = useCallback((prompt) => {
                if (!prompt) return '';

                // 1. 移除所有对话内容
                let filtered = prompt.replace(/["'""「」](.*?)[^,，。；！？、\s]["'""「」]/g, '');

                // 2. 移除游戏相关描述
                filtered = filtered.replace(/利用《.*?》游戏.*?/g, '');

                // 3. 移除内心独白描述
                filtered = filtered.replace(/内心(.*?)(?=[，。；！？、\s])/g, '');

                // 4. 移除动作描述
                filtered = filtered.replace(/(推动|拉动|操作|转身|站立|走动|说|介绍|正在|负责|穿着|站在|面对|做)(.*?)(?=[，。；！？、\s])/g, '');

                // 5. 移除特定短语
                filtered = filtered.replace(/(天命杠杆|战舰|游戏|操作|控制|推进|推动|极低速度|以极低速度|最终|最后|现在|正在|目前|此前|起先|起初)/g, '');

                // 6. 移除360度展示相关
                filtered = filtered.replace(/，然后缓慢转一圈360度全方位展示身体/g, '');

                // 7. 移除场景描述，确保背景是纯白色
                filtered = filtered.replace(/(背景|场景|环境|建筑|地点|位置|周围|附近|后面|前面|旁边)(.*?)(?=[，。；！？、\s])/g, '');

                // 8. 确保包含纯白色背景描述
                if (!filtered.includes('白色背景') && !filtered.includes('纯白色背景')) {
                    filtered = filtered.replace(/(动漫风格，全身视角，)/, '$1站在纯白色背景前，');
                    if (!filtered.includes('纯白色背景')) {
                        filtered = `动漫风格，全身视角，站在纯白色背景前，${filtered}`;
                    }
                }

                // 9. 清理多余空格和标点
                filtered = filtered.replace(/\s{2,}/g, ' ').replace(/[，。；！？、]{2,}/g, '，').trim();

                // 10. 如果过滤后内容太少，恢复基本结构
                if (filtered.length < 50) {
                    filtered = `动漫风格，全身视角，站在纯白色背景前，角色穿着简洁的服装，表情平静，姿态自然`;
                }

                return filtered;
            }, []);

            // 场景提示词本地过滤函数（降级方案）
            const filterScenePromptLocal = useCallback((prompt) => {
                if (!prompt) return '';

                // 移除人物相关描述
                let filtered = prompt.replace(/(人物|角色|角色名|人名|站在|面向|说|介绍|正在|负责|穿着|动作|表情|姿态|外貌|服装)(.*?)(?=[，。；！？、\s])/g, '');

                // 移除对话内容
                filtered = filtered.replace(/["'""「」](.*?)[^,，。；！？、\s]["'""「」]/g, '');

                // 移除特定人物相关短语
                filtered = filtered.replace(/(名叫|角色|人物|角色名|人名|站在|面向|说|介绍|正在|负责|穿着|动作|表情|姿态|外貌|服装|角色特征)/g, '');

                // 清理多余空格和标点
                filtered = filtered.replace(/\s{2,}/g, ' ').replace(/[，。；！？、]{2,}/g, '，').trim();

                // 如果过滤后内容太少，恢复基本结构
                if (filtered.length < 30) {
                    filtered = `场景描述：环境、建筑、背景`;
                }

                return filtered;
            }, []);

            // 提示词过滤函数 - 使用大模型API过滤（角色专用，确保白色背景）
            const filterCharacterPrompt = useCallback(async (rawPrompt) => {
                if (!rawPrompt || rawPrompt.trim().length === 0) return rawPrompt;

                try {
                    // 使用API配置获取聊天模型
                    const chatConfig = apiConfigs.find(c => c.type === 'Chat');
                    if (!chatConfig) {
                        console.warn('未找到聊天模型配置，使用本地过滤');
                        return filterCharacterPromptLocal(rawPrompt);
                    }

                    const apiKey = chatConfig.key || globalApiKey;
                    if (!apiKey) {
                        console.warn('API Key未配置，使用本地过滤');
                        return filterCharacterPromptLocal(rawPrompt);
                    }

                    const baseUrl = (chatConfig.url || DEFAULT_BASE_URL).replace(/\/+$/, '');

                    // 调用大模型过滤提示词，确保背景是纯白色
                    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: chatConfig.modelName || chatConfig.id || 'gpt-4o',
                            messages: [
                                {
                                    role: 'system',
                                    content: '你是一个提示词优化专家。请分析以下提示词，只保留关于人物外貌、服装、姿态等角色特征的描述，去除所有剧情、动作、对话和背景信息。输出应简洁，只包含角色特征描述，格式为"全身视角，[人物特征描述]，站在纯白色背景前"。必须确保背景始终是纯白色，不能有任何场景描述。'
                                },
                                {
                                    role: 'user',
                                    content: rawPrompt
                                }
                            ],
                            temperature: 0.3
                        })
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        console.error('提示词过滤API调用失败:', errorData);
                        return filterCharacterPromptLocal(rawPrompt);
                    }

                    const data = await response.json();
                    let filtered = data.choices?.[0]?.message?.content?.trim() || rawPrompt;

                    // 确保包含白色背景描述
                    if (!filtered.includes('白色背景') && !filtered.includes('纯白色背景')) {
                        filtered = filtered.replace(/(全身视角[，,])/, '$1站在纯白色背景前，');
                        if (!filtered.includes('纯白色背景')) {
                            filtered = `全身视角，站在纯白色背景前，${filtered}`;
                        }
                    }

                    return filtered;
                } catch (error) {
                    console.error('提示词过滤失败:', error);
                    return filterCharacterPromptLocal(rawPrompt);
                }
            }, [apiConfigs, globalApiKey, filterCharacterPromptLocal]);

            // 场景提示词过滤函数 - 过滤掉人物、字符描述
            const filterScenePrompt = useCallback(async (rawPrompt) => {
                if (!rawPrompt || rawPrompt.trim().length === 0) return rawPrompt;

                try {
                    // 使用API配置获取聊天模型
                    const chatConfig = apiConfigs.find(c => c.type === 'Chat');
                    if (!chatConfig) {
                        console.warn('未找到聊天模型配置，使用本地过滤');
                        return filterScenePromptLocal(rawPrompt);
                    }

                    const apiKey = chatConfig.key || globalApiKey;
                    if (!apiKey) {
                        console.warn('API Key未配置，使用本地过滤');
                        return filterScenePromptLocal(rawPrompt);
                    }

                    const baseUrl = (chatConfig.url || DEFAULT_BASE_URL).replace(/\/+$/, '');

                    // 调用大模型过滤提示词，只保留场景描述，去除人物、字符
                    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: chatConfig.modelName || chatConfig.id || 'gpt-4o',
                            messages: [
                                {
                                    role: 'system',
                                    content: '你是一个场景描述优化专家。请分析以下提示词，只保留关于场景、环境、建筑、背景等场景特征的描述，去除所有人物、角色、字符、对话和动作描述。输出应简洁，只包含场景特征描述，不能包含任何人物或角色。'
                                },
                                {
                                    role: 'user',
                                    content: rawPrompt
                                }
                            ],
                            temperature: 0.3
                        })
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        console.error('场景提示词过滤API调用失败:', errorData);
                        return filterScenePromptLocal(rawPrompt);
                    }

                    const data = await response.json();
                    const filtered = data.choices?.[0]?.message?.content?.trim() || rawPrompt;
                    return filtered;
                } catch (error) {
                    console.error('场景提示词过滤失败:', error);
                    return filterScenePromptLocal(rawPrompt);
                }
            }, [apiConfigs, globalApiKey, filterScenePromptLocal]);

            // 生成角色描述提示词
            const generateCharacterPrompt = useCallback((character, mode = 'video', style = 'none') => {
                const age = character.age || '25';
                const gender = character.gender || '年轻男人';
                const stylePrefix = getStylePrefix(style);
                const basePrompt = `${stylePrefix}，全身视角，名叫${character.name}的${age}岁左右${gender}站在白色背景前，${character.description || '皮肤因长期处于室内而显得苍白，凌乱的黑色碎发遮住额头，眼神疲惫却透着一股锐利的机智，深灰色瞳孔，上身穿着一件原本华丽但此刻解开扣子、袖口卷起的白色金边军礼服外套，内搭一件普通的深灰色吸汗T恤，下身穿着沾染了少许机油污渍的白色笔挺军裤，脚穿厚重的黑色防滑军靴，身材精瘦结实，气质颓废中带着不羁'}，正在用中文普通话面向镜头做自我介绍，说着：我是${character.name}，${character.role || '这艘船的首席手动推进官，也就是个推杆子的苦力'}`;

                // 如果是视频模式，添加360度展示提示词
                if (mode === 'video') {
                    return `${basePrompt}，然后缓慢转一圈360度全方位展示身体`;
                }

                return basePrompt;
            }, [getStylePrefix]);

            // 生成场景描述提示词
            const generateScenePrompt = useCallback((scene) => {
                return scene.description || `极度奢华的星际战舰舰桥内部，空间广阔如同一座宫殿，四壁装饰着繁复的黄金浮雕与象牙立柱，地面铺着深红色的天鹅绒地毯，巨大的落地舷窗外是深邃星空，中央悬挂着水晶吊灯，操作台被伪装成古典家具的样子，整体色调金碧辉煌，氛围庄严却透着一种不切实际的荒谬感`;
            }, []);

            // 自动生成完整工作流（描述节点 -> 视频生成节点 -> 创建节点）
            const generateFullWorkflow = useCallback((extractNodeId, analysisResults) => {
                const extractNode = nodesMap.get(extractNodeId);
                if (!extractNode) return;

                // 计算起始位置（在提取节点右侧）
                const worldX = extractNode.x + extractNode.width + 100;
                const worldY = extractNode.y;

                const descriptionNodes = [];
                const videoNodes = [];
                const createNodes = [];
                const newConnections = [];
                const timestamp = Date.now();

                // 1. 创建角色描述节点、视频生成节点和创建节点
                if (analysisResults.characters && analysisResults.characters.length > 0) {
                    analysisResults.characters.forEach((character, idx) => {
                        // 角色描述节点
                        const descNodeId = `node-char-desc-${timestamp}-${idx}`;
                        descriptionNodes.push({
                            id: descNodeId,
                            type: 'character-description',
                            x: worldX,
                            y: worldY + (idx * 450),
                            width: 400,
                            height: 400,
                            settings: {
                                characterId: character.id,
                                characterName: character.name,
                                role: character.role,
                                description: character.description,
                                duration: '15s',
                                style: 'none',
                                mode: 'video',
                                prompt: generateCharacterPrompt(character, 'video')
                            }
                        });

                        // 视频生成节点
                        const videoNodeId = `node-char-video-${timestamp}-${idx}`;
                        videoNodes.push({
                            id: videoNodeId,
                            type: 'generate-character-video',
                            x: worldX + 420,
                            y: worldY + (idx * 450),
                            width: 400,
                            height: 450,
                            settings: {
                                model: 'sora-2',
                                duration: '15s',
                                ratio: '16:9',
                                videoPrompt: generateCharacterPrompt(character),
                                sourceType: 'character-description',
                                sourceId: descNodeId
                            }
                        });

                        // 创建角色节点
                        const createNodeId = `node-char-create-${timestamp}-${idx}`;
                        createNodes.push({
                            id: createNodeId,
                            type: 'create-character',
                            x: worldX + 840,
                            y: worldY + (idx * 450),
                            width: 350,
                            height: 300,
                            settings: {
                                name: character.name,
                                startSecond: 1,
                                endSecond: 3
                            }
                        });

                        // 创建连接
                        newConnections.push({
                            id: `conn-char-${timestamp}-${idx}`,
                            from: extractNodeId,
                            to: descNodeId
                        });
                        newConnections.push({
                            id: `conn-video-${timestamp}-${idx}`,
                            from: descNodeId,
                            to: videoNodeId
                        });
                        newConnections.push({
                            id: `conn-create-${timestamp}-${idx}`,
                            from: videoNodeId,
                            to: createNodeId
                        });
                    });
                }

                // 2. 创建场景描述节点、视频生成节点和创建节点
                if (analysisResults.scenes && analysisResults.scenes.length > 0) {
                    const characterCount = analysisResults.characters ? analysisResults.characters.length : 0;
                    analysisResults.scenes.forEach((scene, idx) => {
                        // 场景描述节点
                        const descNodeId = `node-scene-desc-${timestamp}-${idx}`;
                        descriptionNodes.push({
                            id: descNodeId,
                            type: 'scene-description',
                            x: worldX,
                            y: worldY + ((characterCount + idx) * 450),
                            width: 400,
                            height: 400,
                            settings: {
                                sceneId: scene.id,
                                sceneName: scene.name,
                                description: scene.description,
                                duration: '15s',
                                style: 'none',
                                prompt: generateScenePrompt(scene)
                            }
                        });

                        // 视频生成节点
                        const videoNodeId = `node-scene-video-${timestamp}-${idx}`;
                        videoNodes.push({
                            id: videoNodeId,
                            type: 'generate-scene-video',
                            x: worldX + 420,
                            y: worldY + ((characterCount + idx) * 450),
                            width: 400,
                            height: 450,
                            settings: {
                                model: 'sora-2',
                                duration: '15s',
                                ratio: '16:9',
                                videoPrompt: generateScenePrompt(scene),
                                sourceType: 'scene-description',
                                sourceId: descNodeId
                            }
                        });

                        // 创建场景节点
                        const createNodeId = `node-scene-create-${timestamp}-${idx}`;
                        createNodes.push({
                            id: createNodeId,
                            type: 'create-scene',
                            x: worldX + 840,
                            y: worldY + ((characterCount + idx) * 450),
                            width: 350,
                            height: 300,
                            settings: {
                                name: scene.name,
                                timeRange: '1,3'
                            }
                        });

                        // 创建连接
                        newConnections.push({
                            id: `conn-scene-${timestamp}-${idx}`,
                            from: extractNodeId,
                            to: descNodeId
                        });
                        newConnections.push({
                            id: `conn-video-scene-${timestamp}-${idx}`,
                            from: descNodeId,
                            to: videoNodeId
                        });
                        newConnections.push({
                            id: `conn-create-scene-${timestamp}-${idx}`,
                            from: videoNodeId,
                            to: createNodeId
                        });
                    });
                }

                // 批量添加到节点和连接
                const allNodes = [...descriptionNodes, ...videoNodes, ...createNodes];
                if (allNodes.length > 0) {
                    setNodes(prev => [...prev, ...allNodes]);
                }
                if (newConnections.length > 0) {
                    setConnections(prev => [...prev, ...newConnections]);
                }
            }, [nodesMap, generateCharacterPrompt, generateScenePrompt]);

            // 分镜表节点功能函数
            const addEmptyShot = (nodeId) => {
                const node = nodesMap.get(nodeId);
                if (!node || node.type !== 'storyboard-node') return;
                // 获取默认视频模型（优先使用 sora-2，否则使用第一个视频模型）
                const defaultModel = apiConfigs.find(c => c.type === 'Video' && c.id === 'sora-2')?.id || apiConfigs.find(c => c.type === 'Video')?.id || '';
                const newShot = createEmptyStoryboardShot({
                    shotCount: node.settings?.shots?.length || 0,
                    defaultModel,
                });
                updateNodeSettings(nodeId, {
                    shots: [...(node.settings?.shots || []), newShot]
                });
            };

            const deleteShot = (nodeId, shotId) => {
                const node = nodesMap.get(nodeId);
                if (!node || node.type !== 'storyboard-node') return;
                const updatedShots = renumberStoryboardShots((node.settings?.shots || []).filter(s => s.id !== shotId));
                updateNodeSettings(nodeId, { shots: updatedShots });
            };

            const updateShot = (nodeId, shotId, updates) => {
                const node = nodesMap.get(nodeId);
                if (!node || node.type !== 'storyboard-node') return;
                const updatedShots = updateStoryboardShot(node.settings?.shots || [], shotId, updates);
                updateNodeSettings(nodeId, { shots: updatedShots });
            };

            // 从 video-analyze 节点导入分析结果
            const importShotsFromAnalysis = (nodeId) => {
                const storyboardNode = nodesMap.get(nodeId);
                if (!storyboardNode || storyboardNode.type !== 'storyboard-node') return;

                const analyzeNode = getConnectedVideoAnalyzeNode(nodeId);
                if (!analyzeNode) {
                    alert('请先连接一个视频拆解节点');
                    return;
                }

                // 获取分析结果（优先使用 settings.analysisResults，其次使用 analysisResults）
                const analysisResults = analyzeNode.settings?.analysisResults || analyzeNode.analysisResults || [];
                if (analysisResults.length === 0) {
                    alert('视频拆解节点没有分析结果，请先执行分析');
                    return;
                }

                const newShots = createShotsFromAnalysisResults(analysisResults);

                updateNodeSettings(nodeId, { shots: newShots });
            };

            // 自动从分析结果创建分镜表节点
            const createStoryboardFromAnalysisResult = (analyzeNodeId, analysisResults) => {
                const analyzeNode = nodesMap.get(analyzeNodeId);
                if (!analyzeNode || !analysisResults || analysisResults.length === 0) {
                    console.warn('[自动生成分镜表] 分析节点不存在或分析结果为空');
                    return;
                }

                // 1. 数据转换 (复用现有逻辑)
                const newShots = createShotsFromAnalysisResults(analysisResults, {
                    includeGlobalCamera: true,
                });

                // 2. 计算新节点位置（放在源节点右侧）
                const newX = analyzeNode.x + analyzeNode.width + 100;
                const newY = analyzeNode.y;
                const storyboardId = `node-storyboard-${Date.now()}`;

                // 3. 创建节点
                const newNode = {
                    id: storyboardId,
                    type: 'storyboard-node',
                    x: newX,
                    y: newY,
                    width: 600,
                    height: 500,
                    settings: {
                        projectTitle: 'AI 拆解结果',
                        shots: newShots
                    }
                };

                // 4. 更新状态
                setNodes(prev => [...prev, newNode]);
                setConnections(prev => [...prev, {
                    id: `conn-${Date.now()}`,
                    from: analyzeNodeId,
                    to: storyboardId
                }]);

                console.log('[自动生成分镜表] 已创建分镜表节点，包含', newShots.length, '个镜头');
            };

            // 分镜表任务映射：用于追踪从分镜表触发的生成任务
            const storyboardTaskMapRef = useRef(new Map()); // taskId -> { storyboardNodeId, shotId }

            // 跟踪当前聚焦的提示词文本框
            const focusedPromptTextareaRef = useRef(null);

            // 生成单个镜头
            // 重构后的生成单个镜头函数：原地生成，不依赖外部节点
            // 创建角色
            const createCharacter = async (videoUrl, startSecond, endSecond, fromTaskId = null, customEndpoint = null) => {
                try {
                    // 1. 获取配置
                    const soraConfig = apiConfigs.find(c => c.type === 'Video' && (c.id === 'sora-2' || c.id === 'sora-2-pro'));
                    if (!soraConfig) {
                        alert('未找到 Sora 2 模型配置，请先在设置中配置 Sora 2 或 Sora 2 Pro');
                        setCreateCharacterSubmitting(false);
                        return;
                    }

                    const apiKey = soraConfig.key || globalApiKey;

                    if (!apiKey) {
                        alert('请先配置 API Key');
                        setCreateCharacterSubmitting(false);
                        return;
                    }

                    // 验证时间范围
                    if (endSecond - startSecond < 1 || endSecond - startSecond > 3) {
                        alert('时间范围必须在 1-3 秒之间');
                        setCreateCharacterSubmitting(false);
                        return;
                    }

                    // 2. 使用用户提供的 endpoint 或自动构造
                    const timestamps = `${startSecond},${endSecond}`;
                    let endpoint;
                    if (customEndpoint && customEndpoint.trim()) {
                        endpoint = customEndpoint.trim();
                    } else {
                        // 如果没有提供，使用默认路径
                        const baseUrl = (soraConfig.url || DEFAULT_BASE_URL).replace(/\/+$/, '');
                        endpoint = `${baseUrl}/sora/v1/characters`;
                    }

                    // 3. 构造 Body
                    const payload = fromTaskId
                        ? { from_task: fromTaskId, timestamps }
                        : { url: videoUrl, timestamps };

                    // 4. 详细调试日志
                    console.log('[Create Character] Request Details:', {
                        endpoint,
                        apiKey: apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : 'EMPTY',
                        payload,
                        fromTaskId,
                        videoUrl: fromTaskId ? 'N/A (using from_task)' : videoUrl,
                        customEndpoint: customEndpoint || 'N/A (using default)'
                    });

                    // 5. 发送请求
                    const resp = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(payload)
                    });

                    // 6. 错误处理
                    if (!resp.ok) {
                        const errText = await resp.text();
                        console.error('[Create Character] API Error:', {
                            status: resp.status,
                            statusText: resp.statusText,
                            errorText: errText,
                            endpoint
                        });

                        // 尝试解析错误响应
                        let errorData = null;
                        try {
                            errorData = JSON.parse(errText);
                        } catch (e) {
                            // 如果不是 JSON，使用原始文本
                        }

                        // 特殊处理 500 错误和 get_origin_task_failed
                        if (resp.status === 500 || (errorData && (errorData.code === 'get_origin_task_failed' || errorData.message?.includes('get_origin_task_failed')))) {
                            throw new Error('TASK_NOT_FOUND');
                        }

                        throw new Error(`API错误 (${resp.status}): ${errText || resp.statusText}`);
                    }

                    const data = await resp.json();
                    console.log('[Create Character] Success:', data);

                    // 7. 保存到角色库
                    if (data.id && data.username) {
                        const newCharacter = {
                            id: data.id,
                            username: data.username,
                            profile_picture_url: data.profile_picture_url || '',
                            permalink: data.permalink || ''
                        };

                        const updated = [...characterLibrary, newCharacter];
                        setCharacterLibrary(updated);
                        alert(`角色 "${data.username}" 创建成功！`);
                        setCreateCharacterOpen(false);
                        resetCreateCharacterForm();
                    } else {
                        throw new Error('返回数据缺少 id 或 username');
                    }
                } catch (err) {
                    console.error('[Create Character] Failed:', err);
                    let msg = err.message;

                    // 特殊处理：原任务已过期或无法访问
                    if (msg === 'TASK_NOT_FOUND') {
                        alert('创建失败：原任务已过期或无法访问。\n\n请尝试获取该视频的下载链接，使用"输入视频 URL"方式重新创建。');
                        return;
                    }

                    // 处理网络错误
                    if (msg.includes('Failed to fetch') || err.name === 'TypeError' || err.message.includes('NetworkError')) {
                        msg = '连接失败。可能原因：\n\n1. API 地址填写错误\n   - 请检查 API 接口地址是否多余了 "/sora" 前缀\n   - 有些服务商的路径可能不同，请询问服务商 Sora 角色创建接口的准确路径\n\n2. 跨域限制 (CORS)\n   - 请尝试安装 Allow CORS 浏览器插件\n\n3. 网络问题\n   - 请检查网络连接';
                    }

                    alert(`创建角色失败: ${msg}`);
                } finally {
                    setCreateCharacterSubmitting(false);
                }
            };

            const generateSingleShot = (nodeId, shot) => {
                // 1. 构建更加丰富的 Prompt
                // 优先级：提示词 > 画面描述 > 风格标签 > 运镜
                let finalPrompt = shot.prompt || "";

                // 如果提示词为空，尝试使用描述自动构建
                if (!finalPrompt && shot.description) {
                    finalPrompt = shot.description;
                }

                // 拼接风格标签 (Style Tags)
                if (shot.tags && shot.tags.length > 0) {
                    const styleText = shot.tags.join(", ");
                    finalPrompt += `, ${styleText}`;
                }

                // 拼接运镜 (Camera)
                if (shot.camera) {
                    finalPrompt += `, ${shot.camera} camera movement`;
                }

                if (!finalPrompt) {
                    alert('请至少填写画面描述或提示词');
                    return;
                }

                // 2. 获取选中的视频模型（必须选择视频模型）
                const selectedModel = shot.model || (apiConfigs.find(c => c.type === 'Video' && c.id === 'sora-2')?.id || apiConfigs.find(c => c.type === 'Video')?.id || '');
                const modelConfig = apiConfigsMap.get(selectedModel);

                if (!modelConfig || modelConfig.type !== 'Video') {
                    alert('请先选择一个视频模型');
                    return;
                }

                // 3. 准备参考图 (Image Input)
                // 如果分镜格子里已经有图（比如用户拖入的参考图），则将其作为 img2img/img2vid 的输入
                const sourceImages = [];
                if (shot.image_url) {
                    sourceImages.push(shot.image_url);
                }

                // 4. 更新 shot 状态为生成中
                updateShot(nodeId, shot.id, { status: 'generating' });

                // 5. 构建覆盖选项
                const overrideOptions = {
                    model: selectedModel,
                    ratio: shot.ratio || '16:9',
                    duration: shot.duration || getDefaultDurationForModel(selectedModel)
                };

                // 6. 创建一个特殊的节点ID用于标识这是分镜表的任务
                // 格式：storyboard-${nodeId}-shot-${shotId}
                const virtualNodeId = `storyboard-${nodeId}-shot-${shot.id}`;

                // 7. 预先记录任务映射（在 startGeneration 创建 taskId 之前）
                // 由于 startGeneration 内部会使用 Date.now().toString() 作为 taskId
                // 我们需要在 startGeneration 内部检查 sourceNodeId 模式并自动记录
                // 这里我们先调用 startGeneration，任务映射会在 startGeneration 内部完成

                // 调用核心生成函数
                startGeneration(finalPrompt, 'video', sourceImages, virtualNodeId, overrideOptions);
            };

            // 拓展图片 Zoom Out 功能
            const handleExpandImageZoom = async (nodeId, zoomLevel) => {
                const node = nodesMap.get(nodeId);
                if (!node || !node.content) {
                    console.warn('拓展图片: 节点不存在或没有图片内容');
                    return;
                }

                // 查找 Midjourney 配置（优先使用节点设置中选择的模型）
                const selectedMjModelId = node.settings?.mjModel || 'mj-v7';
                let mjConfig = apiConfigs.find(c => c.id === selectedMjModelId);

                // 如果找不到，尝试查找任何 Midjourney 配置
                if (!mjConfig) {
                    mjConfig = apiConfigs.find(c => c.id.includes('mj') || c.provider.toLowerCase().includes('midjourney'));
                }

                if (!mjConfig) {
                    alert('请先配置 Midjourney API');
                    setSettingsOpen(true);
                    return;
                }

                const apiKey = mjConfig.key || globalApiKey;
                const baseUrl = (mjConfig.url || DEFAULT_BASE_URL).replace(/\/+$/, '');
                if (!apiKey) {
                    alert('请先配置 Midjourney API Key');
                    setSettingsOpen(true);
                    return;
                }

                try {
                    // 1. 上传图片获取 HTTP URL（如果是 data URL）
                    let imageUrl = node.content;
                    if (imageUrl.startsWith('data:')) {
                        console.log('拓展图片: 开始上传图片获取 HTTP URL...', 'baseUrl:', baseUrl, 'apiKey存在:', !!apiKey);
                        const httpUrl = await uploadImageToGetHttpUrl(imageUrl, baseUrl, apiKey);
                        if (!httpUrl) {
                            console.error('拓展图片: 图片上传失败，所有方法都失败');
                            alert('图片上传失败，无法进行拓展。请检查网络连接和API配置。');
                            return;
                        }
                        console.log('拓展图片: 图片上传成功，HTTP URL:', httpUrl);
                        imageUrl = httpUrl;
                    } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
                        console.log('拓展图片: 图片已经是HTTP URL，直接使用:', imageUrl);
                    } else {
                        console.warn('拓展图片: 图片URL格式未知:', imageUrl.substring(0, 50));
                    }

                    // 2. 先提交图片到 Midjourney 获取原始任务ID
                    const taskId = Date.now().toString();
                    const now = Date.now();

                    setHistory((prev) => [{
                        id: taskId,
                        type: 'image',
                        url: '',
                        prompt: `Zoom Out ${zoomLevel}x`,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        status: 'generating',
                        progress: 5,
                        modelName: 'Midjourney Zoom',
                        width: 0,
                        height: 0,
                        remoteTaskId: null,
                        apiConfig: { modelId: 'mj-zoom', baseUrl, apiKey },
                        sourceNodeId: nodeId,
                        startTime: now,
                        durationMs: null
                    }, ...prev]);
                    // 交互要求：生成任务不自动弹出“生成历史”面板，只允许用户手动打开/关闭

                    // 3. 提交图片到 Midjourney（使用 imagine 接口，不包含 zoom 参数）
                    const mjMode = 'fast';
                    const imagineEndpoint = `${baseUrl}/${mjMode}/mj/submit/imagine`;
                    const imaginePayload = {
                        prompt: imageUrl,
                        notifyHook: '',
                        state: ''
                    };

                    const imagineResp = await fetch(imagineEndpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        },
                        body: JSON.stringify(imaginePayload)
                    });

                    const imagineText = await imagineResp.text();
                    if (!imagineResp.ok) {
                        throw new Error(imagineText || `Imagine API error: ${imagineResp.status}`);
                    }

                    const imagineData = JSON.parse(imagineText);
                    if (imagineData.code !== 1 && imagineData.code !== 22) {
                        throw new Error(imagineData.description || `Midjourney提交失败: code ${imagineData.code}`);
                    }

                    const originalTaskId = imagineData.result;
                    if (!originalTaskId) throw new Error('未获取到任务ID');

                    console.log('拓展图片: 获取到原始任务ID', originalTaskId);

                    // 4. 等待原始任务完成（ZOOM操作需要原始任务完成）
                    console.log('拓展图片: 等待原始任务完成...', originalTaskId);
                    let originalTaskCompleted = false;
                    let pollCount = 0;
                    const maxPolls = 120; // 最多轮询120次（约10分钟）

                    while (!originalTaskCompleted && pollCount < maxPolls) {
                        await new Promise(resolve => setTimeout(resolve, 5000)); // 每5秒检查一次
                        pollCount++;

                        try {
                            const statusResp = await fetch(`${baseUrl}/${mjMode}/mj/task/${originalTaskId}/fetch`, {
                                method: 'GET',
                                headers: {
                                    'Authorization': `Bearer ${apiKey}`,
                                    'Content-Type': 'application/json'
                                }
                            });

                            const statusText = await statusResp.text();
                            const statusData = JSON.parse(statusText);
                            const status = statusData?.status || '';

                            console.log('拓展图片: 原始任务状态检查', { status, pollCount });

                        if (status === 'SUCCESS' || status === 'FINISHED') {
                            originalTaskCompleted = true;
                            console.log('拓展图片: 原始任务已完成，可以执行ZOOM操作');
                        } else if (status === 'FAILURE' || status === 'ERROR' || status === 'CANCELLED') {
                            throw new Error(`原始任务失败: ${status}`);
                        }
                    } catch (error) {
                        if (pollCount >= maxPolls) {
                            throw new Error('原始任务状态检查超时');
                        }
                        console.warn('拓展图片: 状态检查出错，继续重试', error);
                    }
                }

                if (!originalTaskCompleted) {
                    throw new Error('原始任务超时，无法执行ZOOM操作');
                }

                // 5. 使用 modal 接口提交 ZOOM 操作
                const modalEndpoint = `${baseUrl}/mj/submit/modal`;
                // ZOOM操作的prompt格式：根据Midjourney文档，使用 --zoomout 参数
                const zoomPrompt = `--zoomout ${zoomLevel}`;
                const modalPayload = {
                    taskId: originalTaskId,
                    prompt: zoomPrompt
                    // maskBase64 可选，ZOOM 不需要蒙版
                };

                console.log('拓展图片: 调用 ZOOM modal 接口', { taskId: originalTaskId, prompt: zoomPrompt });

                const modalResp = await fetch(modalEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify(modalPayload)
                });

                const modalText = await modalResp.text();
                if (!modalResp.ok) {
                    throw new Error(modalText || `Modal API error: ${modalResp.status}`);
                }

                const modalData = JSON.parse(modalText);
                if (modalData.code !== 1 && modalData.code !== 22) {
                    throw new Error(modalData.description || `ZOOM提交失败: code ${modalData.code}`);
                }

                const zoomTaskId = modalData.result;
                if (!zoomTaskId) throw new Error('未获取到ZOOM任务ID');

                console.log('拓展图片: 获取到ZOOM任务ID', zoomTaskId);

                // 6. 更新历史记录，保存ZOOM任务ID
                setHistory((prev) => prev.map((hItem) =>
                    hItem.id === taskId
                        ? { ...hItem, remoteTaskId: zoomTaskId, status: 'generating', progress: 20 }
                        : hItem
                ));

                // 7. 开始轮询ZOOM任务状态
                pollMidjourneyJob(zoomTaskId, taskId, baseUrl, apiKey, mjMode, 0, 0);
                } catch (error) {
                    console.error('拓展图片: 处理失败', error);
                    const taskId = Date.now().toString();
                    setHistory((prev) => {
                        const existing = prev.find(h => h.sourceNodeId === nodeId && h.prompt === `Zoom Out ${zoomLevel}x`);
                        if (existing) {
                            return prev.map((hItem) =>
                                hItem.id === existing.id
                                    ? { ...hItem, status: 'failed', errorMsg: error.message || '拓展失败' }
                                    : hItem
                            );
                        }
                        return prev;
                    });
                }
            };

            const handleFileUpload = (nodeId, e) => {
                const file = e.target.files?.[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                         const content = ev.target.result;
                         let dimensions = { w: 0, h: 0 };
                         try { dimensions = await getImageDimensions(content); } catch (e) {}
                         setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, content: content, dimensions } : n));
                    };
                    reader.readAsDataURL(file);
                }
            };

            // 按时间段分组关键帧
            const groupKeyframesByTime = (keyframes, segmentDuration) => {
                if (!keyframes || keyframes.length === 0) return [];
                const sorted = [...keyframes].sort((a, b) => a.time - b.time);
                const groups = [];
                let currentGroup = [];
                let currentGroupStart = sorted[0].time;

                sorted.forEach((frame, idx) => {
                    if (frame.time - currentGroupStart >= segmentDuration && currentGroup.length > 0) {
                        groups.push([...currentGroup]);
                        currentGroup = [frame];
                        currentGroupStart = frame.time;
                    } else {
                        currentGroup.push(frame);
                    }
                });

                if (currentGroup.length > 0) {
                    groups.push(currentGroup);
                }

                return groups;
            };

            // 为选中关键帧生成提示词
            const handleGeneratePrompts = async (nodeId) => {
                const node = nodesMap.get(nodeId);
                if (!node || node.type !== 'video-analyze') return;

                const videoInputNode = getConnectedVideoInputNode(nodeId);
                if (!videoInputNode) {
                    alert('请先连接一个视频输入节点');
                    return;
                }

                const selectedKeyframes = videoInputNode.selectedKeyframes || [];
                if (selectedKeyframes.length === 0) {
                    alert('请先在视频输入节点中选择关键帧');
                    return;
                }

                const config = apiConfigs.find((c) => c.id === node.settings?.model || 'gemini-3-pro');
                const apiKey = config?.key || globalApiKey;
                const baseUrl = (config?.url || DEFAULT_BASE_URL).replace(/\/+$/, '');

                if (!apiKey) {
                    alert('请先在 API 设置中配置 Key');
                    setSettingsOpen(true);
                    return;
                }

                const segmentDuration = node.settings?.segmentDuration || 3;
                const groups = groupKeyframesByTime(selectedKeyframes, segmentDuration);

                if (groups.length === 0) {
                    alert('无法分组关键帧');
                    return;
                }

                setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, isGenerating: true, analysisResults: [] } : n));

                const allResults = [];
                const videoFileName = videoInputNode.videoFileName || 'video.mp4';
                const videoDuration = videoInputNode.videoMeta?.duration || 0;
                // 保存分析模式，用于判断是否添加到历史记录
                const analysisMode = node.settings?.analysisMode || 'manual';

                try {
                    for (let sceneIndex = 0; sceneIndex < groups.length; sceneIndex++) {
                        const group = groups[sceneIndex];
                        const timeRange = `${group[0].time.toFixed(1)}s-${group[group.length - 1].time.toFixed(1)}s`;

                        // 构建多模态消息
                        const systemPrompt = `你是一个专业的视频拆解和提示词生成助手。请分析提供的视频关键帧，动态拆解视频内容，并根据用户选中的关键帧生成高质量的AI绘图提示词。

请返回严格的 JSON 格式，结构如下：
{
  "video_id": "${videoFileName}",
  "scene_index": ${sceneIndex + 1},
  "time_range": "${timeRange}",
  "keyframes": [
    {
      "type": "prev",
      "time": 5.2,
      "description": "上一画面内容简介",
      "mj_prompt": "Midjourney 英文提示词",
      "jimeng_prompt": "即梦中文提示词"
    },
    {
      "type": "current",
      "time": 6.8,
      "description": "当前画面内容简介",
      "mj_prompt": "Midjourney 英文提示词",
      "jimeng_prompt": "即梦中文提示词"
    },
    {
      "type": "next",
      "time": 8.7,
      "description": "下一画面内容简介",
      "mj_prompt": "Midjourney 英文提示词",
      "jimeng_prompt": "即梦中文提示词"
    }
  ],
  "global_tags": {
    "style": ["赛博朋克", "末日科幻"],
    "camera": ["低机位", "广角"],
    "color": ["冷暖对比"]
  }
}

要求：
1. 为每个关键帧生成 prev/current/next 三种类型的描述和提示词
2. mj_prompt 使用英文，适合 Midjourney
3. jimeng_prompt 使用中文，适合即梦AI
4. global_tags 提取整个场景的风格、镜头、色彩特征`;

                        const userContent = [
                            { type: "text", text: `请分析以下视频关键帧（场景 ${sceneIndex + 1}，时间段：${timeRange}），生成详细的提示词：` }
                        ];

                        // 添加关键帧图片（限制最多15张，因为API限制是16张，需要留一些余量）
                        const maxFrames = 15;
                        const framesToSend = group.length > maxFrames ? group.slice(0, maxFrames) : group;
                        framesToSend.forEach((frame, idx) => {
                            userContent.push({
                                type: "image_url",
                                image_url: { url: frame.url }
                            });
                            if (idx < framesToSend.length - 1) {
                                userContent.push({ type: "text", text: `关键帧 ${idx + 1}（时间：${frame.time.toFixed(2)}s）` });
                            }
                        });
                        if (group.length > maxFrames) {
                            userContent.push({ type: "text", text: `注意：该场景共有 ${group.length} 个关键帧，但为了符合API限制，仅发送了前 ${maxFrames} 个关键帧进行分析。` });
                        }

                        const apiMessages = [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userContent }
                        ];

                        // 添加超时控制（60秒）
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 60000);

                        let response;
                        try {
                            response = await fetch(`${baseUrl}/v1/chat/completions`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${apiKey}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    model: config?.modelName || 'gemini-3-pro-preview',
                                    messages: apiMessages,
                                    stream: false
                                }),
                                signal: controller.signal
                            });
                        } catch (fetchError) {
                            clearTimeout(timeoutId);
                            // 处理网络错误
                            if (fetchError.name === 'AbortError') {
                                throw new Error('请求超时，请检查网络连接或稍后重试');
                            } else if (fetchError.message && fetchError.message.includes('Failed to fetch')) {
                                throw new Error(`无法连接到 API 服务器 (${baseUrl})。请检查：\n1. API 地址是否正确\n2. 网络连接是否正常\n3. API 服务是否可用`);
                            } else {
                                throw new Error(`网络请求失败: ${fetchError.message}`);
                            }
                        } finally {
                            clearTimeout(timeoutId);
                        }

                        if (!response.ok) {
                            let errText = '';
                            try {
                                errText = await response.text();
                            } catch (e) {
                                errText = `HTTP ${response.status}: ${response.statusText}`;
                            }
                            throw new Error(errText || `API Error: ${response.status}`);
                        }

                        const data = await response.json();
                        console.log('[视频拆解] API 响应数据:', {
                            hasData: !!data,
                            hasChoices: !!data.choices,
                            choicesLength: data.choices?.length,
                            dataKeys: Object.keys(data || {}),
                            model: config?.modelName || config?.id
                        });

                        // 支持多种响应格式
                        let aiContent = null;
                        if (data.choices && data.choices.length > 0) {
                            // OpenAI 格式: data.choices[0].message.content
                            aiContent = data.choices[0]?.message?.content;
                        } else if (data.data?.choices && data.data.choices.length > 0) {
                            // 嵌套 data.choices 格式
                            aiContent = data.data.choices[0]?.message?.content;
                        } else if (data.content) {
                            // 直接 content 字段
                            aiContent = data.content;
                        } else if (data.data?.content) {
                            // 嵌套 data.content 格式
                            aiContent = data.data.content;
                        } else if (data.text) {
                            // text 字段
                            aiContent = data.text;
                        } else if (data.data?.text) {
                            // 嵌套 data.text 格式
                            aiContent = data.data.text;
                        } else if (data.message) {
                            // message 字段
                            aiContent = typeof data.message === 'string' ? data.message : data.message.content;
                        } else if (data.data?.message) {
                            // 嵌套 data.message 格式
                            aiContent = typeof data.data.message === 'string' ? data.data.message : data.data.message.content;
                        } else if (data.result) {
                            // result 字段
                            aiContent = typeof data.result === 'string' ? data.result : data.result.content;
                        } else if (data.data?.result) {
                            // 嵌套 data.result 格式
                            aiContent = typeof data.data.result === 'string' ? data.data.result : data.data.result.content;
                        }

                        if (!aiContent || aiContent.trim() === '' || aiContent === '{}') {
                            console.error('[视频拆解] API 响应内容为空:', data);
                            throw new Error(`API 返回内容为空。响应数据: ${JSON.stringify(data).substring(0, 200)}`);
                        }

                        console.log('[视频拆解] 提取的内容长度:', aiContent.length, '前100字符:', aiContent.substring(0, 100));

                        // 尝试解析 JSON（可能包含 markdown 代码块）
                        let jsonStr = aiContent.trim();
                        if (jsonStr.startsWith('```')) {
                            jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
                        }

                        let result;
                        try {
                            result = JSON.parse(jsonStr);
                            console.log('[视频拆解] JSON 解析成功，场景索引:', result.scene_index || sceneIndex + 1);
                        } catch (e) {
                            console.error('[视频拆解] 解析 JSON 失败:', e, '内容前500字符:', jsonStr.substring(0, 500));
                            // 尝试修复常见的JSON格式问题
                            try {
                                // 移除可能的注释
                                jsonStr = jsonStr.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
                                // 尝试修复尾随逗号
                                jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
                                result = JSON.parse(jsonStr);
                                console.log('[视频拆解] JSON 修复后解析成功');
                            } catch (e2) {
                                console.error('[视频拆解] JSON修复后仍解析失败:', e2, '原始内容:', jsonStr);
                                // 如果还是失败，创建一个默认结构
                                result = {
                                    video_id: videoFileName,
                                    scene_index: sceneIndex + 1,
                                    time_range: timeRange,
                                    keyframes: group.map((frame, fIdx) => ({
                                        type: fIdx === 0 ? 'prev' : fIdx === 1 ? 'current' : 'next',
                                        time: frame.time,
                                        description: `视频帧 ${frame.time.toFixed(1)}s`,
                                        mj_prompt: 'A detailed scene from the video',
                                        jimeng_prompt: '视频场景描述'
                                    })),
                                    global_tags: { style: [], camera: [], color: [] }
                                };
                                console.warn('[视频拆解] 使用默认结构，原始内容:', jsonStr.substring(0, 200));
                            }
                        }

                        allResults.push(result);
                        console.log('[视频拆解] 场景处理完成，当前结果数:', allResults.length);

                        // 更新节点状态
                        setNodes((prev) => prev.map((n) => {
                            if (n.id === nodeId) {
                                const currentResults = n.analysisResults || [];
                                const updatedResults = [...currentResults, result];
                                console.log('[视频拆解] 更新节点状态，结果数:', updatedResults.length);
                                return { ...n, analysisResults: updatedResults };
                            }
                            return n;
                        }));

                        // 只有自动模式（AI 导演拆解）才添加到历史记录，手动选帧拆解不添加到历史记录
                        const isManualMode = analysisMode === 'manual';
                        if (!isManualMode) {
                        // 添加到历史记录
                        const taskId = `analyze-${nodeId}-${sceneIndex}-${Date.now()}`;
                        const historyItem = {
                            id: taskId,
                            type: 'analyze',
                            prompt: `视频拆解 - 场景 ${sceneIndex + 1}`,
                            url: group[0]?.url || '',
                            status: 'completed',
                            progress: 100,
                            modelName: config?.provider || 'Gemini 3 Pro',
                            time: new Date().toLocaleString('zh-CN'),
                            sourceNodeId: nodeId,
                            analysisResult: result,
                            videoFileName,
                            sceneIndex: sceneIndex + 1,
                            timeRange
                        };

                        setHistory((prev) => [historyItem, ...prev]);
                        }
                    }

                    // 确保所有结果都已更新到节点
                    console.log('[视频拆解] 所有场景处理完成，总结果数:', allResults.length);
                    setNodes((prev) => prev.map((n) => {
                        if (n.id === nodeId) {
                            // 确保使用最新的 allResults
                            const finalResults = allResults.length > 0 ? allResults : (n.analysisResults || []);
                            console.log('[视频拆解] 最终更新节点，结果数:', finalResults.length);
                            return { ...n, isGenerating: false, analysisResults: finalResults };
                        }
                        return n;
                    }));

                } catch (error) {
                    console.error('生成提示词失败:', error);
                    const errorMsg = error.message || '未知错误';
                    setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, isGenerating: false, errorMsg: errorMsg } : n));
                    // 不显示 alert，错误信息已经在节点上显示
                    // alert(`生成提示词失败: ${errorMsg}`);
                }
            };

            // AI 视频全自动分析
            const handleAutoVideoAnalysis = async (nodeId) => {
                const node = nodesMap.get(nodeId);
                if (!node || node.type !== 'video-analyze') return;

                const videoInputNode = getConnectedVideoInputNode(nodeId);
                if (!videoInputNode || !videoInputNode.content) {
                    alert('请先连接一个包含视频的视频输入节点');
                    return;
                }

                // 预处理视频内容：如果是 blob: URL，需要转换为 base64 以便远程可访问
                let videoDataUrl = videoInputNode.content;
                if (videoDataUrl.startsWith('blob:')) {
                    try {
                        console.log('Converting Blob URL to Base64 for API...');
                        const blob = await fetch(videoDataUrl).then(r => r.blob());
                        videoDataUrl = await new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onerror = () => reject(new Error('FileReader failed'));
                            reader.onloadend = () => resolve(reader.result);
                            reader.readAsDataURL(blob);
                        });
                    } catch (e) {
                        console.error('Blob conversion failed', e);
                        alert('视频转换失败，无法发送给 AI');
                        return;
                    }
                }

                // 强制使用 gemini-3-pro 模型（支持视频输入）
                let config = apiConfigs.find((c) => c.id === 'gemini-3-pro' && c.type === 'Chat');

                // 如果没有找到 gemini-3-pro，尝试其他 gemini 模型
                if (!config) {
                    config = apiConfigs.find((c) => {
                        const modelId = c.id?.toLowerCase() || '';
                        return modelId.includes('gemini') && c.type === 'Chat';
                    });
                }

                // 如果还是没有，使用默认配置
                if (!config) {
                    config = apiConfigs.find((c) => c.type === 'Chat');
                }

                const apiKey = config?.key || globalApiKey;
                const baseUrl = (config?.url || DEFAULT_BASE_URL).replace(/\/+$/, '');

                if (!apiKey) {
                    alert('请先在 API 设置中配置 Key');
                    setSettingsOpen(true);
                    return;
                }

                setNodes((prev) => prev.map((n) =>
                    n.id === nodeId
                        ? { ...n, isGenerating: true, settings: { ...n.settings, voiceoverResults: [], analysisResults: [] } }
                        : n
                ));

                try {
                    const systemPrompt = `你是一位世界级的**游戏买量视频拆解专家**和**AI视觉导演**。你需要同时完成两项任务：

1. **视觉拆解**：分析视频的每一个分镜，推测其运镜手法（推拉摇移）、画面动态、人物关系。

2. **听觉提取**：提取视频中的口播文案（Voiceover）。

请按时间顺序，将视频拆解为多个关键场景，并返回如下 **JSON 格式**（不要包含Markdown代码块标记）：

{
  "voiceover_script": [
    { "time_range": "0s-3s", "text": "提取的口播文案..." }
  ],
  "scenes": [
    {
      "scene_id": 1,
      "time_range": "0s-2.5s",
      "visual_analysis": {
        "camera_movement": "详细描述运镜，例如：镜头瞬间快速拉远(Dolly Zoom Out)，或 环绕拍摄(Orbit)",
        "subject_dynamics": "描述主体动作，例如：角色从王座上猛然站起，披风飞扬",
        "atmosphere": "赛博朋克，冷峻，高科技感"
      },
      "prompts": {
        "jimeng_prompt": "即梦提示词：一定要包含运镜描述。格式：(运镜描述)+画面主体+环境+风格。例如：(镜头急速拉远)，一名黑发年轻男子坐在虚拟王座上，身穿黑色长风衣...",
        "mj_prompt": "Midjourney Prompt: English description, include camera directives like 'dynamic angle', 'fast zoom out', 'cinematic lighting'..."
      }
    }
  ]
}

**重要要求：**
- **运镜分析**要非常精准。
- **即梦提示词**必须将"运镜描述"放在最前面，用括号括起来。
- **口播提取**要依靠视频中的音频内容，如果视频没有声音则留空。`;

                    // 直接使用视频 URL（gemini-3-pro 支持视频输入）
                    const userContent = [
                        { type: "text", text: "请分析这段视频。请严格按JSON格式输出拆解报告。" },
                        { type: "image_url", image_url: { url: videoDataUrl } }
                    ];

                    const apiMessages = [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userContent }
                    ];

                    // 添加超时控制（120秒，因为视频分析需要更长时间）
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 120000);

                    let response;
                    try {
                        response = await fetch(`${baseUrl}/v1/chat/completions`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                model: config?.modelName || 'gemini-3-pro-preview',
                                messages: apiMessages,
                                stream: false
                            }),
                            signal: controller.signal
                        });
                    } catch (fetchError) {
                        clearTimeout(timeoutId);
                        // 处理网络错误
                        if (fetchError.name === 'AbortError') {
                            throw new Error('请求超时（120秒），视频分析可能需要更长时间，请稍后重试');
                        } else if (fetchError.message && fetchError.message.includes('Failed to fetch')) {
                            throw new Error(`无法连接到 API 服务器 (${baseUrl})。请检查：\n1. API 地址是否正确\n2. 网络连接是否正常\n3. API 服务是否可用\n4. 是否配置了正确的 API Key`);
                        } else {
                            throw new Error(`网络请求失败: ${fetchError.message}`);
                        }
                    } finally {
                        clearTimeout(timeoutId);
                    }

                    if (!response.ok) {
                        let errText = '';
                        try {
                            errText = await response.text();
                        } catch (e) {
                            errText = `HTTP ${response.status}: ${response.statusText}`;
                        }
                        throw new Error(errText || `API Error: ${response.status}`);
                    }

                    const data = await response.json();
                    console.log('[AI导演拆解] API 响应数据:', {
                        hasData: !!data,
                        hasChoices: !!data.choices,
                        choicesLength: data.choices?.length,
                        dataKeys: Object.keys(data || {}),
                        model: config?.modelName || config?.id
                    });

                    // 支持多种响应格式
                    let aiContent = null;
                    if (data.choices && data.choices.length > 0) {
                        // OpenAI 格式: data.choices[0].message.content
                        aiContent = data.choices[0]?.message?.content;
                    } else if (data.data?.choices && data.data.choices.length > 0) {
                        // 嵌套 data.choices 格式
                        aiContent = data.data.choices[0]?.message?.content;
                    } else if (data.content) {
                        // 直接 content 字段
                        aiContent = data.content;
                    } else if (data.data?.content) {
                        // 嵌套 data.content 格式
                        aiContent = data.data.content;
                    } else if (data.text) {
                        // text 字段
                        aiContent = data.text;
                    } else if (data.data?.text) {
                        // 嵌套 data.text 格式
                        aiContent = data.data.text;
                    } else if (data.message) {
                        // message 字段
                        aiContent = typeof data.message === 'string' ? data.message : data.message.content;
                    } else if (data.data?.message) {
                        // 嵌套 data.message 格式
                        aiContent = typeof data.data.message === 'string' ? data.data.message : data.data.message.content;
                    } else if (data.result) {
                        // result 字段
                        aiContent = typeof data.result === 'string' ? data.result : data.result.content;
                    } else if (data.data?.result) {
                        // 嵌套 data.result 格式
                        aiContent = typeof data.data.result === 'string' ? data.data.result : data.data.result.content;
                    }

                    if (!aiContent || aiContent.trim() === '' || aiContent === '{}') {
                        console.error('[AI导演拆解] API 响应内容为空:', data);
                        throw new Error(`API 返回内容为空。响应数据: ${JSON.stringify(data).substring(0, 200)}`);
                    }

                    console.log('[AI导演拆解] 提取的内容长度:', aiContent.length, '前100字符:', aiContent.substring(0, 100));

                    // 解析 JSON
                    let jsonStr = aiContent.trim();
                    if (jsonStr.startsWith('```')) {
                        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
                    }

                    let result;
                    try {
                        result = JSON.parse(jsonStr);
                        console.log('[AI导演拆解] JSON 解析成功，场景数:', result.scenes?.length || 0);
                    } catch (e) {
                        console.error('[AI导演拆解] 解析 JSON 失败:', e, '内容前500字符:', jsonStr.substring(0, 500));
                        // 尝试修复
                        try {
                            jsonStr = jsonStr.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
                            jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
                            result = JSON.parse(jsonStr);
                            console.log('[AI导演拆解] JSON 修复后解析成功');
                        } catch (e2) {
                            console.error('[AI导演拆解] JSON修复后仍解析失败:', e2, '原始内容:', jsonStr.substring(0, 500));
                            throw new Error(`模型返回的不是有效的 JSON 格式。原始内容: ${jsonStr.substring(0, 200)}`);
                        }
                    }

                    // 处理 voiceover_script，转换为 voiceoverResults 格式
                    const voiceoverResults = (result.voiceover_script || []).map((v, idx) => ({
                        time: idx,
                        text: v.text || ''
                    }));
                    console.log('[AI导演拆解] 口播文案数:', voiceoverResults.length);

                    // 处理 scenes，转换为 analysisResults 格式
                    const analysisResults = (result.scenes || []).map((scene, idx) => ({
                        scene_index: scene.scene_id || idx + 1,
                        time_range: scene.time_range || '',
                        keyframes: [{
                            type: 'current',
                            time: 0,
                            description: `${scene.visual_analysis?.camera_movement || ''} ${scene.visual_analysis?.subject_dynamics || ''}`.trim(),
                            mj_prompt: scene.prompts?.mj_prompt || '',
                            jimeng_prompt: scene.prompts?.jimeng_prompt || ''
                        }],
                        global_tags: {
                            style: scene.visual_analysis?.atmosphere ? [scene.visual_analysis.atmosphere] : [],
                            camera: scene.visual_analysis?.camera_movement ? [scene.visual_analysis.camera_movement] : [],
                            color: []
                        }
                    }));
                    console.log('[AI导演拆解] 场景数:', analysisResults.length);

                    // 更新节点状态
                    setNodes((prev) => prev.map((n) => {
                        if (n.id === nodeId) {
                            console.log('[AI导演拆解] 更新节点状态，场景数:', analysisResults.length, '口播数:', voiceoverResults.length);
                            return {
                                ...n,
                                isGenerating: false,
                                settings: {
                                    ...n.settings,
                                    voiceoverResults,
                                    analysisResults
                                }
                            };
                        }
                        return n;
                    }));

                    // 自动创建分镜表节点
                    if (analysisResults.length > 0) {
                        setTimeout(() => {
                            createStoryboardFromAnalysisResult(nodeId, analysisResults);
                        }, 100); // 延迟100ms确保节点状态已更新
                    }

                } catch (error) {
                    console.error('AI视频分析失败:', error);
                    const errorMsg = error.message || 'AI视频分析失败';
                    setNodes((prev) => prev.map((n) =>
                        n.id === nodeId
                            ? { ...n, isGenerating: false, errorMsg: errorMsg }
                            : n
                    ));
                    // 不显示 alert，错误信息已经在节点上显示
                    // alert(`AI视频分析失败: ${errorMsg}`);
                }
            };

            const addPromptLibraryItem = () => {
                const name = promptLibraryForm.name.trim();
                const prompt = promptLibraryForm.prompt.trim();
                if (!name || !prompt) {
                    alert('请输入名称和提示词内容');
                    return;
                }
                setPromptLibrary((prev) => [
                    { id: `custom-${Date.now()}`, name, prompt },
                    ...prev
                ]);
                setPromptLibraryForm({ name: '', prompt: '' });
            };
            const removePromptLibraryItem = (id) => {
                setPromptLibrary((prev) => prev.filter((p) => p.id !== id));
            };
            const applyLibraryPrompt = (nodeId, promptText) => {
                if (!nodeId || !promptText) return;
                updateNodeSettings(nodeId, { prompt: promptText });
            };

            const handleSplitGridFromUrl = async (imageUrl, options = {}) => {
                if (!imageUrl) return;
                const {
                    originX,
                    originY,
                    cols = 3,
                    spacing = 20,
                    nodeWidth = 260,
                    nodeHeight = 260,
                    replaceSelected = false, // 是否替换已选中的节点
                } = options;

                try {
                    const croppedImages = await splitGridImage(imageUrl);
                    if (croppedImages.length !== 9) {
                        alert('切割失败：未能生成9张图片');
                        return;
                    }

                    // 检查是否有框选的节点需要替换
                    const currentSelectedIds = selectedNodeIdsRef.current;
                    if (replaceSelected && currentSelectedIds && currentSelectedIds.size === 9) {
                        // 替换模式：更新已选中的9个节点
                        const selectedIdsArray = Array.from(currentSelectedIds);
                        setNodes(prev => prev.map(node => {
                            const index = selectedIdsArray.indexOf(node.id);
                            if (index !== -1 && index < croppedImages.length) {
                                // 替换节点内容，保持位置和大小
                                return {
                                    ...node,
                                    content: croppedImages[index].url,
                                    dimensions: {
                                        w: croppedImages[index].width,
                                        h: croppedImages[index].height
                                    }
                                };
                            }
                            return node;
                        }));
                        // 静默替换，不显示提示
                        return;
                    }

                    // 创建新节点模式（原有逻辑）
                    const world = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
                    const startX = originX !== undefined ? originX : world.x;
                    const startY = originY !== undefined ? originY : world.y;
                    const newNodes = createGridImageNodes(croppedImages, {
                        startX,
                        startY,
                        cols,
                        spacing,
                        nodeWidth,
                        nodeHeight,
                    });
                    setNodes(prev => [...prev, ...newNodes]);
                    // 静默创建，不显示成功提示
                } catch (e) {
                    alert('切割失败: ' + e.message);
                }
            };

            // 智能整理节点：DAG 层级布局 + 交叉最小化 (Barycenter Heuristic)
            const autoArrangeNodes = () => {
                // 1. 获取选中的节点
                const currentSelectedId = selectedNodeIdRef.current;
                const currentSelectedIds = selectedNodeIdsRef.current;

                let nodesToArrange = [];

                if (currentSelectedId) {
                    const node = nodesRef.current.find(n => n.id === currentSelectedId);
                    if (node) nodesToArrange = [node];
                } else if (currentSelectedIds && currentSelectedIds.size > 0) {
                    nodesToArrange = nodesRef.current.filter(n => currentSelectedIds.has(n.id));
                }

                if (nodesToArrange.length < 2) {
                     alert('请至少选中两个节点进行智能整理');
                     return;
                }

                const targetNodeIds = new Set(nodesToArrange.map(n => n.id));

                // 2. 构建图结构
                // map: id -> graphNode
                const graph = {};
                nodesToArrange.forEach(n => {
                    graph[n.id] = {
                        id: n.id,
                        node: n,
                        parents: [],
                        children: [],
                        level: 0,
                        rank: 0 // 用于层内排序
                    };
                });

                connectionsRef.current.forEach(conn => {
                    if (targetNodeIds.has(conn.from) && targetNodeIds.has(conn.to)) {
                        graph[conn.from].children.push(conn.to);
                        graph[conn.to].parents.push(conn.from);
                    }
                });

                // 3. 计算层级 (Assign Layers) - Longest Path Layering
                // 找出入度为0的节点
                let roots = Object.values(graph).filter(n => n.parents.length === 0);

                // 处理环路或纯独立节点：如果没有根，取第一个
                if (roots.length === 0 && nodesToArrange.length > 0) {
                    roots = [Object.values(graph)[0]];
                }

                // 计算每个节点的深度 level
                const calcLevels = () => {
                    const queue = roots.map(r => ({ node: r, lvl: 0 }));
                    const visited = new Set();

                    while(queue.length > 0) {
                        const { node, lvl } = queue.shift();
                        // 只有当该节点未访问，或者发现了更长的路径时更新
                        if (lvl >= node.level) {
                            node.level = lvl;
                            // 只有当该节点的所有父节点都处理过，或者它是根节点时，才继续往下（简化版拓扑排序）
                            // 这里为了简单，直接遍历子节点
                            node.children.forEach(childId => {
                                const childNode = graph[childId];
                                if (childNode) {
                                    // 避免环路无限循环：限制最大深度
                                    if (lvl < 20) {
                                        queue.push({ node: childNode, lvl: lvl + 1 });
                                    }
                                }
                            });
                        }
                    }
                };
                calcLevels();

                // 4. 构建层级数组
                // layers: [ [node, node], [node], ... ]
                const maxLevel = Math.max(...Object.values(graph).map(n => n.level));
                const layers = Array.from({ length: maxLevel + 1 }, () => []);

                Object.values(graph).forEach(n => {
                    layers[n.level].push(n);
                });

                // 5. 交叉最小化 (Crossing Minimization) - Iterative Barycenter Method
                // 初始排序：保持目前的相对顺序或ID顺序
                layers.forEach(layer => {
                    layer.sort((a, b) => a.node.y - b.node.y);
                });

                // 迭代次数，比如做 3 次往返扫描
                const iterations = 3;

                for (let i = 0; i < iterations; i++) {
                    // Forward Sweep (从左往右): 子节点跟随父节点的重心
                    for (let l = 1; l < layers.length; l++) {
                        const layer = layers[l];
                        layer.forEach(n => {
                            if (n.parents.length > 0) {
                                let sumRank = 0;
                                n.parents.forEach(pid => {
                                    // 找到父节点在上一层中的索引位置(rank)
                                    const parentNode = graph[pid];
                                    const parentLayerIndex = layers[l-1].indexOf(parentNode);
                                    if (parentLayerIndex !== -1) sumRank += parentLayerIndex;
                                });
                                n.barycenter = sumRank / n.parents.length;
                            } else {
                                n.barycenter = layers[l].indexOf(n); // 保持原位
                            }
                        });
                        // 根据重心排序
                        layer.sort((a, b) => (a.barycenter || 0) - (b.barycenter || 0));
                    }

                    // Backward Sweep (从右往左): 父节点跟随子节点的重心
                    // 这一步对于解决图中的那种"输入节点乱序导致连线交叉"非常关键
                    for (let l = layers.length - 2; l >= 0; l--) {
                        const layer = layers[l];
                        layer.forEach(n => {
                            if (n.children.length > 0) {
                                let sumRank = 0;
                                n.children.forEach(cid => {
                                    const childNode = graph[cid];
                                    const childLayerIndex = layers[l+1].indexOf(childNode);
                                    if (childLayerIndex !== -1) sumRank += childLayerIndex;
                                });
                                n.barycenter = sumRank / n.children.length;
                            } else {
                                n.barycenter = layers[l].indexOf(n);
                            }
                        });
                        layer.sort((a, b) => (a.barycenter || 0) - (b.barycenter || 0));
                    }
                }

                // 6. 计算最终坐标 (Coordinate Assignment)
                const startX = Math.min(...nodesToArrange.map(n => n.x));
                const startY = Math.min(...nodesToArrange.map(n => n.y));
                const H_SPACING = 150; // 加宽一点水平间距，给连线留空间
                const V_SPACING = 40;  // 垂直间距

                let currentX = startX;
                const updatedNodesMap = new Map();

                layers.forEach((layer, lIndex) => {
                    if (layer.length === 0) return;

                    // 计算该层最宽的节点，用于推算下一层的X
                    const maxW = Math.max(...layer.map(n => n.node.width || 260));

                    // 计算该层总高度，用于垂直居中对齐整个层
                    const totalH = layer.reduce((sum, n) => sum + (n.node.height || 200), 0) + (layer.length - 1) * V_SPACING;

                    // 简单的垂直排列，从 startY 开始
                    // 进阶优化：可以让层与层之间垂直中心对齐，但这里简单排列通常就够了
                    let currentY = startY;

                    layer.forEach(graphNode => {
                        updatedNodesMap.set(graphNode.id, {
                            ...graphNode.node,
                            x: currentX,
                            y: currentY
                        });
                        currentY += (graphNode.node.height || 200) + V_SPACING;
                    });

                    currentX += maxW + H_SPACING;
                });

                // 7. 应用更新
                setNodes(prev => prev.map(node => {
                    if (updatedNodesMap.has(node.id)) {
                        return updatedNodesMap.get(node.id);
                    }
                    return node;
                }));
            };

            const handleVideoFileUpload = (nodeId, file) => {
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async (ev) => {
                    const content = ev.target.result;
                    let videoMeta = { duration: 0, w: 0, h: 0 };
                    try { videoMeta = await getVideoMetadata(content); } catch (e) { console.warn('读取视频元信息失败', e); }
                    setNodes((prev) => prev.map((n) =>
                        n.id === nodeId
                            ? { ...n, content, videoMeta, frames: [], selectedKeyframes: [], extractingFrames: false, videoFileName: file.name }
                            : n
                    ));
                };
                reader.readAsDataURL(file);
            };

            const handleVideoDrop = (nodeId, e) => {
                e.preventDefault(); e.stopPropagation();
                e.currentTarget.classList.remove('drag-over');
                const files = Array.from(e.dataTransfer.files);
                const videoFile = files.find(file => file.type.startsWith('video/'));
                if (videoFile) {
                    handleVideoFileUpload(nodeId, videoFile);
                }
            };

            // 智能抽帧：场景检测算法
            const detectScenesAndCapture = async (videoUrl, threshold = 30) => {
                return new Promise((resolve, reject) => {
                    const video = document.createElement('video');
                    video.crossOrigin = "anonymous";
                    video.src = videoUrl;
                    video.muted = true;

                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });

                    const keyframes = [];
                    let prevData = null;

                    video.onloadeddata = async () => {
                        canvas.width = 320;
                        canvas.height = Math.floor(320 * (video.videoHeight / video.videoWidth));

                        const duration = video.duration;
                        const sampleRate = 2;

                        video.currentTime = 0;

                        const scan = async () => {
                            // 检查是否已经扫描完成
                            const currentTime = video.currentTime;
                            if (currentTime >= duration || Math.abs(currentTime - duration) < 0.01) {
                                // 确保最后一帧也被包含
                                if (keyframes.length === 0 || parseFloat(keyframes[keyframes.length - 1].time) < duration - 0.5) {
                                    const hdCanvas = document.createElement('canvas');
                                    hdCanvas.width = video.videoWidth;
                                    hdCanvas.height = video.videoHeight;
                                    const hdCtx = hdCanvas.getContext('2d');
                                    video.currentTime = Math.max(0, duration - 0.1);
                                    await new Promise(r => {
                                        const timeout = setTimeout(() => r(), 200);
                                        video.onseeked = () => {
                                            clearTimeout(timeout);
                                            hdCtx.drawImage(video, 0, 0);
                                            const lastTime = Math.max(0, duration - 0.1);
                                            keyframes.push({
                                                time: lastTime.toFixed(2),
                                                image: hdCanvas.toDataURL('image/jpeg', 0.8)
                                            });
                                            r();
                                        };
                                    });
                                }
                                resolve(keyframes.map(kf => ({ time: parseFloat(kf.time), url: kf.image })));
                                return;
                            }

                            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                            const frameData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

                            if (prevData) {
                                let diff = 0;
                                for (let i = 0; i < frameData.length; i += 4) {
                                    diff += Math.abs(frameData[i] - prevData[i]) +
                                            Math.abs(frameData[i+1] - prevData[i+1]) +
                                            Math.abs(frameData[i+2] - prevData[i+2]);
                                }
                                const avgDiff = diff / (frameData.length / 4 * 3);

                                if (avgDiff > threshold) {
                                    const hdCanvas = document.createElement('canvas');
                                    hdCanvas.width = video.videoWidth;
                                    hdCanvas.height = video.videoHeight;
                                    hdCanvas.getContext('2d').drawImage(video, 0, 0);
                                    const dataUrl = hdCanvas.toDataURL('image/jpeg', 0.8);

                                    // 确保使用实际的currentTime，而不是字符串
                                    const captureTime = video.currentTime;
                                    keyframes.push({
                                        time: captureTime.toFixed(2),
                                        image: dataUrl
                                    });
                                    prevData = null;
                                } else {
                                    prevData = frameData;
                                }
                            } else {
                                // 第一帧，记录当前时间（确保使用实际的currentTime）
                                prevData = frameData;
                                const currentTime = video.currentTime;
                                const hdCanvas = document.createElement('canvas');
                                hdCanvas.width = video.videoWidth;
                                hdCanvas.height = video.videoHeight;
                                hdCanvas.getContext('2d').drawImage(video, 0, 0);
                                keyframes.push({
                                    time: currentTime.toFixed(2),
                                    image: hdCanvas.toDataURL('image/jpeg', 0.8)
                                });
                            }

                            // 更新到下一个采样点
                            const nextTime = video.currentTime + (1 / sampleRate);
                            if (nextTime >= duration) {
                                // 确保最后一帧也被包含
                                if (keyframes.length === 0 || parseFloat(keyframes[keyframes.length - 1].time) < duration - 0.5) {
                                    const hdCanvas = document.createElement('canvas');
                                    hdCanvas.width = video.videoWidth;
                                    hdCanvas.height = video.videoHeight;
                                    const hdCtx = hdCanvas.getContext('2d');
                                    video.currentTime = Math.max(0, duration - 0.1);
                                    await new Promise(r => {
                                        const timeout = setTimeout(() => r(), 200);
                                        video.onseeked = () => {
                                            clearTimeout(timeout);
                                            hdCtx.drawImage(video, 0, 0);
                                            const lastTime = Math.max(0, duration - 0.1);
                                            keyframes.push({
                                                time: lastTime.toFixed(2),
                                                image: hdCanvas.toDataURL('image/jpeg', 0.8)
                                            });
                                            r();
                                        };
                                    });
                                }
                                resolve(keyframes.map(kf => ({ time: parseFloat(kf.time), url: kf.image })));
                                return;
                            }
                            video.currentTime = nextTime;
                            await new Promise(r => {
                                const timeout = setTimeout(() => r(), 200); // 超时保护
                                video.onseeked = () => {
                                    clearTimeout(timeout);
                                    r();
                                };
                            });
                            scan();
                        };

                        scan();
                    };

                    video.onerror = (e) => reject(new Error("视频加载失败，请检查格式或跨域设置"));
                });
            };

            const handleAutoExtractKeyframes = async (nodeId, fps = 2) => {
                const node = nodesMap.get(nodeId);
                if (!node?.content) return;
                setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, extractingFrames: true } : n));
                try {
                    const frames = await extractKeyFrames(node.content, { fps });
                    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, frames, selectedKeyframes: [], extractingFrames: false } : n));
                } catch (error) {
                    console.error('视频抽帧失败', error);
                    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, extractingFrames: false } : n));
                }
            };

            const handleSmartExtractKeyframes = async (nodeId, threshold = 30) => {
                const node = nodesMap.get(nodeId);
                if (!node?.content) return;
                setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, extractingFrames: true } : n));
                try {
                    const frames = await detectScenesAndCapture(node.content, threshold);
                    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, frames, selectedKeyframes: [], extractingFrames: false } : n));
                } catch (error) {
                    console.error('智能抽帧失败', error);
                    alert(`智能抽帧失败: ${error.message}`);
                    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, extractingFrames: false } : n));
                }
            };

            // 提取口播文案
            const handleExtractVoiceover = async (nodeId) => {
                const node = nodesMap.get(nodeId);
                if (!node || node.type !== 'video-analyze') return;

                const videoInputNode = getConnectedVideoInputNode(nodeId);
                if (!videoInputNode || !videoInputNode.content) {
                    alert('请先连接一个包含视频的视频输入节点');
                    return;
                }

                const config = apiConfigs.find((c) => c.id === node.settings?.model || 'gemini-3-pro');
                const apiKey = config?.key || globalApiKey;
                const baseUrl = (config?.url || DEFAULT_BASE_URL).replace(/\/+$/, '');

                if (!apiKey) {
                    alert('请先在 API 设置中配置 Key');
                    setSettingsOpen(true);
                    return;
                }

                setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, isExtractingVoiceover: true, voiceoverResults: [] } : n));

                const videoFileName = videoInputNode.videoFileName || 'video.mp4';
                const videoDuration = videoInputNode.videoMeta?.duration || 0;

                try {
                    // 构建多模态消息，请求提取口播文案
                    const systemPrompt = `你是一个专业的视频口播文案提取助手。请分析提供的视频，提取每一秒的口播内容。

请返回严格的 JSON 格式，结构如下：
{
  "video_id": "${videoFileName}",
  "duration": ${videoDuration},
  "voiceover": [
    {
      "time": 0,
      "text": "第一秒的口播内容"
    },
    {
      "time": 1,
      "text": "第二秒的口播内容"
    },
    {
      "time": 2,
      "text": "第三秒的口播内容"
    }
  ]
}

要求：
1. 按秒为单位提取口播内容
2. 如果某一秒没有口播，text 字段为空字符串
3. 准确记录每一秒的说话内容
4. 只提取口播文案，不要添加其他描述`;

                    // 从视频中提取关键帧用于分析（每5秒一帧，避免太多）
                    const sampleFrames = [];
                    const video = document.createElement('video');
                    video.crossOrigin = 'anonymous';
                    video.src = videoInputNode.content;
                    video.muted = true;

                    await new Promise((resolve) => {
                        video.onloadedmetadata = () => {
                            const canvas = document.createElement('canvas');
                            canvas.width = video.videoWidth;
                            canvas.height = video.videoHeight;
                            const ctx = canvas.getContext('2d');

                            let currentTime = 0;
                            const extractFrame = async () => {
                                if (currentTime >= videoDuration) {
                                    resolve();
                                    return;
                                }

                                video.currentTime = currentTime;
                                await new Promise((r) => {
                                    video.onseeked = () => {
                                        ctx.drawImage(video, 0, 0);
                                        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                                        sampleFrames.push({
                                            time: currentTime,
                                            url: dataUrl
                                        });
                                        currentTime += 5; // 每5秒一帧
                                        setTimeout(r, 50);
                                    };
                                });
                                extractFrame();
                            };
                            extractFrame();
                        };
                    });

                    // 构建用户消息，包含视频帧
                    const userContent = [
                        { type: "text", text: `请分析以下视频，提取每一秒的口播文案。视频总时长：${videoDuration.toFixed(1)}秒。` }
                    ];

                    // 添加关键帧（每5秒一帧，避免太多）
                    sampleFrames.forEach((frame) => {
                        userContent.push({
                            type: "image_url",
                            image_url: { url: frame.url }
                        });
                        userContent.push({
                            type: "text",
                            text: `时间点：${frame.time.toFixed(1)}秒`
                        });
                    });

                    const apiMessages = [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userContent }
                    ];

                    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: config?.modelName || 'gemini-3-pro-preview',
                            messages: apiMessages,
                            stream: false
                        })
                    });

                    if (!response.ok) {
                        const errText = await response.text();
                        throw new Error(errText || `API Error: ${response.status}`);
                    }

                    const data = await response.json();
                    const aiContent = data.choices?.[0]?.message?.content || "{}";

                    // 解析 JSON
                    let jsonStr = aiContent.trim();
                    if (jsonStr.startsWith('```')) {
                        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
                    }

                    let result;
                    try {
                        result = JSON.parse(jsonStr);
                    } catch (e) {
                        console.error('解析 JSON 失败:', e, jsonStr);
                        // 尝试修复
                        try {
                            jsonStr = jsonStr.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
                            jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
                            result = JSON.parse(jsonStr);
                        } catch (e2) {
                            throw new Error('模型返回的不是有效的 JSON 格式');
                        }
                    }

                    // 更新节点状态
                    setNodes((prev) => prev.map((n) =>
                        n.id === nodeId
                            ? { ...n, isExtractingVoiceover: false, voiceoverResults: result.voiceover || [] }
                            : n
                    ));

                } catch (error) {
                    console.error('提取口播文案失败', error);
                    setNodes((prev) => prev.map((n) =>
                        n.id === nodeId
                            ? { ...n, isExtractingVoiceover: false, errorMsg: error.message || '提取口播文案失败' }
                            : n
                    ));
                }
            };

            const handleToggleKeyframe = (nodeId, frame, index = 0, event = null) => {
                const shiftKey = !!event?.shiftKey;
                setNodes(prev => prev.map(n => {
                    if (n.id !== nodeId) return n;
                    const frames = n.frames || [];
                    const keyOf = (f) => `${f.time}-${f.url}`;
                    const frameMap = new Map(frames.map(f => [keyOf(f), f]));
                    const currentSelected = n.selectedKeyframes || [];
                    let nextSelected = [...currentSelected];

                    if (shiftKey && frameSelectionRef.current[nodeId] !== undefined && frameSelectionRef.current[nodeId] !== null && frames.length > 0) {
                        const lastIndex = frameSelectionRef.current[nodeId];
                        const start = Math.min(lastIndex, index);
                        const end = Math.max(lastIndex, index);
                        const rangeFrames = frames.slice(start, end + 1);
                        const selectedKeys = new Set(nextSelected.map(keyOf));
                        rangeFrames.forEach(f => selectedKeys.add(keyOf(f)));
                        nextSelected = Array.from(selectedKeys).map(k => frameMap.get(k)).filter(Boolean);
                    } else {
                        const exists = nextSelected.some(f => keyOf(f) === keyOf(frame));
                        nextSelected = exists
                            ? nextSelected.filter(f => keyOf(f) !== keyOf(frame))
                            : [...nextSelected, frame];
                    }

                    frameSelectionRef.current[nodeId] = index;
                    return { ...n, selectedKeyframes: nextSelected };
                }));
            };

            const openFrameContextMenu = (e, nodeId, frame) => {
                e.preventDefault();
                e.stopPropagation();
                setFrameContextMenu({ visible: true, x: e.clientX, y: e.clientY, nodeId, frame });
            };

            const closeFrameContextMenu = () => {
                setFrameContextMenu({ visible: false, x: 0, y: 0, nodeId: null, frame: null });
            };

            const sendFrameToChat = () => {
                const { frame } = frameContextMenu;
                if (!frame?.url) return;
                const newFile = createChatMediaFile({
                    name: `Frame-${(frame.time ?? 0).toFixed(2)}s.png`,
                    content: frame.url,
                    mediaType: 'image',
                    fromHistory: true,
                });
                setChatFiles(prev => [...prev, newFile]);
                setIsChatOpen(true);
                closeFrameContextMenu();
            };

            const sendFrameToCanvas = async () => {
                const { frame } = frameContextMenu;
                if (!frame?.url) return;
                const world = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
                let dims;
                try {
                    const real = await getImageDimensions(frame.url);
                    if (real?.w && real?.h) dims = { w: real.w, h: real.h };
                } catch (e) {}
                addNode('input-image', world.x + 50, world.y + 50, null, frame.url, dims);
                closeFrameContextMenu();
            };

            const sendFrameToPreview = () => {
                const { frame } = frameContextMenu;
                if (!frame?.url) return;
                setNodes(prev => {
                    // 优先使用当前选中的预览节点
                    const selectedId = selectedNodeIdRef.current;
                    const selectedIds = selectedNodeIdsRef.current;
                    const previews = prev.filter(n => n.type === 'preview');
                    if (!previews.length) return prev;

                    // 先查找选中的预览节点
                    let targetId = null;
                    if (selectedId) {
                        const selectedPreview = previews.find(p => p.id === selectedId);
                        if (selectedPreview) targetId = selectedPreview.id;
                    }
                    if (!targetId && selectedIds && selectedIds.size > 0) {
                        const selectedPreview = previews.find(p => selectedIds.has(p.id));
                        if (selectedPreview) targetId = selectedPreview.id;
                    }
                    // 如果没有选中预览节点，则默认使用最后一个预览窗口
                    if (!targetId) {
                        targetId = previews[previews.length - 1].id;
                    }

                    return prev.map(n =>
                        n.id === targetId
                            ? { ...n, content: frame.url, previewType: 'image' }
                            : n
                    );
                });
                closeFrameContextMenu();
            };

            const applyFrameToSelectedNode = () => {
                const { frame } = frameContextMenu;
                if (!frame?.url) return;
                const targetId = selectedNodeId;
                const targetNode = nodesMap.get(targetId);
                if (targetNode && targetNode.type === 'input-image') {
                    setNodes(prev => prev.map(n => n.id === targetId ? { ...n, content: frame.url } : n));
                } else {
                    alert('请先选择一个"图片输入"节点');
                }
                closeFrameContextMenu();
            };

            const handleHistoryRightClick = (e, item, imageUrl = null, imageIndex = null) => {
                e.preventDefault();
                e.stopPropagation();
                // 如果提供了 imageUrl 和 imageIndex，说明是点击了多图中的某一张
                // 否则使用 item.url 或 item.originalUrl（单图情况）
                const selectedUrl = imageUrl || item.url || item.originalUrl;
                const selectedIndex = imageIndex !== null ? imageIndex : (item.selectedMjImageIndex !== undefined ? item.selectedMjImageIndex : null);

                // 创建一个修改后的item，使用选中的图片URL
                const menuItem = {
                    ...item,
                    url: selectedUrl,
                    selectedMjImageIndex: selectedIndex
                };

                const world = screenToWorld(e.clientX, e.clientY);
                setHistoryContextMenu({ visible: true, x: e.clientX, y: e.clientY, worldX: world.x, worldY: world.y, item: menuItem });
            };

            const applyHistoryToSelectedNode = () => {
                const item = historyContextMenu.item;
                const targetId = selectedNodeId;
                const targetNode = nodesMap.get(targetId);

                if (targetNode && targetNode.type === 'input-image' && (item.url || item.originalUrl)) {
                    setNodes(prev => prev.map(n => n.id === targetId ? { ...n, content: item.url || item.originalUrl } : n));
                } else {
                    alert('请先选择一个"图片输入"节点');
                }
                setHistoryContextMenu({ visible: false, x: 0, y: 0, item: null });
            };

            const sendHistoryToCanvas = async () => {
                const item = historyContextMenu.item;
                if (!item?.url && !item?.originalUrl) return;
                const world = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);

                // Fix: Mark video content so input-image node knows to display it properly
                let content = item.url || item.originalUrl;
                if (item.type === 'video' && !isVideoUrl(content)) {
                     // Append helper param so isVideoUrl returns true
                     content += (content.includes('?') ? '&' : '?') + 'force_video_display=true';
                }

                let dims;
                if (item.type === 'image') {
                    try {
                        const real = await getImageDimensions(content);
                        if (real?.w && real?.h) {
                            dims = { w: real.w, h: real.h };
                        }
                    } catch (e) {
                        console.error('SendHistoryToCanvas getImageDimensions error', e);
                    }
                }

                addNode('input-image', world.x + 50, world.y + 50, null, content, dims);
                setHistoryContextMenu({ visible: false, x: 0, y: 0, item: null });
            };

            const sendHistoryToChat = () => {
                const item = historyContextMenu.item;
                if (!item || !item.url) return;

                const mediaType = item.type === 'video'
                    ? 'video'
                    : item.type === 'image'
                        ? 'image'
                        : 'file';
                const newFile = createChatMediaFile({
                    name: `Generated-${item.id}.${mediaType === 'video' ? 'mp4' : mediaType === 'image' ? 'png' : 'file'}`,
                    content: item.url,
                    mediaType,
                    fromHistory: true,
                });

                setChatFiles(prev => [...prev, newFile]);
                setIsChatOpen(true);
                setHistoryContextMenu({ visible: false, x: 0, y: 0, item: null });
            };

            const handlePreviewRightClick = (e, item) => {
                if (!item?.url) return;
                e.preventDefault();
                e.stopPropagation();
                setPreviewContextMenu({ visible: true, x: e.clientX, y: e.clientY, item });
            };
            const closePreviewContextMenu = () => setPreviewContextMenu({ visible: false, x: 0, y: 0, item: null });

            const sendPreviewToChat = () => {
                const item = previewContextMenu.item;
                if (!item?.url) return;
                const mediaType = item.type === 'video' ? 'video' : 'image';
                const newFile = createChatMediaFile({
                    name: `Preview-${Date.now()}.${mediaType === 'video' ? 'mp4' : 'png'}`,
                    content: item.url,
                    mediaType,
                });
                setChatFiles(prev => [...prev, newFile]);
                setIsChatOpen(true);
                closePreviewContextMenu();
            };

            const sendPreviewToCanvas = async () => {
                const item = previewContextMenu.item;
                if (!item?.url) return;
                const world = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
                let dims = { w: 512, h: 512 };
                try { dims = await getImageDimensions(item.url); } catch (e) { console.warn('Preview dims fail', e); }
                addNode('input-image', world.x + 50, world.y + 50, null, item.url, dims);
                closePreviewContextMenu();
            };

            // 图片输入节点右键菜单处理
            const handleInputImageRightClick = (e, nodeId) => {
                e.preventDefault();
                e.stopPropagation();
                const node = nodesMap.get(nodeId);
                if (!node || !node.content) return;
                setInputImageContextMenu({ visible: true, x: e.clientX, y: e.clientY, nodeId });
            };

            const closeInputImageContextMenu = () => {
                setInputImageContextMenu({ visible: false, x: 0, y: 0, nodeId: null });
            };

            const sendInputImageToChat = () => {
                const nodeId = inputImageContextMenu.nodeId;
                const node = nodesMap.get(nodeId);
                if (!node || !node.content) return;

                const mediaType = isVideoUrl(node.content) ? 'video' : 'image';
                const newFile = createChatMediaFile({
                    name: `InputImage-${Date.now()}.${mediaType === 'video' ? 'mp4' : 'png'}`,
                    content: node.content,
                    mediaType,
                });
                setChatFiles(prev => [...prev, newFile]);
                setIsChatOpen(true);
                closeInputImageContextMenu();
            };

            // ... (rest of render logic unchanged) ...
            // ConnectionLayer 组件：提取连接线渲染逻辑，使用 React.memo 优化
            const ConnectionLayer = memo(({
                connections,
                nodesMap,
                connectionsByNode,
                connectingSource,
                connectingTarget,
                connectingInputType,
                mousePos,
                apiConfigsMap,
                selectedNodeId,
                onDisconnectConnection,
                visibleNodes
            }) => {
                // 连接线虚拟化：只渲染可见节点的连接线
                const visibleNodeIds = useMemo(() => {
                    return new Set(visibleNodes.map(n => n.id));
                }, [visibleNodes]);

                const visibleConnections = useMemo(() => {
                    return connections.filter(conn =>
                        visibleNodeIds.has(conn.from) || visibleNodeIds.has(conn.to)
                    );
                }, [connections, visibleNodeIds]);

                return (
                    <div className="absolute inset-0 pointer-events-none overflow-visible w-full h-full">
                        <svg className="absolute inset-0 overflow-visible w-full h-full">
                            {visibleConnections.map((conn) => {
                                // 使用 nodesMap 快速查找，O(1) 复杂度
                                const fromNode = nodesMap.get(conn.from);
                                const toNode = nodesMap.get(conn.to);
                                if (!fromNode || !toNode) return null;

                                // 检查连接线是否与选中节点相关
                                const isRelatedToSelected = selectedNodeId && (
                                    fromNode.id === selectedNodeId ||
                                    toNode.id === selectedNodeId
                                );
                                // 设置透明度：选中节点相关为100%，其他为35%
                                const opacity = isRelatedToSelected ? 1 : 0.35;

                                const startX = fromNode.x + fromNode.width - 4;
                                const startY = fromNode.y + fromNode.height / 2;
                                const endX = toNode.x + 4;
                                let endY = toNode.y + toNode.height / 2;

                                // 处理image-compare节点的多个输入点
                                if (toNode.type === 'image-compare') {
                                    // 使用缓存的 connectionsByNode，避免重复 filter
                                    const relevantConns = connectionsByNode.to.get(toNode.id) || [];
                                    const idx = relevantConns.findIndex(c => c.id === conn.id);
                                    if (idx === 0) endY = toNode.y + toNode.height * 0.33;
                                    else if (idx >= 1) endY = toNode.y + toNode.height * 0.66;
                                }

                                // 处理Midjourney节点的oref和sref输入点
                                // 检查inputType是否为oref或sref（注意：default连接时inputType可能是undefined）
                                if (toNode.type === 'gen-image' && (conn.inputType === 'oref' || conn.inputType === 'sref')) {
                                    const currentModel = apiConfigsMap.get(toNode.settings?.model);
                                    const isMidjourney = currentModel && (currentModel.id.includes('mj') || currentModel.provider.toLowerCase().includes('midjourney'));

                                    if (isMidjourney) {
                                        // 使用基于节点世界坐标的计算，考虑实际DOM结构
                                        // 节点结构：p-3(12px) + 计时器(如果有，约28px + mb-2=8px) + 标题(约16px + mb-2=8px) + 引用状态区域(如果有，约60px + mb-2=8px) + 提示词区域(约100px + mb-2=8px) + 指令区域
                                        // 指令区域：gap-1.5(6px) + oref项(约16px) + gap-1.5(6px) + ow项(约16px + input高度) + gap-1.5(6px) + sref项(约16px)
                                        const paddingTop = 12; // 节点顶部padding (p-3 = 12px)
                                        const timerHeight = 28; // 计时器区域高度（px-2 py-1 + text-[10px] ≈ 28px）
                                        const timerMarginBottom = 8; // 计时器下方margin (mb-2 = 8px)
                                        const titleHeight = 16; // 标题高度 (text-xs ≈ 12px + line-height ≈ 16px，flex items-center)
                                        const titleMarginBottom = 8; // 标题下方margin (mb-2 = 8px)
                                        const refAreaHeight = 60; // 引用状态区域高度（p-2 + 内容，约60px）
                                        const refAreaMarginBottom = 8; // 引用区域下方margin (mb-2 = 8px)
                                        const promptAreaHeight = 100; // 提示词区域高度（p-3 + textarea，约100px）
                                        const promptAreaMarginBottom = 8; // 提示词区域下方margin (mb-2 = 8px)
                                        const instructionGap = 6; // 指令项之间的gap (gap-1.5 = 6px)
                                        const instructionItemHeight = 16; // 每个指令项的实际高度（text-[10px] + flex items-center ≈ 16px）
                                        const owInputHeight = 28; // ow输入框高度（px-2 py-1 + text-[10px] ≈ 28px）

                                        // 检查是否有计时器（正在生成或已完成）
                                        const hasTimer = false; // 计时器是动态的，这里简化处理，实际应该从节点状态判断

                                        // 使用缓存的 connectionsByNode，避免重复 some 计算
                                        const toNodeConns = connectionsByNode.to.get(toNode.id) || [];
                                        const hasRefArea = toNodeConns.some(c => !c.inputType || c.inputType === 'default');

                                        // 计算基础偏移（到指令区域开始的位置）
                                        let baseOffset = paddingTop;
                                        if (hasTimer) {
                                            baseOffset += timerHeight + timerMarginBottom;
                                        }
                                        baseOffset += titleHeight + titleMarginBottom;
                                        if (hasRefArea) {
                                            baseOffset += refAreaHeight + refAreaMarginBottom;
                                        }
                                        baseOffset += promptAreaHeight + promptAreaMarginBottom;

                                        if (conn.inputType === 'oref') {
                                            // oref在第一个指令位置（第一个指令项的中心）
                                            // 指令区域开始 + 第一个指令项的中心
                                            endY = toNode.y + baseOffset + instructionItemHeight * 0.5;
                                        } else if (conn.inputType === 'sref') {
                                            // sref在第三个指令位置
                                            // 指令区域开始 + oref项(16px) + gap(6px) + ow项(owInputHeight ≈ 28px) + gap(6px) + sref项的中心(8px)
                                            endY = toNode.y + baseOffset + instructionItemHeight + instructionGap + owInputHeight + instructionGap + instructionItemHeight * 0.5;
                                        }
                                    }
                                }

                                const dist = Math.abs(endX - startX);
                                const cp1X = startX + dist * 0.5;
                                const cp2X = endX - dist * 0.5;
                                const midX = (startX + endX) / 2;
                                const midY = (startY + endY) / 2;

                                return (
                                    <g key={conn.id} className="connection-group" style={{ opacity }}>
                                        {/* 透明路径用于点击检测连接线 */}
                                        <path
                                            d={`M ${startX} ${startY} C ${cp1X} ${startY}, ${cp2X} ${endY}, ${endX} ${endY}`}
                                            stroke="transparent"
                                            strokeWidth="20"
                                            fill="none"
                                            style={{pointerEvents: 'stroke'}}
                                        />
                                        {/* 优化后的连接线：单层、1px宽度、蚂蚁线效果 */}
                                        <path
                                            d={`M ${startX} ${startY} C ${cp1X} ${startY}, ${cp2X} ${endY}, ${endX} ${endY}`}
                                            stroke={isRelatedToSelected ? "#71717a" : "#a1a1aa"}
                                            strokeWidth="1"
                                            fill="none"
                                            strokeDasharray="4,4"
                                        />
                                        {/* 删除按钮：使用更大的透明热区确保可点击，必须在最后渲染以覆盖透明 path */}
                                        <g
                                            className="connection-delete cursor-pointer"
                                            style={{
                                                opacity: isRelatedToSelected ? 1 : 0.35,
                                                pointerEvents: 'auto',
                                                cursor: 'pointer'
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                onDisconnectConnection(conn.id);
                                            }}
                                            onMouseDown={(e) => {
                                                // 阻止事件冒泡，防止触发画布拖动
                                                e.stopPropagation();
                                                e.preventDefault();
                                                // 立即执行断开连接，不等待 onClick（修复点击无法断开的问题）
                                                onDisconnectConnection(conn.id);
                                            }}
                                        >
                                            {/* 大的透明点击热区（半径25），确保完全覆盖透明 path 的 stroke（宽度20） */}
                                            <circle
                                                cx={midX}
                                                cy={midY}
                                                r="25"
                                                fill="transparent"
                                                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    onDisconnectConnection(conn.id);
                                                }}
                                                onMouseDown={(e) => {
                                                    // 阻止事件冒泡，防止触发画布拖动
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    // 立即执行断开连接，不等待 onClick（修复点击无法断开的问题）
                                                    onDisconnectConnection(conn.id);
                                                }}
                                            />
                                            {/* 视觉元素 */}
                                            <circle cx={midX} cy={midY} r="12" fill="#ef4444" opacity="0.8" style={{ pointerEvents: 'none' }} />
                                            <circle cx={midX} cy={midY} r="8" fill="#ef4444" style={{ pointerEvents: 'none' }} />
                                            <Unlink size={10} className="text-white" x={midX - 5} y={midY - 5} style={{ pointerEvents: 'none' }} />
                                        </g>
                                    </g>
                                );
                            })}
                            {connectingSource && (() => {
                                // 使用 nodesMap 快速查找
                                const node = nodesMap.get(connectingSource);
                                if (!node) return null;
                                return <path d={`M ${node.x + node.width - 4} ${node.y + node.height / 2} C ${node.x + node.width + 100} ${node.y + node.height / 2}, ${mousePos.x - 100} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`} stroke="#60a5fa" strokeWidth="2" fill="none" strokeDasharray="4,4" />;
                            })()}
                            {connectingTarget && (() => {
                                // 使用 nodesMap 快速查找
                                const node = nodesMap.get(connectingTarget);
                                if (!node) return null;
                            // 从输入端口向左拖拽，连接线从左侧开始
                            const startX = node.x + 4;
                            let startY = node.y + node.height / 2;

                            // 处理Midjourney节点的oref和sref输入点
                            if (node.type === 'gen-image' && connectingInputType) {
                                const currentModel = apiConfigsMap.get(node.settings?.model);
                                const isMidjourney = currentModel && (currentModel.id.includes('mj') || currentModel.provider.toLowerCase().includes('midjourney'));

                                if (isMidjourney) {
                                    // 使用与连接线渲染相同的计算逻辑
                                    const paddingTop = 12;
                                    const timerHeight = 28;
                                    const timerMarginBottom = 8;
                                    const titleHeight = 16; // 标题高度 (text-xs ≈ 12px + line-height ≈ 16px)
                                    const titleMarginBottom = 8;
                                    const refAreaHeight = 60;
                                    const refAreaMarginBottom = 8;
                                    const promptAreaHeight = 100;
                                    const promptAreaMarginBottom = 8;
                                    const instructionGap = 6;
                                    const instructionItemHeight = 16; // 每个指令项的实际高度（text-[10px] + flex items-center ≈ 16px）
                                    const owInputHeight = 28; // ow输入框高度（px-2 py-1 + text-[10px] ≈ 28px）

                                    const hasTimer = false; // 计时器是动态的，这里简化处理
                                    // 使用缓存的 connectionsByNode，避免重复 some 计算
                                    const toNodeConns = connectionsByNode.to.get(node.id) || [];
                                    const hasRefArea = toNodeConns.some(c => !c.inputType || c.inputType === 'default');

                                    let baseOffset = paddingTop;
                                    if (hasTimer) {
                                        baseOffset += timerHeight + timerMarginBottom;
                                    }
                                    baseOffset += titleHeight + titleMarginBottom;
                                    if (hasRefArea) {
                                        baseOffset += refAreaHeight + refAreaMarginBottom;
                                    }
                                    baseOffset += promptAreaHeight + promptAreaMarginBottom;

                                    if (connectingInputType === 'oref') {
                                        startY = node.y + baseOffset + instructionItemHeight * 0.5;
                                    } else if (connectingInputType === 'sref') {
                                        // sref在第三个指令位置：oref项(16px) + gap(6px) + ow项(owInputHeight ≈ 28px) + gap(6px) + sref项的中心(8px)
                                        startY = node.y + baseOffset + instructionItemHeight + instructionGap + owInputHeight + instructionGap + instructionItemHeight * 0.5;
                                    }
                                }
                            }
                            // 处理image-compare节点的多个输入点
                            else if (node.type === 'image-compare') {
                                // 这里可以根据鼠标位置判断是哪个输入点，暂时使用中间位置
                                startY = node.y + node.height / 2;
                            }

                            return <path d={`M ${startX} ${startY} C ${startX - 100} ${startY}, ${mousePos.x + 100} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`} stroke="#60a5fa" strokeWidth="2" fill="none" strokeDasharray="4,4" />;
                        })()}
                    </svg>
                </div>
            );
            }, (prevProps, nextProps) => {
                // 自定义对比函数：仅当 connections 数组、可见节点或相关选中状态变化时才重渲染
                return (
                    prevProps.connections === nextProps.connections &&
                    prevProps.visibleNodes === nextProps.visibleNodes &&
                    prevProps.selectedNodeId === nextProps.selectedNodeId &&
                    prevProps.connectingSource === nextProps.connectingSource &&
                    prevProps.connectingTarget === nextProps.connectingTarget &&
                    prevProps.connectingInputType === nextProps.connectingInputType &&
                    prevProps.mousePos.x === nextProps.mousePos.x &&
                    prevProps.mousePos.y === nextProps.mousePos.y
                );
            });

            // 使用 useMemo 优化连接线渲染函数，避免重复查找和计算
            const renderConnections = useCallback(() => {
                return (
                    <ConnectionLayer
                        connections={connections}
                        nodesMap={nodesMap}
                        connectionsByNode={connectionsByNode}
                        connectingSource={connectingSource}
                        connectingTarget={connectingTarget}
                        connectingInputType={connectingInputType}
                        mousePos={mousePos}
                        apiConfigsMap={apiConfigsMap}
                        selectedNodeId={selectedNodeId}
                        onDisconnectConnection={disconnectConnection}
                        visibleNodes={visibleNodes}
                    />
                );
            }, [connections, nodesMap, connectionsByNode, connectingSource, connectingTarget, connectingInputType, mousePos, apiConfigsMap, selectedNodeId, disconnectConnection, visibleNodes]);

            // 使用 useMemo 缓存节点的连接状态，避免每次渲染时重复计算
            const nodeConnectedStatus = useMemo(() => {
                const status = new Map(); // nodeId -> boolean
                connections.forEach(conn => {
                    if (!conn.inputType || conn.inputType === 'default') {
                        status.set(conn.to, true);
                    }
                });
                return status;
            }, [connections]);

            // 功能3：获取相邻节点（上游和下游）- 使用缓存的连接映射优化性能
            const getAdjacentNodes = useCallback((nodeId) => {
                const adjacent = new Set();
                const fromConns = connectionsByNode.from.get(nodeId) || [];
                const toConns = connectionsByNode.to.get(nodeId) || [];
                fromConns.forEach(conn => adjacent.add(conn.to));
                toConns.forEach(conn => adjacent.add(conn.from));
                return adjacent;
            }, [connectionsByNode]);

            // 缓存相邻节点集合，避免在renderNode中重复计算
            const adjacentNodesCache = useMemo(() => {
                const cache = new Map();
                if (selectedNodeId || selectedNodeIds.size > 0) {
                    const selectedId = selectedNodeId || (selectedNodeIds.size === 1 ? Array.from(selectedNodeIds)[0] : null);
                    if (selectedId) {
                        cache.set(selectedId, getAdjacentNodes(selectedId));
                    }
                }
                return cache;
            }, [selectedNodeId, selectedNodeIds, getAdjacentNodes]);

            // NodeItem 组件：提取节点渲染逻辑，使用 React.memo 优化
            // 注意：由于 renderNode 的 JSX 内容非常长（约 2700 行），完整提取需要大量工作
            // 我们采用更实用的方法：保持 renderNode 函数的结构，但通过 React.memo 优化
            // 关键优化点：
            // 1. 所有回调函数都使用 useCallback 优化（已完成）
            // 2. ConnectionLayer 已提取并优化（已完成）
            // 3. CSS 渲染优化（已完成）
            // 4. 通过计算 props 减少不必要的重渲染

            const renderNode = useCallback((node) => {
                // LOD (Level of Detail) 阈值
                const LOD_THRESHOLD = 0.4;
                const isLowDetail = view.zoom < LOD_THRESHOLD;

                const isSelected = selectedNodeId === node.id || selectedNodeIds.has(node.id);
                const connectedImages = getConnectedInputImages(node.id);
                const isHoverTarget = hoverTargetId === node.id;
                // 使用缓存的连接状态，O(1) 查找
                const isConnected = nodeConnectedStatus.get(node.id) || false;
                // 判断节点是否正在被拖动（包括多选拖动），用于提升 z-index 避免被遮挡
                const isDragging = dragNodeId === node.id || (dragNodeId && selectedNodeIds.has(node.id));

                // 功能3：检查是否为相邻节点（当有节点被选中时）- 使用缓存的相邻节点集合
                const selectedId = selectedNodeId || (selectedNodeIds.size === 1 ? Array.from(selectedNodeIds)[0] : null);
                const adjacentSet = selectedId ? adjacentNodesCache.get(selectedId) : null;
                const isAdjacent = selectedId && selectedId !== node.id && adjacentSet && adjacentSet.has(node.id);

                // 判断是否为Nano Banana 2模型 - 使用 Map 优化查找（O(1)）
                const currentModel = apiConfigsMap.get(node.settings?.model);
                const isNanoBanana2 = currentModel
                    ? ((currentModel.modelName || currentModel.id || '').includes('nano-banana-2'))
                    : ((node.settings?.model || '').includes('nano-banana-2'));

                // 低细节模式：只渲染核心内容
                if (isLowDetail) {
                    return (
                        <LowDetailNode
                            node={node}
                            theme={theme}
                            isSelected={isSelected}
                            isConnected={isConnected}
                            isDragging={isDragging}
                            dragNodeId={dragNodeId}
                            selectedNodeIds={selectedNodeIds}
                            setSelectedNodeIds={setSelectedNodeIds}
                            setSelectedNodeId={setSelectedNodeId}
                            setDragNodeId={setDragNodeId}
                            connectingSource={connectingSource}
                            connectingTarget={connectingTarget}
                            hoverTargetId={hoverTargetId}
                            setHoverTargetId={setHoverTargetId}
                            handleNodeMouseUp={handleNodeMouseUp}
                            isVideoUrl={isVideoUrl}
                            screenToWorld={screenToWorld}
                            setMousePos={setMousePos}
                            setConnectingTarget={setConnectingTarget}
                            setConnectingInputType={setConnectingInputType}
                            setConnectingSource={setConnectingSource}
                        />
                    );
                }

                // 高细节模式：完整渲染逻辑
                return (
                    <div
                        key={node.id}
                        data-node-id={node.id}
                        className={`absolute rounded-xl ${isPerformanceMode ? '' : 'shadow-xl'} transition-shadow duration-150 group flex flex-col node-wrapper ${
                            isSelected
                                ? 'ring-1 ring-blue-500' + (isPerformanceMode ? '' : ' shadow-blue-500/20')
                                : isAdjacent
                                    ? 'ring-2 ring-blue-300/60' + (isPerformanceMode ? '' : ' shadow-blue-300/30')
                                    : theme === 'dark'
                                        ? 'border border-zinc-800' + (isPerformanceMode ? '' : ' shadow-black/40')
                                        : 'border border-zinc-200' + (isPerformanceMode ? '' : ' shadow-black/10')
                        } ${isHoverTarget && ((connectingSource && connectingSource !== node.id) || (connectingTarget && connectingTarget !== node.id)) ? 'ring-2 ring-green-500/50' : ''} ${
                            theme === 'dark' ? 'bg-[#18181b]' : 'bg-white'
                        }`}
                        style={{
                            left: node.x,
                            top: node.y,
                            width: node.width,
                            height: node.height,
                            cursor: (dragNodeId === node.id || (dragNodeId && selectedNodeIds.has(node.id))) ? 'grabbing' : 'default',
                            zIndex: isDragging ? 50 : 10, // 拖动时提升 z-index，避免被其他节点遮挡
                            boxShadow: isPerformanceMode ? undefined : (isDragging ? (theme === 'dark' ? '0 0 25px rgba(59, 130, 246, 0.6), 0 0 10px rgba(59, 130, 246, 0.4)' : '0 0 25px rgba(59, 130, 246, 0.4), 0 0 10px rgba(59, 130, 246, 0.2)') : undefined),
                            WebkitFontSmoothing: 'antialiased',
                            MozOsxFontSmoothing: 'grayscale',
                            textRendering: 'optimizeLegibility',
                            transform: 'translateZ(0)',
                            backfaceVisibility: 'hidden'
                        }}
                        onMouseDown={(e) => {
                            if (e.button === 0) {
                                e.stopPropagation();
                                // 如果按住了Ctrl键，添加到多选
                                if (e.ctrlKey || e.metaKey) {
                                    setSelectedNodeIds(prev => {
                                        const newSet = new Set(prev);
                                        if (newSet.has(node.id)) {
                                            newSet.delete(node.id);
                                        } else {
                                            newSet.add(node.id);
                                        }
                                        // 如果多选集合为空或只有一个，更新selectedNodeId
                                        if (newSet.size === 1) {
                                            setSelectedNodeId(Array.from(newSet)[0]);
                                        } else {
                                            setSelectedNodeId(null);
                                        }
                                        return newSet;
                                    });
                                } else {
                                    // 如果没有按住Ctrl，检查该节点是否已经在多选集合中
                                    const isAlreadySelected = selectedNodeIds.has(node.id);
                                    if (isAlreadySelected && selectedNodeIds.size > 1) {
                                        // 如果节点已经在多选集合中，保持多选状态，不重置
                                        // 只更新 selectedNodeId 为当前节点（用于显示详情等）
                                        setSelectedNodeId(node.id);
                                    } else {
                                        // 单选模式：重置为只选中当前节点
                                        setSelectedNodeId(node.id);
                                        setSelectedNodeIds(new Set([node.id]));
                                    }
                                }
                                setDragNodeId(node.id);
                                setActiveDropdown(null);
                            }
                        }}
                        onMouseEnter={() => { if (connectingSource || connectingTarget) setHoverTargetId(node.id); }}
                        onMouseLeave={() => { if ((connectingSource || connectingTarget) && hoverTargetId === node.id) setHoverTargetId(null); }}
                        onMouseUp={(e) => handleNodeMouseUp(node.id, e)}
                        onDoubleClick={(e) => {
                            // 功能6：双击图片或视频节点显示预览弹窗
                            if ((node.type === 'input-image' || node.type === 'video-input') && node.content) {
                                e.stopPropagation();
                                setLightboxItem({ url: node.content, type: isVideoUrl(node.content) ? 'video' : 'image' });
                            }
                        }}
                    >
                        <button
                            onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                            className={`absolute -top-2.5 -right-2.5 z-50 p-1 rounded-full shadow border opacity-0 group-hover:opacity-100 transition-opacity scale-90 hover:scale-100 ${
                                theme === 'dark'
                                    ? 'bg-zinc-800 text-zinc-400 hover:text-red-500 hover:bg-zinc-700 border-zinc-700'
                                    : 'bg-zinc-100 text-zinc-500 hover:text-red-500 hover:bg-zinc-200 border-zinc-300'
                            }`}
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            <X size={12} />
                        </button>
                        <div className="absolute bottom-1 right-1 w-4 h-4 z-[100] resize-handle flex items-end justify-end p-0.5" onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setResizingNodeId(node.id); }}><svg width="6" height="6" viewBox="0 0 8 8" fill="none" className="text-zinc-600"><path d="M8 0L8 8L0 8" stroke="currentColor" strokeWidth="2" /></svg></div>

                        {node.type !== 'input-image' && node.type !== 'video-input' && node.type !== 'video-analyze' && (
                            node.type === 'image-compare' ? (
                                <>
                                    <div
                                        className={`input-point ${connectingTarget === node.id && !connectingInputType ? 'active' : ''}`}
                                        style={{ top: '33%' }}
                                        title="图 1 输入"
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            // 立即计算并更新当前鼠标的世界坐标，防止线条乱飞
                                            const world = screenToWorld(e.clientX, e.clientY);
                                            setMousePos(world);
                                            setConnectingTarget(node.id);
                                            setConnectingInputType('default');
                                        }}
                                        onMouseUp={(e) => handleNodeMouseUp(node.id, e, 'default')}
                                    />
                                    <div
                                        className={`input-point ${connectingTarget === node.id && !connectingInputType ? 'active' : ''}`}
                                        style={{ top: '66%' }}
                                        title="图 2 输入"
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            // 立即计算并更新当前鼠标的世界坐标，防止线条乱飞
                                            const world = screenToWorld(e.clientX, e.clientY);
                                            setMousePos(world);
                                            setConnectingTarget(node.id);
                                            setConnectingInputType('default');
                                        }}
                                        onMouseUp={(e) => handleNodeMouseUp(node.id, e, 'default')}
                                    />
                                </>
                            ) : (
                                <div
                                    className={`input-point ${isConnected ? 'connected' : ''} ${connectingTarget === node.id && !connectingInputType ? 'active' : ''}`}
                                    title="输入"
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        // 立即计算并更新当前鼠标的世界坐标，防止线条乱飞
                                        const world = screenToWorld(e.clientX, e.clientY);
                                        setMousePos(world);
                                        setConnectingTarget(node.id);
                                        setConnectingInputType('default');
                                    }}
                                    onMouseUp={(e) => handleNodeMouseUp(node.id, e, 'default')}
                                />
                            )
                        )}

                        {node.type !== 'local-save' && (
                            <div
                                className={`connector connector-right ${connectingSource === node.id ? 'active' : ''} ${connectingTarget && hoverTargetId === node.id ? 'ring-2 ring-green-500/50' : ''}`}
                                title="输出"
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    // 立即计算并更新当前鼠标的世界坐标，防止线条乱飞
                                    const world = screenToWorld(e.clientX, e.clientY);
                                    setMousePos(world);
                                    setConnectingSource(node.id);
                                }}
                                onMouseEnter={() => { if (connectingTarget) setHoverTargetId(node.id); }}
                                onMouseLeave={() => { if (connectingTarget && hoverTargetId === node.id) setHoverTargetId(null); }}
                            >
                                <Plus size={10} />
                            </div>
                        )}


                        <div
                            className={`overflow-hidden rounded-xl flex-1 flex flex-col pointer-events-none h-full w-full relative ${
                                theme === 'dark' ? 'bg-[#18181b]' : 'bg-white'
                            }`}
                        >
                            {node.type === 'input-image' && (
                                <div
                                    className={`relative w-full h-full flex flex-col items-center justify-center transition-colors pointer-events-auto drop-zone ${
                                        theme === 'dark'
                                            ? 'bg-zinc-900 group-hover:bg-zinc-800'
                                            : 'bg-zinc-100 group-hover:bg-zinc-200'
                                    }`}
                                    onDrop={(e) => handleDrop(node.id, e)}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onContextMenu={(e) => handleInputImageRightClick(e, node.id)}
                                >
                                    {node.content ? (
                                        <div className="relative w-full h-full">
                                            {isVideoUrl(node.content) ? (
                                                 <video
                                                    src={node.content}
                                                    controls
                                                    className="w-full h-full object-contain bg-black/50"
                                                    draggable={false}
                                                    style={{
                                                        imageRendering: view.zoom >= 1 ? 'auto' : 'crisp-edges',
                                                        WebkitFontSmoothing: 'antialiased',
                                                        transform: 'translateZ(0)',
                                                        backfaceVisibility: 'hidden',
                                                        WebkitBackfaceVisibility: 'hidden'
                                                    }}
                                                />
                                            ) : (
                                                 <img
                                                    src={node.content}
                                                    className="w-full h-full object-contain bg-black/50"
                                                    draggable={false}
                                                    loading="lazy"
                                                    style={{
                                                        imageRendering: view.zoom >= 1 ? 'auto' : 'crisp-edges',
                                                        WebkitFontSmoothing: 'antialiased',
                                                        transform: 'translateZ(0)',
                                                        backfaceVisibility: 'hidden',
                                                        WebkitBackfaceVisibility: 'hidden'
                                                    }}
                                                />
                                            )}
                                            {node.dimensions && (
                                                <div
                                                    className={`absolute bottom-2 right-2 text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm border ${
                                                        theme === 'dark'
                                                            ? 'bg-black/70 text-white border-white/10'
                                                            : 'bg-white/80 text-zinc-800 border-zinc-200'
                                                    }`}
                                                >
                                                    {node.dimensions.w}x{node.dimensions.h}
                                                </div>
                                            )}
                                            {/* 悬浮菜单：当 isMasking 为 true 时强制隐藏 */}
                                            {!node.isMasking && (
                                            <div className="absolute inset-0 bg-black/40 transition-opacity gap-2 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center">
                                                <div className="flex items-center gap-2">
                                                <label
                                                    className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs backdrop-blur-sm border transition-colors ${
                                                        theme === 'dark'
                                                            ? 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                                                            : 'bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-300'
                                                    }`}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                >
                                                    更换 <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(node.id, e)} />
                                                </label>
                                                    {!isVideoUrl(node.content) && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setNodes((prev) => prev.map((n) =>
                                                                    n.id === node.id
                                                                        ? { ...n, isMasking: !n.isMasking }
                                                                        : n
                                                                ));
                                                            }}
                                                            className={`px-3 py-1.5 rounded-lg text-xs backdrop-blur-sm border transition-colors flex items-center gap-1 ${
                                                                theme === 'dark'
                                                                    ? node.isMasking
                                                                        ? 'bg-red-500/80 hover:bg-red-500 text-white border-red-400'
                                                                        : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                                                                    : node.isMasking
                                                                        ? 'bg-red-500 hover:bg-red-600 text-white border-red-400'
                                                                        : 'bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-300'
                                                            }`}
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                        >
                                                            <Brush size={12} />
                                                            局部重绘
                                                        </button>
                                                    )}
                                                </div>
                                                <div
                                                    className={`text-[10px] text-center px-2 ${
                                                        theme === 'dark' ? 'text-zinc-300' : 'text-zinc-500'
                                                    }`}
                                                >
                                                    或拖放图片到此处
                                                    <br />
                                                    或 Ctrl+V 粘贴
                                                </div>
                                            </div>
                                            )}
                                            {/* 非编辑模式下的蒙版回显 */}
                                            {!node.isMasking && node.maskContent && (
                                                <div
                                                    className="absolute inset-0 z-20 pointer-events-none"
                                                    style={{
                                                        background: 'rgba(255, 0, 0, 0.3)',
                                                        mixBlendMode: 'multiply',
                                                        WebkitMaskImage: `url(${node.maskContent})`,
                                                        maskImage: `url(${node.maskContent})`,
                                                        WebkitMaskSize: '100% 100%',
                                                        maskSize: '100% 100%',
                                                        WebkitMaskRepeat: 'no-repeat',
                                                        maskRepeat: 'no-repeat'
                                                    }}
                                                />
                                            )}
                                            {/* MaskEditor 组件 */}
                                            {node.isMasking && !isVideoUrl(node.content) && node.dimensions && (
                                                <MaskEditor
                                                    nodeId={node.id}
                                                    imageUrl={node.content}
                                                    imageDimensions={node.dimensions}
                                                    isActive={node.isMasking}
                                                    isPerformanceMode={isPerformanceMode}
                                                    onClose={() => {
                                                        setNodes((prev) => prev.map((n) =>
                                                            n.id === node.id
                                                                ? { ...n, isMasking: false }
                                                                : n
                                                        ));
                                                    }}
                                                    onSave={(maskDataUrl) => {
                                                        console.log('蒙版已保存:', maskDataUrl);
                                                    }}
                                                    onUpdateNode={(nodeId, updates) => {
                                                        setNodes((prev) => prev.map((n) =>
                                                            n.id === nodeId
                                                                ? { ...n, ...updates }
                                                                : n
                                                        ));
                                                    }}
                                                    theme={theme}
                                                    view={view}
                                                    maskContent={node.maskContent}
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full w-full">
                                             <div
                                                className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 border ${
                                                    theme === 'dark'
                                                        ? 'bg-zinc-800 border-zinc-700/50'
                                                        : 'bg-zinc-100 border-zinc-300'
                                                }`}
                                             >
                                                <ImageIcon
                                                    className={`w-6 h-6 ${
                                                        theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'
                                                    }`}
                                                />
                                             </div>
                                             <label
                                                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer pointer-events-auto"
                                                onMouseDown={(e) => e.stopPropagation()}
                                             >
                                                选择图片
                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(node.id, e)} />
                                             </label>
                                             <div
                                                className={`text-[10px] text-center mt-2 pointer-events-none ${
                                                    theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500'
                                                }`}
                                             >
                                                或拖放图片到此处
                                                <br />
                                                或 Ctrl+V 粘贴
                                             </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {node.type === 'video-input' && (
                                <div
                                    className={`relative w-full h-full flex flex-col transition-colors pointer-events-auto drop-zone video-input-container ${
                                        theme === 'dark'
                                            ? 'bg-zinc-900/80'
                                            : 'bg-zinc-100'
                                    }`}
                                    onDrop={(e) => handleVideoDrop(node.id, e)}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                >
                                    <div className="flex items-center justify-between px-3 py-2 border-b text-xs font-semibold">
                                        <div className="flex items-center gap-1.5">
                                            <Video size={13} className="text-blue-500" />
                                            <span>视频输入</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                                            {node.videoMeta?.duration ? <span>时长 {node.videoMeta.duration.toFixed(1)}s</span> : null}
                                            {node.videoMeta?.w ? <span>{node.videoMeta.w}x{node.videoMeta.h}</span> : null}
                                            {node.selectedKeyframes?.length ? <span className="text-blue-500">关键帧 {node.selectedKeyframes.length} 个</span> : null}
                                        </div>
                                    </div>

                                    <div className="flex-1 flex flex-col gap-3 p-3 overflow-hidden min-h-0">
                                        {node.content ? (
                                            <div className="space-y-2">
                                                <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                                                    <video
                                                        src={node.content}
                                                        controls
                                                        className="w-full h-full object-contain"
                                                        draggable={false}
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <label
                                                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer"
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                    >
                                                        更换视频
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            accept="video/*"
                                                            onChange={(e) => handleVideoFileUpload(node.id, e.target.files?.[0])}
                                                        />
                                                    </label>
                                                    <button
                                                        className={`px-3 py-1.5 rounded text-xs border transition-colors ${
                                                            theme === 'dark'
                                                                ? 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-blue-500 hover:text-blue-400'
                                                                : 'border-zinc-300 hover:border-blue-500 hover:text-blue-600'
                                                        }`}
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onClick={() => handleAutoExtractKeyframes(node.id, 2)}
                                                    >
                                                        自动抽帧（2fps）
                                                    </button>
                                                    <button
                                                        className={`px-3 py-1.5 rounded text-xs border transition-colors ${
                                                            theme === 'dark'
                                                                ? 'bg-green-600/40 border-green-500 text-green-200 hover:bg-green-600/60 hover:border-green-400'
                                                                : 'bg-green-50 border-green-300 hover:border-green-500 hover:text-green-600'
                                                        }`}
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onClick={() => handleSmartExtractKeyframes(node.id, 30)}
                                                    >
                                                        智能抽帧
                                                    </button>
                                                    {node.extractingFrames && (
                                                        <span className="text-[11px] text-blue-500">抽帧中...</span>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center flex-1 gap-3">
                                                <div
                                                    className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                                                        theme === 'dark'
                                                            ? 'bg-zinc-800 border-zinc-700/50'
                                                            : 'bg-zinc-100 border-zinc-300'
                                                    }`}
                                                >
                                                    <Video className={`w-6 h-6 ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`} />
                                                </div>
                                                <label
                                                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                >
                                                    选择或拖拽视频
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        accept="video/*"
                                                        onChange={(e) => handleVideoFileUpload(node.id, e.target.files?.[0])}
                                                    />
                                                </label>
                                                <div className="text-[10px] text-center text-zinc-500 pointer-events-none">
                                                    支持 MP4/WEBM，拖拽或 Ctrl+V 不可用
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between text-[11px] text-zinc-500">
                                            <span>抽帧缩略图</span>
                                            <span>{(node.frames || []).length} 张</span>
                                        </div>
                                        <div
                                            className="grid gap-3 w-full overflow-y-auto custom-scrollbar flex-1 min-h-0"
                                            style={{
                                                gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(140px, 20vw, 240px), 1fr))',
                                                gridAutoRows: 'minmax(110px, auto)'
                                            }}
                                        >
                                            {(node.frames || []).length === 0 ? (
                                                <div className={`col-span-full text-[11px] text-zinc-500 text-center py-4 border rounded ${
                                                    theme === 'dark' ? 'bg-zinc-800/40 border-zinc-700' : 'bg-white/40 border-zinc-300'
                                                }`}>
                                                    点击「自动抽帧」即可生成缩略图
                                                </div>
                                            ) : (
                                                (node.frames || []).map((frame, idx) => {
                                                    const selected = (node.selectedKeyframes || []).some(f => f.url === frame.url && f.time === frame.time);
                                                    return (
                                                        <button
                                                            key={`${frame.url}-${idx}`}
                                                            className={`relative rounded border overflow-hidden group ${selected ? 'ring-2 ring-blue-500' : ''}`}
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                            onClick={(e) => handleToggleKeyframe(node.id, frame, idx, e)}
                                                            onContextMenu={(e) => openFrameContextMenu(e, node.id, frame)}
                                                        >
                                                            <img src={frame.url} className="w-full aspect-video object-contain bg-black" alt={`frame-${idx}`} loading="lazy" />
                                                            <div className="absolute left-1 top-1 text-[10px] px-1 py-0.5 rounded bg-black/60 text-white">
                                                                {frame.time.toFixed(2)}s
                                                            </div>
                                                            <div className="absolute right-1 top-1 w-4 h-4 rounded-full border border-white/80 bg-black/40 flex items-center justify-center">
                                                                {selected ? <CheckCircle2 size={10} className="text-white" /> : null}
                                                            </div>
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {node.type === 'text-node' && (
                                <div
                                    className={`relative w-full h-full flex flex-col transition-colors pointer-events-auto ${
                                        theme === 'dark'
                                            ? 'bg-zinc-900/80'
                                            : 'bg-zinc-100'
                                    }`}
                                >
                                    <div className="flex items-center justify-between px-3 py-2 border-b text-xs font-semibold">
                                        <div className="flex items-center gap-1.5">
                                            <FileText size={13} className="text-blue-500" />
                                            <span>文字节点</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 p-3">
                                        <textarea
                                            data-node-type="text-node"
                                            data-node-id={node.id}
                                            value={node.settings?.text || ''}
                                            onChange={(e) => {
                                                updateNodeSettings(node.id, { text: e.target.value });
                                            }}
                                            placeholder="输入文字内容..."
                                            className={`w-full h-full resize-none outline-none text-sm p-2 rounded border ${
                                                theme === 'dark'
                                                    ? 'bg-zinc-800 border-zinc-700 text-zinc-200 placeholder-zinc-500'
                                                    : 'bg-white border-zinc-300 text-zinc-800 placeholder-zinc-400'
                                            }`}
                                            onMouseDown={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                </div>
                            )}

                            {node.type === 'novel-input' && (
                                <div
                                    className={`relative w-full h-full flex flex-col transition-colors pointer-events-auto ${
                                        theme === 'dark'
                                            ? 'bg-zinc-900/80'
                                            : 'bg-zinc-100'
                                    }`}
                                >
                                    <div className="flex items-center gap-1.5 px-3 py-2 border-b text-xs font-semibold shrink-0">
                                        <FileText size={12} className="text-blue-500" />
                                        <span>小说输入</span>
                                    </div>
                                    <div className="flex-1 flex flex-col gap-2 p-3 overflow-hidden min-h-0">
                                        <textarea
                                            value={node.settings?.content || ''}
                                            onChange={(e) => {
                                                const newValue = e.target.value;
                                                if (newValue.length <= 10000) {
                                                    updateNodeSettings(node.id, { content: newValue });
                                                }
                                            }}
                                            placeholder="输入小说内容（最多10,000字）..."
                                            maxLength={10000}
                                            className={`w-full h-full resize-none outline-none text-sm p-2 rounded border ${
                                                theme === 'dark'
                                                    ? 'bg-zinc-800 border-zinc-700 text-zinc-200 placeholder-zinc-500'
                                                    : 'bg-white border-zinc-300 text-zinc-800 placeholder-zinc-400'
                                            }`}
                                            onMouseDown={(e) => e.stopPropagation()}
                                        />
                                        <div className="text-right text-[10px] text-zinc-500 shrink-0">
                                            {(node.settings?.content || '').length}/10,000
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between px-3 py-2 border-t shrink-0">
                                        <button
                                            className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
                                                theme === 'dark'
                                                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                                                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                                            }`}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            type="button"
                                            onClick={() => {
                                                if (!node.settings?.content || node.settings.content.trim().length === 0) {
                                                    alert('请先输入小说内容');
                                                    return;
                                                }
                                                // 创建提取角色和场景节点
                                                // node.x/node.y 本身就是 world 坐标，不应再 screenToWorld，否则会导致新节点“飞到”视野外
                                                const worldX = node.x + node.width + 100;
                                                const worldY = node.y + node.height / 2;
                                                const extractNodeId = `node-${Date.now()}`;
                                                const extractNode = {
                                                    id: extractNodeId,
                                                    type: 'extract-characters-scenes',
                                                    x: worldX - 200,
                                                    y: worldY - 200,
                                                    width: 400,
                                                    height: 500,
                                                    settings: {
                                                        model: apiConfigs.find(c => c.type === 'Chat')?.id || '',
                                                        content: node.settings.content
                                                    }
                                                };
                                                setNodes(prev => [...prev, extractNode]);
                                                // 创建连接
                                                setConnections(prev => [...prev, {
                                                    id: `conn-${Date.now()}`,
                                                    from: node.id,
                                                    to: extractNodeId
                                                }]);

                                                // 自动触发提取（延迟100ms确保节点已渲染）
                                                setTimeout(() => {
                                                    const extractButton = document.getElementById(`extract-button-${extractNodeId}`);
                                                    if (extractButton) {
                                                        extractButton.click();
                                                    }
                                                }, 100);
                                            }}
                                        >
                                            提取角色和场景
                                        </button>
                                    </div>
                                </div>
                            )}

                            {node.type === 'extract-characters-scenes' && (
                                <div
                                    className={`relative w-full h-full flex flex-col transition-colors pointer-events-auto ${
                                        theme === 'dark'
                                            ? 'bg-zinc-900/80'
                                            : 'bg-zinc-100'
                                    }`}
                                >
                                    <div className={`flex items-center justify-between px-3 py-2 border-b text-xs font-semibold shrink-0 ${
                                        theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'
                                    }`}>
                                        <div className="flex items-center gap-1.5">
                                            <Wand2 size={12} className="text-purple-500" />
                                            <span>提取角色和场景</span>
                                        </div>
                                        {node.settings?.analysisResults && (
                                            <span className="text-[10px] text-zinc-500">
                                                {(node.settings.analysisResults.characters?.length || 0) + (node.settings.analysisResults.scenes?.length || 0)}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex-1 flex flex-col gap-3 p-3 overflow-y-auto min-h-0">
                                        {/* 模型选择器 */}
                                        <div>
                                            <label className="text-[10px] mb-1 block text-zinc-500">选择分析模型</label>
                                            <select
                                                value={node.settings?.model || ''}
                                                onChange={(e) => updateNodeSettings(node.id, { model: e.target.value })}
                                                className={`w-full px-2 py-1 rounded text-xs border ${
                                                    theme === 'dark'
                                                        ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                                                        : 'bg-white border-zinc-300 text-zinc-800'
                                                }`}
                                                onMouseDown={(e) => e.stopPropagation()}
                                            >
                                                {apiConfigs
                                                    .filter(c => c.type === 'Chat')
                                                    .map(c => (
                                                        <option key={c.id} value={c.id}>{c.provider}</option>
                                                    ))}
                                            </select>
                                        </div>

                                        {/* 显示提取结果 */}
                                        {node.settings?.analysisResults ? (
                                            <>
                                                {/* 角色列表 */}
                                                {node.settings.analysisResults.characters && node.settings.analysisResults.characters.length > 0 && (
                                                    <div>
                                                        <div className="text-[10px] font-medium mb-1 text-zinc-500">
                                                            角色 ({node.settings.analysisResults.characters.length})
                                                        </div>
                                                        {node.settings.analysisResults.characters.map((char, idx) => (
                                                            <div key={char.id} className={`p-2 rounded mb-1 ${
                                                                theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-50'
                                                            }`}>
                                                                <div className="flex items-center gap-1">
                                                                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                                                                        idx === 0 ? 'bg-red-500' : idx === 1 ? 'bg-purple-500' : 'bg-blue-500'
                                                                    }`}></span>
                                                                    <span className="text-[11px]">{char.name} ({char.role || '未知'})</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* 场景列表 */}
                                                {node.settings.analysisResults.scenes && node.settings.analysisResults.scenes.length > 0 && (
                                                    <div>
                                                        <div className="text-[10px] font-medium mb-1 text-zinc-500">
                                                            场景 ({node.settings.analysisResults.scenes.length})
                                                        </div>
                                                        {node.settings.analysisResults.scenes.map((scene, idx) => (
                                                            <div key={scene.id} className={`p-2 rounded mb-1 ${
                                                                theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-50'
                                                            }`}>
                                                                <div className="flex items-center gap-1">
                                                                    <span className="w-2 h-2 rounded-full bg-green-500 shrink-0"></span>
                                                                    <span className="text-[11px]">{scene.name}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center flex-1 gap-2 text-[11px] text-zinc-500">
                                                <Wand2 size={24} className="text-zinc-400" />
                                                <span>点击"提取"按钮开始分析</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="px-3 py-2 border-t shrink-0">
                                        {/* 进度条显示 */}
                                        {node.settings?.isAnalyzing && (
                                            <div className="mb-2">
                                                <div className="text-[10px] mb-1 text-zinc-500">正在分析小说内容...</div>
                                                <div className={`w-full h-1.5 rounded-full overflow-hidden ${
                                                    theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'
                                                }`}>
                                                    <div
                                                        className="h-full bg-blue-500 transition-all duration-300"
                                                        style={{ width: `${node.settings?.progress || 0}%` }}
                                                    />
                                                </div>
                                                <div className="text-[10px] text-zinc-500 mt-1">
                                                    {node.settings?.progress || 0}% 完成
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            id={`extract-button-${node.id}`}
                                            className={`w-full py-2 rounded text-xs font-medium transition-colors ${
                                                node.settings?.isAnalyzing
                                                    ? 'bg-zinc-400 cursor-not-allowed text-white'
                                                    : theme === 'dark'
                                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'
                                                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                                            }`}
                                            disabled={node.settings?.isAnalyzing}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onClick={async () => {
                                                // 从连接的小说节点获取内容
                                                const novelNode = connections
                                                    .filter(c => c.to === node.id)
                                                    .map(c => nodesMap.get(c.from))
                                                    .find(n => n?.type === 'novel-input');

                                                const novelContent = novelNode?.settings?.content || node.settings?.content || '';

                                                if (!novelContent || novelContent.trim().length === 0) {
                                                    alert('请先连接小说输入节点或输入小说内容');
                                                    return;
                                                }

                                                const selectedModel = node.settings?.model || apiConfigs.find(c => c.type === 'Chat')?.id || '';
                                                if (!selectedModel) {
                                                    alert('请先选择分析模型');
                                                    return;
                                                }

                                                // 更新节点状态，显示进度条
                                                updateNodeSettings(node.id, {
                                                    isAnalyzing: true,
                                                    progress: 0,
                                                    lastAnalyzed: null,
                                                    error: null
                                                });

                                                try {
                                                    // 模拟分析过程，显示进度
                                                    const step = 10;
                                                    let progress = 0;

                                                    const progressInterval = setInterval(() => {
                                                        progress += step;
                                                        if (progress >= 90) {
                                                            clearInterval(progressInterval);
                                                        }
                                                        updateNodeSettings(node.id, { progress });
                                                    }, 300);
                                                    const config = apiConfigsMap.get(selectedModel);
                                                    const apiKey = config?.key || globalApiKey;
                                                    const baseUrl = (config?.url || DEFAULT_BASE_URL).replace(/\/+$/, '');

                                                    if (!apiKey) {
                                                        alert('请先配置API Key');
                                                        return;
                                                    }

                                                    // 构建分析请求
                                                    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
                                                        method: 'POST',
                                                        headers: {
                                                            'Authorization': `Bearer ${apiKey}`,
                                                            'Content-Type': 'application/json'
                                                        },
                                                        body: JSON.stringify({
                                                            model: config?.modelName || selectedModel,
                                                            messages: [
                                                                {
                                                                    role: 'system',
                                                                    content: `你是一个小说内容分析器。请分析以下小说内容，提取所有角色和场景信息，返回JSON格式：
{
  "characters": [
    {"id": "唯一ID", "name": "角色名", "role": "角色身份", "description": "角色详细描述", "age": "年龄", "gender": "性别"},
    ...
  ],
  "scenes": [
    {"id": "唯一ID", "name": "场景名", "description": "场景详细描述"},
    ...
  ]
}
请确保返回的是有效的JSON格式，不要包含任何markdown代码块标记。`
                                                                },
                                                                {
                                                                    role: 'user',
                                                                    content: `小说内容：\n${novelContent}`
                                                                }
                                                            ],
                                                            temperature: 0.3
                                                        })
                                                    });

                                                    if (!response.ok) {
                                                        const errText = await response.text();
                                                        throw new Error(errText || `API Error: ${response.status}`);
                                                    }

                                                    const data = await response.json();
                                                    const content = data.choices?.[0]?.message?.content || '{}';
                                                    let results;

                                                    try {
                                                        // 尝试直接解析JSON
                                                        results = JSON.parse(content);
                                                    } catch (e) {
                                                        // 尝试修复JSON格式（移除markdown代码块标记）
                                                        const cleaned = content
                                                            .replace(/```json\s*/g, '')
                                                            .replace(/```\s*/g, '')
                                                            .replace(/[\r\n]/g, ' ')
                                                            .replace(/,\s*}/g, '}')
                                                            .replace(/,\s*\]/g, ']')
                                                            .trim();
                                                        try {
                                                            results = JSON.parse(cleaned);
                                                        } catch (e2) {
                                                            throw new Error('解析结果失败，请重试');
                                                        }
                                                    }

                                                    // 验证结果格式
                                                    if (!results.characters || !Array.isArray(results.characters)) {
                                                        results.characters = [];
                                                    }
                                                    if (!results.scenes || !Array.isArray(results.scenes)) {
                                                        results.scenes = [];
                                                    }

                                                    // 更新节点设置
                                                    updateNodeSettings(node.id, {
                                                        isAnalyzing: false,
                                                        progress: 100,
                                                        analysisResults: results,
                                                        lastAnalyzed: Date.now()
                                                    });

                                                    // 自动生成完整工作流
                                                    setTimeout(() => {
                                                        generateFullWorkflow(node.id, results);
                                                    }, 500);
                                                } catch (error) {
                                                    console.error('分析错误:', error);
                                                    updateNodeSettings(node.id, {
                                                        isAnalyzing: false,
                                                        progress: 0,
                                                        error: error.message
                                                    });
                                                    alert(`分析失败: ${error.message}`);
                                                }
                                            }}
                                        >
                                            {node.settings?.isAnalyzing
                                                ? '分析中...'
                                                : node.settings?.lastAnalyzed ? '重新提取' : '提取角色和场景'}
                                        </button>
                                        {node.settings?.error && (
                                            <div className="mt-2 text-[10px] text-red-500">
                                                {node.settings.error}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {(node.type === 'character-description' || node.type === 'scene-description') && (
                                <div
                                    className={`relative w-full h-full flex flex-col transition-colors pointer-events-auto ${
                                        theme === 'dark'
                                            ? 'bg-zinc-900/80'
                                            : 'bg-zinc-100'
                                    }`}
                                >
                                    {(() => {
                                        const isCharacter = node.type === 'character-description';
                                        const title = isCharacter ? '角色描述' : '场景描述';
                                        const styles = [
                                            { value: 'none', label: '无' },
                                            { value: '2d-anime', label: '2D动漫' },
                                            { value: '3d-anime', label: '3D动漫' },
                                            { value: 'realistic', label: '写实' },
                                            { value: 'selfie', label: '自拍' },
                                            { value: 'news', label: '新闻' },
                                            { value: 'manga', label: '漫画' }
                                        ];

                                        // 默认提示词
                                        const defaultPrompt = isCharacter
                                            ? `动漫风格，全身视角，名叫${node.settings?.characterName || '{角色名}'}的${node.settings?.age || '25'}岁左右${node.settings?.gender || '年轻男人'}站在白色背景前，${node.settings?.description || '皮肤因长期处于室内而显得苍白，凌乱的黑色碎发遮住额头，眼神疲惫却透着一股锐利的机智，深灰色瞳孔，上身穿着一件原本华丽但此刻解开扣子、袖口卷起的白色金边军礼服外套，内搭一件普通的深灰色吸汗T恤，下身穿着沾染了少许机油污渍的白色笔挺军裤，脚穿厚重的黑色防滑军靴，身材精瘦结实，气质颓废中带着不羁'}，正在用中文普通话面向镜头做自我介绍，说着：我是${node.settings?.characterName || '{角色名}'}，${node.settings?.role || '这艘船的首席手动推进官，也就是个推杆子的苦力'}`
                                            : node.settings?.description || `极度奢华的星际战舰舰桥内部，空间广阔如同一座宫殿，四壁装饰着繁复的黄金浮雕与象牙立柱，地面铺着深红色的天鹅绒地毯，巨大的落地舷窗外是深邃星空，中央悬挂着水晶吊灯，操作台被伪装成古典家具的样子，整体色调金碧辉煌，氛围庄严却透着一种不切实际的荒谬感`;

                                        return (
                                            <>
                                                <div className={`flex items-center justify-between px-3 py-2 border-b text-xs font-semibold shrink-0 ${
                                                    theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'
                                                }`}>
                                                    <div className="flex items-center gap-1.5">
                                                        <FileText size={12} className={isCharacter ? "text-red-500" : "text-green-500"} />
                                                        <span>{title}</span>
                                                    </div>
                                                    {isCharacter && node.settings?.characterName && (
                                                        <div className="text-[10px] text-zinc-500">角色: {node.settings.characterName}</div>
                                                    )}
                                                </div>

                                                <div className="flex-1 flex flex-col gap-2 p-3 overflow-hidden min-h-0">
                                                    {/* 模式切换 - 角色和场景描述节点都显示 */}
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button
                                                            className={`px-2 py-1 rounded text-[10px] transition-colors ${
                                                                (node.settings?.mode || 'video') === 'video'
                                                                    ? 'bg-blue-500 text-white'
                                                                    : theme === 'dark'
                                                                        ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                                                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                                            }`}
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                            onClick={() => {
                                                                const newMode = 'video';
                                                                const currentPrompt = node.settings?.prompt || defaultPrompt;
                                                                if (isCharacter) {
                                                                    const newPrompt = currentPrompt.includes('360度')
                                                                        ? currentPrompt
                                                                        : currentPrompt + '，然后缓慢转一圈360度全方位展示身体';
                                                                    updateNodeSettings(node.id, { mode: newMode, prompt: newPrompt });
                                                                } else {
                                                                    updateNodeSettings(node.id, { mode: newMode });
                                                                }
                                                            }}
                                                        >
                                                            视频模式
                                                        </button>
                                                        <button
                                                            className={`px-2 py-1 rounded text-[10px] transition-colors ${
                                                                node.settings?.mode === 'image'
                                                                    ? 'bg-blue-500 text-white'
                                                                    : theme === 'dark'
                                                                        ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                                                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                                            }`}
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                            onClick={() => {
                                                                const newMode = 'image';
                                                                const currentPrompt = node.settings?.prompt || defaultPrompt;
                                                                if (isCharacter) {
                                                                    const newPrompt = currentPrompt.replace(/，然后缓慢转一圈360度全方位展示身体/g, '');
                                                                    updateNodeSettings(node.id, { mode: newMode, prompt: newPrompt });
                                                                } else {
                                                                    updateNodeSettings(node.id, { mode: newMode });
                                                                }
                                                            }}
                                                        >
                                                            图片模式
                                                        </button>
                                                    </div>

                                                    {/* 提示词输入区域 */}
                                                    <div className="flex-1 flex flex-col gap-1 min-h-0">
                                                        <div className="flex items-center justify-between shrink-0">
                                                            <span className="text-[10px] text-zinc-500">提示词</span>
                                                            <div className="flex items-center gap-2">
                                                                {!isCharacter && (
                                                                    <button
                                                                        className="text-[10px] text-purple-500 hover:text-purple-700"
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            const currentPrompt = node.settings?.prompt || defaultPrompt;
                                                                            if (!currentPrompt || currentPrompt.trim().length === 0) {
                                                                                alert('请先输入提示词');
                                                                                return;
                                                                            }

                                                                            // 获取大模型配置
                                                                            const chatModelForEnhance = node.settings?.chatModel || apiConfigs.find(c => c.type === 'Chat')?.id;
                                                                            if (!chatModelForEnhance) {
                                                                                alert('请先选择大模型');
                                                                                return;
                                                                            }

                                                                            const chatConfig = apiConfigs.find(c => c.id === chatModelForEnhance);
                                                                            if (!chatConfig) {
                                                                                alert('未找到大模型配置');
                                                                                return;
                                                                            }

                                                                            const apiKey = chatConfig.key || globalApiKey;
                                                                            if (!apiKey) {
                                                                                alert('请先配置API Key');
                                                                                setSettingsOpen(true);
                                                                                return;
                                                                            }

                                                                            updateNodeSettings(node.id, { isEnhancing: true });
                                                                            try {
                                                                                const baseUrl = (chatConfig.url || DEFAULT_BASE_URL).replace(/\/+$/, '');
                                                                                const response = await fetch(`${baseUrl}/v1/chat/completions`, {
                                                                                    method: 'POST',
                                                                                    headers: {
                                                                                        'Authorization': `Bearer ${apiKey}`,
                                                                                        'Content-Type': 'application/json'
                                                                                    },
                                                                                    body: JSON.stringify({
                                                                                        model: chatConfig.modelName || chatConfig.id || 'gpt-4o',
                                                                                        messages: [
                                                                                            {
                                                                                                role: 'system',
                                                                                                content: '你是一个场景描述增强专家。请根据用户提供的场景描述，增加更多细节，包括环境氛围、光线、材质、色彩、空间布局等，但必须确保不包含任何人物、角色、字符。输出应详细且生动，只包含场景特征描述。'
                                                                                            },
                                                                                            {
                                                                                                role: 'user',
                                                                                                content: currentPrompt
                                                                                            }
                                                                                        ],
                                                                                        temperature: 0.7
                                                                                    })
                                                                                });

                                                                                if (!response.ok) {
                                                                                    throw new Error('增强场景描述失败');
                                                                                }

                                                                                const data = await response.json();
                                                                                const enhanced = data.choices?.[0]?.message?.content?.trim() || currentPrompt;

                                                                                // 再次过滤，确保没有人物、字符
                                                                                const filtered = await filterScenePrompt(enhanced);

                                                                                updateNodeSettings(node.id, {
                                                                                    prompt: filtered,
                                                                                    filteredPrompt: filtered,
                                                                                    isEnhancing: false
                                                                                });
                                                                            } catch (error) {
                                                                                console.error('增强场景描述失败:', error);
                                                                                updateNodeSettings(node.id, { isEnhancing: false });
                                                                                alert('增强场景描述失败，请重试');
                                                                            }
                                                                        }}
                                                                        onMouseDown={(e) => e.stopPropagation()}
                                                                        disabled={node.settings?.isEnhancing}
                                                                    >
                                                                        {node.settings?.isEnhancing ? '增强中...' : '增强场景描述'}
                                                                    </button>
                                                                )}
                                                                {isCharacter ? (
                                                                    <button
                                                                        className="text-[10px] text-blue-500 hover:text-blue-700"
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            const currentPrompt = node.settings?.prompt || defaultPrompt;
                                                                            if (!currentPrompt || currentPrompt.trim().length === 0) {
                                                                                alert('请先输入提示词');
                                                                                return;
                                                                            }
                                                                            updateNodeSettings(node.id, { isFiltering: true });
                                                                            try {
                                                                                const filtered = await filterCharacterPrompt(currentPrompt);
                                                                                updateNodeSettings(node.id, {
                                                                                    prompt: filtered,
                                                                                    filteredPrompt: filtered,
                                                                                    isFiltering: false
                                                                                });
                                                                            } catch (error) {
                                                                                console.error('过滤提示词失败:', error);
                                                                                updateNodeSettings(node.id, { isFiltering: false });
                                                                                alert('过滤提示词失败，请重试');
                                                                            }
                                                                        }}
                                                                        onMouseDown={(e) => e.stopPropagation()}
                                                                        disabled={node.settings?.isFiltering}
                                                                    >
                                                                        {node.settings?.isFiltering ? '过滤中...' : '过滤提示词'}
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        className="text-[10px] text-blue-500 hover:text-blue-700"
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            const currentPrompt = node.settings?.prompt || defaultPrompt;
                                                                            if (!currentPrompt || currentPrompt.trim().length === 0) {
                                                                                alert('请先输入提示词');
                                                                                return;
                                                                            }
                                                                            updateNodeSettings(node.id, { isFiltering: true });
                                                                            try {
                                                                                const filtered = await filterScenePrompt(currentPrompt);
                                                                                updateNodeSettings(node.id, {
                                                                                    prompt: filtered,
                                                                                    filteredPrompt: filtered,
                                                                                    isFiltering: false
                                                                                });
                                                                            } catch (error) {
                                                                                console.error('过滤提示词失败:', error);
                                                                                updateNodeSettings(node.id, { isFiltering: false });
                                                                                alert('过滤提示词失败，请重试');
                                                                            }
                                                                        }}
                                                                        onMouseDown={(e) => e.stopPropagation()}
                                                                        disabled={node.settings?.isFiltering}
                                                                    >
                                                                        {node.settings?.isFiltering ? '过滤中...' : '过滤提示词'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <textarea
                                                            value={node.settings?.prompt || defaultPrompt}
                                                            onChange={(e) => updateNodeSettings(node.id, { prompt: e.target.value })}
                                                            placeholder={`输入${isCharacter ? '角色' : '场景'}描述...`}
                                                            className={`w-full flex-1 resize-none outline-none text-sm p-2 rounded border ${
                                                                theme === 'dark'
                                                                    ? 'bg-zinc-800 border-zinc-700 text-zinc-200 placeholder-zinc-500'
                                                                    : 'bg-white border-zinc-300 text-zinc-800 placeholder-zinc-400'
                                                            }`}
                                                            style={{
                                                                minHeight: '100px',
                                                                maxHeight: '200px',
                                                                overflowY: 'auto',
                                                                resize: 'vertical'
                                                            }}
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                        />
                                                    </div>

                                                    {/* 大模型选择 - 用于增强场景描述和过滤提示词 */}
                                                    {!isCharacter && (
                                                        <div className="shrink-0">
                                                            <label className="text-[10px] block mb-1 text-zinc-500">大模型选择（用于增强场景描述和过滤提示词）</label>
                                                            <select
                                                                value={node.settings?.chatModel || ''}
                                                                onChange={(e) => updateNodeSettings(node.id, { chatModel: e.target.value })}
                                                                className={`w-full text-[10px] px-2 py-1 rounded border ${
                                                                    theme === 'dark'
                                                                        ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                                                                        : 'bg-white border-zinc-300 text-zinc-800'
                                                                }`}
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                            >
                                                                <option value="">选择大模型（可选）</option>
                                                                {apiConfigs
                                                                    .filter(c => c.type === 'Chat')
                                                                    .map(c => (
                                                                        <option key={c.id} value={c.id}>{c.provider}</option>
                                                                    ))}
                                                            </select>
                                                        </div>
                                                    )}

                                                    {/* 模式特定设置 */}
                                                    {(node.settings?.mode || 'video') === 'video' ? (
                                                        <div className="flex flex-col gap-2 shrink-0">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] text-zinc-500">时长</span>
                                                                    <button
                                                                        className={`px-2 py-1 rounded text-[10px] transition-colors ${
                                                                            node.settings?.duration === '10s'
                                                                                ? 'bg-blue-500 text-white'
                                                                                : theme === 'dark'
                                                                                    ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                                                                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                                                        }`}
                                                                        onMouseDown={(e) => e.stopPropagation()}
                                                                        onClick={() => updateNodeSettings(node.id, { duration: '10s' })}
                                                                    >
                                                                        10s
                                                                    </button>
                                                                    <button
                                                                        className={`px-2 py-1 rounded text-[10px] transition-colors ${
                                                                            node.settings?.duration === '15s'
                                                                                ? 'bg-blue-500 text-white'
                                                                                : theme === 'dark'
                                                                                    ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                                                                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                                                        }`}
                                                                        onMouseDown={(e) => e.stopPropagation()}
                                                                        onClick={() => updateNodeSettings(node.id, { duration: '15s' })}
                                                                    >
                                                                        15s
                                                                    </button>
                                                                </div>

                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] text-zinc-500">风格</span>
                                                                    <select
                                                                        value={node.settings?.style || 'none'}
                                                                        onChange={(e) => {
                                                                            const newStyle = e.target.value;
                                                                            const stylePrefix = getStylePrefix(newStyle);
                                                                            const currentPrompt = node.settings?.prompt || defaultPrompt;
                                                                            // 更新风格并自动更新提示词前缀
                                                                            const updatedPrompt = currentPrompt.replace(/^[^，]+，/, `${stylePrefix}，`);
                                                                            updateNodeSettings(node.id, { style: newStyle, prompt: updatedPrompt });
                                                                        }}
                                                                        className={`text-[10px] px-2 py-1 rounded border ${
                                                                            theme === 'dark'
                                                                                ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                                                                                : 'bg-white border-zinc-300 text-zinc-800'
                                                                        }`}
                                                                        onMouseDown={(e) => e.stopPropagation()}
                                                                    >
                                                                        {styles.map(style => (
                                                                            <option key={style.value} value={style.value}>{style.label}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            </div>

                                                            {/* 视频模式下也显示图片生成设置（仅场景描述） */}
                                                            {!isCharacter && (
                                                                <div className="flex flex-col gap-2 border-t pt-2 mt-2">
                                                                    <div className="text-[10px] text-zinc-500 mb-1">图片生成设置</div>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex-1">
                                                                            <span className="text-[10px] block mb-1 text-zinc-500">模型</span>
                                                                            <select
                                                                                value={node.settings?.imageModel || ''}
                                                                                onChange={(e) => updateNodeSettings(node.id, { imageModel: e.target.value })}
                                                                                className={`w-full text-[10px] px-2 py-1 rounded border ${
                                                                                    theme === 'dark'
                                                                                        ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                                                                                        : 'bg-white border-zinc-300 text-zinc-800'
                                                                                }`}
                                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                            >
                                                                                <option value="">选择模型</option>
                                                                                {apiConfigs
                                                                                    .filter(c => c.type === 'Image')
                                                                                    .map(c => (
                                                                                        <option key={c.id} value={c.id}>{c.provider}</option>
                                                                                    ))}
                                                                            </select>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex-1">
                                                                            <span className="text-[10px] block mb-1 text-zinc-500">比例</span>
                                                                            <select
                                                                                value={node.settings?.imageRatio || '16:9'}
                                                                                onChange={(e) => updateNodeSettings(node.id, { imageRatio: e.target.value })}
                                                                                className={`w-full text-[10px] px-2 py-1 rounded border ${
                                                                                    theme === 'dark'
                                                                                        ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                                                                                        : 'bg-white border-zinc-300 text-zinc-800'
                                                                                }`}
                                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                            >
                                                                                <option value="auto">Auto</option>
                                                                                <option value="1:1">1:1</option>
                                                                                <option value="16:9">16:9</option>
                                                                                <option value="9:16">9:16</option>
                                                                                <option value="4:3">4:3</option>
                                                                                <option value="3:4">3:4</option>
                                                                                <option value="21:9">21:9</option>
                                                                                <option value="3:2">3:2</option>
                                                                                <option value="2:3">2:3</option>
                                                                            </select>
                                                                        </div>

                                                                        <div className="flex-1">
                                                                            <span className="text-[10px] block mb-1 text-zinc-500">分辨率</span>
                                                                            <select
                                                                                value={node.settings?.imageResolution || '2k'}
                                                                                onChange={(e) => updateNodeSettings(node.id, { imageResolution: e.target.value })}
                                                                                className={`w-full text-[10px] px-2 py-1 rounded border ${
                                                                                    theme === 'dark'
                                                                                        ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                                                                                        : 'bg-white border-zinc-300 text-zinc-800'
                                                                                }`}
                                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                            >
                                                                                <option value="2k">2K</option>
                                                                                <option value="4k">4K</option>
                                                                            </select>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col gap-2 shrink-0">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex-1">
                                                                    <span className="text-[10px] block mb-1 text-zinc-500">模型</span>
                                                                    <select
                                                                        value={node.settings?.imageModel || ''}
                                                                        onChange={(e) => updateNodeSettings(node.id, { imageModel: e.target.value })}
                                                                        className={`w-full text-[10px] px-2 py-1 rounded border ${
                                                                            theme === 'dark'
                                                                                ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                                                                                : 'bg-white border-zinc-300 text-zinc-800'
                                                                        }`}
                                                                        onMouseDown={(e) => e.stopPropagation()}
                                                                    >
                                                                        <option value="">选择模型</option>
                                                                        {apiConfigs
                                                                            .filter(c => c.type === 'Image')
                                                                            .map(c => (
                                                                                <option key={c.id} value={c.id}>{c.provider}</option>
                                                                            ))}
                                                                    </select>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                <div className="flex-1">
                                                                    <span className="text-[10px] block mb-1 text-zinc-500">比例</span>
                                                                    <select
                                                                        value={node.settings?.imageRatio || '16:9'}
                                                                        onChange={(e) => updateNodeSettings(node.id, { imageRatio: e.target.value })}
                                                                        className={`w-full text-[10px] px-2 py-1 rounded border ${
                                                                            theme === 'dark'
                                                                                ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                                                                                : 'bg-white border-zinc-300 text-zinc-800'
                                                                        }`}
                                                                        onMouseDown={(e) => e.stopPropagation()}
                                                                    >
                                                                        <option value="auto">Auto</option>
                                                                        <option value="1:1">1:1</option>
                                                                        <option value="16:9">16:9</option>
                                                                        <option value="9:16">9:16</option>
                                                                        <option value="4:3">4:3</option>
                                                                        <option value="3:4">3:4</option>
                                                                        <option value="21:9">21:9</option>
                                                                        <option value="3:2">3:2</option>
                                                                        <option value="2:3">2:3</option>
                                                                    </select>
                                                                </div>

                                                                <div className="flex-1">
                                                                    <span className="text-[10px] block mb-1 text-zinc-500">分辨率</span>
                                                                    <select
                                                                        value={node.settings?.imageResolution || '2k'}
                                                                        onChange={(e) => updateNodeSettings(node.id, { imageResolution: e.target.value })}
                                                                        className={`w-full text-[10px] px-2 py-1 rounded border ${
                                                                            theme === 'dark'
                                                                                ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                                                                                : 'bg-white border-zinc-300 text-zinc-800'
                                                                        }`}
                                                                        onMouseDown={(e) => e.stopPropagation()}
                                                                    >
                                                                        <option value="2k">2K</option>
                                                                        <option value="4k">4K</option>
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 参考图区域 */}
                                                    <div className="mt-2 shrink-0">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-[10px] text-zinc-500">参考图</span>
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    className="text-[10px] text-blue-500 hover:text-blue-700"
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        document.getElementById(`ref-upload-${node.id}`)?.click();
                                                                    }}
                                                                    onMouseDown={(e) => e.stopPropagation()}
                                                                >
                                                                    + 添加参考图
                                                                </button>
                                                                <input
                                                                    id={`ref-upload-${node.id}`}
                                                                    type="file"
                                                                    multiple
                                                                    accept="image/*"
                                                                    className="hidden"
                                                                    onChange={(e) => {
                                                                        const files = Array.from(e.target.files || []);
                                                                        if (files.length === 0) return;

                                                                        const currentImages = node.settings?.referenceImages || [];
                                                                        const newImages = [];

                                                                        files.slice(0, 4 - currentImages.length).forEach(file => {
                                                                            if (file.type.startsWith('image/')) {
                                                                                const reader = new FileReader();
                                                                                reader.onload = (ev) => {
                                                                                    newImages.push(ev.target.result);
                                                                                    if (newImages.length === files.slice(0, 4 - currentImages.length).length) {
                                                                                        const updatedImages = [...currentImages, ...newImages];
                                                                                        updateNodeSettings(node.id, { referenceImages: updatedImages });
                                                                                    }
                                                                                };
                                                                                reader.readAsDataURL(file);
                                                                            }
                                                                        });
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div
                                                        tabIndex={0}
                                                        className={`h-20 border rounded overflow-hidden flex items-center justify-center outline-none ${
                                                            theme === 'dark' ? 'border-zinc-700' : 'border-zinc-300'
                                                        }`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // 让该区域获得焦点，以便 Ctrl+V 能触发 onPaste
                                                            e.currentTarget.focus();
                                                        }}
                                                        onPaste={(e) => {
                                                            // 只在参考图区域处理粘贴，避免被全局 paste 逻辑抢走
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            const items = Array.from(e.clipboardData?.items || []);
                                                            const imageItems = items.filter(it => it.type && it.type.startsWith('image/'));
                                                            if (imageItems.length === 0) return;

                                                            const currentImages = node.settings?.referenceImages || [];
                                                            const remaining = Math.max(0, 4 - currentImages.length);
                                                            const toAdd = imageItems.slice(0, remaining);
                                                            if (toAdd.length === 0) return;

                                                            const newImages = [];
                                                            toAdd.forEach((item) => {
                                                                const file = item.getAsFile();
                                                                if (!file) return;
                                                                const reader = new FileReader();
                                                                reader.onload = (ev) => {
                                                                    newImages.push(ev.target.result);
                                                                    if (newImages.length === toAdd.length) {
                                                                        updateNodeSettings(node.id, { referenceImages: [...currentImages, ...newImages] });
                                                                    }
                                                                };
                                                                reader.readAsDataURL(file);
                                                            });
                                                        }}
                                                        onDragOver={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                        }}
                                                        onDrop={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            const files = Array.from(e.dataTransfer.files || []);
                                                            if (files.length === 0) return;

                                                            const currentImages = node.settings?.referenceImages || [];
                                                            const newImages = [];

                                                            files.slice(0, 4 - currentImages.length).forEach(file => {
                                                                if (file.type.startsWith('image/')) {
                                                                    const reader = new FileReader();
                                                                    reader.onload = (ev) => {
                                                                        newImages.push(ev.target.result);
                                                                        if (newImages.length === files.slice(0, 4 - currentImages.length).length) {
                                                                            const updatedImages = [...currentImages, ...newImages];
                                                                            updateNodeSettings(node.id, { referenceImages: updatedImages });
                                                                        }
                                                                    };
                                                                    reader.readAsDataURL(file);
                                                                }
                                                            });
                                                        }}
                                                        >
                                                            {(() => {
                                                                const referenceImages = node.settings?.referenceImages || [];
                                                                const hasReferenceImage = referenceImages.length > 0;

                                                                return hasReferenceImage ? (
                                                                    <div className="flex gap-1 overflow-x-auto w-full h-full p-1">
                                                                        {referenceImages.map((src, idx) => (
                                                                            <div key={idx} className="relative w-16 h-16 flex-shrink-0">
                                                                                <img
                                                                                    src={src}
                                                                                    alt={`Reference ${idx + 1}`}
                                                                                    className="w-full h-full object-cover rounded"
                                                                                    onMouseDown={(e) => e.stopPropagation()}
                                                                                />
                                                                                <button
                                                                                    className="absolute top-0 right-0 bg-red-500 text-white text-[10px] p-0.5 rounded-bl"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        const newImages = referenceImages.filter((_, i) => i !== idx);
                                                                                        updateNodeSettings(node.id, { referenceImages: newImages });
                                                                                    }}
                                                                                    onMouseDown={(e) => e.stopPropagation()}
                                                                                >
                                                                                    ×
                                                                                </button>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-center w-full">
                                                                        <span className={`text-xs ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                                                            拖放图片到此处、点击添加，或 Ctrl+V 粘贴
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="px-3 py-2 border-t shrink-0 flex flex-col gap-2">
                                                    {/* 根据模式显示不同的按钮 */}
                                                    {(node.settings?.mode || 'video') === 'image' ? (
                                                        <button
                                                            className={`w-full py-2 rounded text-xs font-medium transition-colors ${
                                                                theme === 'dark'
                                                                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                                                                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                                                            }`}
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                if (!node.settings?.prompt || node.settings.prompt.trim().length === 0) {
                                                                    alert('请先输入描述');
                                                                    return;
                                                                }

                                                                // 创建生成图片节点
                                                                const worldX = node.x + node.width + 100;
                                                                const worldY = node.y + node.height / 2;
                                                                const imageNodeId = `node-${Date.now()}`;
                                                                const imageNode = {
                                                                    id: imageNodeId,
                                                                    type: isCharacter ? 'generate-character-image' : 'generate-scene-image',
                                                                    x: worldX - 200,
                                                                    y: worldY - 200,
                                                                    width: 400,
                                                                    height: 450,
                                                                    settings: {
                                                                        model: node.settings?.imageModel || apiConfigs.find(c => c.type === 'Image')?.id || '',
                                                                        prompt: node.settings?.filteredPrompt || node.settings?.prompt,
                                                                        chatModel: node.settings?.chatModel, // 传递大模型选择
                                                                        ratio: node.settings?.imageRatio || '16:9',
                                                                        resolution: node.settings?.imageResolution || '2k',
                                                                        referenceImages: node.settings?.referenceImages || [],
                                                                        sourceType: node.type,
                                                                        sourceId: node.id
                                                                    }
                                                                };
                                                                setNodes(prev => [...prev, imageNode]);

                                                                // 创建连接
                                                                setConnections(prev => [...prev, {
                                                                    id: `conn-${Date.now()}`,
                                                                    from: node.id,
                                                                    to: imageNodeId
                                                                }]);
                                                            }}
                                                        >
                                                            {isCharacter ? '生成角色图片' : '生成场景图片'}
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button
                                                                className={`w-full py-2 rounded text-xs font-medium transition-colors ${
                                                                    theme === 'dark'
                                                                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white'
                                                                        : 'bg-green-600 hover:bg-green-500 text-white'
                                                                }`}
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    if (!node.settings?.prompt || node.settings.prompt.trim().length === 0) {
                                                                        alert('请先输入描述');
                                                                        return;
                                                                    }

                                                                    // 创建生成视频节点
                                                                    const worldX = node.x + node.width + 100;
                                                                    const worldY = node.y + node.height / 2;
                                                                    const videoNodeId = `node-${Date.now()}`;
                                                                    const videoNode = {
                                                                        id: videoNodeId,
                                                                        type: isCharacter ? 'generate-character-video' : 'generate-scene-video',
                                                                        x: worldX - 200,
                                                                        y: worldY - 200,
                                                                        width: 400,
                                                                        height: 450,
                                                                        settings: {
                                                                            model: 'sora-2',
                                                                            duration: node.settings?.duration || '15s',
                                                                            ratio: '16:9',
                                                                            videoPrompt: node.settings?.filteredPrompt || node.settings?.prompt || '',
                                                                            referenceImages: node.settings?.referenceImages || [],
                                                                            sourceType: node.type,
                                                                            sourceId: node.id
                                                                        }
                                                                    };
                                                                    setNodes(prev => [...prev, videoNode]);

                                                                    // 创建连接
                                                                    setConnections(prev => [...prev, {
                                                                        id: `conn-${Date.now()}`,
                                                                        from: node.id,
                                                                        to: videoNodeId
                                                                    }]);
                                                                }}
                                                            >
                                                                生成视频
                                                            </button>
                                                            {/* 视频模式下也显示生成图片按钮（仅场景描述） */}
                                                            {!isCharacter && (
                                                                <button
                                                                    className={`w-full py-2 rounded text-xs font-medium transition-colors ${
                                                                        theme === 'dark'
                                                                            ? 'bg-blue-600 hover:bg-blue-500 text-white'
                                                                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                                                                    }`}
                                                                    onMouseDown={(e) => e.stopPropagation()}
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        if (!node.settings?.prompt || node.settings.prompt.trim().length === 0) {
                                                                            alert('请先输入描述');
                                                                            return;
                                                                        }

                                                                        // 创建生成图片节点
                                                                        const worldX = node.x + node.width + 100;
                                                                        const worldY = node.y + node.height / 2;
                                                                        const imageNodeId = `node-${Date.now()}`;
                                                                        const imageNode = {
                                                                            id: imageNodeId,
                                                                            type: 'generate-scene-image',
                                                                            x: worldX - 200,
                                                                            y: worldY - 200,
                                                                            width: 400,
                                                                            height: 450,
                                                                            settings: {
                                                                                model: node.settings?.imageModel || apiConfigs.find(c => c.type === 'Image')?.id || '',
                                                                                prompt: node.settings?.filteredPrompt || node.settings?.prompt,
                                                                                chatModel: node.settings?.chatModel, // 传递大模型选择
                                                                                ratio: node.settings?.imageRatio || '16:9',
                                                                                resolution: node.settings?.imageResolution || '2k',
                                                                                referenceImages: node.settings?.referenceImages || [],
                                                                                sourceType: node.type,
                                                                                sourceId: node.id
                                                                            }
                                                                        };
                                                                        setNodes(prev => [...prev, imageNode]);

                                                                        // 创建连接
                                                                        setConnections(prev => [...prev, {
                                                                            id: `conn-${Date.now()}`,
                                                                            from: node.id,
                                                                            to: imageNodeId
                                                                        }]);
                                                                    }}
                                                                >
                                                                    生成场景图片
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}

                            {(node.type === 'create-character' || node.type === 'create-scene') && (
                                <div
                                    className={`relative w-full h-full flex flex-col transition-colors pointer-events-auto ${
                                        theme === 'dark'
                                            ? 'bg-zinc-900/80'
                                            : 'bg-zinc-100'
                                    }`}
                                >
                                    {(() => {
                                        const isCharacter = node.type === 'create-character';
                                        const title = isCharacter ? '创建角色' : '创建场景';

                                        // 解析旧数据：早期 create-scene 使用 timeRange（例如 "1,3"）
                                        const parseTimeRangeToSeconds = (tr) => {
                                            if (!tr) return null;
                                            try {
                                                const cleaned = String(tr)
                                                    .trim()
                                                    .replace(/[，\s]+/g, ',')
                                                    .replace(/[~\-–—]+/g, ',');
                                                const parts = cleaned.split(',').map(s => s.trim()).filter(Boolean);
                                                if (parts.length < 2) return null;
                                                const start = parseFloat(parts[0]);
                                                const end = parseFloat(parts[1]);
                                                if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
                                                return { start, end };
                                            } catch (e) {
                                                return null;
                                            }
                                        };
                                        const parsedRange = !isCharacter ? parseTimeRangeToSeconds(node.settings?.timeRange) : null;
                                        const uiStartSecond = node.settings?.startSecond ?? parsedRange?.start ?? 1;
                                        const uiEndSecond = node.settings?.endSecond ?? parsedRange?.end ?? 3;

                                        return (
                                            <>
                                                <div className={`flex items-center gap-1.5 px-3 py-2 border-b text-xs font-semibold shrink-0 ${
                                                    theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'
                                                }`}>
                                                    <User size={12} className={isCharacter ? "text-blue-500" : "text-green-500"} />
                                                    <span>{title}</span>
                                                </div>

                                                <div className="flex-1 flex flex-col gap-3 p-3 overflow-y-auto min-h-0">
                                                    <div>
                                                        <label className="text-[10px] block mb-1 text-zinc-500">
                                                            {isCharacter ? '角色名称' : '场景名称'}
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={node.settings?.name || ''}
                                                            onChange={(e) => updateNodeSettings(node.id, { name: e.target.value })}
                                                            className={`w-full px-2 py-1 rounded text-xs border ${
                                                                theme === 'dark'
                                                                    ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                                                                    : 'bg-white border-zinc-300 text-zinc-800'
                                                            }`}
                                                            placeholder={isCharacter ? "输入角色名称..." : "输入场景名称..."}
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="text-[10px] block mb-1 text-zinc-500">
                                                            时间范围（秒，间隔需在 1-3 秒之间）
                                                        </label>
                                                        <div className="flex gap-2 items-center flex-wrap">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="0.1"
                                                                value={uiStartSecond}
                                                                onChange={(e) => updateNodeSettings(node.id, { startSecond: parseFloat(e.target.value) || 0 })}
                                                                className={`w-20 px-2 py-1 rounded text-xs border ${
                                                                    theme === 'dark'
                                                                        ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                                                                        : 'bg-white border-zinc-300 text-zinc-800'
                                                                }`}
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                            />
                                                            <span className={`text-xs ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>到</span>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="0.1"
                                                                value={uiEndSecond}
                                                                onChange={(e) => updateNodeSettings(node.id, { endSecond: parseFloat(e.target.value) || 0 })}
                                                                className={`w-20 px-2 py-1 rounded text-xs border ${
                                                                    theme === 'dark'
                                                                        ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                                                                        : 'bg-white border-zinc-300 text-zinc-800'
                                                                }`}
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                            />
                                                            <span className={`text-xs ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                                                秒（间隔: {(uiEndSecond - uiStartSecond).toFixed(1)}s）
                                                            </span>
                                                            {!isCharacter && (
                                                                <span className={`text-[10px] ${theme === 'dark' ? 'text-zinc-600' : 'text-zinc-500'}`}>
                                                                    （旧版时间截: {node.settings?.timeRange || '无'}）
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 进度条显示 */}
                                                {node.settings?.isCreating && (
                                                    <div className="px-3 py-2 border-t shrink-0">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="flex-1">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="text-[10px] text-zinc-500">{title}中...</span>
                                                                    <span className="text-[10px] text-zinc-500">{node.settings?.createProgress || 0}%</span>
                                                                </div>
                                                                <div className={`w-full h-1.5 rounded-full overflow-hidden ${
                                                                    theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'
                                                                }`}>
                                                                    <div
                                                                        className="h-full bg-blue-500 transition-all duration-300"
                                                                        style={{ width: `${node.settings?.createProgress || 0}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {node.settings?.createError && (
                                                            <div className="text-[10px] text-red-500 mt-1">
                                                                {node.settings.createError}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="px-3 py-2 border-t shrink-0">
                                                    <button
                                                        className={`w-full py-2 rounded text-xs font-medium transition-colors ${
                                                            (node.settings?.isCreating)
                                                                ? 'bg-zinc-400 cursor-not-allowed text-white'
                                                                : theme === 'dark'
                                                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'
                                                                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                                                        }`}
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        type="button"
                                                        disabled={node.settings?.isCreating}
                                                        onClick={async () => {
                                                            const name = node.settings?.name || '';

                                                            if (!name || name.trim().length === 0) {
                                                                alert(`请填写${isCharacter ? '角色' : '场景'}名称`);
                                                                return;
                                                            }

                                                            // 如果是角色，使用Sora角色库API创建（完全复用Sora角色库逻辑）
                                                            if (isCharacter) {
                                                                const startSecond = uiStartSecond ?? 1;
                                                                const endSecond = uiEndSecond ?? 3;

                                                                // 验证时间范围
                                                                if (endSecond - startSecond < 1 || endSecond - startSecond > 3) {
                                                                    alert('时间范围必须在 1-3 秒之间');
                                                                    return;
                                                                }

                                                                // 获取关联的视频节点
                                                                const videoNode = connections
                                                                    .filter(c => c.to === node.id)
                                                                    .map(c => nodesMap.get(c.from))
                                                                    .find(n => n?.type === 'generate-character-video');

                                                                if (!videoNode) {
                                                                    alert('找不到关联的视频节点');
                                                                    return;
                                                                }

                                                                const videoUrl = videoNode.settings?.videoUrl || videoNode.content || '';
                                                                if (!videoUrl) {
                                                                    alert('视频节点没有视频URL');
                                                                    return;
                                                                }

                                                                // 从历史记录中查找是否有对应的 taskId（优先使用 from_task）
                                                                let fromTaskId = null;
                                                                const historyItem = history.find(h =>
                                                                    h.type === 'video' &&
                                                                    h.sourceNodeId === videoNode.id &&
                                                                    h.status === 'completed' &&
                                                                    h.remoteTaskId
                                                                );
                                                                if (historyItem && historyItem.remoteTaskId) {
                                                                    fromTaskId = historyItem.remoteTaskId;
                                                                    console.log('[Create Character Node] Found taskId from history:', fromTaskId);
                                                                }

                                                                // 设置创建状态
                                                                updateNodeSettings(node.id, {
                                                                    isCreating: true,
                                                                    createProgress: 10,
                                                                    createError: null
                                                                });

                                                                // 使用与Sora角色库完全相同的逻辑
                                                                try {
                                                                    // 1. 获取配置
                                                                    const soraConfig = apiConfigs.find(c => c.type === 'Video' && (c.id === 'sora-2' || c.id === 'sora-2-pro'));
                                                                    if (!soraConfig) {
                                                                        updateNodeSettings(node.id, { isCreating: false, createError: '未找到 Sora 2 模型配置' });
                                                                        alert('未找到 Sora 2 模型配置，请先在设置中配置 Sora 2 或 Sora 2 Pro');
                                                                        return;
                                                                    }

                                                                    const apiKey = soraConfig.key || globalApiKey;
                                                                    if (!apiKey) {
                                                                        updateNodeSettings(node.id, { isCreating: false, createError: '请先配置 API Key' });
                                                                        alert('请先配置 API Key');
                                                                        setSettingsOpen(true);
                                                                        return;
                                                                    }

                                                                    // 更新进度
                                                                    updateNodeSettings(node.id, { createProgress: 30 });

                                                                    // 2. 自动构造 endpoint
                                                                    const baseUrl = (soraConfig.url || DEFAULT_BASE_URL).replace(/\/+$/, '');
                                                                    const endpoint = `${baseUrl}/sora/v1/characters`;

                                                                    // 3. 构造 Body（优先使用 from_task，否则使用 url）
                                                                    const timestamps = `${startSecond},${endSecond}`;
                                                                    const payload = fromTaskId
                                                                        ? { from_task: fromTaskId, timestamps }
                                                                        : { url: videoUrl, timestamps };

                                                                    // 更新进度
                                                                    updateNodeSettings(node.id, { createProgress: 50 });

                                                                    // 4. 详细调试日志
                                                                    console.log('[Create Character Node] Request Details:', {
                                                                        endpoint,
                                                                        apiKey: apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : 'EMPTY',
                                                                        payload,
                                                                        fromTaskId,
                                                                        videoUrl: fromTaskId ? 'N/A (using from_task)' : videoUrl
                                                                    });

                                                                    // 更新进度
                                                                    updateNodeSettings(node.id, { createProgress: 70 });

                                                                    // 5. 发送请求
                                                                    const resp = await fetch(endpoint, {
                                                                        method: 'POST',
                                                                        headers: {
                                                                            'Authorization': `Bearer ${apiKey}`,
                                                                            'Content-Type': 'application/json'
                                                                        },
                                                                        body: JSON.stringify(payload)
                                                                    });

                                                                    // 更新进度
                                                                    updateNodeSettings(node.id, { createProgress: 90 });

                                                                    // 6. 错误处理
                                                                    if (!resp.ok) {
                                                                        const errText = await resp.text();
                                                                        console.error('[Create Character Node] API Error:', {
                                                                            status: resp.status,
                                                                            statusText: resp.statusText,
                                                                            errorText: errText,
                                                                            endpoint
                                                                        });

                                                                        // 尝试解析错误响应
                                                                        let errorData = null;
                                                                        try {
                                                                            errorData = JSON.parse(errText);
                                                                        } catch (e) {
                                                                            // 如果不是 JSON，使用原始文本
                                                                        }

                                                                        // 特殊处理 500 错误和 get_origin_task_failed
                                                                        if (resp.status === 500 || (errorData && (errorData.code === 'get_origin_task_failed' || errorData.message?.includes('get_origin_task_failed')))) {
                                                                            throw new Error('TASK_NOT_FOUND');
                                                                        }

                                                                        throw new Error(`API错误 (${resp.status}): ${errText || resp.statusText}`);
                                                                    }

                                                                    const data = await resp.json();
                                                                    console.log('[Create Character Node] Success:', data);

                                                                    // 更新进度
                                                                    updateNodeSettings(node.id, { createProgress: 100 });

                                                                    // 7. 保存到角色库（与Sora角色库完全一致）
                                                                    if (data.id && data.username) {
                                                                        const newCharacter = {
                                                                            id: data.id,
                                                                            username: data.username,
                                                                            profile_picture_url: data.profile_picture_url || '',
                                                                            permalink: data.permalink || ''
                                                                        };

                                                                        const updated = [...characterLibrary, newCharacter];
                                                                        setCharacterLibrary(updated);

                                                                        // 保存到 localStorage
                                                                        try {
                                                                            localStorage.setItem('tapnow_characters', JSON.stringify(updated));
                                                                        } catch (err) {
                                                                            console.error('保存角色库失败:', err);
                                                                        }

                                                                        // 延迟一下再清除状态，让用户看到成功
                                                                        setTimeout(() => {
                                                                            updateNodeSettings(node.id, {
                                                                                isCreating: false,
                                                                                createProgress: 0,
                                                                                createError: null
                                                                            });
                                                                            alert(`角色 "${data.username}" 创建成功！`);
                                                                        }, 500);
                                                                    } else {
                                                                        throw new Error('返回数据缺少 id 或 username');
                                                                    }
                                                                } catch (err) {
                                                                    console.error('[Create Character Node] Failed:', err);
                                                                    let msg = err.message;

                                                                    // 特殊处理：原任务已过期或无法访问
                                                                    if (msg === 'TASK_NOT_FOUND') {
                                                                        updateNodeSettings(node.id, {
                                                                            isCreating: false,
                                                                            createProgress: 0,
                                                                            createError: '原任务已过期或无法访问'
                                                                        });
                                                                        alert('创建失败：原任务已过期或无法访问。\n\n请尝试获取该视频的下载链接，使用"输入视频 URL"方式重新创建。');
                                                                        return;
                                                                    }

                                                                    // 处理网络错误
                                                                    if (msg.includes('Failed to fetch') || err.name === 'TypeError' || err.message.includes('NetworkError')) {
                                                                        msg = '连接失败。可能原因：\n\n1. API 地址填写错误\n   - 请检查 API 接口地址是否多余了 "/sora" 前缀\n   - 有些服务商的路径可能不同，请询问服务商 Sora 角色创建接口的准确路径\n\n2. 跨域限制 (CORS)\n   - 请尝试安装 Allow CORS 浏览器插件\n\n3. 网络问题\n   - 请检查网络连接';
                                                                    }

                                                                    updateNodeSettings(node.id, {
                                                                        isCreating: false,
                                                                        createProgress: 0,
                                                                        createError: msg
                                                                    });
                                                                    alert(`创建角色失败: ${msg}`);
                                                                }
                                                            } else {
                                                                const startSecond = uiStartSecond ?? 1;
                                                                const endSecond = uiEndSecond ?? 3;

                                                                // 验证时间范围
                                                                if (endSecond - startSecond < 1 || endSecond - startSecond > 3) {
                                                                    alert('时间范围必须在 1-3 秒之间');
                                                                    return;
                                                                }

                                                                // 获取关联的视频节点
                                                                const videoNode = connections
                                                                    .filter(c => c.to === node.id)
                                                                    .map(c => nodesMap.get(c.from))
                                                                    .find(n => n?.type === 'generate-scene-video');

                                                                if (!videoNode) {
                                                                    alert('找不到关联的视频节点');
                                                                    return;
                                                                }

                                                                const videoUrl = videoNode.settings?.videoUrl || videoNode.content || '';
                                                                if (!videoUrl) {
                                                                    alert('视频节点没有视频URL');
                                                                    return;
                                                                }

                                                                // 从历史记录中查找是否有对应的 taskId（优先使用 from_task）
                                                                let fromTaskId = null;
                                                                const historyItem = history.find(h =>
                                                                    h.type === 'video' &&
                                                                    h.sourceNodeId === videoNode.id &&
                                                                    h.status === 'completed' &&
                                                                    h.remoteTaskId
                                                                );
                                                                if (historyItem && historyItem.remoteTaskId) {
                                                                    fromTaskId = historyItem.remoteTaskId;
                                                                    console.log('[Create Scene Node] Found taskId from history:', fromTaskId);
                                                                }

                                                                // 设置创建状态
                                                                updateNodeSettings(node.id, {
                                                                    isCreating: true,
                                                                    createProgress: 10,
                                                                    createError: null
                                                                });

                                                                // 场景创建：沿用创建角色的 Sora 库创建逻辑（仅更换 endpoint）
                                                                try {
                                                                    const soraConfig = apiConfigs.find(c => c.type === 'Video' && (c.id === 'sora-2' || c.id === 'sora-2-pro'));
                                                                    if (!soraConfig) {
                                                                        updateNodeSettings(node.id, { isCreating: false, createError: '未找到 Sora 2 模型配置' });
                                                                        alert('未找到 Sora 2 模型配置，请先在设置中配置 Sora 2 或 Sora 2 Pro');
                                                                        return;
                                                                    }

                                                                    const apiKey = soraConfig.key || globalApiKey;
                                                                    if (!apiKey) {
                                                                        updateNodeSettings(node.id, { isCreating: false, createError: '请先配置 API Key' });
                                                                        alert('请先配置 API Key');
                                                                        setSettingsOpen(true);
                                                                        return;
                                                                    }

                                                                    updateNodeSettings(node.id, { createProgress: 30 });

                                                                    const baseUrl = (soraConfig.url || DEFAULT_BASE_URL).replace(/\/+$/, '');
                                                                    // 创建场景：完全复用“创建角色”的请求方式（同 endpoint / 同 payload / 同错误处理）
                                                                    // 仅前端 UI 显示为“创建场景”，并将结果落到 tapnow_scenes
                                                                    const endpoint = (createCharacterEndpoint && createCharacterEndpoint.trim())
                                                                        ? createCharacterEndpoint.trim()
                                                                        : `${baseUrl}/sora/v1/characters`;

                                                                    const timestamps = `${startSecond},${endSecond}`;
                                                                    const payload = fromTaskId
                                                                        ? { from_task: fromTaskId, timestamps }
                                                                        : { url: videoUrl, timestamps };

                                                                    updateNodeSettings(node.id, { createProgress: 70 });

                                                                    console.log('[Create Scene Node] Request Details:', {
                                                                        endpoint,
                                                                        apiKey: apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : 'EMPTY',
                                                                        payload,
                                                                        fromTaskId,
                                                                        videoUrl: fromTaskId ? 'N/A (using from_task)' : videoUrl
                                                                    });

                                                                    const resp = await fetch(endpoint, {
                                                                        method: 'POST',
                                                                        headers: {
                                                                            'Authorization': `Bearer ${apiKey}`,
                                                                            'Content-Type': 'application/json'
                                                                        },
                                                                        body: JSON.stringify(payload)
                                                                    });

                                                                    updateNodeSettings(node.id, { createProgress: 90 });

                                                                    if (!resp.ok) {
                                                                        const errText = await resp.text();
                                                                        console.error('[Create Scene Node] API Error:', {
                                                                            status: resp.status,
                                                                            statusText: resp.statusText,
                                                                            errorText: errText,
                                                                            endpoint
                                                                        });

                                                                        // 尝试解析错误响应
                                                                        let errorData = null;
                                                                        try { errorData = JSON.parse(errText); } catch (e) {}

                                                                        // 特殊处理 500 错误和 get_origin_task_failed
                                                                        if (resp.status === 500 || (errorData && (errorData.code === 'get_origin_task_failed' || errorData.message?.includes('get_origin_task_failed')))) {
                                                                            throw new Error('TASK_NOT_FOUND');
                                                                        }

                                                                        throw new Error(`API错误 (${resp.status}): ${errText || resp.statusText}`);
                                                                    }

                                                                    const data = await resp.json();
                                                                    console.log('[Create Scene Node] Success:', data);
                                                                    updateNodeSettings(node.id, { createProgress: 100 });

                                                                    // 注意：后端返回结构与“创建角色”一致（id/username）
                                                                    // 按用户要求：仍按“角色”来显示与保存（不使用中文 name 作为标识）
                                                                    if (!data?.id || !data?.username) {
                                                                        throw new Error('返回数据缺少 id 或 username');
                                                                    }
                                                                    const characterId = data.id;
                                                                    const characterUsername = data.username;

                                                                    // 写入角色库（与创建角色一致）
                                                                    try {
                                                                        const newCharacter = {
                                                                            id: characterId,
                                                                            username: characterUsername,
                                                                            profile_picture_url: data.profile_picture_url || '',
                                                                            permalink: data.permalink || ''
                                                                        };
                                                                        const updated = [...characterLibrary, newCharacter];
                                                                        setCharacterLibrary(updated);
                                                                        try {
                                                                            localStorage.setItem('tapnow_characters', JSON.stringify(updated));
                                                                        } catch (err) {
                                                                            console.error('保存角色库失败:', err);
                                                                        }
                                                                    } catch (e) {
                                                                        console.warn('写入角色库失败:', e);
                                                                    }

                                                                    // 记录结果到节点，便于用户确认
                                                                    setTimeout(() => {
                                                                        updateNodeSettings(node.id, {
                                                                            isCreating: false,
                                                                            createProgress: 0,
                                                                            createError: null,
                                                                            characterId,
                                                                            characterUsername
                                                                        });
                                                                        alert(`角色 "${characterUsername}" 创建成功！`);
                                                                    }, 300);
                                                                } catch (err) {
                                                                    console.error('[Create Scene Node] Failed:', err);
                                                                    let msg = err.message;

                                                                    if (msg === 'TASK_NOT_FOUND') {
                                                                        updateNodeSettings(node.id, {
                                                                            isCreating: false,
                                                                            createProgress: 0,
                                                                            createError: '原任务已过期或无法访问'
                                                                        });
                                                                        alert('创建失败：原任务已过期或无法访问。\n\n请尝试获取该视频的下载链接，使用"输入视频 URL"方式重新创建。');
                                                                        return;
                                                                    }

                                                                    if (msg.includes('Failed to fetch') || err.name === 'TypeError' || err.message.includes('NetworkError')) {
                                                                        msg = '连接失败。可能原因：\n\n1. API 地址填写错误\n   - 请检查 API 接口地址是否多余了 "/sora" 前缀\n   - 有些服务商的路径可能不同，请询问服务商 Sora 场景创建接口的准确路径\n\n2. 跨域限制 (CORS)\n   - 请尝试安装 Allow CORS 浏览器插件\n\n3. 网络问题\n   - 请检查网络连接';
                                                                    }

                                                                    updateNodeSettings(node.id, {
                                                                        isCreating: false,
                                                                        createProgress: 0,
                                                                        createError: msg
                                                                    });
                                                                    alert(`创建场景失败: ${msg}`);
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        {isCharacter ? '创建角色' : '创建场景'}
                                                    </button>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}

                            {(node.type === 'generate-character-video' || node.type === 'generate-scene-video') && (
                                <div
                                    className={`relative w-full h-full flex flex-col transition-colors pointer-events-auto ${
                                        theme === 'dark'
                                            ? 'bg-zinc-900/80'
                                            : 'bg-zinc-100'
                                    }`}
                                >
                                    {(() => {
                                        const isCharacter = node.type === 'generate-character-video';

                                        // 从连接的描述节点获取提示词
                                        const descriptionNode = connections
                                            .filter(c => c.to === node.id)
                                            .map(c => nodesMap.get(c.from))
                                            .find(n => n?.type === (isCharacter ? 'character-description' : 'scene-description'));

                                        // 从连接的图片生成节点获取选中的图片URL（Image-to-Video模式）
                                        const imageNode = connections
                                            .filter(c => c.to === node.id)
                                            .map(c => nodesMap.get(c.from))
                                            .find(n => (isCharacter ? n?.type === 'generate-character-image' : n?.type === 'generate-scene-image'));

                                        const selectedImageUrl = imageNode?.settings?.selectedImageIndex !== null && imageNode?.settings?.selectedImageIndex !== undefined
                                            ? (imageNode.settings?.imageUrls?.[imageNode.settings.selectedImageIndex] || imageNode.settings?.imageUrl || imageNode.content)
                                            : null;

                                        const videoPrompt = node.settings?.videoPrompt || descriptionNode?.settings?.prompt || '';

                                        // 显示Image-to-Video模式提示
                                        const isImageToVideoMode = selectedImageUrl !== null;

                                        return (
                                            <>
                                                <div className={`flex items-center gap-1.5 px-3 py-2 border-b text-xs font-semibold shrink-0 ${
                                                    theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'
                                                }`}>
                                                    <FileVideo size={12} className="text-green-500" />
                                                    <span>{isCharacter ? '生成角色视频' : '生成场景视频'}</span>
                                                </div>

                                                <div className="flex-1 flex flex-col gap-3 p-3 overflow-y-auto min-h-0">
                                                    {/* 引用参考图提示和缩略图 */}
                                                    {(() => {
                                                        const referenceImages = node.settings?.referenceImages || descriptionNode?.settings?.referenceImages || [];
                                                        const hasRefImages = referenceImages && referenceImages.length > 0;
                                                        return hasRefImages ? (
                                                            <div className={`flex flex-col gap-2 px-2 py-2 rounded text-[10px] ${
                                                                theme === 'dark' ? 'bg-green-900/30 border border-green-700' : 'bg-green-50 border border-green-200'
                                                            }`}>
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-green-500">✅</span>
                                                                    <span className={theme === 'dark' ? 'text-green-400' : 'text-green-700'}>
                                                                        引用图片成功 ({referenceImages.length}张)
                                                                    </span>
                                                                </div>
                                                                <div className="flex gap-2 overflow-x-auto">
                                                                    {referenceImages.slice(0, 4).map((img, idx) => (
                                                                        <div key={idx} className="relative w-16 h-16 flex-shrink-0 rounded overflow-hidden border border-green-500">
                                                                            <img
                                                                                src={img}
                                                                                alt={`Reference ${idx + 1}`}
                                                                                className="w-full h-full object-cover"
                                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : null;
                                                    })()}

                                                    {/* 模型选择 */}
                                                    <div>
                                                        <label className="text-[10px] block mb-1 text-zinc-500">选择模型</label>
                                                        <select
                                                            value={node.settings?.model || 'sora-2'}
                                                            onChange={(e) => updateNodeSettings(node.id, { model: e.target.value })}
                                                            className={`w-full px-2 py-1 rounded text-xs border ${
                                                                theme === 'dark'
                                                                    ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                                                                    : 'bg-white border-zinc-300 text-zinc-800'
                                                            }`}
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                        >
                                                            {apiConfigs
                                                                .filter(c => c.type === 'Video')
                                                                .map(c => (
                                                                    <option key={c.id} value={c.id}>{c.provider}</option>
                                                                ))}
                                                        </select>
                                                    </div>

                                                    {/* 时长选择 */}
                                                    <div>
                                                        <label className="text-[10px] block mb-1 text-zinc-500">时长</label>
                                                        <select
                                                            value={node.settings?.duration || '15s'}
                                                            onChange={(e) => updateNodeSettings(node.id, { duration: e.target.value })}
                                                            className={`w-full px-2 py-1 rounded text-xs border ${
                                                                theme === 'dark'
                                                                    ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                                                                    : 'bg-white border-zinc-300 text-zinc-800'
                                                            }`}
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                        >
                                                            <option value="5s">5秒</option>
                                                            <option value="10s">10秒</option>
                                                            <option value="15s">15秒</option>
                                                        </select>
                                                    </div>

                                                    {/* 比例选择 */}
                                                    <div>
                                                        <label className="text-[10px] block mb-1 text-zinc-500">比例</label>
                                                        <select
                                                            value={node.settings?.ratio || '16:9'}
                                                            onChange={(e) => updateNodeSettings(node.id, { ratio: e.target.value })}
                                                            className={`w-full px-2 py-1 rounded text-xs border ${
                                                                theme === 'dark'
                                                                    ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                                                                    : 'bg-white border-zinc-300 text-zinc-800'
                                                            }`}
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                        >
                                                            <option value="16:9">16:9</option>
                                                            <option value="9:16">9:16</option>
                                                            <option value="1:1">1:1</option>
                                                        </select>
                                                    </div>

                                                    {/* 提示词 */}
                                                    <div>
                                                        <label className="text-[10px] block mb-1 text-zinc-500">提示词</label>
                                                        <textarea
                                                            value={videoPrompt}
                                                            onChange={(e) => updateNodeSettings(node.id, { videoPrompt: e.target.value })}
                                                            placeholder="输入视频生成提示词..."
                                                            className={`w-full h-20 resize-none outline-none text-sm p-2 rounded border ${
                                                                theme === 'dark'
                                                                    ? 'bg-zinc-800 border-zinc-700 text-zinc-200 placeholder-zinc-500'
                                                                    : 'bg-white border-zinc-300 text-zinc-800 placeholder-zinc-400'
                                                            }`}
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                        />
                                                    </div>

                                                    {/* 预览区域 - 支持双击打开和右键发送到画布 */}
                                                    {node.settings?.videoUrl || node.content ? (
                                                        <div
                                                            className="relative w-full aspect-video bg-black rounded-lg overflow-hidden cursor-pointer"
                                                            onDoubleClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                // 双击打开大图预览
                                                                const videoUrl = node.settings?.videoUrl || node.content;
                                                                setLightboxItem({ id: `preview-video-${node.id}`, url: videoUrl, type: 'video' });
                                                                setLightboxOpen(true);
                                                            }}
                                                            onContextMenu={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                // 右键发送到画布
                                                                const videoUrl = node.settings?.videoUrl || node.content;
                                                                const world = screenToWorld(e.clientX, e.clientY);
                                                                const dims = { w: 400, h: 300 };
                                                                addNode('video-input', world.x, world.y, null, videoUrl, dims);
                                                                console.log('[右键菜单] 已发送视频到画布:', videoUrl);
                                                            }}
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                        >
                                                            <video
                                                                src={node.settings?.videoUrl || node.content}
                                                                controls
                                                                className="w-full h-full object-contain"
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className={`w-full aspect-video rounded border-2 border-dashed flex items-center justify-center ${
                                                            theme === 'dark' ? 'border-zinc-700' : 'border-zinc-300'
                                                        }`}>
                                                            <span className={`text-sm ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                                                点击"生成"按钮开始生成
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* 进度条显示 */}
                                                    {node.settings?.isGenerating && (
                                                        <div className="mb-2">
                                                            <div className="text-[10px] mb-1 text-zinc-500">正在生成视频...</div>
                                                            <div className={`w-full h-1.5 rounded-full overflow-hidden ${
                                                                theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'
                                                            }`}>
                                                                <div
                                                                    className="h-full bg-blue-500 transition-all duration-300"
                                                                    style={{ width: `${node.settings?.progress || 0}%` }}
                                                                />
                                                            </div>
                                                            <div className="text-[10px] text-zinc-500 mt-1">
                                                                {node.settings?.progress || 0}% 完成
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 错误显示 */}
                                                    {node.settings?.error && (
                                                        <div className="text-[10px] text-red-500">
                                                            {node.settings.error}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="px-3 py-2 border-t shrink-0">
                                                    <button
                                                        className={`w-full py-2 rounded text-xs font-medium transition-colors ${
                                                            node.settings?.isGenerating
                                                                ? 'bg-zinc-400 cursor-not-allowed text-white'
                                                                : theme === 'dark'
                                                                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white'
                                                                    : 'bg-green-600 hover:bg-green-500 text-white'
                                                        }`}
                                                        disabled={node.settings?.isGenerating}
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onClick={async () => {
                                                            const { videoPrompt, model, duration, ratio } = node.settings;

                                                            // 检查是否有选中的图片（Image-to-Video模式）
                                                            const selectedImageUrl = imageNode?.settings?.selectedImageIndex !== null && imageNode?.settings?.selectedImageIndex !== undefined
                                                                ? (imageNode.settings?.imageUrls?.[imageNode.settings.selectedImageIndex] || imageNode.settings?.imageUrl || imageNode.content)
                                                                : null;

                                                            // 如果没有选中图片且没有提示词，则提示
                                                            if (!selectedImageUrl && (!videoPrompt || videoPrompt.trim().length === 0)) {
                                                                alert('请先输入提示词或在上方图片生成节点中选中一张图片');
                                                                return;
                                                            }

                                                            // 获取API配置
                                                            const apiConfig = apiConfigsMap.get(model || 'sora-2');
                                                            if (!apiConfig) {
                                                                alert('未找到模型配置');
                                                                return;
                                                            }

                                                            const apiKey = apiConfig.key || globalApiKey;
                                                            if (!apiKey) {
                                                                alert('请先配置API Key');
                                                                setSettingsOpen(true);
                                                                return;
                                                            }

                                                            // 更新节点状态
                                                            updateNodeSettings(node.id, {
                                                                isGenerating: true,
                                                                error: null,
                                                                progress: 0
                                                            });

                                                            try {
                                                                console.log('[Sora 2 视频生成] 开始生成，模型:', model, '提示词:', videoPrompt?.substring(0, 50));

                                                                // 确定输入源：优先使用选中的图片，其次使用参考图
                                                                let sourceImages = [];
                                                                if (selectedImageUrl) {
                                                                    sourceImages = [selectedImageUrl];
                                                                    console.log('[Sora 2 视频生成] Image-to-Video模式：使用选中的图片:', selectedImageUrl.substring(0, 50));
                                                                } else {
                                                                    // Text-to-Video模式：使用参考图（如果有）
                                                                    const referenceImages = node.settings?.referenceImages || descriptionNode?.settings?.referenceImages || [];
                                                                    if (referenceImages.length > 0) {
                                                                        sourceImages = [referenceImages[0]];
                                                                        console.log('[Sora 2 视频生成] Text-to-Video模式：使用参考图');
                                                                    } else {
                                                                        console.log('[Sora 2 视频生成] Text-to-Video模式：纯文本生成');
                                                                    }
                                                                }

                                                                // 复用通用视频生成接口 startGeneration
                                                                await startGeneration(
                                                                    videoPrompt || '',
                                                                    'video',
                                                                    sourceImages,
                                                                    node.id,
                                                                    {
                                                                        model: model || 'sora-2',
                                                                        ratio: ratio || '16:9',
                                                                        resolution: 'Auto',
                                                                        duration: (duration || '15s').replace('s', '') + 's',
                                                                        isHD: node.settings?.isHD || false
                                                                    }
                                                                );

                                                                console.log('[Sora 2 视频生成] 已调用通用接口 startGeneration，等待结果...');

                                                            } catch (error) {
                                                                console.error('[Sora 2 视频生成] 失败:', error);
                                                                updateNodeSettings(node.id, {
                                                                    isGenerating: false,
                                                                    progress: 0,
                                                                    error: error.message
                                                                });

                                                                // 添加失败记录到历史
                                                                setHistory(prev => {
                                                                    const newHistory = [...prev, {
                                                                        id: `history-${Date.now()}`,
                                                                        type: 'video',
                                                                        prompt: videoPrompt,
                                                                        error: error.message,
                                                                        status: 'failed',
                                                                        progress: 0,
                                                                        modelId: model,
                                                                        timestamp: Date.now()
                                                                    }];
                                                                    try {
                                                                        localStorage.setItem('tapnow_history', JSON.stringify(newHistory));
                                                                    } catch (e) {
                                                                        console.error('保存历史记录失败:', e);
                                                                    }
                                                                    return newHistory;
                                                                });

                                                                alert(`生成失败: ${error.message}`);
                                                            }
                                                        }}
                                                    >
                                                        {node.settings?.isGenerating ? '生成中...' : '生成视频'}
                                                    </button>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}

                            {(node.type === 'generate-character-image' || node.type === 'generate-scene-image') && (
                                <div
                                    className={`relative w-full h-full flex flex-col transition-colors pointer-events-auto ${
                                        theme === 'dark'
                                            ? 'bg-zinc-900/80'
                                            : 'bg-zinc-100'
                                    }`}
                                >
                                    <div className={`flex items-center gap-1.5 px-3 py-2 border-b text-xs font-semibold shrink-0 ${
                                        theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'
                                    }`}>
                                        <FileText size={12} className="text-blue-500" />
                                        <span>{node.type === 'generate-character-image' ? '生成角色图片' : '生成场景图片'}</span>
                                    </div>

                                    <div className="flex-1 flex flex-col gap-3 p-3 overflow-y-auto min-h-0">
                                        {/* 大模型选择 - 用于提示词过滤 */}
                                        {(() => {
                                            // 从上游节点获取模型选择（extract-characters-scenes节点）
                                            const extractNode = connections
                                                .filter(c => {
                                                    const fromNode = nodesMap.get(c.from);
                                                    return fromNode?.type === 'extract-characters-scenes';
                                                })
                                                .map(c => {
                                                    const fromNode = nodesMap.get(c.from);
                                                    const toNode = nodesMap.get(c.to);
                                                    // 检查是否连接到当前节点或其上游节点
                                                    if (toNode?.id === node.id ||
                                                        ((toNode?.type === 'character-description' || toNode?.type === 'scene-description') &&
                                                         connections.some(conn => conn.from === toNode.id && conn.to === node.id))) {
                                                        return fromNode;
                                                    }
                                                    return null;
                                                })
                                                .find(n => n !== null);

                                            const defaultChatModel = extractNode?.settings?.model || '';
                                            const isSceneImage = node.type === 'generate-scene-image';

                                            return (
                                                <div>
                                                    <label className="text-[10px] block mb-1 text-zinc-500">
                                                        {isSceneImage ? '大模型选择（用于过滤人物、字符描述）' : '大模型选择（用于提示词过滤）'}
                                                    </label>
                                                    <select
                                                        value={node.settings?.chatModel || defaultChatModel}
                                                        onChange={(e) => updateNodeSettings(node.id, { chatModel: e.target.value })}
                                                        className={`w-full px-2 py-1 rounded text-xs border ${
                                                            theme === 'dark'
                                                                ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                                                                : 'bg-white border-zinc-300 text-zinc-800'
                                                        }`}
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                    >
                                                        <option value="">选择大模型（可选）</option>
                                                        {apiConfigs
                                                            .filter(c => c.type === 'Chat')
                                                            .map(c => (
                                                                <option key={c.id} value={c.id}>{c.provider}</option>
                                                            ))}
                                                    </select>
                                                </div>
                                            );
                                        })()}

                                        {/* 模型选择 */}
                                        <div>
                                            <label className="text-[10px] block mb-1 text-zinc-500">选择模型</label>
                                            <select
                                                value={node.settings?.model || ''}
                                                onChange={(e) => updateNodeSettings(node.id, { model: e.target.value })}
                                                className={`w-full px-2 py-1 rounded text-xs border ${
                                                    theme === 'dark'
                                                        ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                                                        : 'bg-white border-zinc-300 text-zinc-800'
                                                }`}
                                                onMouseDown={(e) => e.stopPropagation()}
                                            >
                                                <option value="">选择模型</option>
                                                {apiConfigs
                                                    .filter(c => c.type === 'Image')
                                                    .map(c => (
                                                        <option key={c.id} value={c.id}>{c.provider}</option>
                                                    ))}
                                            </select>
                                        </div>

                                        {/* 参考图引用标识 - 只有当referenceImages有值时才显示 */}
                                        {(() => {
                                            const hasRefImages = node.settings?.referenceImages &&
                                                                Array.isArray(node.settings.referenceImages) &&
                                                                node.settings.referenceImages.length > 0;
                                            return hasRefImages ? (
                                                <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] ${
                                                    theme === 'dark' ? 'bg-green-900/30 border border-green-700' : 'bg-green-50 border border-green-200'
                                                }`}>
                                                    <span className="text-green-500">✅</span>
                                                    <span className={theme === 'dark' ? 'text-green-400' : 'text-green-700'}>
                                                        引用图片成功 ({node.settings.referenceImages.length}张)
                                                    </span>
                                                </div>
                                            ) : null;
                                        })()}

                                        {/* 比例选择 */}
                                        <div>
                                            <label className="text-[10px] block mb-1 text-zinc-500">比例</label>
                                            <select
                                                value={node.settings?.ratio || '16:9'}
                                                onChange={(e) => updateNodeSettings(node.id, { ratio: e.target.value })}
                                                className={`w-full px-2 py-1 rounded text-xs border ${
                                                    theme === 'dark'
                                                        ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                                                        : 'bg-white border-zinc-300 text-zinc-800'
                                                }`}
                                                onMouseDown={(e) => e.stopPropagation()}
                                            >
                                                <option value="16:9">16:9</option>
                                                <option value="9:16">9:16</option>
                                                <option value="1:1">1:1</option>
                                            </select>
                                        </div>

                                        {/* 提示词 */}
                                        <div>
                                            <label className="text-[10px] block mb-1 text-zinc-500">提示词</label>
                                            <textarea
                                                value={node.settings?.prompt || ''}
                                                onChange={(e) => updateNodeSettings(node.id, { prompt: e.target.value })}
                                                placeholder="输入图片生成提示词..."
                                                className={`w-full h-20 resize-none outline-none text-sm p-2 rounded border ${
                                                    theme === 'dark'
                                                        ? 'bg-zinc-800 border-zinc-700 text-zinc-200 placeholder-zinc-500'
                                                        : 'bg-white border-zinc-300 text-zinc-800 placeholder-zinc-400'
                                                }`}
                                                onMouseDown={(e) => e.stopPropagation()}
                                            />
                                        </div>

                                        {/* 预览区域 - 支持多图显示（grid布局），复用AI绘图预览窗口逻辑 */}
                                        {(() => {
                                            const imageUrls = node.settings?.imageUrls || (node.settings?.imageUrl || node.content ? [node.settings?.imageUrl || node.content] : []);
                                            const selectedImageIndex = node.settings?.selectedImageIndex ?? null;

                                            return imageUrls.length > 0 ? (
                                                <div className="relative w-full">
                                                    {imageUrls.length > 1 ? (
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {imageUrls.map((url, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className={`relative aspect-square bg-black rounded-lg overflow-hidden cursor-pointer transition-all ${
                                                                        selectedImageIndex === idx
                                                                            ? 'ring-2 ring-blue-500 ring-offset-2'
                                                                            : 'hover:ring-1 hover:ring-zinc-400'
                                                                    }`}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const newIndex = selectedImageIndex === idx ? null : idx;
                                                                        updateNodeSettings(node.id, { selectedImageIndex: newIndex });
                                                                    }}
                                                                    onDoubleClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        // 双击打开大图预览
                                                                        setLightboxItem({ id: `preview-${node.id}-${idx}`, url: url, type: 'image', mjImages: imageUrls, selectedMjImageIndex: idx });
                                                                        setLightboxOpen(true);
                                                                    }}
                                                                    onContextMenu={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        // 右键发送到画布
                                                                        const world = screenToWorld(e.clientX, e.clientY);
                                                                        const dims = { w: 400, h: 300 };
                                                                        addNode('input-image', world.x, world.y, null, url, dims);
                                                                        console.log('[右键菜单] 已发送图片到画布:', url);
                                                                    }}
                                                                    onMouseDown={(e) => e.stopPropagation()}
                                                                >
                                                                    <img
                                                                        src={url}
                                                                        alt={`Generated ${node.type === 'generate-character-image' ? 'character' : 'scene'} ${idx + 1}`}
                                                                        className="w-full h-full object-contain"
                                                                    />
                                                                    <div className="absolute top-1 left-1 bg-black/50 text-white text-[10px] px-1 py-0.5 rounded">
                                                                        {idx + 1}/{imageUrls.length}
                                                                    </div>
                                                                    {selectedImageIndex === idx && (
                                                                        <div className="absolute top-1 right-1 bg-blue-500 text-white text-[10px] px-1 py-0.5 rounded">
                                                                            ✓ 已选中
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div
                                                            className="relative w-full aspect-video bg-black rounded-lg overflow-hidden cursor-pointer"
                                                            onDoubleClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                // 双击打开大图预览
                                                                setLightboxItem({ id: `preview-${node.id}`, url: imageUrls[0], type: 'image' });
                                                                setLightboxOpen(true);
                                                            }}
                                                            onContextMenu={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                // 右键发送到画布
                                                                const world = screenToWorld(e.clientX, e.clientY);
                                                                const dims = { w: 400, h: 300 };
                                                                addNode('input-image', world.x, world.y, null, imageUrls[0], dims);
                                                                console.log('[右键菜单] 已发送图片到画布:', imageUrls[0]);
                                                            }}
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                        >
                                                            <img
                                                                src={imageUrls[0]}
                                                                alt={`Generated ${node.type === 'generate-character-image' ? 'character' : 'scene'}`}
                                                                className="w-full h-full object-contain"
                                                            />
                                                        </div>
                                                    )}
                                                    {imageUrls.length > 1 && (
                                                        <div className={`mt-2 px-2 py-1 rounded text-[10px] ${
                                                            theme === 'dark' ? 'bg-zinc-800/50 border border-zinc-700' : 'bg-zinc-100 border border-zinc-300'
                                                        }`}>
                                                            <span className={theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}>
                                                                💡 请选择一张图片用于生成视频，不选则默认文生视频（右键图片可发送到画布，双击打开大图）
                                                            </span>
                                                        </div>
                                                    )}
                                                    {selectedImageIndex !== null && imageUrls[selectedImageIndex] && (
                                                        <div className={`mt-2 px-2 py-1 rounded text-[10px] ${
                                                            theme === 'dark' ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200'
                                                        }`}>
                                                            <span className={theme === 'dark' ? 'text-blue-400' : 'text-blue-700'}>
                                                                📷 已选中图片 {selectedImageIndex + 1}，将用于视频生成
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className={`w-full aspect-video rounded border-2 border-dashed flex items-center justify-center ${
                                                    theme === 'dark' ? 'border-zinc-700' : 'border-zinc-300'
                                                }`}>
                                                    <span className={`text-sm ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                                        点击"生成"按钮开始生成
                                                    </span>
                                                </div>
                                            );
                                        })()}

                                        {/* 进度条显示 */}
                                        {node.settings?.isGenerating && (
                                            <div className="mb-2">
                                                <div className="text-[10px] mb-1 text-zinc-500">正在生成图片...</div>
                                                <div className={`w-full h-1.5 rounded-full overflow-hidden ${
                                                    theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'
                                                }`}>
                                                    <div
                                                        className="h-full bg-blue-500 transition-all duration-300"
                                                        style={{ width: `${node.settings?.progress || 0}%` }}
                                                    />
                                                </div>
                                                <div className="text-[10px] text-zinc-500 mt-1">
                                                    {node.settings?.progress || 0}% 完成
                                                </div>
                                            </div>
                                        )}

                                        {/* 错误显示 */}
                                        {node.settings?.error && (
                                            <div className="text-[10px] text-red-500">
                                                {node.settings.error}
                                            </div>
                                        )}
                                    </div>

                                    <div className="px-3 py-2 border-t shrink-0">
                                        <button
                                            className={`w-full py-2 rounded text-xs font-medium transition-colors ${
                                                node.settings?.isGenerating
                                                    ? 'bg-zinc-400 cursor-not-allowed text-white'
                                                    : theme === 'dark'
                                                        ? 'bg-blue-600 hover:bg-blue-500 text-white'
                                                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                                            }`}
                                            disabled={node.settings?.isGenerating}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onClick={async () => {
                                                const { prompt, model, ratio, resolution, referenceImages } = node.settings;
                                                const isSceneImage = node.type === 'generate-scene-image';

                                                if (!prompt || prompt.trim().length === 0) {
                                                    alert('请先输入提示词');
                                                    return;
                                                }

                                                // 获取API配置
                                                const apiConfig = apiConfigsMap.get(model || '');
                                                if (!apiConfig) {
                                                    alert('请先选择模型');
                                                    return;
                                                }

                                                const apiKey = apiConfig.key || globalApiKey;
                                                if (!apiKey) {
                                                    alert('请先配置API Key');
                                                    setSettingsOpen(true);
                                                    return;
                                                }

                                                // 更新节点状态
                                                updateNodeSettings(node.id, {
                                                    isGenerating: true,
                                                    error: null,
                                                    progress: 5
                                                });

                                                try {
                                                    console.log(`[生成${isSceneImage ? '场景' : '角色'}图片] 开始生成，模型:`, model, '比例:', ratio);

                                                    // 过滤提示词
                                                    // 使用节点设置中的chatModel，如果没有则使用默认的Chat模型
                                                    const chatModelForFilter = node.settings?.chatModel || apiConfigs.find(c => c.type === 'Chat')?.id;
                                                    let filteredPrompt = prompt;
                                                    if (chatModelForFilter) {
                                                        try {
                                                            if (isSceneImage) {
                                                                // 场景图片：过滤掉人物、字符描述
                                                                filteredPrompt = await filterScenePrompt(prompt);
                                                                console.log('[生成场景图片] 过滤后的提示词:', filteredPrompt);
                                                            } else {
                                                                // 角色图片：过滤提示词，确保白色背景
                                                                filteredPrompt = await filterCharacterPrompt(prompt);
                                                                console.log('[生成角色图片] 过滤后的提示词:', filteredPrompt);
                                                            }
                                                        } catch (e) {
                                                            console.warn('提示词过滤失败，使用原始提示词:', e);
                                                        }
                                                    }

                                                    // 准备参考图
                                                    const sourceImages = referenceImages && referenceImages.length > 0 ? referenceImages : [];

                                                    // 使用通用的 startGeneration 函数
                                                    await startGeneration(
                                                        filteredPrompt,
                                                        'image',
                                                        sourceImages,
                                                        node.id,
                                                        {
                                                            model: model,
                                                            ratio: ratio || '16:9',
                                                            resolution: resolution || 'Auto'
                                                        }
                                                    );

                                                    console.log(`[生成${isSceneImage ? '场景' : '角色'}图片] 已调用通用接口 startGeneration`);

                                                } catch (error) {
                                                    console.error(`[生成${isSceneImage ? '场景' : '角色'}图片] 失败:`, error);
                                                    updateNodeSettings(node.id, {
                                                        isGenerating: false,
                                                        progress: 0,
                                                        error: error.message
                                                    });

                                                    alert(`生成失败: ${error.message}`);
                                                }
                                            }}
                                        >
                                            {node.settings?.isGenerating
                                                ? '生成中...'
                                                : (node.type === 'generate-scene-image' ? '生成场景图片' : '生成角色图片')
                                            }
                                        </button>
                                    </div>
                                </div>
                            )}

                            {node.type === 'video-analyze' && (
                                <div
                                    className={`relative w-full h-full flex flex-col transition-colors pointer-events-auto video-analyze-container ${theme === 'dark' ? 'bg-zinc-900/80' : 'bg-zinc-100'}`}
                                    onClick={(e) => {
                                        // 检查是否有文本选择，如果有则不阻止事件
                                        const selection = window.getSelection();
                                        if (selection && selection.toString().length > 0) {
                                            return; // 允许文本选择
                                        }
                                        // 检查是否点击在可交互元素上
                                        const target = e.target;
                                        if (target && (
                                            target.tagName === 'INPUT' ||
                                            target.tagName === 'TEXTAREA' ||
                                            target.tagName === 'SELECT' ||
                                            target.tagName === 'BUTTON' ||
                                            target.isContentEditable ||
                                            target.closest('input, textarea, select, button, [contenteditable="true"]')
                                        )) {
                                            return; // 允许交互元素正常工作
                                        }
                                        e.stopPropagation();
                                    }}
                                >
                                    <div className="flex items-center justify-between px-3 py-2 border-b text-xs font-semibold">
                                        <div className="flex items-center gap-1.5">
                                            <FileSearch size={13} className="text-blue-500" />
                                            <span>视频拆解 / 提示词反推</span>
                                        </div>
                                    </div>

                                    <div className="flex-1 flex flex-col gap-3 p-3 overflow-hidden min-h-0">
                                        {(() => {
                                            const videoInputNode = getConnectedVideoInputNode(node.id);
                                            if (!videoInputNode) {
                                                return (
                                                    <div className="flex flex-col items-center justify-center flex-1 gap-2 text-[11px] text-zinc-500">
                                                        <LinkIcon size={24} className="text-zinc-400" />
                                                        <span>请连接一个视频输入节点</span>
                                                    </div>
                                                );
                                            }

                                            const videoFileName = videoInputNode.videoFileName || '未命名视频';
                                            const videoDuration = videoInputNode.videoMeta?.duration || 0;
                                            const selectedKeyframes = videoInputNode.selectedKeyframes || [];

                                            return (
                                                <>
                                                    <div className="space-y-2">
                                                        <div className={`text-[11px] px-2 py-1.5 rounded border ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-300'}`}>
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-zinc-500">关联的视频</span>
                                                            </div>
                                                            <div className="text-zinc-700 dark:text-zinc-300">
                                                                <div>文件名: {videoFileName}</div>
                                                                <div>总时长: {videoDuration.toFixed(1)}s</div>
                                                                <div>已选关键帧: {selectedKeyframes.length} 个</div>
                                                            </div>
                                                        </div>

                                                        {/* 模式选择切换按钮 */}
                                                        <div className={`flex items-center gap-2 p-1 rounded-lg border shadow-inner ${
                                                            theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-100 border-zinc-200'
                                                        }`}>
                                                            <button
                                                                onClick={() => updateNodeSettings(node.id, { analysisMode: 'manual' })}
                                                                className={`flex-1 py-1 px-2 text-[11px] rounded transition-all flex justify-center items-center gap-1 ${
                                                                    (node.settings?.analysisMode || 'manual') === 'manual'
                                                                        ? theme === 'dark'
                                                                            ? 'bg-zinc-600 shadow-md text-blue-300 font-bold'
                                                                            : 'bg-white shadow-md text-blue-600 font-bold'
                                                                        : theme === 'dark'
                                                                            ? 'text-zinc-500 hover:text-zinc-300'
                                                                            : 'text-zinc-500 hover:text-zinc-700'
                                                                }`}
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                            >
                                                                <Camera size={12} /> 手动选帧拆解
                                                            </button>
                                                            <button
                                                                onClick={() => updateNodeSettings(node.id, { analysisMode: 'auto' })}
                                                                className={`flex-1 py-1 px-2 text-[11px] rounded transition-all flex justify-center items-center gap-1 ${
                                                                    node.settings?.analysisMode === 'auto'
                                                                        ? theme === 'dark'
                                                                            ? 'bg-zinc-600 shadow-md text-purple-300 font-bold'
                                                                            : 'bg-white shadow-md text-purple-600 font-bold'
                                                                        : theme === 'dark'
                                                                            ? 'text-zinc-500 hover:text-zinc-300'
                                                                            : 'text-zinc-500 hover:text-zinc-700'
                                                                }`}
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                            >
                                                                <Sparkles size={12} /> AI 导演拆解
                                                            </button>
                                                        </div>

                                                        {(node.settings?.analysisMode || 'manual') === 'manual' && (
                                                            <>
                                                                <div className="flex items-center gap-2">
                                                                    <label className="text-[11px] text-zinc-500">按时间段分组:</label>
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        max="30"
                                                                        value={node.settings?.segmentDuration || 3}
                                                                        onChange={(e) => updateNodeSettings(node.id, { segmentDuration: parseInt(e.target.value) || 3 })}
                                                                        className={`w-16 px-2 py-1 text-[11px] rounded border ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-white border-zinc-300 text-zinc-800'}`}
                                                                        onMouseDown={(e) => e.stopPropagation()}
                                                                    />
                                                                    <span className="text-[11px] text-zinc-500">秒</span>
                                                                </div>

                                                                <div className="flex items-center gap-2">
                                                                    <label className="text-[11px] text-zinc-500">模型:</label>
                                                                    <select
                                                                        value={node.settings?.model || 'gemini-3-pro'}
                                                                        onChange={(e) => updateNodeSettings(node.id, { model: e.target.value })}
                                                                        className={`flex-1 px-2 py-1 text-[11px] rounded border ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-50 border-zinc-300 text-zinc-800'}`}
                                                                        onMouseDown={(e) => e.stopPropagation()}
                                                                    >
                                                                        {apiConfigs.filter(c => c.type === 'Chat' && ['gemini-3-pro', 'gpt-5-1', 'gpt-5-2', 'deepseek-v3'].includes(c.id)).map(c => (
                                                                            <option key={c.id} value={c.id}>{c.provider}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            </>
                                                        )}

                                                        <button
                                                            onClick={() => node.settings?.analysisMode === 'auto' ? handleAutoVideoAnalysis(node.id) : handleGeneratePrompts(node.id)}
                                                            disabled={node.isGenerating || ((node.settings?.analysisMode || 'manual') === 'manual' && selectedKeyframes.length === 0)}
                                                            className={`w-full px-3 py-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-2 ${
                                                                node.isGenerating
                                                                    ? 'bg-zinc-600 text-zinc-400 cursor-not-allowed'
                                                                    : node.settings?.analysisMode === 'auto'
                                                                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg'
                                                                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                                                            }`}
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                        >
                                                            {node.isGenerating ? (
                                                                <>
                                                                    <Loader2 size={14} className="animate-spin" />
                                                                    <span>{node.settings?.analysisMode === 'auto' ? 'AI 正在拉片分析中...' : '生成中...'}</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Sparkles size={14} />
                                                                    <span>{node.settings?.analysisMode === 'auto' ? '开始全自动拆解视频' : '为选中关键帧生成提示词'}</span>
                                                                </>
                                                            )}
                                                        </button>

                                                        {node.errorMsg && (
                                                            <div className="text-[10px] text-red-500 px-2 py-1 rounded bg-red-500/10">
                                                                {node.errorMsg}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* 结果展示区 (Auto 模式) */}
                                                    {node.settings?.analysisMode === 'auto' && node.settings?.analysisResults?.length > 0 && (
                                                        <div className="flex-1 overflow-y-auto custom-scrollbar pt-2">
                                                            {/* 口播文案 (Voiceover) */}
                                                            {node.settings.voiceoverResults?.length > 0 && (
                                                                <div className={`p-2 rounded-lg mb-4 ${theme === 'dark' ? 'bg-zinc-700/50 border border-zinc-700' : 'bg-zinc-50 border border-blue-200'}`}>
                                                                    <h4 className={`text-xs font-semibold mb-2 flex items-center gap-1 ${theme === 'dark' ? 'text-white' : 'text-blue-700'}`}>
                                                                        <Mic2 size={12} /> 提取口播文案
                                                                    </h4>
                                                                    <div className="space-y-1">
                                                                        {node.settings.voiceoverResults.map((v, i) => (
                                                                            <p
                                                                                key={i}
                                                                                className={`text-[10px] select-text cursor-text ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}
                                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                            >
                                                                                <span className="font-mono text-xs mr-2 opacity-70">[{v.time_range || `${v.time}s`}]</span>
                                                                                {v.text || <span className="text-zinc-400 italic">（无口播）</span>}
                                                                            </p>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* 场景拆解结果 */}
                                                            <h4 className={`text-xs font-semibold mb-3 flex items-center gap-1 ${theme === 'dark' ? 'text-white' : 'text-zinc-800'}`}>
                                                                <Camera size={12} /> 导演级场景分析 ({node.settings.analysisResults.length} 场景)
                                                            </h4>

                                                            <div className="space-y-4">
                                                                {node.settings.analysisResults.map((scene, i) => (
                                                                    <div key={i} className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-zinc-800 border border-zinc-700' : 'bg-zinc-50 border border-zinc-200'}`}>
                                                                        <h5 className={`text-sm font-bold mb-2 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-700'}`}>
                                                                            场景 {scene.scene_index || scene.scene_id || i + 1} <span className="text-xs font-normal opacity-70 ml-2">({scene.time_range})</span>
                                                                        </h5>

                                                                        {/* 视觉分析 */}
                                                                        <div className="text-[11px] space-y-1 mb-3">
                                                                            {scene.keyframes?.[0]?.description && (
                                                                                <p
                                                                                    className={`select-text cursor-text ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}
                                                                                    onMouseDown={(e) => e.stopPropagation()}
                                                                                >
                                                                                    <span className="font-semibold mr-1">运镜/动态:</span> {scene.keyframes[0].description}
                                                                                </p>
                                                                            )}
                                                                            {scene.global_tags?.style?.[0] && (
                                                                                <p
                                                                                    className={`select-text cursor-text ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}
                                                                                    onMouseDown={(e) => e.stopPropagation()}
                                                                                >
                                                                                    <span className="font-semibold mr-1">氛围/风格:</span> {scene.global_tags.style[0]}
                                                                                </p>
                                                                            )}
                                                                        </div>

                                                                        {/* 提示词输出 */}
                                                                        <div className="space-y-2">
                                                                            {/* 即梦 Prompt */}
                                                                            {scene.keyframes?.[0]?.jimeng_prompt && (
                                                                                <div className={`p-2 rounded ${theme === 'dark' ? 'bg-zinc-700 border border-zinc-600' : 'bg-zinc-50 border border-gray-300'}`}>
                                                                                    <h6 className={`text-[10px] font-semibold mb-1 flex items-center gap-1 ${theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700'}`}><Code size={10} /> 即梦 Prompt</h6>
                                                                                    <p
                                                                                        className={`text-[10px] whitespace-pre-wrap select-text cursor-text ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'}`}
                                                                                        onMouseDown={(e) => e.stopPropagation()}
                                                                                    >{scene.keyframes[0].jimeng_prompt}</p>
                                                                                    <button onClick={() => navigator.clipboard.writeText(scene.keyframes[0].jimeng_prompt)} className="mt-1 flex items-center text-[9px] text-blue-400 hover:text-blue-300" onMouseDown={(e) => e.stopPropagation()}>
                                                                                        <ClipboardCopy size={10} className="mr-1" /> 复制
                                                                                    </button>
                                                                                </div>
                                                                            )}

                                                                            {/* MJ Prompt */}
                                                                            {scene.keyframes?.[0]?.mj_prompt && (
                                                                                <div className={`p-2 rounded ${theme === 'dark' ? 'bg-zinc-700 border border-zinc-600' : 'bg-zinc-50 border border-gray-300'}`}>
                                                                                    <h6 className={`text-[10px] font-semibold mb-1 flex items-center gap-1 ${theme === 'dark' ? 'text-green-300' : 'text-green-700'}`}><Code size={10} /> MJ Prompt</h6>
                                                                                    <p
                                                                                        className={`text-[10px] whitespace-pre-wrap select-text cursor-text ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'}`}
                                                                                        onMouseDown={(e) => e.stopPropagation()}
                                                                                    >{scene.keyframes[0].mj_prompt}</p>
                                                                                    <button onClick={() => navigator.clipboard.writeText(scene.keyframes[0].mj_prompt)} className="mt-1 flex items-center text-[9px] text-blue-400 hover:text-blue-300" onMouseDown={(e) => e.stopPropagation()}>
                                                                                        <ClipboardCopy size={10} className="mr-1" /> 复制
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 结果展示区 (Manual 模式) */}
                                                    {(node.settings?.analysisMode || 'manual') === 'manual' && node.analysisResults && node.analysisResults.length > 0 ? (
                                                        <div className="space-y-3 flex-1 flex flex-col min-h-0">
                                                            <div className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 shrink-0">拆解提示词 ({node.analysisResults.length} 个场景)</div>
                                                            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar min-h-0">
                                                                {node.analysisResults.map((result, idx) => {
                                                                    // 获取关键帧对应的图片URL（从videoInputNode的frames或selectedKeyframes中查找）
                                                                    const getFrameImageUrl = (frameTime) => {
                                                                        // 先从selectedKeyframes中查找
                                                                        const selectedFrame = videoInputNode.selectedKeyframes?.find(f => Math.abs(f.time - frameTime) < 0.1);
                                                                        if (selectedFrame) return selectedFrame.url;
                                                                        // 再从frames中查找
                                                                        const frame = videoInputNode.frames?.find(f => Math.abs(f.time - frameTime) < 0.1);
                                                                        return frame?.url || null;
                                                                    };

                                                                    // 获取当前场景的主要关键帧（prev/current/next）
                                                                    const currentKeyframe = result.keyframes?.find(k => k.type === 'current') || result.keyframes?.[0];
                                                                    const prevKeyframe = result.keyframes?.find(k => k.type === 'prev');
                                                                    const nextKeyframe = result.keyframes?.find(k => k.type === 'next');

                                                                    // 获取简短描述（使用current的描述，如果没有则使用第一个）
                                                                    const shortDescription = currentKeyframe?.description || result.keyframes?.[0]?.description || '无描述';

                                                                    return (
                                                                        <div
                                                                            key={idx}
                                                                            className={`p-3 rounded-lg border ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-300'}`}
                                                                        >
                                                                            {/* 场景标题和时间区间 */}
                                                                            <div className="flex items-center justify-between mb-2">
                                                                                <div className="font-medium text-[11px] text-zinc-800 dark:text-zinc-200">
                                                                                    场景 {result.scene_index || idx + 1}
                                                                                </div>
                                                                                <div className="text-[10px] text-zinc-500">
                                                                                    {result.time_range}
                                                                                </div>
                                                                            </div>

                                                                            {/* 简短描述 */}
                                                                            <div
                                                                                className="text-[10px] text-zinc-600 dark:text-zinc-400 mb-3 line-clamp-2 select-text cursor-text"
                                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                            >
                                                                                {shortDescription}
                                                                            </div>

                                                                            {/* 关键帧缩略图 */}
                                                                            <div className="grid grid-cols-3 gap-2 mb-3">
                                                                                {[prevKeyframe, currentKeyframe, nextKeyframe].map((kf, kfIdx) => {
                                                                                    if (!kf) return <div key={kfIdx} className="aspect-video bg-zinc-200 dark:bg-zinc-700 rounded"></div>;
                                                                                    const imageUrl = getFrameImageUrl(kf.time);
                                                                                    return (
                                                                                        <div key={kfIdx} className="relative aspect-video bg-black rounded overflow-hidden">
                                                                                            {imageUrl ? (
                                                                                                <img src={imageUrl} className="w-full h-full object-cover" alt={`关键帧 ${kfIdx + 1}`} loading="lazy" />
                                                                                            ) : (
                                                                                                <div className="w-full h-full flex items-center justify-center text-[8px] text-zinc-500">
                                                                                                    {kf.type === 'prev' ? '上一帧' : kf.type === 'current' ? '当前帧' : '下一帧'}
                                                                                                </div>
                                                                                            )}
                                                                                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] px-1 py-0.5 text-center">
                                                                                                {kf.time.toFixed(1)}s
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>

                                                                            {/* 提示词列表 */}
                                                                            <div className="space-y-2">
                                                                                {result.keyframes?.map((kf, kfIdx) => (
                                                                                    <div key={kfIdx} className="space-y-1.5">
                                                                                        <div className="text-[9px] text-zinc-500">
                                                                                            {kf.type === 'prev' ? '上一帧' : kf.type === 'current' ? '当前帧' : '下一帧'} ({kf.time.toFixed(1)}s)
                                                                                        </div>

                                                                                        {/* MJ 提示词 */}
                                                                                        {kf.mj_prompt && (
                                                                                            <div className={`p-2 rounded border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-600' : 'bg-zinc-50 border-zinc-200'}`}>
                                                                                                <div className="flex items-start justify-between gap-2">
                                                                                                    <div className="flex-1">
                                                                                                        <div className="text-[9px] text-zinc-500 mb-1">Midjourney 提示词</div>
                                                                                                        <div
                                                                                                            className="text-[10px] text-zinc-700 dark:text-zinc-300 break-words select-text cursor-text"
                                                                                                            onMouseDown={(e) => e.stopPropagation()}
                                                                                                        >{kf.mj_prompt}</div>
                                                                                                    </div>
                                                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                                                        <button
                                                                                                            onClick={async () => {
                                                                                                                try {
                                                                                                                    await navigator.clipboard.writeText(kf.mj_prompt);
                                                                                                                    alert('已复制到剪贴板');
                                                                                                                } catch (e) {
                                                                                                                    alert('复制失败');
                                                                                                                }
                                                                                                            }}
                                                                                                            className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors ${theme === 'dark' ? 'text-zinc-400 hover:text-zinc-300' : 'text-zinc-500 hover:text-zinc-700'}`}
                                                                                                            onMouseDown={(e) => e.stopPropagation()}
                                                                                                            title="复制"
                                                                                                        >
                                                                                                            <CopyPlus size={12} />
                                                                                                        </button>
                                                                                                        <button
                                                                                                            onClick={() => {
                                                                                                                // node.x/node.y 为 world 坐标，不能再 screenToWorld
                                                                                                                const worldX = node.x + node.width + 100;
                                                                                                                const worldY = node.y + node.height / 2;
                                                                                                                const newNodeId = `node-${Date.now()}`;

                                                                                                                // 创建图生图节点
                                                                                                                const genImageNode = {
                                                                                                                    id: newNodeId,
                                                                                                                    type: 'gen-image',
                                                                                                                    x: worldX - 180,
                                                                                                                    y: worldY - 170,
                                                                                                                    width: 360,
                                                                                                                    height: 340,
                                                                                                                    settings: {
                                                                                                                        model: 'mj-v6',
                                                                                                                        prompt: kf.mj_prompt,
                                                                                                                        ratio: 'Auto',
                                                                                                                        resolution: 'Auto'
                                                                                                                    }
                                                                                                                };

                                                                                                                setNodes((prev) => [...prev, genImageNode]);

                                                                                                                // 创建预览节点并连接
                                                                                                                setTimeout(() => {
                                                                                                                    const previewWorldX = node.x + node.width + 200;
                                                                                                                    const previewWorldY = node.y + node.height / 2;
                                                                                                                    const previewNodeId = `node-${Date.now() + 1}`;
                                                                                                                    const previewNode = {
                                                                                                                        id: previewNodeId,
                                                                                                                        type: 'preview',
                                                                                                                        x: previewWorldX - 160,
                                                                                                                        y: previewWorldY - 130,
                                                                                                                        width: 320,
                                                                                                                        height: 260
                                                                                                                    };

                                                                                                                    setNodes((prev) => [...prev, previewNode]);

                                                                                                                    // 连接图生图节点到预览节点
                                                                                                                    setConnections((prev) => [...prev, {
                                                                                                                        id: `conn-${Date.now()}`,
                                                                                                                        from: newNodeId,
                                                                                                                        to: previewNodeId
                                                                                                                    }]);
                                                                                                                }, 50);
                                                                                                            }}
                                                                                                            className={`p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-blue-600 dark:text-blue-400`}
                                                                                                            onMouseDown={(e) => e.stopPropagation()}
                                                                                                            title="生成图生图节点"
                                                                                                        >
                                                                                                            <ImagePlus size={12} />
                                                                                                        </button>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        )}

                                                                                        {/* 即梦提示词 */}
                                                                                        {kf.jimeng_prompt && (
                                                                                            <div className={`p-2 rounded border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-600' : 'bg-zinc-50 border-zinc-200'}`}>
                                                                                                <div className="flex items-start justify-between gap-2">
                                                                                                    <div className="flex-1">
                                                                                                        <div className="text-[9px] text-zinc-500 mb-1">即梦提示词</div>
                                                                                                        <div
                                                                                                            className="text-[10px] text-zinc-700 dark:text-zinc-300 break-words select-text cursor-text"
                                                                                                            onMouseDown={(e) => e.stopPropagation()}
                                                                                                        >{kf.jimeng_prompt}</div>
                                                                                                    </div>
                                                                                                    <button
                                                                                                        onClick={async () => {
                                                                                                            try {
                                                                                                                await navigator.clipboard.writeText(kf.jimeng_prompt);
                                                                                                                alert('已复制到剪贴板');
                                                                                                            } catch (e) {
                                                                                                                alert('复制失败');
                                                                                                            }
                                                                                                        }}
                                                                                                        className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors ${theme === 'dark' ? 'text-zinc-400 hover:text-zinc-300' : 'text-zinc-500 hover:text-zinc-700'}`}
                                                                                                        onMouseDown={(e) => e.stopPropagation()}
                                                                                                        title="复制"
                                                                                                    >
                                                                                                        <CopyPlus size={12} />
                                                                                                    </button>
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                ))}
                                                                            </div>

                                                                            {/* 全局标签 */}
                                                                            {result.global_tags && (
                                                                                <div className="mt-2 pt-2 border-t border-zinc-300 dark:border-zinc-700">
                                                                                    <div className="text-[9px] text-zinc-500 mb-1">全局标签</div>
                                                                                    <div className="flex flex-wrap gap-1">
                                                                                        {Object.entries(result.global_tags).map(([key, values]) => (
                                                                                            Array.isArray(values) && values.map((val, valIdx) => (
                                                                                                <span key={`${key}-${valIdx}`} className="text-[8px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                                                                                    {val}
                                                                                                </span>
                                                                                            ))
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}

                            {node.type === 'storyboard-node' && (() => {
                                // --- 辅助函数：处理单个镜头的图片上传 ---
                                const handleShotImageUpload = (e, shotId) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onload = (ev) => updateShot(node.id, shotId, { image_url: ev.target.result });
                                        reader.readAsDataURL(file);
                                    }
                                };

                                // --- 辅助函数：处理单个镜头的粘贴 (Ctrl+V) ---
                                const handleShotPaste = (e, shotId) => {
                                    const items = e.clipboardData.items;
                                    for (let i = 0; i < items.length; i++) {
                                        if (items[i].type.indexOf('image') !== -1) {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const blob = items[i].getAsFile();
                                            const reader = new FileReader();
                                            reader.onload = (ev) => updateShot(node.id, shotId, { image_url: ev.target.result });
                                            reader.readAsDataURL(blob);
                                            return;
                                        }
                                    }
                                };

                                // --- 辅助函数：处理单个镜头的拖拽 (Drop) ---
                                const handleShotDrop = (e, shotId) => {
                                    e.preventDefault();
                                    e.stopPropagation();

                                    // 1. 尝试从浏览器外部拖入文件
                                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                        const file = e.dataTransfer.files[0];
                                        if (file.type.startsWith('image/')) {
                                            const reader = new FileReader();
                                            reader.onload = (ev) => updateShot(node.id, shotId, { image_url: ev.target.result });
                                            reader.readAsDataURL(file);
                                            return;
                                        }
                                    }

                                    // 2. 尝试从左侧历史记录拖入 (需要配合你在 Sidebar 设置的 dataTransfer)
                                    // 这里假设历史记录拖拽时没有传递复杂数据，通常较难直接拦截 React 组件间的拖拽
                                    // 建议使用上面的"本地上传"或"粘贴"作为主要交互
                                };

                                return (
                                    <div
                                        className={`flex flex-col h-full rounded-xl overflow-hidden pointer-events-auto transition-colors ${
                                        theme === 'dark' ? 'bg-zinc-950 border border-zinc-800' : 'bg-white border border-zinc-300 shadow-sm'
                                        }`}
                                        onMouseEnter={() => setIsMouseOverStoryboard(true)}
                                        onMouseLeave={() => setIsMouseOverStoryboard(false)}
                                    >
                                        {/* Header */}
                                        <div className={`px-4 py-3 border-b flex justify-between items-center shrink-0 ${
                                            theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                                        }`}>
                                            <div className="flex items-center gap-2">
                                                <LayoutGrid size={16} className="text-purple-500"/>
                                                <span className={`font-bold text-xs ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'}`}>
                                                    {node.settings?.projectTitle || '智能分镜表'}
                                                </span>
                                            </div>
                                            {getConnectedVideoAnalyzeNode(node.id) && (
                                                <button
                                                    onClick={() => importShotsFromAnalysis(node.id)}
                                                    className="text-xs bg-blue-600 px-2 py-1 rounded text-white hover:bg-blue-500 transition-colors shadow-sm"
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                >
                                                    同步分析结果
                                                </button>
                                            )}
                                        </div>

                                        {/* List */}
                                        <div
                                            className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3 min-h-0 bg-opacity-50"
                                            onWheel={(e) => {
                                                e.stopPropagation();
                                            }}
                                        >
                                            {node.settings?.shots?.length > 0 ? (
                                                node.settings.shots.map((shot, idx) => {
                                                    const isActiveShot = activeShot?.nodeId === node.id && activeShot?.shotId === shot.id;
                                                    return (
                                                    <div
                                                        key={shot.id}
                                                        tabIndex={0} // 允许聚焦以响应键盘事件
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // 防止触发节点选择
                                                            setActiveShot({ nodeId: node.id, shotId: shot.id });
                                                            e.currentTarget.focus(); // 关键：点击行即聚焦，激活粘贴
                                                        }}
                                                        onPaste={(e) => handleShotPaste(e, shot.id)} // 关键：在行级别监听粘贴
                                                        className={`flex gap-3 p-3 rounded-lg border transition-all group/shot cursor-pointer outline-none focus:ring-2 focus:ring-blue-500/50 ${
                                                            isActiveShot
                                                                ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-500/5 z-10'
                                                                : theme === 'dark'
                                                                    ? 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-600'
                                                                    : 'bg-white border-zinc-200 hover:border-blue-300 hover:shadow-md'
                                                        }`}
                                                    >
                                                        {/* Index */}
                                                        <div className={`font-mono text-sm w-6 shrink-0 flex items-start pt-1 font-bold ${
                                                            theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400'
                                                        }`}>{idx + 1}</div>

                                                        {/* Video/Image Preview with Interaction */}
                                                        <div
                                                            className={`w-32 aspect-video rounded border relative group overflow-hidden shrink-0 transition-colors ${
                                                                theme === 'dark' ? 'bg-black border-zinc-800' : 'bg-zinc-100 border-zinc-300'
                                                            }`}
                                                            onClick={(e) => {
                                                                e.stopPropagation(); // 防止触发行选择
                                                            }}
                                                            onDrop={(e) => handleShotDrop(e, shot.id)}
                                                            onDragOver={(e) => e.preventDefault()}
                                                        >
                                                            {/* 视频预览（优先显示） */}
                                                            {shot.video_url ? (
                                                                <>
                                                                    <video
                                                                        src={shot.video_url}
                                                                        className="w-full h-full object-cover rounded"
                                                                        controls
                                                                        onMouseDown={(e) => e.stopPropagation()}
                                                                    />
                                                                    {/* 清除/重新生成按钮 */}
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            updateShot(node.id, shot.id, { video_url: '', status: 'draft' });
                                                                        }}
                                                                        className={`absolute top-1 right-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                                                                            theme === 'dark'
                                                                                ? 'bg-black/60 hover:bg-red-600 text-white'
                                                                                : 'bg-white/80 hover:bg-red-500 text-white'
                                                                        }`}
                                                                        title="清除视频"
                                                                    >
                                                                        <X size={10} />
                                                                    </button>
                                                                </>
                                                            ) : shot.status === 'generating' ? (
                                                                /* 生成中状态 */
                                                                <div className={`w-full h-full flex flex-col items-center justify-center text-[10px] gap-2 ${
                                                                    theme === 'dark' ? 'bg-zinc-900 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
                                                                }`}>
                                                                    <Loader2 size={20} className="animate-spin text-blue-500" />
                                                                    <span>视频生成中...</span>
                                                                </div>
                                                            ) : shot.image_url ? (
                                                                /* 图片预览（作为参考图） */
                                                                <>
                                                                    <img src={shot.image_url} className="w-full h-full object-cover" alt={`镜头 ${idx + 1}`} />
                                                                    {/* 删除按钮 UI */}
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            updateShot(node.id, shot.id, { image_url: '' });
                                                                        }}
                                                                        className={`absolute top-1 right-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                                                                            theme === 'dark'
                                                                                ? 'bg-black/60 hover:bg-red-600 text-white'
                                                                                : 'bg-white/80 hover:bg-red-500 text-white'
                                                                        }`}
                                                                        title="移除图片"
                                                                    >
                                                                        <X size={10} />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                /* 默认状态：显示占位符 */
                                                                <div className={`w-full h-full flex flex-col items-center justify-center text-[10px] gap-1 ${
                                                                    theme === 'dark' ? 'text-zinc-700' : 'text-zinc-400'
                                                                }`}>
                                                                    <ImagePlus size={14}/>
                                                                    <span>点击粘贴/拖入</span>
                                                                </div>
                                                            )}

                                                            {/* Hover Overlay for Upload（仅在无视频和图片时显示） */}
                                                            {!shot.video_url && !shot.image_url && (
                                                                <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs transition-opacity cursor-pointer">
                                                                    <span className="flex flex-col items-center gap-1">
                                                                        <FolderOpen size={14}/>
                                                                        选择图片
                                                                    </span>
                                                                    <input
                                                                        type="file"
                                                                        className="hidden"
                                                                        accept="image/*"
                                                                        onChange={(e) => handleShotImageUpload(e, shot.id)}
                                                                    />
                                                                </label>
                                                            )}
                                                        </div>

                                                        {/* Content */}
                                                        <div className="flex-1 min-w-0 flex flex-col gap-2">
                                                            {/* Control Bar: Model, Ratio, Duration */}
                                                            <div className="flex gap-2 items-center flex-wrap">
                                                                {/* Video Model Select */}
                                                                <select
                                                                    value={shot.model || (apiConfigs.find(c => c.type === 'Video' && c.id === 'sora-2')?.id || apiConfigs.find(c => c.type === 'Video')?.id || '')}
                                                                    onChange={(e) => {
                                                                        const newModel = e.target.value;
                                                                        const config = apiConfigs.find(c => c.id === newModel);
                                                                        const defaultDuration = getDefaultDurationForModel(newModel);
                                                                        updateShot(node.id, shot.id, {
                                                                            model: newModel,
                                                                            duration: shot.duration || defaultDuration
                                                                        });
                                                                    }}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    onMouseDown={(e) => e.stopPropagation()}
                                                                    className={`text-xs px-2 py-1 rounded border outline-none transition-colors ${
                                                                        theme === 'dark'
                                                                            ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:border-zinc-600'
                                                                            : 'bg-white border-zinc-300 text-zinc-800 hover:border-zinc-400'
                                                                    }`}
                                                                >
                                                                    {apiConfigs.filter(c => c.type === 'Video').map(config => (
                                                                        <option key={config.id} value={config.id}>
                                                                            {config.provider || config.modelName || config.id}
                                                                        </option>
                                                                    ))}
                                                                </select>

                                                                {/* Ratio Select */}
                                                                <select
                                                                    value={shot.ratio || '16:9'}
                                                                    onChange={(e) => updateShot(node.id, shot.id, { ratio: e.target.value })}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    onMouseDown={(e) => e.stopPropagation()}
                                                                    className={`text-xs px-2 py-1 rounded border outline-none transition-colors ${
                                                                        theme === 'dark'
                                                                            ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:border-zinc-600'
                                                                            : 'bg-white border-zinc-300 text-zinc-800 hover:border-zinc-400'
                                                                    }`}
                                                                >
                                                                    {['16:9', '9:16', '1:1', '4:3', '3:4'].map(ratio => (
                                                                        <option key={ratio} value={ratio}>{ratio}</option>
                                                                    ))}
                                                                </select>

                                                                {/* Duration Select */}
                                                                {(() => {
                                                                    const currentModel = shot.model || (apiConfigs.find(c => c.type === 'Video' && c.id === 'sora-2')?.id || apiConfigs.find(c => c.type === 'Video')?.id || '');
                                                                    const config = apiConfigs.find(c => c.id === currentModel);
                                                                    const availableDurations = config?.durations || getDefaultDurationsForModel(currentModel);
                                                                    const defaultDuration = getDefaultDurationForModel(currentModel);
                                                                    return (
                                                                        <select
                                                                            value={shot.duration || defaultDuration}
                                                                            onChange={(e) => updateShot(node.id, shot.id, { duration: e.target.value })}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            onMouseDown={(e) => e.stopPropagation()}
                                                                            className={`text-xs px-2 py-1 rounded border outline-none transition-colors ${
                                                                                theme === 'dark'
                                                                                    ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:border-zinc-600'
                                                                                    : 'bg-white border-zinc-300 text-zinc-800 hover:border-zinc-400'
                                                                            }`}
                                                                        >
                                                                            {availableDurations.map(duration => (
                                                                                <option key={duration} value={duration}>{duration}</option>
                                                                            ))}
                                                                        </select>
                                                                    );
                                                                })()}
                                                            </div>

                                                            <textarea
                                                                className={`text-sm outline-none resize-none bg-transparent transition-all ${
                                                                    theme === 'dark'
                                                                        ? 'text-zinc-200 placeholder:text-zinc-700'
                                                                        : 'text-zinc-800 placeholder:text-zinc-400'
                                                                }`}
                                                                value={shot.description || ''}
                                                                placeholder="画面描述..."
                                                                onChange={(e) => updateShot(node.id, shot.id, { description: e.target.value })}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    // 确保点击文本框时也激活卡片
                                                                    if (!isActiveShot) {
                                                                        setActiveShot({ nodeId: node.id, shotId: shot.id });
                                                                    }
                                                                }}
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                onFocus={(e) => {
                                                                    e.stopPropagation();
                                                                    // 确保聚焦时激活卡片
                                                                    if (!isActiveShot) {
                                                                        setActiveShot({ nodeId: node.id, shotId: shot.id });
                                                                    }
                                                                }}
                                                                onInput={(e) => {
                                                                    // 输入时自动调整高度（仅在激活状态下）
                                                                    if (isActiveShot) {
                                                                        e.currentTarget.style.height = 'auto';
                                                                        e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                                                                    }
                                                                }}
                                                                ref={(el) => {
                                                                    // 当卡片激活时，自动调整高度以显示所有内容
                                                                    if (el && isActiveShot) {
                                                                        el.style.height = 'auto';
                                                                        el.style.height = el.scrollHeight + 'px';
                                                                    }
                                                                }}
                                                                style={{
                                                                    minHeight: isActiveShot ? '8rem' : '2.5rem',
                                                                    height: isActiveShot ? 'auto' : '2.5rem',
                                                                    transition: 'all 0.2s ease-in-out'
                                                                }}
                                                            />
                                                            <div className={`p-2 rounded text-xs font-mono border transition-all relative ${
                                                                theme === 'dark'
                                                                    ? 'bg-zinc-950 border-zinc-800 text-zinc-400'
                                                                    : 'bg-zinc-50 border-zinc-200 text-zinc-600'
                                                            }`}
                                                            style={{
                                                                minHeight: isActiveShot ? '8rem' : '2rem',
                                                                transition: 'all 0.2s ease-in-out'
                                                            }}>
                                                                <textarea
                                                                    className="w-full bg-transparent outline-none resize-none placeholder:text-opacity-50 transition-all pr-8"
                                                                    value={shot.prompt || ''}
                                                                    placeholder="等待生成提示词..."
                                                                    onChange={(e) => updateShot(node.id, shot.id, { prompt: e.target.value })}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        // 确保点击文本框时也激活卡片
                                                                        if (!isActiveShot) {
                                                                            setActiveShot({ nodeId: node.id, shotId: shot.id });
                                                                        }
                                                                    }}
                                                                    onMouseDown={(e) => e.stopPropagation()}
                                                                    onFocus={(e) => {
                                                                        e.stopPropagation();
                                                                        // 确保聚焦时激活卡片
                                                                        if (!isActiveShot) {
                                                                            setActiveShot({ nodeId: node.id, shotId: shot.id });
                                                                        }
                                                                    }}
                                                                    onInput={(e) => {
                                                                        // 输入时自动调整高度（仅在激活状态下）
                                                                        if (isActiveShot) {
                                                                            e.currentTarget.style.height = 'auto';
                                                                            e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                                                                        }
                                                                    }}
                                                                    ref={(el) => {
                                                                        // 当卡片激活时，自动调整高度以显示所有内容
                                                                        if (el && isActiveShot) {
                                                                            el.style.height = 'auto';
                                                                            el.style.height = el.scrollHeight + 'px';
                                                                        }
                                                                    }}
                                                                    style={{
                                                                        minHeight: isActiveShot ? '8rem' : '2rem',
                                                                        height: isActiveShot ? 'auto' : '2rem',
                                                                        transition: 'all 0.2s ease-in-out'
                                                                    }}
                                                                />
                                                                {(shot.model === 'sora-2' || shot.model === 'sora-2-pro') && characterLibrary.length > 0 && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setCharactersOpen(true);
                                                                        }}
                                                                        className={`absolute top-2 right-2 p-1 rounded transition-colors ${
                                                                            theme === 'dark'
                                                                                ? 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
                                                                                : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200'
                                                                        }`}
                                                                        title="插入角色"
                                                                    >
                                                                        <Users size={12} />
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {/* 角色引用栏 (仅 Sora 模型) */}
                                                            {(() => {
                                                                const currentModel = shot.model || '';
                                                                const isSora = currentModel && (currentModel.includes('sora') || currentModel === 'sora-2' || currentModel === 'sora-2-pro');

                                                                if (!isSora || characterLibrary.length === 0) return null;

                                                                const currentPrompt = shot.prompt || '';
                                                                const expandKey = `${node.id}-${shot.id}`;
                                                                const isExpanded = characterReferenceBarExpanded[expandKey] || false;
                                                                const maxVisible = 5; // 最多显示5个角色，超过则显示展开按钮
                                                                const shouldShowExpand = characterLibrary.length > maxVisible;

                                                                return (
                                                                    <div className="border-t border-dashed mt-1" style={{
                                                                        borderColor: theme === 'dark' ? 'rgba(63, 63, 70, 0.5)' : 'rgba(161, 161, 170, 0.5)'
                                                                    }}>
                                                                        <div className="flex items-center justify-between py-1 px-1">
                                                                            <div className="flex gap-2 overflow-x-auto py-2 flex-1 custom-scrollbar">
                                                                                {(isExpanded ? characterLibrary : characterLibrary.slice(0, maxVisible)).map(char => {
                                                                            const tag = `@${char.username}`;
                                                                            const isActive = currentPrompt.includes(tag);

                                                                            return (
                                                                                <button
                                                                                    key={char.id}
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        let newPrompt = currentPrompt || '';
                                                                                        if (isActive) {
                                                                                            // 移除标签，并清理多余空格
                                                                                            newPrompt = newPrompt.replace(tag, '').replace(/\s{2,}/g, ' ').trim();
                                                                                        } else {
                                                                                            // 添加标签到末尾（前后加空格）
                                                                                            newPrompt = newPrompt.trim();
                                                                                            newPrompt = newPrompt ? `${newPrompt} ${tag} ` : `${tag} `;
                                                                                        }
                                                                                        updateShot(node.id, shot.id, { prompt: newPrompt });
                                                                                    }}
                                                                                    className={`relative shrink-0 transition-all ${isActive ? 'scale-110' : 'opacity-70 hover:opacity-100'}`}
                                                                                    title={char.username}
                                                                                >
                                                                                    <img
                                                                                        src={char.profile_picture_url || ''}
                                                                                        alt={char.username}
                                                                                        className={`w-8 h-8 rounded-full object-cover border-2 ${
                                                                                            isActive
                                                                                                ? 'border-blue-500 ring-2 ring-blue-500'
                                                                                                : 'border-transparent'
                                                                                        }`}
                                                                                        onError={(e) => {
                                                                                            e.target.style.display = 'none';
                                                                                        }}
                                                                                    />
                                                                                    {/* 右下角显示小的链接图标表示可用 */}
                                                                                    <div className="absolute -bottom-0.5 -right-0.5 bg-black/50 rounded-full p-0.5">
                                                                                        <LinkIcon size={8} className="text-green-400" />
                                                                                    </div>
                                                                                </button>
                                                                            );
                                                                        })}
                                                                            </div>
                                                                            {shouldShowExpand && (
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        if (isExpanded) {
                                                                                            // 收起：关闭展开状态
                                                                                            setCharacterReferenceBarExpanded(prev => {
                                                                                                const updated = { ...prev };
                                                                                                delete updated[expandKey];
                                                                                                return updated;
                                                                                            });
                                                                                        } else {
                                                                                            // 展开：打开角色库侧边栏
                                                                                            setCharactersOpen(true);
                                                                                            setCharacterReferenceBarExpanded(prev => ({ ...prev, [expandKey]: true }));
                                                                                        }
                                                                                    }}
                                                                                    className={`shrink-0 px-2 py-1 text-[10px] rounded transition-colors ml-2 ${
                                                                                        theme === 'dark'
                                                                                            ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                                                                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                                                                    }`}
                                                                                    title={isExpanded ? "收起" : "打开角色库"}
                                                                                >
                                                                                    {isExpanded ? '收起' : `+${characterLibrary.length - maxVisible}`}
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}

                                                            <div className="flex gap-1 flex-wrap items-center mt-1">
                                                                {shot.tags?.map((tag, tagIdx) => (
                                                                    <span key={tagIdx} className={`px-1.5 py-0.5 text-[10px] rounded border ${
                                                                        theme === 'dark'
                                                                            ? 'bg-blue-900/30 text-blue-300 border-blue-800'
                                                                            : 'bg-blue-50 text-blue-600 border-blue-200'
                                                                    }`}>{tag}</span>
                                                                ))}
                                                                {shot.camera && (
                                                                    <span className={`px-1.5 py-0.5 text-[10px] rounded border flex items-center gap-1 ${
                                                                        theme === 'dark'
                                                                            ? 'bg-purple-900/30 text-purple-300 border-purple-800'
                                                                            : 'bg-purple-50 text-purple-600 border-purple-200'
                                                                    }`}>
                                                                        <Video size={8} /> {shot.camera}
                                                                    </span>
                                                                )}
                                                                {shot.time_range && (
                                                                    <span className={`text-[10px] ml-auto font-mono ${
                                                                        theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400'
                                                                    }`}>{shot.time_range}</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className={`flex flex-col gap-2 justify-center border-l pl-2 shrink-0 ${
                                                            theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'
                                                        }`}>
                                                            <button
                                                                onClick={() => generateSingleShot(node.id, shot)}
                                                                className={`p-1.5 rounded text-white shadow-sm transition-all active:scale-95 ${
                                                                    shot.status === 'generating'
                                                                        ? 'bg-zinc-500 cursor-not-allowed'
                                                                        : 'bg-green-600 hover:bg-green-500'
                                                                }`}
                                                                title="生成此镜头"
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                disabled={shot.status === 'generating'}
                                                            >
                                                                {shot.status === 'generating' ? (
                                                                    <Loader2 size={14} className="animate-spin" />
                                                                ) : (
                                                                    <Play size={14} fill="currentColor"/>
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={() => deleteShot(node.id, shot.id)}
                                                                className={`p-1.5 transition-colors ${
                                                                    theme === 'dark'
                                                                        ? 'text-zinc-600 hover:text-red-500'
                                                                        : 'text-zinc-400 hover:text-red-600'
                                                                }`}
                                                                title="删除镜头"
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    );
                                                })
                                            ) : (
                                                <div className={`flex flex-col items-center justify-center h-40 gap-3 rounded-lg border-2 border-dashed ${
                                                    theme === 'dark' ? 'border-zinc-800 text-zinc-600' : 'border-zinc-300 text-zinc-400'
                                                }`}>
                                                    <LayoutGrid size={32} className="opacity-50" />
                                                    <span className="text-xs">暂无分镜，请添加或同步分析结果</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Footer */}
                                        <div className={`p-3 border-t shrink-0 ${
                                            theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                                        }`}>
                                            <button
                                                onClick={() => addEmptyShot(node.id)}
                                                className={`w-full py-2 border border-dashed text-xs rounded transition-colors flex items-center justify-center gap-2 ${
                                                    theme === 'dark'
                                                        ? 'border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                                                        : 'border-zinc-300 text-zinc-500 hover:bg-white hover:text-blue-600 hover:border-blue-400'
                                                }`}
                                                onMouseDown={(e) => e.stopPropagation()}
                                            >
                                                <Plus size={14} /> 添加空白镜头
                                            </button>
                                        </div>
                                    </div>
                                );
                            })()}

                            {node.type === 'image-compare' && (
                                <div className="w-full h-full pointer-events-auto">
                                    <ImageCompareView
                                        img1={connectedImages[0]}
                                        img2={connectedImages[1]}
                                    />
                                </div>
                            )}

                            {node.type === 'preview' && (() => {
                                // 获取预览内容：优先使用连接的图片，其次使用node.content
                                const previewConnectedImages = connectedImages.length > 0 ? connectedImages : [];
                                const hasContent = node.content || (node.previewMjImages && node.previewMjImages.length > 0) || previewConnectedImages.length > 0;
                                const allPreviewImages = node.previewMjImages && node.previewMjImages.length > 0
                                    ? node.previewMjImages
                                    : previewConnectedImages.length > 0
                                        ? previewConnectedImages
                                        : (node.content ? [node.content] : []);
                                // 优先使用连接的图片，其次使用node.content
                                const primaryPreviewUrl = previewConnectedImages.length > 0
                                    ? previewConnectedImages[0]
                                    : (node.content || (allPreviewImages.length > 0 ? allPreviewImages[0] : null));
                                const isMultiImage = allPreviewImages.length > 1;
                                const hasVideo = allPreviewImages.some(url => isVideoUrl(url));

                                return (
                                <div className="flex flex-col h-full pointer-events-auto">
                                    <div
                                        className={`flex items-center justify-between px-3 py-2 border-b text-xs font-semibold ${
                                            theme === 'dark'
                                                ? 'border-zinc-800 text-zinc-200'
                                                : 'border-zinc-200 text-zinc-700'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <Maximize2 size={13} className="text-blue-500" />
                                            <span>预览窗口</span>
                                        </div>
                                        <span className="text-[10px] text-zinc-500">
                                            {hasVideo ? '视频预览' : isMultiImage ? `${allPreviewImages.length}张图片` : '图片预览'}
                                        </span>
                                    </div>
                                    <div className="flex-1 flex flex-col p-2 gap-2 min-h-0">
                                        <div
                                            className={`relative flex-1 rounded-lg overflow-hidden flex items-center justify-center min-h-0 ${
                                                theme === 'dark' ? 'bg-zinc-900' : 'bg-zinc-100'
                                            }`}
                                            onContextMenu={(e) => {
                                                if (primaryPreviewUrl) {
                                                    handlePreviewRightClick(e, { url: primaryPreviewUrl, type: node.previewType || (isVideoUrl(primaryPreviewUrl) ? 'video' : 'image'), sourceNode: node });
                                                }
                                            }}
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                if (primaryPreviewUrl) {
                                                    setLightboxItem({ url: primaryPreviewUrl, type: node.previewType || (isVideoUrl(primaryPreviewUrl) ? 'video' : 'image') });
                                                }
                                            }}
                                        >
                                            {hasContent ? (
                                                isVideoUrl(primaryPreviewUrl) || node.previewType === 'video' ? (
                                                    <video
                                                        src={primaryPreviewUrl}
                                                        className="w-full h-full object-contain bg-black"
                                                        controls
                                                        draggable={false}
                                                    />
                                                ) : isMultiImage ? (
                                                    // 多张图片网格显示（支持连接的多图和即梦回传的四张图）
                                                    <div className={`w-full h-full grid gap-0.5 p-0.5 ${allPreviewImages.length === 4 ? 'grid-cols-2 grid-rows-2' : allPreviewImages.length <= 2 ? 'grid-cols-2' : 'grid-cols-2'}`} style={{ gridAutoRows: allPreviewImages.length > 4 ? 'minmax(0, 1fr)' : undefined }}>
                                                        {allPreviewImages.map((imgUrl, idx) => {
                                                            const isSelected = node.selectedPreviewImage === imgUrl || (!node.selectedPreviewImage && idx === 0);
                                                            return (
                                                            <div
                                                                key={idx}
                                                                className={`relative w-full h-full overflow-hidden bg-black flex items-center justify-center group cursor-pointer transition-all ${
                                                                    isSelected ? 'ring-2 ring-blue-500 ring-inset' : 'hover:ring-1 hover:ring-white/30 hover:ring-inset'
                                                                }`}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    // 选择此图片作为输出
                                                                    setNodes(prev => prev.map(n =>
                                                                        n.id === node.id
                                                                            ? { ...n, selectedPreviewImage: imgUrl }
                                                                            : n
                                                                    ));
                                                                }}
                                                            >
                                                                {/* 选中标记 */}
                                                                {isSelected && (
                                                                    <div className="absolute top-1 left-1 z-30 bg-blue-500 text-white text-[9px] px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                                                                        <Check size={10} />
                                                                        引用
                                                                    </div>
                                                                )}
                                                                {/* 序号标记 */}
                                                                <div className={`absolute top-1 right-1 z-30 text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                                                    isSelected
                                                                        ? 'bg-blue-500/80 text-white'
                                                                        : theme === 'dark' ? 'bg-black/60 text-white/70' : 'bg-white/60 text-zinc-700'
                                                                }`}>
                                                                    {idx + 1}
                                                                </div>
                                                                <img
                                                                    src={imgUrl}
                                                                    className="max-w-full max-h-full w-auto h-auto object-contain"
                                                                    alt={`预览图 ${idx + 1}`}
                                                                    draggable={false}
                                                                    style={{
                                                                        imageRendering: view.zoom < 1 ? 'crisp-edges' : 'auto',
                                                                        WebkitFontSmoothing: 'antialiased',
                                                                        transform: 'translateZ(0)',
                                                                        backfaceVisibility: 'hidden'
                                                                    }}
                                                                    onError={(e) => {
                                                                        console.error(`预览图片 ${idx + 1} 加载失败`);
                                                                        e.target.style.display = 'none';
                                                                    }}
                                                                    onLoad={(e) => {
                                                                        // 图片加载后，根据实际尺寸自适应
                                                                        const img = e.target;
                                                                        const container = img.parentElement;
                                                                        if (container && img.naturalWidth && img.naturalHeight) {
                                                                            const containerWidth = container.clientWidth;
                                                                            const containerHeight = container.clientHeight;

                                                                            // 如果图片比容器小，保持原始尺寸；否则按比例缩放
                                                                            if (img.naturalWidth <= containerWidth && img.naturalHeight <= containerHeight) {
                                                                                img.style.width = `${img.naturalWidth}px`;
                                                                                img.style.height = `${img.naturalHeight}px`;
                                                                                img.style.maxWidth = '100%';
                                                                                img.style.maxHeight = '100%';
                                                                            } else {
                                                                                img.style.width = '';
                                                                                img.style.height = '';
                                                                                img.style.maxWidth = '100%';
                                                                                img.style.maxHeight = '100%';
                                                                            }
                                                                        }
                                                                    }}
                                                                />
                                                                {/* 局部重绘按钮 */}
                                                                {node.type === 'gen-image' && !node.isMasking && (
                                                                    <div className="absolute inset-0 bg-black/40 transition-opacity opacity-0 group-hover:opacity-100 flex items-center justify-center">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                // 获取图片尺寸
                                                                                const img = e.target.closest('.group').querySelector('img');
                                                                                if (img && img.naturalWidth && img.naturalHeight) {
                                                                                    setNodes((prev) => prev.map((n) =>
                                                                                        n.id === node.id
                                                                                            ? {
                                                                                                ...n,
                                                                                                isMasking: !n.isMasking,
                                                                                                maskingImageUrl: imgUrl,
                                                                                                maskingImageDimensions: { w: img.naturalWidth, h: img.naturalHeight }
                                                                                            }
                                                                                            : n
                                                                                    ));
                                                                                }
                                                                            }}
                                                                            className={`px-3 py-1.5 rounded-lg text-xs backdrop-blur-sm border transition-colors flex items-center gap-1 ${
                                                                                theme === 'dark'
                                                                                    ? node.isMasking
                                                                                        ? 'bg-red-500/80 hover:bg-red-500 text-white border-red-400'
                                                                                        : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                                                                                    : node.isMasking
                                                                                        ? 'bg-red-500 hover:bg-red-600 text-white border-red-400'
                                                                                        : 'bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-300'
                                                                            }`}
                                                                            onMouseDown={(e) => e.stopPropagation()}
                                                                        >
                                                                            <Brush size={12} />
                                                                            局部重绘
                                                                        </button>
                                                                    </div>
                                                                )}
                                                                {/* 非编辑模式下的蒙版回显（gen-image 节点） */}
                                                                {node.type === 'gen-image' && !node.isMasking && node.maskContent && node.maskingImageUrl === imgUrl && (
                                                                    <div
                                                                        className="absolute inset-0 z-20 pointer-events-none"
                                                                        style={{
                                                                            background: 'rgba(255, 0, 0, 0.3)',
                                                                            mixBlendMode: 'multiply',
                                                                            WebkitMaskImage: `url(${node.maskContent})`,
                                                                            maskImage: `url(${node.maskContent})`,
                                                                            WebkitMaskSize: '100% 100%',
                                                                            maskSize: '100% 100%',
                                                                            WebkitMaskRepeat: 'no-repeat',
                                                                            maskRepeat: 'no-repeat'
                                                                        }}
                                                                    />
                                                                )}
                                                                {/* MaskEditor 组件 */}
                                                                {node.type === 'gen-image' && node.isMasking && node.maskingImageUrl === imgUrl && node.maskingImageDimensions && (
                                                                    <MaskEditor
                                                                        nodeId={node.id}
                                                                        imageUrl={node.maskingImageUrl}
                                                                        imageDimensions={node.maskingImageDimensions}
                                                                        isActive={node.isMasking}
                                                                        isPerformanceMode={isPerformanceMode}
                                                                        onClose={() => {
                                                                            setNodes((prev) => prev.map((n) =>
                                                                                n.id === node.id
                                                                                    ? { ...n, isMasking: false }
                                                                                    : n
                                                                            ));
                                                                        }}
                                                                        onSave={(maskDataUrl) => {
                                                                            console.log('蒙版已保存:', maskDataUrl);
                                                                        }}
                                                                        onUpdateNode={(nodeId, updates) => {
                                                                            setNodes((prev) => prev.map((n) =>
                                                                                n.id === nodeId
                                                                                    ? { ...n, ...updates }
                                                                                    : n
                                                                            ));
                                                                        }}
                                                                        theme={theme}
                                                                        view={view}
                                                                        maskContent={node.maskContent}
                                                                    />
                                                                )}
                                                            </div>
                                                        );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <img
                                                        src={primaryPreviewUrl}
                                                        className="max-w-full max-h-full w-auto h-auto object-contain bg-black"
                                                        draggable={false}
                                                        onLoad={(e) => {
                                                            // 图片加载后，根据实际尺寸自适应
                                                            const img = e.target;
                                                            const container = img.parentElement;
                                                            if (container && img.naturalWidth && img.naturalHeight) {
                                                                const containerWidth = container.clientWidth;
                                                                const containerHeight = container.clientHeight;

                                                                // 如果图片比容器小，保持原始尺寸；否则按比例缩放
                                                                if (img.naturalWidth <= containerWidth && img.naturalHeight <= containerHeight) {
                                                                    img.style.width = `${img.naturalWidth}px`;
                                                                    img.style.height = `${img.naturalHeight}px`;
                                                                    img.style.maxWidth = '100%';
                                                                    img.style.maxHeight = '100%';
                                                                } else {
                                                                    img.style.width = '';
                                                                    img.style.height = '';
                                                                    img.style.maxWidth = '100%';
                                                                    img.style.maxHeight = '100%';
                                                                }
                                                            }
                                                        }}
                                                    />
                                                )
                                            ) : (
                                                <div
                                                    className={`flex flex-col items-center justify-center text-[11px] ${
                                                        theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500'
                                                    }`}
                                                >
                                                    <ImageIcon className="w-6 h-6 mb-1 text-zinc-400" />
                                                    <span>连接 AI 绘图 / AI 视频 节点</span>
                                                    <span>或从历史记录发送到此处进行预览</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between gap-2 text-[11px]">
                                            <button
                                                className={`flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded border ${
                                                    theme === 'dark'
                                                        ? 'border-zinc-700 text-zinc-200 hover:bg-zinc-800'
                                                        : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                                                }`}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onClick={async () => {
                                                    if (!primaryPreviewUrl) return;
                                                    try {
                                                        await navigator.clipboard.writeText(primaryPreviewUrl);
                                                    } catch {}
                                                }}
                                            >
                                                <CopyPlus size={13} />
                                                复制链接
                                            </button>
                                            <button
                                                className={`flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded border ${
                                                    theme === 'dark'
                                                        ? 'border-zinc-700 text-zinc-200 hover:bg-zinc-800'
                                                        : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                                                }`}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                type="button"
                                                onClick={async () => {
                                                    if (!primaryPreviewUrl) return;
                                                    const worldX = node.x + node.width + 100;
                                                    const worldY = node.y + node.height / 2;
                                                    let dims;
                                                    if (!isVideoUrl(primaryPreviewUrl)) {
                                                        try {
                                                            const real = await getImageDimensions(primaryPreviewUrl);
                                                            if (real?.w && real?.h) dims = { w: real.w, h: real.h };
                                                        } catch {}
                                                    }
                                                    addNode('input-image', worldX, worldY, null, primaryPreviewUrl, dims);
                                                }}
                                            >
                                                <ArrowRightSquare size={13} />
                                                发送到画布
                                            </button>
                                            <button
                                                className={`flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded border ${
                                                    theme === 'dark'
                                                        ? 'border-zinc-700 text-zinc-200 hover:bg-zinc-800'
                                                        : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                                                }`}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onClick={() => {
                                                    if (!primaryPreviewUrl) return;
                                                    const newFile = createChatMediaFile({
                                                        name: hasVideo ? 'Preview.mp4' : 'Preview.png',
                                                        content: primaryPreviewUrl,
                                                        mediaType: hasVideo ? 'video' : 'image',
                                                        fromPreview: true,
                                                    });
                                                    setChatFiles((prev) => [...prev, newFile]);
                                                    setIsChatOpen(true);
                                                }}
                                            >
                                                <MessageSquare size={13} />
                                                发送到对话
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                );
                            })()}

                            {node.type === 'local-save' && (
                                <LocalSaveNode
                                    node={node}
                                    theme={theme}
                                    connectedImages={connectedImages}
                                    savedFolderHistory={savedFolderHistory}
                                    updateNodeSettings={updateNodeSettings}
                                    addFolderToHistory={addFolderToHistory}
                                    isVideoUrl={isVideoUrl}
                                />
                            )}

                            {(node.type === 'gen-image' || node.type === 'gen-video') && (() => {
                                // 查找当前节点对应的正在生成的历史记录
                                const activeTask = history.find(h =>
                                    h.sourceNodeId === node.id &&
                                    (h.status === 'generating' || h.status === 'completed')
                                );
                                const isGenerating = activeTask && activeTask.status === 'generating';
                                const finalDuration = activeTask?.durationMs
                                    ? (activeTask.durationMs / 1000).toFixed(1)
                                    : null;
                                const elapsedSeconds = nodeTimers[node.id] || 0;

                                return (
                                <div className="p-3 flex flex-col h-full pointer-events-auto">
                                    {/* 计时器显示 */}
                                    {(isGenerating || finalDuration) && (
                                        <div
                                            className={`mb-2 px-2 py-1 rounded text-[10px] font-mono text-center ${
                                                theme === 'dark'
                                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                    : 'bg-blue-50 text-blue-600 border border-blue-200'
                                            }`}
                                        >
                                            {isGenerating ? (
                                                <span>⏱ {elapsedSeconds.toFixed(1)}s</span>
                                            ) : (
                                                <span>✓ 完成 {finalDuration}s</span>
                                            )}
                                        </div>
                                    )}
                                    <div
                                        className={`flex items-center gap-1.5 mb-2 text-xs font-semibold shrink-0 ${
                                            theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'
                                        }`}
                                    >
                                        {node.type === 'gen-image' ? <Wand2 size={12} className="text-blue-400" /> : <Video size={12} className="text-purple-400" />}
                                        <span>{node.type === 'gen-image' ? 'AI 绘图' : 'AI 视频'}</span>
                                    </div>
                                    {connectedImages.length > 0 && (
                                        <div
                                            className={`mb-2 rounded-lg border p-2 relative group/ref ${
                                                theme === 'dark'
                                                    ? 'bg-zinc-900/50 border-purple-500/20'
                                                    : 'bg-violet-50 border-violet-200'
                                            }`}
                                        >
                                             <div className="flex justify-between items-center mb-1.5">
                                                <span
                                                    className={`text-[10px] font-medium flex items-center gap-1 ${
                                                        theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'
                                                    }`}
                                                >
                                                    <ImagePlus size={10} />
                                                    引用成功
                                                </span>
                                                <span
                                                    className={`text-[9px] font-mono ${
                                                        theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500'
                                                    }`}
                                                >
                                                    {connectedImages.length}/10
                                                </span>
                                             </div>
                                             <div className="flex -space-x-2 overflow-visible pb-1 items-center custom-scrollbar pl-1">
                                                {connectedImages.map((imgSrc, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`relative shrink-0 flex flex-col items-center gap-0 ${
                                                            theme === 'dark' ? '' : ''
                                                        }`}
                                                    >
                                                        <div className="relative">
                                                            <span
                                                                className="absolute -top-1 -left-1 w-4 h-4 text-[9px] font-semibold rounded-full bg-zinc-700 text-white select-none flex items-center justify-center border border-white/70 shadow-sm leading-none pointer-events-none"
                                                                style={{ zIndex: 30 }}
                                                            >
                                                                {idx + 1}
                                                            </span>
                                                            <div
                                                                className={`relative w-8 h-8 rounded-full border-2 thumb-stack-item cursor-pointer overflow-hidden ${
                                                                    theme === 'dark'
                                                                        ? 'border-[#18181b] bg-zinc-800'
                                                                        : 'border-white bg-zinc-200'
                                                                }`}
                                                                style={{ zIndex: 10 - idx }}
                                                            >
                                                                <img src={imgSrc} className="w-full h-full object-cover" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                             </div>
                                        </div>
                                    )}
                                    <div
                                        className={`rounded-lg p-3 mb-2 border focus-within:border-blue-500/30 transition-colors flex-1 flex flex-col ${
                                            theme === 'dark'
                                                ? 'bg-zinc-950/50 border-zinc-800'
                                                : 'bg-zinc-50 border-zinc-200'
                                        }`}
                                    >
                                        {/* 蒙版已连接状态提示（仅 gen-image 节点） */}
                                        {node.type === 'gen-image' && (() => {
                                            // 检查当前节点或上游节点是否有蒙版
                                            const hasMaskInCurrent = node?.maskContent;

                                            // 查找连接到当前节点的源节点（优先查找 default 输入，如果没有则查找所有输入）
                                            let incomingConn = connections.find(c => c.to === node.id && (!c.inputType || c.inputType === 'default'));
                                            if (!incomingConn) {
                                                // 如果没有 default 连接，查找任何连接到该节点的连接
                                                incomingConn = connections.find(c => c.to === node.id);
                                            }

                                            // 使用 nodesMap 进行 O(1) 查找
                                            const sourceNode = incomingConn ? nodesMap.get(incomingConn.from) : null;
                                            const hasMaskFromSource = sourceNode && sourceNode.maskContent;
                                            const hasMask = hasMaskInCurrent || hasMaskFromSource;

                                            if (hasMask) {
                                                return (
                                                    <div className={`flex items-center gap-1.5 mb-2 px-2 py-1 rounded text-[10px] font-medium ${
                                                        theme === 'dark'
                                                            ? 'bg-purple-900/30 text-purple-300 border border-purple-800'
                                                            : 'bg-purple-50 text-purple-600 border border-purple-200'
                                                    }`}>
                                                        <Eraser size={12} />
                                                        <span>{hasMaskFromSource ? '已链接蒙版区域' : '已设置蒙版区域'}</span>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                        <div className="flex items-start gap-2 mb-1 flex-1 h-full min-h-0">
                                        <textarea
                                                className={`flex-1 h-full bg-transparent text-xs outline-none resize-none custom-scrollbar ${
                                                theme === 'dark'
                                                    ? 'text-zinc-300 placeholder-zinc-600'
                                                    : 'text-zinc-800 placeholder-zinc-400'
                                            }`}
                                            placeholder="输入提示词..."
                                            value={node.type === 'gen-image' ? (node.settings?.prompt || '') : (node.settings?.videoPrompt || '')}
                                            onChange={(e) => updateNodeSettings(node.id, node.type === 'gen-image' ? { prompt: e.target.value } : { videoPrompt: e.target.value })}
                                            onMouseDown={(e) => e.stopPropagation()}
                                        />
                                            {(node.type === 'gen-video' && (node.settings?.model === 'sora-2' || node.settings?.model === 'sora-2-pro')) && characterLibrary.length > 0 && (
                                                <div className="relative shrink-0">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setCharactersOpen(true);
                                                        }}
                                                        className={`p-1.5 rounded transition-colors ${
                                                            theme === 'dark'
                                                                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                                                                : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200'
                                                        }`}
                                                        title="插入角色"
                                                    >
                                                        <Users size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 角色引用栏 (仅 Sora 模型) */}
                                    {node.type === 'gen-video' && (() => {
                                        const currentModel = node.settings?.model || '';
                                        const modelConfig = apiConfigsMap.get(currentModel);
                                        const modelName = modelConfig?.modelName || modelConfig?.id || currentModel;
                                        const isSora = modelName && (modelName.includes('sora') || currentModel.includes('sora'));

                                        if (!isSora || characterLibrary.length === 0) return null;

                                        const currentPrompt = node.settings?.videoPrompt || '';
                                        const isExpanded = characterReferenceBarExpanded[node.id] || false;
                                        const maxVisible = 5; // 最多显示5个角色，超过则显示展开按钮
                                        const shouldShowExpand = characterLibrary.length > maxVisible;

                                        return (
                                            <div className="border-t border-dashed mt-1" style={{
                                                borderColor: theme === 'dark' ? 'rgba(63, 63, 70, 0.5)' : 'rgba(161, 161, 170, 0.5)'
                                            }}>
                                                <div className="flex items-center justify-between py-1 px-1">
                                                    <div className="flex gap-2 overflow-x-auto py-2 flex-1 custom-scrollbar">
                                                        {(isExpanded ? characterLibrary : characterLibrary.slice(0, maxVisible)).map(char => {
                                                    const tag = `@${char.username}`;
                                                    const isActive = currentPrompt.includes(tag);

                                                    return (
                                                        <button
                                                            key={char.id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                let newPrompt = currentPrompt || '';
                                                                if (isActive) {
                                                                    // 移除标签，并清理多余空格
                                                                    newPrompt = newPrompt.replace(tag, '').replace(/\s{2,}/g, ' ').trim();
                                                                } else {
                                                                    // 添加标签到末尾（前后加空格）
                                                                    newPrompt = newPrompt.trim();
                                                                    newPrompt = newPrompt ? `${newPrompt} ${tag} ` : `${tag} `;
                                                                }
                                                                updateNodeSettings(node.id, { videoPrompt: newPrompt });
                                                            }}
                                                            className={`relative shrink-0 transition-all ${isActive ? 'scale-110' : 'opacity-70 hover:opacity-100'}`}
                                                            title={char.username}
                                                        >
                                                            <img
                                                                src={char.profile_picture_url || ''}
                                                                alt={char.username}
                                                                className={`w-8 h-8 rounded-full object-cover border-2 ${
                                                                    isActive
                                                                        ? 'border-blue-500 ring-2 ring-blue-500'
                                                                        : 'border-transparent'
                                                                }`}
                                                                onError={(e) => {
                                                                    e.target.style.display = 'none';
                                                                }}
                                                            />
                                                            {/* 右下角显示小的链接图标表示可用 */}
                                                            <div className="absolute -bottom-0.5 -right-0.5 bg-black/50 rounded-full p-0.5">
                                                                <LinkIcon size={8} className="text-green-400" />
                                                            </div>
                                                        </button>
                                                    );
                                                        })}
                                                    </div>
                                                    {shouldShowExpand && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (isExpanded) {
                                                                    // 收起：关闭展开状态
                                                                    setCharacterReferenceBarExpanded(prev => {
                                                                        const updated = { ...prev };
                                                                        delete updated[node.id];
                                                                        return updated;
                                                                    });
                                                                } else {
                                                                    // 展开：打开角色库侧边栏
                                                                    setCharactersOpen(true);
                                                                    setCharacterReferenceBarExpanded(prev => ({ ...prev, [node.id]: true }));
                                                                }
                                                            }}
                                                            className={`shrink-0 px-2 py-1 text-[10px] rounded transition-colors ml-2 ${
                                                                theme === 'dark'
                                                                    ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                                                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                                            }`}
                                                            title={isExpanded ? "收起" : "打开角色库"}
                                                        >
                                                            {isExpanded ? '收起' : `+${characterLibrary.length - maxVisible}`}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Veo 3.1 首尾帧 UI（仅 veo3.1 且开启“首尾帧”时显示） */}
                                    {node.type === 'gen-video' && (() => {
                                        const currentModel = apiConfigsMap.get(node.settings?.model);
                                        const isVeo31 = currentModel?.modelName === 'veo3.1';
                                        if (!isVeo31 || !node.settings?.veoFramesMode) return null;

                                        const startFrame = getConnectedImageForInput(node.id, 'veo_start');
                                        const endFrame = getConnectedImageForInput(node.id, 'veo_end');

                                        return (
                                            <div
                                                className={`mb-2 rounded-lg border p-3 space-y-2 ${
                                                    theme === 'dark'
                                                        ? 'bg-zinc-900/40 border-emerald-500/20'
                                                        : 'bg-emerald-50 border-emerald-200'
                                                }`}
                                                onMouseDown={(e) => e.stopPropagation()}
                                            >
                                                <div className={`text-[11px] font-semibold ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-700'}`}>
                                                    Veo 3.1 首尾帧
                                                </div>
                                                <div className={`text-[10px] ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500'}`}>
                                                    第一张为首帧，第二张为尾帧（最多 2 张）
                                                </div>

                                                {/* 首帧 */}
                                                <div className="relative flex items-center gap-2">
                                                    <div
                                                        className={`input-point ${startFrame ? 'connected' : ''} ${connectingTarget === node.id && connectingInputType === 'veo_start' ? 'active' : ''}`}
                                                        title="首帧输入"
                                                        onMouseDown={(e) => {
                                                            e.stopPropagation();
                                                            e.preventDefault();
                                                            const world = screenToWorld(e.clientX, e.clientY);
                                                            setMousePos(world);
                                                            setConnectingTarget(node.id);
                                                            setConnectingInputType('veo_start');
                                                        }}
                                                        onMouseUp={(e) => handleNodeMouseUp(node.id, e, 'veo_start')}
                                                        data-input-type="veo_start"
                                                        style={{ position: 'absolute', top: '50%', left: '-0.25rem', transform: 'translateY(-50%)', width: '0.5rem', height: '0.5rem', zIndex: 20, cursor: 'crosshair' }}
                                                    />
                                                    <div className="flex items-center justify-between flex-1 ml-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[10px] font-medium ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>首帧</span>
                                                            {startFrame && <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>}
                                                        </div>
                                                        {startFrame ? (
                                                            <div className="w-8 h-8 rounded overflow-hidden border border-zinc-700/40">
                                                                <img src={startFrame} className="w-full h-full object-cover" />
                                                            </div>
                                                        ) : (
                                                            <span className={`text-[10px] ${theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400'}`}>未连接</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* 尾帧 */}
                                                <div className="relative flex items-center gap-2">
                                                    <div
                                                        className={`input-point ${endFrame ? 'connected' : ''} ${connectingTarget === node.id && connectingInputType === 'veo_end' ? 'active' : ''}`}
                                                        title="尾帧输入"
                                                        onMouseDown={(e) => {
                                                            e.stopPropagation();
                                                            e.preventDefault();
                                                            const world = screenToWorld(e.clientX, e.clientY);
                                                            setMousePos(world);
                                                            setConnectingTarget(node.id);
                                                            setConnectingInputType('veo_end');
                                                        }}
                                                        onMouseUp={(e) => handleNodeMouseUp(node.id, e, 'veo_end')}
                                                        data-input-type="veo_end"
                                                        style={{ position: 'absolute', top: '50%', left: '-0.25rem', transform: 'translateY(-50%)', width: '0.5rem', height: '0.5rem', zIndex: 20, cursor: 'crosshair' }}
                                                    />
                                                    <div className="flex items-center justify-between flex-1 ml-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[10px] font-medium ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>尾帧</span>
                                                            {endFrame && <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>}
                                                        </div>
                                                        {endFrame ? (
                                                            <div className="w-8 h-8 rounded overflow-hidden border border-zinc-700/40">
                                                                <img src={endFrame} className="w-full h-full object-cover" />
                                                            </div>
                                                        ) : (
                                                            <span className={`text-[10px] ${theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400'}`}>未连接</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Midjourney指令UI: oref, ow, sref */}
                                    {node.type === 'gen-image' && (() => {
                                        const currentModel = apiConfigsMap.get(node.settings?.model);
                                        const isMidjourney = currentModel && (currentModel.id.includes('mj') || currentModel.provider.toLowerCase().includes('midjourney'));
                                        return isMidjourney;
                                    })() && (() => {
                                        const orefConnected = getConnectedImageForInput(node.id, 'oref');
                                        const srefConnected = getConnectedImageForInput(node.id, 'sref');
                                        return (
                                            <div className="flex flex-col gap-1.5 mb-2 relative" data-mj-instructions="true">
                                                {/* oref指令 */}
                                                <div className="relative flex items-center gap-1.5" data-mj-oref="true">
                                                    <div className={`input-point ${orefConnected ? 'connected' : ''} ${connectingTarget === node.id && connectingInputType === 'oref' ? 'active' : ''}`}
                                                         title="oref输入"
                                                         onMouseDown={(e) => {
                                                             e.stopPropagation();
                                                             e.preventDefault();
                                                             // 立即计算并更新当前鼠标的世界坐标，防止线条乱飞
                                                             const world = screenToWorld(e.clientX, e.clientY);
                                                             setMousePos(world);
                                                             setConnectingTarget(node.id);
                                                             setConnectingInputType('oref');
                                                         }}
                                                         onMouseUp={(e) => handleNodeMouseUp(node.id, e, 'oref')}
                                                         data-input-type="oref"
                                                         style={{ position: 'absolute', top: '50%', left: '-0.25rem', transform: 'translateY(-50%)', width: '0.5rem', height: '0.5rem', marginRight: '0.25rem', zIndex: 20, cursor: 'crosshair' }}
                                                    />
                                                    <div className="flex items-center gap-1.5 flex-1 ml-2">
                                                        <span className={`text-[10px] font-medium ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>oref</span>
                                                        {orefConnected && (
                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* ow指令 */}
                                                <div className="relative flex items-center gap-1.5">
                                                    <div className="w-0.5rem h-0.5rem mr-0.25rem ml-2"></div>
                                                    <div className="flex items-center gap-1.5 flex-1">
                                                        <span className={`text-[10px] font-medium ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>ow</span>
                                                        {node.settings?.mjOw && node.settings.mjOw > 0 && (
                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                                        )}
                                                    </div>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="1000"
                                                        placeholder="1-1000"
                                                        value={node.settings?.mjOw || ''}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value, 10);
                                                            if (isNaN(val) || val < 1) {
                                                                updateNodeSettings(node.id, { mjOw: '' });
                                                            } else if (val > 1000) {
                                                                updateNodeSettings(node.id, { mjOw: 1000 });
                                                            } else {
                                                                updateNodeSettings(node.id, { mjOw: val });
                                                            }
                                                        }}
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        className={`flex-1 px-2 py-1 rounded text-[10px] border outline-none focus:border-blue-500/50 ${
                                                            theme === 'dark'
                                                                ? 'bg-zinc-900/50 border-zinc-700 text-zinc-300 placeholder-zinc-600'
                                                                : 'bg-white border-zinc-300 text-zinc-800 placeholder-zinc-400'
                                                        }`}
                                                    />
                                                </div>

                                                {/* sref指令 */}
                                                <div className="relative flex items-center gap-1.5" data-mj-sref="true">
                                                    <div className={`input-point ${srefConnected ? 'connected' : ''} ${connectingTarget === node.id && connectingInputType === 'sref' ? 'active' : ''}`}
                                                         title="sref输入"
                                                         onMouseDown={(e) => {
                                                             e.stopPropagation();
                                                             e.preventDefault();
                                                             // 立即计算并更新当前鼠标的世界坐标，防止线条乱飞
                                                             const world = screenToWorld(e.clientX, e.clientY);
                                                             setMousePos(world);
                                                             setConnectingTarget(node.id);
                                                             setConnectingInputType('sref');
                                                         }}
                                                         onMouseUp={(e) => handleNodeMouseUp(node.id, e, 'sref')}
                                                         data-input-type="sref"
                                                         style={{ position: 'absolute', top: '50%', left: '-0.25rem', transform: 'translateY(-50%)', width: '0.5rem', height: '0.5rem', marginRight: '0.25rem', zIndex: 20, cursor: 'crosshair' }}
                                                    />
                                                    <div className="flex items-center gap-1.5 flex-1 ml-2">
                                                        <span className={`text-[10px] font-medium ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>sref</span>
                                                        {srefConnected && (
                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                    {node.type === 'gen-image' && isNanoBanana2 && (
                                        <div
                                            className={`mb-2 rounded-lg border p-3 space-y-2 ${
                                                theme === 'dark'
                                                    ? 'bg-zinc-900/50 border-zinc-800'
                                                    : 'bg-white border-zinc-200'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <button
                                                    className="flex items-center gap-1 text-[11px] font-semibold"
                                                    onClick={() => setPromptLibraryCollapsed((v) => !v)}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                >
                                                    <span className={theme === 'dark' ? 'text-zinc-200' : 'text-zinc-700'}>常用提示词库</span>
                                                    <ChevronRight
                                                        size={12}
                                                        className={`transition-transform ${promptLibraryCollapsed ? '' : 'rotate-90'} ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}
                                                    />
                                                </button>
                                                <div className="flex items-center gap-2 text-[10px]">
                                                    <span className={theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500'}>{promptLibrary.length} 项</span>
                                                    <button
                                                        className={`px-2 py-0.5 rounded text-[10px] border ${theme === 'dark' ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'}`}
                                                        onClick={() => setPromptLibraryEditorOpen((v) => !v)}
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                    >
                                                        {promptLibraryEditorOpen ? '收起' : '管理'}
                                                    </button>
                                                </div>
                                            </div>
                                            {!promptLibraryCollapsed && (
                                                <div className="space-y-2">
                                                    <div className="max-h-36 overflow-y-auto custom-scrollbar flex flex-wrap gap-2">
                                                        {promptLibrary.map((item) => (
                                                            <div
                                                                key={item.id}
                                                                className={`border rounded-lg px-2 py-1.5 flex items-center gap-2 text-[11px] ${theme === 'dark' ? 'border-zinc-700 bg-zinc-950/50 text-zinc-200' : 'border-zinc-200 bg-zinc-50 text-zinc-700'}`}
                                                            >
                                                                <span className="font-medium whitespace-nowrap">{item.name}</span>
                                                                <button
                                                                    onClick={() => applyLibraryPrompt(node.id, item.prompt)}
                                                                    className="px-2 py-0.5 rounded text-[10px] bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                                                                    onMouseDown={(e) => e.stopPropagation()}
                                                                >
                                                                    应用
                                                                </button>
                                                                {promptLibraryEditorOpen && (
                                                                    <button
                                                                        onClick={() => removePromptLibraryItem(item.id)}
                                                                        className={`px-2 py-0.5 rounded text-[10px] border ${theme === 'dark' ? 'border-red-500/50 text-red-400 hover:bg-red-500/10' : 'border-red-200 text-red-600 hover:bg-red-50'}`}
                                                                        onMouseDown={(e) => e.stopPropagation()}
                                                                    >
                                                                        删除
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                        {promptLibrary.length === 0 && (
                                                            <div className={`text-[11px] ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>暂无常用提示词</div>
                                                        )}
                                                    </div>
                                                    {promptLibraryEditorOpen && (
                                                        <div className="grid grid-cols-1 gap-1.5">
                                                            <input
                                                                type="text"
                                                                value={promptLibraryForm.name}
                                                                onChange={(e) => setPromptLibraryForm((prev) => ({ ...prev, name: e.target.value }))}
                                                                placeholder="自定义名称（例如：柔光人像）"
                                                                className={`w-full px-2 py-1 text-[11px] rounded border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600' : 'bg-white border-zinc-300 text-zinc-800 placeholder:text-zinc-400'}`}
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                            />
                                                            <textarea
                                                                value={promptLibraryForm.prompt}
                                                                onChange={(e) => setPromptLibraryForm((prev) => ({ ...prev, prompt: e.target.value }))}
                                                                placeholder="输入提示词内容..."
                                                                className={`w-full min-h-[70px] px-2 py-1 text-[11px] rounded border resize-none custom-scrollbar ${theme === 'dark' ? 'bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600' : 'bg-white border-zinc-300 text-zinc-800 placeholder:text-zinc-400'}`}
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                            />
                                                            <button
                                                                onClick={addPromptLibraryItem}
                                                                className="w-full py-1.5 rounded text-[11px] font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                            >
                                                                添加到常用提示词库
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div
                                        className={`mt-auto pt-2 flex items-center justify-between shrink-0 relative gap-2 border-t ${
                                            theme === 'dark' ? 'border-zinc-800/50' : 'border-zinc-200'
                                        }`}
                                    >
                                        <div className="relative flex-1 min-w-0">
                                            <button
                                                title={apiConfigsMap.get(node.settings?.model)?.provider}
                                                onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown?.type === 'model' ? null : { nodeId: node.id, type: 'model' }); }}
                                                className={`flex items-center gap-2 pl-1 pr-2 py-1 rounded text-[10px] transition-colors border w-full ${
                                                    theme === 'dark'
                                                        ? 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 border-zinc-700/50'
                                                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-300'
                                                }`}
                                            >
                                                <span className={`w-2 h-2 rounded-full ${getStatusColor(node.settings?.model)}`}></span>
                                                <span className="truncate">{apiConfigsMap.get(node.settings?.model)?.provider || 'Model'}</span>
                                            </button>
                                            {activeDropdown?.nodeId === node.id && activeDropdown.type === 'model' && (
                                                <div
                                                    className={`absolute bottom-full left-0 mb-1 w-48 rounded-lg shadow-xl p-1 z-[60] border ${
                                                        theme === 'dark'
                                                            ? 'bg-[#18181b] border-zinc-700'
                                                            : 'bg-white border-zinc-200'
                                                    }`}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                >
                                                    {apiConfigs
                                                        .filter((m) => m.type === (node.type === 'gen-image' ? 'Image' : 'Video') && !DELETED_MODEL_IDS.includes(m.id))
                                                        .map((m) => (
                                                            <button
                                                                key={m.id}
                                                                onClick={() => {
                                                                    const nextSettings = { model: m.id };
                                                                    if (m.id === 'grok-3') {
                                                                        nextSettings.ratio = '3:2';
                                                                        nextSettings.duration = '8s';
                                                                        nextSettings.resolution = '1080P';
                                                                    }
                                                                    updateNodeSettings(node.id, nextSettings);
                                                                    setActiveDropdown(null);
                                                                }}
                                                                className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-left transition-colors ${
                                                                    theme === 'dark'
                                                                        ? 'hover:bg-zinc-800 text-zinc-300'
                                                                        : 'hover:bg-zinc-100 text-zinc-700'
                                                                }`}
                                                            >
                                                            <span className="text-xs font-medium">{m.provider}</span>
                                                            <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(m.id)}`}></div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Midjourney版本选择器 */}
                                        {node.type === 'gen-image' && (() => {
                                            const currentModel = apiConfigsMap.get(node.settings?.model);
                                            return currentModel && (currentModel.id.includes('mj') || currentModel.provider.toLowerCase().includes('midjourney'));
                                        })() && (
                                            <div className="relative flex-1 min-w-0">
                                                <button
                                                    title={MJ_VERSIONS.find(v => v.value === node.settings?.mjVersion)?.label || 'MJ V7'}
                                                    onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown?.type === 'mjVersion' && activeDropdown.nodeId === node.id ? null : { nodeId: node.id, type: 'mjVersion' }); }}
                                                    className={`flex items-center gap-2 pl-1 pr-2 py-1 rounded text-[10px] transition-colors border w-full ${
                                                        theme === 'dark'
                                                            ? 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 border-zinc-700/50'
                                                            : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-300'
                                                    }`}
                                                >
                                                    <span className="truncate">{MJ_VERSIONS.find(v => v.value === node.settings?.mjVersion)?.label || 'MJ V7'}</span>
                                                </button>
                                                {activeDropdown?.nodeId === node.id && activeDropdown.type === 'mjVersion' && (
                                                    <div
                                                        className={`absolute bottom-full left-0 mb-1 w-32 rounded-lg shadow-xl p-1 z-[60] border max-h-64 overflow-y-auto custom-scrollbar ${
                                                            theme === 'dark'
                                                                ? 'bg-[#18181b] border-zinc-700'
                                                                : 'bg-white border-zinc-200'
                                                        }`}
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                    >
                                                        {MJ_VERSIONS.map((v) => (
                                                            <button
                                                                key={v.value}
                                                                onClick={() => {
                                                                    updateNodeSettings(node.id, { mjVersion: v.value });
                                                                    setActiveDropdown(null);
                                                                }}
                                                                className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-left transition-colors ${
                                                                    theme === 'dark'
                                                                        ? 'hover:bg-zinc-800 text-zinc-300'
                                                                        : 'hover:bg-zinc-100 text-zinc-700'
                                                                } ${node.settings?.mjVersion === v.value ? (theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100') : ''}`}
                                                            >
                                                                <span className="text-xs font-medium">{v.label}</span>
                                                                {node.settings?.mjVersion === v.value && (
                                                                    <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                    </svg>
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex gap-1 shrink-0">
                                            <div className="relative">
                                                <button
                                                    onClick={e => { e.stopPropagation(); setActiveDropdown(activeDropdown?.type === 'ratio' && activeDropdown.nodeId === node.id ? null : { nodeId: node.id, type: 'ratio' }); }}
                                                    className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border ${
                                                        theme === 'dark'
                                                            ? 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 border-zinc-700/50'
                                                            : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border-zinc-300'
                                                    }`}
                                                >
                                                    {node.settings?.ratio || 'Auto'}
                                                </button>
                                                {activeDropdown?.nodeId === node.id && activeDropdown.type === 'ratio' && (
                                                    <div
                                                        className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-20 rounded-lg shadow-xl p-1 z-[60] border ${
                                                            theme === 'dark'
                                                                ? 'bg-[#18181b] border-zinc-700'
                                                                : 'bg-white border-zinc-200'
                                                        }`}
                                                        onMouseDown={e => e.stopPropagation()}
                                                    >
                                                        {getRatiosForModel(node.settings?.model).map(r => (
                                                            <button
                                                                key={r}
                                                                onClick={() => {
                                                                    updateNodeSettings(node.id, { ratio: r });
                                                                    setActiveDropdown(null);
                                                                }}
                                                                className={`w-full text-center py-1 text-[10px] rounded ${
                                                                    theme === 'dark'
                                                                        ? 'text-zinc-300 hover:bg-zinc-800'
                                                                        : 'text-zinc-700 hover:bg-zinc-100'
                                                                }`}
                                                            >
                                                                {r}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {node.type === 'gen-video' && (() => {
                                                const currentModel = apiConfigsMap.get(node.settings?.model);
                                                const modelId = currentModel?.id || currentModel?.modelName || '';
                                                const isGrok = modelId.includes('grok');
                                                return isGrok ? (
                                                <div className="relative">
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setActiveDropdown(activeDropdown?.type === 'vres' && activeDropdown.nodeId === node.id ? null : { nodeId: node.id, type: 'vres' }); }}
                                                        className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border ${
                                                            theme === 'dark'
                                                                ? 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 border-zinc-700/50'
                                                                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border-zinc-300'
                                                        }`}
                                                    >
                                                        {node.settings?.resolution || '1080P'}
                                                    </button>
                                                    {activeDropdown?.nodeId === node.id && activeDropdown.type === 'vres' && (
                                                        <div
                                                            className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-24 rounded-lg shadow-xl p-1 z-[60] border ${
                                                                theme === 'dark'
                                                                    ? 'bg-[#18181b] border-zinc-700'
                                                                    : 'bg-white border-zinc-200'
                                                            }`}
                                                            onMouseDown={e => e.stopPropagation()}
                                                        >
                                                            {VIDEO_RES_OPTIONS.map(r => (
                                                                <button
                                                                    key={r}
                                                                    onClick={() => {
                                                                        updateNodeSettings(node.id, { resolution: r });
                                                                        setActiveDropdown(null);
                                                                    }}
                                                                    className={`w-full text-center py-1 text-[10px] rounded ${
                                                                        theme === 'dark'
                                                                            ? 'text-zinc-300 hover:bg-zinc-800'
                                                                            : 'text-zinc-700 hover:bg-zinc-100'
                                                                    }`}
                                                                >
                                                                    {r}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                ) : null;
                                            })()}

                                            {node.type === 'gen-image' && (() => {
                                                const currentModel = apiConfigsMap.get(node.settings?.model);
                                                const isMidjourney = currentModel && (currentModel.id.includes('mj') || currentModel.provider.toLowerCase().includes('midjourney'));
                                                return !isMidjourney;
                                            })() ? (
                                                <div className="relative">
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setActiveDropdown(activeDropdown?.type === 'res' && activeDropdown.nodeId === node.id ? null : { nodeId: node.id, type: 'res' }); }}
                                                        className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border ${
                                                            theme === 'dark'
                                                                ? 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 border-zinc-700/50'
                                                                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border-zinc-300'
                                                        }`}
                                                    >
                                                        {(() => {
                                                            const currentModel = apiConfigsMap.get(node.settings?.model);
                                                            const modelId = currentModel?.id || currentModel?.modelName || '';
                                                            const availableResolutions = getResolutionsForModel(modelId);
                                                            const currentResolution = node.settings?.resolution || 'Auto';
                                                            // 如果当前分辨率不在可用选项中，使用第一个可用选项作为显示值
                                                            const displayResolution = availableResolutions.includes(currentResolution)
                                                                ? currentResolution
                                                                : (availableResolutions[0] || 'Auto');
                                                            // 如果当前分辨率不在可用选项中，自动更新
                                                            if (!availableResolutions.includes(currentResolution) && availableResolutions.length > 0) {
                                                                setTimeout(() => {
                                                                    updateNodeSettings(node.id, { resolution: availableResolutions[0] });
                                                                }, 0);
                                                            }
                                                            return displayResolution;
                                                        })()}
                                                    </button>
                                                    {activeDropdown?.nodeId === node.id && activeDropdown.type === 'res' && (() => {
                                                        const currentModel = apiConfigsMap.get(node.settings?.model);
                                                        const modelId = currentModel?.id || currentModel?.modelName || '';
                                                        const availableResolutions = getResolutionsForModel(modelId);
                                                        return (
                                                            <div
                                                                className={`absolute bottom-full right-0 mb-1 w-24 rounded-lg shadow-xl p-1 z-[60] border ${
                                                                    theme === 'dark'
                                                                        ? 'bg-[#18181b] border-zinc-700'
                                                                        : 'bg-white border-zinc-200'
                                                                }`}
                                                                onMouseDown={e => e.stopPropagation()}
                                                            >
                                                                {availableResolutions.map(r => (
                                                                    <button
                                                                        key={r}
                                                                        onClick={() => {
                                                                            updateNodeSettings(node.id, { resolution: r });
                                                                            setActiveDropdown(null);
                                                                        }}
                                                                        className={`w-full text-center py-1 text-[10px] rounded ${
                                                                            theme === 'dark'
                                                                                ? 'text-zinc-300 hover:bg-zinc-800'
                                                                                : 'text-zinc-700 hover:bg-zinc-100'
                                                                        }`}
                                                                    >
                                                                        {r}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            ) : (
                                                (() => {
                                                    const currentModel = apiConfigsMap.get(node.settings?.model);
                                                    const isMidjourney = currentModel && (currentModel.id.includes('mj') || currentModel.provider.toLowerCase().includes('midjourney'));
                                                    return !isMidjourney ? (
                                                <>
                                                <div className="relative">
                                                            <button
                                                                onClick={e => { e.stopPropagation(); setActiveDropdown(activeDropdown?.type === 'duration' && activeDropdown.nodeId === node.id ? null : { nodeId: node.id, type: 'duration' }); }}
                                                                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border ${
                                                                    theme === 'dark'
                                                                        ? 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 border-zinc-700/50'
                                                                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border-zinc-300'
                                                                }`}
                                                            >
                                                        {node.settings?.duration || '5s'}
                                                    </button>
                                                    {activeDropdown?.nodeId === node.id && activeDropdown.type === 'duration' && (
                                                                <div
                                                                    className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-20 rounded-lg shadow-xl p-1 z-[60] border ${
                                                                        theme === 'dark'
                                                                            ? 'bg-[#18181b] border-zinc-700'
                                                                            : 'bg-white border-zinc-200'
                                                                    }`}
                                                                    onMouseDown={e => e.stopPropagation()}
                                                                >
                                                                    {(apiConfigs.find(c => c.id === node.settings?.model)?.durations || ['5s', '10s']).map(d => (
                                                                        <button
                                                                            key={d}
                                                                            onClick={() => {
                                                                                updateNodeSettings(node.id, { duration: d });
                                                                                setActiveDropdown(null);
                                                                            }}
                                                                            className={`w-full text-center py-1 text-[10px] rounded ${
                                                                                theme === 'dark'
                                                                                    ? 'text-zinc-300 hover:bg-zinc-800'
                                                                                    : 'text-zinc-700 hover:bg-zinc-100'
                                                                            }`}
                                                                        >
                                                                            {d}
                                                                        </button>
                                                                    ))}
                                                        </div>
                                                    )}
                                                </div>
                                                    {node.type === 'gen-video' && node.settings?.model === 'sora-2' && (
                                                        <label className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border cursor-pointer transition-colors ${
                                                            theme === 'dark'
                                                                ? node.settings?.isHD ? 'bg-blue-600/30 border-blue-500 text-blue-300' : 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 border-zinc-700/50'
                                                                : node.settings?.isHD ? 'bg-blue-500/30 border-blue-400 text-blue-700' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border-zinc-300'
                                                        }`} onClick={e => e.stopPropagation()}>
                                                            <input
                                                                type="checkbox"
                                                                checked={node.settings?.isHD || false}
                                                                onChange={(e) => {
                                                                    e.stopPropagation();
                                                                    updateNodeSettings(node.id, { isHD: e.target.checked });
                                                                }}
                                                                className="w-3 h-3 cursor-pointer"
                                                                onMouseDown={e => e.stopPropagation()}
                                                            />
                                                            <span>HD</span>
                                                        </label>
                                                    )}
                                                    {node.type === 'gen-video' && (() => {
                                                        const currentModel = apiConfigsMap.get(node.settings?.model);
                                                        const isVeo31 = currentModel?.modelName === 'veo3.1';
                                                        if (!isVeo31) return null;
                                                        return (
                                                            <label className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border cursor-pointer transition-colors ${
                                                                theme === 'dark'
                                                                    ? node.settings?.veoFramesMode ? 'bg-emerald-600/25 border-emerald-500 text-emerald-200' : 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 border-zinc-700/50'
                                                                    : node.settings?.veoFramesMode ? 'bg-emerald-500/20 border-emerald-300 text-emerald-700' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border-zinc-300'
                                                            }`} onClick={e => e.stopPropagation()}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={node.settings?.veoFramesMode || false}
                                                                    onChange={(e) => {
                                                                        e.stopPropagation();
                                                                        updateNodeSettings(node.id, { veoFramesMode: e.target.checked });
                                                                    }}
                                                                    className="w-3 h-3 cursor-pointer"
                                                                    onMouseDown={e => e.stopPropagation()}
                                                                />
                                                                <span>首尾帧</span>
                                                            </label>
                                                        );
                                                    })()}
                                                </>
                                                    ) : null;
                                                })()
                                            )}
                                        </div>
                                        <button onClick={() => {
                                            const basePrompt = node.type === 'gen-image' ? node.settings?.prompt || '' : node.settings?.videoPrompt || '';
                                            const connectedTexts = getConnectedTextNodes(node.id);
                                            const finalPrompt = connectedTexts.length > 0 ? connectedTexts.join(' ') + (basePrompt ? ' ' + basePrompt : '') : basePrompt;
                                            startGeneration(finalPrompt, node.type === 'gen-image' ? 'image' : 'video', connectedImages, node.id);
                                        }} className="bg-blue-600 hover:bg-blue-500 text-white p-1.5 rounded-md shadow-lg active:scale-95 transition-transform shrink-0" title="生成">
                                            <Play size={12} fill="currentColor" />
                                        </button>
                                    </div>
                                </div>
                                );
                            })()}
                        </div>
                    </div>
                );
            }, [selectedNodeId, selectedNodeIds, hoverTargetId, nodeConnectedStatus, adjacentNodesCache, apiConfigsMap, getConnectedInputImages, theme, view, dragNodeId, connectingSource, connectingTarget, connectingInputType, deleteNode, handleNodeMouseUp, screenToWorld, setDragNodeId, setSelectedNodeId, setSelectedNodeIds, setActiveDropdown, setHoverTargetId, setConnectingSource, setConnectingTarget, setConnectingInputType, setResizingNodeId, setLightboxItem, isVideoUrl, updateNodeSettings, getConnectedTextNodes, startGeneration, getDefaultDurationForModel, getDefaultDurationsForModel, getConnectedGenNodes, getConnectedVideoInputNode, getConnectedVideoAnalyzeNode]);

            // 高性能模式：当节点数量超过 50 时自动启用
            const isPerfMode = nodes.length > 50;
            // 交互模式：正在拖拽或缩放时启用
            const isInteracting = isDragging || isPanning;

            return (
                <>
                    {/* 极简艺术进度条 */}
                    <ArtisticProgress
                        visible={progressState.visible}
                        progress={progressState.progress}
                        status={progressState.status}
                        type={progressState.type}
                    />
                    <div
                        className={`w-full h-screen font-sans overflow-hidden select-none flex flex-col transition-colors duration-300 ${
                            theme === 'dark' ? 'bg-[#09090b] text-white' : 'bg-zinc-100 text-zinc-900'
                        } ${isPerfMode ? 'perf-mode' : ''} ${isInteracting ? 'interacting' : ''}`}
                        onClick={() => {
                            if(historyContextMenu.visible) setHistoryContextMenu(prev => ({ ...prev, visible: false }));
                            if(frameContextMenu.visible) setFrameContextMenu(prev => ({ ...prev, visible: false }));
                        }}
                    >
                    {/* Top Bar */}
                    <div
                        className={`h-12 flex items-center justify-between px-4 z-50 shrink-0 border-b transition-colors duration-300 ${
                            theme === 'dark' ? 'bg-[#09090b] border-zinc-800' : 'bg-white border-zinc-200'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-md flex items-center justify-center">
                                <Layers size={16} className="text-white" />
                            </div>
                            <span
                                className={`font-bold text-sm tracking-wide ${
                                    theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'
                                }`}
                            >
                                tapnow
                            </span>
                            {/* 功能4：项目名称编辑 */}
                            {isEditingProjectName ? (
                                <input
                                    ref={projectNameInputRef}
                                    type="text"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    onBlur={() => {
                                        setIsEditingProjectName(false);
                                        try {
                                            localStorage.setItem('tapnow_project_name', projectName);
                                        } catch (e) {}
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            setIsEditingProjectName(false);
                                            try {
                                                localStorage.setItem('tapnow_project_name', projectName);
                                            } catch (e) {}
                                        }
                                    }}
                                    className={`ml-2 px-2 py-0.5 text-xs border rounded outline-none ${
                                        theme === 'dark'
                                            ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                                            : 'bg-white border-zinc-300 text-zinc-800'
                                    }`}
                                    style={{ minWidth: '100px', maxWidth: '200px' }}
                                />
                            ) : (
                                <span
                                    onClick={() => {
                                        setIsEditingProjectName(true);
                                        setTimeout(() => projectNameInputRef.current?.focus(), 0);
                                    }}
                                    className={`ml-2 text-xs cursor-pointer hover:underline ${
                                        theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'
                                    }`}
                                    title="点击编辑项目名称"
                                >
                                    {projectName}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {/* 性能模式开关 */}
                            <button
                                onClick={() => setPerformanceMode(!isPerformanceMode)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                                    isPerformanceMode
                                        ? theme === 'dark'
                                            ? 'bg-blue-600 border-blue-500 text-white hover:bg-blue-500'
                                            : 'bg-blue-500 border-blue-400 text-white hover:bg-blue-600'
                                        : theme === 'dark'
                                            ? 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800'
                                            : 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200'
                                }`}
                                title="性能模式：禁用毛玻璃效果和阴影，优化渲染性能"
                            >
                                <span>⚡</span>
                                <span>性能模式</span>
                            </button>
                            {/* 功能1：下载按钮 */}
                            <button
                                onClick={handleBatchDownload}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                                    theme === 'dark'
                                        ? 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800'
                                        : 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200'
                                }`}
                                title="批量下载选中的图片/视频节点"
                            >
                                <Download size={14} />
                                <span>下载</span>
                            </button>
                            <button
                                onClick={handleToggleTheme}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                                    theme === 'dark'
                                        ? 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800'
                                        : 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200'
                                }`}
                                title="切换明暗主题"
                            >
                                {theme === 'dark' ? (
                                    <>
                                        <Sun size={14} className="text-amber-400" />
                                        <span>亮色</span>
                                    </>
                                ) : (
                                    <>
                                        <Moon size={14} className="text-blue-500" />
                                        <span>暗色</span>
                                    </>
                                )}
                            </button>
                            <Button variant="ghost" onClick={() => { setNodes([]); setConnections([]); }}>清空</Button>
                            <Button variant="secondary" icon={Settings} onClick={() => setSettingsOpen(true)}>API 设置</Button>
                        </div>
                    </div>

                    <div className={`flex-1 relative overflow-hidden flex transition-colors duration-300 ${
                        theme === 'dark' ? 'bg-[#09090b]' : 'bg-zinc-100'
                    }`}>
                        {/* Sidebar */}
                        <div
                            className={`w-14 border-r flex flex-col items-center py-3 gap-3 z-40 shrink-0 transition-colors duration-300 ${
                                theme === 'dark' ? 'bg-[#09090b] border-zinc-800' : 'bg-white border-zinc-200'
                            }`}
                        >
                            <button
                                onClick={autoArrangeNodes}
                                className={`p-2.5 rounded-lg transition-all mb-2 ${
                                    theme === 'dark'
                                        ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                                        : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200'
                                }`}
                                title="自动整理节点（对齐、排列、去除堆叠）"
                            >
                                <Layout size={18} />
                            </button>
                            {[ { id: 'select', icon: MousePointer2 }, { id: 'history', icon: History }, { id: 'characters', icon: Users } ].map((tool) => (
                                <button
                                    key={tool.id}
                                    onClick={() => {
                                        setActiveTool(tool.id);
                                        if (tool.id === 'history') setHistoryOpen(!historyOpen);
                                        if (tool.id === 'characters') setCharactersOpen(!charactersOpen);
                                    }}
                                    className={`p-2.5 rounded-lg transition-all ${
                                        activeTool === tool.id
                                            ? theme === 'dark'
                                                ? 'bg-zinc-800 text-white'
                                                : 'bg-zinc-200 text-zinc-900'
                                            : theme === 'dark'
                                                ? 'text-zinc-500 hover:text-zinc-300'
                                                : 'text-zinc-500 hover:text-zinc-800'
                                    }`}
                                >
                                    <tool.icon size={18} />
                                </button>
                            ))}
                            <div className="flex-1"></div>
                            <button
                                onClick={() => setIsChatOpen(!isChatOpen)}
                                className={`p-2.5 rounded-lg transition-all mb-2 ${
                                    isChatOpen
                                        ? 'bg-blue-600 text-white'
                                        : theme === 'dark'
                                            ? 'text-zinc-500 hover:text-zinc-300'
                                            : 'text-zinc-500 hover:text-zinc-800'
                                }`}
                                title="AI 对话"
                            >
                                <MessageSquare size={18} />
                            </button>
                            {/* 功能5：保存和加载按钮 */}
                            <button
                                onClick={handleSaveProject}
                                className={`p-2.5 rounded-lg transition-all ${
                                    theme === 'dark'
                                        ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                                        : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200'
                                }`}
                                title="保存项目"
                            >
                                <Save size={18} />
                            </button>
                            <button
                                onClick={handleLoadProject}
                                className={`p-2.5 rounded-lg transition-all mb-2 ${
                                    theme === 'dark'
                                        ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                                        : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200'
                                }`}
                                title="加载项目"
                            >
                                <FolderOpen size={18} />
                            </button>
                            <button
                                onClick={handleImportWorkflow}
                                className={`p-2.5 rounded-lg transition-all mb-2 ${
                                    theme === 'dark'
                                        ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                                        : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200'
                                }`}
                                title="导入工作流"
                            >
                                <Download size={18} />
                            </button>
                        </div>

                            {/* History Panel */}
                            <HistoryPanel
                                isOpen={historyOpen}
                                theme={theme}
                                history={history}
                                historyPerformanceMode={historyPerformanceMode}
                                setHistoryPerformanceMode={setHistoryPerformanceMode}
                                localCacheServerConnected={localCacheServerConnected}
                                localCacheSettingsOpen={localCacheSettingsOpen}
                                setLocalCacheSettingsOpen={setLocalCacheSettingsOpen}
                                localServerConfig={localServerConfig}
                                setLocalServerConfig={setLocalServerConfig}
                                updateLocalServerConfig={updateLocalServerConfig}
                                setHistory={setHistory}
                                lightboxItem={lightboxItem}
                                setLightboxItem={setLightboxItem}
                                deleteHistoryItem={deleteHistoryItem}
                                handleHistoryRightClick={handleHistoryRightClick}
                                pollVeoJob={pollVeoJob}
                                pollSoraJob={pollSoraJob}
                                onOpenBatchManagement={() => {
                                    setBatchModalOpen(true);
                                    setBatchSelectedIds(new Set());
                                }}
                                onClose={() => setHistoryOpen(false)}
                            />

                            {/* Characters Panel */}
                            <CharacterPanel
                                isOpen={charactersOpen}
                                theme={theme}
                                characters={characterLibrary}
                                setCharacters={setCharacterLibrary}
                                onCreateCharacter={() => {
                                    const soraConfig = apiConfigs.find((config) => config.type === 'Video' && (config.id === 'sora-2' || config.id === 'sora-2-pro'));
                                    const baseUrl = soraConfig
                                        ? (soraConfig.url || DEFAULT_BASE_URL).replace(/\/+$/, '')
                                        : DEFAULT_BASE_URL.replace(/\/+$/, '');
                                    setCreateCharacterEndpoint(baseUrl + '/sora/v1/characters');
                                    setCreateCharacterOpen(true);
                                }}
                                onClose={() => setCharactersOpen(false)}
                            />

                            <CreateCharacterModal
                                isOpen={createCharacterOpen}
                                theme={theme}
                                history={history}
                                historyMap={historyMap}
                                sourceType={createCharacterVideoSourceType}
                                setSourceType={setCreateCharacterVideoSourceType}
                                videoUrl={createCharacterVideoUrl}
                                setVideoUrl={setCreateCharacterVideoUrl}
                                selectedTaskId={createCharacterSelectedTaskId}
                                setSelectedTaskId={setCreateCharacterSelectedTaskId}
                                historyDropdownOpen={createCharacterHistoryDropdownOpen}
                                setHistoryDropdownOpen={setCreateCharacterHistoryDropdownOpen}
                                startSecond={createCharacterStartSecond}
                                setStartSecond={setCreateCharacterStartSecond}
                                endSecond={createCharacterEndSecond}
                                setEndSecond={setCreateCharacterEndSecond}
                                endpoint={createCharacterEndpoint}
                                setEndpoint={setCreateCharacterEndpoint}
                                submitting={createCharacterSubmitting}
                                setSubmitting={setCreateCharacterSubmitting}
                                videoError={createCharacterVideoError}
                                setVideoError={setCreateCharacterVideoError}
                                getDefaultEndpoint={() => {
                                    const soraConfig = apiConfigs.find((config) => config.type === 'Video' && (config.id === 'sora-2' || config.id === 'sora-2-pro'));
                                    const baseUrl = soraConfig
                                        ? (soraConfig.url || DEFAULT_BASE_URL).replace(/\/+$/, '')
                                        : DEFAULT_BASE_URL.replace(/\/+$/, '');
                                    return baseUrl + '/sora/v1/characters';
                                }}
                                createCharacter={createCharacter}
                                onClose={() => setCreateCharacterOpen(false)}
                            />

                        {/* Main Canvas Area */}
                        <div className="flex-1 relative overflow-hidden flex">
                             <div ref={canvasRef} id="canvas-bg" className="flex-1 h-full cursor-default relative"
                                onMouseDown={handleMouseDown} onClick={handleBackgroundClick} onDoubleClick={handleDoubleClick} onContextMenu={handleCanvasContextMenu}
                                style={{
                                    backgroundImage: theme === 'dark'
                                        ? 'radial-gradient(#27272a 1px, transparent 1px)'
                                        : 'radial-gradient(rgba(0, 0, 0, 0.08) 0.5px, transparent 0.5px)',
                                    backgroundSize: `${20 * view.zoom}px ${20 * view.zoom}px`,
                                    backgroundPosition: `${view.x}px ${view.y}px`,
                                    WebkitFontSmoothing: 'antialiased',
                                    MozOsxFontSmoothing: 'grayscale',
                                    textRendering: 'optimizeLegibility',
                                    transform: 'translateZ(0)',
                                    backfaceVisibility: 'hidden'
                                }}>
                                <div className="absolute origin-top-left will-change-transform" style={{
                                    transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.zoom})`,
                                    width: VIRTUAL_CANVAS_WIDTH,
                                    height: VIRTUAL_CANVAS_HEIGHT,
                                    WebkitFontSmoothing: 'antialiased',
                                    MozOsxFontSmoothing: 'grayscale',
                                    textRendering: 'optimizeLegibility',
                                    transformOrigin: 'top left',
                                    imageRendering: view.zoom >= 1 ? 'auto' : 'crisp-edges'
                                }}>
                                    <ConnectionLayer
                                        connections={connections}
                                        nodesMap={nodesMap}
                                        connectionsByNode={connectionsByNode}
                                        connectingSource={connectingSource}
                                        connectingTarget={connectingTarget}
                                        connectingInputType={connectingInputType}
                                        mousePos={mousePos}
                                        apiConfigsMap={apiConfigsMap}
                                        selectedNodeId={selectedNodeId}
                                        onDisconnectConnection={disconnectConnection}
                                        visibleNodes={visibleNodes}
                                    />
                                    {visibleNodes.map((node) => renderNode(node))}
                                </div>

                                {/* 框选框 */}
                                {selectionBox && (
                                    <div
                                        className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none z-50"
                                        style={{
                                            left: Math.min(selectionBox.startX, selectionBox.endX),
                                            top: Math.min(selectionBox.startY, selectionBox.endY),
                                            width: Math.abs(selectionBox.endX - selectionBox.startX),
                                            height: Math.abs(selectionBox.endY - selectionBox.startY),
                                        }}
                                    />
                                )}
                            </div>

                            {/* Chat Sidebar Panel */}
                            <ChatSidebar
                                theme={theme}
                                isOpen={isChatOpen}
                                width={chatWidth}
                                onResizeStart={handleChatResizeStart}
                                chatModel={chatModel}
                                setChatModel={setChatModel}
                                apiConfigs={apiConfigs}
                                getStatusColor={getStatusColor}
                                createNewChat={createNewChat}
                                chatSessions={chatSessions}
                                currentChatId={currentChatId}
                                setCurrentChatId={setCurrentChatId}
                                chatSessionDropdownOpen={chatSessionDropdownOpen}
                                setChatSessionDropdownOpen={setChatSessionDropdownOpen}
                                deleteChatSession={deleteChatSession}
                                currentSession={currentSession}
                                isChatSending={isChatSending}
                                chatEndRef={chatEndRef}
                                chatFiles={chatFiles}
                                removeChatFile={removeChatFile}
                                handleChatFileUpload={handleChatFileUpload}
                                chatInput={chatInput}
                                setChatInput={setChatInput}
                                sendChatMessage={sendChatMessage}
                                onClose={() => setIsChatOpen(false)}
                            />

                            <CanvasContextMenus
                                theme={theme}
                                contextMenu={contextMenu}
                                setContextMenu={setContextMenu}
                                addNode={addNode}
                                historyContextMenu={historyContextMenu}
                                setHistoryContextMenu={setHistoryContextMenu}
                                sendHistoryToChat={sendHistoryToChat}
                                sendHistoryToCanvas={sendHistoryToCanvas}
                                setNodes={setNodes}
                                applyHistoryToSelectedNode={applyHistoryToSelectedNode}
                                selectedNodeId={selectedNodeId}
                                activeShot={activeShot}
                                updateShot={updateShot}
                                handleSplitGridFromUrl={handleSplitGridFromUrl}
                                frameContextMenu={frameContextMenu}
                                sendFrameToChat={sendFrameToChat}
                                sendFrameToCanvas={sendFrameToCanvas}
                                sendFrameToPreview={sendFrameToPreview}
                                applyFrameToSelectedNode={applyFrameToSelectedNode}
                                previewContextMenu={previewContextMenu}
                                closePreviewContextMenu={closePreviewContextMenu}
                                sendPreviewToChat={sendPreviewToChat}
                                sendPreviewToCanvas={sendPreviewToCanvas}
                                selectedNodeIdsRef={selectedNodeIdsRef}
                                inputImageContextMenu={inputImageContextMenu}
                                closeInputImageContextMenu={closeInputImageContextMenu}
                                sendInputImageToChat={sendInputImageToChat}
                                nodesMap={nodesMap}
                                selectionContextMenu={selectionContextMenu}
                                setSelectionContextMenu={setSelectionContextMenu}
                                selectedNodeIds={selectedNodeIds}
                                handleSaveSelectedWorkflow={handleSaveSelectedWorkflow}
                            />

                            <Lightbox
                                item={lightboxItem}
                                onClose={() => setLightboxItem(null)}
                                onNavigate={(newIndex) => {
                                    if (lightboxItem && lightboxItem.mjImages && lightboxItem.mjImages.length > newIndex && newIndex >= 0) {
                                        // 确保newIndex在有效范围内
                                        const validIndex = Math.max(0, Math.min(newIndex, lightboxItem.mjImages.length - 1));
                                        // 更新历史记录中的selectedMjImageIndex（只更新当前lightboxItem对应的历史项）
                                        setHistory((prev) => prev.map((hItem) =>
                                            hItem.id === lightboxItem.id
                                                ? { ...hItem, url: lightboxItem.mjImages[validIndex], selectedMjImageIndex: validIndex }
                                                : hItem
                                        ));
                                        // 更新lightboxItem显示
                                        setLightboxItem({
                                            ...lightboxItem,
                                            url: lightboxItem.mjImages[validIndex],
                                            selectedMjImageIndex: validIndex
                                        });
                                    }
                                }}
                            />

                            <ApiSettingsModal
                                isOpen={settingsOpen}
                                theme={theme}
                                globalApiKey={globalApiKey}
                                setGlobalApiKey={setGlobalApiKey}
                                jimengUseLocalFile={jimengUseLocalFile}
                                setJimengUseLocalFile={setJimengUseLocalFile}
                                apiConfigs={apiConfigs}
                                setApiConfigs={setApiConfigs}
                                updateApiConfig={updateApiConfig}
                                deleteApiConfig={deleteApiConfig}
                                addNewModel={addNewModel}
                                testApiConnection={testApiConnection}
                                apiTesting={apiTesting}
                                apiStatus={apiStatus}
                                getStatusColor={getStatusColor}
                                deletedModelIds={DELETED_MODEL_IDS}
                                onClose={() => setSettingsOpen(false)}
                            />
                        </div>

                        <BatchHistoryModal
                            isOpen={batchModalOpen}
                            theme={theme}
                            history={history}
                            selectedIds={batchSelectedIds}
                            setSelectedIds={setBatchSelectedIds}
                            onClose={() => setBatchModalOpen(false)}
                            setHistory={setHistory}
                            setLightboxItem={setLightboxItem}
                            screenToWorld={screenToWorld}
                            addNode={addNode}
                            getImageDimensions={getImageDimensions}
                            isVideoUrl={isVideoUrl}
                        />
                    </div>
                </div>
                </>
            );
        }

export default TapnowApp;
