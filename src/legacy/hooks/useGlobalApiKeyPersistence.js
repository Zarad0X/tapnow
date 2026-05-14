import { useEffect, useMemo } from 'react';
import { debounce } from '../support.jsx';

export const useGlobalApiKeyPersistence = (globalApiKey) => {
    const debouncedSaveGlobalKey = useMemo(() => debounce((key) => {
        localStorage.setItem('tapnow_global_key', key);
    }, 1000), []);

    useEffect(() => {
        debouncedSaveGlobalKey(globalApiKey);
    }, [globalApiKey, debouncedSaveGlobalKey]);
};
