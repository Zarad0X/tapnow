import {
    convertBlobUrlsToDataUrls,
    convertNodeBlobUrls,
    downloadJson,
    getCSTFilenameTimestamp,
    getCSTTimestamp,
    replacer,
} from './projectService.js';
import {
    findLocalFileUrlBySize,
    listLocalLibraryFiles,
} from './localCacheService.js';

const WORKFLOW_VERSION = '2.8';

export const saveSelectedWorkflow = async ({ selectedNodes, selectedConnections }) => {
    if (!window.showSaveFilePicker) {
        const shouldProceed = confirm('您的浏览器不支持流式保存大文件。\n\n是否继续使用传统方式保存？');
        if (!shouldProceed) return false;

        const nodesToSave = JSON.parse(JSON.stringify(selectedNodes, replacer));
        const nodesWithDataUrls = await convertBlobUrlsToDataUrls(nodesToSave);
        const workflowData = {
            version: WORKFLOW_VERSION,
            type: 'workflow',
            nodes: nodesWithDataUrls,
            connections: selectedConnections,
            timestamp: getCSTTimestamp(),
        };

        const jsonStr = JSON.stringify(workflowData, replacer, 2);
        const timestamp = getCSTFilenameTimestamp();
        downloadJson(jsonStr, `工作流_${timestamp}.json`);
        return true;
    }

    const timestamp = getCSTFilenameTimestamp();
    const handle = await window.showSaveFilePicker({
        suggestedName: `工作流_${timestamp}.json`,
        types: [{ description: 'JSON File', accept: { 'application/json': ['.json'] } }],
    });
    const writable = await handle.createWritable();

    await writable.write(`{\n  "version": "${WORKFLOW_VERSION}",\n  "type": "workflow",\n  "nodes": [\n`);

    for (let i = 0; i < selectedNodes.length; i++) {
        const convertedNode = await convertNodeBlobUrls(selectedNodes[i]);
        const nodeJson = JSON.stringify(convertedNode, replacer, 4);
        const indentedJson = nodeJson.split('\n').map((line) => `    ${line}`).join('\n');
        await writable.write(indentedJson);
        await writable.write(i < selectedNodes.length - 1 ? ',\n' : '\n');
    }

    await writable.write(`  ],\n  "connections": ${JSON.stringify(selectedConnections, replacer, 2)},\n  "timestamp": ${JSON.stringify(getCSTTimestamp())}\n}`);
    await writable.close();
    return true;
};

const convertNodeUrls = async (node, localFiles) => {
    const stack = [node];
    while (stack.length > 0) {
        const current = stack.pop();
        if (!current || typeof current !== 'object') continue;

        for (const key in current) {
            const value = current[key];
            if (typeof value === 'string' && (value.startsWith('data:image/') || value.startsWith('data:video/'))) {
                try {
                    const localUrl = findLocalFileUrlBySize(value, localFiles);
                    if (localUrl) {
                        const testRes = await fetch(localUrl, { method: 'HEAD' });
                        if (testRes.ok) {
                            current[key] = localUrl;
                            console.log('[导入工作流] 使用本地文件');
                            continue;
                        }
                    }

                    const res = await fetch(value);
                    const blob = await res.blob();
                    current[key] = URL.createObjectURL(blob);
                } catch (error) {}
            } else if (typeof value === 'object' && value !== null) {
                stack.push(value);
            }
        }
    }
    return node;
};

export const importWorkflowFromFile = async ({ file, importPosition = { x: 100, y: 100 } }) => {
    const text = await file.text();
    const data = JSON.parse(text);

    if (data.type !== 'workflow') {
        throw new Error('这不是一个有效的工作流文件。\n\n请使用"保存当前选取工作流"功能导出的文件。');
    }

    if (!data.nodes || data.nodes.length === 0) {
        throw new Error('工作流文件中没有节点数据');
    }

    let localFiles = [];
    try {
        localFiles = await listLocalLibraryFiles();
        if (localFiles.length) {
            console.log(`[导入工作流] 本地库已连接，找到 ${localFiles.length} 个文件`);
        }
    } catch (error) {
        console.log('[导入工作流] 本地服务器未连接');
    }

    const idMap = new Map();
    data.nodes.forEach((node) => {
        idMap.set(node.id, `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    });

    let minX = Infinity;
    let minY = Infinity;
    data.nodes.forEach((node) => {
        if (node.x < minX) minX = node.x;
        if (node.y < minY) minY = node.y;
    });

    const newNodes = [];
    for (const node of data.nodes) {
        const convertedNode = await convertNodeUrls({ ...node }, localFiles);
        convertedNode.id = idMap.get(node.id);
        convertedNode.x = node.x - minX + importPosition.x;
        convertedNode.y = node.y - minY + importPosition.y;
        newNodes.push(convertedNode);
    }

    const newConnections = (data.connections || []).map((connection) => ({
        ...connection,
        from: idMap.get(connection.from),
        to: idMap.get(connection.to),
    })).filter((connection) => connection.from && connection.to);

    return { newNodes, newConnections };
};

