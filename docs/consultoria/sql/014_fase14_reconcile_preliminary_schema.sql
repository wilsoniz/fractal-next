-- ============================================================
-- CONSULTORIA — Fase 14 — reconciliação do schema preliminar
--
-- Usar SOMENTE quando a versão preliminar da biblioteca já foi aplicada:
-- - fit_exercise_variations possui `equipment`, mas não `implementation`;
-- - fit_workout_exercises possui `exercise_variation_id`.
--
-- Aditivo: não remove tabelas, colunas ou dados.
-- Aplicar antes do seed 013.
-- NÃO foi aplicado automaticamente no Supabase.
-- ============================================================

begin;

-- ── Enriquece o ativo da biblioteca sem remover `equipment` legado ──
alter table public.fit_exercise_variations
  add column if not exists implementation text,
  add column if not exists primary_muscle_group text,
  add column if not exists secondary_muscle_groups jsonb not null default '[]'::jsonb,
  add column if not exists movement_pattern text,
  add column if not exists equipment_type text,
  add column if not exists equipment_brand text,
  add column if not exists equipment_model text,
  add column if not exists difficulty text,
  add column if not exists skill_requirement text,
  add column if not exists fatigue_score numeric,
  add column if not exists joint_stress text,
  add column if not exists exercise_goal text,
  add column if not exists common_errors text,
  add column if not exists coaching_cues text,
  add column if not exists contraindications text,
  add column if not exists substitutions jsonb not null default '[]'::jsonb,
  add column if not exists image_url text;

-- Compatibilidade semântica da coluna preliminar.
update public.fit_exercise_variations
set equipment_type = equipment
where equipment_type is null and equipment is not null;

create index if not exists idx_fit_exercise_variations_equipment
  on public.fit_exercise_variations(equipment_type);
create index if not exists idx_fit_exercise_variations_tags
  on public.fit_exercise_variations using gin(tags);

-- ── Referência aprovada: mantém exercise_variation_id legado ──
alter table public.fit_workout_exercises
  add column if not exists exercise_library_id uuid
  references public.fit_exercise_variations(id) on delete set null;

update public.fit_workout_exercises
set exercise_library_id = exercise_variation_id
where exercise_library_id is null and exercise_variation_id is not null;

create index if not exists idx_fit_workout_exercises_library
  on public.fit_workout_exercises(exercise_library_id);

-- ── Favoritos: relação de preferência com soft-delete ──
create table if not exists public.fit_exercise_favorites (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.fit_profiles(id) on delete cascade,
  exercise_library_id uuid not null references public.fit_exercise_variations(id) on delete cascade,
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (professional_id, exercise_library_id)
);
create index if not exists idx_fit_exercise_favorites_professional
  on public.fit_exercise_favorites(professional_id, status);
drop trigger if exists trg_fit_exercise_favorites_updated on public.fit_exercise_favorites;
create trigger trg_fit_exercise_favorites_updated before update on public.fit_exercise_favorites
  for each row execute function public.fn_fit_set_updated_at();
alter table public.fit_exercise_favorites enable row level security;
drop policy if exists fit_exercise_favorites_select_own on public.fit_exercise_favorites;
create policy fit_exercise_favorites_select_own on public.fit_exercise_favorites for select
  using (professional_id = auth.uid());
drop policy if exists fit_exercise_favorites_insert_own on public.fit_exercise_favorites;
create policy fit_exercise_favorites_insert_own on public.fit_exercise_favorites for insert
  with check (
    professional_id = auth.uid()
    and exists (select 1 from public.fit_profiles where id = auth.uid() and role = 'professional')
    and exercise_library_id in (select id from public.fit_exercise_variations where status = 'active')
  );
drop policy if exists fit_exercise_favorites_update_own on public.fit_exercise_favorites;
create policy fit_exercise_favorites_update_own on public.fit_exercise_favorites for update
  using (professional_id = auth.uid()) with check (professional_id = auth.uid());

