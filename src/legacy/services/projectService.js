import { isVideoUrl } from '../utils/mediaUtils.js';
import {
    blobToDataURL,
    getBase64FromUrl,
    getBlobFromUrl,
} from '../utils/mediaProcessing.js';
import {
    LOCAL_LIBRARY_SERVER_URL,
    findLocalFileUrlBySize,
    listLocalLibraryFiles,
} from './localCacheService.js';

const PROJECT_VERSION = '2.5.7';

export const replacer = (key, value) => (value === undefined ? null : value);

export const getCSTTimestamp = () => {
    const now = new Date();
    const cstTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    return cstTime.toISOString();
};

export const getCSTFilenameTimestamp = () => {
    const now = new Date();
    const cstTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const year = cstTime.getUTCFullYear();
    const month = String(cstTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(cstTime.getUTCDate()).padStart(2, '0');
    const hours = String(cstTime.getUTCHours()).padStart(2, '0');
    const minutes = String(cstTime.getUTCMinutes()).padStart(2, '0');
    const seconds = String(cstTime.getUTCSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}-${minutes}-${seconds}`;
};

export { blobToDataURL, getBase64FromUrl, getBlobFromUrl };

export const downloadJson = (jsonStr, filename) => {
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const convertBlobUrlsToDataUrls = async (obj) => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string' && obj.startsWith('blob:')) {
        try {
            const blob = await getBlobFromUrl(obj);
            return await blobToDataURL(blob);
        } catch (error) {
            console.error('转换 Blob URL 失败:', error);
            return obj;
        }
    }
    if (Array.isArray(obj)) {
        return await Promise.all(obj.map((item) => convertBlobUrlsToDataUrls(item)));
    }
    if (typeof obj === 'object') {
        const converted = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                converted[key] = await convertBlobUrlsToDataUrls(obj[key]);
            }
        }
        return converted;
    }
    return obj;
};

export const convertNodeBlobUrls = async (node) => {
    const nodeCopy = { ...node };

    if (nodeCopy.content && typeof nodeCopy.content === 'string' && nodeCopy.content.startsWith('blob:')) {
        try {
            const b64 = await getBase64FromUrl(nodeCopy.content);
            const mime = isVideoUrl(nodeCopy.content) ? 'video/mp4' : 'image/png';
            nodeCopy.content = `data:${mime};base64,${b64}`;
        } catch (error) {
            console.error('转换节点 content 失败:', error);
        }
    }

    if (nodeCopy.maskContent && typeof nodeCopy.maskContent === 'string' && nodeCopy.maskContent.startsWith('blob:')) {
        try {
            const b64 = await getBase64FromUrl(nodeCopy.maskContent);
            nodeCopy.maskContent = `data:image/png;base64,${b64}`;
        } catch (error) {
            console.error('转换节点 maskContent 失败:', error);
        }
    }

    if (Array.isArray(nodeCopy.selectedKeyframes)) {
        for (let i = 0; i < nodeCopy.selectedKeyframes.length; i++) {
            const frame = nodeCopy.selectedKeyframes[i];
            if (frame?.url && typeof frame.url === 'string' && frame.url.startsWith('blob:')) {
                try {
                    const b64 = await getBase64FromUrl(frame.url);
                    frame.url = `data:image/png;base64,${b64}`;
                } catch (error) {
                    console.error('转换关键帧失败:', error);
                }
            }
        }
    }

    if (Array.isArray(nodeCopy.frames)) {
        for (let i = 0; i < nodeCopy.frames.length; i++) {
            const frame = nodeCopy.frames[i];
            if (frame?.url && typeof frame.url === 'string' && frame.url.startsWith('blob:')) {
                try {
                    const b64 = await getBase64FromUrl(frame.url);
                    frame.url = `data:image/png;base64,${b64}`;
                } catch (error) {
                    console.error('转换帧失败:', error);
                }
            }
        }
    }

    if (Array.isArray(nodeCopy.previewMjImages)) {
        for (let i = 0; i < nodeCopy.previewMjImages.length; i++) {
            const imgUrl = nodeCopy.previewMjImages[i];
            if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('blob:')) {
                try {
                    const b64 = await getBase64FromUrl(imgUrl);
                    nodeCopy.previewMjImages[i] = `data:image/png;base64,${b64}`;
                } catch (error) {
                    console.error('转换预览图片失败:', error);
                }
            }
        }
    }

    return nodeCopy;
};

const convertHistoryItemBlobUrls = async (item) => {
    const itemCopy = { ...item };

    if (itemCopy.url && typeof itemCopy.url === 'string' && itemCopy.url.startsWith('blob:')) {
        try {
            const b64 = await getBase64FromUrl(itemCopy.url);
            const mime = itemCopy.type === 'video' ? 'video/mp4' : 'image/png';
            itemCopy.url = `data:${mime};base64,${b64}`;
        } catch (error) {
            console.error('转换历史记录 url 失败:', error);
        }
    }

    if (itemCopy.mjOriginalUrl && typeof itemCopy.mjOriginalUrl === 'string' && itemCopy.mjOriginalUrl.startsWith('blob:')) {
        try {
            const b64 = await getBase64FromUrl(itemCopy.mjOriginalUrl);
            itemCopy.mjOriginalUrl = `data:image/png;base64,${b64}`;
        } catch (error) {
            console.error('转换 mjOriginalUrl 失败:', error);
        }
    }

    if (Array.isArray(itemCopy.mjImages)) {
        for (let i = 0; i < itemCopy.mjImages.length; i++) {
            const imgUrl = itemCopy.mjImages[i];
            if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('blob:')) {
                try {
                    const b64 = await getBase64FromUrl(imgUrl);
                    itemCopy.mjImages[i] = `data:image/png;base64,${b64}`;
                } catch (error) {
                    console.error('转换 mjImages 失败:', error);
                }
            }
        }
    }

    return itemCopy;
};

const convertCharacterBlobUrls = async (character) => {
    const charCopy = { ...character };

    if (charCopy.avatar && typeof charCopy.avatar === 'string' && charCopy.avatar.startsWith('blob:')) {
        try {
            const b64 = await getBase64FromUrl(charCopy.avatar);
            charCopy.avatar = `data:image/png;base64,${b64}`;
        } catch (error) {
            console.error('转换角色 avatar 失败:', error);
        }
    }

    if (charCopy.profile_picture_url && typeof charCopy.profile_picture_url === 'string' && charCopy.profile_picture_url.startsWith('blob:')) {
        try {
            const b64 = await getBase64FromUrl(charCopy.profile_picture_url);
            charCopy.profile_picture_url = `data:image/png;base64,${b64}`;
        } catch (error) {
            console.error('转换角色 profile_picture_url 失败:', error);
        }
    }

    return charCopy;
};

export const saveProject = async ({ projectName, nodes, connections, view, history, chatSessions, characterLibrary }) => {
    if (!window.showSaveFilePicker) {
        const shouldProceed = confirm('您的浏览器不支持流式保存大文件。\n\n如果项目包含大量图片/视频（>500MB），建议使用 Chrome 或 Edge 浏览器导出。\n\n是否继续使用传统方式保存？（可能导致内存溢出）');
        if (!shouldProceed) return false;

        const nodesToSave = JSON.parse(JSON.stringify(nodes, replacer));
        const nodesWithDataUrls = await convertBlobUrlsToDataUrls(nodesToSave);
        const characterLibraryToSave = JSON.parse(JSON.stringify(characterLibrary, replacer));
        const characterLibraryWithDataUrls = await convertBlobUrlsToDataUrls(characterLibraryToSave);
        const projectData = {
            version: PROJECT_VERSION,
            projectName,
            nodes: nodesWithDataUrls,
            connections,
            view,
            history,
            chatSessions,
            characterLibrary: characterLibraryWithDataUrls,
            timestamp: getCSTTimestamp(),
        };
        const jsonStr = JSON.stringify(projectData, replacer, 2);
        const timestamp = getCSTFilenameTimestamp();
        downloadJson(jsonStr, `${projectName || '未命名项目'}_${timestamp}.json`);
        return true;
    }

    const timestamp = getCSTFilenameTimestamp();
    const handle = await window.showSaveFilePicker({
        suggestedName: `${projectName || '未命名项目'}_${timestamp}.json`,
        types: [{ description: 'JSON File', accept: { 'application/json': ['.json'] } }],
    });
    const writable = await handle.createWritable();

    await writable.write(`{\n  "version": "${PROJECT_VERSION}",\n  "projectName": ${JSON.stringify(projectName || '')},\n  "nodes": [\n`);

    for (let i = 0; i < nodes.length; i++) {
        const nodeToSave = await convertNodeBlobUrls(nodes[i]);
        const nodeJson = JSON.stringify(nodeToSave, replacer, 2);
        const indentedNodeJson = i === 0
            ? nodeJson.split('\n').join('\n    ')
            : `    ${nodeJson.split('\n').join('\n    ')}`;
        await writable.write(indentedNodeJson);
        await writable.write(i < nodes.length - 1 ? ',\n' : '\n');
    }

    await writable.write(`  ],\n  "connections": ${JSON.stringify(connections, replacer, 2)},\n  "view": ${JSON.stringify(view, replacer, 2)},\n  "history": [\n`);

    for (let i = 0; i < history.length; i++) {
        const itemToSave = await convertHistoryItemBlobUrls(history[i]);
        const itemJson = JSON.stringify(itemToSave, replacer, 2);
        const indentedItemJson = i === 0
            ? itemJson.split('\n').join('\n    ')
            : `    ${itemJson.split('\n').join('\n    ')}`;
        await writable.write(indentedItemJson);
        await writable.write(i < history.length - 1 ? ',\n' : '\n');
    }

    await writable.write(`  ],\n  "chatSessions": ${JSON.stringify(chatSessions, replacer, 2)},\n  "characterLibrary": [\n`);

    for (let i = 0; i < characterLibrary.length; i++) {
        const charToSave = await convertCharacterBlobUrls(characterLibrary[i]);
        const charJson = JSON.stringify(charToSave, replacer, 2);
        const indentedCharJson = i === 0
            ? charJson.split('\n').join('\n    ')
            : `    ${charJson.split('\n').join('\n    ')}`;
        await writable.write(indentedCharJson);
        await writable.write(i < characterLibrary.length - 1 ? ',\n' : '\n');
    }

    await writable.write(`  ],\n  "timestamp": ${JSON.stringify(getCSTTimestamp())}\n}`);
    await writable.close();
    return true;
};

const convertItemImmediately = async (item, localFiles, localServerUrl = LOCAL_LIBRARY_SERVER_URL) => {
    const stack = [item];
    while (stack.length > 0) {
        const current = stack.pop();
        if (!current || typeof current !== 'object') continue;

        for (const key in current) {
            const val = current[key];
            if (typeof val === 'string' && (val.startsWith('data:image/') || val.startsWith('data:video/'))) {
                try {
                    const localUrl = findLocalFileUrlBySize(val, localFiles, localServerUrl);
                    if (localUrl) {
                        const testRes = await fetch(localUrl, { method: 'HEAD' });
                        if (testRes.ok) {
                            current[key] = localUrl;
                            console.log(`[导入] 使用本地文件: ${localUrl}`);
                            continue;
                        }
                    }

                    const res = await fetch(val);
                    const blob = await res.blob();
                    current[key] = URL.createObjectURL(blob);
                } catch (error) {
                    // 转换失败则保持原样，防止丢失数据。
                }
            } else if (typeof val === 'object' && val !== null) {
                stack.push(val);
            }
        }
    }
    return item;
};

export const loadProjectFromFile = async ({ file, onProgress }) => {
    const tempState = {
        nodes: [],
        history: [],
        connections: [],
        chatSessions: [],
        characterLibrary: [],
        projectName: '',
        view: null,
    };

    let localFiles = [];
    try {
        localFiles = await listLocalLibraryFiles();
        if (localFiles.length) {
            console.log(`[导入] 本地库已连接，找到 ${localFiles.length} 个文件`);
        }
    } catch (error) {
        console.log('[导入] 本地服务器未连接，将使用原始数据');
    }

    let currentSection = null;
    let buffer = '';
    let objectBuffer = '';
    let braceCount = 0;
    let inObject = false;
    let bytesRead = 0;
    const totalBytes = file.size;

    const stream = file.stream().pipeThrough(new TextDecoderStream());
    const reader = stream.getReader();

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        bytesRead += value.length;
        if (Math.random() > 0.95) {
            const percent = Math.min(99, (bytesRead / totalBytes) * 100);
            onProgress?.({
                progress: percent,
                status: `PROCESSING ${(bytesRead / 1024 / 1024).toFixed(0)}MB`,
            });
        }

        buffer += value;

        while (true) {
            const newlineIndex = buffer.indexOf('\n');
            if (newlineIndex === -1) break;

            const line = buffer.substring(0, newlineIndex);
            buffer = buffer.substring(newlineIndex + 1);
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            if (trimmedLine.includes('"nodes": [')) { currentSection = 'nodes'; continue; }
            if (trimmedLine.includes('"history": [')) { currentSection = 'history'; continue; }
            if (trimmedLine.includes('"connections": [')) { currentSection = 'connections'; continue; }
            if (trimmedLine.includes('"chatSessions": [')) { currentSection = 'chatSessions'; continue; }
            if (trimmedLine.includes('"characterLibrary": [')) { currentSection = 'characterLibrary'; continue; }

            if ((trimmedLine === '],' || trimmedLine === ']') && braceCount === 0) {
                currentSection = null;
                objectBuffer = '';
                inObject = false;
                continue;
            }

            if (!currentSection) {
                if (trimmedLine.startsWith('"projectName":')) {
                    try {
                        const match = trimmedLine.match(/"projectName":\s*(.+)/);
                        if (match) tempState.projectName = JSON.parse(match[1].replace(/,$/, ''));
                    } catch (error) {}
                }
                if (trimmedLine.startsWith('"view":')) {
                    try {
                        const match = trimmedLine.match(/"view":\s*(.+)/);
                        if (match && match[1].endsWith('}')) tempState.view = JSON.parse(match[1].replace(/,$/, ''));
                    } catch (error) {}
                }
                continue;
            }

            for (const char of line) {
                if (char === '{') { braceCount++; inObject = true; }
                if (char === '}') { braceCount--; }
            }
            objectBuffer += `${line}\n`;

            if (inObject && braceCount === 0) {
                let jsonStr = objectBuffer.trim();
                if (jsonStr.endsWith(',')) jsonStr = jsonStr.slice(0, -1);

                try {
                    const item = JSON.parse(jsonStr);
                    if (currentSection === 'nodes' || currentSection === 'history' || currentSection === 'characterLibrary') {
                        await convertItemImmediately(item, localFiles);
                    }

                    if (currentSection === 'nodes' && item.id) {
                        if (!item.settings) item.settings = {};
                        tempState.nodes.push(item);
                    } else if (currentSection === 'history') {
                        tempState.history.push(item);
                    } else if (currentSection === 'connections') {
                        tempState.connections.push(item);
                    } else if (currentSection === 'chatSessions') {
                        tempState.chatSessions.push(item);
                    } else if (currentSection === 'characterLibrary') {
                        tempState.characterLibrary.push(item);
                    }
                } catch (error) {
                    // 忽略单项解析错误，继续处理下一个对象。
                }
                objectBuffer = '';
                inObject = false;
            }
        }
    }

    return tempState;
};
