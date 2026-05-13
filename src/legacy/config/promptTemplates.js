export const PROMPT_LIBRARY_KEY = 'tapnow_prompt_library';

export const GRID_PROMPT_TEXT = `基于我上传的这张参考图，生成一张九宫格（3x3 grid）布局的分镜脚本。请严格保持角色与参考图一致（Keep character strictly consistent），但在9个格子中展示该角色不同的动作、表情和拍摄角度（如正面、侧面、背面、特写等）。要求风格高度统一，形成一张完整的角色动态表（Character Sheet）。`;

export const UPSCALE_PROMPT_TEXT = `请对参考图片进行无损高清放大（Upscale）。请严格保持原图的构图、色彩、光影和所有细节元素不变，不要进行任何创造性的重绘或添加新内容。仅专注于提升分辨率、锐化边缘（Sharpening）和去除噪点（Denoising），实现像素级的高清修复。Best quality, 8k, masterpiece, highres, ultra detailed, sharp focus, image restoration, upscale, faithful to original.`;

export const STORYBOARD_PROMPT_TEXT = `you are a veteran Hollywood storyboard artist with years of experience. You have the ability to accurately analyze character features and scene characteristics based on images. Provide me with the most suitable camera angles and storyboards. Strictly base this on the uploaded character and scene images, while maintaining a consistent visual style.

MANDATORY LAYOUT: Create a precise 3x3 GRID containing exactly 9 distinct panels.

- The output image MUST be a single image divided into a 3 (rows) by 3 (columns) matrix.
- There must be EXACTLY 3 horizontal rows and 3 vertical columns.
- Each panel must be completely separated by a thin, distinct, solid black line.
- DO NOT create a collage. DO NOT overlap images. DO NOT create random sizes.
- The grid structure must be perfectly aligned for slicing.

Subject Content: "[在此处填充你对故事的描述]"

Styling Instructions:
- Each panel shows the SAME subject/scene from a DIFFERENT angle (e.g., Front, Side, Back, Action, Close-up).
- Maintain perfect consistency of the character/object across all panels.
- Cinematic lighting, high fidelity, 8k resolution.

Negative Constraints:
- No text, no captions, no UI elements.
- No watermarks.
- No broken grid lines.`;

export const CHARACTER_SHEET_PROMPT_TEXT = `(strictly mimic source image art style:1.5), (same visual style:1.4),
score_9, score_8_up, masterpiece, best quality, (character sheet:1.4), (reference sheet:1.3), (consistent art style:1.3), matching visual style,

[Structure & General Annotations]:
multiple views, full body central figure, clean background,
(heavy annotation:1.4), (text labels with arrows:1.3), handwriting, data readout,

[SPECIAL CHARACTER DESCRIPTION AREA]:
(prominent character profile text box:1.6), (dedicated biography section:1.5), large descriptive text block,
[在此处填写特殊角色说明，例如：姓名、种族、背景故事等],

[Clothing Breakdown]:
(clothing breakdown:1.5), (outfit decomposition:1.4), garment analysis, (floating apparel:1.3),
displaying outerwear, displaying upper body garment, displaying lower body garment,

[Footwear Focus]:
(detailed footwear display:1.5), (floating shoes:1.4), shoe design breakdown, focus on shoes,

[Inventory & Details]:
(inventory knolling:1.2), open container, personal accessories, organized items display, expression panels`;

export const MOOD_BOARD_PROMPT_TEXT = `# Directive: Create a "Rich Narrative Mood Board" (8-Grid Layout)

## 1. PROJECT INPUT

**A. [Story & Concept / 故事与核心想法]**
> [跟据自身内容书写]

**B. [Key Symbols / 核心意象 (Optional)]**
> [深度理解参考图，自行创作]

**C. [Color Preferences / 色彩倾向 (Optional)]**
> [深度理解参考图，自行创作]

**D. [Reference Images / 参考图]**
> (See attached images / 请读取我上传的图片)

---

## 2. Role Definition
Act as a **Senior Art Director**. Synthesize the Input above into a single, cohesive, high-density **Visual Mood Board** using a complex **8-Panel Asymmetrical Grid Layout**.

## 3. Layout Mapping (Strict Adherence)
You must design a visual composition that tells the story through **8 distinct panels** within one image. **Do not** generate random grids. Map the content exactly as follows:

* **Panel 1 (The World):** A wide, cinematic establishing shot of the environment (based on Input A).
* **Panel 2 (The Protagonist):** A portrait close-up (based on reference images), focusing on micro-expressions.
* **Panel 3 (The Metaphor):** An **abstract symbolic object** representing the core theme (based on Input B).
* **Panel 4 (The Palette):** A graphical **Color Palette Strip** showcasing 5 specific colors extracted from the scene.
* **Panel 5 (The Texture):** Extreme macro close-up of a material surface (e.g., rust, skin, fabric) to add tactile richness.
* **Panel 6 (The Motion):** A motion-blurred or long-exposure shot representing time/chaos.
* **Panel 7 (The Detail):** A focused shot of a specific prop or accessory relevant to the plot.
* **Panel 8 (The AI Art Interpretation - CRITICAL):** This is your **free creative space**. Generate an artistic, surreal, or abstract re-interpretation of the story's emotion. **Do not just copy the inputs.** Create a "Vibe Image" (e.g., Double Exposure, Oil Painting style, or abstract geometry) that captures the *soul* of the narrative.

## 4. Execution Requirements
* **Composition Style:** High-end Editorial / Magazine Layout. Clean, thin white borders.
* **Visual Unity:** All panels must share the same lighting conditions and color grading logic (Unified Aesthetic).
* **Task:** Provide the **Final English Image Prompt** that explicitly describes this 8-grid layout, ensuring Panel 8 stands out as an artistic variation.`;
