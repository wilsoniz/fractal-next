"use client"

import { useState } from "react"
import Link from "next/link"

type TipoPA = "mswo" | "paired" | "single" | "free_operant" | "response_restriction"

interface OpcaoTipo {
  id: TipoPA
  nome: string
  sigla: string
  descricao: string
  indicacao: string
}

const TIPOS: OpcaoTipo[] = [
  {
    id: "mswo",
    nome: "Multiple Stimulus Without Replacement",
    sigla: "MSWO",
    descricao: "Múltiplos itens são dispostos em linha. O paciente toca/pega o preferido; o item escolhido é removido e os restantes são reorganizados. O ciclo repete até restar um item.",
    indicacao: "Gera hierarquia de preferência com menos ensaios que o Paired Stimulus. Recomendado como primeira escolha na maioria dos casos.",
  },
  {
    id: "paired",
    nome: "Paired Stimulus",
    sigla: "PS",
    descricao: "Dois itens são apresentados simultaneamente em todas as combinações possíveis. O paciente escolhe um. Cada par é testado múltiplas vezes.",
    indicacao: "Alta confiabilidade e discriminação entre reforçadores de valor próximo. Indicado quando a precisão do ranking é crítica. Mais demorado com muitos itens.",
  },
  {
    id: "single",
    nome: "Single Stimulus",
    sigla: "SS",
    descricao: "Um item é apresentado por vez. Registra-se se o paciente se aproxima, pega ou engaja com o estímulo dentro de um intervalo de tempo definido.",
    indicacao: "Útil quando o repertório é muito limitado ou o paciente tem dificuldade em tolerar múltiplos estímulos. Menos discriminativo que MSWO e PS.",
  },
  {
    id: "free_operant",
    nome: "Free Operant",
    sigla: "FO",
    descricao: "O paciente tem acesso livre a múltiplos itens por um período definido (ex: 5 min). Mede-se o tempo total de engajamento com cada estímulo.",
    indicacao: "Naturalístico e de baixa intrusividade. Ideal para mapeamento inicial de interesses em ambiente não-estruturado.",
  },
  {
    id: "response_restriction",
    nome: "Response Restriction",
    sigla: "RR",
    descricao: "Variação do Free Operant em que o acesso a alguns itens é restrito (bloqueado fisicamente ou removido) para observar a resposta de aproximação ou esquiva.",
    indicacao: "Útil para identificar a função motivacional de restrição de acesso e distinguir preferência real de reforço condicionado por novidade.",
  },
]

