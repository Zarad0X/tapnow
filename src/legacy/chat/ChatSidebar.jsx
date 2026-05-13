import React from 'react';
import {
    Bot,
    ChevronRight,
    FileAudio,
    FileText,
    History,
    Paperclip,
    Plus,
    Send,
    User,
    X,
} from '../../shared/icons.jsx';
import { renderMarkdown } from '../../shared/markdown.js';

const FileTile = ({ file, theme, size = 'large' }) => {
    const isDark = theme === 'dark';
    const imageClass = size === 'small' ? 'w-12 h-12 object-cover rounded' : 'w-16 h-16 object-cover rounded';
    const videoClass = size === 'small'
        ? 'w-16 h-12 object-cover rounded border bg-black'
        : 'max-w-full rounded-lg bg-black max-h-[300px] border';

    if (file.isImage) {
        return <img src={file.content} className={imageClass} alt={file.name} />;
    }

    if (file.isVideo) {
        return (
            <video
                src={file.content}
                controls={size !== 'small'}
                muted={size === 'small'}
                className={`${videoClass} ${isDark ? 'border-zinc-700' : 'border-zinc-300'}`}
                playsInline
            />
        );
    }

    const label = file.isAudio
        ? '音频'
        : file.isPDF
            ? 'PDF'
            : file.isDoc
                ? 'DOC'
                : file.isExcel
                    ? 'XLS'
                    : file.fileExt || file.name.split('.').pop() || '文件';

    return (
        <div
            className={`w-12 h-12 rounded flex flex-col items-center justify-center ${
                isDark
                    ? 'bg-zinc-800 border border-zinc-700 text-zinc-400'
                    : 'bg-zinc-100 border border-zinc-300 text-zinc-500'
            }`}
        >
            {file.isAudio ? <FileAudio size={16} /> : <FileText size={16} />}
            <span className="text-[8px] mt-1 max-w-full truncate px-1">{label}</span>
        </div>
    );
};

