# PB-004 · Etapa 9 — Revisão do Perfil

> **Camada: Decisão — APROVADO em 10/07/2026** (convenção D6)
> Aprovação: Wil — D-P1 a D-P4 integrais, sem alterações.
> Referências: Auditoria (Etapa 1, §3.11), Mapa de Missões
> (Etapa 2) e decisões das Etapas 3–8. Modo: **prático**.
> Escopo: exclusivamente a tela Meu Perfil.

**Missão (mapa):** *"Como gerencio a minha conta?"* — cuidar do responsável: dados,
notificações e segurança. ("Minha família" já migrou para Meu Filho na aprovação do
mapa.)

---

## 1. A tela cumpre sua missão?

**No núcleo, sim; nas bordas, promete o que não entrega.** Editar nome funciona e
persiste; sair funciona; a estrutura em três abas (Dados / Notificações / Conta) é
adequada e suficiente. Mas: os quatro toggles de notificação são decorativos (estado
visual fixo, sem ação), o botão "Alterar senha" não faz nada, e o widget de
gamificação exibe números fabricados — três violações do mesmo tipo: controle que
parece funcionar e não funciona.

## 2. O que permanece

- Edição de dados pessoais (funciona e persiste).
- Estrutura de três abas — não precisa de mais.
- Sair da conta.

## 3. Decisões propostas (para aprovação)

- **D-P1 — Perfil é somente a conta do responsável** *(executa o mapa)*. Dados,
  notificações e segurança da própria pessoa. Nada sobre a criança ou sobre quem a
  acompanha — isso é Meu Filho.
- **D-P2 — Nenhum controle decorativo.** Toggle, botão ou widget que não funciona
  não aparece — a versão, em controles, da regra contra conteúdo sintético
  (D-H4/D-AG1/D-GF3). Consequências imediatas: os toggles de notificação só voltam
  quando notificações existirem; "Alterar senha" só existe funcionando.
- **D-P3 — O widget de gamificação sai do Perfil.** Reconhecimento de jornada
  pertence à prática (Atividades), e o modelo está em revisão futura (D-A7). O
  Perfil não exibe pontuações — muito menos fabricadas.
- **D-P4 — Segurança mínima da conta é requisito pré-teste.** Alterar senha
  (botão morto) e recuperar senha (fluxo quebrado, já em A1) são o mesmo tema:
  nenhuma família testa um produto em que não consegue voltar a entrar. Registro do
  requisito; execução na CM de bugs (A1).

## 4. Dependências

| # | Dependência | Onde |
|---|---|---|
| — | Notificações reais (lembretes, resumos) — quando existirem, os controles voltam (D-P2) | Implementação futura |
| — | Alterar/recuperar senha (D-P4) | CM de bugs (A1) |

---

*D-P1 a D-P4 aprovadas integralmente em 10/07/2026 — Etapa 9 encerrada, e com ela a
revisão das sete telas. Encerramento da PB-004: `PB-004-RESUMO-EXECUTIVO.md`.*
