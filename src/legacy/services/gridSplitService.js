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
