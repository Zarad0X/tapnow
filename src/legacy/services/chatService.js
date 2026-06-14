const MAX_HISTORY_MESSAGES = 20;

const createMessageId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const createMediaChatFile = ({
    baseName,
    content,
    id = Date.now(),
    isImage,
    isVideo,
    fromHistory = false,
}) => {
    const fileExt = isImage ? 'png' : (isVideo ? 'mp4' : 'file');
    const mimeType = isImage ? 'image/png' : (isVideo ? 'video/mp4' : 'application/octet-stream');

    return {
        name: `${baseName}-${id}.${fileExt}`,
        type: mimeType,
        content,
        isImage,
        isVideo,
        isAudio: false,
        ...(fromHistory ? { fromHistory: true } : {}),
        fileExt,
    };
};

export const resolveChatSessionForSend = ({ chatSessions, currentChatId }) => {
    const chatIdToUse = currentChatId || chatSessions[0]?.id;
    const sessionToUse = chatSessions.find((session) => session.id === chatIdToUse) || chatSessions[0];
    return {
        chatIdToUse,
        currentSessionMessages: sessionToUse?.messages || [],
        sessionToUse,
    };
};

export const createUserChatMessage = ({ content, files, modelId }) => ({
    id: createMessageId(),
    role: 'user',
    content,
    files: [...files],
    timestamp: Date.now(),
    modelId,
});

export const createAssistantChatMessage = ({ content, modelId, isError = false }) => ({
    id: createMessageId(),
    role: 'assistant',
    content,
    ...(isError ? { isError: true } : {}),
    timestamp: Date.now(),
    ...(modelId ? { modelId } : {}),
});

export const addUserMessageToSessions = ({ sessions, chatId, message }) => {
    return sessions.map((session) => {
        if (session.id !== chatId) return session;
        return {
            ...session,
            messages: [...session.messages, message],
            title: session.messages.length === 0 ? message.content.slice(0, 20) : session.title,
        };
    });
};

export const addAssistantMessageToSessions = ({ sessions, chatId, message }) => {
    return sessions.map((session) => (
        session.id === chatId
            ? { ...session, messages: [...session.messages, message] }
            : session
    ));
};

const getDocumentFileLabel = (file) => {
    if (file.isPDF) return 'PDF';
    if (file.isDoc) return 'Word';
    return 'Excel';
};

export const buildCurrentChatContent = ({ message, config }) => {
    const currentContent = [];
    if (message.content) {
        currentContent.push({ type: 'text', text: message.content });
    }

    const isGeminiLike = (config?.modelName ?? '').toLowerCase().includes('gemini');
    message.files.forEach((file) => {
        if (file.isImage || (file.isVideo && isGeminiLike)) {
            currentContent.push({
                type: 'image_url',
                image_url: { url: file.content },
            });
        } else if (file.isVideo) {
            currentContent.push({ type: 'text', text: `\n[User attached video: ${file.name}]\n` });
        } else if (file.isAudio) {
            currentContent.push({ type: 'text', text: `\n[User attached audio: ${file.name}]\n` });
        } else if (file.isPDF || file.isDoc || file.isExcel) {
            currentContent.push({ type: 'text', text: `\n[User attached document: ${file.name} (${getDocumentFileLabel(file)})]\n` });
        } else if (file.isCode || (file.content && typeof file.content === 'string' && file.content.length < 50000)) {
            currentContent.push({
                type: 'text',
                text: `\n[File: ${file.name}]\n\`\`\`${file.fileExt || 'text'}\n${file.content}\n\`\`\`\n`,
            });
        } else {
            currentContent.push({ type: 'text', text: `\n[User attached file: ${file.name}]\n` });
        }
    });

    return currentContent;
};

export const buildChatApiMessages = ({ currentSessionMessages, newUserMessage, config }) => {
    const allMessages = [...currentSessionMessages, newUserMessage];
    const recentMessages = allMessages.length > MAX_HISTORY_MESSAGES
        ? allMessages.slice(-MAX_HISTORY_MESSAGES)
        : allMessages;

    return [
        {
            role: 'system',
            content: '你是一名多模态AI助手，需要结合整个对话的上下文进行连续回答。',
        },
        ...recentMessages.map((message) => ({
            role: message.role,
            content: message.content,
        })),
        {
            role: 'user',
            content: buildCurrentChatContent({ message: newUserMessage, config }),
        },
    ];
};

export const extractChatResponseContent = (data) => {
    if (data.choices?.length > 0) return data.choices[0]?.message?.content;
    if (data.content) return data.content;
    if (data.text) return data.text;
    if (data.message) return typeof data.message === 'string' ? data.message : data.message.content;
    if (data.result) return typeof data.result === 'string' ? data.result : data.result.content;
    if (data.data?.choices?.[0]?.message?.content) return data.data.choices[0].message.content;
    if (data.data?.content) return data.data.content;
    if (data.data?.text) return data.data.text;
    if (data.data?.message) return typeof data.data.message === 'string' ? data.data.message : data.data.message.content;
    if (data.data?.result) return typeof data.data.result === 'string' ? data.data.result : data.data.result.content;
    return null;
};
