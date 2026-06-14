import { useCallback } from 'react';
import {
    loadProjectFromFile,
    saveProject,
} from '../services/projectService.js';
import {
    importWorkflowFromFile,
    saveSelectedWorkflow,
} from '../services/workflowService.js';

const resolveSelectedIds = ({ selectedNodeId, selectedNodeIds }) => {
    if (selectedNodeIds.size > 0) return selectedNodeIds;
    return selectedNodeId ? new Set([selectedNodeId]) : new Set();
};

export const useProjectWorkflowActions = ({
    canvasRef,
    characterLibrary,
    chatSessions,
    connections,
    history,
    nodes,
    projectName,
    screenToWorld,
    selectedNodeId,
    selectedNodeIds,
    setConnections,
    setCharacterLibrary,
    setChatSessions,
    setHistory,
    setNodes,
    setProgressState,
    setProjectName,
    setSelectedNodeIds,
    setSelectionContextMenu,
    setView,
    view,
}) => {
    const handleSaveProject = useCallback(async () => {
        try {
            const saved = await saveProject({
                projectName,
                nodes,
                connections,
                view,
                history,
                chatSessions,
                characterLibrary,
            });
            if (saved) alert('项目保存成功！');
        } catch (error) {
            console.error('保存项目失败:', error);
            if (error.name === 'AbortError') return;
            alert(`保存失败: ${error.message || '未知错误'}`);
        }
    }, [characterLibrary, chatSessions, connections, history, nodes, projectName, view]);

    const handleSaveSelectedWorkflow = useCallback(async () => {
        try {
            setSelectionContextMenu({ visible: false, x: 0, y: 0 });

            const selectedIds = resolveSelectedIds({ selectedNodeId, selectedNodeIds });
            if (selectedIds.size === 0) {
                alert('请先选择要保存的节点');
                return;
            }

            const selectedNodes = nodes.filter((node) => selectedIds.has(node.id));
            const selectedConnections = connections.filter((connection) => (
                selectedIds.has(connection.from) && selectedIds.has(connection.to)
            ));

            const saved = await saveSelectedWorkflow({ selectedNodes, selectedConnections });
            if (saved) alert('工作流保存成功！');
        } catch (error) {
            console.error('保存工作流失败:', error);
            if (error.name === 'AbortError') return;
            alert(`保存失败: ${error.message || '未知错误'}`);
        }
    }, [connections, nodes, selectedNodeId, selectedNodeIds, setSelectionContextMenu]);

    const handleImportWorkflow = useCallback(async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (event) => {
            const file = event.target.files[0];
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
                setNodes((prev) => [...prev, ...newNodes]);
                setConnections((prev) => [...prev, ...newConnections]);
                setSelectedNodeIds(new Set(newNodes.map((node) => node.id)));

                alert(`工作流导入成功！\n\n导入了 ${newNodes.length} 个节点和 ${newConnections.length} 个连接。`);
            } catch (error) {
                console.error('导入工作流失败:', error);
                alert(`导入失败: ${error.message || '无效的JSON文件'}`);
            }
        };
        input.click();
    }, [canvasRef, screenToWorld, setConnections, setNodes, setSelectedNodeIds]);

    const handleLoadProject = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            setProgressState({ visible: true, progress: 0, status: 'INITIALIZING...', type: 'import' });

            try {
                const tempState = await loadProjectFromFile({
                    file,
                    onProgress: ({ progress, status }) => {
                        setProgressState((prev) => ({ ...prev, progress, status }));
                    },
                });

                setProgressState((prev) => ({ ...prev, progress: 100, status: 'FINALIZING...' }));

                setTimeout(() => {
                    if (tempState.projectName) setProjectName(tempState.projectName);
                    if (tempState.view) setView(tempState.view);
                    if (tempState.connections.length > 0) setConnections(tempState.connections);
                    if (tempState.chatSessions.length > 0) setChatSessions(tempState.chatSessions);
                    if (tempState.characterLibrary.length > 0) setCharacterLibrary(tempState.characterLibrary);
                    if (tempState.nodes.length > 0) setNodes(tempState.nodes);
                    if (tempState.history.length > 0) setHistory(tempState.history);

                    setProgressState((prev) => ({ ...prev, visible: false }));
                    alert(`加载成功！\n${tempState.nodes.length} 个节点`);
                }, 200);
            } catch (error) {
                console.error('加载失败:', error);
                setProgressState((prev) => ({ ...prev, visible: false }));
                alert(`加载失败: ${error.message}`);
            }
        };
        input.click();
    }, [
        setCharacterLibrary,
        setChatSessions,
        setConnections,
        setHistory,
        setNodes,
        setProgressState,
        setProjectName,
        setView,
    ]);

    return {
        handleImportWorkflow,
        handleLoadProject,
        handleSaveProject,
        handleSaveSelectedWorkflow,
    };
};
