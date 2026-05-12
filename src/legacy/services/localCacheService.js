export const LOCAL_CACHE_SERVER_URL = 'http://127.0.0.1:9527';
export const LOCAL_LIBRARY_SERVER_URL = 'http://localhost:9527';

const readAsDataUrl = (blob) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
});

export const getFilenameFromUrl = (url) => {
    if (!url) return null;
    try {
        const urlWithoutQuery = url.split('?')[0];
        const parts = urlWithoutQuery.split('/');
        const filename = parts[parts.length - 1];
        return filename.replace(/\.[^.]+$/, '') || null;
    } catch (error) {
        return null;
    }
};

export const checkLocalCacheServer = async (serverUrl = LOCAL_CACHE_SERVER_URL) => {
    const res = await fetch(`${serverUrl}/ping`, { method: 'GET' });
    if (!res.ok) return { connected: false };
    const data = await res.json();
    return {
        connected: true,
        data,
        config: {
            imageSavePath: data.image_save_path || '',
            videoSavePath: data.video_save_path || '',
            convertPngToJpg: data.convert_png_to_jpg !== false,
            pilAvailable: data.pil_available || false,
        },
    };
};

export const updateLocalServerConfigRequest = async (newConfig, serverUrl = LOCAL_CACHE_SERVER_URL) => {
    const res = await fetch(`${serverUrl}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success) return null;
    return {
        imageSavePath: data.config.image_save_path || '',
        videoSavePath: data.config.video_save_path || '',
        convertPngToJpg: data.config.convert_png_to_jpg !== false,
        jpgQuality: data.config.jpg_quality || 95,
    };
};

export const saveThumbnailToLocal = async ({ itemId, thumbnailDataUrl, category = 'history', serverUrl = LOCAL_CACHE_SERVER_URL }) => {
    if (!thumbnailDataUrl) return null;
    const res = await fetch(`${serverUrl}/save-thumbnail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, content: thumbnailDataUrl, category }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.url : null;
};

export const saveImageToLocalCache = async ({ itemId, imageUrl, category = 'characters', serverUrl = LOCAL_CACHE_SERVER_URL }) => {
    const filenameFromUrl = getFilenameFromUrl(imageUrl);
    const saveId = filenameFromUrl || itemId;

    let content = imageUrl;
    if (!imageUrl.startsWith('data:')) {
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        content = await readAsDataUrl(blob);
    }

    const res = await fetch(`${serverUrl}/save-cache`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: saveId, content, category, ext: '.jpg' }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? { url: data.url, path: data.path } : null;
};

export const saveVideoToLocalCache = async ({ itemId, videoUrl, category = 'history', serverUrl = LOCAL_CACHE_SERVER_URL }) => {
    const filenameFromUrl = getFilenameFromUrl(videoUrl);
    const saveId = filenameFromUrl || itemId;

    const res = await fetch(videoUrl);
    const blob = await res.blob();
    const content = await readAsDataUrl(blob);

    const saveRes = await fetch(`${serverUrl}/save-cache`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: saveId, content, category, ext: '.mp4', type: 'video' }),
    });
    if (!saveRes.ok) return null;
    const data = await saveRes.json();
    return data.success ? { url: data.url, path: data.path } : null;
};

export const checkLocalCache = async ({ itemId, category = 'history', serverUrl = LOCAL_CACHE_SERVER_URL }) => {
    const url = `${serverUrl}/file/.tapnow_cache/${category}/${itemId}.jpg`;
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok ? url : null;
};

export const listLocalLibraryFiles = async (serverUrl = LOCAL_LIBRARY_SERVER_URL) => {
    const res = await fetch(`${serverUrl}/list-files`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.success && data.files ? data.files : [];
};

export const findLocalFileUrlBySize = (dataUrl, localFiles, serverUrl = LOCAL_LIBRARY_SERVER_URL) => {
    if (!localFiles.length) return null;
    try {
        const base64 = dataUrl.split(',')[1];
        if (!base64) return null;
        const estimatedSize = Math.floor(base64.length * 0.75);
        const tolerance = estimatedSize * 0.05;
        const match = localFiles.find((file) => Math.abs(file.size - estimatedSize) < tolerance);
        return match ? `${serverUrl}/file/${encodeURIComponent(match.rel_path)}` : null;
    } catch (error) {
        return null;
    }
};

