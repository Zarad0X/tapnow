export const getBlobFromUrl = async (url) => {
    const response = await fetch(url);
    return response.blob();
};

export const blobToDataURL = (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const getBase64FromUrl = async (url) => {
    if (url.startsWith('data:')) {
        return url.split(',')[1];
    }
    const blob = await getBlobFromUrl(url);
    const dataUrl = await blobToDataURL(blob);
    return dataUrl.split(',')[1];
};

export const base64ToBlobUrl = async (base64Data) => {
    try {
        if (!base64Data || typeof base64Data !== 'string') {
            return base64Data;
        }
        if (
            base64Data.startsWith('blob:') ||
            base64Data.startsWith('http://') ||
            base64Data.startsWith('https://')
        ) {
            return base64Data;
        }
        if (base64Data.startsWith('data:')) {
            const response = await fetch(base64Data);
            const blob = await response.blob();
            return URL.createObjectURL(blob);
        }
        return base64Data;
    } catch (error) {
        console.error('Base64转Blob失败', error);
        return base64Data;
    }
};

export const prepareImageForMidjourneyUpload = async (imageUrl, maxSize = 2048, maxFileSizeMB = 8) => {
    return new Promise((resolve) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';

        image.onload = () => {
            const originalWidth = image.width;
            const originalHeight = image.height;
            let newWidth = originalWidth;
            let newHeight = originalHeight;

            if (originalWidth > maxSize || originalHeight > maxSize) {
                const scale = maxSize / Math.max(originalWidth, originalHeight);
                newWidth = Math.floor(originalWidth * scale);
                newHeight = Math.floor(originalHeight * scale);
                console.log(`Midjourney: 缩放图片 ${originalWidth}x${originalHeight} -> ${newWidth}x${newHeight}`);
            }

            const canvas = document.createElement('canvas');
            canvas.width = newWidth;
            canvas.height = newHeight;
            const context = canvas.getContext('2d');
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = 'high';
            context.drawImage(image, 0, 0, newWidth, newHeight);

            let quality = 0.92;
            let dataUrl = canvas.toDataURL('image/jpeg', quality);
            const base64Length = dataUrl.split(',')[1]?.length || 0;
            const fileSizeMB = (base64Length * 3 / 4) / (1024 * 1024);

            if (fileSizeMB > maxFileSizeMB) {
                console.log(`Midjourney: 图片文件大小 ${fileSizeMB.toFixed(2)}MB 超过限制，降低质量...`);
                quality = 0.75;
                dataUrl = canvas.toDataURL('image/jpeg', quality);
                const newBase64Length = dataUrl.split(',')[1]?.length || 0;
                const newFileSizeMB = (newBase64Length * 3 / 4) / (1024 * 1024);
                console.log(`Midjourney: 降低质量后文件大小 ${newFileSizeMB.toFixed(2)}MB`);
            }

            resolve(dataUrl);
        };

        image.onerror = (error) => {
            console.error('Midjourney: 图片加载失败', error);
            resolve(imageUrl);
        };

        image.src = imageUrl;
    });
};

