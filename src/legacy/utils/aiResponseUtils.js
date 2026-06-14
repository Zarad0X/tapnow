const getContentValue = (value) => {
    if (!value) return null;
    return typeof value === 'string' ? value : value.content;
};

export const extractAiResponseContent = (data) => {
    if (data?.choices && data.choices.length > 0) {
        return data.choices[0]?.message?.content || null;
    }
    if (data?.data?.choices && data.data.choices.length > 0) {
        return data.data.choices[0]?.message?.content || null;
    }
    if (data?.content) return data.content;
    if (data?.data?.content) return data.data.content;
    if (data?.text) return data.text;
    if (data?.data?.text) return data.data.text;
    if (data?.message) return getContentValue(data.message);
    if (data?.data?.message) return getContentValue(data.data.message);
    if (data?.result) return getContentValue(data.result);
    if (data?.data?.result) return getContentValue(data.data.result);
    return null;
};
