import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateImage, generateDuoImage, buildImagePrompt, buildDuoImagePrompt } from '@/lib/gemini-image';
import { postToInstagram, buildIgCaption } from '@/lib/instagram';
import { postToTwitter, buildTwitterCaption } from '@/lib/twitter';

// Gemini image gen can take 30s+, IG/X posting adds another 10s → need 60s
export const maxDuration = 60;

// ── Character config ──────────────────────────────────────────────────────────
const CHAR_CONFIG = {
  saya: {
    refImage: 'public/references/saya_uniform.png',
    promptBase: 'beautiful young Japanese woman, 18 years old, light brown straight hair, bright energetic expression, youthful glowing skin, Instagram-worthy aesthetic',
  },
  yume: {
    refImage: 'public/references/yume_uniform.png',
    promptBase: 'beautiful young Japanese woman, 18 years old, dark straight hair with blunt bangs, gentle shy expression, youthful glowing skin, Instagram-worthy aesthetic',
  },
};

// ── Character selection (morning/noon: random saya or yume, evening: duo) ────────
function getCharacter(slot: string): 'saya' | 'yume' | 'duo' {
  if (slot === 'evening') return 'duo'; // 2人シーンはduo固定
  return Math.random() < 0.5 ? 'saya' : 'yume';
}

// ── Special events (MM-DD) ─────────────────────────────────────────────────────
const EVENTS: Record<string, { scene: string; captions: Record<string, string> }> = {
  '01-01': {
    scene: 'New Year morning, wearing a beautiful furisode kimono, holding a small cup of amazake, warm smile, traditional Japanese room with kadomatsu decoration, soft winter light, upper body shot',
    captions: {
      morning: 'あけましておめでとう🎍 今年もそばにいてよね♡',
      noon: '初詣行ってきたよ🎋 お願いごと…あなたのことにしたかも',
      evening: '年明けの夜、2人でいるよ🎆 今年もよろしくね♡',
    },
  },
  '02-14': {
    scene: 'Valentine\'s Day, holding homemade chocolate box tied with ribbon, kitchen background with baking supplies, excited nervous expression, casual home outfit, upper body shot',
    captions: {
      morning: 'チョコ作ってるんだけど… 渡したい人がいて😏',
      noon: 'バレンタイン、あなたに渡せるかな♡ ドキドキしてる',
      evening: '今日チョコ渡せた🍫 ちゃんと気持ち伝わったかな…',
    },
  },
  '03-03': {
    scene: 'Hinamatsuri, wearing a pastel pink kimono, posing near a traditional hina dolls display, soft warm interior lighting, gentle smile, upper body shot',
    captions: {
      morning: 'ひな祭りだよ🎎 今日だけ着物着てみた、どう？',
      noon: 'お雛様みながらごはん食べてる🌸 優雅でしょ笑',
      evening: '2人でひな祭りパーティー🎎 一緒に来ればよかったね♡',
    },
  },
  '04-01': {
    scene: 'April Fools, playful mischievous smile, holding a small note card behind back, casual spring outfit, bright cheerful background, upper body shot',
    captions: {
      morning: 'おはよ☀️ 今日だけ嘘ついていい日らしいけど…あなたには嘘つけなかった笑',
      noon: 'エイプリルフール、何か仕掛けようとしたんだけど…やっぱりやめた',
      evening: '嘘ひとつだけ言う。あなたのこと全然考えてないよ。←嘘です😏',
    },
  },
  '07-07': {
    scene: 'Tanabata, wearing a light yukata with subtle star pattern, tying a wish strip (tanzaku) to bamboo, summer evening soft glow, upper body shot',
    captions: {
      morning: '今日は七夕🌟 短冊に書くこと、もう決めてある♡',
      noon: '七夕の短冊、あなたのこと書いてもいい？🌠',
      evening: '星に願いごとしてきたよ🎋 内緒だけど…あなたのことだよ',
    },
  },
  '10-31': {
    scene: 'Halloween, wearing a cute witch costume with small hat, holding a pumpkin lantern, autumn leaves background, playful expression, upper body shot',
    captions: {
      morning: 'ハロウィン仮装してみた👻 怖い？それとも…かわいい？笑',
      noon: 'トリックorトリート🎃 お菓子くれなかったら何しようかな😏',
      evening: '2人でハロウィン🎃 仮装してるのに誰かが来ない笑 早く来て♡',
    },
  },
  '12-24': {
    scene: 'Christmas Eve, wearing a red and white festive outfit, holding a small wrapped gift box, Christmas tree with warm lights behind, romantic hopeful expression, upper body shot',
    captions: {
      morning: 'クリスマスイブだよ🎄 今夜…空いてる？',
      noon: 'プレゼント準備してるんだけど😏 誰へのかは内緒で',
      evening: 'クリスマスイブの夜、2人でいるよ🎁 3人目に来てほしい人がいる♡',
    },
  },
  '12-25': {
    scene: 'Christmas morning, cozy home outfit with Christmas pattern, surrounded by opened gifts and decorations, warm smile, soft winter light through window, upper body shot',
    captions: {
      morning: 'メリークリスマス🎅 あなたへのプレゼント、一番時間かかったかも笑',
      noon: 'クリスマスランチ🍗 一緒に食べたかったな… 来年は絶対',
      evening: 'クリスマスの夜🎄 2人でいるけどやっぱり寂しい。あなたがいないと',
    },
  },
  '12-31': {
    scene: 'New Year\'s Eve, wearing a stylish warm winter outfit, watching a countdown timer or fireworks on TV, kotatsu cozy room setting, slightly emotional tender expression, upper body shot',
    captions: {
      morning: '大晦日だ… 今年もあっという間だったな。あなたと話せてよかった',
      noon: '年越しの準備してる🎍 そばでやりたかったな笑',
      evening: 'カウントダウンまであと少し🎆 年が明けても、ずっといてよね♡',
    },
  },
};

