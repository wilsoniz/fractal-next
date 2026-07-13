<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. APIs, conventions, caching, routing and rendering may differ from older Next.js versions.

Before writing or refactoring code, always consult the relevant documentation inside:

`node_modules/next/dist/docs/`

Never assume older Next.js behavior.

Respect deprecation warnings.
<!-- END:nextjs-agent-rules -->

# AGENTS.md — Fracta Behavior

## Hierarquia documental

Antes de uma tarefa, o agente deve consultar:

1. `AGENTS.md` para regras obrigatórias de trabalho.
2. `docs/project-governance/DECISIONS.md` para decisões oficiais.
3. `docs/project-governance/ARCHITECTURE.md` para a visão arquitetural consolidada.
4. `docs/project-governance/CLINICAL_MODEL.md` para os princípios clínicos.
5. A documentação específica existente em `docs/` para o módulo afetado.
6. O código, o schema e as migrations reais como fonte do estado implementado.

Os documentos de governança não substituem a documentação técnica detalhada existente.

Em caso de divergência:

- a decisão oficial mais recente prevalece sobre documentação antiga;
- código, schema e migrations descrevem o estado implementado;
- a divergência deve ser relatada antes de qualquer alteração;
- o agente não deve corrigir automaticamente a divergência sem aprovação.

## 1. Finalidade

Este arquivo define as regras obrigatórias para qualquer agente de código que trabalhe no repositório do Fracta Behavior.

Antes de iniciar uma tarefa, leia também:

- `docs/project-governance/ARCHITECTURE.md`
- `docs/project-governance/CLINICAL_MODEL.md`
- `docs/project-governance/DECISIONS.md`

Se houver conflito entre documentos, prevalece a decisão mais recente registrada em `docs/project-governance/DECISIONS.md`,desde que não contrarie requisitos de segurança .

---

## 2. Projeto

Fracta Behavior é um ecossistema clínico para organização, mensuração e coordenação do trabalho baseado em Análise do Comportamento Aplicada.

Produtos principais:

- Fracta Clinic — terapeutas e supervisores.
- Fracta Care — famílias e responsáveis.
- Fracta Engine — organização clínica, evidências e construção de caso.
- Fracta Spark — atividades destinadas à criança.
- Fracta Education — formação, cursos e supervisões.
- Fracta Wallet — fluxos financeiros futuros ou em integração.

O sistema não substitui o raciocínio clínico. Ele deve apoiar mensuração, organização, rastreabilidade, previsibilidade e tomada de decisão baseada em evidências.

---

## 3. Prioridades

Toda alteração deve priorizar, nesta ordem:

1. Segurança e privacidade dos dados.
2. Integridade clínica e científica.
3. Preservação dos fluxos existentes.
4. Clareza e simplicidade da interface.
5. Manutenibilidade.
6. Performance.
7. Escalabilidade.

Não adicionar funcionalidades de IA sem solicitação explícita.

---

## 4. Stack

- Next.js 16+
- React 19
- TypeScript
- Tailwind CSS v4
- Supabase
- PostgreSQL
- Vercel

Antes de usar APIs do Next.js, leia a documentação correspondente em `node_modules/next/dist/docs/`.

---

## 5. Fluxo obrigatório antes de qualquer alteração

Antes de alterar qualquer código:

1. Ler `AGENTS.md`.
2. Ler os documentos relevantes em `/docs`.
3. Mapear os arquivos relacionados à tarefa.
4. Explicar o comportamento atual.
5. Identificar riscos técnicos, clínicos e de segurança.
6. Listar exatamente os arquivos que pretende modificar.
7. Descrever a estratégia de implementação.
8. Aguardar aprovação explícita.

Não começar a implementação antes da aprovação.

---

## 6. Regras de implementação

Sempre:

- Reutilizar componentes e padrões existentes.
- Preservar a arquitetura atual.
- Fazer alterações pequenas e incrementais.
- Manter tipagem forte.
- Evitar duplicação.
- Manter consistência visual.
- Preservar compatibilidade com dados existentes.
- Limitar mudanças ao escopo aprovado.

Nunca:

