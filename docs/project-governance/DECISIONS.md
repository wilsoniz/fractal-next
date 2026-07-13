# Decision Log — Fracta Behavior

**Versão:** 1.0  
**Status:** Oficial  
**Finalidade:** Registrar decisões aprovadas que alteram o produto, a arquitetura, o modelo clínico ou a segurança.

---

## 1. Como usar

Cada decisão deve receber um identificador único.

Formato recomendado:

`DL-AAAA-NNN`

Exemplo:

`DL-2026-001`

Para decisões de domínios específicos, pode-se incluir uma categoria:

- `ARCH` — arquitetura.
- `CLIN` — modelo clínico.
- `SEC` — segurança.
- `DATA` — banco e dados.
- `UX` — interface.
- `DOC` — documentos.
- `BUS` — negócio.

Exemplo:

`DL-2026-ARCH-001`

---

## 2. Template

```markdown
## DL-AAAA-CATEGORIA-NNN — Título

**Data:** AAAA-MM-DD  
**Status:** Proposta | Aprovada | Substituída | Cancelada  
**Responsável:**  
**Escopo:**  

### Contexto

Descrever o problema ou necessidade.

### Decisão

Registrar objetivamente o que foi aprovado.

### Justificativa

Explicar por que a decisão foi tomada.

### Impactos

- Produto:
- Clínica:
- Segurança:
- Banco:
- Interface:
- Documentação:

### Arquivos ou módulos afetados

- 

### Alternativas rejeitadas

- 

### Critérios de validação

- 

### Decisões relacionadas

- 
```

---

## 3. Decisões iniciais consolidadas

## DL-2026-ARCH-001 — Fracta Behavior governa o ecossistema

**Data:** 2026-07-03  
**Status:** Aprovada  
**Escopo:** Institucional e arquitetural

### Decisão

Fracta Behavior é a instituição que governa os produtos Fracta Clinic, Fracta Care, Fracta Engine, Fracta Spark, Fracta Education e Fracta Wallet.

### Impactos

Os produtos devem preservar identidade, responsabilidades e públicos distintos, mantendo integração sob uma arquitetura comum.

---

## DL-2026-CLIN-001 — Prioridade do núcleo clínico sobre IA

**Data:** 2026-07-03  
**Status:** Aprovada  
**Escopo:** Produto e roadmap

### Decisão

O roadmap atual deve priorizar núcleo clínico, fluxos validados, segurança, registro, mensuração e coordenação de caso.

Funcionalidades de IA somente serão adicionadas mediante solicitação e decisão explícitas.

---

## DL-2026-ARCH-002 — Estrutura FCRM

**Data:** 2026-07-04  
**Status:** Aprovada  
**Escopo:** Modelo clínico e dados

### Decisão

O modelo clínico deve seguir a organização conceitual:

`Paciente → Clinical Profile → Clinical Investigations → Evidências → Sessões/Avaliações → Linha de Base → Intervenção → Forecast → Documentos`

Investigações clínicas não são equivalentes a sessões e podem consumir múltiplas evidências.

---

## DL-2026-DOC-001 — Separação do Document Engine

**Data:** 2026-07-04  
**Status:** Aprovada  
**Escopo:** Documentos clínicos

### Decisão

A geração documental deve separar:

1. Composição dos dados.
2. Representação intermediária.
3. Preview.
4. Renderização.
5. Exportação.

Documentos não devem ser montados diretamente dentro da camada de PDF sem uma representação intermediária.

---

## DL-2026-CLIN-002 — Linha de base e intervenção com marcação explícita

**Data:** 2026-07-04  
**Status:** Aprovada  
**Escopo:** Sessões e análise

### Decisão

Linha de base não é sinônimo de avaliação.

A transição entre linha de base e intervenção deve ser explícita, rastreável e passível de marcação manual pelo profissional.

---

## DL-2026-CLIN-003 — Registro objetivo na sessão

**Data:** 2026-07-07  
**Status:** Aprovada  
**Escopo:** Sessão ativa

### Decisão

A sessão deve priorizar registros observáveis e mensuráveis, incluindo antecedentes, respostas, consequências, intervenções, latência, duração, frequência, topografia, assentimento, nível de ajuda e variações após intervenção.

Relato verbal do terapeuta ou responsável é complementar e não deve ser tratado automaticamente como observação direta.

---

## DL-2026-SEC-001 — RLS obrigatória

**Data:** 2026-07-03  
**Status:** Aprovada  
**Escopo:** Segurança e banco

### Decisão

Toda tabela pública que contenha dados pessoais, clínicos ou relacionais deve ter RLS habilitada e políticas explícitas por operação.

Desabilitar RLS não é uma solução aceitável.

---

## DL-2026-DATA-001 — Preferência por encerramento lógico

**Data:** 2026-07-03  
**Status:** Aprovada  
**Escopo:** Dados clínicos

### Decisão

Registros clínicos devem preferir fechamento, arquivamento ou soft delete.

DELETE físico deve ser evitado, exceto em fluxos legalmente definidos e aprovados, como exclusão integral de conta após retenção.

---

## DL-2026-CLIN-004 — Dimensões ABA e compaixão

**Data:** 2026-07-03  
**Status:** Aprovada  
**Escopo:** Modelo clínico

### Decisão

O modelo Fracta deve considerar as sete dimensões clássicas da ABA, acrescidas de compaixão, assentimento, dignidade e segurança como princípios transversais.

---

## DL-2026-BUS-001 — Fracta Care sem assinatura para famílias

**Data:** 2026-07-03  
**Status:** Aprovada  
**Escopo:** Modelo de negócio

### Decisão

O Fracta Care não deve cobrar assinatura das famílias.

A monetização principal ocorre pela conexão, uso profissional, comissão por sessão, supervisão, educação e demais serviços aprovados.

---

## 4. Próximos registros recomendados

Registrar formalmente:

- Hierarquias oficiais de prompting.
- Regras de mastery.
- Política de exclusão e retenção de conta.
- Arquitetura de investigação-evidência.
- Política de auditoria.
- Contrato entre Care, Clinic e Engine.
- Regras de documentos para operadoras.
- Critérios de segurança infantil.
