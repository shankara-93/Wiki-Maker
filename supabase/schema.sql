-- ============================================================
-- LLM Wiki Maker — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Wiki pages table
create table if not exists wiki_pages (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  title         text not null,
  source_url    text not null,
  source_domain text,
  category      text not null default 'Other',
  tags          jsonb not null default '[]',
  summary       text,
  key_insights  jsonb not null default '[]',
  detailed_notes text,
  code_examples jsonb not null default '[]',
  wiki_markdown text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger wiki_pages_updated_at
  before update on wiki_pages
  for each row execute function update_updated_at_column();

-- Full-text search index on title + summary + detailed_notes
create index if not exists wiki_pages_fts_idx on wiki_pages
  using gin(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(detailed_notes,'')));

-- Category + user lookup index
create index if not exists wiki_pages_category_user_idx on wiki_pages(user_id, category);

-- Source domain index
create index if not exists wiki_pages_domain_idx on wiki_pages(source_domain);

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table wiki_pages enable row level security;

-- Users can only read/write/delete their own pages
create policy "Users manage own pages"
  on wiki_pages
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Helpful views ─────────────────────────────────────────────────────────────

-- Category counts per user (used by sidebar)
create or replace view category_counts as
  select
    user_id,
    category,
    count(*) as page_count
  from wiki_pages
  group by user_id, category;
