import { useCallback } from 'react';
import {
    addAssistantMessageToSessions,
    addUserMessageToSessions,
    buildChatApiMessages,
    createAssistantChatMessage,
    createUserChatMessage,
    extractChatResponseContent,
    resolveChatSessionForSend,
} from '../services/chatService.js';

export const useChatMessaging = ({
    apiConfigsMap,
    chatFiles,
    chatInput,
    chatModel,
    chatSessions,
    currentChatId,
    defaultBaseUrl,
    globalApiKey,
    isChatSending,
    setChatFiles,
    setChatInput,
    setChatSessions,
    setCurrentChatId,
    setIsChatSending,
    setSettingsOpen,
}) => {
    const sendChatMessage = useCallback(async () => {
        if ((!chatInput.trim() && chatFiles.length === 0) || isChatSending) return;

        const config = apiConfigsMap.get(chatModel);
        const apiKey = config?.key || globalApiKey;
        const baseUrl = (config?.url || defaultBaseUrl).replace(/\/+$/, '');

        if (!apiKey) {
            alert('请先在 API 设置中配置 Key');
            setSettingsOpen(true);
            return;
        }

        const { chatIdToUse, currentSessionMessages, sessionToUse } = resolveChatSessionForSend({
            chatSessions,
            currentChatId,
        });
        if (sessionToUse && sessionToUse.id !== currentChatId) setCurrentChatId(sessionToUse.id);

        setIsChatSending(true);

        const newUserMsg = createUserChatMessage({
            content: chatInput,
            files: chatFiles,
            modelId: chatModel,
        });

        setChatSessions((prev) => addUserMessageToSessions({ sessions: prev, chatId: chatIdToUse, message: newUserMsg }));
        setChatInput('');
        setChatFiles([]);

        const apiMessages = buildChatApiMessages({ currentSessionMessages, newUserMessage: newUserMsg, config });

        try {
            const response = await fetch(`${baseUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: config?.modelName || 'gemini-3-pro-preview',
                    messages: apiMessages,
                    stream: false,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `API Error: ${response.status}`);
            }

            const data = await response.json();
            let aiContent = extractChatResponseContent(data);

            if (!aiContent || aiContent.trim() === '') {
                console.error('[聊天] API 响应内容为空:', data);
                aiContent = 'No response';
            }

            const newAssistantMsg = createAssistantChatMessage({ content: aiContent, modelId: chatModel });
            setChatSessions((prev) => addAssistantMessageToSessions({ sessions: prev, chatId: chatIdToUse, message: newAssistantMsg }));
        } catch (error) {
            console.error('Chat Error', error);
            const errorMsg = createAssistantChatMessage({ content: `Error: ${error.message}`, isError: true });
            setChatSessions((prev) => addAssistantMessageToSessions({ sessions: prev, chatId: chatIdToUse, message: errorMsg }));
        } finally {
            setIsChatSending(false);
        }
    }, [
        apiConfigsMap,
        chatFiles,
        chatInput,
        chatModel,
        chatSessions,
        currentChatId,
        defaultBaseUrl,
        globalApiKey,
        isChatSending,
        setChatFiles,
        setChatInput,
        setChatSessions,
        setCurrentChatId,
        setIsChatSending,
        setSettingsOpen,
    ]);

    return { sendChatMessage };
};
