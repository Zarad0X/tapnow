import { useCallback } from 'react';
import {
    isDownloadableMediaNodeType,
    isPreviewNodeType,
    isVideoInputNodeType,
} from '../nodes/nodeCatalog.js';

const getDownloadExtension = ({ node, url, isVideoUrl }) => {
    if (isPreviewNodeType(node.type)) {
        if (node.previewType === 'video') return '.mp4';
        return isVideoUrl(url) ? '.mp4' : '.png';
    }

    if (isVideoInputNodeType(node.type)) return '.mp4';
    return isVideoUrl(url) ? '.mp4' : '.png';
};

const getSelectedDownloadableNodes = ({ nodes, selectedNodeId, selectedNodeIds }) => {
    return nodes.filter((node) => (
        (selectedNodeId === node.id || (selectedNodeIds && selectedNodeIds.has(node.id))) &&
        isDownloadableMediaNodeType(node.type) &&
        node.content
    ));
};

export const useBatchDownload = ({
    isVideoUrl,
    nodesRef,
    selectedNodeIdRef,
    selectedNodeIdsRef,
}) => {
    return useCallback(async () => {
        const selectedNodes = getSelectedDownloadableNodes({
            nodes: nodesRef.current,
            selectedNodeId: selectedNodeIdRef.current,
            selectedNodeIds: selectedNodeIdsRef.current,
        });

        if (selectedNodes.length === 0) {
            alert('请先选择要下载的图片或视频节点');
            return;
        }

        for (const node of selectedNodes) {
            try {
                const url = node.content;
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
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = `${node.id}${getDownloadExtension({ node, url, isVideoUrl })}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(blobUrl);
                await new Promise((resolve) => setTimeout(resolve, 100));
            } catch (error) {
                console.error(`下载节点 ${node.id} 失败:`, error);
            }
        }
    }, [isVideoUrl, nodesRef, selectedNodeIdRef, selectedNodeIdsRef]);
};
