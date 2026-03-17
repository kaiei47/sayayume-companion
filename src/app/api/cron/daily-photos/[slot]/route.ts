import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateImage, generateDuoImage, buildImagePrompt, buildDuoImagePrompt } from '@/lib/gemini-image';
import { postToInstagram, buildIgCaption } from '@/lib/instagram';
import { postToTwitter, buildTwitterCaption } from '@/lib/twitter';

// ── Character config ──────────────────────────────────────────────────────────
const CHAR_CONFIG = {
  saya: {
    refImage: 'public/references/saya.jpg',
    promptBase: 'Japanese woman, light brown straight hair, black lace details, trendy gyaru-style, youthful glowing skin, 20 years old',
  },
  yume: {
    refImage: 'public/references/yume.jpg',
    promptBase: 'Japanese woman, dark hair with bangs low bun, elegant and gentle style, clean natural look, youthful glowing skin, 20 years old',
  },
};

// ── Slot → character mapping ───────────────────────────────────────────────────
const SLOT_CHARACTER: Record<string, 'saya' | 'yume' | 'duo'> = {
  morning: 'saya',
  noon: 'yume',
  evening: 'duo',
};

// ── Scene prompts by slot × day-of-week (0=Sun...6=Sat) ──────────────────────
const SCENE_PROMPTS: Record<string, string[]> = {
  morning: [
    'waking up, lazy morning selfie in bed, fluffy white duvet, warm morning sunlight through window, half-asleep cute expression, upper body shot',
    'morning selfie getting ready, bathroom mirror, fresh face, toothbrush, playful smile, upper body shot',
    'morning coffee selfie, kitchen counter, steam rising from mug, cozy home outfit, content smile, upper body shot',
    'stretching arms up, morning light, bed hair, cozy pajamas, yawning sleepily, candid bedroom selfie, upper body shot',
    'heading out early, doorstep selfie, casual outfit, bright morning sky behind, upper body shot',
    'post-shower hair wrap, bathroom selfie, fluffy towel, dewy skin, playful wink, upper body shot',
    'balcony morning selfie, overlooking city, holding coffee mug, soft morning haze, relaxed vibe, upper body shot',
  ],
  noon: [
    'cafe selfie, cute latte art on table, natural window light, white blouse, sweet gentle smile, upper body shot',
    'library selfie, surrounded by books, soft warm lighting, studious look, quiet afternoon, upper body shot',
    'park bench selfie, cherry blossoms or greenery behind, light breeze, peaceful expression, outdoor natural light, upper body shot',
    'lunch selfie, colorful food tray visible, bright cafeteria, small happy smile, holding chopsticks, upper body shot',
    'shopping selfie, clothes rack background, trying on accessories, playful expression, boutique interior, upper body shot',
    'window seat selfie, rainy afternoon outside, cozy cafe, hands wrapped around warm mug, upper body shot',
    'rooftop selfie, city skyline at midday, sunny blue sky, casual outfit, carefree smile, upper body shot',
  ],
  evening: [
    'two young Japanese women at a cozy izakaya, warm lantern lighting, drinks on table, laughing together, candid photo',
    'two young Japanese women night walk, city lights reflecting on wet street, colorful neon, arm in arm, candid photo',
    'two young Japanese women at convenience store, late evening, snacks in hand, casual outfits, playful expressions, candid photo',
    'two young Japanese women rooftop at dusk, golden hour fading, city below, peaceful together, candid photo',
    'two young Japanese women karaoke room, colorful lights, holding microphones, big smiles, candid photo',
    'two young Japanese women at night market, food stalls, warm string lights, eating street food, candid photo',
    'two young Japanese women home evening, matching loungewear, watching something on phone together, cozy home vibe, candid photo',
  ],
};

