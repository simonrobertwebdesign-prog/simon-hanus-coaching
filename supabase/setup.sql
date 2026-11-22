-- Simon Hanus Coaching: database setup.
-- Paste all of this into Supabase > SQL Editor > New query, then press Run.
-- Safe to run once on a new project.

-- ============ People ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'client' check (role in ('client','coach')),
  created_at timestamptz not null default now()
);

-- Make a profile for every new account.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_coach() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'coach');
$$;

-- ============ Coaching ============
create table public.clients (
  id uuid primary key references public.profiles(id) on delete cascade,
  full_name text not null,
  email text,
  plan text not null check (plan in ('oneoff','monthly','premium')),
  status text not null default 'new' check (status in ('new','paid','active','paused','cancelled')),
  start_date date,
  next_checkin date,
  payment_reported boolean not null default false,
  payment_confirmed boolean not null default false,
  stripe_session_id text,
  stripe_customer_id text,
  flags jsonb not null default '[]',
  coach_notes text not null default '',
  created_at timestamptz not null default now()
);

create table public.questionnaires (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  answers jsonb not null,
  created_at timestamptz not null default now()
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  kind text not null check (kind in ('training','nutrition')),
  version int not null default 1,
  status text not null default 'draft' check (status in ('draft','changes_requested','live','archived')),
  content jsonb not null,
  why jsonb not null default '[]',
  feedback text,
  created_by text not null default 'claude',
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  date date not null,
  day_name text,
  entries jsonb not null default '[]',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table public.body_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  date date not null,
  weight_kg numeric(5,1) not null,
  unique (client_id, date)
);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  date date not null,
  angle text not null check (angle in ('front','side','back')),
  path text not null,
  created_at timestamptz not null default now()
);

-- What the client sees: their check-in form, and the coach's message once Simon has approved it.
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  due_date date not null,
  status text not null default 'submitted' check (status in ('submitted','awaiting_approval','changes_requested','sent')),
  form jsonb,
  message text,
  changes jsonb not null default '[]',
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

-- Coach only: the draft message, the report for Simon, and his feedback.
create table public.checkin_drafts (
  checkin_id uuid primary key references public.checkins(id) on delete cascade,
  message text not null default '',
  changes jsonb not null default '[]',
  report text not null default '',
  big_change boolean not null default false,
  feedback text,
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  sender text not null check (sender in ('client','coach')),
  body text not null,
  created_at timestamptz not null default now()
);

-- ============ Who can see what ============
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.questionnaires enable row level security;
alter table public.plans enable row level security;
alter table public.workouts enable row level security;
alter table public.body_logs enable row level security;
alter table public.photos enable row level security;
alter table public.checkins enable row level security;
alter table public.checkin_drafts enable row level security;
alter table public.messages enable row level security;

create policy "own profile" on public.profiles for select using (id = auth.uid() or public.is_coach());
create policy "coach edits profiles" on public.profiles for update using (public.is_coach());

create policy "read own client row" on public.clients for select using (id = auth.uid() or public.is_coach());
create policy "coach manages clients" on public.clients for all using (public.is_coach()) with check (public.is_coach());

create policy "read own answers" on public.questionnaires for select using (client_id = auth.uid() or public.is_coach());
create policy "coach manages answers" on public.questionnaires for all using (public.is_coach()) with check (public.is_coach());

-- Clients only ever see approved (live) plans.
create policy "client sees live plans" on public.plans for select using ((client_id = auth.uid() and status = 'live') or public.is_coach());
create policy "coach manages plans" on public.plans for all using (public.is_coach()) with check (public.is_coach());

create policy "own workouts" on public.workouts for all using (client_id = auth.uid() or public.is_coach()) with check (client_id = auth.uid() or public.is_coach());
create policy "own body logs" on public.body_logs for all using (client_id = auth.uid() or public.is_coach()) with check (client_id = auth.uid() or public.is_coach());
create policy "own photos" on public.photos for all using (client_id = auth.uid() or public.is_coach()) with check (client_id = auth.uid() or public.is_coach());

create policy "read own checkins" on public.checkins for select using (client_id = auth.uid() or public.is_coach());
create policy "coach manages checkins" on public.checkins for all using (public.is_coach()) with check (public.is_coach());

create policy "coach only drafts" on public.checkin_drafts for all using (public.is_coach()) with check (public.is_coach());

