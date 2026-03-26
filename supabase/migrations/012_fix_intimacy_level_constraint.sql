-- Fix intimacy_level constraint to allow levels 1-10
ALTER TABLE character_intimacy DROP CONSTRAINT IF EXISTS character_intimacy_intimacy_level_check;
ALTER TABLE character_intimacy ADD CONSTRAINT character_intimacy_intimacy_level_check CHECK (intimacy_level BETWEEN 1 AND 10);
