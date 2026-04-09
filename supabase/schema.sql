-- ============================================================
-- FRACTA — Schema adaptado ao banco real
-- Inspecionado em: 2026-04-08 via information_schema
--
-- TABELAS EXISTENTES (não modificadas salvo ALTER explícito):
--
--   criancas          id, responsavel_id, nome, data_nascimento, idade_anos,
--                     diagnostico, observacoes, ativo, criado_em, atualizado_em
--
--   radar_snapshots   id, crianca_id, avaliacao_id,
--                     score_comunicacao, score_social, score_atencao,
--                     score_regulacao, score_brincadeira, score_flexibilidade,
--                     score_autonomia, score_motivacao, criado_em
--
--   avaliacoes        id, crianca_id, responsavel_id, nome_crianca, idade_crianca,
--                     nome_responsavel, email_responsavel, respostas(jsonb),
--                     score_comunicacao..score_motivacao, score_geral,
--                     tipo, origem, dominio_prioritario, convertido, criado_em
--
--   checkins          id, crianca_id, responsavel_id, respostas(jsonb),
--                     score_comunicacao..score_motivacao, observacao, semana, criado_em
--
--   conquistas        id, crianca_id, tipo, titulo, descricao, criado_em
--
--   leads             id, email, nome_responsavel, nome_crianca, idade_crianca,
--                     avaliacao_id, score_geral, utm_*, convertido, convertido_em, criado_em
--
--   perfis            id, nome, email, telefone, tipo, ativo, criado_em, atualizado_em
--
--   planos            id, crianca_id, programa_id, status, prioridade, tipo_plano,
--                     score_inicio, score_atual, meta_score, gerado_por, terapeuta_id,
--                     iniciado_em, concluido_em, criado_em, atualizado_em
--
--   programas         id, codigo, nome, dominio, tipo, nivel, objetivo, subtitulo,
--                     materiais, passos(jsonb), dica, prereqs(ARRAY), desbloqueia(ARRAY),
--                     tempo_minutos, ativo, criado_em
--
--   sessoes           id, plano_id, crianca_id, responsavel_id, tentativas(ARRAY),
--                     total_tentativas, acertos, taxa_acerto, duracao_segundos,
--                     observacao, humor_crianca, concluida, criado_em
--
--   sessoes_clinicas  id, terapeuta_id, crianca_id, responsavel_id, programa_id,
--                     timer_segundos, tentativas(jsonb), pic_registros(jsonb),
--                     observacoes, taxa_id, agendado_para, status, valor_sessao,
--                     comissao_fracta, pago, criado_em
--
--   terapeutas        id, registro_prof, especialidade(ARRAY), bio, foto_url,
--                     cidades(ARRAY), atende_online, preco_sessao, disponivel,
--                     avaliacao_media, total_sessoes, verificado, criado_em
--
-- FK PADRÃO DO BANCO:  crianca_id → criancas(id)
-- CONVENÇÃO DE NOMES:  snake_case PT, timestamps como criado_em/atualizado_em
-- SCORES DE DOMÍNIO:   score_comunicacao, score_social, score_atencao,
--                      score_regulacao, score_brincadeira, score_flexibilidade,
--                      score_autonomia, score_motivacao
--
-- ESTE SCRIPT:
--   1. Cria enums com proteção contra duplicata
--   2. ALTER radar_snapshots: adiciona apenas a coluna `label` (domínios já existem)
--   3. Cria as 6 tabelas clínicas que não existem
--   4. Seed do Lucas usando os nomes de coluna exatos do banco
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── Enums ───────────────────────────────────────────────────
do $$ begin
  create type skill_status as enum ('absent', 'emerging', 'acquired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type program_status as enum ('active', 'completed', 'stalled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type alert_level as enum ('low', 'medium', 'high');
exception when duplicate_object then null; end $$;

do $$ begin
  create type goal_type as enum ('acquisition', 'replacement', 'reduction', 'generalization', 'maintenance');
exception when duplicate_object then null; end $$;

do $$ begin
  create type goal_health as enum ('on_track', 'watch', 'stalled', 'accelerating', 'consolidating');
exception when duplicate_object then null; end $$;

do $$ begin
  create type forecast_confidence as enum ('low', 'medium', 'high');
exception when duplicate_object then null; end $$;

do $$ begin
  create type forecast_effort as enum ('low', 'moderate', 'high');
exception when duplicate_object then null; end $$;

-- ─── updated_at trigger ──────────────────────────────────────
create or replace function set_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

-- ============================================================
-- ALTER: radar_snapshots
-- Os scores já existem. Adiciona apenas o campo de label.
-- ============================================================
alter table radar_snapshots
  add column if not exists label text;

-- ============================================================
-- NOVAS TABELAS
-- ============================================================

-- ─── 1. Biblioteca global de habilidades ─────────────────────
create table if not exists skill_library (
  id               uuid primary key default gen_random_uuid(),
  nome             text not null,
  dominio          text not null,
  descricao        text,
  prerequisito_ids uuid[] not null default '{}',
  criado_em        timestamptz not null default now()
);

-- ─── 2. Habilidades por criança ──────────────────────────────
create table if not exists habilidades_crianca (
  id               uuid primary key default gen_random_uuid(),
  crianca_id       uuid not null references criancas(id) on delete cascade,
  skill_library_id uuid references skill_library(id) on delete set null,
  nome             text not null,
  dominio          text not null,
  status           skill_status not null default 'absent',
  confianca        smallint not null default 0 check (confianca between 0 and 100),
  notas            text,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);

create index if not exists idx_habilidades_crianca_id
  on habilidades_crianca(crianca_id);

create or replace trigger trg_habilidades_atualizado
  before update on habilidades_crianca
  for each row execute function set_atualizado_em();

-- ─── 3. Programas por criança (instâncias clínicas) ──────────
-- Diferente de `programas` (que é a biblioteca global)
create table if not exists programas_crianca (
  id                 uuid primary key default gen_random_uuid(),
  crianca_id         uuid not null references criancas(id) on delete cascade,
  programa_id        uuid references programas(id) on delete set null,
  nome               text not null,
  dominio            text not null,
  status             program_status not null default 'active',
  taxa_sucesso       smallint not null default 0 check (taxa_sucesso between 0 and 100),
  taxa_independencia smallint not null default 0 check (taxa_independencia between 0 and 100),
  nivel_ajuda        text,
  criterio_meta      text,
  total_sessoes      smallint not null default 0,
  iniciado_em        date,
  concluido_em       date,
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now()
);

create index if not exists idx_programas_crianca_id
  on programas_crianca(crianca_id);

create or replace trigger trg_programas_crianca_atualizado
  before update on programas_crianca
  for each row execute function set_atualizado_em();

-- ─── 4. Alertas clínicos ─────────────────────────────────────
create table if not exists alertas_clinicos (
  id           uuid primary key default gen_random_uuid(),
  crianca_id   uuid not null references criancas(id) on delete cascade,
  titulo       text not null,
  descricao    text not null,
  nivel        alert_level not null default 'low',
  ativo        boolean not null default true,
  resolvido_em timestamptz,
  criado_em    timestamptz not null default now()
);

create index if not exists idx_alertas_crianca_id
  on alertas_clinicos(crianca_id, ativo);

-- ─── 5. Metas clínicas + cache do forecast ───────────────────
create table if not exists metas_clinicas (
  id                     uuid primary key default gen_random_uuid(),
  crianca_id             uuid not null references criancas(id) on delete cascade,
  nome                   text not null,
  tipo                   goal_type not null,
  dominio_alvo           text not null,
  descricao_baseline     text,
  criterio_consolidacao  text,
  habilidades_requeridas text[] not null default '{}',
  programas_relacionados text[] not null default '{}',
  -- cache do forecast (recalculado quando o perfil é atualizado)
  forecast_min           smallint,
  forecast_max           smallint,
  forecast_confianca     forecast_confidence,
  forecast_esforco       forecast_effort,
  saude_meta             goal_health,
  risco_score            smallint,
  revisar_em_sessoes     smallint,
  acao_recomendada       text,
  ativo                  boolean not null default true,
  criado_em              timestamptz not null default now(),
  atualizado_em          timestamptz not null default now()
);

create index if not exists idx_metas_crianca_id
  on metas_clinicas(crianca_id, ativo);

create or replace trigger trg_metas_atualizado
  before update on metas_clinicas
  for each row execute function set_atualizado_em();

-- ─── 6. Vínculo sessão clínica × programa da criança ─────────
create table if not exists sessao_programas (
  id                  uuid primary key default gen_random_uuid(),
  sessao_clinica_id   uuid not null references sessoes_clinicas(id) on delete cascade,
  programa_crianca_id uuid not null references programas_crianca(id) on delete cascade,
  tentativas          smallint not null default 0,
  corretas            smallint not null default 0,
  com_ajuda           smallint not null default 0,
  notas               text
);

create index if not exists idx_sessao_programas_sessao
  on sessao_programas(sessao_clinica_id);

create index if not exists idx_sessao_programas_prog
  on sessao_programas(programa_crianca_id);

-- ============================================================
-- SEED: Lucas
-- Usa os nomes de coluna exatos verificados via information_schema
-- ============================================================
do $$
declare
  v_crianca_id uuid := gen_random_uuid();
begin

  -- criancas: id, responsavel_id, nome, data_nascimento, idade_anos,
  --           diagnostico, observacoes, ativo, criado_em, atualizado_em
  insert into criancas (id, nome, data_nascimento, idade_anos, diagnostico, ativo)
  values (v_crianca_id, 'Lucas', '2022-03-15', 3, 'Perfil em acompanhamento', true);

  -- radar_snapshots: crianca_id, avaliacao_id(null), label,
  --   score_comunicacao, score_social, score_atencao, score_regulacao,
  --   score_brincadeira, score_flexibilidade, score_autonomia, score_motivacao
  insert into radar_snapshots
    (crianca_id, label,
     score_comunicacao, score_social, score_atencao, score_regulacao,
     score_brincadeira, score_flexibilidade, score_autonomia, score_motivacao)
  values
    (v_crianca_id, 'Dia 1',  42, 60, 38, 45, 55, 40, 70, 62),
    (v_crianca_id, 'Dia 15', 48, 63, 44, 49, 58, 43, 72, 64),
    (v_crianca_id, 'Dia 30', 58, 68, 50, 55, 63, 49, 75, 69);

  -- habilidades_crianca: crianca_id, nome, dominio, status
  insert into habilidades_crianca (crianca_id, nome, dominio, status)
  values
    (v_crianca_id, 'Contato visual',            'Interação social',       'acquired'),
    (v_crianca_id, 'Apontar para pedir',         'Comunicação',            'emerging'),
    (v_crianca_id, 'Imitação motora',            'Aprendizagem',           'emerging'),
    (v_crianca_id, 'Seguir instruções simples',  'Atenção e aprendizagem', 'absent'),
    (v_crianca_id, 'Esperar por alguns segundos','Regulação',              'emerging'),
    (v_crianca_id, 'Brincadeira funcional',      'Brincadeira',            'acquired');

  -- programas_crianca: crianca_id, nome, dominio, status,
  --                    taxa_sucesso, taxa_independencia
  insert into programas_crianca (crianca_id, nome, dominio, status, taxa_sucesso, taxa_independencia)
  values
    (v_crianca_id, 'Pedir o que quer',  'Comunicação',     'active',  65, 48),
    (v_crianca_id, 'Esperar 3 segundos','Regulação',       'active',  40, 30),
    (v_crianca_id, 'Troca de turnos',   'Interação social','stalled', 22, 18);

  -- alertas_clinicos: crianca_id, titulo, descricao, nivel
  insert into alertas_clinicos (crianca_id, titulo, descricao, nivel)
  values
    (v_crianca_id, 'Habilidade travada',
      'Troca de turnos permanece abaixo de 25% de sucesso.', 'high'),
    (v_crianca_id, 'Janela de emergência',
      'Apontar para pedir próximo de consolidar.', 'medium'),
    (v_crianca_id, 'Atenção em crescimento',
      'Domínio de atenção subiu nas últimas medições.', 'low');

  -- metas_clinicas: crianca_id, nome, tipo, dominio_alvo,
  --                 habilidades_requeridas, programas_relacionados
  insert into metas_clinicas (crianca_id, nome, tipo, dominio_alvo,
    habilidades_requeridas, programas_relacionados)
  values
    (v_crianca_id, 'Pedir o que quer', 'acquisition', 'communication',
      array['Contato visual','Apontar para pedir'], '{}'),
    (v_crianca_id, 'Esperar 5 segundos', 'replacement', 'regulation',
      array['Esperar por alguns segundos'], '{}'),
    (v_crianca_id, 'Transições mais tranquilas', 'reduction', 'flexibility',
      '{}', array['Troca de turnos']);

end $$;
