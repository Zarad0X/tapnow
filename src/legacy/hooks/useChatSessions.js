import { useEffect, useMemo, useState } from 'react';
import { debounce } from '../support.jsx';

const DEFAULT_CHAT_SESSIONS = [{ id: 'default', title: '新对话', messages: [] }];

const loadChatSessions = () => {
    try {
        const saved = localStorage.getItem('tapnow_chat_sessions');
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
            localStorage.setItem('tapnow_chat_sessions', JSON.stringify(sessions));
        } catch (error) {}
    }, 1000), []);

    useEffect(() => {
        debouncedSaveChatSessions(chatSessions);
    }, [chatSessions, debouncedSaveChatSessions]);

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
    };
};