export default function PreferenceAssessmentPage() {
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoPA | null>(null)
  const [iniciado, setIniciado] = useState(false)

  const opcao = TIPOS.find(t => t.id === tipoSelecionado)

  if (iniciado && opcao) {
    return <PlaceholderIniciado tipo={opcao} onVoltar={() => setIniciado(false)} />
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: 12 }}>
        <Link href="/clinic/biblioteca" style={{ color: "rgba(160,200,235,.5)", textDecoration: "none" }}>
          Biblioteca Científica
        </Link>
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="rgba(160,200,235,.3)" strokeWidth="1.5">
          <path d="M5 3l6 5-6 5" />
        </svg>
        <span style={{ color: "rgba(160,200,235,.8)" }}>Preference Assessment</span>
      </div>

      {/* Header do instrumento */}
      <div style={{
        background: "rgba(13,32,53,.6)", border: "1px solid rgba(29,158,117,.25)",
        borderRadius: 14, padding: 20, marginBottom: 24,
        display: "flex", alignItems: "flex-start", gap: 16,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: "rgba(29,158,117,.1)", border: "1px solid rgba(29,158,117,.25)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          fontFamily: "monospace", fontSize: 16, fontWeight: 800, color: "#1D9E75",
        }}>
          PA
        </div>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#e8f0f8", margin: "0 0 6px" }}>
            Preference Assessment
          </h1>
          <p style={{ fontSize: 13, color: "rgba(160,200,235,.7)", margin: 0, lineHeight: 1.55 }}>
            Procedimento sistemático para identificar a hierarquia de preferências de estímulos
            (reforçadores potenciais) de um paciente. Essencial antes de iniciar qualquer programa de ensino —
            a eficácia do reforçamento depende diretamente da preferência atual, não de suposições históricas.
          </p>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10,
            fontSize: 11, color: "rgba(239,159,39,.75)", padding: "3px 10px",
            background: "rgba(239,159,39,.06)", border: "1px solid rgba(239,159,39,.15)",
            borderRadius: 20,
          }}>
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="6" /><path d="M8 5v4M8 11v.5" />
            </svg>
            Instrumento de avaliação — não é programa de ensino
          </div>
        </div>
      </div>

      {/* Seleção do tipo */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase",
          color: "rgba(160,200,235,.45)", marginBottom: 14,
        }}>
          Tipo de Avaliação
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {TIPOS.map(tipo => {
            const selecionado = tipoSelecionado === tipo.id
            return (
              <button
                key={tipo.id}
                onClick={() => setTipoSelecionado(tipo.id)}
                style={{
                  background: selecionado ? "rgba(29,158,117,.08)" : "rgba(13,32,53,.5)",
                  border: selecionado
                    ? "1.5px solid rgba(29,158,117,.55)"
                    : "1px solid rgba(26,58,92,.4)",
                  borderRadius: 12, padding: "14px 16px",
                  cursor: "pointer", textAlign: "left", width: "100%",
                  transition: "border-color .15s, background .15s",
                  fontFamily: "var(--font-sans)",
                  display: "flex", alignItems: "flex-start", gap: 14,
                }}
                onMouseEnter={e => {
                  if (!selecionado) {
                    e.currentTarget.style.borderColor = "rgba(29,158,117,.3)"
                    e.currentTarget.style.background = "rgba(13,32,53,.7)"
                  }
                }}
                onMouseLeave={e => {
                  if (!selecionado) {
                    e.currentTarget.style.borderColor = "rgba(26,58,92,.4)"
                    e.currentTarget.style.background = "rgba(13,32,53,.5)"
                  }
                }}
              >
                {/* Indicador de seleção */}
                <div style={{
                  width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                  border: selecionado ? "5px solid #1D9E75" : "1.5px solid rgba(80,120,160,.4)",
                  background: selecionado ? "transparent" : "transparent",
                  transition: "border .15s",
                }} />

                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
                    <span style={{
                      fontFamily: "monospace", fontSize: 13, fontWeight: 800,
                      color: selecionado ? "#1D9E75" : "rgba(160,200,235,.6)",
                    }}>
                      {tipo.sigla}
                    </span>
                    <span style={{
                      fontSize: 13, fontWeight: 600,
                      color: selecionado ? "#e8f0f8" : "rgba(160,200,235,.75)",
                    }}>
                      {tipo.nome}
                    </span>
                  </div>
                  <p style={{
                    fontSize: 12, color: "rgba(160,200,235,.6)", margin: "0 0 6px", lineHeight: 1.5,
                  }}>
                    {tipo.descricao}
                  </p>
                  <p style={{
                    fontSize: 11, color: "rgba(239,159,39,.6)", margin: 0, lineHeight: 1.4,
                    fontStyle: "italic",
                  }}>
                    {tipo.indicacao}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Botão Iniciar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={() => { if (tipoSelecionado) setIniciado(true) }}
          disabled={!tipoSelecionado}
          style={{
            padding: "12px 28px", borderRadius: 10, border: "none",
            background: tipoSelecionado ? "#1D9E75" : "rgba(26,58,92,.4)",
            color: tipoSelecionado ? "#fff" : "rgba(160,200,235,.3)",
            fontSize: 14, fontWeight: 600, cursor: tipoSelecionado ? "pointer" : "default",
            fontFamily: "var(--font-sans)", transition: "background .15s",
            display: "flex", alignItems: "center", gap: 8,
          }}
          onMouseEnter={e => { if (tipoSelecionado) e.currentTarget.style.background = "#18896a" }}
          onMouseLeave={e => { if (tipoSelecionado) e.currentTarget.style.background = "#1D9E75" }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M5 3l8 5-8 5V3z" fill="currentColor" stroke="none" />
          </svg>
          Iniciar Avaliação
        </button>
        {!tipoSelecionado && (
          <span style={{ fontSize: 12, color: "rgba(160,200,235,.35)" }}>
            Selecione o tipo de avaliação acima
          </span>
        )}
      </div>

    </div>
  )
}

function PlaceholderIniciado({ tipo, onVoltar }: { tipo: OpcaoTipo; onVoltar: () => void }) {
  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: 12 }}>
        <Link href="/clinic/biblioteca" style={{ color: "rgba(160,200,235,.5)", textDecoration: "none" }}>
          Biblioteca Científica
        </Link>
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="rgba(160,200,235,.3)" strokeWidth="1.5">
          <path d="M5 3l6 5-6 5" />
        </svg>
        <button onClick={onVoltar} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(160,200,235,.5)", fontSize: 12, fontFamily: "var(--font-sans)", padding: 0,
        }}>
          Preference Assessment
        </button>
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="rgba(160,200,235,.3)" strokeWidth="1.5">
          <path d="M5 3l6 5-6 5" />
        </svg>
        <span style={{ color: "rgba(160,200,235,.8)" }}>{tipo.sigla}</span>
      </div>

      {/* Estado de avaliação iniciada */}
      <div style={{
        background: "rgba(13,32,53,.6)", border: "1px solid rgba(29,158,117,.3)",
        borderRadius: 16, padding: 40, textAlign: "center",
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "rgba(29,158,117,.1)", border: "1px solid rgba(29,158,117,.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px", fontFamily: "monospace", fontSize: 18, fontWeight: 800, color: "#1D9E75",
        }}>
          {tipo.sigla}
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e8f0f8", marginBottom: 8 }}>
          Preference Assessment — {tipo.nome}
        </h2>

        <p style={{ fontSize: 13, color: "rgba(160,200,235,.6)", lineHeight: 1.6, maxWidth: 480, margin: "0 auto 28px" }}>
          A estrutura de coleta de dados para {tipo.sigla} estará disponível na próxima versão da Biblioteca Científica.
          O tipo selecionado foi registrado como contexto para a implementação.
        </p>

        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "10px 18px", borderRadius: 10,
          background: "rgba(239,159,39,.06)", border: "1px solid rgba(239,159,39,.2)",
          fontSize: 12, color: "rgba(239,159,39,.8)", marginBottom: 28,
        }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M8 2v6l3 3" /><circle cx="8" cy="8" r="6" />
          </svg>
          Em desenvolvimento — próxima PR
        </div>

        <div>
          <button onClick={onVoltar} style={{
            padding: "10px 24px", borderRadius: 10,
            background: "rgba(29,158,117,.1)", border: "1px solid rgba(29,158,117,.3)",
            color: "#1D9E75", fontSize: 13, fontWeight: 600, cursor: "pointer",
            fontFamily: "var(--font-sans)", transition: "background .15s",
          }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(29,158,117,.18)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(29,158,117,.1)"}
          >
            ← Voltar à seleção
          </button>
        </div>
      </div>

    </div>
  )
}