export const compressImage = (dataUrl, maxWidth = 1024, quality = 0.8) => {
    return new Promise((resolve) => {
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            let width = image.width;
            let height = image.height;

            if (width > maxWidth || height > maxWidth) {
                const scale = maxWidth / Math.max(width, height);
                width = Math.floor(width * scale);
                height = Math.floor(height * scale);
            }

            canvas.width = width;
            canvas.height = height;
            context.drawImage(image, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        image.onerror = () => resolve(dataUrl);
        image.src = dataUrl;
    });
};

export const resizeImageForVeo = async (imageUrl, maxWidth = 1920, maxHeight = 1920) => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';

        image.onload = () => {
            const originalWidth = image.width;
            const originalHeight = image.height;

            if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
                console.log(`Veo: 图片尺寸 ${originalWidth}x${originalHeight} 无需缩放`);
                if (imageUrl.startsWith('data:')) {
                    resolve(imageUrl);
                } else {
                    getBase64FromUrl(imageUrl)
                        .then((base64) => resolve(`data:image/png;base64,${base64}`))
                        .catch(reject);
                }
                return;
            }

            let newWidth = originalWidth;
            let newHeight = originalHeight;
            if (originalWidth > maxWidth || originalHeight > maxHeight) {
                const scale = Math.min(maxWidth / originalWidth, maxHeight / originalHeight);
                newWidth = Math.round(originalWidth * scale);
                newHeight = Math.round(originalHeight * scale);
                newWidth = newWidth % 2 === 0 ? newWidth : newWidth - 1;
                newHeight = newHeight % 2 === 0 ? newHeight : newHeight - 1;
            }

            console.log(`Veo: 缩放图片 ${originalWidth}x${originalHeight} -> ${newWidth}x${newHeight}`);
            const canvas = document.createElement('canvas');
            canvas.width = newWidth;
            canvas.height = newHeight;
            const context = canvas.getContext('2d');
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = 'high';
            context.drawImage(image, 0, 0, newWidth, newHeight);
            resolve(canvas.toDataURL('image/png', 0.95));
        };

        image.onerror = (error) => {
            console.error('Veo: 图片加载失败', error);
            reject(new Error('图片加载失败'));
        };

        if (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
            image.src = imageUrl;
        } else {
            getBlobFromUrl(imageUrl).then((blob) => {
                image.src = URL.createObjectURL(blob);
            }).catch(reject);
        }
    });
};

export const getSora2CompliantSize = (ratio, w, h, enableHD = false) => {
    const toAspectValue = (value) => {
        if (!value || typeof value !== 'string') return null;
        const [a, b] = value.split(':').map(Number);
        if (!a || !b) return null;
        return a / b;
    };

    const aspect = (ratio === '16:9' || ratio === '9:16')
        ? ratio
        : (() => {
            const ratioValue = toAspectValue(ratio);
            const fallback = (w && h) ? (w / h) : (ratioValue || (16 / 9));
            const d169 = Math.abs(fallback - (16 / 9));
            const d916 = Math.abs(fallback - (9 / 16));
            return d916 < d169 ? '9:16' : '16:9';
        })();

    const portrait = aspect === '9:16';
    if (enableHD) {
        return portrait
            ? { sizeStr: '1080x1920', w: 1080, h: 1920, aspect }
            : { sizeStr: '1920x1080', w: 1920, h: 1080, aspect };
    }
    return portrait
        ? { sizeStr: '720x1280', w: 720, h: 1280, aspect }
        : { sizeStr: '1280x720', w: 1280, h: 720, aspect };
};

export const normalizeImageBlobToSize = async (blob, targetW, targetH, mime = 'image/png') => {
    if (!(blob instanceof Blob) || !targetW || !targetH) return blob;
    return new Promise((resolve) => {
        const image = new Image();
        const objectUrl = URL.createObjectURL(blob);

        image.onload = () => {
            try {
                const srcW = image.naturalWidth || image.width || 1;
                const srcH = image.naturalHeight || image.height || 1;
                const canvas = document.createElement('canvas');
                canvas.width = targetW;
                canvas.height = targetH;
                const context = canvas.getContext('2d');
                if (!context) {
                    URL.revokeObjectURL(objectUrl);
                    resolve(blob);
                    return;
                }

                context.imageSmoothingEnabled = true;
                context.imageSmoothingQuality = 'high';
                const scale = Math.max(targetW / srcW, targetH / srcH);
                const drawW = srcW * scale;
                const drawH = srcH * scale;
                const dx = (targetW - drawW) / 2;
                const dy = (targetH - drawH) / 2;
                context.clearRect(0, 0, targetW, targetH);
                context.drawImage(image, dx, dy, drawW, drawH);

                canvas.toBlob((out) => {
                    URL.revokeObjectURL(objectUrl);
                    resolve(out || blob);
                }, mime, 0.92);
            } catch (error) {
                URL.revokeObjectURL(objectUrl);
                resolve(blob);
            }
        };
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(blob);
        };
        image.src = objectUrl;
    });
};
