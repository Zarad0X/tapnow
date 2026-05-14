import {
    blobToDataURL,
    convertImageToJpegDataUrl,
} from '../utils/mediaProcessing.js';

export const fetchAsDataUrl = async (url) => {
    const response = await fetch(url);
    const blob = await response.blob();
    return blobToDataURL(blob);
};

export const buildLocalSaveFiles = async (urls, { isVideoUrl }) => {
    const files = [];

    for (let index = 0; index < urls.length; index += 1) {
        const url = urls[index];
        const isVideo = isVideoUrl(url);

        try {
            let content = url;
            let ext = '.jpg';

            if (isVideo) {
                ext = '.mp4';
                if (!url.startsWith('data:')) {
                    content = await fetchAsDataUrl(url);
                }
            } else {
                const jpgContent = await convertImageToJpegDataUrl(url);
                if (jpgContent) {
                    content = jpgContent;
                } else if (!url.startsWith('data:')) {
                    content = await fetchAsDataUrl(url);
                    ext = '.png';
                }
            }

            files.push({
                filename: `tapnow_${Date.now()}_${index}${ext}`,
                content,
            });
        } catch (error) {
            console.error('处理文件失败:', error);
        }
    }

    return files;
};

export const pingLocalSaveServer = async (serverUrl) => {
    const response = await fetch(`${serverUrl}/ping`, { method: 'GET' });
    if (!response.ok) return { connected: false, savePath: '' };

    const data = await response.json();
    return {
        connected: true,
        savePath: data.save_path || '',
    };
};

export const saveFilesToLocalServer = async ({ serverUrl, files, subfolder }) => {
    const response = await fetch(`${serverUrl}/save-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files, subfolder }),
    });
    return response.json();
};
