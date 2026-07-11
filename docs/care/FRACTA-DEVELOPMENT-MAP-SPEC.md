# Fracta Development Map — Especificação do Catálogo de Atividades

> **Camada: Decisão (espec de conteúdo)** · 11/07/2026 · Material fornecido pelo Wil.
> Destrava a **DEP-5** (catálogo com finalidades e critérios) e define o alvo do motor
> de recomendação do Care. Princípio estrutural: **não é uma lista de atividades — é
> uma progressão desenvolvimental** (grafo), em que cada atividade tem pré-requisitos,
> idade típica de emergência e relação com habilidades futuras.

## Regra de liberação

A liberação de atividades depende **do repertório atual e dos pré-requisitos**, não
apenas da idade. Idades são referência de desenvolvimento típico, nunca gate.

## Progressão por faixa etária (referencial)

| Faixa | Atividades básicas (exemplos) | Habilidades ABA relacionadas |
|---|---|---|
| 0–6 m | Acompanhar objetos com os olhos; sorrir para pessoas; responder à voz; alcançar brinquedos; explorar texturas | Atenção visual, orientação social, exploração sensorial |
| 6–12 m | Bater palmas; dar tchau; "cadê-achou"; entregar objetos; imitar ações simples; responder ao nome | Imitação motora, atenção compartilhada inicial, comunicação não verbal |
| 12–18 m | Apontar para pedir; apontar para mostrar; encaixar peças grandes; objetos em recipientes; instruções simples; empilhar blocos | Comunicação funcional, seguimento de instruções, coordenação motora fina |
| 18–24 m | Escolher entre duas opções; identificar figuras familiares; brincar funcional; nomear objetos; guardar brinquedos; imitar sequências simples | Mandos iniciais, tato, brincar funcional, autonomia |
| 2–3 a | Pareamento por cor/forma; quebra-cabeças simples; instruções de dois passos; pedir ajuda; esperar pequenos intervalos; turnos | Discriminação, linguagem receptiva, tolerância à espera, interação social |
| 3–4 a | Brincadeira simbólica; emoções básicas; responder perguntas simples; vestir peças simples; recortar com segurança; copiar formas | Linguagem, habilidades sociais, autonomia, motricidade fina |
| 4–5 a | Sequenciar histórias; classificar objetos; jogos com regras simples; escovar dentes c/ supervisão; desenhar figura humana; conversar sobre acontecimentos | Funções executivas emergentes, autocuidado, conversação |
| 5–6 a | Resolver pequenos problemas; escrever o nome; rotinas independentes; jogos cooperativos; planejar pequenas tarefas; autocontrole | Planejamento, autonomia, flexibilidade, autorregulação |

## Pré-requisitos (exemplos do padrão)

- **Apontar para pedir** ← interesse por objetos · contato visual ocasional · alcançar
  objetos · atenção ao adulto
- **Brincadeira simbólica** ← brincadeira funcional consolidada · imitação motora ·
  atenção compartilhada · manipulação adequada de brinquedos
- **Seguir instruções de dois passos** ← seguir um passo independentemente · atenção
  sustentada · discriminação auditiva básica

## Domínios do desenvolvimento (10)

🗣 Comunicação · 👥 Interação social · 🎯 Atenção e aprendizagem · 🧩 Cognição ·
🧸 Brincadeira · ✋ Motricidade fina · 🏃 Motricidade grossa · 😊 Regulação emocional ·
🔄 Flexibilidade · 🏠 Autonomia

> ⚠️ **Decisão pendente (Wil):** o radar atual tem **8** domínios (sem cognição e
> sem as duas motricidades; "motivação" existe no radar e não está nos 10). Definir o
> mapeamento: estender o radar, mapear N→8, ou manter dois vocabulários com ponte.
> Não resolvido por interpretação.

## Níveis de complexidade (5)

1. **Fundacional** (pré-requisitos básicos) · 2. **Emergente** · 3. **Desenvolvimento**
· 4. **Generalização** · 5. **Funcionalidade avançada**

É o eixo que permite ao FractaEngine selecionar automaticamente a próxima atividade
adequada — e substitui a antiga meta universal de 80% (coerente com D-A5: o critério
pertence à finalidade).

## Schema de cada atividade (biblioteca-alvo: ~250–350)

1. idade típica de emergência
2. domínio do desenvolvimento
3. habilidades-alvo
4. pré-requisitos
5. materiais necessários
6. passo a passo para os pais
7. critérios de sucesso
8. adaptações por idade
9. atividades relacionadas (mais fáceis / mais difíceis)
10. vínculo com cúspides comportamentais e comportamentos pivotais

## Insumos existentes

Os **Proto Programas** e **Atividades de Pré-Requisito** já produzidos pelo Wil são a
matéria-prima; o Map os transforma em grafo de desenvolvimento.

## Posição no roadmap

- **Não bloqueia a CM-CARE-AUTO-01**: o pipeline Avaliação → Recomendação → Aceite é
  restaurado com o catálogo atual (`programas`); o Map é o upgrade seguinte da
  seleção (níveis + pré-requisitos + grafo).
- Alinhamento com a PB-004: D-A1 (finalidade clínica declarada), D-A5 (critério por
  finalidade), D-A10 (contexto cotidiano), D-AV7 (necessidades → objetivos),
  ciclo conceitual (Evidências → Leituras → Necessidades → Objetivos → Intervenções).
