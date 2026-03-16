-- Add 'duo' character to the characters table
-- Required because conversations.character_id has a FK reference to characters(id)
-- Without this, duo mode conversations fail silently (FK violation → guest-TIMESTAMP fallback)

INSERT INTO characters (id, name, name_ja, personality, system_prompt)
VALUES ('duo', 'Duo', 'さや＆ゆめ', '{"type": "duo", "tone": "mixed"}', '')
ON CONFLICT (id) DO NOTHING;
