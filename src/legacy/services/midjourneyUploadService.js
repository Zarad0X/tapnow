import {
    blobToDataURL,
    getBase64FromUrl,
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

// 上传单个图片到图床并获取HTTP URL（用于Midjourney的oref和sref指令，以及拓展图片）
export const uploadImageToGetHttpUrl = async (imageUrl, baseUrl, apiKey) => {
    try {
        // 如果是HTTP/HTTPS URL，直接返回
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            return imageUrl;
        }

        // 如果是 Blob URL，需要转换为 Base64 再上传
        if (imageUrl.startsWith('blob:')) {
            const base64Data = await getBase64FromUrl(imageUrl);
            // 继续使用 data URL 的处理逻辑
            imageUrl = `data:image/png;base64,${base64Data}`;
        }

        // 如果是data URL，需要上传
        if (imageUrl.startsWith('data:')) {
            // 提取base64数据（去掉 data:image/png;base64, 前缀）
            // 确保正确提取纯base64字符串
            let base64Data = imageUrl;
            if (base64Data.includes(',')) {
                base64Data = base64Data.split(',')[1];
            } else {
                // 如果没有逗号，尝试去掉 data: 前缀
                base64Data = base64Data.replace(/^data:[^;]*;base64,?/i, '');
            }
            // 先清理所有非base64字符（包括所有空白字符和不可见字符）
            // 这是最严格的方式：只保留有效的base64字符
            base64Data = base64Data.replace(/[^A-Za-z0-9+/=]/g, '');

            if (!base64Data || base64Data.length < 100) {
                console.error('拓展图片: base64数据无效或太短，长度:', base64Data?.length);
                return null;
            }

            // 验证base64格式：只包含 base64 字符（A-Z, a-z, 0-9, +, /, =）
            const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
            if (!base64Regex.test(base64Data)) {
                console.error('拓展图片: base64数据格式验证失败，包含非法字符');
                // 再次清理（理论上不应该到这里）
                base64Data = base64Data.replace(/[^A-Za-z0-9+/=]/g, '');
                if (!base64Regex.test(base64Data)) {
                    console.error('拓展图片: 清理后仍无效，放弃上传');
                    return null;
                }
            }

            // 验证base64长度是否为4的倍数（base64编码要求）
            const padding = base64Data.length % 4;
            if (padding !== 0) {
                console.warn('拓展图片: base64长度不是4的倍数，添加填充:', padding);
                base64Data += '='.repeat(4 - padding);
            }

            // 最终验证
            if (!base64Regex.test(base64Data)) {
                console.error('拓展图片: 最终验证失败');
                return null;
            }

            console.log('拓展图片: 提取的base64数据长度:', base64Data.length, '前50字符:', base64Data.substring(0, 50), '后10字符:', base64Data.substring(base64Data.length - 10), '格式验证通过:', base64Regex.test(base64Data));

            // 优先使用 Midjourney 官方上传接口
            try {
                // 确保 baseUrl 格式正确（移除末尾斜杠）
                const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
                const uploadEndpoint = `${cleanBaseUrl}/mj/submit/upload-discord-images`;
                const uploadPayload = {
                    base64Array: [base64Data]
                };

                console.log('拓展图片: 使用 Midjourney 上传接口上传图片...', uploadEndpoint, 'base64长度:', base64Data.length);

                const uploadResp = await fetch(uploadEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify(uploadPayload)
                });

                const responseText = await uploadResp.text();
                console.log('拓展图片: Midjourney 上传响应状态:', uploadResp.status, '响应长度:', responseText.length);

                if (uploadResp.ok) {
                    let uploadData;
                    try {
                        uploadData = JSON.parse(responseText);
                    } catch (parseError) {
                        console.error('拓展图片: Midjourney 上传响应解析失败', parseError, '响应内容:', responseText.substring(0, 200));
                        throw new Error('响应不是有效的JSON格式');
                    }

                    console.log('拓展图片: Midjourney 上传响应数据:', uploadData);
                    console.log('拓展图片: 响应详细信息:', {
                        code: uploadData.code,
                        description: uploadData.description,
                        result: uploadData.result,
                        resultType: typeof uploadData.result,
                        isArray: Array.isArray(uploadData.result),
                        hasData: !!uploadData.data,
                        hasUrl: !!uploadData.url
                    });

                    // 检查响应格式
                    if (uploadData.code === 1) {
                        // 尝试多种可能的响应格式
                        let httpUrl = null;

                        // 格式1: result 是数组
                        if (uploadData.result && Array.isArray(uploadData.result) && uploadData.result.length > 0) {
                            httpUrl = uploadData.result[0];
                        }
                        // 格式2: result 是字符串
                        else if (uploadData.result && typeof uploadData.result === 'string') {
                            httpUrl = uploadData.result;
                        }
                        // 格式3: data 字段
                        else if (uploadData.data && Array.isArray(uploadData.data) && uploadData.data.length > 0) {
                            httpUrl = uploadData.data[0];
                        }
                        // 格式4: url 字段
                        else if (uploadData.url) {
                            httpUrl = uploadData.url;
                        }

                        if (httpUrl && (httpUrl.startsWith('http://') || httpUrl.startsWith('https://'))) {
                            console.log('拓展图片: Midjourney 上传成功，获取HTTP URL:', httpUrl);
                            return httpUrl;
                        } else {
                            console.warn('拓展图片: Midjourney 返回的URL格式不正确或为空', {
                                httpUrl,
                                code: uploadData.code,
                                description: uploadData.description,
                                result: uploadData.result,
                                data: uploadData.data,
                                url: uploadData.url
                            });
                        }
                    } else {
                        console.warn('拓展图片: Midjourney 上传失败', {
                            code: uploadData.code,
                            description: uploadData.description,
                            fullResponse: uploadData
                        });
                    }
                } else {
                    console.warn('拓展图片: Midjourney 上传失败', uploadResp.status, '响应内容:', responseText.substring(0, 200));
                }
            } catch (e) {
                console.error('拓展图片: Midjourney 上传接口调用失败', e);
            }

            // 如果 Midjourney 上传失败，尝试使用图床服务作为备选
            const mimeMatch = imageUrl.match(/data:([^;]+);base64/);
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

            // 将base64转换为Blob
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: mimeType });

            const imageBedServices = [
                // sm.ms图床
                {
                    name: 'sm.ms',
                    url: 'https://sm.ms/api/v2/upload',
                    fieldName: 'smfile',
                    parseResponse: (data) => data.success && data.data?.url ? data.data.url : null
                }
            ];

            for (const service of imageBedServices) {
                if (service.skip) continue;

                try {
                    const formData = new FormData();
                    formData.append(service.fieldName, blob, 'image.png');

                    const resp = await fetch(service.url, {
                        method: 'POST',
                        body: formData
                    });

                    if (resp.ok) {
                        const data = await resp.json();
                        const httpUrl = service.parseResponse(data);
                        if (httpUrl && (httpUrl.startsWith('http://') || httpUrl.startsWith('https://'))) {
                            console.log(`拓展图片: 使用${service.name}图床上传成功，获取HTTP URL:`, httpUrl);
                            return httpUrl;
                        }
                    }
                } catch (e) {
                    console.warn(`拓展图片: ${service.name}图床上传失败:`, e);
                    continue;
                }
            }

            // 如果所有上传方式都失败，返回null
            console.warn('拓展图片: 所有上传方式都失败，无法获取HTTP URL');
            return null;
        }

        // 其他格式，直接返回
        return imageUrl;
    } catch (error) {
        console.error('拓展图片: 上传图片失败:', error);
        return null;
    }
};
