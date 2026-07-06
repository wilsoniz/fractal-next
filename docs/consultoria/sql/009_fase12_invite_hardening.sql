-- ============================================================
-- CONSULTORIA — Fase 12 — endurecimento do resgate de convite
-- Aplicar no SQL Editor (após 000..008). Só substitui a função (aditivo).
-- Recusa contas de PROFISSIONAL de resgatar convite de paciente.
-- ============================================================

create or replace function public.fn_fit_redeem_invite(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_inv public.fit_patient_invites;
begin
  if v_uid is null then return jsonb_build_object('ok',false,'reason','unauthenticated'); end if;
  -- conta de profissional não pode virar paciente
  if exists (select 1 from public.fit_profiles where id = v_uid and role = 'professional') then
    return jsonb_build_object('ok',false,'reason','is_professional'); end if;
  -- 1 conta = 1 paciente
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

notify pgrst, 'reload schema';
