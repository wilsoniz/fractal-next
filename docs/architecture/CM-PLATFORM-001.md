# CM-PLATFORM-001 — Arquitetura Modular da Fracta Platform

**Etapa:** 1 — Arquitetura

**Status:** Blocos 1, 2 e 3 implementados e validados — aguardando encerramento

**Natureza:** Exclusivamente documental

**Data da fotografia:** 2026-07-20

## 1. Objetivo da milestone

A CM-PLATFORM-001 deve entregar somente a infraestrutura mínima para a aplicação:

1. reconhecer as superfícies de produto Clinic e Care;
2. resolver quais superfícies o usuário autenticado pode acessar;
3. reconhecer, dentro de Clinic, os workspaces clínicos registrados;
4. resolver e selecionar workspace clínico quando necessário;
5. proteger a entrada e a navegação sem criar novas rotas;
6. preservar integralmente os comportamentos e as URLs atuais de Clinic e Care.

Nesta milestone, Care é uma superfície familiar e não um workspace clínico. ABA é o único workspace clínico disponível dentro da superfície Clinic. Esta milestone não pretende resolver toda a arquitetura futura da Fracta Platform; seu limite é preparar os três blocos de implementação descritos neste documento.

## 2. Estado atual observado

### Implementado hoje

- Uma aplicação Next.js 16.2.2 com App Router, React 19, TypeScript, Supabase e PostgreSQL.
- Produtos organizados principalmente por segmentos de rota, com destaque para `/clinic`, `/care` e `/captura`.
- Autenticação compartilhada por Supabase Auth, usando o cliente de `src/lib/supabase.ts`.
- Fluxos de login e cadastro próprios para Clinic e Care.
- Layouts, navegação e linguagem visual distintos para Clinic e Care.
- Verificação de usuário e sessão predominantemente no cliente.
- `src/proxy.ts` responsável somente pelo modo de manutenção; ele não resolve workspace nem protege rotas autenticadas.
- Modelo de identidade híbrido, com coexistência de `profiles` e `perfis`.
- Entidades clínicas e familiares compartilhadas, especialmente `criancas`, avaliações, planos e forecast.
- RLS como camada de autorização de dados, com estado e limitações registrados nos documentos de identidade e segurança.

### Proposta desta milestone

Adicionar em código uma camada mínima de superfícies de produto e, dentro de Clinic, um registro de workspaces clínicos, sem alterar comportamento clínico, familiar, autenticação ou persistência.

### Decisão futura

Qualquer evolução para um modelo persistido de organizações, memberships ou workspaces dependerá de decisão arquitetural específica, auditoria de segurança e autorização para banco e RLS. Essa evolução não é requisito dos três blocos desta milestone.

## 3. Fronteiras atuais

### Implementado hoje

| Fronteira | Localização predominante | Responsabilidade observada |
| --- | --- | --- |
| Clinic ABA | `src/app/clinic` | Operação profissional, pacientes, sessões, programas, avaliações, análise, documentos e supervisão |
| Care | `src/app/care` | Experiência de responsáveis, crianças, atividades, avaliação, agenda, perfil e acompanhamento |
| Aquisição e triagem do Care | `src/app/captura` | Entrada pública, avaliação inicial e resultado |
| Core distribuído | `src/lib`, `src/lib/fracta`, `src/components/fracta`, `src/app/api` | Supabase, regras clínicas, forecast, documentos, relatórios, componentes e APIs compartilhadas |
| Administração | `src/app/admin` | Superfície administrativa separada |
| Consultoria | `src/app/consultoria`, `src/components/fit`, `src/lib/fit` | Produto adjacente com arquitetura própria |
| Institucional | `src/app`, `src/app/clinic-landing`, `src/app/operadoras` | Landing pages e páginas públicas |

As fronteiras são funcionais, mas ainda não existem registros centrais que distingam superfícies de produto e workspaces clínicos, suas entradas ou seus requisitos de acesso.

