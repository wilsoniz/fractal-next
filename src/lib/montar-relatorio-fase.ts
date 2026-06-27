// src/lib/montar-relatorio-fase.ts
// Camada de I/O: busca os dados reais no Supabase e monta a estrutura que o
// gerador (relatorio-fase-v2) consome. Separada do gerador (que é puro) para
// manter testabilidade.
//
// Fonte fina: vai a sessao_tentativas (granularidade por tentativa), não ao
// programas_json agregado — é isso que permite a análise single-case real.

import { supabase } from "@/lib/supabase"
import {
    analisarPrograma,
    type ProgramaFonte,
    type TentativaCrua,
    type DadosRelatorioFaseV2,
    type AvaliacaoAplicada,
} from "@/lib/relatorio-fase-v2"

export interface ContextoRelatorioFase {
    criancaId: string
    jornada: any            // { id, fase_atual, data_inicio_fase, numero_ciclo }
    paciente: any           // { nome, diagnostico, data_nascimento }
    terapeuta: {
        nome: string
        conselho_profissional?: string
        registro_profissional?: string
    }
    analiseClinica?: string
    recomendacoes?: string
}

// Instrumentos de avaliação — NUNCA entram como programas de ensino.
const INSTRUMENTOS_AVALIACAO = ['vb-mapp', 'vbmapp', 'peak', 'ablls', 'ablls-r', 'afls']

function ehInstrumentoAvaliacao(nome: string): boolean {
    const n = (nome ?? '').toLowerCase()
    return INSTRUMENTOS_AVALIACAO.some(i => n.includes(i))
}

export async function montarDadosRelatorioFase(
    ctx: ContextoRelatorioFase
): Promise<DadosRelatorioFaseV2> {
    const { criancaId, jornada, paciente, terapeuta } = ctx

    // 1. Plano(s) ativo(s) do paciente
    const { data: planos } = await supabase
        .from("planos")
        .select("id")
        .eq("crianca_id", criancaId)
    const planoIds = (planos ?? []).map((p: any) => p.id)

    // 2. Programas do plano (com metadados de medida/critério)
    let programasFonte: ProgramaFonte[] = []
    const avaliacoes: AvaliacaoAplicada[] = []

    if (planoIds.length > 0) {
        const { data: planoProgs } = await supabase
            .from("plano_programas")
            .select(`
        id, programa_id,
        programas:programa_id (
          nome, dominio, dominio_aba, tipo_registro,
          criterio_percentual, mastery_min_independence,
          meta_frequencia, meta_latencia_seg, meta_duracao_seg
        )
      `)
            .in("plano_id", planoIds)
            .eq("status", "ativo")

        // sessões finalizadas da fase atual (janela: a partir do início da fase)
        const { data: sessoes } = await supabase
            .from("sessoes_v2")
            .select("id, inicio")
            .eq("crianca_id", criancaId)
            .eq("status", "finalizada")
            .gte("inicio", jornada.data_inicio_fase)
        const sessaoIds = (sessoes ?? []).map((s: any) => s.id)
        const sessaoDataMap = new Map((sessoes ?? []).map((s: any) => [s.id, s.inicio]))

        for (const pp of (planoProgs ?? [])) {
            const prog = (pp as any).programas
            if (!prog) continue

            // instrumentos de avaliação vão para a seção separada, não como programa
            if (ehInstrumentoAvaliacao(prog.nome)) {
                avaliacoes.push({ instrumento: prog.nome })
                continue
            }

            // tentativas deste programa nas sessões da fase
            let tentativas: TentativaCrua[] = []
            if (sessaoIds.length > 0) {
                const { data: tents } = await supabase
                    .from("sessao_tentativas")
                    .select("sessao_id, phase, prompt_level_used, correto, contador, duracao_seg, latencia_seg, registrado_em")
                    .eq("plano_programa_id", (pp as any).id)
                    .in("sessao_id", sessaoIds)
                tentativas = (tents ?? []).map((t: any) => ({
                    sessao_id: t.sessao_id,
                    sessao_data: sessaoDataMap.get(t.sessao_id) ?? t.registrado_em,
                    phase: t.phase ?? 'intervention',
                    prompt_level_used: t.prompt_level_used ?? null,
                    correto: t.correto ?? null,
                    contador: t.contador ?? null,
                    duracao_seg: t.duracao_seg ?? null,
                    latencia_seg: t.latencia_seg ?? null,
                }))
            }

            // só inclui programas que têm dados na fase
            if (tentativas.length === 0) continue

            programasFonte.push({
                nome: prog.nome,
                dominio: prog.dominio ?? '—',
                dominio_aba: prog.dominio_aba ?? 'nao_classificado',
                tipo_registro: prog.tipo_registro ?? 'dtt',
                criterio_percentual: prog.criterio_percentual ?? null,
                mastery_min_independence: prog.mastery_min_independence ?? null,
                meta_frequencia: prog.meta_frequencia ?? null,
                meta_latencia_seg: prog.meta_latencia_seg ?? null,
                meta_duracao_seg: prog.meta_duracao_seg ?? null,
                tentativas,
            })
        }
    }

    // 3. Roda a análise em cada programa
    const programasAnalisados = programasFonte.map(p => analisarPrograma(p))

    // 4. Total de sessões da fase (distintas, com qualquer dado)
    const totalSessoes = new Set(
        programasFonte.flatMap(p => p.tentativas.map(t => t.sessao_id))
    ).size

    // 5. Idade do paciente
    const idade = paciente?.data_nascimento
        ? `${Math.floor((Date.now() - new Date(paciente.data_nascimento).getTime()) / (1000 * 60 * 60 * 24 * 365.25))} anos`
        : undefined

    const fmtData = (d: string | Date) => new Date(d).toLocaleDateString("pt-BR")

    return {
        cabecalho: {
            pacienteNome: paciente?.nome ?? "—",
            pacienteDiagnostico: paciente?.diagnostico ?? undefined,
            pacienteIdade: idade,
            terapeutaNome: terapeuta?.nome ?? "—",
            terapeutaConselho: terapeuta?.conselho_profissional,
            terapeutaRegistro: terapeuta?.registro_profissional,
            fase: jornada.fase_atual,
            numeroCiclo: jornada.numero_ciclo ?? 1,
            dataInicio: fmtData(jornada.data_inicio_fase),
            dataFim: fmtData(new Date()),
            totalSessoes,
        },
        programas: programasAnalisados,
        avaliacoes,
        sinteseNarrativa: undefined,           // pode ser preenchida pelo terapeuta
        recomendacoes: ctx.recomendacoes,
    }
}