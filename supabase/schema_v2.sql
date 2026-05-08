-- ============================================================
-- LLM Wiki Maker — Supabase Schema V2
-- Phase 1: Source-Anchored Vaults
--
-- Run this in the Supabase SQL Editor AFTER schema.sql
-- (or in a fresh project, run this alone)
-- ============================================================

-- Enable pgvector for semantic search
create extension if not exists vector;

-- ── Drop V1 tables if migrating (comment out if keeping V1 data) ──────────────
-- drop table if exists wiki_pages cascade;

-- ── Vaults ────────────────────────────────────────────────────────────────────

create table if not exists vaults (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  name          text not null,
  description   text,
  vault_prompt  text,                   -- custom AI instructions for this vault
  link_types    jsonb not null default  -- allowed relationship types
                '["REQUIRES","CONTRADICTS","BUILDS_ON","EXAMPLES","ENABLES","PART_OF","USED_BY","REPLACES"]',
  fingerprint   jsonb not null default '{}',  -- {topics: [], entities: [], keywords: []}
  page_count    int not null default 0,
  capture_count int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists vaults_user_idx on vaults(user_id);

alter table vaults enable row level security;

create policy "Users manage own vaults"
  on vaults for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Captures (raw, immutable) ─────────────────────────────────────────────────

create table if not exists captures (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  vault_id      uuid references vaults(id) on delete cascade not null,
  source_url    text not null,
  source_domain text,
  source_type   text not null default 'article',  -- article | linkedin | twitter | youtube
  title         text,                             -- original page title
  raw_content   text not null,                    -- ORIGINAL, never modified
  raw_html      text,                             -- full outerHTML (extension only)
  why_saved     text,                             -- capture-time "why did you save this?"
  embedding     vector(1536),                     -- for semantic search
  captured_at   timestamptz not null default now()
);

create index if not exists captures_vault_idx on captures(vault_id);
create index if not exists captures_user_idx on captures(user_id);
create index if not exists captures_domain_idx on captures(source_domain);

alter table captures enable row level security;

create policy "Users manage own captures"
  on captures for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Wiki Pages (AI-interpreted, evolving) ─────────────────────────────────────

create table if not exists wiki_pages (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  vault_id        uuid references vaults(id) on delete cascade not null,
  entity_type     text not null default 'concept',  -- concept | tool | person | decision
  title           text not null,
  summary         text,
  key_insights    jsonb not null default '[]',
  detailed_notes  text,
  code_examples   jsonb not null default '[]',
  tags            text[] not null default '{}',
  confidence      text not null default 'low',  -- high | medium | low
  source_count    int not null default 1,
  embedding       vector(1536),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
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

create index if not exists wiki_pages_vault_idx on wiki_pages(vault_id);
create index if not exists wiki_pages_user_idx on wiki_pages(user_id);
create index if not exists wiki_pages_tags_idx on wiki_pages using gin(tags);
create index if not exists wiki_pages_fts_idx on wiki_pages
  using gin(to_tsvector('english',
    coalesce(title,'') || ' ' ||
    coalesce(summary,'') || ' ' ||
    coalesce(detailed_notes,'')
  ));

alter table wiki_pages enable row level security;

create policy "Users manage own wiki pages"
  on wiki_pages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Citations (claim → capture mapping) ───────────────────────────────────────

create table if not exists citations (
  id            uuid primary key default gen_random_uuid(),
  wiki_page_id  uuid references wiki_pages(id) on delete cascade not null,
  capture_id    uuid references captures(id) on delete cascade not null,
  claim_text    text not null,    -- the specific claim this citation supports
  excerpt       text not null     -- exact quote from the original capture
);

create index if not exists citations_page_idx on citations(wiki_page_id);
create index if not exists citations_capture_idx on citations(capture_id);

-- RLS via wiki_page ownership (no direct user_id column needed)
alter table citations enable row level security;

create policy "Users manage own citations"
  on citations for all
  using (
    exists (
      select 1 from wiki_pages wp
      where wp.id = citations.wiki_page_id
        and wp.user_id = auth.uid()
    )
  );

-- ── Typed Relationships (knowledge graph edges) ───────────────────────────────

create table if not exists relationships (
  id            uuid primary key default gen_random_uuid(),
  vault_id      uuid references vaults(id) on delete cascade not null,
  source_page   uuid references wiki_pages(id) on delete cascade not null,
  target_page   uuid references wiki_pages(id) on delete cascade not null,
  type          text not null,    -- REQUIRES | CONTRADICTS | BUILDS_ON | EXAMPLES |
                                  -- ENABLES | PART_OF | USED_BY | REPLACES
  evidence      text,             -- excerpt from capture that supports this link
  capture_id    uuid references captures(id) on delete set null,
  created_at    timestamptz not null default now(),
  unique(source_page, target_page, type)
);

create index if not exists relationships_vault_idx on relationships(vault_id);
create index if not exists relationships_source_idx on relationships(source_page);
create index if not exists relationships_target_idx on relationships(target_page);

alter table relationships enable row level security;

create policy "Users manage own relationships"
  on relationships for all
  using (
    exists (
      select 1 from vaults v
      where v.id = relationships.vault_id
        and v.user_id = auth.uid()
    )
  );

-- ── Helper functions ──────────────────────────────────────────────────────────

-- Increment vault counters when a capture is inserted
create or replace function increment_vault_capture_count()
returns trigger as $$
begin
  update vaults set capture_count = capture_count + 1 where id = new.vault_id;
  return new;
end;
$$ language plpgsql;

create trigger captures_vault_count
  after insert on captures
  for each row execute function increment_vault_capture_count();

-- Increment vault page count when a wiki page is inserted
create or replace function increment_vault_page_count()
returns trigger as $$
begin
  update vaults set page_count = page_count + 1 where id = new.vault_id;
  return new;
end;
$$ language plpgsql;

create trigger wiki_pages_vault_count
  after insert on wiki_pages
  for each row execute function increment_vault_page_count();

-- Decrement vault page count when a wiki page is deleted
create or replace function decrement_vault_page_count()
returns trigger as $$
begin
  update vaults set page_count = greatest(page_count - 1, 0) where id = old.vault_id;
  return old;
end;
$$ language plpgsql;

create trigger wiki_pages_vault_count_delete
  after delete on wiki_pages
  for each row execute function decrement_vault_page_count();

-- Decrement vault capture count when a capture is deleted
create or replace function decrement_vault_capture_count()
returns trigger as $$
begin
  update vaults set capture_count = greatest(capture_count - 1, 0) where id = old.vault_id;
  return old;
end;
$$ language plpgsql;

create trigger captures_vault_count_delete
  after delete on captures
  for each row execute function decrement_vault_capture_count();

-- ── Views ─────────────────────────────────────────────────────────────────────

-- Vault summary (used by vault list page)
create or replace view vault_summaries as
  select
    v.id,
    v.user_id,
    v.name,
    v.description,
    v.page_count,
    v.capture_count,
    v.created_at,
    v.updated_at
  from vaults v;

-- Recent captures per vault (used by vault dashboard)
create or replace view recent_captures as
  select
    c.id,
    c.vault_id,
    c.user_id,
    c.source_url,
    c.source_domain,
    c.source_type,
    c.title,
    c.why_saved,
    c.captured_at
  from captures c
  order by c.captured_at desc;
