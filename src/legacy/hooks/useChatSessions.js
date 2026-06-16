import { useCallback, useEffect, useMemo, useState } from 'react';
import { debounce } from '../support.jsx';

const DEFAULT_CHAT_SESSIONS = [{ id: 'default', title: '新对话', messages: [] }];

const loadChatSessions = () => {
    try {
        const saved = localStorage.getItem('draworchestrator_chat_sessions');
        return saved ? JSON.parse(saved) : DEFAULT_CHAT_SESSIONS;
    } catch (error) {
        return DEFAULT_CHAT_SESSIONS;
    }
};

export const useChatSessions = () => {
    const [chatSessions, setChatSessions] = useState(loadChatSessions);
    const [currentChatId, setCurrentChatId] = useState('default');
    const [chatInput, setChatInput] = useState('');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatWidth, setChatWidth] = useState(400);
    const [chatFiles, setChatFiles] = useState([]);
    const [chatModel, setChatModel] = useState('gemini-3-pro');
    const [isChatSending, setIsChatSending] = useState(false);
    const [chatSessionDropdownOpen, setChatSessionDropdownOpen] = useState(false);

    const currentSession = useMemo(
        () => chatSessions.find((session) => session.id === currentChatId) || chatSessions[0],
        [chatSessions, currentChatId]
    );

    const debouncedSaveChatSessions = useMemo(() => debounce((sessions) => {
        try {
            localStorage.setItem('draworchestrator_chat_sessions', JSON.stringify(sessions));
        } catch (error) {}
    }, 1000), []);

    useEffect(() => {
        debouncedSaveChatSessions(chatSessions);
    }, [chatSessions, debouncedSaveChatSessions]);

    const createNewChat = useCallback(() => {
        const newId = `chat-${Date.now()}`;
        const newSession = { id: newId, title: '新对话', messages: [] };
        setChatSessions((prev) => [newSession, ...prev]);
        setCurrentChatId(newId);
    }, []);

    const deleteChatSession = useCallback((event, id) => {
        event.stopPropagation();
        const newSessions = chatSessions.filter((session) => session.id !== id);
        if (newSessions.length === 0) {
            setChatSessions(DEFAULT_CHAT_SESSIONS);
            setCurrentChatId('default');
            return;
        }

        setChatSessions(newSessions);
        if (currentChatId === id) {
            setCurrentChatId(newSessions[0].id);
        }
    }, [chatSessions, currentChatId]);

    return {
        chatSessions,
        setChatSessions,
        currentChatId,
        setCurrentChatId,
        currentSession,
        chatInput,
        setChatInput,
        isChatOpen,
        setIsChatOpen,
        chatWidth,
        setChatWidth,
        chatFiles,
        setChatFiles,
        chatModel,
        setChatModel,
        isChatSending,
        setIsChatSending,
        chatSessionDropdownOpen,
        setChatSessionDropdownOpen,
        createNewChat,
        deleteChatSession,
    };
};
