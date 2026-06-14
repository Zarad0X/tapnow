import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outFile = path.join(__dirname, 'tapnow-demo-project.json');

const svgDataUrl = (title, subtitle, colors) => {
    const [bg, accent, ink] = colors;
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${bg}"/>
      <stop offset="1" stop-color="${accent}"/>
    </linearGradient>
    <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
      <path d="M 80 0 L 0 0 0 80" fill="none" stroke="${ink}" stroke-opacity="0.16" stroke-width="2"/>
    </pattern>
  </defs>
  <rect width="1280" height="720" fill="url(#g)"/>
  <rect width="1280" height="720" fill="url(#grid)"/>
  <circle cx="1010" cy="190" r="118" fill="${ink}" fill-opacity="0.13"/>
  <circle cx="230" cy="560" r="160" fill="${ink}" fill-opacity="0.11"/>
  <rect x="112" y="96" width="1056" height="528" rx="36" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.34)" stroke-width="2"/>
  <text x="150" y="250" font-family="Inter, Arial, sans-serif" font-size="72" font-weight="800" fill="white">${title}</text>
  <text x="154" y="330" font-family="Inter, Arial, sans-serif" font-size="32" font-weight="500" fill="white" opacity="0.86">${subtitle}</text>
  <rect x="154" y="390" width="410" height="16" rx="8" fill="white" opacity="0.68"/>
  <rect x="154" y="430" width="720" height="12" rx="6" fill="white" opacity="0.42"/>
  <rect x="154" y="462" width="610" height="12" rx="6" fill="white" opacity="0.32"/>
