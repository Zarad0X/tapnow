import { useEffect, useState } from 'react';
import {
    DEFAULT_API_CONFIGS,
    DEFAULT_BASE_URL,
    JIMENG_API_BASE_URL,
    DELETED_MODEL_IDS,
} from '../config/modelConfig.js';

const cloneConfigList = (configs) => configs.map((config) => ({ ...config }));

const loadApiConfigs = () => {
    const saved = localStorage.getItem('tapnow_api_configs');
    let configs = saved ? JSON.parse(saved) : cloneConfigList(DEFAULT_API_CONFIGS);

    const hasGpt52 = configs.some((c) => c.id === 'gpt-5-2');
    if (!hasGpt52) {
        const gpt51Index = configs.findIndex((c) => c.id === 'gpt-5-1');
        const insertIndex = gpt51Index >= 0 ? gpt51Index + 1 : configs.findIndex((c) => c.type === 'Chat' && c.id === 'deepseek-v3');
        const finalIndex = insertIndex >= 0 ? insertIndex : configs.length;
        configs.splice(finalIndex, 0, { id: 'gpt-5-2', provider: 'GPT 5.2', modelName: 'gpt-5.2', type: 'Chat', key: '', url: DEFAULT_BASE_URL });
    }

    configs = configs.filter((c) => c.id !== 'jimeng-4.5');

    const hasSora2Pro = configs.some((c) => c.id === 'sora-2-pro');
    if (!hasSora2Pro) {
        const sora2Index = configs.findIndex((c) => c.id === 'sora-2');
        const insertIndex = sora2Index >= 0 ? sora2Index + 1 : configs.findIndex((c) => c.type === 'Video' && c.id === 'google-veo3');
        const finalIndex = insertIndex >= 0 ? insertIndex : configs.length;
        configs.splice(finalIndex, 0, { id: 'sora-2-pro', provider: 'Sora 2 Pro', modelName: 'sora-2-pro', type: 'Video', key: '', url: DEFAULT_BASE_URL, durations: ['15s', '25s'] });
    }

    const hasGptImage15 = configs.some((c) => c.id === 'gpt-image-1.5');
    if (!hasGptImage15) {
        const gptImageIndex = configs.findIndex((c) => c.id === 'gpt-image');
        const insertIndex = gptImageIndex >= 0 ? gptImageIndex + 1 : configs.findIndex((c) => c.type === 'Image' && c.id === 'flux-kontext');
        const finalIndex = insertIndex >= 0 ? insertIndex : configs.length;
        configs.splice(finalIndex, 0, { id: 'gpt-image-1.5', provider: 'GPT Image 1.5', modelName: 'gpt-image-1.5', type: 'Image', key: '', url: DEFAULT_BASE_URL });
    }

    configs = configs.filter((c) => !DELETED_MODEL_IDS.includes(c.id));

    const savedSessionId = localStorage.getItem('tapnow_jimeng_session_id');
    const sessionIdToUse = savedSessionId || '';

    const hasJimeng45 = configs.some((c) => c.id === 'jimeng-4.5');
    const hasJimeng41 = configs.some((c) => c.id === 'jimeng-4.1');
    const hasJimeng31 = configs.some((c) => c.id === 'jimeng-3.1');

    if (!hasJimeng45 || !hasJimeng41 || !hasJimeng31) {
        const mjIndex = configs.findIndex((c) => c.id === 'mj-v6');
        const insertIndex = mjIndex >= 0 ? mjIndex + 1 : configs.length;

        if (!hasJimeng45) {
            configs.splice(insertIndex, 0, { id: 'jimeng-4.5', provider: 'Jimeng 4.5', modelName: 'jimeng-4.5', type: 'Image', key: sessionIdToUse, url: JIMENG_API_BASE_URL });
        }
        if (!hasJimeng41) {
            const jimeng45Index = configs.findIndex((c) => c.id === 'jimeng-4.5');
            const nextIndex = jimeng45Index >= 0 ? jimeng45Index + 1 : insertIndex;
            configs.splice(nextIndex, 0, { id: 'jimeng-4.1', provider: 'Jimeng 4.1', modelName: 'jimeng-4.1', type: 'Image', key: sessionIdToUse, url: JIMENG_API_BASE_URL });
        }
        if (!hasJimeng31) {
            const jimeng41Index = configs.findIndex((c) => c.id === 'jimeng-4.1');
            const nextIndex = jimeng41Index >= 0 ? jimeng41Index + 1 : insertIndex + 1;
            configs.splice(nextIndex, 0, { id: 'jimeng-3.1', provider: 'Jimeng 3.1', modelName: 'jimeng-3.1', type: 'Image', key: sessionIdToUse, url: JIMENG_API_BASE_URL });
        }
    } else {
        configs = configs.map((c) =>
            (c.id.includes('jimeng') || c.provider?.includes('Jimeng'))
                ? { ...c, key: sessionIdToUse }
                : c
        );
    }

    const hasGrok3 = configs.some((c) => c.id === 'grok-3');
    if (!hasGrok3) {
        const firstVideoIndex = configs.findIndex((c) => c.type === 'Video');
        const insertIndex = firstVideoIndex >= 0 ? firstVideoIndex : configs.length;
        configs.splice(insertIndex, 0, { id: 'grok-3', provider: 'Grok3 Video', modelName: 'grok-video-3', type: 'Video', key: '', url: 'https://ai.t8star.cn', durations: ['8s', '5s'] });
    }

    return configs;
};

export const useApiConfigs = () => {
    const [apiConfigs, setApiConfigs] = useState(() => {
        try {
            return loadApiConfigs();
        } catch (error) {
            console.error('加载 API 配置失败:', error);
            return cloneConfigList(DEFAULT_API_CONFIGS).filter((c) => !DELETED_MODEL_IDS.includes(c.id));
        }
    });

    useEffect(() => {
        try {
            const filteredConfigs = apiConfigs.filter((c) => c.id !== 'jimeng-4.5');
            localStorage.setItem('tapnow_api_configs', JSON.stringify(filteredConfigs));
        } catch (error) {
            console.error('保存 API 配置失败:', error);
        }
    }, [apiConfigs]);

    return [apiConfigs, setApiConfigs];
};
