import { useEffect, useState } from 'react';
import {
    PROMPT_LIBRARY_KEY,
    GRID_PROMPT_TEXT,
    UPSCALE_PROMPT_TEXT,
    STORYBOARD_PROMPT_TEXT,
    CHARACTER_SHEET_PROMPT_TEXT,
    MOOD_BOARD_PROMPT_TEXT,
} from '../config/promptTemplates.js';

const DEFAULT_PROMPTS = [
    { id: 'grid-default', name: '九宫格分镜脚本', prompt: GRID_PROMPT_TEXT },
    { id: 'upscale-default', name: '高清放大', prompt: UPSCALE_PROMPT_TEXT },
    { id: 'moodboard-default', name: '情绪版', prompt: MOOD_BOARD_PROMPT_TEXT },
    { id: 'storyboard-default', name: '【分镜版】', prompt: STORYBOARD_PROMPT_TEXT },
    { id: 'character-sheet-default', name: '【角色板】', prompt: CHARACTER_SHEET_PROMPT_TEXT },
];

const loadPromptLibrary = () => {
    try {
        const saved = localStorage.getItem(PROMPT_LIBRARY_KEY);
        const parsed = saved ? JSON.parse(saved) : [];
        const existingIds = new Set((parsed || []).map((prompt) => prompt.id));
        const merged = [...parsed];
        DEFAULT_PROMPTS.forEach((prompt) => {
            const hasSameName = merged.some((item) => item.name === prompt.name);
            if (!existingIds.has(prompt.id) && !hasSameName) merged.unshift(prompt);
        });
        return merged;
    } catch (error) {
        return DEFAULT_PROMPTS;
    }
};

export const usePromptLibrary = () => {
    const [promptLibrary, setPromptLibrary] = useState(loadPromptLibrary);
    const [promptLibraryForm, setPromptLibraryForm] = useState({ name: '', prompt: '' });
    const [promptLibraryCollapsed, setPromptLibraryCollapsed] = useState(false);
    const [promptLibraryEditorOpen, setPromptLibraryEditorOpen] = useState(false);

    useEffect(() => {
        try {
            localStorage.setItem(PROMPT_LIBRARY_KEY, JSON.stringify(promptLibrary));
        } catch (error) {}
    }, [promptLibrary]);

    return {
        promptLibrary,
        setPromptLibrary,
        promptLibraryForm,
        setPromptLibraryForm,
        promptLibraryCollapsed,
        setPromptLibraryCollapsed,
        promptLibraryEditorOpen,
        setPromptLibraryEditorOpen,
    };
};