## 4. Core compartilhado

### Implementado hoje

O Core compartilhado não é um módulo físico único. Ele está distribuído entre:

- autenticação e acesso ao Supabase em `src/lib/supabase.ts`;
- tipos de banco em `src/lib/database.types.ts`;
- investigações, evidências, programas e timeline clínica em `src/lib`;
- forecast em `src/lib/forecast.ts` e `src/lib/fracta/forecast.ts`;
- composição documental em `src/lib/document-engine`;
- relatórios e análise single-case em `src/lib`;
- componentes reutilizados em `src/components/fracta` e `src/components/ui`;
- APIs de paciente, avaliações, forecast e engine em `src/app/api`.

### Proposta desta milestone

O Core receberá apenas contratos e serviços mínimos para:

- registrar superfícies de produto e workspaces clínicos conhecidos;
- obter as superfícies autorizadas para a identidade atual;
- obter os workspaces clínicos autorizados dentro de Clinic;
- decidir entrada direta ou seleção;
- validar se uma rota pertence à superfície e ao workspace clínico autorizados.

Essa adição não transforma o Core em um novo produto nem exige reorganizar os módulos clínicos existentes.

## 5. Clinic ABA

### Implementado hoje

O Clinic possui layout e navegação próprios em `src/app/clinic/layout.tsx`. Sua superfície inclui:

- dashboard;
- pacientes e prontuário por paciente;
- programas, protocolos, matrizes e planos;
- sessão ativa;
- avaliações;
- biblioteca científica;
- evolução e análise;
- agenda;
- Education, supervisão e Wallet.

O layout consulta `profiles` para formar o contexto do profissional. As permissões declaradas nesse layout são baseadas em senioridade e filtram recursos da interface. Elas não substituem autorização de servidor nem RLS.

### Proposta desta milestone

Registrar Clinic como superfície profissional e ABA como seu único workspace clínico disponível, preservar `/clinic/*` e exigir que as resoluções reconheçam o acesso antes da entrada nas rotas protegidas. Nenhuma regra clínica ABA ou permissão clínica será modificada.

## 6. Care

### Implementado hoje

O Care possui login, recuperação de senha, convite, atividade e dashboard próprios. O dashboard inclui:

- início;
- atividades;
- avaliação;
- aprendizado;
- agenda;
- perfil da criança;
- perfil do responsável.

O acesso familiar depende da identidade autenticada e dos vínculos autorizados com a criança. O estado atual desses vínculos e seus riscos está documentado em `IDENTITY_DEPENDENCY_MAP.md` e `CM-IDENTITY-SEC-01-PLANO.md`.

### Proposta desta milestone

Registrar Care como superfície familiar, fora do registro de workspaces clínicos, preservar `/care/*` e manter intactas as regras funcionais, os vínculos familiares e as políticas atuais. A resolução da superfície não criará uma nova prova de vínculo com paciente.

## 7. Superfícies adjacentes

### Implementado hoje

Existem superfícies que não fazem parte do escopo funcional de Clinic ABA ou Care:

- `/admin`;
- `/consultoria`;
- `/captura`;
- `/clinic-landing`;
- `/operadoras`;
- páginas institucionais e legais;
- endpoints em `/api`.

### Proposta desta milestone

O `ProductSurfaceRegistry` deverá classificar somente Clinic e Care. As superfícies adjacentes continuarão com o comportamento atual e não serão absorvidas automaticamente pelos registries.

### Decisão futura

A inclusão de qualquer superfície adjacente no `ProductSurfaceRegistry` dependerá de decisão específica. Marketplace e Spark estão explicitamente fora desta milestone.

## 8. Acoplamentos que afetam a modularização

### Implementado hoje

