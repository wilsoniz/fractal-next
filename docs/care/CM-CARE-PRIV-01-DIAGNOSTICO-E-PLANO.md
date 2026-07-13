# CM-CARE-PRIV-01 · Desativação e Exclusão de Conta — Diagnóstico e Plano Faseado

> **Camada: Auditoria (diagnóstico) + plano para aprovação** · 12/07/2026
> Spec do Wil (mensagem 12/07) é a fonte normativa. **Nada aqui foi implementado.**
> Nenhuma migration será executada sem aprovação. Sem `DELETE CASCADE` amplo, sem
> apagar `auth.users` antes dos dados, sem `service_role` no client.

## 1. Mapa das tabelas afetadas (verificado por código)

### Grupo FAMÍLIA (dados do Care — candidatos a exclusão definitiva)
| Tabela | Referência | Observações |
|---|---|---|
| `profiles` | `id = auth.users.id` | perfil do responsável. ⚠️ existe caminho legado gravando em **`perfis`** (login) — dívida B já registrada; a exclusão precisa cobrir as duas |
| `criancas` | `responsavel_id` | ⚠️ crianças de origem Clinic/FFS têm `responsavel_id = null` — NÃO pertencem à família e NÃO podem ser excluídas pelo fluxo Care |
| `crianca_responsaveis` | `crianca_id`, `responsavel_id` | vínculos (primário/secundário/terapeuta_ffs) |
| `convites` | `crianca_id`, `criado_por`, `usado_por` | |
| `avaliacoes` | `crianca_id`, `responsavel_id` | evidências (respostas brutas) |
| `radar_snapshots` | `crianca_id` | leituras |
| `triagens` | `crianca_id`, `responsavel_id` | sensível (rastreio) |
| `laudos` | `crianca_id`, `responsavel_id`, `arquivo_url` | + objetos no bucket `laudos` |
| `sessoes` | `crianca_id`, `responsavel_id`, `plano_id` | práticas da família |
| `planos` | `crianca_id`, (`terapeuta_id`) | ⚠️ MISTO: planos do Care (gerado_por='engine', terapeuta_id null) vs planos clínicos (terapeuta_id preenchido) |
| `agenda_eventos` | `crianca_id`, `responsavel_id` | |
| `gamificacao`, `conquistas`, `checkins` | `responsavel_id` (+`crianca_id`) | |

### Grupo CLÍNICO (produzido por profissional — retenção própria, NÃO excluir pelo Care)
`planos` com `terapeuta_id`, `sessao_tentativas`, `relatorios_fase`,
`clinical_investigations`, `plano_protocolos`/`plano_programas` e demais tabelas do
Clinic ligadas à criança. **Regra:** exclusão da conta Care nunca apaga registro
clínico sob guarda profissional; na exclusão de família, dados clínicos são
**desvinculados da identidade familiar** (ver §4), não destruídos.

### Storage
- Bucket **`laudos`** (privado, caminho `{crianca_id}/…`) — único bucket conhecido no
  código do Care. Descoberta necessária para outros (avatares? clinic?).

### Auth
- `auth.users` — **por último**, via backend privilegiado (Edge Function), nunca client.

## 2. Descoberta pendente (SQL do Wil — fase 0, antes de qualquer migration)

```sql
-- FKs que apontam para criancas / profiles / auth.users (mapa completo de dependências)
select conrelid::regclass as tabela, conname, pg_get_constraintdef(oid) as def
from pg_constraint
where contype = 'f'
  and (confrelid in ('public.criancas'::regclass, 'public.profiles'::regclass)
       or pg_get_constraintdef(oid) ilike '%auth.users%');

-- Buckets existentes
select id, name, public from storage.buckets;

-- Triggers e crons existentes
select event_object_table, trigger_name from information_schema.triggers
where trigger_schema = 'public';
select * from cron.job;  -- se pg_cron estiver habilitado
```

## 2b. Descoberta da F0 já confirmada (12/07/2026)

