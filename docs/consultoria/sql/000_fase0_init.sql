-- ============================================================
-- CONSULTORIA — Fase 0 — fundação (fit_profiles + fit_patients)
-- Produto isolado do Fracta. Nada aqui toca tabelas do Fracta.
-- Aplicar no SQL Editor do Supabase.
-- ============================================================

-- ── TRIGGER próprio de updated_at (NÃO usa a genérica do Fracta) ──
create or replace function public.fn_fit_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── fit_profiles : identidade de app (id = auth.uid()) ──────────
create table if not exists public.fit_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null check (role in ('professional','patient')),
  full_name   text,
  email       text,
  phone       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_fit_profiles_updated
  before update on public.fit_profiles
  for each row execute function public.fn_fit_set_updated_at();

alter table public.fit_profiles enable row level security;

-- vê/edita apenas o próprio perfil
create policy fit_profiles_select_own on public.fit_profiles
  for select using (id = auth.uid());
create policy fit_profiles_insert_own on public.fit_profiles
  for insert with check (id = auth.uid());
create policy fit_profiles_update_own on public.fit_profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
-- sem DELETE (política de não-exclusão)

-- ── fit_patients : ficha do paciente (dono = profissional) ──────
create table if not exists public.fit_patients (
  id               uuid primary key default gen_random_uuid(),
  professional_id  uuid not null references public.fit_profiles(id) on delete cascade,
  user_id          uuid references public.fit_profiles(id) on delete set null, -- login do paciente, quando houver
  full_name        text not null,
  birth_date       date,
  sex              text check (sex in ('female','male','other') or sex is null),
  phone            text,
  email            text,
  goal             text,
  notes            text,
  status           text not null default 'active' check (status in ('active','archived')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_fit_patients_professional on public.fit_patients(professional_id);
create index if not exists idx_fit_patients_user         on public.fit_patients(user_id);

create trigger trg_fit_patients_updated
  before update on public.fit_patients
  for each row execute function public.fn_fit_set_updated_at();

alter table public.fit_patients enable row level security;

-- profissional dono OU o próprio paciente vinculado podem LER
create policy fit_patients_select on public.fit_patients
  for select using (professional_id = auth.uid() or user_id = auth.uid());
-- só o profissional cria (e apenas como dono)
create policy fit_patients_insert on public.fit_patients
  for insert with check (professional_id = auth.uid());
-- só o profissional dono edita
create policy fit_patients_update on public.fit_patients
  for update using (professional_id = auth.uid()) with check (professional_id = auth.uid());
-- sem DELETE (soft via status='archived')
