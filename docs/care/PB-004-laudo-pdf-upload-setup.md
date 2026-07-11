# PB-004 · Upload de PDF de Laudo — Setup (infra) + Plano (app)

> **Camada: Implementação** (convenção D6) · 10/07/2026
> Bloco pequeno, separado dos contratos BLQ-1/2/3. Anexar PDF de laudo **nunca
> existiu** (auditoria §3.7); é a pendência "Upload do arquivo de laudo → implementação
> futura" registrada na Revisão de Meu Filho (D-MF5). Custódia: **Meu Filho**.
> Divisão de responsabilidade (guardrails CLAUDE.md): **infra Supabase = Wil (SQL
> Editor)**; **app = Claude**.

## Convenção de caminho (o app e as policies precisam concordar)

- Bucket: **`laudos`** (privado).
- Caminho do arquivo: **`{crianca_id}/{timestamp}-{nome}.pdf`**
  → o 1º segmento da pasta é o `crianca_id`, usado pelas policies.
- A coluna `laudos.arquivo_url` guarda **o caminho** (não uma URL pública); o app gera
  uma **signed URL** temporária para exibir (bucket privado).

## PARTE 1 — SQL para o Wil rodar (SQL Editor)

> Revisar os nomes de tabela/coluna contra o schema real antes de rodar — o
> `database.types.ts` está desatualizado (não lista `laudos`), então confirme.

```sql
-- 1) Coluna do caminho do arquivo (idempotente)
alter table public.laudos
  add column if not exists arquivo_url text;

-- 2) Bucket privado para os PDFs de laudo
insert into storage.buckets (id, name, public)
values ('laudos', 'laudos', false)
on conflict (id) do nothing;

-- 3) Policies de acesso ao bucket 'laudos'
--    Acesso = ser responsável da criança (dona do 1º segmento do caminho).
--    Vínculo: criancas.responsavel_id (primário) OU crianca_responsaveis (secundário).

-- LER (gerar signed URL / baixar)
create policy "laudos_select_responsavel"
on storage.objects for select to authenticated
using (
  bucket_id = 'laudos'
  and (
    (storage.foldername(name))[1] in (
      select id::text from public.criancas where responsavel_id = auth.uid()
    )
    or (storage.foldername(name))[1] in (
      select crianca_id::text from public.crianca_responsaveis where responsavel_id = auth.uid()
    )
  )
);

-- ENVIAR (upload)
create policy "laudos_insert_responsavel"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'laudos'
  and (
    (storage.foldername(name))[1] in (
      select id::text from public.criancas where responsavel_id = auth.uid()
    )
    or (storage.foldername(name))[1] in (
      select crianca_id::text from public.crianca_responsaveis where responsavel_id = auth.uid()
    )
  )
);

-- REMOVER (apagar um upload errado)
create policy "laudos_delete_responsavel"
on storage.objects for delete to authenticated
using (
  bucket_id = 'laudos'
  and (
    (storage.foldername(name))[1] in (
      select id::text from public.criancas where responsavel_id = auth.uid()
    )
    or (storage.foldername(name))[1] in (
      select crianca_id::text from public.crianca_responsaveis where responsavel_id = auth.uid()
    )
  )
);
```

Depois de rodar: **recarregar o schema cache do PostgREST** (Dashboard → API → Reload)
se a coluna nova não aparecer de imediato.

**Checklist de confirmação (Wil → Claude):**
- [ ] `laudos.arquivo_url` existe (text)
- [ ] bucket `laudos` criado e **privado**
- [ ] 3 policies aplicadas (select/insert/delete) — conferir em `pg_policies` / Storage
- [ ] nomes `criancas.responsavel_id` e `crianca_responsaveis.crianca_id/responsavel_id`
      conferem com o schema real

## PARTE 2 — Plano do app (Claude, após confirmação)

Arquivo: `src/app/care/dashboard/meu-filho/page.tsx` (custódia — D-MF5).

1. **Upload no formulário de laudo:** input `type="file" accept="application/pdf"`;
   ao salvar, `supabase.storage.from('laudos').upload('{crianca_id}/{ts}-{nome}.pdf', file)`;
   grava o caminho em `laudos.arquivo_url` no insert existente.
2. **Exibição:** em cada laudo com `arquivo_url`, botão "📄 Ver PDF" que chama
   `createSignedUrl(arquivo_url, 3600)` e abre em nova aba.
3. **Validação:** só PDF, limite de tamanho (ex.: 10 MB), mensagem de erro clara.
4. **Sem novo modelo de dados** além da coluna `arquivo_url` já prevista.
5. Cadência: `tsc --noEmit` → `next build` → smoke test → commit → push.

*Fora de escopo deste bloco:* outros tipos de documento (relatórios escolares, exames,
vídeos) previstos na D-MF5 ampliada — entram depois, reusando o mesmo bucket/padrão.
