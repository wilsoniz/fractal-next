-- ============================================================
-- CONSULTORIA — Fase 14 — biblioteca, favoritos e assimetria
-- Aplicar após 011. Aditivo e isolado do Fracta.
-- NÃO foi aplicado automaticamente no Supabase.
-- ============================================================

begin;

create table public.fit_exercise_families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  primary_muscle_group text,
  movement_pattern text,
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_fit_exercise_families_status on public.fit_exercise_families(status);
create index idx_fit_exercise_families_muscle on public.fit_exercise_families(primary_muscle_group);
create trigger trg_fit_exercise_families_updated before update on public.fit_exercise_families
  for each row execute function public.fn_fit_set_updated_at();
alter table public.fit_exercise_families enable row level security;
create policy fit_exercise_families_select_professional on public.fit_exercise_families for select
  using (exists (select 1 from public.fit_profiles where id = auth.uid() and role = 'professional'));
-- Sem INSERT/UPDATE/DELETE pela aplicação: catálogo global é mantido por migration.

create table public.fit_exercise_variations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.fit_exercise_families(id) on delete restrict,
  professional_id uuid references public.fit_profiles(id) on delete cascade,
  slug text check (slug is null or slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (btrim(name) <> ''),
  display_name text not null check (btrim(display_name) <> ''),
  implementation text,
  primary_muscle_group text,
  secondary_muscle_groups jsonb not null default '[]'::jsonb check (jsonb_typeof(secondary_muscle_groups) = 'array'),
  movement_pattern text,
  equipment_type text,
  equipment_brand text,
  equipment_model text,
  laterality text,
  grip text,
  body_position text,
  bench_angle numeric(5,2) check (bench_angle is null or bench_angle between -90 and 90),
  execution_mode text,
  difficulty text,
  skill_requirement text,
  fatigue_score numeric,
  joint_stress text,
  exercise_goal text,
  instructions text,
  common_errors text,
  coaching_cues text,
  contraindications text,
  substitutions jsonb not null default '[]'::jsonb check (jsonb_typeof(substitutions) = 'array'),
  image_url text,
  video_url text,
  tags jsonb not null default '[]'::jsonb check (jsonb_typeof(tags) = 'array'),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  is_system boolean not null default false,
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fit_exercise_variations_scope check (
    (is_system and professional_id is null and slug is not null)
    or (not is_system and professional_id is not null)
  )
);
create unique index fit_exercise_variations_system_slug_uidx
  on public.fit_exercise_variations(slug) where is_system;
create index idx_fit_exercise_variations_family on public.fit_exercise_variations(family_id);
create index idx_fit_exercise_variations_professional on public.fit_exercise_variations(professional_id);
create index idx_fit_exercise_variations_scope_status on public.fit_exercise_variations(is_system, professional_id, status);
create index idx_fit_exercise_variations_equipment on public.fit_exercise_variations(equipment_type);
create index idx_fit_exercise_variations_tags on public.fit_exercise_variations using gin(tags);
create trigger trg_fit_exercise_variations_updated before update on public.fit_exercise_variations
  for each row execute function public.fn_fit_set_updated_at();
alter table public.fit_exercise_variations enable row level security;
create policy fit_exercise_variations_select_professional on public.fit_exercise_variations for select
  using (
    exists (select 1 from public.fit_profiles where id = auth.uid() and role = 'professional')
    and (is_system or professional_id = auth.uid())
  );
create policy fit_exercise_variations_insert_own on public.fit_exercise_variations for insert
  with check (
    not is_system and professional_id = auth.uid()
    and exists (select 1 from public.fit_profiles where id = auth.uid() and role = 'professional')
    and family_id in (select id from public.fit_exercise_families where status = 'active')
  );
create policy fit_exercise_variations_update_own on public.fit_exercise_variations for update
  using (not is_system and professional_id = auth.uid())
  with check (not is_system and professional_id = auth.uid());
-- Sem DELETE; personalizados usam status='archived'.

create table public.fit_exercise_favorites (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.fit_profiles(id) on delete cascade,
  exercise_library_id uuid not null references public.fit_exercise_variations(id) on delete cascade,
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (professional_id, exercise_library_id)
);
create index idx_fit_exercise_favorites_professional on public.fit_exercise_favorites(professional_id, status);
create trigger trg_fit_exercise_favorites_updated before update on public.fit_exercise_favorites
  for each row execute function public.fn_fit_set_updated_at();
alter table public.fit_exercise_favorites enable row level security;
create policy fit_exercise_favorites_select_own on public.fit_exercise_favorites for select
  using (professional_id = auth.uid());
create policy fit_exercise_favorites_insert_own on public.fit_exercise_favorites for insert
  with check (
    professional_id = auth.uid()
    and exists (select 1 from public.fit_profiles where id = auth.uid() and role = 'professional')
    and exercise_library_id in (select id from public.fit_exercise_variations where status = 'active')
  );
create policy fit_exercise_favorites_update_own on public.fit_exercise_favorites for update
  using (professional_id = auth.uid()) with check (professional_id = auth.uid());

alter table public.fit_workout_exercises
  add column exercise_library_id uuid references public.fit_exercise_variations(id) on delete set null;
create index idx_fit_workout_exercises_library on public.fit_workout_exercises(exercise_library_id);

create table public.fit_exercise_block_sides (
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
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_fit_exercise_block_sides_block on public.fit_exercise_block_sides(block_id, status, order_index);
create index idx_fit_exercise_block_sides_exercise on public.fit_exercise_block_sides(exercise_id);
create trigger trg_fit_exercise_block_sides_updated before update on public.fit_exercise_block_sides
  for each row execute function public.fn_fit_set_updated_at();
alter table public.fit_exercise_block_sides enable row level security;
create policy fit_exercise_block_sides_select on public.fit_exercise_block_sides for select
  using (block_id in (
    select id from public.fit_exercise_blocks where plan_id in (
      select id from public.fit_workout_plans where professional_id = auth.uid()
      or patient_id in (select id from public.fit_patients where user_id = auth.uid())
    )
  ));
create policy fit_exercise_block_sides_insert on public.fit_exercise_block_sides for insert
  with check (block_id in (
    select id from public.fit_exercise_blocks where plan_id in (
      select id from public.fit_workout_plans where professional_id = auth.uid()
    )
  ));
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

alter table public.fit_training_log_entries
  add column exercise_library_id uuid references public.fit_exercise_variations(id) on delete set null;
create index idx_fit_log_entries_library on public.fit_training_log_entries(exercise_library_id);

alter table public.fit_training_log_block_entries
  add column exercise_library_id uuid references public.fit_exercise_variations(id) on delete set null,
  add column side_prescription_id uuid references public.fit_exercise_block_sides(id) on delete set null,
  add column side text check (side is null or side in ('left','right','bilateral','alternating','affected','unaffected','custom')),
  add column side_label_snapshot text,
  add column pain_level numeric check (pain_level is null or pain_level between 0 and 10);
create index idx_fit_log_block_entries_library on public.fit_training_log_block_entries(exercise_library_id);
create index idx_fit_log_block_entries_side on public.fit_training_log_block_entries(side_prescription_id, side);

commit;

-- Auditoria pós-aplicação (executar separadamente):
-- select tablename, policyname, cmd from pg_policies
-- where schemaname='public' and tablename in (
--   'fit_exercise_families','fit_exercise_variations',
--   'fit_exercise_favorites','fit_exercise_block_sides'
-- ) order by tablename, policyname;
