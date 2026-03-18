/**
 * Replicate Image Generation
 * さやLoRA: kaiei47/saya-lora — 顔一貫性◎ + NSFW OK
 * ゆめLoRA: kaiei47/yume-lora — 同構成
 * 実績設定: nsfw_replicate_test.py より
 */

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN!;

// LoRAバージョン（Replicateにアップ済み）
const SAYA_LORA_VERSION = '28aa2197ea0010930f969aa105461544ba75bd073c297a439f30bf7204935e03';
const YUME_LORA_VERSION = '75fe27fb243eb505c95cdf5e108e042adc5e82dfb5229c68193d53441308aeb2';

const LORA_CONFIGS: Record<string, { version: string; promptPrefix: string }> = {
  saya: {
    version: SAYA_LORA_VERSION,
    promptPrefix: 'saya, beautiful young japanese woman, light brown straight hair with bangs',
  },
  yume: {
    version: YUME_LORA_VERSION,
    promptPrefix: 'yume, beautiful young slim japanese woman, dark hair with bangs in a low bun',
  },
};

interface GenerateImageResult {
  base64: string;
  mimeType: string;
}

/**
 * キャラLoRAでフォトリアル画像生成（Replicate）
 * Prefer: wait で同期的に結果を受け取る
 * characterId: 'saya' | 'yume'
 */
export async function generateImageReplicate(
  description: string,
  characterId: string = 'saya',
): Promise<GenerateImageResult | null> {
  const config = LORA_CONFIGS[characterId] ?? LORA_CONFIGS.saya;
  try {
    const prompt =
      `${config.promptPrefix}, ` +
      `${description}, ` +
      `masterpiece, best quality, raw photo, photorealistic, 8k uhd, soft frontal beauty lighting`;

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait',  // 同期モード（最大60秒）
      },
      body: JSON.stringify({
        version: config.version,
        input: {
          prompt,
          negative_prompt: 'bad anatomy, deformed, extra limbs, blurry, watermark, cartoon, anime, lowres, ugly, worst quality, text',
          lora_scale: 0.85,
          num_inference_steps: 30,
          guidance_scale: 3.5,
          width: 832,
          height: 1216,
          disable_safety_checker: true,
          output_format: 'jpg',
        },
      }),
    });

    if (!response.ok) {
      console.error('Replicate API error:', response.status, await response.text());
      return null;
    }

    const prediction = await response.json();

    // Prefer: wait で同期完了している場合
    if (prediction.status === 'succeeded' && prediction.output?.length > 0) {
      return await fetchAsBase64(prediction.output[0], 'image/jpeg');
    }

    // タイムアウト or まだ処理中 → ポーリング
    if (prediction.status === 'processing' || prediction.status === 'starting') {
      return await pollPrediction(prediction.id);
    }

    console.error('Replicate: unexpected status', prediction.status, prediction.error);
    return null;
  } catch (error) {
    console.error('Replicate image generation failed:', error);
    return null;
  }
}

/** ポーリングで結果を待つ（最大50秒） */
async function pollPrediction(predictionId: string): Promise<GenerateImageResult | null> {
  const maxAttempts = 25; // 2秒×25 = 50秒
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 2000));

    const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { 'Authorization': `Token ${REPLICATE_API_TOKEN}` },
    });
    if (!res.ok) continue;

    const prediction = await res.json();
    if (prediction.status === 'succeeded' && prediction.output?.length > 0) {
      return await fetchAsBase64(prediction.output[0], 'image/jpeg');
    }
    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      console.error('Replicate prediction failed:', prediction.error);
      return null;
    }
  }

  console.error('Replicate: polling timeout');
  return null;
}

/** 画像URLをfetchしてbase64に変換 */
async function fetchAsBase64(url: string, mimeType: string): Promise<GenerateImageResult | null> {
  const imgRes = await fetch(url);
  if (!imgRes.ok) return null;
  const arrayBuffer = await imgRes.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return { base64, mimeType };
}
