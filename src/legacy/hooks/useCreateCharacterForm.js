import { useCallback, useState } from 'react';

export const useCreateCharacterForm = () => {
    const [createCharacterOpen, setCreateCharacterOpen] = useState(false);
    const [createCharacterVideoSourceType, setCreateCharacterVideoSourceType] = useState('url');
    const [createCharacterVideoUrl, setCreateCharacterVideoUrl] = useState('');
    const [createCharacterSelectedTaskId, setCreateCharacterSelectedTaskId] = useState('');
    const [createCharacterHistoryDropdownOpen, setCreateCharacterHistoryDropdownOpen] = useState(false);
    const [createCharacterStartSecond, setCreateCharacterStartSecond] = useState(1);
    const [createCharacterEndSecond, setCreateCharacterEndSecond] = useState(3);
    const [createCharacterEndpoint, setCreateCharacterEndpoint] = useState('');
    const [createCharacterSubmitting, setCreateCharacterSubmitting] = useState(false);
    const [createCharacterVideoError, setCreateCharacterVideoError] = useState(null);

    const resetCreateCharacterForm = useCallback(() => {
        setCreateCharacterVideoSourceType('url');
        setCreateCharacterVideoUrl('');
        setCreateCharacterSelectedTaskId('');
        setCreateCharacterHistoryDropdownOpen(false);
        setCreateCharacterStartSecond(1);
        setCreateCharacterEndSecond(3);
        setCreateCharacterEndpoint('');
        setCreateCharacterSubmitting(false);
        setCreateCharacterVideoError(null);
    }, []);

    return {
        createCharacterOpen,
        setCreateCharacterOpen,
        createCharacterVideoSourceType,
        setCreateCharacterVideoSourceType,
        createCharacterVideoUrl,
        setCreateCharacterVideoUrl,
        createCharacterSelectedTaskId,
        setCreateCharacterSelectedTaskId,
        createCharacterHistoryDropdownOpen,
        setCreateCharacterHistoryDropdownOpen,
        createCharacterStartSecond,
        setCreateCharacterStartSecond,
        createCharacterEndSecond,
        setCreateCharacterEndSecond,
        createCharacterEndpoint,
        setCreateCharacterEndpoint,
        createCharacterSubmitting,
        setCreateCharacterSubmitting,
        createCharacterVideoError,
        setCreateCharacterVideoError,
        resetCreateCharacterForm,
    };
};
