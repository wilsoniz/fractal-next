# ADR-FIT-006 — "Ver como paciente" (preview read-only)

- **Status:** Aceito
- **Data:** 2026-07-04
- **Escopo:** Fracta Consultoria (isolado do Fracta Behavior)

## Contexto

O profissional precisa conferir como o paciente vê os próprios dados, sem trocar de
conta e sem gravar nada.

## Decisão

Preview **read-only** dos dados reais do paciente, **sem impersonation**:
`auth.uid()` continua sendo o profissional. Rota nova
`/consultoria/professional/patients/[id]/preview`, sob o guard do profissional.

- **Read-only por construção:** os componentes de preview só chamam funções de
  **leitura** e não renderizam nenhum controle de escrita (sem concluir treino,
  enviar check-in, upload ou excluir). Onde havia ação → "Preview — ação desativada".
- **Só pacientes do profissional:** `getPatient(id)` retorna null se a ficha não for
  dele (RLS `professional_id = auth.uid()`).

## Nota de segurança (importante)

O read-only é **garantido pela UI**, não pela RLS. O profissional legitimamente tem
acesso de escrita aos dados do seu paciente (por design, para poder registrar em nome
dele). A preview apenas **não oferece** caminho de escrita. Sem SQL, sem mudança de RLS,
sem troca de `auth.uid()`.

## Consequências

- Reusa componentes de leitura (`FitLineChart`, `FitFileGrid` com `canDelete=false`,
  `FitCard`) e libs de leitura. Não reusa `FitWorkoutRunner`/`FitCheckinForm`/
  `FitFileUpload` (têm escrita) — a preview tem telas estáticas próprias.
- As rotas reais `/consultoria/patient/*` não são tocadas.
