# CM-LP-A1 · Integridade das Landing Pages — Inventário de Afirmações

> **Camada: Implementação** · 11/07/2026 · Lista exigida antes da edição: cada
> afirmação problemática e sua ação — REMOVER / REESCREVER / MARCAR COMO FUTURO.
> Sem redesenho das landings; estrutura e visual preservados.

## Home institucional (`src/app/page.tsx`)

| # | Afirmação / problema | Ação |
|---|---|---|
| H1 | Link "Saiba mais do Spark" → `/spark` (rota inexistente, 404) | REMOVER o link; card Spark ganha selo "Em desenvolvimento" |
| H2 | Card Care: "Conexão com o terapeuta da criança" (bloco "Em breve" no produto) | MARCAR COMO FUTURO ("· em breve") |
| H3 | Engine: "Matching inteligente — conecta a demanda da família ao perfil do terapeuta" (Marketplace inexistente) | MARCAR COMO FUTURO ("· em desenvolvimento") |
| H4 | Engine: "Radar compartilhado — mesmos dados... para família e terapeuta" (integração Clinic↔Care não existe) | MARCAR COMO FUTURO ("· em desenvolvimento") |
| H5 | CSS órfão: `.platform-section`/`.engine-inner` definidos e nunca aplicados → desktop em coluna mobile | CORRIGIR (aplicar grid real; remover CSS morto) |
| H6 | Card Care na cor `#1D9E75` (verde Clinic) — identidade Care é `#2BBFA4` | CORRIGIR |
| H7 | Footer: "Privacidade" e "Termos" → `#` | REMOVER até existirem páginas reais (item 3 da ordem geral) |
| H8 | "© 2025" | CORRIGIR → 2026 |
| — | Headline institucional | NÃO ALTERAR (decisão do Wil: revisão posterior, não bloqueia) |

## /captura (`src/app/captura/page.tsx`)

| # | Afirmação / problema | Ação |
|---|---|---|
| C1 | "4.800+ Famílias ativas" (fabricado; pré-lançamento) | REMOVER |
| C2 | "40+ Atividades" (não comprovável sem acesso ao catálogo real) | REMOVER |
| C3 | Trio de stats do hero | REESCREVER com fatos: "Gratuito para famílias · Sem cartão · ~3 minutos" |
| C4 | Depoimentos fictícios (Mariana A., Ricardo F., Camila S.) + seção "O que os pais dizem" | REMOVER seção inteira + âncoras de menu |
| C5 | FAQ: "A avaliação **inicial** é mesmo gratuita? ... **primeiras** atividades — sem pagar nada" (insinua cobrança futura de famílias; contradiz decisão FIRME) | REESCREVER: "O FractaCare é gratuito para famílias." — sem hedge |
| C6 | "14 perguntas simples... menos de 2 minutos" (o instrumento é adaptativo, ~35 perguntas-base filtradas por idade) | REESCREVER: "perguntas adaptadas à idade · cerca de 3 minutos" (alinhado à avaliação interna) |
| C7 | Sem metadata própria / sem Open Graph (compartilhamento WhatsApp quebrado) | CORRIGIR: `captura/layout.tsx` com title, description e OG |
| C8 | Footer: "Privacidade" → `#` | REMOVER até existir página real |
| C9 | "© 2025" | CORRIGIR → 2026 |

## /clinic-landing (`src/app/clinic-landing/page.tsx`)

Princípio da edição: separar **Disponível hoje** (organização de pacientes,
avaliações, programas, sessões, registros, relatórios, acompanhamento) de
**Em desenvolvimento / lista de interesse** (Marketplace, matching, indicações,
agenda cheia, senioridade ligada à distribuição). Proposta ao terapeuta autônomo
preservada. Marketplace NÃO é implementado.

| # | Afirmação / problema | Ação |
|---|---|---|
| T1 | "+320 já na plataforma" (fabricado) | REMOVER |
| T2 | Depoimentos fictícios — incl. "Rafael Ferreira, **BCBA**" (credencial verificável falsamente atribuída) | REMOVER seção inteira, imediatamente |
| T3 | Hero: "conecta você a famílias já preparadas pelo FractaCare" (presente falso) | REESCREVER: gestão clínica hoje + ponte com famílias em construção |
| T4 | Trio do hero: "Perfil completo antes da 1ª sessão" / "Seleção por mérito" (marketplace) | REESCREVER: "Gestão clínica completa — disponível hoje · Lógica ABA de ponta a ponta · Marketplace — em desenvolvimento" |
| T5 | Problema 1, solução: "Demanda contínua de famílias qualificadas via FractaEngine" | MARCAR COMO FUTURO ("em desenvolvimento") |
| T6 | Seção "Como funciona" (fluxo do marketplace: seleção → engine sugere → indicações) | MARCAR SEÇÃO COMO FUTURO: selo "Em desenvolvimento — visão do Marketplace" |
| T7 | Seção "Seleção" (níveis de senioridade ligados à distribuição) | MARCAR SEÇÃO COMO FUTURO (mesmo selo) |
| T8 | Ferramentas: "⚡ Captação via Engine — perfil completo antes da primeira sessão" | REESCREVER por ferramenta real: "🎯 Planejamento de sessão — objetivos e programas organizados antes de atender" |
| T9 | Ferramentas: "🔗 Base unificada — dados clínicos alimentam o radar do FractaCare" (integração futura) | REESCREVER: "🔗 Base unificada — todos os dados clínicos da criança em um só lugar" |
| T10 | Seção Ferramentas | MARCAR COMO "Disponível hoje" (selo) |
| T11 | Modelo 01: "Pacientes via Fracta — comissão sobre sessões" | MARCAR COMO FUTURO ("quando o Marketplace estiver disponível") |
| T12 | Modelo 03: "Trilhas contextuais" (produto educacional futuro) | MARCAR COMO FUTURO |
| T13 | CTA final: "Indicações de pacientes qualificados pelo FractaEngine" / "Seleção transparente com nível de senioridade" | REESCREVER: bullets do que existe + "prioridade na lista de interesse do Marketplace" como benefício futuro |
| T14 | Footer: "Privacidade" → `#` | REMOVER até existir página real |
| T15 | "© 2025" | CORRIGIR → 2026 |

## Fora do escopo desta CM (registrado)

- Páginas reais de Privacidade/Termos → item 3 da ordem geral (antes de aquisição pública).
- Metadata do clinic-landing e acabamento visual → item 4 da ordem geral.
- Headline da home → revisão posterior (decisão do Wil).
- Pipeline do Care → CM-CARE-AUTO-01 (próxima frente, sequencial).
