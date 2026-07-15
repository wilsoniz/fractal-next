# ADR-FIT-010 — Avaliação Segmentada, Assimetria e IMC Derivado

- **Status:** Aceito
- **Data:** 2026-07-14
- **Escopo:** Plataforma de Consultoria (isolada do Fracta Behavior)
- **Fase:** 16

## Contexto

O contrato original de `fit_measurements` representa séries globais, mas não
distingue região, segmento, lado anatômico, papel clínico, protocolo ou exercício
de origem. Usar apenas `metric` mistura valores tecnicamente diferentes e impede
acompanhar assimetria com segurança.

## Decisão

Estender `fit_measurements` com campos nullable de contexto anatômico, lado, papel
clínico, método, protocolo e exercício de origem. Cada lado continua sendo uma
medição independente. Diferenças e índices são derivados na leitura e nunca
persistidos como uma terceira medição.

`side` representa localização anatômica (`left`, `right`, `bilateral`, `custom`).
`clinical_role` representa contexto (`dominant`, `non_dominant`, `affected`,
`unaffected`, `operated`, `contralateral`, `custom`). Os dois podem coexistir.

## Comparabilidade

Comparação automática exige igualdade de categoria, métrica, rótulo personalizado,
unidade, região, segmento, articulação, ponto, protocolo, método, origem de
exercício e contexto JSONB canônico. Lado e papel clínico são eixos comparados, não
parte da identidade técnica base. Grupos ausentes, ambíguos ou inseguros retornam
“Dados não comparáveis automaticamente” com motivo.

Não se presume equivalência de equipamento por nome. Quando uma medição declara
origem em exercício, ambos os valores precisam referenciar o mesmo item da
biblioteca.

## Cálculos derivados

- diferença absoluta: `abs(a - b)`;
- diferença relativa: `abs(a - b) / max(abs(a), abs(b)) × 100`;
- índice afetado/não afetado: `afetado / não_afetado × 100`.

Denominador zero torna o cálculo indisponível. Não há classificação automática.

## IMC

IMC é derivado por data de referência. Para uma avaliação, peso da própria
avaliação tem prioridade; depois, usa-se o peso global anterior mais recente em
medição ou check-in. Altura é a medição global mais recente até a data. Medidas
futuras, laterais ou segmentares são ignoradas. O resultado inclui as fontes e não
é persistido. Entradas manuais antigas de `bmi` permanecem como legado, sem serem
usadas no cálculo.

## Modelo corporal futuro

Os campos preparam mapa corporal navegável, dor por região, força por lado,
mobilidade articular, composição segmentar e histórico visual. Nenhuma ilustração
ou modelo gráfico do corpo integra esta fase.

## Princípio clínico

“A plataforma mensura diferenças entre lados, mas não presume que simetria seja
sempre o objetivo.”

## Compatibilidade e isolamento

Campos novos são nullable, sem backfill. Medições antigas permanecem globais.
RLS, DELETE de correção, avaliações, treinos e runner não mudam. A implementação
usa somente tabelas `fit_*`, componentes `Fit*` e arquivos da Consultoria.