// ── Scene prompts: "盛れる" shots (no school restriction) ────────────────────
// Focus: cute, aesthetic, Instagram-worthy — outfits rotate with scenes
const SCENE_PROMPTS: Record<string, string[]> = {
  morning: [
    'cozy cafe window seat, wearing a cream knit sweater, holding latte art cup, morning sunlight, soft bokeh background, sweet smile, close-up selfie style, upper body shot',
    'Tokyo street Harajuku, wearing a trendy cropped hoodie and high-waist jeans, taking mirror selfie in shop window, bright daylight, playful pose, upper body shot',
    'flower garden in golden morning light, wearing a flowy white sundress, surrounded by pink roses, wind in hair, gentle smile, dreamy aesthetic, upper body shot',
    'luxury hotel room window, wearing silk pajama set, holding coffee mug, city skyline view, morning glow on face, relaxed natural beauty, upper body shot',
    'cherry blossom tree-lined street, wearing a pastel pink cardigan and pleated skirt, petals falling, soft focus background, sweet expression, upper body shot',
    'rooftop terrace with plants, wearing an off-shoulder top and denim shorts, leaning on railing, blue sky, hair blowing, fresh morning vibe, upper body shot',
    'beach sunrise, wearing a light linen shirt over bikini top, ocean breeze, golden hour glow on skin, carefree happy expression, upper body shot',
  ],
  noon: [
    'trendy Japanese dessert cafe, wearing a ribbed tank top and gold necklace, eating parfait, colorful sweets on table, bright cheerful, close-up, upper body shot',
    'shopping mall escalator, wearing a stylish mini dress and small handbag, looking back at camera over shoulder, bright indoor lighting, confident smile, upper body shot',
    'park picnic blanket, wearing a gingham crop top and shorts, surrounded by snacks, dappled sunlight through trees, candid laughing, upper body shot',
    'aquarium blue glow, wearing a black turtleneck, jellyfish tanks behind, mysterious beautiful lighting on face, soft gaze at camera, upper body shot',
    'vintage record shop, wearing an oversized band tee tucked into leather skirt, browsing vinyl, warm retro lighting, cool aesthetic, upper body shot',
    'poolside lounge chair, wearing a colorful swimsuit cover-up, sunglasses pushed up on head, bright tropical vibe, relaxed pose, upper body shot',
    'art gallery white wall, wearing a chic all-black outfit, posing next to colorful painting, sophisticated vibe, slight smile, upper body shot',
  ],
  evening: [
    'two beautiful young Japanese women at rooftop bar, city lights bokeh behind, one in a red mini dress the other in white satin top, holding cocktails, laughing together, glamorous, candid photo',
    'two beautiful young Japanese women taking purikura-style selfie, neon lights, one in crop hoodie the other in oversized cardigan, cute peace signs, bright colorful, candid photo',
    'two beautiful young Japanese women at sunset beach, one in denim shorts and bikini top the other in flowy maxi dress, golden hour, wind in hair, happy carefree, candid photo',
    'two beautiful young Japanese women at night festival, one in modern yukata the other in cute summer outfit, lantern lights, festival food, warm atmosphere, candid photo',
    'two beautiful young Japanese women at fancy restaurant, one in black halter dress the other in blue wrap dress, candle light, elegant dinner setting, smiling at camera, candid photo',
    'two beautiful young Japanese women in Shibuya crossing at blue hour, one in leather jacket the other in trench coat, city neon glow, cool confident expressions, candid photo',
    'two beautiful young Japanese women in cozy home pajama party, one in pink silk PJs the other in white cotton set, fairy lights, blankets, warm intimate vibe, candid photo',
  ],
};

