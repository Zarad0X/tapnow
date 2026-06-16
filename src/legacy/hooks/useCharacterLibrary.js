import { useEffect, useMemo, useState } from 'react';
import { debounce } from '../support.jsx';

const loadCharacterLibrary = () => {
    try {
        const saved = localStorage.getItem('draworchestrator_characters');
        return saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.error('加载角色库失败:', error);
        return [];
    }
};

export const useCharacterLibrary = () => {
    const [characterLibrary, setCharacterLibrary] = useState(loadCharacterLibrary);

    const debouncedSaveCharacters = useMemo(() => debounce((charactersToSave) => {
        try {
            localStorage.setItem('draworchestrator_characters', JSON.stringify(charactersToSave));
        } catch (error) {
            console.error('保存角色库失败:', error);
        }
    }, 500), []);

    useEffect(() => {
        debouncedSaveCharacters(characterLibrary);
    }, [characterLibrary, debouncedSaveCharacters]);

    return [characterLibrary, setCharacterLibrary];
};

