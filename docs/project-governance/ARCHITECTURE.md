# Arquitetura do Fracta Behavior

**Status:** Documento-base  
**Finalidade:** Registrar a arquitetura técnica atual do ecossistema Fracta.  
**Regra:** Este documento descreve o estado vigente. Mudanças arquiteturais aprovadas devem ser registradas em `DECISIONS.md`.

---

## 1. Visão geral

Fracta Behavior é a instituição que governa um ecossistema de produtos voltados à organização clínica, coordenação do cuidado e apoio ao trabalho de terapeutas, famílias e supervisores.

Produtos principais:

- **Fracta Clinic:** ambiente profissional para terapeutas e supervisores.
- **Fracta Care:** ambiente de famílias e responsáveis.
- **Fracta Engine:** camada de organização clínica, evidências, construção de caso e previsibilidade.
- **Fracta Spark:** atividades digitais destinadas à criança.
- **Fracta Education:** cursos, supervisões e evolução profissional.
- **Fracta Wallet:** camada financeira em evolução.

---

## 2. Stack principal

- Next.js 16+
- React 19
- TypeScript
- Tailwind CSS v4
- Supabase
- PostgreSQL
- Vercel

Repositório principal: `fracta-next`.

---

## 3. Princípios arquiteturais

1. Separação entre interface, lógica clínica, persistência e geração documental.
2. Autorização baseada no vínculo entre usuário, papel e criança/paciente.
3. RLS como camada obrigatória de proteção do banco.
4. Mudanças de banco somente por migrations aditivas.
5. Soft delete ou encerramento lógico em registros clínicos.
6. Rastreabilidade de autoria e atualização.
7. Compatibilidade progressiva com dados existentes.
8. Fluxos clínicos não devem depender de IA.
9. Alterações pequenas, revisáveis e reversíveis.

---

## 4. Estrutura funcional

### 4.1 Fracta Clinic

Responsável por:

- Dashboard do profissional.
- Cadastro e acompanhamento de pacientes.
- Sessões.
- Programas.
- Objetivos clínicos.
- Avaliações.
- Investigações clínicas.
- Biblioteca científica.
- Supervisão.
- Relatórios e documentos.
- Forecast clínico.
- Financeiro futuro.

Rotas conhecidas incluem:

- `/clinic/dashboard`
- `/clinic/paciente/[id]`
- `/clinic/programas`
- `/clinic/avaliacoes`
- `/clinic/biblioteca`

Esta lista deve ser validada no repositório antes de qualquer alteração.

### 4.2 Fracta Care

Responsável por:

- Cadastro de responsáveis e crianças.
- Atividades recomendadas.
- Registro familiar.
- Radar e acompanhamento.
- Conexão com profissionais.
- Consentimento, privacidade e gestão da conta.

Rotas conhecidas incluem:

- `/care`
- `/care/dashboard`
- `/captura`
- `/captura/avaliacao`
- `/captura/resultado`

### 4.3 Fracta Engine

Responsável por organizar:

- Perfil clínico.
- Investigações clínicas.
- Evidências.
- Sessões.
- Avaliações.
- Linha de base.
- Intervenções.
- Forecast.
- Documentos clínicos.

O Engine não deve ser tratado como um agente autônomo. Ele organiza dados e regras aprovadas.

### 4.4 Fracta Spark

Responsável por atividades digitais enviadas ou configuradas pelo terapeuta, incluindo tarefas de aprendizagem e matching-to-sample.

---

## 5. Modelo de autenticação e autorização

A autenticação utiliza Supabase Auth.

Princípios:

- `auth.uid()` identifica o usuário autenticado.
- Perfis da aplicação devem se vincular ao usuário autenticado.
- O acesso clínico depende do papel e do vínculo autorizado com a criança/paciente.
- RLS deve proteger todas as tabelas expostas.
- `service_role` deve existir apenas em ambiente seguro de servidor.
- O cliente nunca deve decidir sozinho se um usuário pode acessar dados sensíveis.

Antes de qualquer alteração, mapear:

