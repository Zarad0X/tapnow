import { useCallback } from 'react';

const CODE_FILE_PATTERN = /\.(txt|md|js|jsx|ts|tsx|py|html|css|json|csv|xml|yaml|yml|sh|bash|java|cpp|c)$/i;

const CODE_FILE_EXTENSIONS = new Set([
    'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'html', 'css',
    'json', 'xml', 'yaml', 'yml', 'md', 'txt', 'sh', 'bash',
]);

const getChatFileMeta = (file) => {
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';

    return {
        name: file.name,
        type: file.type,
        isImage: file.type.startsWith('image/'),
        isVideo: file.type.startsWith('video/'),
        isAudio: file.type.startsWith('audio/'),
        isPDF: file.type === 'application/pdf' || fileExt === 'pdf',
        isDoc: ['doc', 'docx'].includes(fileExt) || file.type.includes('word'),
        isExcel: ['xls', 'xlsx'].includes(fileExt) || file.type.includes('excel') || file.type.includes('spreadsheet'),
        isCode: CODE_FILE_EXTENSIONS.has(fileExt),
        fileExt,
    };
};

const shouldReadFileAsText = (file) => CODE_FILE_PATTERN.test(file.name);

export const useChatFiles = ({ setChatFiles }) => {
    const handleChatFileUpload = useCallback((event) => {
        const files = Array.from(event.target.files);
        files.forEach((file) => {
            const reader = new FileReader();
            const meta = getChatFileMeta(file);

            reader.onload = (readerEvent) => {
                setChatFiles((prev) => [...prev, {
                    ...meta,
                    content: readerEvent.target.result,
                }]);
            };

            if (shouldReadFileAsText(file)) {
                reader.readAsText(file);
            } else {
                reader.readAsDataURL(file);
            }
        });
        event.target.value = '';
    }, [setChatFiles]);

    const removeChatFile = useCallback((index) => {
        setChatFiles((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    }, [setChatFiles]);

    return {
        handleChatFileUpload,
        removeChatFile,
    };
};