1. Clinic e Care usam o mesmo cliente Supabase global.
2. Os dois produtos consultam diretamente tabelas compartilhadas.
3. `criancas` é uma entidade comum aos contextos profissional e familiar.
4. `profiles` e `perfis` coexistem como árvores de identidade.
5. Login, cadastro e recuperação estão distribuídos em páginas de produto.
6. Resolução de sessão, perfil e navegação ocorre em componentes de layout no cliente.
7. Permissões visuais do Clinic estão acopladas ao seu layout.
8. Componentes e regras clínicas compartilhados não possuem uma fronteira formal de Core.
9. Rotas atuais funcionam simultaneamente como endereço público, fronteira de produto e entrada de navegação.

### Consequência para esta milestone

Os três blocos devem ser aditivos. As superfícies de produto e os workspaces clínicos não poderão:

- escolher uma tabela de identidade canônica;
- substituir vínculos existentes;
- transformar filtros de UI em autorização;
- alterar consultas clínicas;
- mudar contratos de API;
- mover ou renomear rotas.

## 9. Definição proposta de Workspace

### Proposta desta milestone

A arquitetura distingue dois níveis:

1. **Superfície de produto:** contexto superior da aplicação. Clinic é a superfície profissional; Care é a superfície familiar.
2. **Workspace clínico:** contexto profissional existente somente dentro da superfície Clinic.

Nesta milestone, ambos são definições estáticas em código e não entidades de banco.

Superfícies de produto:

| ID | Tipo | Entrada preservada | Disponibilidade |
| --- | --- | --- |
| `clinic` | Profissional | `/clinic/dashboard` | Disponível |
| `care` | Familiar | `/care/dashboard` | Disponível |

Workspaces clínicos registrados dentro de Clinic:

| ID | Nome | Disponibilidade nesta milestone |
| --- | --- | --- |
| `aba` | ABA | Disponível e funcional |
| `psychotherapy` | Psicoterapia | Reservado e indisponível |
| `occupational_therapy` | Terapia Ocupacional | Reservado e indisponível |
| `speech_therapy` | Fonoaudiologia | Reservado e indisponível |
| `psychopedagogy` | Psicopedagogia | Reservado e indisponível |

Cada definição de superfície deve conter somente identificador, nome, tipo, rota de entrada existente, prefixos de rota e disponibilidade. Cada definição de workspace clínico deve conter somente identificador, nome e disponibilidade.

IDs reservados não autorizam criar módulos, telas vazias, rotas, navegação ou regras clínicas. Care não participa do `ClinicalWorkspaceRegistry`.

Uma superfície ou workspace clínico organiza entrada e navegação. Nenhum deles concede, por si só, acesso a uma criança, paciente, registro clínico ou operação de banco.

### Decisão futura

Disponibilização dos workspaces reservados, persistência de workspaces, organizações, unidades, convites e memberships não será definida nesta etapa.

## 10. Fluxo proposto

### Proposta desta milestone

```text
autenticação da identidade
        ↓
resolução das superfícies autorizadas
        ↓
entrada no Care ou Clinic
        ↓
Care → fluxo familiar atual, sem resolução de workspace clínico
        ↓
Clinic → resolução dos workspaces clínicos autorizados
        ↓
um workspace clínico → entrada direta
mais de um workspace clínico → seleção explícita
```

#### 10.1 Autenticação da identidade

Continuar usando o fluxo vigente do Supabase Auth. A milestone consumirá a identidade autenticada, sem modificar login, cadastro, recuperação, sessão, providers ou vínculo com `auth.users`.

#### 10.2 Resolução das superfícies autorizadas

Após autenticar, um resolvedor em código avaliará o acesso às superfícies já reconhecidas pelo sistema. Ele deverá devolver somente IDs do `ProductSurfaceRegistry` e não dados clínicos.

Os critérios concretos para reconhecer Clinic e Care deverão reutilizar evidências existentes e ser aprovados antes do Bloco 2. O resolvedor não poderá criar vínculo, elevar papel ou usar simples preferência do cliente como prova de autorização.

