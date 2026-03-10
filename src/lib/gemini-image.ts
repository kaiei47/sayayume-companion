/**
 * Gemini Image Generation (REST API)
 * Uses gemini-3.1-flash-image-preview for fast, cheap chat selfie generation.
 * $0.039/image at 1K size. Face consistency comparable to Pro.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const IMAGE_MODEL = 'gemini-3.1-flash-image-preview';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

interface GenerateImageResult {
  base64: string;
  mimeType: string;
}

export async function generateImage(prompt: string): Promise<GenerateImageResult | null> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: {
            aspectRatio: '3:4',
            imageSize: '1K',
          },
        },
      }),
    });

    if (!response.ok) {
      console.error('Image generation API error:', response.status, await response.text());
      return null;
    }

    const data = await response.json();

    // Check for safety blocks
    const candidate = data.candidates?.[0];
    if (!candidate) {
      console.error('No candidates:', data.promptFeedback);
      return null;
    }
    if (candidate.finishReason === 'IMAGE_SAFETY') {
      console.error('Image blocked by safety filter');
      return null;
    }

    const parts = candidate.content?.parts;
    if (!parts) return null;

    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        return {
          base64: part.inlineData.data,
          mimeType: part.inlineData.mimeType,
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Image generation failed:', error);
    return null;
  }
}

/**
 * Extract [IMAGE: description] tags from text.
 * Returns the cleaned text and any image descriptions found.
 */
export function extractImageTags(text: string): {
  cleanText: string;
  imageDescriptions: string[];
} {
  const imageRegex = /\[IMAGE:\s*([^\]]+)\]/g;
  const descriptions: string[] = [];
  let match;

  while ((match = imageRegex.exec(text)) !== null) {
    descriptions.push(match[1].trim());
  }

  const cleanText = text.replace(imageRegex, '').trim();

  return { cleanText, imageDescriptions: descriptions };
}

/**
 * Build a full image generation prompt from the character config and description.
 */
export function buildImagePrompt(
  characterPromptBase: string,
  imageDescription: string
): string {
  return `Generate a selfie-style photo. ${characterPromptBase}. Scene: ${imageDescription}. The image should look like a candid selfie or photo shared in a chat conversation. Soft frontal beauty lighting, no harsh shadows, youthful glowing skin, cinematic quality, upper body shot.`;
}
