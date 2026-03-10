export interface User {
  id: string;
  auth_id: string;
  display_name: string;
  email: string | null;
  avatar_url: string | null;
  locale: string;
  is_premium: boolean;
  is_nsfw_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Character {
  id: string; // 'saya' | 'yume'
  name: string;
  name_ja: string;
  personality: Record<string, unknown>;
  system_prompt: string;
  voice_id: string | null;
  base_image_url: string | null;
  image_prompt_template: string | null;
  is_active: boolean;
}

export interface Conversation {
  id: string;
  user_id: string;
  character_id: string;
  title: string | null;
  message_count: number;
  last_message_at: string | null;
  mood: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  content_type: 'text' | 'image' | 'audio' | 'system';
  image_url: string | null;
  audio_url: string | null;
  token_count_input: number;
  token_count_output: number;
  model_used: string | null;
  is_nsfw: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: 'free' | 'basic' | 'premium' | 'vip';
  status: 'active' | 'cancelled' | 'past_due' | 'expired';
  payment_provider: string | null;
  external_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export interface TokenBalance {
  id: string;
  user_id: string;
  balance: number;
  total_purchased: number;
  total_consumed: number;
}

export type CharacterId = 'saya' | 'yume' | 'duo';
