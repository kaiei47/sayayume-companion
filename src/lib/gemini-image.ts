/**
 * Gemini Image Generation (REST API)
 * Uses gemini-3.1-flash-image-preview for fast, cheap chat selfie generation.
 * Sends a reference image for face consistency.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const IMAGE_MODEL = 'gemini-3.1-flash-image-preview';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// Cache reference images in memory (base64) to avoid reading from disk every time
const referenceImageCache = new Map<string, { base64: string; mimeType: string }>();

function loadReferenceImage(relativePath: string): { base64: string; mimeType: string } | null {
  const cached = referenceImageCache.get(relativePath);
  if (cached) return cached;

  try {
    const fullPath = join(process.cwd(), relativePath);
    const buffer = readFileSync(fullPath);
    const base64 = buffer.toString('base64');
    const mimeType = relativePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
    const result = { base64, mimeType };
    referenceImageCache.set(relativePath, result);
    return result;
  } catch (error) {
    console.error('Failed to load reference image:', relativePath, error);
    return null;
  }
}

interface GenerateImageResult {
  base64: string;
  mimeType: string;
}

export async function generateImage(
  prompt: string,
  referenceImagePath?: string
): Promise<GenerateImageResult | null> {
  try {
    // Build parts: reference image (if available) + text prompt
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

    if (referenceImagePath) {
      const refImage = loadReferenceImage(referenceImagePath);
      if (refImage) {
        parts.push({
          inlineData: {
            mimeType: refImage.mimeType,
            data: refImage.base64,
          },
        });
      }
    }

    parts.push({ text: prompt });

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts,
          },
        ],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: {
            aspectRatio: '3:4',
            imageSize: '1024px',
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

    const resultParts = candidate.content?.parts;
    if (!resultParts) return null;

    for (const part of resultParts) {
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
 * When a reference image is provided, the prompt instructs Gemini to match the face.
 */
export function buildImagePrompt(
  characterPromptBase: string,
  imageDescription: string,
  hasReferenceImage: boolean = false
): string {
  if (hasReferenceImage) {
    return `Generate a photo of this exact same person shown in the reference image. Keep the same face, facial features, and hair style. ${imageDescription}. ${characterPromptBase}. Soft frontal beauty lighting, no harsh shadows, youthful glowing skin, cinematic quality, lifestyle photography style.`;
  }
  return `Generate a photo. ${characterPromptBase}. ${imageDescription}. Soft frontal beauty lighting, no harsh shadows, youthful glowing skin, cinematic quality, lifestyle photography style.`;
}

/**
 * Build a prompt for duo (2-shot) image generation.
 * Takes two reference images and produces a photo with both characters together.
 */
export function buildDuoImagePrompt(imageDescription: string): string {
  return `Generate a photo of these two women together in the same scene. The first reference image is Saya (light brown straight hair) and the second is Yume (dark hair with bangs in a low bun). Keep each person's exact face, facial features, and hair style from their respective reference images. Scene: ${imageDescription}. Two young Japanese women together, candid photo style, soft frontal beauty lighting, no harsh shadows, youthful glowing skin, cinematic quality, upper body shot.`;
}

/**
 * Generate a duo (2-shot) image with two reference images for face consistency.
 */
export async function generateDuoImage(
  prompt: string,
  referenceImagePath1: string,
  referenceImagePath2: string
): Promise<GenerateImageResult | null> {
  try {
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

    const ref1 = loadReferenceImage(referenceImagePath1);
    if (ref1) {
      parts.push({ inlineData: { mimeType: ref1.mimeType, data: ref1.base64 } });
    }
    const ref2 = loadReferenceImage(referenceImagePath2);
    if (ref2) {
      parts.push({ inlineData: { mimeType: ref2.mimeType, data: ref2.base64 } });
    }

    parts.push({ text: prompt });

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: {
            aspectRatio: '3:4',
            imageSize: '1024px',
          },
        },
      }),
    });

    if (!response.ok) {
      console.error('Duo image generation API error:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (!candidate) {
      console.error('No candidates:', data.promptFeedback);
      return null;
    }
    if (candidate.finishReason === 'IMAGE_SAFETY') {
      console.error('Duo image blocked by safety filter');
      return null;
    }

    const resultParts = candidate.content?.parts;
    if (!resultParts) return null;

    for (const part of resultParts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        return {
          base64: part.inlineData.data,
          mimeType: part.inlineData.mimeType,
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Duo image generation failed:', error);
    return null;
  }
}
