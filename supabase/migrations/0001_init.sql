-- Lanyard — initial schema
-- Implements plans/00-foundation.md §6 (data model) + plans/tech/00-tech-foundation.md §2.
-- One shared team pool (T3 default). RLS: authenticated team members read/write.

-- Extensions ---------------------------------------------------------------
create extension if not exists pg_trgm;        -- fuzzy name/company retrieval (matching engine)
-- create extension if not exists vector;      -- (optional, stretch) pgvector semantic retrieval

-- Enums --------------------------------------------------------------------
do $$ begin
  create type temperature  as enum ('hot','warm','lukewarm','cool','cold');     -- their interest (5-pt)
  create type fit_tier      as enum ('strong','moderate','weak','unclear');      -- our ICP fit (#4)
  create type link_state    as enum ('pending','confirmed');                     -- capture-vs-commit (§8)
  create type conf_tier     as enum ('T1','T2','T3');                            -- ICP scoring tiers (C4)
  create type conf_source   as enum ('seed','discovery');
  create type coverage_status as enum ('considering','committed','attended','declined');
exception when duplicate_object then null; end $$;

-- updated_at trigger helper ------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

-- Reps (team members; 1:1 with auth.users) ---------------------------------
create table reps (
  id          uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  team_id     uuid not null default gen_random_uuid(),  -- v1: one team; column present for future
  name        text not null,
  email       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Conferences --------------------------------------------------------------
create table conferences (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  start_date  date,
  end_date    date,
  location    text,
  country     text,
  region      text,
  verticals   text[] default '{}',
  est_audience integer,
  icp_score   integer,                 -- 0..100, computed (C4)
  tier        conf_tier,
  score_breakdown jsonb,               -- {factors:{icpDensity,topicFit,scale,geoRelevance,historicalPerf}, ...} + AI rationale
  source      conf_source not null default 'seed',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Contacts (durable person; identity we dedupe) ----------------------------
create table contacts (
  id            uuid primary key default gen_random_uuid(),
  linkedin_url  text,                  -- PRIMARY identity anchor when present (verifiable)
  canonical_name text not null,
  current_company text,
  current_title text,
  email         text,
  arc_cache     jsonb,                 -- cached relationship-arc summary + verdict (#3)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Encounters (the join: one meeting) ---------------------------------------
create table encounters (
  id            uuid primary key default gen_random_uuid(),
  contact_id    uuid references contacts(id) on delete set null,  -- NULL while pending/new
  conference_id uuid references conferences(id) on delete set null,
  rep_id        uuid references reps(id) on delete set null,
  occurred_at   timestamptz not null default now(),
  audio_path    text,                  -- Supabase Storage key (P2 source of truth)
  transcript    text,                  -- Whisper output
  note          text,
  temperature   temperature,
  topics        text[] default '{}',
  fit           jsonb,                 -- {companyFit, personFit, tier, score, rationale} (#4)
  follow_up     boolean not null default false,
  reminder      text,
  state         link_state not null default 'confirmed',          -- pending until reconciled
  match_candidates jsonb,             -- [{contactId, confidence, reasoning, crossRep}] when pending
  identity_snapshot jsonb,           -- {name, company, title, email, linkedin} as-told-at-event (job-change history)
  provenance    jsonb,               -- {repId, confidence, source}
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Coverage (Rep planning to attend Conference; NOT an Encounter) ------------
create table coverage (
  id            uuid primary key default gen_random_uuid(),
  rep_id        uuid not null references reps(id) on delete cascade,
  conference_id uuid not null references conferences(id) on delete cascade,
  status        coverage_status not null default 'considering',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (rep_id, conference_id)
);

-- Notifications (lightweight; cross-rep "loop in teammate") -----------------
create table notifications (
  id         uuid primary key default gen_random_uuid(),
  rep_id     uuid not null references reps(id) on delete cascade,
  type       text not null,
  payload    jsonb,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

-- App settings (encrypted service keys + scoring weights; team-level) -------
create table app_settings (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null,
  key_name    text not null,           -- 'anthropic' | 'openai' | 'enrichment' | 'hubspot' | 'scoring_weights' | ...
  key_ciphertext text,                 -- encrypted (service keys); plaintext jsonb-as-text ok for non-secret config
  updated_by  uuid references reps(id),
  updated_at  timestamptz not null default now(),
  unique (team_id, key_name)
);

-- Indexes (matching retrieval — foundation §7) -----------------------------
create index contacts_name_trgm    on contacts using gin (canonical_name gin_trgm_ops);
create index contacts_company_trgm on contacts using gin (current_company gin_trgm_ops);
create index contacts_linkedin     on contacts (linkedin_url);
create index contacts_email        on contacts (email);
create index encounters_contact    on encounters (contact_id);
create index encounters_conference on encounters (conference_id);
create index encounters_state      on encounters (state);
create index coverage_conference   on coverage (conference_id);

-- updated_at triggers ------------------------------------------------------
create trigger t_reps        before update on reps        for each row execute function set_updated_at();
create trigger t_conferences before update on conferences for each row execute function set_updated_at();
create trigger t_contacts    before update on contacts    for each row execute function set_updated_at();
create trigger t_encounters  before update on encounters  for each row execute function set_updated_at();
create trigger t_coverage    before update on coverage    for each row execute function set_updated_at();

-- RLS (v1: one shared team pool — any authenticated user reads/writes) ------
-- NOTE: v1 keeps this permissive (single team). Tighten to team_id scoping when multi-team lands.
alter table reps          enable row level security;
alter table conferences   enable row level security;
alter table contacts      enable row level security;
alter table encounters    enable row level security;
alter table coverage      enable row level security;
alter table notifications enable row level security;
alter table app_settings  enable row level security;

do $$
declare t text;
begin
  foreach t in array array['reps','conferences','contacts','encounters','coverage','notifications','app_settings']
  loop
    execute format('create policy %I_auth_all on %I for all to authenticated using (true) with check (true);', t, t);
  end loop;
end $$;

-- Storage bucket for audio recordings (P2) — create via dashboard or:
-- insert into storage.buckets (id, name, public) values ('recordings','recordings', false);
