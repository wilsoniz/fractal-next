# VISION — Plataforma de Consultoria

**Status:** Aprovado
**Produto:** Plataforma de Consultoria
**Leitura obrigatória:** qualquer Codex, Claude Code ou outro agente que trabalhe
na Consultoria deve ler este documento antes de propor ou executar mudanças.

## Identidade e isolamento

A Consultoria é um produto independente do Fracta Behavior. Possui domínio,
entidades, regras, componentes, documentação e evolução técnica próprios.

Nenhuma entidade, regra, componente ou lógica clínica do Fracta pode ser
reutilizada automaticamente. Qualquer agente de código deve manter os dois
produtos separados. O compartilhamento limita-se à infraestrutura genérica já
aprovada, sem criar dependência de domínio.

Enquanto os produtos estiverem no mesmo repositório, alterações da Consultoria
ficam restritas a:

- `src/app/consultoria/`;
- `src/components/fit/`;
- `src/lib/fit/`;
- `docs/consultoria/`;
- tabelas `fit_*`.

Não alterar rotas, componentes, tabelas, middleware, autenticação ou bibliotecas
clínicas do Fracta. `supabase/schema.sql` não é a fonte das migrations da
Consultoria e não deve ser alterado por fases deste produto.

## Finalidade

A Consultoria organiza serviços de treino, performance, reabilitação,
fisioterapia e bem-estar. Deve reduzir trabalho administrativo, preservar
especificidade técnica, organizar ativos reutilizáveis e manter histórico
confiável de prescrições e execuções.

## Princípio de produtividade

O profissional não deve perder tempo digitando algo que o sistema possa gerar ou
reutilizar com segurança. Informações recorrentes devem ser pesquisáveis,
selecionáveis e personalizáveis, sem ocultar decisões relevantes.

## Princípio de especificidade

A padronização nunca deve eliminar diferenças tecnicamente relevantes. A
plataforma organiza variações; não as apaga. Equipamento, implementação,
lateralidade, pegada, posição, amplitude, inclinação, marca ou modelo podem
identificar ativos distintos.

A composição conceitual é:

`Movimento-base → Variação específica → Implementação → Equipamento → Lateralidade → Detalhes técnicos → Método → Blocos → Prescrição por lado`

A evolução deve preservar como referência o item específico, o equipamento e,
quando aplicável, o lado executado. Cargas de equipamentos diferentes não devem
ser agrupadas automaticamente como equivalentes.

## Princípio de composição

O profissional compõe treinos por meio de ativos reutilizáveis:

- exercícios e variações;
- métodos e blocos;
- prescrições por lado;
- grupos;
- templates.

Esses ativos permanecem desacoplados quando representam decisões diferentes.
Supersets, circuitos e EMOM não mudam a identidade técnica do exercício.

## Prescrição assimétrica

A lateralidade da biblioteca descreve o que o exercício permite. A prescrição
define como uma pessoa o executará: bilateralmente, apenas de um lado, dos dois
lados com a mesma prescrição ou com prescrições diferentes.

Diferenças entre lados devem ser estruturadas, nunca depender apenas de notas.
Prescrições e registros devem permitir análises futuras de força, carga, dor,
mobilidade e assimetria por lado ou por membro afetado/não afetado.

## Preservação histórica

Prescrições e execuções passadas não podem depender da permanência ou edição de
um ativo reutilizável. Ao usar a biblioteca, a prescrição mantém snapshots de
nome, vídeo e instruções. O registro mantém identificadores e snapshots do
exercício, bloco e lado. Mudanças posteriores não reescrevem o histórico.

## Autonomia profissional

A biblioteca apoia, mas não substitui, o trabalho profissional. Deve ser possível:

- favoritar ativos globais;
- criar e arquivar variações próprias;
- personalizar detalhes técnicos;
- usar exercício manual;
- escolher ou personalizar métodos e blocos;
- prescrever lados de forma independente.

Ativos personalizados pertencem ao autor e não aparecem para outros
profissionais.

## Segurança e evolução

A Consultoria aplica menor privilégio, RLS explícita, isolamento entre
profissionais, validação de autoria, snapshots e arquivamento lógico. Pacientes
não acessam diretamente a biblioteca; a prescrição é autossuficiente.

Mudanças estruturais devem ser aditivas, rastreáveis, documentadas em ADR e
aprovadas. Conteúdo global deve ser revisado por profissional; o sistema não deve
inventar classificações ou equivalências técnicas.

## Modelo corporal futuro

Uma fase futura poderá introduzir mapa corporal e visualizações próprias para:

- medidas segmentares;
- dor por região;
- força por lado;
- mobilidade e amplitude por articulação;
- assimetrias;
- relatórios visuais inspirados em necessidades de avaliação corporal, sem copiar
  produtos existentes.

A Fase 14 apenas estrutura os dados necessários. Não implementa modelo corporal
visual.

## Fora de escopo automático

Esta visão não autoriza integração com entidades clínicas do Fracta, mudanças de
auth ou middleware, inteligência artificial, diagnóstico automatizado ou
substituição do julgamento profissional.
