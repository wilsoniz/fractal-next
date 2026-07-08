"use client"

import Link from "next/link"

interface Instrumento {
  id: string
  nome: string
  sigla: string
  descricao: string
  categoria: string
  disponivel: boolean
  href?: string
}

const INSTRUMENTOS: Instrumento[] = [
  {
    id: "preference-assessment",
    nome: "Preference Assessment",
    sigla: "PA",
    descricao: "Avalia a hierarquia de preferências de estímulos (reforçadores potenciais) por meio de procedimentos sistemáticos de observação. Base para seleção de reforçadores eficazes antes de iniciar um programa.",
    categoria: "Reforçadores",
    disponivel: true,
    href: "/clinic/biblioteca/preference-assessment",
  },
  {
    id: "abc",
    nome: "Registro ABC",
    sigla: "ABC",
    descricao: "Antecedente–Comportamento–Consequência. Coleta descritiva para identificar padrões funcionais em comportamentos-alvo.",
    categoria: "Análise Funcional",
    disponivel: false,
  },
  {
    id: "scatterplot",
    nome: "Scatterplot",
    sigla: "SC",
    descricao: "Mapeia a distribuição temporal de comportamentos ao longo do dia e da semana. Identifica padrões de horário e contexto.",
    categoria: "Análise Funcional",
    disponivel: false,
  },
  {
    id: "fba",
    nome: "Functional Behavior Assessment",
    sigla: "FBA",
    descricao: "Avaliação funcional comportamental estruturada. Combina entrevistas, observação direta e análise de dados para identificar a função do comportamento.",
    categoria: "Análise Funcional",
    disponivel: false,
  },
]

export default function BibliotecaCientificaPage() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "rgba(239,159,39,.12)", border: "1px solid rgba(239,159,39,.25)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none"
              stroke="#EF9F27" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2h4M5 2v4l-2 7a1 1 0 001 1h8a1 1 0 001-1l-2-7V2M6 9h4" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "#e8f0f8", margin: 0 }}>
              Biblioteca Científica
            </h1>
            <p style={{ fontSize: 12, color: "rgba(160,200,235,.55)", margin: "3px 0 0" }}>
              Instrumentos para avaliação, observação e investigação clínica
            </p>
          </div>
        </div>

        <div style={{
          marginTop: 16, padding: "10px 14px",
          background: "rgba(239,159,39,.06)", border: "1px solid rgba(239,159,39,.15)",
          borderRadius: 10, fontSize: 12, color: "rgba(239,159,39,.8)", lineHeight: 1.5,
        }}>
          <strong>Biblioteca Científica ≠ Programas de ensino.</strong>{" "}
          Instrumentos aqui servem para avaliação, observação e suporte à investigação clínica —
          não são incluídos em relatórios como "programas trabalhados".
        </div>
      </div>

      {/* Grid de instrumentos */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {INSTRUMENTOS.map(inst => (
          <InstrumentoCard key={inst.id} instrumento={inst} />
        ))}
      </div>

    </div>
  )
}

function InstrumentoCard({ instrumento: inst }: { instrumento: Instrumento }) {
  const content = (
    <div style={{
      background: "rgba(13,32,53,.6)",
      border: inst.disponivel
        ? "1px solid rgba(29,158,117,.35)"
        : "1px solid rgba(26,58,92,.4)",
      borderRadius: 14, padding: 18,
      display: "flex", flexDirection: "column", gap: 12,
      transition: "border-color .15s, background .15s",
      cursor: inst.disponivel ? "pointer" : "default",
      position: "relative" as const,
      textDecoration: "none",
    }}>

      {/* Badge de categoria */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <span style={{
          fontSize: 10, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase" as const,
          color: "rgba(160,200,235,.45)", padding: "2px 8px",
          background: "rgba(26,58,92,.4)", borderRadius: 20,
        }}>
          {inst.categoria}
        </span>
        {inst.disponivel ? (
          <span style={{
            fontSize: 10, fontWeight: 600, letterSpacing: ".06em",
            color: "#1D9E75", padding: "2px 8px",
            background: "rgba(29,158,117,.1)", borderRadius: 20,
            border: "1px solid rgba(29,158,117,.2)",
          }}>
            Disponível
          </span>
        ) : (
          <span style={{
            fontSize: 10, fontWeight: 500,
            color: "rgba(160,200,235,.3)", padding: "2px 8px",
            background: "rgba(26,58,92,.2)", borderRadius: 20,
          }}>
            Em breve
          </span>
        )}
      </div>

      {/* Sigla + Nome */}
      <div>
        <div style={{
          fontSize: 28, fontWeight: 800, fontFamily: "monospace",
          color: inst.disponivel ? "#1D9E75" : "rgba(160,200,235,.2)",
          lineHeight: 1, marginBottom: 6,
        }}>
          {inst.sigla}
        </div>
        <div style={{
          fontSize: 14, fontWeight: 600,
          color: inst.disponivel ? "#e8f0f8" : "rgba(160,200,235,.35)",
        }}>
          {inst.nome}
        </div>
      </div>

      {/* Descrição */}
      <p style={{
        fontSize: 12, color: inst.disponivel ? "rgba(160,200,235,.7)" : "rgba(160,200,235,.3)",
        lineHeight: 1.55, margin: 0,
      }}>
        {inst.descricao}
      </p>

      {/* CTA */}
      {inst.disponivel && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 12, fontWeight: 600, color: "#1D9E75", marginTop: 4,
        }}>
          Abrir instrumento
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </div>
      )}

    </div>
  )

  if (inst.disponivel && inst.href) {
    return (
      <Link href={inst.href} style={{ textDecoration: "none", display: "block" }}
        onMouseEnter={e => {
          const el = e.currentTarget.firstChild as HTMLElement
          if (el) { el.style.borderColor = "rgba(29,158,117,.65)"; el.style.background = "rgba(13,32,53,.85)" }
        }}
        onMouseLeave={e => {
          const el = e.currentTarget.firstChild as HTMLElement
          if (el) { el.style.borderColor = "rgba(29,158,117,.35)"; el.style.background = "rgba(13,32,53,.6)" }
        }}
      >
        {content}
      </Link>
    )
  }

  return content
}
