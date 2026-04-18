/**
 * API Route: GET /api/forecast/[criancaId]
 * src/app/api/forecast/[criancaId]/route.ts
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

import {
  calcularForecast,
  type RadarSnapshot,
  type DadosSessao,
} from '@/lib/fracta/forecast'

export async function GET(
  _req: Request,
  context: { params: Promise<{ criancaId: string }> }
) {
  try {
    const { criancaId } = await context.params
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch {
              // Em Route Handler, às vezes não precisa persistir cookies manualmente.
            }
          },
        },
      }
    )

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    const { data: crianca, error: criancaError } = await supabase
      .from('criancas')
      .select('id, responsavel_id')
      .eq('id', criancaId)
      .eq('responsavel_id', user.id)
      .single()

    if (criancaError || !crianca) {
      return NextResponse.json(
        { error: 'Criança não encontrada.' },
        { status: 403 }
      )
    }

    const { data: snapshots, error: snapshotsError } = await supabase
      .from('radar_snapshots')
      .select('*')
      .eq('crianca_id', criancaId)
      .order('criado_em', { ascending: false })
      .limit(3)

    if (snapshotsError) {
      console.error('[API/forecast] Erro ao buscar snapshots:', snapshotsError)
      return NextResponse.json(
        { error: 'Erro ao buscar snapshots.' },
        { status: 500 }
      )
    }

    const quatorzeDiasAtras = new Date()
    quatorzeDiasAtras.setDate(quatorzeDiasAtras.getDate() - 14)

    const { data: sessoesRecentes, error: sessoesRecentesError } =
      await supabase
        .from('sessoes')
        .select('id')
        .eq('crianca_id', criancaId)
        .gte('criado_em', quatorzeDiasAtras.toISOString())

    if (sessoesRecentesError) {
      console.error(
        '[API/forecast] Erro ao buscar sessões recentes:',
        sessoesRecentesError
      )
      return NextResponse.json(
        { error: 'Erro ao buscar sessões recentes.' },
        { status: 500 }
      )
    }

    const { data: todasSessoes, error: todasSessoesError } = await supabase
      .from('sessoes')
      .select('id')
      .eq('crianca_id', criancaId)

    if (todasSessoesError) {
      console.error(
        '[API/forecast] Erro ao buscar todas as sessões:',
        todasSessoesError
      )
      return NextResponse.json(
        { error: 'Erro ao buscar sessões.' },
        { status: 500 }
      )
    }

    const dadosSessao: DadosSessao = {
      total_sessoes: todasSessoes?.length ?? 0,
      sessoes_ultimos_14d: sessoesRecentes?.length ?? 0,
    }

    const forecast = calcularForecast(
      criancaId,
      (snapshots ?? []) as RadarSnapshot[],
      dadosSessao
    )

    return NextResponse.json({ forecast })
  } catch (err) {
    console.error('[API/forecast] Erro:', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}