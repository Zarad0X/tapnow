import React from 'react';
import {
    ArrowRightSquare,
    CopyPlus,
    LayoutGrid,
    Maximize2,
    MessageSquare,
    Save,
    Scissors,
} from '../../shared/icons.jsx';

const ADD_NODE_ITEMS = [
    { type: 'input-image', label: '图片输入' },
    { type: 'text-node', label: '文字节点' },
    { type: 'novel-input', label: '小说输入' },
    { type: 'video-input', label: '视频输入' },
    { type: 'video-analyze', label: '视频拆解 / 提示词反推' },
    { type: 'storyboard-node', label: '智能分镜表' },
    { type: 'gen-image', label: 'AI 绘图' },
    { type: 'gen-video', label: 'AI 视频' },
    { type: 'image-compare', label: '图像对比' },
    { type: 'preview', label: '预览窗口' },
    { type: 'local-save', label: '保存到本地' },
];

const FloatingMenu = ({ theme, menu, width = 'w-48', z = 'z-[110]', onMouseLeave, children }) => {
    if (!menu.visible) return null;

    return (
        <div
            className={`fixed ${z} ${width} rounded-lg shadow-2xl py-1 animate-in fade-in duration-100 border ${
                theme === 'dark' ? 'bg-[#18181b] border-zinc-700' : 'bg-white border-zinc-200'
            }`}
            style={{ left: menu.x, top: menu.y }}
            onMouseLeave={onMouseLeave}
        >
            {children}
        </div>
    );
};

const MenuTitle = ({ theme, children }) => (
    <div className={`px-3 py-1.5 text-[10px] font-medium border-b mb-1 ${
        theme === 'dark' ? 'text-zinc-500 border-zinc-800' : 'text-zinc-500 border-zinc-200'
    }`}>
        {children}
    </div>
);

