/**
 * Runware FLUX.1 Image Generation
 * Used as fallback when Gemini filters sexy/swimwear prompts.
 * Handles 水着・セクシー系コンテンツ（Stripe安全圏の水着止まり）
 *
 * img2img mode: pass seedImagePath to use reference image for face consistency.
 * imageDenoisingStrength 0.55-0.65 = face preserved + outfit/scene changes freely.
 */

const RUNWARE_API_KEY = process.env.RUNWARE_API_KEY!;
const RUNWARE_API_URL = 'https://api.runware.ai/v1';

// FLUX.1 Schnell — steps:30 + CFGScale:3.5 が実績ある設定（generate_nsfw.pyで確認済み）
const RUNWARE_MODEL = 'runware:101@1';

interface GenerateImageResult {
  base64: string;
  mimeType: string;
}

// NSFWキーワード（水着・セクシー止まり。Stripe安全圏）
const NSFW_KEYWORDS = [
  // 水着・ビキニ
  'bikini', 'swimsuit', 'swimwear', 'bathing suit', '水着', 'ビキニ',
  // 下着系（Stripe安全圏内）
  'lingerie', 'underwear', 'bra', 'panties', 'ランジェリー', '下着',
  // セクシー系
  'see-through', 'sheer', 'cleavage', 'bare midriff', 'crop top',
  'off-shoulder', 'low-cut', 'revealing', 'tight dress',
  'naked shoulder', 'bare shoulder', 'bare skin',
  // 日本語
  '胸', '谷間', '肌', '素肌', 'セクシー', '際どい', 'ランジェリー',
  'ノースリーブ', '水着姿', 'ビキニ姿', '半裸',
];

/**
 * プロンプトがNSFWキーワードを含むか判定
 * 2つ以上ヒット、または強いキーワード1つでtrue
 */
export function isNSFWDescription(description: string): boolean {
  const lower = description.toLowerCase();
  let score = 0;

  for (const kw of NSFW_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) {
      // bikini/swimsuit/lingerie/水着は1つでアウト（明確なNSFW）
      if (['bikini', 'swimsuit', 'swimwear', '水着', 'ビキニ', 'lingerie', 'ランジェリー'].includes(kw.toLowerCase())) {
        return true;
      }
      score++;
    }
  }

  return score >= 2;
}

/**
 * キャラクターIDに応じたRunware用プロンプトベースを返す
 */
function buildRunwarePrompt(characterId: string, description: string): { positive: string; negative: string } {
  const commonQuality = 'masterpiece, best quality, raw photo, candid photo, photorealistic, 8k uhd, soft frontal beauty lighting, no harsh shadows, youthful glowing skin';
  const commonNeg = 'bad anatomy, deformed, extra limbs, blurry, watermark, cartoon, anime, lowres, ugly, worst quality, nsfw explicit, genitals, nude fully, text';

  if (characterId === 'yume') {
    return {
      positive: `${commonQuality}, beautiful young slim Japanese woman, dark hair with bangs in a low bun, ${description}`,
      negative: commonNeg,
    };
  }
  // saya or duo default to saya
  return {
    positive: `${commonQuality}, beautiful young Japanese woman, light brown straight hair with bangs, ${description}`,
    negative: commonNeg,
  };
}

/**
 * RunwareでFLUX.1 Schnellを使って画像生成（text2img）
 * ※ FLUX.1 Schnellはimg2imgに向いていないためtext2imgのみ使用。
 *   顔の一貫性はプロンプトの特徴記述で担保する。
 */
export async function generateImageRunware(
  description: string,
  characterId: string,
): Promise<GenerateImageResult | null> {
  try {
    const { positive, negative } = buildRunwarePrompt(characterId, description);

    const taskUUID = crypto.randomUUID();
    const task = {
      taskType: 'imageInference',
      taskUUID,
      positivePrompt: positive,
      negativePrompt: negative,
      model: RUNWARE_MODEL,
      width: 832,
      height: 1216,
      steps: 30,
      CFGScale: 3.5,
      scheduler: 'FlowMatchEulerDiscreteScheduler',
      outputType: 'URL',
      outputFormat: 'JPEG',
    };

    const response = await fetch(RUNWARE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RUNWARE_API_KEY}`,
      },
      body: JSON.stringify([task]),
    });

    if (!response.ok) {
      console.error('Runware API error:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const items: Array<{ taskUUID?: string; imageURL?: string; error?: string }> = data.data ?? data;

    const item = items.find((i) => i.taskUUID === taskUUID && i.imageURL);
    if (!item?.imageURL) {
      console.error('Runware: no imageURL in response', JSON.stringify(items).slice(0, 300));
      return null;
    }

    // URLからbase64に変換
    const imgRes = await fetch(item.imageURL);
    if (!imgRes.ok) return null;
    const arrayBuffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return { base64, mimeType: 'image/jpeg' };
  } catch (error) {
    console.error('Runware image generation failed:', error);
    return null;
  }
}