- **`criancas.responsavel_id` → FK `perfis(id)` ON DELETE CASCADE.** Duas
  consequências graves: (a) o perfil canônico do banco é **`perfis`** (legado), não
  `profiles` — a unificação (trilha B) vira pré-requisito ou co-entrega desta CM;
  (b) **já existe um cascade perigoso em produção**: deletar uma linha de `perfis`
  apaga as crianças em cascata (e o que mais depender de `criancas`). O fluxo de
  exclusão NÃO deve se apoiar nesse cascade — a ordem controlada por etapas (§
  "Ordem da exclusão") permanece obrigatória, e vale avaliar trocar o cascade por
  `ON DELETE RESTRICT` quando a Edge Function assumir a exclusão.
- `leads` sem constraint única em `email` (e com duplicatas) — tabela de marketing;
  entra no grupo "exclusão definitiva" do titular.

## 3. Riscos de integridade identificados

1. **Criança compartilhada**: criança com 2 responsáveis (convite) — excluir a conta
   de UM responsável não pode apagar a criança do outro. Regra: apagar apenas o
   vínculo; a criança segue com o outro responsável. Criança órfã de família (0
   vínculos e responsavel_id null do excluído) → entra no fluxo de exclusão/anonimização.
2. **Criança com terapeuta ativo**: dados clínicos preservados; identidade familiar
   removida/anonimizada. Precisa de definição de "anonimizado" real (não só apagar nome).
3. **FKs sem CASCADE** (provável): a ordem de deleção deve ser filhos→pais
   (tentativas→sessões→planos→…→criança→perfil→auth). O mapa da fase 0 dita a ordem exata.
4. **`perfis` legado**: caminho de cadastro antigo grava lá; exclusão precisa varrer.
5. **RLS atual não tem policies de DELETE de família** na maioria das tabelas —
   exclusão via backend privilegiado resolve isso por design (nenhum DELETE direto do client).

## 4. Classificação dos dados (aplicando a spec)

- **Exclusão definitiva:** profiles/perfis do titular, criancas de família (sem
  vínculo clínico com obrigação), crianca_responsaveis, convites, avaliacoes,
  radar_snapshots, triagens, sessoes de prática, planos do Care, agenda_eventos,
  gamificacao/conquistas/checkins, objetos do bucket `laudos` do titular.
- **Anonimização:** métricas agregadas/analíticas — hoje o Care não mantém
  analytics separado; avaliar se há algo a anonimizar (provavelmente nada na fase 1).
  Regra da spec respeitada: remover nome/e-mail ≠ anonimizar.
- **Retenção restrita:** `account_deletion_requests` (auditoria do próprio pedido,
  com prazo), registros clínicos sob guarda profissional (desvinculados da
  identidade familiar), logs mínimos de segurança. Cada retenção com motivo e prazo
  em `retention_summary`.

## 5. Plano faseado (aprovação por fase; commits separados)

**F0 — Descoberta e decisões (sem código de produto)**
SQL da §2 executado pelo Wil; mapa final de FKs/buckets/triggers; decisões em aberto
(§7). Entregável: adendo a este doc com o mapa completo.

**F1 — Schema e estados (migration via SQL Editor, aprovada antes)**
- `profiles`: `account_status` (`active|pending_deletion|deletion_cancelled|deleting|deleted|retained_partially`),
  `deletion_requested_at`, `scheduled_deletion_at`, `deletion_cancelled_at`, `deletion_completed_at`.
- Tabela `account_deletion_requests` (campos da spec; IP/user-agent **fora** da v1 —
  só entram se o Wil definir finalidade+prazo).
- RLS: titular vê/cria/cancela apenas a própria solicitação; ninguém marca a própria
  como concluída; execução definitiva só via `service_role` (Edge Function).
  ⚠️ Aplicar a regra anti-recursão (função SECURITY DEFINER se precisar consultar
  tabelas com policies que apontam de volta).

