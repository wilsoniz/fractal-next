# ADR-FIT-002 — Onboarding de Paciente por Convite/Token

- **Status:** Aceito
- **Data:** 2026-07-04
- **Escopo:** Fracta Consultoria (isolado do Fracta Behavior)
- **Fase:** 7

## Contexto

O vínculo da conta do paciente à ficha `fit_patients` era feito só por
`fn_fit_link_self` (auto-vínculo por email idêntico, Fase 4), que falha quando:
o email da conta difere do email cadastrado, ou há ≥1 ficha com o mesmo email
(nesses casos retorna null e não vincula).

## Decisão

Introduzir **convite por token** como o caminho **robusto e principal** de
onboarding, controlado pelo profissional, mantendo o auto-vínculo por email como
**atalho/fallback**.

- Tabela `fit_patient_invites` (token, expiração, status).
- `fn_fit_redeem_invite(token)` (SECURITY DEFINER): valida e vincula
  `fit_patients.user_id = auth.uid()`.
- `fn_fit_invite_info(token)` (SECURITY DEFINER): dados mínimos para a tela de
  aceite (nome do paciente e do profissional, status, expiração).
- Página de resgate em `/consultoria/convite?token=…` (fora do guard da área do
  paciente, para funcionar com conta ainda não vinculada).

## Regras

- **Expiração:** 7 dias (derivada; sem job — o resgate rejeita expirados).
- **Status:** `pending → accepted | revoked`. Revogar é soft (sem DELETE).
- **1 conta = 1 paciente** (limitação MVP): o resgate recusa se a conta já está
  vinculada, mantendo `getLinkedPatient().maybeSingle()` seguro.
- **Segurança:** paciente nunca acessa `fit_patient_invites` diretamente (RLS
  professional-only); todo o resgate passa pelas funções SECURITY DEFINER.

## Consequências

- Profissional gera/copia/revoga convite no workspace; vê "Convites pendentes"
  no dashboard e o estado de acesso do paciente.
- Convivência: `fn_fit_link_self` (email) roda primeiro; o convite cobre o resto.
- Fora de escopo: 1 paciente vinculado a vários profissionais (exigiria remover a
  regra 1:1 e ajustar `getLinkedPatient`).
