const stripMarkdownJsonFence = (content) => {
    const trimmed = content.trim();
    if (!trimmed.startsWith('```')) return trimmed;
    return trimmed.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
};

const extractVideoAnalysisContent = (data) => {
    if (data.choices && data.choices.length > 0) return data.choices[0]?.message?.content;
    if (data.data?.choices && data.data.choices.length > 0) return data.data.choices[0]?.message?.content;
    if (data.content) return data.content;
    if (data.data?.content) return data.data.content;
    if (data.text) return data.text;
    if (data.data?.text) return data.data.text;
    if (data.message) return typeof data.message === 'string' ? data.message : data.message.content;
    if (data.data?.message) return typeof data.data.message === 'string' ? data.data.message : data.data.message.content;
    if (data.result) return typeof data.result === 'string' ? data.result : data.result.content;
    if (data.data?.result) return typeof data.data.result === 'string' ? data.data.result : data.data.result.content;
    return null;
};

const repairJsonString = (jsonString) => {
    return jsonString
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*/g, '')
        .replace(/,(\s*[}\]])/g, '$1');
};

export const groupKeyframesByTime = (keyframes, segmentDuration) => {
    if (!keyframes || keyframes.length === 0) return [];

    const sorted = [...keyframes].sort((a, b) => a.time - b.time);
    const groups = [];
    let currentGroup = [];
    let currentGroupStart = sorted[0].time;

    sorted.forEach((frame) => {
        if (frame.time - currentGroupStart >= segmentDuration && currentGroup.length > 0) {
            groups.push([...currentGroup]);
            currentGroup = [frame];
            currentGroupStart = frame.time;
        } else {
            currentGroup.push(frame);
        }
    });

    if (currentGroup.length > 0) {
        groups.push(currentGroup);
    }

    return groups;
};

export const extractRequiredAnalysisContent = ({ data, label }) => {
    const aiContent = extractVideoAnalysisContent(data);
    if (!aiContent || aiContent.trim() === '' || aiContent === '{}') {
        console.error(`[${label}] API 响应内容为空:`, data);
        throw new Error(`API 返回内容为空。响应数据: ${JSON.stringify(data).substring(0, 200)}`);
    }

    console.log(`[${label}] 提取的内容长度:`, aiContent.length, '前100字符:', aiContent.substring(0, 100));
    return aiContent;
};

export const parseAnalysisJson = ({
    aiContent,
    fallbackFactory = null,
    label,
    successMessage,
}) => {
    let jsonString = stripMarkdownJsonFence(aiContent);

    try {
        const result = JSON.parse(jsonString);
        if (successMessage) console.log(successMessage(result));
        return result;
    } catch (error) {
        console.error(`[${label}] 解析 JSON 失败:`, error, '内容前500字符:', jsonString.substring(0, 500));
    }

    try {
        jsonString = repairJsonString(jsonString);
        const result = JSON.parse(jsonString);
        console.log(`[${label}] JSON 修复后解析成功`);
        return result;
    } catch (repairError) {
        console.error(`[${label}] JSON修复后仍解析失败:`, repairError, '原始内容:', jsonString.substring(0, 500));
        if (fallbackFactory) {
            const result = fallbackFactory(jsonString);
            console.warn(`[${label}] 使用默认结构，原始内容:`, jsonString.substring(0, 200));
            return result;
        }
        throw new Error(`模型返回的不是有效的 JSON 格式。原始内容: ${jsonString.substring(0, 200)}`);
    }
};
