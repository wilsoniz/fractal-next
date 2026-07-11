# CM-CARE-AUTO-01 · Auditoria do Pipeline Avaliação → Atividades

> **Camada: Auditoria (fatos) + plano de implementação** · 11/07/2026
> Documentação exigida ANTES de qualquer edição de código. Fonte: leitura integral
> dos arquivos do fluxo. Pipeline-alvo: avaliação → necessidades → recomendação →
> **aceite da família** → plano → atividade → registro.

## 1. Onde a avaliação salva respostas e scores

**`/care/dashboard/avaliar` (interna, adaptativa)** — ao finalizar:
- INSERT em `radar_snapshots` (8 scores) — a leitura canônica de estado;
- INSERT em `avaliacoes` (respostas brutas + 8 scores + `score_geral`,
  `tipo='care_internal'`, `origem='web'`) — a evidência (D-AV1 já respeitada no dado);
- depois: botão → `/care/dashboard/avaliacao` (aba). **Fim.**
- ⚠️ Os dois inserts **ignoram `error`** — falha de RLS seria silenciosa.

**`/captura/avaliacao` (funil público)** — INSERT anônimo em `avaliacoes` +
`sessionStorage`; no cadastro (`/captura/resultado`) cria `criancas` +
`radar_snapshots` e marca `avaliacoes.convertido`.

## 2. Como o domínio prioritário é calculado

Menor score do último `radar_snapshot`, em dois lugares independentes:
- Home: `gerarMensagemEngine` (só a frase de orientação);
- `/care/atividade`: `criarPlanoInicial` (ordena os 8 scores asc → menor domínio).
Não há conceito persistido de "necessidade" — o cálculo é efêmero e refeito.

## 3. Como atividades são selecionadas

`programas` WHERE `dominio = prioritário` AND `nivel = 'iniciante'` AND `ativo`
LIMIT 1 — **uma** atividade, sem alternativas, sem motivo exibido à família.

## 4. Onde planos são criados

Exclusivamente em `/care/atividade` (satélite de Atividades), em 3 ramos:
(a) `planoId` na URL → usa existente; (b) `programaId` → cria se não existir;
(c) fallback `criarPlanoInicial`. Nos ramos (b)/(c) a criação ocorre **no
carregamento da página, antes de a família ver qualquer coisa** — início silencioso
(violação da D-A6, ainda vigente no código).

## 5. Onde o pipeline para (diagnóstico)

1. **Ruptura pós-avaliação:** a avaliação termina numa tela de resultado que aponta
   para a aba Avaliação. **Não existe ponte** avaliação → recomendação → atividade.
   A família precisa descobrir sozinha o botão de atividade (a restauração de
   11/07 criou o convite na Home, mas ainda sem motivo nem aceite).
2. **Não existe o passo de aceite:** quando a família chega em `/care/atividade`,
   o plano já nasceu (silencioso). Não há "por quê" nem escolha.
3. **Risco de RLS na ESCRITA (verificação necessária no banco):** a leitura foi
   corrigida (acesso via RLS), mas os INSERTs de `planos` e `sessoes` feitos pelo
   responsável podem falhar para criança FFS (`responsavel_id = null`, ex.:
   Sebastião) se as policies de INSERT exigirem `criancas.responsavel_id = auth.uid()`
   sem considerar `crianca_responsaveis`. RLS sem policy = **0 linhas sem erro**
   (armadilha conhecida) — e os inserts do fluxo ignoram `error`.

### SQL de verificação para o Wil (SQL Editor)

```sql
select tablename, policyname, cmd, qual, with_check
from pg_policies
where tablename in ('planos','sessoes','avaliacoes','radar_snapshots')
order by tablename, cmd;
```

Pergunta a responder: as policies de **INSERT** dessas 4 tabelas aceitam um
responsável vinculado só por `crianca_responsaveis`? Se não, precisamos de policies
novas (schema/SQL = Wil) antes de o pipeline funcionar para crianças FFS.

## 6. Tabelas e funções participantes

`avaliacoes` · `radar_snapshots` · `criancas` · `crianca_responsaveis` · `planos` ·
`programas` · `sessoes` — e as funções `calcularScores` (avaliar),
`criarPlanoInicial` (atividade), `carregarDados` (Home/Atividades).

## 7. Diferenças por origem da criança

| Origem | Vínculo | Leitura | Escrita (planos/sessoes) |
|---|---|---|---|
| Criada no Care | `criancas.responsavel_id = pai` | ✅ | presumida ✅ (fluxo original) |
| Criada no Clinic/FFS | `responsavel_id = null`; vínculo em `crianca_responsaveis` | ✅ (corrigida 11/07) | ❓ **verificar policies** (§5.3) |
| Convite (co-responsável) | `crianca_responsaveis` tipo secundário | ✅ (DEP-9) | ❓ idem |

## 8. Desenho da restauração (a implementar nesta CM)

Nova etapa de **Recomendação com aceite**, dentro de `/care/atividade` (satélite de
Atividades — o aceite/execução pertence a ela; a leitura que a origina pertence à
Avaliação):

1. Avaliação concluída → tela de resultado ganha CTA **"Ver recomendação"** →
   `/care/atividade?criancaId=X`.
2. `/care/atividade` **deixa de criar plano no load**. Sem plano: fase nova
   `recomendacao` — *"Com base nas suas respostas, **{domínio}** parece ser uma boa
   prioridade para começar. Selecionamos práticas simples para o cotidiano."* +
   atividade candidata (nome, objetivo, tempo) + botões **"Começar esta prática"**
   (só aqui o INSERT de `planos` acontece, com `error` tratado e mensagem visível)
   e **"Agora não"** (volta ao painel).
3. Home: "Começar primeira atividade" passa pela recomendação (mesmo fluxo), nunca
   direto à execução.
4. Todos os INSERTs do fluxo (avaliar, planos, sessoes) passam a tratar `error`
   com mensagem visível — fim das falhas mudas.

**Regras herdadas:** sem atividade fictícia; sem início silencioso (D-A6 finalmente
implementada); família vê o motivo e aceita; funciona sem terapeuta; RLS decide
acesso; falha sempre visível. **Fora de escopo:** queixas, Perguntas Clínicas,
Spark, Marketplace, Development Map (espec registrada à parte — upgrade seguinte
da seleção).

## 9. Validação obrigatória (roteiro)

concluir avaliação → ver prioridade → receber recomendação com motivo → aceitar →
executar atividade → confirmar registro na aba Atividades. (Execução autenticada:
teste manual do Wil + smoke técnico das rotas.)
