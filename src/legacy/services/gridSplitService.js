export const splitGridImage = async (imageUrl, { rows = 3, cols = 3, timeoutMs = 30000 } = {}) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        const timeout = setTimeout(() => {
            reject(new Error('图片加载超时'));
        }, timeoutMs);

        img.onload = () => {
            clearTimeout(timeout);
            try {
                const singleWidth = Math.floor(img.width / cols);
                const singleHeight = Math.floor(img.height / rows);
                const cropPromises = [];

                for (let row = 0; row < rows; row++) {
                    for (let col = 0; col < cols; col++) {
                        const cropX = Math.max(0, Math.min(col * singleWidth, img.width - singleWidth));
                        const cropY = Math.max(0, Math.min(row * singleHeight, img.height - singleHeight));
                        const cropW = Math.min(singleWidth, img.width - cropX);
                        const cropH = Math.min(singleHeight, img.height - cropY);

                        const cropCanvas = document.createElement('canvas');
                        cropCanvas.width = cropW;
                        cropCanvas.height = cropH;
                        const cropCtx = cropCanvas.getContext('2d');

                        cropCtx.fillStyle = '#ffffff';
                        cropCtx.fillRect(0, 0, cropW, cropH);
                        cropCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

                        cropPromises.push(
                            new Promise((resolveCrop, rejectCrop) => {
                                cropCanvas.toBlob((blob) => {
                                    if (!blob) {
                                        rejectCrop(new Error('Canvas toBlob 失败'));
                                        return;
                                    }

                                    resolveCrop({
                                        url: URL.createObjectURL(blob),
                                        width: cropW,
                                        height: cropH,
                                    });
                                }, 'image/png');
                            }),
                        );
                    }
                }

                Promise.all(cropPromises).then(resolve).catch(reject);
            } catch (error) {
                reject(error);
            }
        };

        img.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('图片加载失败'));
        };

        img.src = imageUrl;
    });
};

export const createGridImageNodes = (
    croppedImages,
    {
        startX,
        startY,
        cols = 3,
        spacing = 20,
        nodeWidth = 260,
        nodeHeight = 260,
        idFactory = (index) => `node-${Date.now()}-${index}`,
    },
) => {
    return croppedImages.map((image, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;

        return {
            id: idFactory(index),
            type: 'input-image',
            x: startX + col * (nodeWidth + spacing),
            y: startY + row * (nodeHeight + spacing),
            width: nodeWidth,
            height: nodeHeight,
            content: image.url,
            dimensions: { w: image.width, h: image.height },
        };
    });
};

export const splitMidjourneyImage = async (imageUrl, ratio = '1:1', { timeoutMs = 30000 } = {}) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        const timeout = setTimeout(() => {
            reject(new Error('图片加载超时'));
        }, timeoutMs);

        img.onload = () => {
            clearTimeout(timeout);
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const singleWidth = Math.floor(img.width / 2);
                const singleHeight = Math.floor(img.height / 2);
                const actualRatio = singleWidth / singleHeight;
                const images = [];

                for (let row = 0; row < 2; row++) {
                    for (let col = 0; col < 2; col++) {
                        const cropX = Math.max(0, Math.min(col * singleWidth, img.width - singleWidth));
                        const cropY = Math.max(0, Math.min(row * singleHeight, img.height - singleHeight));
                        const cropW = Math.min(singleWidth, img.width - cropX);
                        const cropH = Math.min(singleHeight, img.height - cropY);

                        canvas.width = cropW;
                        canvas.height = cropH;
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, cropW, cropH);
                        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

                        images.push({
                            url: canvas.toDataURL('image/png'),
                            width: cropW,
                            height: cropH,
                            ratio: actualRatio,
                        });
                    }
                }

                console.log(`Midjourney: 切割图片完成，原图尺寸 ${img.width}x${img.height}，每张图尺寸 ${singleWidth}x${singleHeight}，比例 ${actualRatio.toFixed(2)}`);
                resolve(images);
            } catch (error) {
                console.error('Midjourney: 切割图片时出错:', error);
                reject(error);
            }
        };

        img.onerror = (event) => {
            clearTimeout(timeout);
            console.error('Midjourney: Failed to load image for splitting:', event);
            reject(new Error('图片加载失败'));
        };

        img.src = imageUrl;
    });
};
