import React from 'react';
import { LinkIcon, Trash2, User, X } from '../../shared/icons.jsx';

const insertCharacterTag = (username) => {
    const tag = ` @${username} `;
    const activeElement = document.activeElement;

    if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT')) {
        const textarea = activeElement;
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        const text = textarea.value;
        const newText = text.slice(0, start) + tag + text.slice(end);
        textarea.value = newText;
        const newCursorPos = start + tag.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.focus();
        return;
    }

    navigator.clipboard.writeText(tag.trim()).then(() => {
        alert(`已复制角色标签: ${tag.trim()}`);
    });
};

export const CharacterPanel = ({
    isOpen,
    theme,
    characters,
    setCharacters,
    onCreateCharacter,
    onClose,
}) => {
    if (!isOpen) return null;

    const isDark = theme === 'dark';

    const deleteCharacter = (event, character) => {
        event.stopPropagation();
        if (!confirm(`确定要删除角色 "${character.username}" 吗？`)) return;

        const updated = characters.filter((item) => item.id !== character.id);
        setCharacters(updated);
        try {
            localStorage.setItem('draworchestrator_characters', JSON.stringify(updated));
        } catch (error) {
            console.error('保存角色库失败:', error);
        }
    };

    return (
        <div
            className={`w-72 z-30 flex flex-col animate-in slide-in-from-left border-r transition-colors duration-300 ${
                isDark ? 'bg-[#121214] border-zinc-800' : 'bg-zinc-50 border-zinc-200'
            }`}
        >
            <div
                className={`p-3 border-b flex justify-between items-center ${
                    isDark ? 'border-zinc-800' : 'border-zinc-200'
                }`}
            >
                <h3 className={`font-bold text-xs ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    Sora 角色库
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onCreateCharacter}
                        className={`px-2 py-1 text-[10px] rounded transition-colors ${
                            isDark ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                    >
                        新建角色
                    </button>
                    <button onClick={onClose}>
                        <X size={12} className={isDark ? 'text-zinc-500' : 'text-zinc-400'} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                {characters.length === 0 ? (
                    <div className={`text-center py-8 text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        暂无角色，点击"新建角色"开始创建
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {characters.map((character) => (
                            <div
                                key={character.id}
                                className={`group rounded-lg overflow-hidden border cursor-pointer hover:border-blue-500/50 transition-colors ${
                                    isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
                                }`}
                                onClick={() => insertCharacterTag(character.username)}
                            >
                                <div className="aspect-square bg-zinc-800 relative group/char">
                                    {character.profile_picture_url || character.localCacheUrl ? (
                                        <img
                                            src={character.localCacheUrl || character.profile_picture_url}
                                            alt={character.username}
                                            className="w-full h-full object-cover"
                                            onError={(event) => {
                                                if (
                                                    character.localCacheUrl &&
                                                    event.target.src === character.localCacheUrl &&
                                                    character.profile_picture_url
                                                ) {
                                                    event.target.src = character.profile_picture_url;
                                                } else {
                                                    event.target.style.display = 'none';
                                                }
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-zinc-500">
                                            <User size={24} />
                                        </div>
                                    )}
                                    {character.localCacheUrl && (
                                        <div className="absolute top-1 left-1 px-1 py-0.5 rounded text-[8px] bg-green-500/80 text-white">
                                            本地
                                        </div>
                                    )}
                                    <button
                                        onClick={(event) => deleteCharacter(event, character)}
                                        className="absolute top-1 right-1 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                                        title="删除角色"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                                <div className="p-2 relative">
                                    <p className={`text-xs truncate flex items-center gap-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                                        {character.username}
                                        <LinkIcon size={12} className="text-green-500 shrink-0" title="Sora 2 已同步" />
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
