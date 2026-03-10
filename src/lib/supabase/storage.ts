import { createClient } from './server';

const BUCKET_NAME = 'chat-images';

/**
 * Upload a base64 image to Supabase Storage.
 * Returns the public URL of the uploaded image.
 */
export async function uploadChatImage(
  base64Data: string,
  mimeType: string,
  conversationId: string
): Promise<string | null> {
  try {
    const supabase = await createClient();

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');
    const ext = mimeType.includes('png') ? 'png' : 'jpg';
    const fileName = `${conversationId}/${Date.now()}.${ext}`;

    // Upload to storage
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      console.error('Storage upload error:', error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Upload failed:', error);
    return null;
  }
}
