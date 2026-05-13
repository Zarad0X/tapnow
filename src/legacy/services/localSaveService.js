export const blobToDataUrl = (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const fetchAsDataUrl = async (url) => {
    const response = await fetch(url);
    const blob = await response.blob();
    return blobToDataUrl(blob);
};

export const convertImageToJpgDataUrl = async (imageUrl) => {
    return new Promise((resolve) => {
        try {
            const image = new Image();
            image.crossOrigin = 'anonymous';
            image.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = image.naturalWidth;
                canvas.height = image.naturalHeight;
                const context = canvas.getContext('2d');
                context.fillStyle = '#FFFFFF';
                context.fillRect(0, 0, canvas.width, canvas.height);
                context.drawImage(image, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.95));
            };
            image.onerror = () => resolve(null);
            image.src = imageUrl;
        } catch (error) {
            resolve(null);
        }
    });
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
                const jpgContent = await convertImageToJpgDataUrl(url);
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