const MenuButton = ({ theme, onClick, icon: Icon, iconClassName, children }) => (
    <button
        className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${
            theme === 'dark' ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-700 hover:bg-zinc-100'
        }`}
        onClick={onClick}
    >
        {Icon && <Icon size={14} className={iconClassName} />}
        {children}
    </button>
);

export const CanvasContextMenus = ({
    theme,
    contextMenu,
    setContextMenu,
    addNode,
    historyContextMenu,
    setHistoryContextMenu,
    sendHistoryToChat,
    sendHistoryToCanvas,
    setNodes,
    applyHistoryToSelectedNode,
    selectedNodeId,
    activeShot,
    updateShot,
    handleSplitGridFromUrl,
    frameContextMenu,
    sendFrameToChat,
    sendFrameToCanvas,
    sendFrameToPreview,
    applyFrameToSelectedNode,
    previewContextMenu,
    closePreviewContextMenu,
    sendPreviewToChat,
    sendPreviewToCanvas,
    selectedNodeIdsRef,
    inputImageContextMenu,
    closeInputImageContextMenu,
    sendInputImageToChat,
    nodesMap,
    selectionContextMenu,
    setSelectionContextMenu,
    selectedNodeIds,
    handleSaveSelectedWorkflow,
}) => {
    const closeHistoryContextMenu = () => {
        setHistoryContextMenu({ visible: false, x: 0, y: 0, worldX: 0, worldY: 0, item: null });
    };

    return (
        <>
            {contextMenu.visible && (
                <div
                    className={`fixed z-50 w-40 rounded-lg shadow-xl border ${
                        theme === 'dark' ? 'bg-[#18181b] border-zinc-800' : 'bg-white border-zinc-200'
                    }`}
                    style={{ left: contextMenu.x, top: contextMenu.y, transform: 'translate(-50%, -50%)' }}
                    onMouseLeave={() => setContextMenu((prev) => ({ ...prev, visible: false }))}
                >
                    <div className="p-1">
                        {ADD_NODE_ITEMS.map((item) => (
                            <button
                                key={item.type}
                                className={`w-full text-left px-3 py-2 text-xs rounded transition-colors ${
                                    theme === 'dark' ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-700 hover:bg-zinc-100'
                                }`}
                                onClick={() => addNode(
                                    item.type,
                                    contextMenu.worldX,
                                    contextMenu.worldY,
                                    contextMenu.sourceNodeId,
                                    undefined,
                                    undefined,
                                    contextMenu.targetNodeId,
                                    contextMenu.inputType,
                                )}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <FloatingMenu theme={theme} menu={historyContextMenu} z="z-[100]">
                <MenuTitle theme={theme}>操作</MenuTitle>
                <MenuButton theme={theme} onClick={sendHistoryToChat} icon={MessageSquare} iconClassName="text-purple-500">
                    发送到当前对话
                </MenuButton>
                <MenuButton theme={theme} onClick={sendHistoryToCanvas} icon={CopyPlus} iconClassName="text-blue-500">
                    发送到画布
                </MenuButton>
                <MenuButton
                    theme={theme}
                    onClick={() => {
                        const item = historyContextMenu.item;
                        if (!item?.url) return;
                        setNodes((prev) => {
                            const previews = prev.filter((node) => node.type === 'preview');
                            if (!previews.length) return prev;
                            const targetId = previews[previews.length - 1].id;
                            return prev.map((node) => (
                                node.id === targetId
                                    ? { ...node, content: item.url, previewType: item.type === 'video' ? 'video' : 'image' }
                                    : node
                            ));
                        });
                        setHistoryContextMenu({ visible: false, x: 0, y: 0, item: null });
                    }}
                    icon={Maximize2}
                    iconClassName="text-emerald-500"
                >
                    发送到预览窗口
                </MenuButton>
                <MenuButton
                    theme={theme}
                    onClick={applyHistoryToSelectedNode}
                    icon={ArrowRightSquare}
                    iconClassName={selectedNodeId ? 'text-green-500' : 'text-zinc-400'}
                >
                    应用到选中节点
                </MenuButton>
                <MenuButton
                    theme={theme}
                    onClick={() => {
                        const item = historyContextMenu.item;
                        if (!item?.url) return;

                        if (activeShot.nodeId && activeShot.shotId) {
                            updateShot(activeShot.nodeId, activeShot.shotId, { image_url: item.url });
                        } else {
                            alert('请先点击分镜表中的某一行使其处于选中状态');
                        }
                        closeHistoryContextMenu();
                    }}
                    icon={LayoutGrid}
                    iconClassName={activeShot.nodeId && activeShot.shotId ? 'text-orange-500' : 'text-zinc-400'}
                >
                    发送到当前分镜
                </MenuButton>
                <MenuButton
                    theme={theme}
                    onClick={() => {
                        const item = historyContextMenu.item;
                        if (item?.url) {
                            const startX = (historyContextMenu.worldX || 0) + 340;
                            const startY = historyContextMenu.worldY || 0;
                            handleSplitGridFromUrl(item.url, { originX: startX, originY: startY });
                        }
                        closeHistoryContextMenu();
                    }}
                    icon={Scissors}
                    iconClassName="text-blue-500"
                >
                    九宫格裁切
                </MenuButton>
            </FloatingMenu>

            <FloatingMenu theme={theme} menu={frameContextMenu}>
                <MenuTitle theme={theme}>操作</MenuTitle>
                <MenuButton theme={theme} onClick={sendFrameToChat} icon={MessageSquare} iconClassName="text-purple-500">
                    发送到当前对话
                </MenuButton>
                <MenuButton theme={theme} onClick={sendFrameToCanvas} icon={CopyPlus} iconClassName="text-blue-500">
                    发送到画布
                </MenuButton>
                <MenuButton theme={theme} onClick={sendFrameToPreview} icon={Maximize2} iconClassName="text-emerald-500">
                    发送到预览窗口
                </MenuButton>
                <MenuButton
                    theme={theme}
                    onClick={applyFrameToSelectedNode}
                    icon={ArrowRightSquare}
                    iconClassName={selectedNodeId ? 'text-green-500' : 'text-zinc-400'}
                >
                    应用到选中节点
                </MenuButton>
            </FloatingMenu>

            <FloatingMenu theme={theme} menu={previewContextMenu} onMouseLeave={closePreviewContextMenu}>
                <MenuTitle theme={theme}>操作</MenuTitle>
                <MenuButton theme={theme} onClick={sendPreviewToChat} icon={MessageSquare} iconClassName="text-purple-500">
                    发送到当前对话
                </MenuButton>
                <MenuButton theme={theme} onClick={sendPreviewToCanvas} icon={CopyPlus} iconClassName="text-blue-500">
                    发送到画布
                </MenuButton>
                <MenuButton
                    theme={theme}
                    onClick={() => {
                        const item = previewContextMenu.item;
                        if (item?.url) {
                            const currentSelectedIds = selectedNodeIdsRef.current;
                            const hasSelectedNodes = currentSelectedIds && currentSelectedIds.size === 9;
                            if (hasSelectedNodes) {
                                handleSplitGridFromUrl(item.url, { replaceSelected: true });
                            } else {
                                const source = item.sourceNode;
                                const originX = source ? source.x + source.width + 20 : undefined;
                                const originY = source ? source.y : undefined;
                                handleSplitGridFromUrl(item.url, { originX, originY });
                            }
                        }
                        closePreviewContextMenu();
                    }}
                    icon={Scissors}
                    iconClassName="text-blue-500"
                >
                    九宫格裁切
                </MenuButton>
            </FloatingMenu>

            <FloatingMenu theme={theme} menu={inputImageContextMenu} onMouseLeave={closeInputImageContextMenu}>
                <MenuTitle theme={theme}>操作</MenuTitle>
                <MenuButton theme={theme} onClick={sendInputImageToChat} icon={MessageSquare} iconClassName="text-purple-500">
                    发送到当前对话
                </MenuButton>
                <MenuButton
                    theme={theme}
                    onClick={() => {
                        const nodeId = inputImageContextMenu.nodeId;
                        const node = nodesMap.get(nodeId);
                        if (!node || !node.content) return;

                        const currentSelectedIds = selectedNodeIdsRef.current;
                        const hasSelectedNodes = currentSelectedIds && currentSelectedIds.size === 9;
                        if (hasSelectedNodes) {
                            handleSplitGridFromUrl(node.content, { replaceSelected: true });
                        } else {
                            handleSplitGridFromUrl(node.content, {
                                originX: node.x + node.width + 20,
                                originY: node.y,
                            });
                        }
                        closeInputImageContextMenu();
                    }}
                    icon={Scissors}
                    iconClassName="text-blue-500"
                >
                    九宫格裁切
                </MenuButton>
            </FloatingMenu>

            <FloatingMenu
                theme={theme}
                menu={selectionContextMenu}
                width="w-52"
                z="z-[120]"
                onMouseLeave={() => setSelectionContextMenu({ visible: false, x: 0, y: 0 })}
            >
                <MenuTitle theme={theme}>
                    选中 {selectedNodeIds.size > 0 ? selectedNodeIds.size : (selectedNodeId ? 1 : 0)} 个节点
                </MenuTitle>
                <MenuButton theme={theme} onClick={handleSaveSelectedWorkflow} icon={Save} iconClassName="text-blue-500">
                    保存当前选取工作流
                </MenuButton>
            </FloatingMenu>
        </>
    );
};
