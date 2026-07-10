# PB-004 · Plano de Implementação

> **Camada: Implementação** (convenção D6) · 10/07/2026
> Ordem das mudanças e arquivos afetados. Especificação: os documentos aprovados da
> PB-004 (imutáveis a partir daqui). Situação não prevista = bloqueio registrado,
> nunca resolvida por conta própria.

## CM-A1 — Correções independentes (remover o que mente)

1. **Reset de senha** — criar `src/app/care/nova-senha/page.tsx` (destino do e-mail
   de recuperação; hoje 404).
2. **Alterar senha funcional** — `src/app/care/dashboard/perfil/page.tsx` (D-P4);
   no mesmo arquivo: remover toggles decorativos de notificação e widget de
   gamificação (D-P2/D-P3).
3. **Suspensões na Home** — `src/app/care/dashboard/page.tsx`: remover atividades
   default sintéticas + contadores de fallback (D-H4), widget de gamificação e
   card do Engine (D-H6). Estado vazio honesto.
4. **Agenda só com eventos reais** — `src/app/care/dashboard/agenda/page.tsx`:
   remover geração de sugestões sintéticas e placeholder de sessão clínica (D-AG1).
5. **Badge incondicional** — `src/app/care/dashboard/layout.tsx` (aba Avaliação).
6. **Página órfã** — remover `src/app/care/progresso/` e diretório vazio
   `src/app/care/avaliacao/`.

*Build · teste · commit por bloco lógico.*

## CM-A2 — Decisões das telas (reconstruir estrutura)

Ordem: Home → Atividades → Avaliação → Meu Filho → Agenda → Guia → Perfil.

- **Home** — `dashboard/page.tsx`: D-H1 (só estado atual; stats históricos saem),
  D-H2 (radar → link p/ Avaliação), D-H3 (forecast completo → vitrine de 1 linha),
  D-H5 (fim do blend 70/30; consome leitura canônica).
- **Atividades** — `dashboard/atividades/page.tsx` + `atividade/page.tsx`:
  D-A2 (consistência primeiro), D-A3 (ajuda ≠ erro nas agregações), D-A4
  (tendência, não última sessão), D-A6 (fim da auto-criação de plano).
- **Avaliação** — `dashboard/avaliacao/page.tsx`: D-AV3 (números com significado),
  D-AV4 (linguagem da triagem — sem selos nosológicos + enquadramento), D-AV5
  (forecast entra, voz care), D-AV6 (exporta leitura p/ Home), D-AV8 (laudos saem).
- **Meu Filho** — `dashboard/meu-filho/page.tsx`: D-MF4 (radar/histórico/forecast/
  contadores saem), D-MF5 (recebe custódia dos laudos — form vindo da Avaliação).
- **Agenda** — `dashboard/agenda/page.tsx`: D-AG4 (exporta próximo compromisso).
- **Guia** — `dashboard/aprendizado/page.tsx` + label no `layout.tsx`: D-GF2 (nome
  único), D-GF3 (sem progresso fictício).
- **Perfil** — já coberto em A1; conferir D-P1 (nada da criança).

**Bloqueios previstos (aguardam decisão/conteúdo — não implementar):** finalidade
clínica e critérios por atividade (D-A1/A5/A10 — dependem do catálogo, DEP-5);
textos interpretativos definitivos (DEP-8); rótulo "Engine" (DEP-6); exibir/ocultar
Guia no teste; notificações reais.

## CM-B — Dívidas arquiteturais (agendar; schema via SQL Editor com o Wil)

- Unificação `perfis`×`profiles` (dois caminhos de cadastro divergentes).
- Extração do motor adaptativo de `dashboard/avaliar/page.tsx` para `src/lib/`.
- Integração Clinic↔Care: sessões reais na Agenda, bloco "Do Terapeuta", vínculo
  terapeuta como registro (DEP-10).
- Verificações de RLS: co-responsável enxerga criança (DEP-9); `triagens`,
  `avaliacoes`, `agenda_eventos`, `gamificacao`, `convites`.
- Navegação mobile — Agenda alcançável (D-AG5).
- Modelo legado `planos.programa_id` (dívida compartilhada com o Clinic).
