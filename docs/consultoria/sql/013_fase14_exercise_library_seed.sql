-- ============================================================
-- CONSULTORIA — Fase 14 — seed piloto da biblioteca
-- Aplicar após 012. Idempotente e deliberadamente pequeno.
-- Campos técnicos não validados permanecem nulos.
-- NÃO foi aplicado automaticamente no Supabase.
-- ============================================================

begin;

insert into public.fit_exercise_families (slug, name)
values
  ('supino-inclinado', 'Supino inclinado'),
  ('supino-reto', 'Supino reto'),
  ('crossover', 'Crossover'),
  ('peck-deck', 'Peck deck'),
  ('remada', 'Remada'),
  ('puxada', 'Puxada'),
  ('agachamento', 'Agachamento'),
  ('leg-press', 'Leg press'),
  ('flexao-de-joelho', 'Flexão de joelho'),
  ('extensao-de-joelho', 'Extensão de joelho'),
  ('elevacao-lateral', 'Elevação lateral'),
  ('rosca-de-biceps', 'Rosca de bíceps'),
  ('extensao-de-triceps', 'Extensão de tríceps')
on conflict (slug) do nothing;

with seed(slug, family_slug, name, display_name, implementation, equipment_type, laterality) as (
  values
    ('supino-inclinado-barra', 'supino-inclinado', 'Com barra', 'Supino inclinado com barra', 'barbell', 'barbell', 'bilateral'),
    ('supino-inclinado-halteres', 'supino-inclinado', 'Com halteres', 'Supino inclinado com halteres', 'dumbbells', 'dumbbell', 'bilateral'),
    ('supino-inclinado-smith', 'supino-inclinado', 'No Smith', 'Supino inclinado no Smith', 'smith', 'smith_machine', 'bilateral'),
    ('supino-inclinado-articulado', 'supino-inclinado', 'Máquina articulada', 'Supino inclinado articulado', 'articulated_machine', 'machine', 'bilateral'),
    ('supino-inclinado-hammer', 'supino-inclinado', 'Hammer', 'Supino inclinado Hammer', 'plate_loaded_machine', 'machine', 'bilateral'),
    ('supino-inclinado-unilateral-maquina', 'supino-inclinado', 'Unilateral na máquina', 'Supino inclinado unilateral na máquina', 'unilateral_machine', 'machine', 'unilateral'),
    ('cadeira-flexora-bilateral', 'flexao-de-joelho', 'Cadeira flexora bilateral', 'Cadeira flexora bilateral', 'seated_leg_curl', 'machine', 'bilateral'),
    ('cadeira-flexora-unilateral', 'flexao-de-joelho', 'Cadeira flexora unilateral', 'Cadeira flexora unilateral', 'seated_leg_curl', 'machine', 'independent_by_side')
)
insert into public.fit_exercise_variations (
  slug, family_id, name, display_name, implementation, equipment_type,
  laterality, is_system
)
select s.slug, f.id, s.name, s.display_name, s.implementation,
       s.equipment_type, s.laterality, true
from seed s
join public.fit_exercise_families f on f.slug = s.family_slug
on conflict (slug) where is_system do nothing;

commit;
