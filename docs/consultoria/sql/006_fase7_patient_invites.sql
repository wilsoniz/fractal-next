-- ============================================================
-- CONSULTORIA — Fase 7 — convite/token de paciente (ver ADR-FIT-002)
-- Aplicar no SQL Editor (após 000..005). Aditivo e isolado do Fracta.
-- Convive com fn_fit_link_self (auto-vínculo por email) da Fase 4.
-- ============================================================

create table if not exists public.fit_patient_invites (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.fit_patients(id) on delete cascade,
  professional_id uuid not null references public.fit_profiles(id) on delete cascade,
  token           uuid not null default gen_random_uuid() unique,
  email           text,
  status          text not null default 'pending' check (status in ('pending','accepted','revoked')),
  expires_at      timestamptz not null default (now() + interval '7 days'),
  accepted_by     uuid,
  accepted_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_fit_invites_patient on public.fit_patient_invites(patient_id);
create index if not exists idx_fit_invites_token on public.fit_patient_invites(token);
create trigger trg_fit_invites_updated before update on public.fit_patient_invites
  for each row execute function public.fn_fit_set_updated_at();
alter table public.fit_patient_invites enable row level security;
-- Só o profissional dono lê/cria/edita (revoga). Paciente usa apenas as funções abaixo.
create policy fit_invites_select on public.fit_patient_invites for select
  using (professional_id = auth.uid());
create policy fit_invites_insert on public.fit_patient_invites for insert
  with check (professional_id = auth.uid()
    and patient_id in (select id from public.fit_patients where professional_id = auth.uid()));
create policy fit_invites_update on public.fit_patient_invites for update
  using (professional_id = auth.uid()) with check (professional_id = auth.uid());
-- sem DELETE (revogar = status='revoked')

-- ── Info do convite (tela de aceite) ──
create or replace function public.fn_fit_invite_info(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_inv public.fit_patient_invites; v_patient text; v_prof text; v_status text;
begin
  select * into v_inv from public.fit_patient_invites where token = p_token;
  if not found then return jsonb_build_object('status','invalid'); end if;
  select full_name into v_patient from public.fit_patients where id = v_inv.patient_id;
  select full_name into v_prof from public.fit_profiles where id = v_inv.professional_id;
  v_status := v_inv.status;
  if v_status = 'pending' and v_inv.expires_at <= now() then v_status := 'expired'; end if;
  return jsonb_build_object(
    'status', v_status,
    'expires_at', v_inv.expires_at,
    'patient_name', v_patient,
    'professional_name', v_prof
  );
end; $$;
grant execute on function public.fn_fit_invite_info(uuid) to authenticated;

-- ── Resgate do convite (vincula a conta à ficha) ──
create or replace function public.fn_fit_redeem_invite(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_inv public.fit_patient_invites;
begin
  if v_uid is null then return jsonb_build_object('ok',false,'reason','unauthenticated'); end if;
  -- 1 conta = 1 paciente (mantém getLinkedPatient().maybeSingle() seguro)
  if exists (select 1 from public.fit_patients where user_id = v_uid) then
    return jsonb_build_object('ok',false,'reason','already_linked'); end if;
  select * into v_inv from public.fit_patient_invites where token = p_token;
  if not found then return jsonb_build_object('ok',false,'reason','invalid'); end if;
  if v_inv.status = 'revoked'  then return jsonb_build_object('ok',false,'reason','revoked');  end if;
  if v_inv.status = 'accepted' then return jsonb_build_object('ok',false,'reason','used');     end if;
  if v_inv.expires_at <= now() then return jsonb_build_object('ok',false,'reason','expired');  end if;
  if exists (select 1 from public.fit_patients where id = v_inv.patient_id and user_id is not null) then
    return jsonb_build_object('ok',false,'reason','patient_already_linked'); end if;

  update public.fit_patients set user_id = v_uid where id = v_inv.patient_id;
  update public.fit_patient_invites
    set status='accepted', accepted_by=v_uid, accepted_at=now() where id=v_inv.id;
  return jsonb_build_object('ok',true,'patient_id',v_inv.patient_id);
end; $$;
grant execute on function public.fn_fit_redeem_invite(uuid) to authenticated;