const ChatMessage = ({ message, index, theme }) => {
    const isUser = message.role === 'user';
    const isDark = theme === 'dark';

    return (
        <div
            key={message.id || message.timestamp || `msg-${index}`}
            className={`flex gap-3 select-text ${isUser ? 'flex-row-reverse' : ''}`}
        >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 select-none ${isUser ? 'bg-blue-600' : 'bg-green-600'}`}>
                {isUser ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
            </div>
            <div className={`flex flex-col gap-1 max-w-[85%] select-text ${isUser ? 'items-end' : 'items-start'}`}>
                {message.files && message.files.length > 0 && (
                    <div className={`flex flex-wrap gap-2 mb-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                        {message.files.map((file, fileIndex) => (
                            <div
                                key={file.id || file.name || fileIndex}
                                className={`rounded p-1 border flex items-center gap-1 ${
                                    isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-100 border-zinc-300'
                                }`}
                            >
                                <FileTile file={file} theme={theme} />
                            </div>
                        ))}
                    </div>
                )}
                {(message.content || (message.files && message.files.length > 0)) && (
                    <div
                        className={`rounded-2xl px-4 py-2 text-sm select-text break-words whitespace-pre-wrap ${
                            isUser
                                ? isDark
                                    ? 'bg-zinc-800 text-white rounded-tr-none'
                                    : 'bg-zinc-300 text-zinc-900 rounded-tr-none'
                                : isDark
                                    ? 'bg-zinc-800/50 text-zinc-300 rounded-tl-none border border-zinc-800'
                                    : 'bg-zinc-100 text-zinc-800 rounded-tl-none border border-zinc-200'
                        }`}
                        style={{ userSelect: 'text', cursor: 'text' }}
                    >
                        {message.isError ? (
                            <span className="text-red-500 select-text cursor-text" style={{ userSelect: 'text', cursor: 'text' }}>
                                {message.content}
                            </span>
                        ) : message.content ? (
                            <div
                                className="markdown-body"
                                dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                                style={{ userSelect: 'text', cursor: 'text' }}
                            ></div>
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    );
};

export const ChatSidebar = ({
    theme,
    isOpen,
    width,
    onResizeStart,
    chatModel,
    setChatModel,
    apiConfigs,
    getStatusColor,
    createNewChat,
    chatSessions,
    currentChatId,
    setCurrentChatId,
    chatSessionDropdownOpen,
    setChatSessionDropdownOpen,
    deleteChatSession,
    currentSession,
    isChatSending,
    chatEndRef,
    chatFiles,
    removeChatFile,
    handleChatFileUpload,
    chatInput,
    setChatInput,
    sendChatMessage,
    onClose,
}) => {
    const isDark = theme === 'dark';
    const sendDisabled = (!chatInput.trim() && chatFiles.length === 0) || isChatSending;

    return (
        <div
            className={`fixed right-0 top-12 bottom-0 border-l shadow-2xl flex flex-col z-50 transition-transform duration-300 ease-in-out select-text ${
                isDark ? 'bg-[#121214] border-zinc-800' : 'bg-white border-zinc-200'
            } ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            style={{
                width,
                pointerEvents: isOpen ? 'auto' : 'none',
            }}
        >
            <div
                className={`absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize transition-colors z-50 flex items-center justify-center group ${
                    isDark ? 'hover:bg-blue-600/50' : 'hover:bg-blue-400/30'
                }`}
                onMouseDown={onResizeStart}
            >
                <div className={`h-8 w-1 rounded transition-colors ${isDark ? 'bg-zinc-700 group-hover:bg-blue-500' : 'bg-zinc-300 group-hover:bg-blue-500'}`}></div>
            </div>

            <div className={`h-12 flex items-center justify-between px-3 shrink-0 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className="relative">
                        <select
                            value={chatModel}
                            onChange={(event) => setChatModel(event.target.value)}
                            className={`text-xs border rounded pl-2 pr-6 py-1 appearance-none outline-none focus:border-blue-500 cursor-pointer max-w-[180px] truncate ${
                                isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-white text-zinc-800 border-zinc-300'
                            }`}
                        >
                            {apiConfigs.filter((config) => config.type === 'Chat').map((config) => (
                                <option key={config.id} value={config.id}>{config.provider} ({config.modelName})</option>
                            ))}
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                            <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(chatModel)}`}></div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={createNewChat}
                        className={`p-1.5 rounded ${isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
                        title="新对话"
                    >
                        <Plus size={16} />
                    </button>
                    {chatSessions.length > 1 && (
                        <div className="relative">
                            <button
                                onClick={() => setChatSessionDropdownOpen(!chatSessionDropdownOpen)}
                                className={`p-1.5 rounded ${isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
                            >
                                <History size={16} />
                            </button>
                            {chatSessionDropdownOpen && (
                                <div
                                    className={`absolute right-0 top-full mt-1 w-48 rounded-lg shadow-xl py-1 z-50 border ${
                                        isDark ? 'bg-[#18181b] border-zinc-700' : 'bg-white border-zinc-200'
                                    }`}
                                    onMouseLeave={() => setChatSessionDropdownOpen(false)}
                                >
                                    {chatSessions.map((session) => (
                                        <div
                                            key={session.id}
                                            className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer ${
                                                currentChatId === session.id
                                                    ? isDark ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-900'
                                                    : isDark ? 'text-zinc-400 hover:bg-zinc-800/50' : 'text-zinc-500 hover:bg-zinc-100'
                                            }`}
                                            onClick={() => {
                                                setCurrentChatId(session.id);
                                                setChatSessionDropdownOpen(false);
                                            }}
                                        >
                                            <span className="truncate flex-1">{session.title}</span>
                                            <button
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    deleteChatSession(event, session.id);
                                                }}
                                                className={`p-1 ${isDark ? 'text-zinc-600 hover:text-red-500' : 'text-zinc-400 hover:text-red-500'}`}
                                            >
                                                <X size={10} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    <button
                        onClick={onClose}
                        className={`p-1.5 rounded ${isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 select-text">
                {currentSession?.messages.map((message, index) => (
                    <ChatMessage key={message.id || message.timestamp || `msg-${index}`} message={message} index={index} theme={theme} />
                ))}
                {isChatSending && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center shrink-0">
                            <Bot size={16} className="text-white" />
                        </div>
                        <div className={`rounded-2xl rounded-tl-none px-4 py-2 border flex items-center ${isDark ? 'bg-zinc-800/50 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
                            <div className="flex gap-1">
                                <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                                <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            <div className={`p-3 border-t ${isDark ? 'border-zinc-800 bg-[#121214]' : 'border-zinc-200 bg-zinc-50'}`}>
                {chatFiles.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 mb-2 custom-scrollbar">
                        {chatFiles.map((file, index) => (
                            <div key={file.id || file.name || index} className="relative group shrink-0">
                                <FileTile file={file} theme={theme} size="small" />
                                <button
                                    onClick={() => removeChatFile(index)}
                                    className={`absolute -top-1 -right-1 rounded-full p-0.5 border opacity-0 group-hover:opacity-100 transition-opacity ${
                                        isDark
                                            ? 'bg-zinc-900 text-zinc-400 hover:text-white border-zinc-700'
                                            : 'bg-white text-zinc-500 hover:text-zinc-900 border-zinc-300'
                                    }`}
                                >
                                    <X size={10} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                <div className={`relative rounded-xl flex items-end p-2 focus-within:border-blue-500/50 transition-colors border ${
                    isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-300'
                }`}>
                    <label
                        className={`p-2 cursor-pointer transition-colors ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
                        title="上传文件"
                    >
                        <Paperclip size={18} />
                        <input
                            type="file"
                            multiple
                            className="hidden"
                            onChange={handleChatFileUpload}
                            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.js,.py,.html,.css,.json,.csv"
                        />
                    </label>
                    <textarea
                        value={chatInput}
                        onChange={(event) => setChatInput(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                                event.preventDefault();
                                sendChatMessage();
                            }
                        }}
                        placeholder="发送消息..."
                        className={`w-full bg-transparent text-sm resize-none outline-none max-h-32 py-2 px-1 custom-scrollbar ${
                            isDark ? 'text-white placeholder-zinc-500' : 'text-zinc-800 placeholder-zinc-400'
                        }`}
                        rows={1}
                        style={{ minHeight: '36px' }}
                    />
                    <button
                        onClick={sendChatMessage}
                        disabled={sendDisabled}
                        className={`p-2 rounded-lg transition-all mb-0.5 ${
                            sendDisabled ? 'opacity-50 bg-transparent text-zinc-400' : 'bg-blue-600 text-white hover:bg-blue-500'
                        }`}
                    >
                        <Send size={16} />
                    </button>
                </div>
                <div className={`text-[10px] text-center mt-2 ${isDark ? 'text-zinc-600' : 'text-zinc-500'}`}>
                    支持 MP4/MP3/PDF/Doc/Excel/Code 等格式 • Enter 发送
                </div>
            </div>
        </div>
    );
};