#### 10.3 Entrada no Care ou Clinic

A superfície autorizada determina o contexto superior. A entrada no Care preserva integralmente o fluxo familiar atual. A entrada no Clinic inicia a resolução dos workspaces clínicos autorizados.

#### 10.4 Resolução dos workspaces clínicos dentro do Clinic

O resolvedor clínico considera somente registros disponíveis do `ClinicalWorkspaceRegistry`. Nesta milestone, apenas `aba` pode ser retornado. Os IDs reservados e indisponíveis nunca aparecem como opção de entrada.

#### 10.5 Entrada direta ou seleção

Quando houver exatamente um workspace clínico autorizado, Clinic entrará diretamente nele pela URL atual. Uma seleção será exibida somente quando houver mais de um workspace clínico disponível e autorizado em etapa futura. A seleção determina o contexto de navegação, não autorização adicional.

## 11. Modelo proposto de autorização

### Proposta desta milestone

A decisão de acesso deve ser composta por camadas, sem fundi-las:

| Camada | Função nesta milestone |
| --- | --- |
| Associação à superfície | Determinar se a identidade pode entrar em Clinic ou Care, usando relações já existentes |
| Associação ao workspace clínico | Dentro de Clinic, determinar se a identidade pode entrar no contexto ABA; workspaces reservados permanecem indisponíveis |
| Papel | Descrever a função reconhecida dentro da superfície e do contexto clínico existentes; não será criado novo catálogo persistido |
| Capacidades | Controlar ações e navegação quando já houver regra aprovada; filtros visuais isolados não serão tratados como segurança |
| Vínculo com paciente | Continuar sendo requisito independente para acessar dados de uma criança ou paciente |
| RLS | Permanecer como proteção obrigatória e autoridade final de acesso aos dados expostos |

O acesso a uma superfície ou workspace clínico não implica acesso universal aos seus dados. A aplicação deve exigir simultaneamente identidade válida, superfície autorizada e, dentro de Clinic, workspace clínico autorizado. Quando aplicável, também permanecem obrigatórios papel, capacidade, vínculo com paciente e aprovação da RLS.

Care não recebe associação a workspace clínico. Seu acesso familiar e seus vínculos atuais permanecem inalterados.

### Decisão futura

A taxonomia definitiva de papéis e capacidades, sua persistência e seu mapeamento para policies exigirão decisão própria. Esta milestone não altera o modelo atual.

## 12. Navegação e rotas

### Implementado hoje

- Clinic usa `/clinic` e `/clinic/*`.
- Care usa `/care` e `/care/*`.
- O funil público do Care usa `/captura/*`.
- Login do Clinic está em `/login`.
- Login do Care está em `/care/login`.

### Proposta desta milestone

- Preservar todas as URLs atuais.
- Não mover rotas nesta milestone.
- Registrar prefixos e entradas existentes no `ProductSurfaceRegistry`.
- Aplicar resolução antes de permitir entrada em superfícies protegidas.
- Manter páginas públicas fora dos guards de superfície e workspace clínico.
- Manter redirecionamentos compatíveis com links existentes.

### Estratégia futura de compatibilidade

Caso uma arquitetura posterior introduza novos endereços, ela deverá manter as URLs atuais por aliases ou redirects explícitos, preservar parâmetros e destinos, e provar compatibilidade antes de qualquer remoção. Essa estratégia não autoriza mudanças de rota nesta milestone.

## 13. Contrato mínimo do Core

### Proposta desta milestone

O Core necessário aos três blocos deve oferecer apenas:

