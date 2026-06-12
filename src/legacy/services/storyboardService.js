const CAMERA_TAG_KEYWORDS = ['推', '拉', '摇', '移', '跟', '升', '降', 'Dolly', 'Pan', 'Tilt', 'Zoom'];
const CAMERA_FIELD_KEYWORDS = ['推', '拉', '摇', '移', '跟', 'Dolly', 'Pan', 'Tilt', 'Zoom'];

const inferCameraTags = (description) => {
    if (!description) return [];
    return CAMERA_TAG_KEYWORDS.filter((keyword) => description.includes(keyword));
};

const findCameraTag = (tags) => {
    return tags.find((tag) => CAMERA_FIELD_KEYWORDS.some((keyword) => tag.includes(keyword))) || '';
};

export const getDefaultDurationForModel = (modelId) => {
    if (!modelId) return '5s';
    if (modelId === 'sora-2-pro') return '15s';
    if (modelId.includes('sora-2') || modelId === 'sora-2') return '15s';
    if (modelId.includes('veo') || modelId === 'google-veo3') return '8s';
    if (modelId.includes('grok') || modelId === 'grok-3') return '8s';
    return '5s';
};

export const getDefaultDurationsForModel = (modelId) => {
    if (!modelId) return ['5s', '10s', '8s'];
    if (modelId === 'sora-2-pro') return ['15s', '25s'];
    if (modelId.includes('sora-2') || modelId === 'sora-2') return ['5s', '10s', '15s'];
    if (modelId.includes('veo') || modelId === 'google-veo3') return ['8s'];
    if (modelId.includes('grok') || modelId === 'grok-3') return ['8s', '5s'];
    return ['5s', '10s', '8s'];
};

export const getStylePrefix = (style) => {
    switch (style) {
        case '2d-anime':
            return '2D动漫风格';
        case '3d-anime':
            return '3D动漫风格';
        case 'realistic':
            return '写实风格';
        case 'selfie':
            return '自拍风格';
        case 'news':
            return '新闻风格';
        case 'manga':
            return '漫画风格';
        default:
            return '动漫风格';
    }
};