-- ── Prescrição estruturada por lado ──
create table if not exists public.fit_exercise_block_sides (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.fit_exercise_blocks(id) on delete cascade,
  exercise_id uuid not null references public.fit_workout_exercises(id) on delete cascade,
  side text not null check (side in ('left','right','bilateral','alternating','affected','unaffected','custom')),
  side_label text,
  order_index int not null default 0,
  sets int,
  target_reps text,
  target_load text,
  target_load_unit text,
  target_intensity_pct_rm numeric check (target_intensity_pct_rm is null or target_intensity_pct_rm between 0 and 200),
  rest_seconds int,
  rir text,
  rpe text,
  tempo text,
  instructions text,
  data jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_fit_exercise_block_sides_block
  on public.fit_exercise_block_sides(block_id, status, order_index);
create index if not exists idx_fit_exercise_block_sides_exercise
  on public.fit_exercise_block_sides(exercise_id);
drop trigger if exists trg_fit_exercise_block_sides_updated on public.fit_exercise_block_sides;
create trigger trg_fit_exercise_block_sides_updated before update on public.fit_exercise_block_sides
  for each row execute function public.fn_fit_set_updated_at();
alter table public.fit_exercise_block_sides enable row level security;
drop policy if exists fit_exercise_block_sides_select on public.fit_exercise_block_sides;
create policy fit_exercise_block_sides_select on public.fit_exercise_block_sides for select
  using (block_id in (
    select id from public.fit_exercise_blocks where plan_id in (
      select id from public.fit_workout_plans where professional_id = auth.uid()
      or patient_id in (select id from public.fit_patients where user_id = auth.uid())
    )
  ));
drop policy if exists fit_exercise_block_sides_insert on public.fit_exercise_block_sides;
create policy fit_exercise_block_sides_insert on public.fit_exercise_block_sides for insert
  with check (block_id in (
    select id from public.fit_exercise_blocks where plan_id in (
      select id from public.fit_workout_plans where professional_id = auth.uid()
    )
  ));
drop policy if exists fit_exercise_block_sides_update on public.fit_exercise_block_sides;
create policy fit_exercise_block_sides_update on public.fit_exercise_block_sides for update
  using (block_id in (
    select id from public.fit_exercise_blocks where plan_id in (
      select id from public.fit_workout_plans where professional_id = auth.uid()
    )
  ))
  with check (block_id in (
    select id from public.fit_exercise_blocks where plan_id in (
      select id from public.fit_workout_plans where professional_id = auth.uid()
    )
  ));

-- ── Identidade estável nos logs ──
alter table public.fit_training_log_entries
  add column if not exists exercise_library_id uuid
  references public.fit_exercise_variations(id) on delete set null;
create index if not exists idx_fit_log_entries_library
  on public.fit_training_log_entries(exercise_library_id);

-- O inventário real também mostrou `exercise_name` ausente nesta tabela.
alter table public.fit_training_log_block_entries
  add column if not exists exercise_name text,
  add column if not exists exercise_library_id uuid
    references public.fit_exercise_variations(id) on delete set null,
  add column if not exists side_prescription_id uuid
    references public.fit_exercise_block_sides(id) on delete set null,
  add column if not exists side text
    check (side is null or side in ('left','right','bilateral','alternating','affected','unaffected','custom')),
  add column if not exists side_label_snapshot text,
  add column if not exists pain_level numeric
    check (pain_level is null or pain_level between 0 and 10);
create index if not exists idx_fit_log_block_entries_library
  on public.fit_training_log_block_entries(exercise_library_id);
create index if not exists idx_fit_log_block_entries_side
  on public.fit_training_log_block_entries(side_prescription_id, side);

commit;

-- Depois do COMMIT:
-- 1. executar 013_fase14_exercise_library_seed.sql;
-- 2. auditar:
-- select tablename, policyname, cmd from pg_policies
-- where schemaname='public' and tablename in (
--   'fit_exercise_families','fit_exercise_variations',
--   'fit_exercise_favorites','fit_exercise_block_sides'
-- ) order by tablename, policyname;