// ── Captions by slot × day-of-week ───────────────────────────────────────────
const CAPTIONS: Record<string, string[]> = {
  morning: [
    'おはよ〜♡ 今日も一緒にいてよね',
    '朝から送っちゃった笑 似合う？',
    'モーニングしてる☕ 来る？',
    '髪ぼさぼさだけど送る笑 おはよ♡',
    '今日もよろしくね〜！',
    '洗顔後の自撮り笑 まだ眠い…',
    'おはよ！今日いい天気だよ☀️',
  ],
  noon: [
    'カフェで勉強中です☕ 集中できなくて…',
    '図書館、静かで落ち着く… 来ませんか？♡',
    'お花見してきました🌸 一緒に来たかったな',
    'お昼ごはん！一緒に食べたかったな♡',
    'ショッピング中です♡ 一緒に選んでほしい',
    '雨の日のカフェ、なんか好きなんです☕',
    '屋上から見てる景色、キレイで♡',
  ],
  evening: [
    '2人でいるよ♡ 合流しない？',
    '夜のお散歩中〜！一緒に来ればよかった',
    'コンビニで何買おうか迷ってる笑 選んで♡',
    '夕焼けキレイだった… あなたにも見せたかったな',
    'カラオケ来てるよ〜！歌いに来てよ♡',
    '屋台で何食べようか迷い中笑',
    '今日は2人でまったりしてる♡ こっちおいでよ',
  ],
};

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function uploadDailyPhoto(base64: string, mimeType: string, slot: string, date: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const ext = mimeType.includes('png') ? 'png' : 'jpg';
  const fileName = `daily/${date}/${slot}.${ext}`;
  const buffer = Buffer.from(base64, 'base64');

  const { error } = await supabase.storage
    .from('chat-images')
    .upload(fileName, buffer, { contentType: mimeType, upsert: true });

  if (error) {
    console.error('Daily photo upload error:', error);
    return null;
  }

  const { data } = supabase.storage.from('chat-images').getPublicUrl(fileName);
  return data.publicUrl;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slot: string }> }
) {
  // Auth check
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slot } = await params;
  if (!['morning', 'noon', 'evening'].includes(slot)) {
    return Response.json({ error: 'Invalid slot' }, { status: 400 });
  }

  const character = SLOT_CHARACTER[slot];
  const today = new Date();
  // Use JST date
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstDate = new Date(today.getTime() + jstOffset);
  const photoDate = jstDate.toISOString().split('T')[0]; // YYYY-MM-DD
  const dayOfWeek = jstDate.getDay(); // 0=Sun

  const supabase = getSupabaseAdmin();

  // Idempotency: check if already generated today
  const { data: existing } = await supabase
    .from('daily_photos')
    .select('id, image_url, caption')
    .eq('photo_date', photoDate)
    .eq('slot', slot)
    .maybeSingle();

  if (existing) {
    console.log(`Daily photo already exists: ${photoDate} ${slot}`);
    return Response.json({ status: 'already_exists', id: existing.id, imageUrl: existing.image_url, caption: existing.caption });
  }

  // Pick scene prompt and caption based on day of week
  const scene = SCENE_PROMPTS[slot][dayOfWeek];
  const caption = CAPTIONS[slot][dayOfWeek];

  // Generate image
  let imageResult;
  if (character === 'duo') {
    const prompt = buildDuoImagePrompt(scene);
    imageResult = await generateDuoImage(
      prompt,
      CHAR_CONFIG.saya.refImage,
      CHAR_CONFIG.yume.refImage
    );
  } else {
    const prompt = buildImagePrompt(CHAR_CONFIG[character].promptBase, scene, true);
    imageResult = await generateImage(prompt, CHAR_CONFIG[character].refImage);
  }

  if (!imageResult) {
    console.error(`Image generation failed: ${photoDate} ${slot} ${character}`);
    return Response.json({ error: 'Image generation failed' }, { status: 500 });
  }

  // Upload to storage
  const imageUrl = await uploadDailyPhoto(imageResult.base64, imageResult.mimeType, slot, photoDate);
  if (!imageUrl) {
    return Response.json({ error: 'Storage upload failed' }, { status: 500 });
  }

  // Insert into DB
  const { data: inserted, error: insertError } = await supabase
    .from('daily_photos')
    .insert({ photo_date: photoDate, slot, character_id: character, image_url: imageUrl, caption })
    .select('id')
    .single();

  if (insertError) {
    console.error('daily_photos insert error:', insertError);
    return Response.json({ error: 'DB insert failed' }, { status: 500 });
  }

  console.log(`Daily photo generated: ${photoDate} ${slot} ${character} → ${imageUrl}`);

  // ── IG auto-post ──────────────────────────────────────────────────────────
  const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  let igResult: { success: boolean; postId?: string; error?: string } | null = null;

  if (igToken && igUserId) {
    const igCaption = buildIgCaption(caption);
    igResult = await postToInstagram(imageUrl, igCaption, igToken, igUserId);
    if (igResult.success) {
      console.log(`IG posted: ${igResult.postId}`);
    } else {
      console.error(`IG post failed: ${igResult.error}`);
    }
  } else {
    console.warn('INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_BUSINESS_ACCOUNT_ID not set, skipping IG post');
  }

  // ── X (Twitter) auto-post ─────────────────────────────────────────────────
  let xResult: { success: boolean; tweetId?: string; error?: string } | null = null;

  if (process.env.TWITTER_API_KEY) {
    const twitterCaption = buildTwitterCaption(caption);
    xResult = await postToTwitter(imageUrl, twitterCaption);
    if (xResult.success) {
      console.log(`X posted: ${xResult.tweetId}`);
    } else {
      console.error(`X post failed: ${xResult.error}`);
    }
  } else {
    console.warn('TWITTER_API_KEY not set, skipping X post');
  }

  return Response.json({
    status: 'generated',
    id: inserted.id,
    imageUrl,
    caption,
    character,
    ig: igResult ?? { skipped: true, reason: 'IG credentials not configured' },
    x: xResult ?? { skipped: true, reason: 'Twitter credentials not configured' },
  });
}