export const filterCharacterPromptLocal = (prompt) => {
    if (!prompt) return '';

    let filtered = prompt.replace(/["'""「」](.*?)[^,，。；！？、\s]["'""「」]/g, '');
    filtered = filtered.replace(/利用《.*?》游戏.*?/g, '');
    filtered = filtered.replace(/内心(.*?)(?=[，。；！？、\s])/g, '');
    filtered = filtered.replace(/(推动|拉动|操作|转身|站立|走动|说|介绍|正在|负责|穿着|站在|面对|做)(.*?)(?=[，。；！？、\s])/g, '');
    filtered = filtered.replace(/(天命杠杆|战舰|游戏|操作|控制|推进|推动|极低速度|以极低速度|最终|最后|现在|正在|目前|此前|起先|起初)/g, '');
    filtered = filtered.replace(/，然后缓慢转一圈360度全方位展示身体/g, '');
    filtered = filtered.replace(/(背景|场景|环境|建筑|地点|位置|周围|附近|后面|前面|旁边)(.*?)(?=[，。；！？、\s])/g, '');

    if (!filtered.includes('白色背景') && !filtered.includes('纯白色背景')) {
        filtered = filtered.replace(/(动漫风格，全身视角，)/, '$1站在纯白色背景前，');
        if (!filtered.includes('纯白色背景')) {
            filtered = `动漫风格，全身视角，站在纯白色背景前，${filtered}`;
        }
    }

    filtered = filtered.replace(/\s{2,}/g, ' ').replace(/[，。；！？、]{2,}/g, '，').trim();

    if (filtered.length < 50) {
        filtered = '动漫风格，全身视角，站在纯白色背景前，角色穿着简洁的服装，表情平静，姿态自然';
    }

    return filtered;
};

export const filterScenePromptLocal = (prompt) => {
    if (!prompt) return '';

    let filtered = prompt.replace(/(人物|角色|角色名|人名|站在|面向|说|介绍|正在|负责|穿着|动作|表情|姿态|外貌|服装)(.*?)(?=[，。；！？、\s])/g, '');
    filtered = filtered.replace(/["'""「」](.*?)[^,，。；！？、\s]["'""「」]/g, '');
    filtered = filtered.replace(/(名叫|角色|人物|角色名|人名|站在|面向|说|介绍|正在|负责|穿着|动作|表情|姿态|外貌|服装|角色特征)/g, '');
    filtered = filtered.replace(/\s{2,}/g, ' ').replace(/[，。；！？、]{2,}/g, '，').trim();

    if (filtered.length < 30) {
        filtered = '场景描述：环境、建筑、背景';
    }

    return filtered;
};

export const generateCharacterPrompt = (character, mode = 'video', style = 'none') => {
    const age = character.age || '25';
    const gender = character.gender || '年轻男人';
    const stylePrefix = getStylePrefix(style);
    const basePrompt = `${stylePrefix}，全身视角，名叫${character.name}的${age}岁左右${gender}站在白色背景前，${character.description || '皮肤因长期处于室内而显得苍白，凌乱的黑色碎发遮住额头，眼神疲惫却透着一股锐利的机智，深灰色瞳孔，上身穿着一件原本华丽但此刻解开扣子、袖口卷起的白色金边军礼服外套，内搭一件普通的深灰色吸汗T恤，下身穿着沾染了少许机油污渍的白色笔挺军裤，脚穿厚重的黑色防滑军靴，身材精瘦结实，气质颓废中带着不羁'}，正在用中文普通话面向镜头做自我介绍，说着：我是${character.name}，${character.role || '这艘船的首席手动推进官，也就是个推杆子的苦力'}`;

    if (mode === 'video') {
        return `${basePrompt}，然后缓慢转一圈360度全方位展示身体`;
    }

    return basePrompt;
};

export const generateScenePrompt = (scene) => {
    return scene.description || '极度奢华的星际战舰舰桥内部，空间广阔如同一座宫殿，四壁装饰着繁复的黄金浮雕与象牙立柱，地面铺着深红色的天鹅绒地毯，巨大的落地舷窗外是深邃星空，中央悬挂着水晶吊灯，操作台被伪装成古典家具的样子，整体色调金碧辉煌，氛围庄严却透着一种不切实际的荒谬感';
};

export const createEmptyStoryboardShot = ({ shotCount = 0, defaultModel = '' } = {}) => ({
    id: `shot-${Date.now()}`,
    scene_index: shotCount + 1,
    time_range: '',
    image_url: '',
    description: '',
    prompt: '',
    camera: '',
    tags: [],
    status: 'draft',
    model: defaultModel,
    ratio: '16:9',
    duration: getDefaultDurationForModel(defaultModel),
});

export const renumberStoryboardShots = (shots) => {
    return shots.map((shot, index) => ({
        ...shot,
        scene_index: index + 1,
    }));
};

export const updateStoryboardShot = (shots, shotId, updates) => {
    return shots.map((shot) => (shot.id === shotId ? { ...shot, ...updates } : shot));
};

export const createShotsFromAnalysisResults = (
    analysisResults,
    {
        includeGlobalCamera = false,
        idFactory = (index) => `shot-${Date.now()}-${index}`,
    } = {},
) => {
    return analysisResults.map((result, index) => {
        const keyframe = result.keyframes?.find((item) => item.type === 'current') || result.keyframes?.[0];
        const mjPrompt = keyframe?.mj_prompt || '';
        const jimengPrompt = keyframe?.jimeng_prompt || '';
        const description = keyframe?.description || result.keyframes?.[0]?.description || '';
        const tags = [];

        if (result.global_tags?.style?.[0]) tags.push(result.global_tags.style[0]);
        if (includeGlobalCamera && result.global_tags?.camera?.[0]) tags.push(result.global_tags.camera[0]);
        tags.push(...inferCameraTags(description));

        return {
            id: idFactory(index),
            scene_index: index + 1,
            time_range: result.time_range || '',
            image_url: '',
            description,
            prompt: mjPrompt || jimengPrompt,
            camera: (includeGlobalCamera && result.global_tags?.camera?.[0]) || findCameraTag(tags),
            tags,
            status: 'draft',
        };
    });
};
