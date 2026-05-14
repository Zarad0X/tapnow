import { useEffect, useRef } from 'react';
import {
    buildLocalSaveFiles,
    saveFilesToLocalServer,
} from '../services/localSaveService.js';

export const useAutoLocalSave = ({
    nodes,
    connections,
    getConnectedInputImages,
    updateNodeSettings,
    isVideoUrl,
}) => {
    const autoSaveProcessingRef = useRef(new Set());

    useEffect(() => {
        const localSaveNodes = nodes.filter((node) => (
            node.type === 'local-save' &&
            node.settings?.autoSave &&
            node.settings?.serverStatus === 'connected'
        ));
        if (localSaveNodes.length === 0) return undefined;

        localSaveNodes.forEach(async (node) => {
            const connectedImages = getConnectedInputImages(node.id);
            if (connectedImages.length === 0) return;

            const lastSavedUrls = node.settings?.lastSavedUrls || [];
            const newImages = connectedImages.filter((image) => !lastSavedUrls.includes(image));
            if (newImages.length === 0) return;

            const processKey = `${node.id}-${newImages.join(',')}`;
            if (autoSaveProcessingRef.current.has(processKey)) return;
            autoSaveProcessingRef.current.add(processKey);

            setTimeout(async () => {
                try {
                    const serverUrl = node.settings?.serverUrl || 'http://127.0.0.1:9527';
                    const subfolder = node.settings?.subfolder || '';
                    const files = await buildLocalSaveFiles(newImages, { isVideoUrl });

                    if (files.length > 0) {
                        const result = await saveFilesToLocalServer({ serverUrl, files, subfolder });
                        if (result.success) {
                            updateNodeSettings(node.id, {
                                lastSaved: new Date().toISOString(),
                                savedFiles: result.results || [],
                                lastSavedUrls: [...connectedImages],
                            });
                            console.log(`自动保存成功: ${files.length} 个文件`);
                        }
                    }
                } catch (error) {
                    console.error('自动保存失败:', error);
                } finally {
                    autoSaveProcessingRef.current.delete(processKey);
                }
            }, 1000);
        });

        return undefined;
    }, [nodes, connections, getConnectedInputImages, updateNodeSettings, isVideoUrl]);
};