</svg>`.trim();
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const heroImage = svgDataUrl('Neon Market Chase', 'AI generated key visual / 预置演示素材', ['#111827', '#0f766e', '#fde68a']);
const characterImage = svgDataUrl('A Qing', 'Character reference sheet', ['#312e81', '#be123c', '#bfdbfe']);
const sceneImage = svgDataUrl('Rain Street', 'Scene concept frame', ['#0f172a', '#1d4ed8', '#a7f3d0']);
const frameA = svgDataUrl('00:01', 'Opening frame', ['#172554', '#0891b2', '#f8fafc']);
const frameB = svgDataUrl('00:03', 'Action frame', ['#3b0764', '#db2777', '#fef3c7']);
const frameC = svgDataUrl('00:05', 'Final frame', ['#052e16', '#65a30d', '#fefce8']);
const videoUrl = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

const nodes = [
    {
        id: 'demo-note',
        type: 'text-node',
        x: -860,
        y: -560,
        width: 360,
        height: 220,
        settings: {
            text: '演示目标：从故事文本和视频素材出发，经过角色/场景提取、视频拆解、分镜表、AI 绘图/视频节点，最后进入预览和本地保存。现场不依赖真实生成排队。'
        }
    },
    {
        id: 'demo-novel',
        type: 'novel-input',
        x: -860,
        y: -270,
        width: 400,
        height: 500,
        settings: {
            content: '雨夜的未来集市里，年轻飞行员阿青追逐一枚会发光的记忆芯片。她穿过霓虹招牌和蒸汽摊位，最终在无人机群升空前抓住芯片，发现里面记录的是失踪城市的坐标。'
        }
    },
    {
        id: 'demo-extract',
        type: 'extract-characters-scenes',
        x: -350,
        y: -270,
        width: 420,
        height: 500,
        settings: {
            model: 'gemini-3-pro',
            lastAnalyzed: 'demo-precomputed',
            analysisResults: {
                characters: [
                    {
                        name: '阿青',
                        age: '20',
                        gender: 'female',
                        role: '飞行员 / 主角',
                        description: '银色短发，轻便飞行夹克，随身携带发光导航腕表，行动迅捷。'
                    }
                ],
                scenes: [
                    {
                        name: '雨夜未来集市',
                        description: '潮湿街道、霓虹招牌、蒸汽摊位、无人机群从高楼间掠过。'
                    }
                ]
            }
        }
    },
    {
        id: 'demo-character-desc',
        type: 'character-description',
        x: 190,
        y: -500,
        width: 400,
        height: 400,
        settings: {
            characterId: 'qing',
            characterName: '阿青',
            role: '飞行员 / 主角',
            description: '银色短发，轻便飞行夹克，蓝色导航腕表，坚定但警觉。',
            prompt: 'Anime cinematic character sheet of A Qing, silver short hair, flight jacket, blue navigation wristband, white background, clean full body reference.',
            mode: 'image',
            imageModel: 'nano-banana',
            imageRatio: '16:9',
            imageResolution: '2K',
            referenceImages: [characterImage]
        }
    },
    {
        id: 'demo-scene-desc',
        type: 'scene-description',
        x: 190,
        y: -20,
        width: 400,
        height: 400,
        settings: {
            sceneId: 'rain-market',
            sceneName: '雨夜未来集市',
            description: '雨水反射霓虹灯，街边摊位冒出白色蒸汽，空中有无人机群。',
            prompt: 'Cinematic rainy cyberpunk street market, neon reflections, food stalls, steam, drones between tall buildings, rich blue and magenta lighting.',
            mode: 'image',
            imageModel: 'nano-banana',
            imageRatio: '16:9',
            imageResolution: '2K',
            referenceImages: [sceneImage]
        }
    },
    {
        id: 'demo-video',
        type: 'video-input',
        x: -860,
        y: 360,
        width: 460,
        height: 520,
        content: videoUrl,
        videoFileName: 'demo-market-reference.mp4',
        videoMeta: { duration: 6, w: 1280, h: 720 },
        frames: [
            { url: frameA, time: 1 },
            { url: frameB, time: 3 },
            { url: frameC, time: 5 }
        ],
        selectedKeyframes: [
            { url: frameA, time: 1 },
            { url: frameB, time: 3 },
            { url: frameC, time: 5 }
        ]
    },
    {
        id: 'demo-analyze',
        type: 'video-analyze',
        x: -300,
        y: 390,
        width: 440,
        height: 520,
        settings: {
            model: 'gemini-3-pro',
            segmentDuration: 3,
            analysisMode: 'manual',
            voiceoverResults: [],
            analysisResults: []
        },
        analysisResults: [
            {
                video_id: 'demo-market-reference.mp4',
                scene_index: 1,
                time_range: '0.0s-3.0s',
                keyframes: [
                    {
                        type: 'current',
                        time: 1,
                        description: '低机位掠过潮湿街道，霓虹灯在地面积水中反射，主角进入画面。',
                        mj_prompt: 'Low angle cinematic shot of a rainy cyberpunk market street, neon reflections on wet ground, young pilot entering frame, dynamic composition, high detail',
                        jimeng_prompt: '（低机位推进）雨夜未来集市，湿润街道反射霓虹灯，年轻飞行员进入画面，电影感，高细节'
                    }
                ],
                global_tags: {
                    style: ['赛博朋克', '电影感'],
                    camera: ['低机位', '推进'],
                    color: ['蓝紫霓虹', '雨夜反光']
                }
            },
            {
                video_id: 'demo-market-reference.mp4',
                scene_index: 2,
                time_range: '3.0s-6.0s',
                keyframes: [
                    {
                        type: 'current',
                        time: 4.5,
                        description: '镜头快速跟拍主角穿过摊位，无人机从上方掠过，记忆芯片发光。',
                        mj_prompt: 'Fast tracking shot, young pilot running through market stalls, glowing memory chip, drones overhead, rain particles, cinematic motion blur',
                        jimeng_prompt: '（快速跟拍）年轻飞行员穿过未来集市摊位，手中记忆芯片发光，无人机从上方掠过，雨滴和运动模糊'
                    }
                ],
                global_tags: {
                    style: ['动作追逐', '未来城市'],
                    camera: ['跟拍', '快速运动'],
                    color: ['青蓝', '品红']
                }
            }
        ]
    },
    {
        id: 'demo-storyboard',
        type: 'storyboard-node',
        x: 250,
        y: 430,
        width: 660,
        height: 520,
        settings: {
            projectTitle: '雨夜未来集市 - 3 镜头演示分镜',
            shots: [
                {
                    id: 'shot-1',
                    scene_index: 1,
                    time_range: '0s-2s',
                    image_url: frameA,
                    description: '建立场景：雨夜未来集市，霓虹倒影和蒸汽。',
                    prompt: 'Rainy cyberpunk market establishing shot, wet ground neon reflection, steam stalls',
                    camera: 'low angle push in',
                    tags: ['赛博朋克', '雨夜', '霓虹'],
                    status: 'completed',
                    model: 'sora-2',
                    ratio: '16:9',
                    duration: '5s',
                    videoUrl
                },
                {
                    id: 'shot-2',
                    scene_index: 2,
                    time_range: '2s-4s',
                    image_url: frameB,
                    description: '动作镜头：阿青穿过摊位追逐发光芯片。',
                    prompt: 'Young pilot running through neon market stalls, glowing memory chip, cinematic tracking shot',
                    camera: 'fast tracking shot',
                    tags: ['动作', '跟拍', '芯片发光'],
                    status: 'draft',
                    model: 'sora-2',
                    ratio: '16:9',
                    duration: '5s'
                },
                {
                    id: 'shot-3',
                    scene_index: 3,
                    time_range: '4s-6s',
                    image_url: frameC,
                    description: '收束镜头：无人机群升空，主角抬头看见城市坐标。',
                    prompt: 'Drone swarm rising above neon city, young pilot looking at holographic coordinates',
                    camera: 'tilt up',
                    tags: ['无人机', '坐标', '悬念'],
                    status: 'draft',
                    model: 'google-veo3.1',
                    ratio: '16:9',
                    duration: '8s'
                }
            ]
        }
    },
    {
        id: 'demo-gen-image',
        type: 'gen-image',
        x: 760,
        y: -520,
        width: 380,
        height: 360,
        content: heroImage,
        settings: {
            model: 'nano-banana',
            ratio: '16:9',
            resolution: '2K',
            prompt: 'Cinematic key visual of A Qing in a rainy neon market, glowing memory chip, cyberpunk action scene.'
        }
    },
    {
        id: 'demo-gen-video',
        type: 'gen-video',
        x: 760,
        y: -80,
        width: 360,
        height: 440,
        content: videoUrl,
        settings: {
            model: 'sora-2',
            duration: '5s',
            ratio: '16:9',
            videoPrompt: 'A fast cinematic chase through a rainy cyberpunk market, neon reflections, drones overhead, glowing chip in hand.'
        }
    },
    {
        id: 'demo-preview',
        type: 'preview',
        x: 1240,
        y: -320,
        width: 380,
        height: 300,
        content: heroImage,
        previewType: 'image',
        previewMjImages: [heroImage, characterImage, sceneImage],
        selectedPreviewImage: heroImage
    },
    {
        id: 'demo-local-save',
        type: 'local-save',
        x: 1260,
        y: 80,
        width: 340,
        height: 390,
        settings: {
            serverUrl: 'http://127.0.0.1:9527',
            savePath: '~/Downloads/tapnow-demo',
            subfolder: 'software-engineering-demo',
            autoSave: false,
            serverStatus: 'unknown',
            lastSaved: null,
            savedFiles: []
        }
    }
];

const connections = [
    ['demo-novel', 'demo-extract'],
    ['demo-extract', 'demo-character-desc'],
    ['demo-extract', 'demo-scene-desc'],
    ['demo-character-desc', 'demo-gen-image'],
    ['demo-scene-desc', 'demo-gen-image', 'sref'],
    ['demo-video', 'demo-analyze'],
    ['demo-analyze', 'demo-storyboard'],
    ['demo-gen-image', 'demo-preview'],
    ['demo-gen-video', 'demo-preview'],
    ['demo-preview', 'demo-local-save']
].map(([from, to, inputType], index) => ({
    id: `demo-conn-${index + 1}`,
    from,
    to,
    ...(inputType ? { inputType } : {})
}));

const history = [
    {
        id: 'hist-keyvisual',
        type: 'image',
        prompt: 'Cinematic key visual of A Qing in a rainy neon market',
        url: heroImage,
        status: 'completed',
        progress: 100,
        modelName: 'Nano Banana',
        time: '09:20',
        sourceNodeId: 'demo-gen-image',
        width: 1280,
        height: 720,
        resultUrls: [heroImage]
    },
    {
        id: 'hist-character',
        type: 'image',
        prompt: 'A Qing character reference sheet',
        url: characterImage,
        status: 'completed',
        progress: 100,
        modelName: 'GPT Image',
        time: '09:18',
        width: 1280,
        height: 720
    },
    {
        id: 'hist-scene',
        type: 'image',
        prompt: 'Rainy cyberpunk street market scene concept',
        url: sceneImage,
        status: 'completed',
        progress: 100,
        modelName: 'Midjourney',
        time: '09:16',
        width: 1280,
        height: 720,
        mjImages: [sceneImage, frameA, frameB, frameC],
        selectedMjImageIndex: 0
    },
    {
        id: 'hist-video',
        type: 'video',
        prompt: 'Fast chase through a rainy cyberpunk market',
        url: videoUrl,
        status: 'completed',
        progress: 100,
        modelName: 'Sora 2',
        time: '09:22',
        sourceNodeId: 'demo-gen-video',
        width: 1280,
        height: 720,
        durationMs: 42000
    }
];

const chatSessions = [
    {
        id: 'demo-chat',
        title: 'Demo pitch',
        messages: [
            {
                id: 'msg-1',
                role: 'user',
                content: '请把这个故事拆成一个 3 镜头演示分镜，并说明每个节点在工作流里的作用。',
                timestamp: Date.now() - 60000,
                files: []
            },
            {
                id: 'msg-2',
                role: 'assistant',
                content: '可以。建议演示顺序：故事输入 -> 角色/场景提取 -> 视频拆解 -> 分镜表 -> 图像/视频生成 -> 预览与本地保存。现场生成只演示轻量模型，长视频结果使用预置历史记录。',
                timestamp: Date.now() - 30000,
                files: []
            }
        ]
    }
];

const characterLibrary = [
    {
        username: 'aqing_demo',
        name: '阿青',
        display_name: '阿青 Demo Character',
        avatar: characterImage,
        profile_picture_url: characterImage,
        source: 'demo',
        created_at: new Date().toISOString(),
        description: '银色短发的年轻飞行员，可在 Sora prompt 中用 @aqing_demo 引用。'
    }
];

const project = {
    version: '2.5.7',
    projectName: 'Tapnow 软件工程演示 Demo',
    nodes,
    connections,
    history,
    chatSessions,
    characterLibrary,
    timestamp: new Date().toISOString(),
    view: { x: 920, y: 560, zoom: 0.62 }
};

const json = JSON.stringify(project, null, 2).replace(
    /\n  "view": \{\n    "x": ([^,\n]+),\n    "y": ([^,\n]+),\n    "zoom": ([^\n]+)\n  \}/,
    '\n  "view": { "x": $1, "y": $2, "zoom": $3 }'
);

fs.writeFileSync(outFile, `${json}\n`);
console.log(`Wrote ${path.relative(process.cwd(), outFile)}`);
