export const stripMarkdownJsonFence = (content) => {
    const text = String(content ?? '').trim();
    if (!text.startsWith('```')) return text;
    return text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
};

export const repairRelaxedJsonText = (jsonText) => {
    return String(jsonText ?? '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*/g, '')
        .replace(/,(\s*[}\]])/g, '$1');
};

export const parseJsonWithRepair = (content) => {
    const jsonText = stripMarkdownJsonFence(content);

    try {
        return {
            value: JSON.parse(jsonText),
            text: jsonText,
            repaired: false,
        };
    } catch (firstError) {
        const repairedText = repairRelaxedJsonText(jsonText);
        try {
            return {
                value: JSON.parse(repairedText),
                text: repairedText,
                repaired: true,
                firstError,
            };
        } catch (error) {
            error.firstError = firstError;
            error.originalText = jsonText;
            error.repairedText = repairedText;
            throw error;
        }
    }
};