1. `ProductSurfaceDefinition`: definição estática de uma superfície de produto.
2. `ProductSurfaceRegistry`: consulta das superfícies Clinic e Care por ID, rota de entrada e prefixo.
3. `ClinicalWorkspaceDefinition`: definição estática de um workspace clínico e de sua disponibilidade.
4. `ClinicalWorkspaceRegistry`: consulta dos workspaces clínicos registrados dentro de Clinic.
5. Resolução das superfícies autorizadas para a identidade atual.
6. Resolução dos workspaces clínicos autorizados após entrada em Clinic.
7. Decisão entre entrada direta e seleção de workspace clínico.
8. Verificação de compatibilidade entre rota, superfície e workspace clínico resolvidos.

Requisitos do contrato:

- resultado determinístico para a mesma identidade e o mesmo estado de acesso;
- negação segura quando não houver evidência de associação;
- separação entre superfície de produto e workspace clínico;
- Care ausente do `ClinicalWorkspaceRegistry`;
- apenas ABA disponível no `ClinicalWorkspaceRegistry`;
- workspaces reservados impossibilitados de produzir rota, entrada ou opção de seleção;
- nenhuma dependência de dado clínico além da necessária para reconhecer associação já existente;
- nenhuma escrita em autenticação ou banco;
- nenhuma substituição da RLS;
- Clinic e Care desacoplados da implementação interna dos resolvedores.

## 14. Critérios verificáveis de não regressão

### Gerais

- Todas as URLs atuais continuam resolvendo para os mesmos produtos.
- Páginas públicas permanecem acessíveis nas mesmas condições.
- Clinic e Care são reconhecidos como superfícies de produto distintas.
- Care não é classificado nem resolvido como workspace clínico.
- Usuário sem superfície autorizada não entra em rota protegida por manipulação direta da URL.
- Dentro de Clinic, ABA é o único workspace clínico disponível e produz entrada direta.
- `psychotherapy`, `occupational_therapy`, `speech_therapy` e `psychopedagogy` permanecem indisponíveis e não produzem telas, rotas ou opções de seleção.
- A seleção de workspace clínico somente pode ocorrer quando houver mais de um disponível e autorizado.
- Selecionar superfície ou workspace clínico não cria nem modifica perfil, papel, vínculo ou dado clínico.
- Nenhuma alteração de schema, migration, função, trigger, policy ou RLS aparece no diff.

### Clinic ABA

- Login, logout e entrada atual do Clinic continuam funcionando.
- Dashboard, pacientes, prontuário, programas, planos, avaliações, sessão, análise, relatórios e supervisão mantêm rotas e comportamento.
- Registros preservam autoria, paciente, fonte, datas e medidas.
- Permanecem distintas avaliação, linha de base e intervenção.
- Permanecem os registros objetivos de frequência, duração, latência, topografia, nível de ajuda, assentimento e demais medidas existentes.
- Nenhuma regra de prompting, domínio, forecast, programa ou documento clínico é modificada.
- As permissões atuais do Clinic não são ampliadas pelo workspace clínico ABA.
- A resolução de ABA preserva a entrada e todas as rotas atuais de `/clinic`.

### Care

- Login, recuperação, convite, dashboard, atividades, avaliação, agenda e perfil mantêm rotas e comportamento.
- Responsáveis continuam vendo somente crianças autorizadas pelas regras existentes.
- Registros familiares continuam identificáveis como fonte familiar e não são convertidos em observação profissional.
- Nenhum vínculo familiar é criado ou modificado pela resolução da superfície.
- Nenhuma resolução ou seleção de workspace clínico é inserida no fluxo do Care.

### Validação técnica dos blocos futuros

- No Bloco 1, testes cobrem exclusivamente `ProductSurfaceRegistry` e `ClinicalWorkspaceRegistry`.
- Nos blocos posteriores, testes cobrem resolução de superfícies, resolução de zero, um e múltiplos workspaces clínicos, entrada direta, seleção e tentativa de acesso cruzado.
- Lint, typecheck disponível, build e testes relevantes passam.
- O diff confirma ausência de mudanças fora do escopo aprovado de cada bloco.

## 15. Decisões necessárias antes da implementação

