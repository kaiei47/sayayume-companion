-- Migration 008: Add is_favorite column to messages table
-- This column was referenced in the code but missing from the schema,
-- causing chat history to fail to load (PostgREST error → data=null → empty history)

ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_favorites ON messages(conversation_id, is_favorite) WHERE is_favorite = TRUE;