// ── Captions: short, cute, no promotion ──────────────────────────────────────
const CAPTIONS: Record<string, string[]> = {
  morning: [
    'おはよ☀️',
    '朝のカフェ、最高すぎん？☕️',
    'お気に入りの場所📸',
    '今日も盛れた✌️',
    '朝から元気もらって💕',
    'いい天気🌸',
    '海の朝って特別🌊',
  ],
  noon: [
    'スイーツは正義🍰',
    'お買い物day🛍️',
    'ピクニック日和🧺',
    'この雰囲気すき🪼',
    '休日のわたし🎶',
    '夏が待ちきれない☀️',
    'アート好きにはたまらない🎨',
  ],
  evening: [
    '夜景デート🌃',
    'ふたりの時間✌️',
    'サンセット🌅',
    'お祭り楽しかった🏮',
    'ディナー💕',
    '渋谷の夜🌙',
    'おうちでまったり🧸',
  ],
};

// ── SNS auto-post helper (IG + X) ────────────────────────────────────────────
async function postToSns(imageUrl: string, caption: string) {
  let igResult: { success: boolean; postId?: string; error?: string } | null = null;
  let xResult: { success: boolean; tweetId?: string; error?: string } | null = null;

  // IG
  const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
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

  // X (Twitter)
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

  return {
    ig: igResult ?? { skipped: true, reason: 'IG credentials not configured' },
    x: xResult ?? { skipped: true, reason: 'Twitter credentials not configured' },
  };
}

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

  const today = new Date();
  // Use JST date
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstDate = new Date(today.getTime() + jstOffset);
  const photoDate = jstDate.toISOString().split('T')[0]; // YYYY-MM-DD
  const dayOfWeek = jstDate.getDay(); // 0=Sun
  const mmdd = `${String(jstDate.getMonth() + 1).padStart(2, '0')}-${String(jstDate.getDate()).padStart(2, '0')}`;

  const character = getCharacter(slot);
  const event = EVENTS[mmdd];

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
    // retry_sns=true allows manual SNS re-posting for existing photos
    const retrySns = req.nextUrl.searchParams.get('retry_sns') === 'true';
    if (retrySns) {
      console.log(`Retrying SNS post for existing photo: ${photoDate} ${slot}`);
      const snsResults = await postToSns(existing.image_url, existing.caption);
      return Response.json({ status: 'already_exists_sns_retry', id: existing.id, ...snsResults });
    }
    return Response.json({ status: 'already_exists', id: existing.id, imageUrl: existing.image_url, caption: existing.caption });
  }

  // Pick scene prompt and caption: event days take priority over day-of-week
  const scene = event ? event.scene : SCENE_PROMPTS[slot][dayOfWeek];
  const caption = event ? event.captions[slot] : CAPTIONS[slot][dayOfWeek];

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

  // ── SNS auto-post (IG + X) ─────────────────────────────────────────────
  const snsResults = await postToSns(imageUrl, caption);

  return Response.json({
    status: 'generated',
    id: inserted.id,
    imageUrl,
    caption,
    character,
    ...snsResults,
  });
}