1. Aprovar os critérios exatos, baseados no estado atual, que reconhecem associação às superfícies Clinic e Care sem migrar identidade.
2. Aprovar quais rotas são públicas e quais exigem superfície ou workspace clínico.
3. Aprovar onde ocorrerá uma seleção futura quando Clinic tiver mais de um workspace clínico disponível e autorizado.
4. Aprovar o comportamento seguro quando a identidade autenticada não possui superfície ou workspace clínico reconhecido.
5. Confirmar a fronteira entre guard de navegação e RLS, sem usar o guard como substituto de autorização de dados.

Essas decisões são suficientes para os três blocos. Modelo persistido de Workspace e taxonomia definitiva de permissões permanecem decisões futuras.

## 16. Fora do escopo

- criação dos módulos de Psicoterapia, Terapia Ocupacional ou Fonoaudiologia;
- migração ou consolidação de identidade;
- novas tabelas, colunas, funções, triggers ou migrations;
- alterações de policies ou RLS;
- reorganização física ampla de pastas;
- mudança, remoção ou renomeação das URLs atuais;
- alterações clínicas no Clinic ABA;
- alterações funcionais no Care;
- Marketplace;
- Spark;
- mudança de autenticação, providers, login, cadastro, logout ou recuperação;
- implementação nesta etapa documental.

## 17. Plano mínimo de implementação da CM-PLATFORM-001

Cada bloco exige aprovação própria antes de qualquer alteração.

### Bloco 1 — Workspace Registry em código

- Criar `ProductSurfaceDefinition` e `ProductSurfaceRegistry`.
- Registrar Clinic e Care como superfícies de produto, com entradas e prefixos atuais.
- Criar `ClinicalWorkspaceDefinition` e `ClinicalWorkspaceRegistry`.
- Registrar ABA como workspace clínico disponível.
- Registrar `psychotherapy`, `occupational_therapy`, `speech_therapy` e `psychopedagogy` como IDs reservados e indisponíveis.
- Adicionar testes exclusivamente dos dois registries.
- Não integrar navegação, autenticação ou banco neste bloco.

**Entrega verificável:** aplicação reconhece estaticamente Clinic e Care como superfícies e ABA como único workspace clínico disponível, sem alterar comportamento.

### Bloco 2 — Resolução e seleção de workspace

- Implementar os critérios aprovados para resolver superfícies usando somente o estado existente.
- Preservar a entrada no Care sem resolução de workspace clínico.
- Dentro de Clinic, resolver zero, um ou múltiplos workspaces clínicos disponíveis e autorizados.
- Entrar diretamente quando houver um workspace clínico e solicitar seleção somente quando houver mais de um.
- Não gravar seleção, associação, papel ou vínculo no banco.

**Entrega verificável:** identidade autenticada recebe uma superfície autorizada e, dentro de Clinic, uma decisão segura de workspace clínico, sem mudanças em autenticação, banco ou RLS.

### Bloco 3 — Navegação e guards compatíveis

- Integrar a resolução de superfície e workspace clínico às entradas protegidas.
- Bloquear acesso direto a superfície ou workspace clínico não autorizado.
- Preservar rotas, páginas públicas, redirecionamentos e fluxos atuais.
- Validar não regressão de Clinic ABA e Care.

**Entrega verificável:** superfícies e workspace clínico ABA reconhecidos e protegidos sem quebra funcional, mudança de URL ou alteração do Care.

## 18. Registro de implementação do Bloco 1

**Estado:** Implementado e aprovado.

Arquivos criados:

- `src/lib/platform/registry.ts`;
- `src/lib/platform/index.ts`;
- `src/lib/platform/registry.test.mjs`.

Contrato público entregue:

- `ProductSurfaceDefinition`;
- `ProductSurfaceId`;
- `ProductSurfaceRegistry`;
- `ClinicalWorkspaceDefinition`;
- `ClinicalWorkspaceId`;
- `ClinicalWorkspaceRegistry`.

