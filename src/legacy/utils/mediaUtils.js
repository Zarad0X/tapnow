export const getImageDimensions = (src) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = src;
    });
};

export const isVideoUrl = (url) => {
    if (!url) return false;
    if (url.startsWith('data:video')) return true;
    if (url.includes('force_video_display=true')) return true;
    const ext = url.split('.').pop().split('?')[0].toLowerCase();
    return ['mp4', 'webm', 'ogg', 'mov'].includes(ext);
};

export const createChatMediaFile = ({
    name,
    content,
    mediaType = 'image',
    fromHistory = false,
    fromPreview = false,
}) => {
    const isImage = mediaType === 'image';
    const isVideo = mediaType === 'video';
    const fileExt = isImage ? 'png' : (isVideo ? 'mp4' : 'file');
    const mimeType = isImage ? 'image/png' : (isVideo ? 'video/mp4' : 'application/octet-stream');

    return {
        name: name || `Media.${fileExt}`,
        type: mimeType,
        content,
        isImage,
        isVideo,
        isAudio: false,
        ...(fromHistory ? { fromHistory: true } : {}),
        ...(fromPreview ? { fromPreview: true } : {}),
        fileExt,
    };
};

export const getFileExtension = (filename = '') => {
    return filename.split('.').pop()?.toLowerCase() || '';
};

export const isCodeFileExtension = (fileExt) => {
    return [
        'js',
        'jsx',
        'ts',
        'tsx',
        'py',
        'java',
        'cpp',
        'c',
        'html',
        'css',
        'json',
        'xml',
        'yaml',
        'yml',
        'md',
        'txt',
        'sh',
        'bash',
    ].includes(fileExt);
};

export const createUploadedChatFile = ({ file, content }) => {
    const fileExt = getFileExtension(file?.name);
    const fileType = file?.type || '';

    return {
        name: file?.name || `Upload.${fileExt || 'file'}`,
        type: fileType,
        content,
        isImage: fileType.startsWith('image/'),
        isVideo: fileType.startsWith('video/'),
        isAudio: fileType.startsWith('audio/'),
        isPDF: fileType === 'application/pdf' || fileExt === 'pdf',
        isDoc: ['doc', 'docx'].includes(fileExt) || fileType.includes('word'),
        isExcel: ['xls', 'xlsx'].includes(fileExt) || fileType.includes('excel') || fileType.includes('spreadsheet'),
        isCode: isCodeFileExtension(fileExt),
        fileExt,
    };
};

export const getVideoMetadata = (src) => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;
        video.onloadedmetadata = () => {
            resolve({
                duration: Number(video.duration) || 0,
                w: video.videoWidth || 0,
                h: video.videoHeight || 0,
            });
        };
        video.onerror = () => reject(new Error('视频加载失败'));
        video.src = src;
    });
};

export const extractKeyFrames = (src, { fps = 2 } = {}) => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        video.muted = true;
        video.playsInline = true;
        video.crossOrigin = 'anonymous';
        video.src = src;
        const frames = [];

        video.onerror = () => reject(new Error('视频抽帧失败'));

        video.onloadedmetadata = () => {
            const duration = Number(video.duration) || 0;
            if (!duration || !isFinite(duration)) {
                reject(new Error('无法读取视频时长'));
                return;
            }
            canvas.width = video.videoWidth || 1280;
            canvas.height = video.videoHeight || 720;
            const interval = 1 / Math.max(0.1, fps);
            let current = 0;

            const captureFrame = () => {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                frames.push({
                    time: Number(current.toFixed(2)),
                    url: canvas.toDataURL('image/jpeg', 0.82),
                });
                current += interval;
                if (current <= duration) {
                    video.currentTime = Math.min(current, duration);
                } else {
                    resolve(frames);
                }
            };

            video.onseeked = captureFrame;
            video.currentTime = 0;
        };
    });
};