- Providers ativos.
- Fluxo de login e cadastro.
- Middleware.
- Guards.
- Criação de perfil.
- Políticas RLS.
- Funções RPC.
- Uso de clients server-side e client-side.

---

## 6. Modelo de dados conhecido

Entidades centrais:

- `criancas`
- `planos`
- `plano_protocolos`
- `sessao_tentativas`
- `clinical_investigations`
- estruturas de prompts e níveis de dica
- avaliações
- forecast
- logs
- perfis e vínculos profissionais

Esta lista não substitui inspeção do schema real.

Regras:

- `criancas.id` é a referência canônica de paciente nas estruturas clínicas atuais.
- Registros clínicos devem registrar autoria quando aplicável.
- Exclusões físicas devem ser evitadas.
- Fechamento, arquivamento ou soft delete são preferíveis.

---

## 7. FCRM — organização clínica

Fluxo conceitual:

`Paciente → Clinical Profile → Clinical Investigations → Evidências → Sessões/Avaliações → Linha de Base → Intervenção → Forecast → Documentos`

Princípios:

- Investigação clínica não é sinônimo de sessão.
- Uma investigação pode consumir múltiplas evidências.
- Evidências podem vir de diferentes fontes.
- Linha de base não é sinônimo de avaliação.
- Mudanças de fase devem ser explícitas e rastreáveis.
- A interpretação clínica continua sob responsabilidade profissional.

---

## 8. Sessão ativa

A sessão ativa deve organizar, quando aplicável:

1. Preparação.
2. Assentimento e disponibilidade.
3. Pairing.
4. Instrumentos previstos.
5. Avaliação funcional ou observações planejadas.
6. Programas e intervenções.
7. Registro de eventos e tentativas.
8. Encerramento.
9. Síntese e relatório.

A timeline deve favorecer registros objetivos de antecedentes, respostas, consequências, latências, duração, frequência, qualidade de resposta e nível de ajuda.

---

## 9. Programas e prompting

Estruturas conhecidas:

- DTT.
- NET.
- Matching.
- Task analysis.
- Duration.
- Frequency.
- Programas verbais e não verbais.

Hierarquias de dica devem ser definidas por domínio e tipo de resposta.

Critérios de domínio não devem ser alterados sem decisão clínica registrada.

---

## 10. Document Engine

O Document Engine deve separar:

1. Coleta e composição de dados.
2. Representação intermediária do documento.
3. Preview.
4. Renderização final.
5. Exportação para PDF.

Documentos previstos:

- Relatório de sessão.
- Relatório de fase.
- PEI/PIC.
- Avaliação.
- Reavaliação.
- Evolução para plano de saúde.
- Declarações.
- Pareceres.
- Encaminhamentos.
- Alta.

---

## 11. Forecast

O Forecast Engine organiza sinais como:

- Aquisição.
- Substituição.
- Redução.
- Generalização.
- Manutenção.
- Readiness.
- Support.
- Generalization.
- Status do programa.
- Risco.
- Ação recomendada.
- Revisão após sessões.

Forecast é apoio à decisão. Não substitui julgamento clínico.

---

## 12. Segurança e privacidade

Dados do Fracta podem incluir informações sensíveis de saúde e desenvolvimento infantil.

Requisitos mínimos:

- RLS ativa.
- Políticas por operação.
- Validação no servidor.
- Controle de papéis.
- Auditoria.
- Minimização de dados.
- Retenção definida.
- Possibilidade de desativação e exclusão conforme política aprovada.
- Proteção contra acesso cruzado entre famílias e profissionais.
- Logs sem dados sensíveis.
- Segredos apenas no servidor.

---

## 13. Procedimento para atualizar este documento

Atualizar este arquivo quando:

- Um novo módulo for criado.
- Uma responsabilidade mudar de produto.
- Uma entidade central for introduzida.
- Um fluxo de autenticação ou autorização mudar.
- Uma decisão arquitetural for aprovada.

Toda mudança relevante deve também gerar entrada em `DECISIONS.md`.