- Remover funcionalidades sem aprovação explícita.
- Fazer refatorações amplas junto com correções pequenas.
- Introduzir dependências sem justificar.
- Criar atalhos que reduzam segurança ou rastreabilidade.
- Alterar comportamento não relacionado ao pedido.

---

## 7. Segurança

Nunca, sem autorização explícita:

- Alterar autenticação.
- Alterar providers de autenticação.
- Alterar middleware de autorização.
- Desabilitar RLS.
- Remover políticas RLS.
- Expor `service_role`.
- Colocar segredos no cliente.
- Registrar tokens, dados clínicos ou dados pessoais em logs.
- Criar bypass de autorização.
- Executar comandos destrutivos no banco.

Preferir:

- Menor privilégio possível.
- Soft delete.
- Auditoria.
- Rastreabilidade.
- Separação entre cliente e servidor.
- Validação no servidor.
- Políticas explícitas por operação.

---

## 8. Banco de dados

Não alterar sem autorização explícita:

- Schema do Supabase.
- Tabelas.
- Colunas.
- Tipos.
- Triggers.
- Funções.
- Políticas RLS.
- Migrations já aplicadas.

Quando uma mudança for aprovada:

- Criar nova migration.
- Nunca editar migration histórica já aplicada.
- Explicar impacto e estratégia de rollback.
- Garantir compatibilidade com dados existentes.
- Não executar migration em produção sem autorização explícita.
- Não apagar dados reais.

---

## 9. Rotas

Nunca, sem aprovação explícita:

- Remover rotas.
- Renomear rotas.
- Alterar contratos públicos.
- Modificar navegação principal.
- Mudar comportamento de guards.

Toda nova rota deve respeitar autenticação, autorização, layout e convenções existentes.

---

## 10. Autenticação

Nunca, sem aprovação explícita:

- Modificar login, signup ou logout.
- Alterar providers.
- Alterar recuperação de senha.
- Alterar confirmação de e-mail.
- Alterar middleware.
- Alterar criação de sessão.
- Alterar vínculo entre `auth.users` e perfis.
- Alterar guards por papel.

---

## 11. Validação após implementação

Após qualquer alteração aprovada:

1. Executar lint.
2. Executar typecheck, quando disponível.
3. Executar build.
4. Rodar testes relevantes.
5. Revisar o diff.
6. Informar arquivos alterados.
7. Resumir impactos.
8. Apontar riscos e pendências.

Comandos usuais:

```bash
npm run lint
npm run typecheck
npm run build
```

Se algum comando não existir, verificar `package.json` e usar o equivalente disponível.

Nunca fazer commit ou push sem autorização explícita.

---

## 12. Interface

A UI do Fracta deve ser:

- Clara.
- Profissional.
- Minimalista.
- Consistente.
- Orientada à produtividade.
- Acessível.
- Responsiva.

Evitar:

- Excesso de decoração.
- Elementos visuais sem função.
- Fluxos longos sem necessidade.
- Alterações globais de estilo para resolver problemas locais.

---

## 13. Regras clínicas

O sistema deve favorecer:

- Observação direta.
- Registro objetivo.
- Mensuração.
- Replicabilidade.
- Construção de caso.
- Coordenação clínica.
- Tomada de decisão baseada em dados.
- Assentimento e segurança.
- Generalização e manutenção.

Evitar que decisões clínicas dependam apenas de relato verbal ou inferências não sustentadas.

Mudanças em modelos clínicos, critérios de domínio, linha de base, intervenções, prompting, avaliações ou documentos clínicos exigem análise explícita de impacto.

---

## 14. IA

Não criar recursos de IA espontaneamente.

O foco atual é:

- Núcleo clínico.
- Fluxos validados.
- Segurança.
- Registro.
- Mensuração.
- Coordenação de caso.

IA é uma camada posterior e somente deve ser implementada quando solicitada explicitamente.

---

## 15. Regra de parada

Se houver dúvida sobre:

- Segurança.
- Autenticação.
- Banco.
- RLS.
- Arquitetura.
- Modelagem clínica.
- Migração.
- Perda de dados.
- Impacto em rotas.

Pare a implementação, explique o problema e aguarde aprovação.
