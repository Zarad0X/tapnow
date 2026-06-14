import { useCallback } from 'react';
import { DEFAULT_BASE_URL } from '../config/modelConfig.js';

export const useCreateCharacterAction = ({
    apiConfigs,
    characterLibrary,
    globalApiKey,
    resetCreateCharacterForm,
    setCharacterLibrary,
    setCreateCharacterOpen,
    setCreateCharacterSubmitting,
}) => {
    const createCharacter = useCallback(async (videoUrl, startSecond, endSecond, fromTaskId = null, customEndpoint = null) => {
        try {
            const soraConfig = apiConfigs.find((config) => (
                config.type === 'Video' && (config.id === 'sora-2' || config.id === 'sora-2-pro')
            ));
            if (!soraConfig) {
                alert('未找到 Sora 2 模型配置，请先在设置中配置 Sora 2 或 Sora 2 Pro');
                setCreateCharacterSubmitting(false);
                return;
            }

            const apiKey = soraConfig.key || globalApiKey;
            if (!apiKey) {
                alert('请先配置 API Key');
                setCreateCharacterSubmitting(false);
                return;
            }

            if (endSecond - startSecond < 1 || endSecond - startSecond > 3) {
                alert('时间范围必须在 1-3 秒之间');
                setCreateCharacterSubmitting(false);
                return;
            }

            const timestamps = `${startSecond},${endSecond}`;
            const endpoint = customEndpoint && customEndpoint.trim()
                ? customEndpoint.trim()
                : `${(soraConfig.url || DEFAULT_BASE_URL).replace(/\/+$/, '')}/sora/v1/characters`;
            const payload = fromTaskId
                ? { from_task: fromTaskId, timestamps }
                : { url: videoUrl, timestamps };

            console.log('[Create Character] Request Details:', {
                endpoint,
                apiKey: apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : 'EMPTY',
                payload,
                fromTaskId,
                videoUrl: fromTaskId ? 'N/A (using from_task)' : videoUrl,
                customEndpoint: customEndpoint || 'N/A (using default)',
            });

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[Create Character] API Error:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorText,
                    endpoint,
                });

                let errorData = null;
                try {
                    errorData = JSON.parse(errorText);
                } catch (error) {}

                if (
                    response.status === 500
                    || (errorData && (errorData.code === 'get_origin_task_failed' || errorData.message?.includes('get_origin_task_failed')))
                ) {
                    throw new Error('TASK_NOT_FOUND');
                }

                throw new Error(`API错误 (${response.status}): ${errorText || response.statusText}`);
            }

            const data = await response.json();
            console.log('[Create Character] Success:', data);

            if (data.id && data.username) {
                const newCharacter = {
                    id: data.id,
                    username: data.username,
                    profile_picture_url: data.profile_picture_url || '',
                    permalink: data.permalink || '',
                };

                setCharacterLibrary([...characterLibrary, newCharacter]);
                alert(`角色 "${data.username}" 创建成功！`);
                setCreateCharacterOpen(false);
                resetCreateCharacterForm();
            } else {
                throw new Error('返回数据缺少 id 或 username');
            }
        } catch (error) {
            console.error('[Create Character] Failed:', error);
            let message = error.message;

            if (message === 'TASK_NOT_FOUND') {
                alert('创建失败：原任务已过期或无法访问。\n\n请尝试获取该视频的下载链接，使用"输入视频 URL"方式重新创建。');
                return;
            }

            if (message.includes('Failed to fetch') || error.name === 'TypeError' || error.message.includes('NetworkError')) {
                message = '连接失败。可能原因：\n\n1. API 地址填写错误\n   - 请检查 API 接口地址是否多余了 "/sora" 前缀\n   - 有些服务商的路径可能不同，请询问服务商 Sora 角色创建接口的准确路径\n\n2. 跨域限制 (CORS)\n   - 请尝试安装 Allow CORS 浏览器插件\n\n3. 网络问题\n   - 请检查网络连接';
            }

            alert(`创建角色失败: ${message}`);
        } finally {
            setCreateCharacterSubmitting(false);
        }
    }, [
        apiConfigs,
        characterLibrary,
        globalApiKey,
        resetCreateCharacterForm,
        setCharacterLibrary,
        setCreateCharacterOpen,
        setCreateCharacterSubmitting,
    ]);

    return {
        createCharacter,
    };
};
