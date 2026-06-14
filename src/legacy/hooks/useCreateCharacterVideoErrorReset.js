import { useEffect } from 'react';

export const useCreateCharacterVideoErrorReset = ({
    createCharacterVideoUrl,
    createCharacterSelectedTaskId,
    createCharacterVideoSourceType,
    setCreateCharacterVideoError,
}) => {
    useEffect(() => {
        setCreateCharacterVideoError(null);
    }, [
        createCharacterVideoUrl,
        createCharacterSelectedTaskId,
        createCharacterVideoSourceType,
        setCreateCharacterVideoError,
    ]);
};
