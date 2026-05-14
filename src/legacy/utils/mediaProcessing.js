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
