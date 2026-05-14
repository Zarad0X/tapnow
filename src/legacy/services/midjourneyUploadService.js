import {
    blobToDataURL,
    getBlobFromUrl,
    prepareImageForMidjourneyUpload,
} from '../utils/mediaProcessing.js';

const normalizeBase64DataUrl = (base64, index) => {
    let cleaned = base64;
    if (typeof cleaned !== 'string') {
        throw new Error(`base64[${index}]不是字符串类型`);
    }

    if (cleaned.includes(',')) {
        cleaned = cleaned.split(',')[1];
    } else if (cleaned.startsWith('data:')) {
        cleaned = cleaned.replace(/^data:[^;]*;base64,?/i, '');
    }

    const beforeClean = cleaned.length;
    cleaned = cleaned.replace(/[^A-Za-z0-9+/=]/g, '');
    const afterClean = cleaned.length;
    if (beforeClean !== afterClean) {
        console.log(`Midjourney: base64[${index}]清理了 ${beforeClean - afterClean} 个非法字符`);
    }

    if (!cleaned || cleaned.length < 100) {
        throw new Error(`base64[${index}]无效或太短，长度: ${cleaned?.length || 0}`);
    }

    const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
    if (!base64Regex.test(cleaned)) {
        console.error(`Midjourney: base64[${index}]格式验证失败，长度: ${cleaned.length}, 前50字符: ${cleaned.substring(0, 50)}`);
        throw new Error(`invalid_base64_format: base64[${index}]格式无效`);
    }

    const padding = cleaned.length % 4;
    if (padding !== 0) {
        cleaned = cleaned.replace(/=+$/, '');
        cleaned += '='.repeat(4 - padding);
        if (!base64Regex.test(cleaned)) {
            console.error(`Midjourney: base64[${index}]填充后验证失败，长度: ${cleaned.length}`);
            throw new Error(`invalid_base64_format: base64[${index}]填充后格式无效`);
        }
    }

    try {
        const testDecode = atob(cleaned);
        if (!testDecode || testDecode.length === 0) {
            throw new Error('base64解码结果为空');
        }
        console.log(`Midjourney: base64[${index}]解码测试通过，解码后长度: ${testDecode.length}`);
    } catch (decodeError) {
        console.error(`Midjourney: base64[${index}]解码测试失败:`, decodeError);
        throw new Error(`invalid_base64_format: base64[${index}]无法解码`);
    }

    console.log(`Midjourney: base64[${index}]清理完成，长度: ${cleaned.length}, 前20字符: ${cleaned.substring(0, 20)}`);
    return `data:image/jpeg;base64,${cleaned}`;
};

const validateDataUrlArray = (dataUrls) => {
    dataUrls.forEach((dataUrl, index) => {
        if (!dataUrl || typeof dataUrl !== 'string') {
            throw new Error(`base64[${index}]无效或不是字符串`);
        }
        if (!dataUrl.startsWith('data:image/')) {
            throw new Error(`base64[${index}]不是有效的data URL格式`);
        }
        if (!dataUrl.includes(',')) {
            throw new Error(`base64[${index}]data URL格式不正确，缺少逗号`);
        }

        const base64Part = dataUrl.split(',')[1];
        if (!base64Part || base64Part.length < 100) {
            throw new Error(`base64[${index}]无效或太短`);
        }
        const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
        if (!base64Regex.test(base64Part)) {
            console.error(`Midjourney: base64[${index}]最终验证失败，包含非法字符`);
            throw new Error(`base64[${index}]格式无效`);
        }
        if (base64Part.length % 4 !== 0) {
            throw new Error(`base64[${index}]长度不是4的倍数: ${base64Part.length}`);
        }
        try {
            atob(base64Part);
        } catch (error) {
            throw new Error(`base64[${index}]无法解码: ${error.message}`);
        }
    });
};

export const uploadMidjourneyImages = async (base64Array, baseUrl, apiKey) => {
    try {
        console.log(`Midjourney: 准备上传 ${base64Array.length} 张图片，先进行压缩/缩放处理...`);
        const processedImages = await Promise.all(
            base64Array.map(async (imageUrl, index) => {
                if (imageUrl.startsWith('data:')) {
                    try {
                        const processed = await prepareImageForMidjourneyUpload(imageUrl, 2048, 8);
                        console.log(`Midjourney: 图片[${index}]处理完成`);
                        return processed;
                    } catch (error) {
                        console.error(`Midjourney: 图片[${index}]处理失败，使用原图`, error);
                        return imageUrl;
                    }
                }

                try {
                    const blob = await getBlobFromUrl(imageUrl);
                    const dataUrl = await blobToDataURL(blob);
                    const processed = await prepareImageForMidjourneyUpload(dataUrl, 2048, 8);
                    console.log(`Midjourney: 图片[${index}]从URL处理完成`);
                    return processed;
                } catch (error) {
                    console.error(`Midjourney: 图片[${index}]从URL处理失败`, error);
                    throw error;
                }
            }),
        );

        const cleanedBase64Array = processedImages.map(normalizeBase64DataUrl);
        const uploadEndpoint = `${baseUrl}/mj/submit/upload-discord-images`;

        console.log('Midjourney: 上传图片，base64数组长度:', cleanedBase64Array.length, '第一个data URL长度:', cleanedBase64Array[0]?.length, '前50字符:', cleanedBase64Array[0]?.substring(0, 50));

        validateDataUrlArray(cleanedBase64Array);

        const requestBody = { base64Array: cleanedBase64Array };
        const jsonString = JSON.stringify(requestBody);
        console.log('Midjourney: 请求体JSON长度:', jsonString.length, 'base64数组长度:', cleanedBase64Array.length);

        const uploadResp = await fetch(uploadEndpoint, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: jsonString,
        });

        if (!uploadResp.ok) {
            let errorText = '';
            try {
                errorText = await uploadResp.text();
                try {
                    const errorJson = JSON.parse(errorText);
                    throw new Error(`上传失败: ${uploadResp.status} - ${errorJson.description || errorJson.message || errorText}`);
                } catch {
                    throw new Error(`上传失败: ${uploadResp.status} - ${errorText}`);
                }
            } catch (error) {
                throw new Error(`上传失败: ${uploadResp.status} - ${error.message || errorText}`);
            }
        }

        const uploadData = await uploadResp.json();
        console.log('Midjourney: 上传响应:', uploadData);

        if (uploadData.code === 1 && uploadData.result && Array.isArray(uploadData.result)) {
            console.log('Midjourney: 图片上传成功，获取URLs:', uploadData.result);
            return uploadData.result;
        }

        const errorMsg = uploadData.description || uploadData.message || '上传失败：响应格式错误';
        console.error('Midjourney: 上传失败，响应:', uploadData);
        throw new Error(errorMsg);
    } catch (error) {
        console.error('Midjourney: 图片上传失败:', error);
        throw error;
    }
};
