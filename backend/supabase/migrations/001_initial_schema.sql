-- Run this in the Supabase SQL editor (or via: supabase db push)
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- logs table
CREATE TABLE IF NOT EXISTS logs (
  id         uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  type       text    CHECK (type IN ('book','idea','class','connection','article')) NOT NULL,
  title      text    NOT NULL,
  author     text,
  chapter    text,
  area       text,
  created_at timestamptz DEFAULT now()
);

-- insights table
CREATE TABLE IF NOT EXISTS insights (
  id          uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  log_id      uuid    REFERENCES logs(id) ON DELETE CASCADE,
  content     text    NOT NULL,
  area        text,
  embedding   vector(1536),
  next_review timestamptz,
  ease_factor float   DEFAULT 2.5,
  created_at  timestamptz DEFAULT now()
);

-- connections table
CREATE TABLE IF NOT EXISTS connections (
  id         uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id  uuid    REFERENCES insights(id) ON DELETE CASCADE,
  target_id  uuid    REFERENCES insights(id) ON DELETE CASCADE,
  label      text,
  strength   float   DEFAULT 0.5,
  confirmed  bool    DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(source_id, target_id)
);

-- Index for pgvector cosine similarity
CREATE INDEX IF NOT EXISTS insights_embedding_idx
  ON insights USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);