Validação registrada:

- 9 testes dos registries aprovados;
- TypeScript aprovado com `npx tsc --noEmit`;
- lint do escopo `src/lib/platform` aprovado;
- build com Webpack aprovado;
- lint global bloqueado por problemas preexistentes fora do Bloco 1;
- build com Turbopack inconclusivo por travamento, sem erro observado.

O Bloco 1 não integrou autenticação, seleção, guards, navegação, rotas, banco, RLS, Clinic ou Care. Os Blocos 2 e 3 permanecem não iniciados.

## 19. Registro de implementação do Bloco 2

**Estado:** Implementado e aprovado.

Contrato público entregue:

- `PlatformIdentityEvidence`;
- `EntryDecision`;
- `resolveAuthorizedProductSurfaces(identity)`;
- `resolveAuthorizedClinicalWorkspaces(identity, surfaceId)`;
- `resolveEntryDecision(accesses)`.

Critérios provisórios implementados:

- Care exige identidade autenticada e pelo menos uma evidência entre perfil familiar, vínculo direto com criança ou vínculo associativo com criança;
- Clinic exige identidade autenticada, linha em `profiles` e `clinicSeniority !== null`;
- ABA somente é resolvido quando Clinic já está autorizado e `aba` está disponível no `ClinicalWorkspaceRegistry`;
- seleção não concede autorização e as únicas decisões produzidas são `denied`, `direct` e `select`.

O gate de senioridade do Clinic apenas reproduz o comportamento atual do layout. Ele não representa autorização profissional definitiva e não substitui vínculo, autorização de servidor ou RLS.

Validação registrada:

- 24 testes de plataforma aprovados;
- TypeScript aprovado com `npx tsc --noEmit`;
- lint do escopo `src/lib/platform` aprovado;
- `git diff --check` aprovado.

O Bloco 2 não integrou os resolvedores com autenticação, Supabase, páginas, layouts, navegação, rotas, guards, banco ou RLS. O Bloco 3 permanece não iniciado.

## 20. Registro de implementação do Bloco 3

**Estado:** Implementado e aprovado.

Arquivos criados:

- `src/lib/platform/access-evidence.ts`;
- `src/lib/platform/navigation-resolution.ts`;
- `src/lib/platform/navigation-resolution.test.mjs`;
- `src/components/platform/ProductSurfaceEntry.tsx`;
- `src/components/platform/PlatformSurfaceGate.tsx`.

Integrações realizadas:

- resolução de entrada após autenticação em `/login` e `/care/login`;
- gate da superfície Clinic no layout existente de `/clinic/*`;
- gate da superfície Care no layout existente de `/care/dashboard/*`;
- gate da superfície Care na proteção isolada de `/care/atividade`;
- exportação dos contratos de evidência e navegação em `src/lib/platform/index.ts`.

Não foi criado layout global para Care. `/care` preserva o redirecionamento existente, e `/care/login`, `/care/esqueci-senha`, `/care/nova-senha` e `/care/convite/*` permanecem públicas por estrutura.

Validação registrada:

- 42 testes de plataforma aprovados;
- TypeScript aprovado com `npx tsc --noEmit`;
- lint do escopo novo e dos logins alterados aprovado;
- 12 ocorrências preexistentes identificadas nos arquivos legados alterados `src/app/clinic/layout.tsx`, `src/app/care/dashboard/layout.tsx` e `src/app/care/atividade/page.tsx`;
- `git diff --check` aprovado;
- build com Webpack aprovado;
- 64 páginas e todas as URLs existentes preservadas.

O Bloco 3 não alterou banco, schema, migrations, RLS, critérios clínicos, módulos futuros ou disponibilidade de workspaces reservados.

---

Este documento propõe somente a arquitetura necessária aos três blocos. Ele não autoriza implementação, não altera decisões vigentes e deve ser aprovado antes do início de qualquer mudança no projeto.
