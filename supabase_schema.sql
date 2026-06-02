-- ============================================================
--  אורינטציה OB/GYN — סכמת Supabase
--  הדבק את כל הקובץ הזה ב-Supabase SQL Editor ולחץ RUN.
--  מודל פשוט: שורה משותפת אחת שמחזיקה את כל מצב האפליקציה (JSON).
--  מתאים למערכת שקופה ומבוססת אמון (ללא התחברות).
-- ============================================================

create table if not exists public.app_state (
  id          text primary key,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- הפעלת Row Level Security
alter table public.app_state enable row level security;

-- המערכת שקופה וללא משתמשים — מתירים קריאה/כתיבה למפתח ה-anon הציבורי.
-- (אם בעתיד תרצה להגביל — נחליף את המדיניות בהזדהות.)
drop policy if exists "public read"   on public.app_state;
drop policy if exists "public insert" on public.app_state;
drop policy if exists "public update" on public.app_state;

create policy "public read"   on public.app_state for select using (true);
create policy "public insert" on public.app_state for insert with check (true);
create policy "public update" on public.app_state for update using (true) with check (true);

-- הפעלת Realtime (רענון חי בין מכשירים)
alter publication supabase_realtime add table public.app_state;

-- שורת התחלה ריקה (האפליקציה תמלא אותה בכניסה הראשונה).
insert into public.app_state (id, data)
values ('shared', '{}'::jsonb)
on conflict (id) do nothing;
