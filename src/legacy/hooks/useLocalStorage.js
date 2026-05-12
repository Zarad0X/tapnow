import { useEffect, useState } from 'react';

const resolveInitialValue = (value) => (typeof value === 'function' ? value() : value);

const safeRead = (key, initialValue, deserialize) => {
    try {
        const saved = localStorage.getItem(key);
        if (saved === null) return resolveInitialValue(initialValue);
        return deserialize(saved);
    } catch (error) {
        console.warn(`[localStorage] 读取失败: ${key}`, error);
        return resolveInitialValue(initialValue);
    }
};

export const useLocalStorage = (
    key,
    initialValue,
    {
        serialize = JSON.stringify,
        deserialize = JSON.parse,
        onError = (error) => console.warn(`[localStorage] 写入失败: ${key}`, error),
    } = {}
) => {
    const [value, setValue] = useState(() => safeRead(key, initialValue, deserialize));

    useEffect(() => {
        try {
            localStorage.setItem(key, serialize(value));
        } catch (error) {
            onError(error);
        }
    }, [key, onError, serialize, value]);

    return [value, setValue];
};

