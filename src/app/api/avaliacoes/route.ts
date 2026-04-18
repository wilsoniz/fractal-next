/**
 * API Route: POST /api/avaliacoes
 * src/app/api/avaliacoes/route.ts
 *
 * Recebe respostas do questionário interno do FractaCare,
 * calcula scores via FractaEngine e persiste em:
 *   - avaliacoes (novo registro)
 *   - radar_snapshots (novo snapshot vinculado)
 *
 * Autenticação: Supabase session (cookie) obrigatória.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calcularScores, RespostaBruta } from '@/lib/fracta/scoring'

// ─────────────────────────────────────────────
// TIPOS DO BODY DA REQUISIÇÃO
// ─────────────────────────────────────────────

type AvaliacaoPayload = {
  crianca_id: string
  idade_anos: number
  respostas: RespostaBruta[]
  origem?: 'care_internal' | 'care_checkin'
}

// ─────────────────────────────────────────────
// POST /api/avaliacoes
// ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
    // ── 1. Verificar sessão autenticada
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Não autenticado. Faça login para continuar.' },
        { status: 401 }
      )
    }

    const responsavel_id = session.user.id

    // ── 2. Parsear e validar body
    const body: AvaliacaoPayload = await req.json()
    const { crianca_id, idade_anos, respostas, origem = 'care_internal' } = body

    if (!crianca_id || !idade_anos || !respostas?.length) {
      return NextResponse.json(
        { error: 'Dados incompletos. crianca_id, idade_anos e respostas são obrigatórios.' },
        { status: 400 }
      )
    }

    // ── 3. Verificar que a criança pertence ao responsável logado
    const { data: crianca, error: criancaError } = await supabase
      .from('criancas')
      .select('id, nome, responsavel_id')
      .eq('id', crianca_id)
      .eq('responsavel_id', responsavel_id)
      .single()

    if (criancaError || !crianca) {
      return NextResponse.json(
        { error: 'Criança não encontrada ou acesso negado.' },
        { status: 403 }
      )
    }

    // ── 4. Calcular scores via FractaEngine
    const resultado = calcularScores(respostas, idade_anos)

    // ── 5. Salvar na tabela avaliacoes
    const { data: avaliacao, error: avaliacaoError } = await supabase
      .from('avaliacoes')
      .insert({
        crianca_id,
        responsavel_id,
        nome_crianca: crianca.nome,
        idade_crianca: idade_anos,
        respostas: respostas, // jsonb — salva raw para auditoria
        tipo: 'rapida',
        origem,
        ...resultado.para_avaliacoes,
        convertido: false,
      })
      .select('id')
      .single()

    if (avaliacaoError || !avaliacao) {
      console.error('[API/avaliacoes] Erro ao salvar avaliação:', avaliacaoError)
      return NextResponse.json(
        { error: 'Erro ao salvar avaliação. Tente novamente.' },
        { status: 500 }
      )
    }

    // ── 6. Salvar radar_snapshot vinculado à avaliação
    const { data: snapshot, error: snapshotError } = await supabase
      .from('radar_snapshots')
      .insert({
        crianca_id,
        avaliacao_id: avaliacao.id,
        ...resultado.para_radar_snapshot,
      })
      .select('id')
      .single()

    if (snapshotError || !snapshot) {
      console.error('[API/avaliacoes] Erro ao salvar radar_snapshot:', snapshotError)
      // Avaliação já foi salva — não retornar 500, mas registrar o problema
      return NextResponse.json({
        success: true,
        avaliacao_id: avaliacao.id,
        snapshot_id: null,
        warning: 'Avaliação salva, mas houve problema ao gerar o radar. Tente atualizar.',
        resultado: {
          scores: resultado.scores,
          score_geral: resultado.score_geral,
          dominio_prioritario: resultado.dominio_prioritario,
          cuspides_emergentes: resultado.cuspides_emergentes,
        },
      })
    }

    // ── 7. Atualizar atualizado_em da criança
    await supabase
      .from('criancas')
      .update({ atualizado_em: new Date().toISOString() })
      .eq('id', crianca_id)

    // ── 8. Retornar resultado completo para o front
    return NextResponse.json({
      success: true,
      avaliacao_id: avaliacao.id,
      snapshot_id: snapshot.id,
      resultado: {
        scores: resultado.scores,
        score_geral: resultado.score_geral,
        dominio_prioritario: resultado.dominio_prioritario,
        cuspides_emergentes: resultado.cuspides_emergentes,
      },
    })
  } catch (err) {
    console.error('[API/avaliacoes] Erro inesperado:', err)
    return NextResponse.json(
      { error: 'Erro interno. Tente novamente em alguns instantes.' },
      { status: 500 }
    )
  }
}

// ─────────────────────────────────────────────
// GET /api/avaliacoes?crianca_id=xxx
// Retorna histórico de avaliações de uma criança
// ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    const crianca_id = req.nextUrl.searchParams.get('crianca_id')
    if (!crianca_id) {
      return NextResponse.json({ error: 'crianca_id é obrigatório.' }, { status: 400 })
    }

    // Busca últimas 10 avaliações da criança (mais recentes primeiro)
    const { data: avaliacoes, error } = await supabase
      .from('avaliacoes')
      .select(`
        id,
        criado_em,
        origem,
        tipo,
        score_geral,
        dominio_prioritario,
        score_comunicacao,
        score_social,
        score_atencao,
        score_regulacao,
        score_brincadeira,
        score_flexibilidade,
        score_autonomia,
        score_motivacao
      `)
      .eq('crianca_id', crianca_id)
      .eq('responsavel_id', session.user.id)
      .order('criado_em', { ascending: false })
      .limit(10)

    if (error) {
      return NextResponse.json({ error: 'Erro ao buscar avaliações.' }, { status: 500 })
    }

    return NextResponse.json({ avaliacoes })
  } catch (err) {
    console.error('[API/avaliacoes GET] Erro:', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
