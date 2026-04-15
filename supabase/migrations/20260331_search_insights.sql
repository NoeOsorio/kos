-- Enable pgvector extension (idempotent)
create extension if not exists vector;

-- search_insights: cosine similarity search over insight embeddings
-- Returns top match_count insights whose embedding is closest to query_embedding,
-- filtered to similarity >= match_threshold (0.0–1.0, default 0.5).
create or replace function search_insights(
  query_embedding vector(1536),
  match_threshold  float   default 0.5,
  match_count      int     default 5,
  exclude_id       uuid    default null
)
returns table (
  id         uuid,
  content    text,
  area       text,
  similarity float
)
language sql stable
as $$
  select
    i.id,
    i.content,
    i.area,
    1 - (i.embedding <=> query_embedding) as similarity
  from insights i
  where
    (exclude_id is null or i.id <> exclude_id)
    and i.embedding is not null
    and 1 - (i.embedding <=> query_embedding) >= match_threshold
  order by i.embedding <=> query_embedding
  limit match_count;
$$;