**F2 — Bloqueio de conta `pending_deletion` (app + RLS)**
- Gate no login/layout do Care: conta em `pending_deletion` só vê a tela
  "Sua conta está programada para exclusão em DD/MM/AAAA" + "Cancelar exclusão e
  recuperar conta" (com reautenticação).
- RLS restritiva de escrita para contas em `pending_deletion` (nenhum INSERT/UPDATE
  de dados operacionais) — via função `conta_ativa()` SECURITY DEFINER.

**F3 — UI `/care/configuracoes/privacidade`**
- Seção "Zona de risco": Desativar temporariamente · Remover perfil da criança ·
  **Desativar e excluir minha conta** (rótulo exato da spec).
- Textos da spec (encerramento imediato, janela de 15 dias, retenções legítimas,
  registros clínicos com guarda própria).
- Confirmação: reautenticação (senha atual) + checkbox + digitar `EXCLUIR` + botão
  destrutivo. Sem chamadas administrativas do client — só cria a solicitação.
- Fluxo separado "Remover perfil da criança": pré-visualização do que será
  excluído/mantido (mapa da F0), bloqueio se houver vínculo clínico com guarda até
  decisão do Wil sobre o desfecho (desvincular vs. negar).
- "Solicitar cópia dos meus dados": na v1, **registro do pedido + resposta manual**
  (arquitetura preparada para export automatizado na fase própria — ver F6).

**F4 — Executor privilegiado (Edge Function `process-account-deletion`)**
- Roda com `service_role` no servidor; idempotente; máquina de estados
  `pending_deletion → deleting → deleted|retained_partially`, `processing_error` por etapa.
- Ordem: bloquear → cancelar comunicações → dados operacionais → Storage → vínculos
  criança/terapeuta → retenções justificadas → registrar → `auth.users` por último.
- Proteção contra dupla execução (lock por `request_id` + checagem de estado).

**F5 — Agendamento + e-mails**
- Job: **Supabase Cron/pg_cron** diário chamando a Edge Function para solicitações
  com `scheduled_for <= now()` (15 dias após pedido) + lembrete D-2.
- E-mails transacionais (6 templates da spec) — sem dados sensíveis de criança.
  ⚠️ Decisão do Wil: provedor de e-mail (hoje só há o e-mail de auth do Supabase).

**F6 — Exportação de dados automatizada (entrega separada)**
Geração no servidor, link temporário com expiração, registro de solicitação/download.
Fica fora da v1 (spec permite), arquitetura preparada na F1 (tabela de solicitações
genérica ou campo `type` em requests).

**Testes (critérios de aceite 1–16 da spec):** solicitação, cancelamento, expiração,
falha+retomada, dupla execução, RLS cruzada, criança compartilhada, criança com
terapeuta, conta bloqueada não escreve, build verde.

## 6. Estratégia de segurança (resumo)
Client cria/cancela solicitações (RLS do titular). Toda exclusão real é servidor
(Edge Function + `service_role` em secret). Reautenticação recente exigida para
solicitar e para cancelar. Auditoria mínima em `account_deletion_requests`.

## 7. Decisões que são do Wil (bloqueiam fases específicas)
1. **Criança com vínculo clínico ativo**: exclusão da família desvincula e anonimiza
   a identidade familiar, ou nega até o fim do vínculo? (bloqueia F3/F4)
2. **Provedor de e-mail transacional** (bloqueia F5; F1–F4 seguem sem).
3. **Desativação temporária**: apenas `ativo=false` + logout, ou também silenciar
   notificações futuras? (leve; bloqueia parte da F3)
4. **IP/user-agent na solicitação**: fora da v1, confirmar.
5. **Prazo de retenção** do registro da solicitação após conclusão (sugestão: 5 anos,
   defesa de direitos — confirmar).

---

*Aguardando aprovação do plano (e resultados da F0) para iniciar a F1. Nenhuma
migration, rota ou tela foi criada.*