create policy "read own messages" on public.messages for select using (client_id = auth.uid() or public.is_coach());
create policy "client writes own messages" on public.messages for insert with check ((client_id = auth.uid() and sender = 'client') or public.is_coach());

-- ============ Actions (run safely on the server) ============

-- Called after the questionnaire: makes the client row and saves the answers.
create function public.start_client(p_plan text, p_full_name text, p_answers jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  insert into clients (id, full_name, email, plan, flags)
  values (auth.uid(), p_full_name, (select email from profiles where id = auth.uid()), p_plan,
          coalesce(p_answers->'_flags', '[]'::jsonb))
  on conflict (id) do update set plan = excluded.plan, full_name = excluded.full_name, flags = excluded.flags;
  insert into questionnaires (client_id, answers) values (auth.uid(), p_answers);
end $$;

-- Called when Stripe sends the client back after paying. Claude checks it in Stripe before any plan is made.
create function public.report_payment(p_session text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update clients set payment_reported = true, stripe_session_id = coalesce(p_session, stripe_session_id),
    status = case when status = 'new' then 'paid' else status end
  where id = auth.uid();
end $$;

-- Client sends their check-in form.
create function public.submit_checkin(p_form jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare open_id uuid; due date;
begin
  select id into open_id from checkins where client_id = auth.uid() and status <> 'sent' order by due_date desc limit 1;
  if open_id is not null then
    update checkins set form = p_form where id = open_id;
  else
    select coalesce(next_checkin, current_date) into due from clients where id = auth.uid();
    insert into checkins (client_id, due_date, form) values (auth.uid(), due, p_form);
  end if;
end $$;

-- Simon says yes to a plan: it goes live, the old one is archived, coaching starts.
create function public.approve_plan(p_plan uuid) returns void
language plpgsql security definer set search_path = public as $$
declare p plans; c clients; gap int;
begin
  if not is_coach() then raise exception 'Coach only'; end if;
  select * into p from plans where id = p_plan;
  update plans set status = 'archived' where client_id = p.client_id and kind = p.kind and status = 'live' and id <> p.id;
  update plans set status = 'live', approved_at = now(), feedback = null where id = p.id;
  select * into c from clients where id = p.client_id;
  if c.status <> 'active'
     and exists (select 1 from plans where client_id = c.id and kind = 'training' and status = 'live')
     and exists (select 1 from plans where client_id = c.id and kind = 'nutrition' and status = 'live') then
    gap := case c.plan when 'monthly' then 14 when 'premium' then 7 else null end;
    update clients set status = 'active', start_date = coalesce(start_date, current_date),
      next_checkin = case when gap is null then null else coalesce(start_date, current_date) + gap end
    where id = c.id;
  end if;
end $$;

-- Simon says yes to a check-in: the message reaches the client, next date is set.
create function public.approve_checkin(p_checkin uuid) returns void
language plpgsql security definer set search_path = public as $$
declare d checkin_drafts; k checkins; gap int;
begin
  if not is_coach() then raise exception 'Coach only'; end if;
  select * into d from checkin_drafts where checkin_id = p_checkin;
  update checkins set status = 'sent', sent_at = now(), message = d.message, changes = d.changes
  where id = p_checkin returning * into k;
  select case plan when 'monthly' then 14 when 'premium' then 7 else null end into gap from clients where id = k.client_id;
  if gap is not null then update clients set next_checkin = current_date + gap where id = k.client_id; end if;
end $$;

-- ============ Access for logged-in users (row rules above still apply) ============
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke execute on function public.start_client(text, text, jsonb), public.report_payment(text), public.submit_checkin(jsonb),
  public.approve_plan(uuid), public.approve_checkin(uuid) from public, anon;
grant execute on function public.start_client(text, text, jsonb), public.report_payment(text), public.submit_checkin(jsonb),
  public.approve_plan(uuid), public.approve_checkin(uuid), public.is_coach() to authenticated;

-- ============ Progress photos (private) ============
insert into storage.buckets (id, name, public) values ('progress', 'progress', false);

create policy "upload own photos" on storage.objects for insert
  with check (bucket_id = 'progress' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "see own photos" on storage.objects for select
  using (bucket_id = 'progress' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_coach()));
create policy "delete own photos" on storage.objects for delete
  using (bucket_id = 'progress' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_coach()));

-- ============ Last step (after Simon has made his own account on the site) ============
-- Replace the email and run this one line on its own:
-- update public.profiles set role = 'coach' where email = 'SIMON-EMAIL-HERE';
