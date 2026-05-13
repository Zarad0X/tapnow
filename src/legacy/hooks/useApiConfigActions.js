import { useCallback, useMemo, useState } from 'react';

export const useApiConfigActions = ({
    apiConfigs,
    setApiConfigs,
    globalApiKey,
    defaultBaseUrl,
}) => {
    const [apiTesting, setApiTesting] = useState(null);
    const [apiStatus, setApiStatus] = useState({});

    const apiConfigsMap = useMemo(() => {
        const map = new Map();
        apiConfigs.forEach((config) => {
            map.set(config.id, config);
        });
        return map;
    }, [apiConfigs]);

    const addNewModel = useCallback(() => {
        const newConfig = {
            id: `custom-${Date.now()}`,
            provider: 'New Model',
            modelName: 'new-model-id',
            type: 'Chat',
            key: '',
            url: defaultBaseUrl,
            isCustom: true,
        };
        setApiConfigs((prev) => [...prev, newConfig]);
    }, [defaultBaseUrl, setApiConfigs]);

    const updateApiConfig = useCallback((id, updates) => {
        setApiConfigs((prev) => prev.map((config) => (
            config.id === id ? { ...config, ...updates } : config
        )));
    }, [setApiConfigs]);

    const deleteApiConfig = useCallback((id) => {
        setApiConfigs((prev) => prev.filter((config) => config.id !== id));
    }, [setApiConfigs]);

    const testApiConnection = useCallback(async (id) => {
        setApiTesting(id);
        setApiStatus((prev) => ({ ...prev, [id]: 'idle' }));
        const config = apiConfigsMap.get(id);
        const apiKey = config?.key || globalApiKey;

        if (!apiKey) {
            setApiStatus((prev) => ({ ...prev, [id]: 'error' }));
            setApiTesting(null);
            return;
        }

        try {
            const response = await fetch(`${config?.url || defaultBaseUrl}/v1/models`, {
                method: 'GET',
                headers: { Authorization: `Bearer ${apiKey}` },
            });
            setApiStatus((prev) => ({ ...prev, [id]: response.ok ? 'success' : 'error' }));
        } catch {
            setApiStatus((prev) => ({ ...prev, [id]: 'error' }));
        }
        setApiTesting(null);
    }, [apiConfigsMap, defaultBaseUrl, globalApiKey]);

    const getStatusColor = useCallback((modelId) => {
        if (!modelId) return 'bg-zinc-600';
        const status = apiStatus[modelId];
        if (status === 'success') return 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]';
        if (status === 'error') return 'bg-red-500';
        const config = apiConfigsMap.get(modelId);
        return (config?.key || globalApiKey) ? 'bg-zinc-400' : 'bg-zinc-700';
    }, [apiConfigsMap, apiStatus, globalApiKey]);

    return {
        apiTesting,
        apiStatus,
        addNewModel,
        updateApiConfig,
        deleteApiConfig,
        testApiConnection,
        getStatusColor,
    };
};
