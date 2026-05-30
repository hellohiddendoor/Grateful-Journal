-- ============================================================
-- Grateful Journal — Supabase SQL Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ── 1. profiles ──────────────────────────────────────────────
create table if not exists public.profiles (
  id               uuid        primary key references auth.users(id) on delete cascade,
  role             text        not null check (role in ('Julie', 'Shawn', 'Parents')),
  display_name     text        not null,
  streak_count     int         not null default 0,
  longest_streak   int         not null default 0,
  last_entry_date  date,
  reminder_time    time        not null default '21:00',
  created_at       timestamptz not null default now()
);

-- ── 2. entries ───────────────────────────────────────────────
create table if not exists public.entries (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null references public.profiles(id) on delete cascade,
  content             text        not null,
  char_count          int         not null,
  has_emotion_word    boolean     not null default false,
  emotion_words_found text[]      not null default '{}',
  ai_response         text,
  entry_date          date        not null,
  created_at          timestamptz not null default now(),
  unique (user_id, entry_date)
);

-- ── 3. Enable Row Level Security ─────────────────────────────
alter table public.profiles enable row level security;
alter table public.entries   enable row level security;

-- ── 4. RLS Policies: profiles ────────────────────────────────

-- Every authenticated user can read their own profile
create policy "profiles: own read"
  on public.profiles for select
  using (auth.uid() = id);

-- Parent role can read all profiles
create policy "profiles: parent read all"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'Parents'
    )
  );

-- Users can insert their own profile (used during signup)
create policy "profiles: own insert"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Users can update their own profile
create policy "profiles: own update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── 5. RLS Policies: entries ─────────────────────────────────

-- Users can read their own entries
create policy "entries: own read"
  on public.entries for select
  using (auth.uid() = user_id);

-- Parent role can read all entries
create policy "entries: parent read all"
  on public.entries for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'Parents'
    )
  );

-- Users can insert their own entries
create policy "entries: own insert"
  on public.entries for insert
  with check (auth.uid() = user_id);

-- Users can update their own entries
create policy "entries: own update"
  on public.entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 6. Trigger: auto-update streak on entry insert/update ────

create or replace function public.update_streak()
returns trigger language plpgsql security definer as $$
declare
  v_last_date  date;
  v_streak     int;
  v_longest    int;
begin
  select last_entry_date, streak_count, longest_streak
    into v_last_date, v_streak, v_longest
    from public.profiles
   where id = NEW.user_id;

  if v_last_date = NEW.entry_date then
    -- same day update, no streak change
    return NEW;
  elsif v_last_date = NEW.entry_date - interval '1 day' then
    v_streak := v_streak + 1;
  else
    v_streak := 1;
  end if;

  if v_streak > v_longest then
    v_longest := v_streak;
  end if;

  update public.profiles
     set streak_count    = v_streak,
         longest_streak  = v_longest,
         last_entry_date = NEW.entry_date
   where id = NEW.user_id;

  return NEW;
end;
$$;

create trigger on_entry_upsert
  after insert on public.entries
  for each row execute function public.update_streak();
