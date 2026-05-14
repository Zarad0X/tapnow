import { useCallback, useEffect, useState } from 'react';

export const useChatResize = ({ setChatWidth, minWidth = 300, maxWidth = 800 }) => {
    const [isResizingChat, setIsResizingChat] = useState(false);

    const handleChatResizeStart = useCallback((event) => {
        event.preventDefault();
        setIsResizingChat(true);
    }, []);

    const handleChatResizeMove = useCallback((event) => {
        if (!isResizingChat) return;
        const newWidth = window.innerWidth - event.clientX;
        setChatWidth(Math.max(minWidth, Math.min(newWidth, maxWidth)));
    }, [isResizingChat, maxWidth, minWidth, setChatWidth]);

    const handleChatResizeEnd = useCallback(() => {
        setIsResizingChat(false);
    }, []);

    useEffect(() => {
        if (isResizingChat) {
            window.addEventListener('mousemove', handleChatResizeMove);
            window.addEventListener('mouseup', handleChatResizeEnd);
        } else {
            window.removeEventListener('mousemove', handleChatResizeMove);
            window.removeEventListener('mouseup', handleChatResizeEnd);
        }

        return () => {
            window.removeEventListener('mousemove', handleChatResizeMove);
            window.removeEventListener('mouseup', handleChatResizeEnd);
        };
    }, [isResizingChat, handleChatResizeMove, handleChatResizeEnd]);

    return {
        handleChatResizeStart,
    };
};
