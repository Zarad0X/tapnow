import { useEffect } from 'react';

export const useSyncedViewRef = (viewRef, view) => {
    useEffect(() => {
        viewRef.current = view;
    }, [viewRef, view]);
};
