import { useCallback } from 'react';
import {
    createEmptyStoryboardShot,
    createShotsFromAnalysisResults,
    renumberStoryboardShots,
    updateStoryboardShot,
} from '../services/storyboardService.js';

export const useStoryboardActions = ({
    apiConfigs,
    getConnectedVideoAnalyzeNode,
    nodesMap,
    setConnections,
    setNodes,
    updateNodeSettings,
}) => {
    const addEmptyShot = useCallback((nodeId) => {
        const node = nodesMap.get(nodeId);
        if (!node || node.type !== 'storyboard-node') return;

        const defaultModel = apiConfigs.find((config) => config.type === 'Video' && config.id === 'sora-2')?.id
            || apiConfigs.find((config) => config.type === 'Video')?.id
            || '';
        const newShot = createEmptyStoryboardShot({
            shotCount: node.settings?.shots?.length || 0,
            defaultModel,
        });

        updateNodeSettings(nodeId, {
            shots: [...(node.settings?.shots || []), newShot],
        });
    }, [apiConfigs, nodesMap, updateNodeSettings]);

    const deleteShot = useCallback((nodeId, shotId) => {
        const node = nodesMap.get(nodeId);
        if (!node || node.type !== 'storyboard-node') return;

        const updatedShots = renumberStoryboardShots((node.settings?.shots || []).filter((shot) => shot.id !== shotId));
        updateNodeSettings(nodeId, { shots: updatedShots });
    }, [nodesMap, updateNodeSettings]);

    const updateShot = useCallback((nodeId, shotId, updates) => {
        const node = nodesMap.get(nodeId);
        if (!node || node.type !== 'storyboard-node') return;

        const updatedShots = updateStoryboardShot(node.settings?.shots || [], shotId, updates);
        updateNodeSettings(nodeId, { shots: updatedShots });
    }, [nodesMap, updateNodeSettings]);

    const importShotsFromAnalysis = useCallback((nodeId) => {
        const storyboardNode = nodesMap.get(nodeId);
        if (!storyboardNode || storyboardNode.type !== 'storyboard-node') return;

        const analyzeNode = getConnectedVideoAnalyzeNode(nodeId);
        if (!analyzeNode) {
            alert('请先连接一个视频拆解节点');
            return;
        }

        const analysisResults = analyzeNode.settings?.analysisResults || analyzeNode.analysisResults || [];
        if (analysisResults.length === 0) {
            alert('视频拆解节点没有分析结果，请先执行分析');
            return;
        }

        updateNodeSettings(nodeId, {
            shots: createShotsFromAnalysisResults(analysisResults),
        });
    }, [getConnectedVideoAnalyzeNode, nodesMap, updateNodeSettings]);

    const createStoryboardFromAnalysisResult = useCallback((analyzeNodeId, analysisResults) => {
        const analyzeNode = nodesMap.get(analyzeNodeId);
        if (!analyzeNode || !analysisResults || analysisResults.length === 0) {
            console.warn('[自动生成分镜表] 分析节点不存在或分析结果为空');
            return;
        }

        const newShots = createShotsFromAnalysisResults(analysisResults, {
            includeGlobalCamera: true,
        });
        const storyboardId = `node-storyboard-${Date.now()}`;
        const newNode = {
            id: storyboardId,
            type: 'storyboard-node',
            x: analyzeNode.x + analyzeNode.width + 100,
            y: analyzeNode.y,
            width: 600,
            height: 500,
            settings: {
                projectTitle: 'AI 拆解结果',
                shots: newShots,
            },
        };

        setNodes((prev) => [...prev, newNode]);
        setConnections((prev) => [...prev, {
            id: `conn-${Date.now()}`,
            from: analyzeNodeId,
            to: storyboardId,
        }]);

        console.log('[自动生成分镜表] 已创建分镜表节点，包含', newShots.length, '个镜头');
    }, [nodesMap, setConnections, setNodes]);

    return {
        addEmptyShot,
        createStoryboardFromAnalysisResult,
        deleteShot,
        importShotsFromAnalysis,
        updateShot,
    };
};
