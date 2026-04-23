"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { FractaLogo } from "@/components/fracta/FractaLogo";
import Link from "next/link";

type ConviteStatus = "loading" | "valido" | "invalido" | "expirado" | "usado" | "aceito" | "ja_vinculado"

export default function ConvitePage() {
  const router = useRouter()
  const params = useParams()
  const codigo = params.codigo as string

  const [status, setStatus] = useState<ConviteStatus>("loading")
  const [nomeCrianca, setNomeCrianca] = useState("")
  const [nomeResponsavel, setNomeResponsavel] = useState("")
  const [aceitando, setAceitando] = useState(false)

  useEffect(() => {
    async function verificar() {
      // 1. Buscar convite
      const { data: convite } = await supabase
        .from("convites")
        .select("id, crianca_id, usado, expira_em, criado_por")
        .eq("codigo", codigo)
        .single()

      if (!convite) { setStatus("invalido"); return }
      if (convite.usado) { setStatus("usado"); return }
      if (new Date(convite.expira_em) < new Date()) { setStatus("expirado"); return }

      // 2. Buscar nome da criança
      const { data: crianca } = await supabase
        .from("criancas")
        .select("nome")
        .eq("id", convite.crianca_id)
        .single()

      if (crianca) setNomeCrianca(crianca.nome)

      // 3. Verificar se usuário está logado
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setNomeResponsavel(user.user_metadata?.nome || user.email?.split("@")[0] || "você")

        // Verificar se já está vinculado
        const { data: vinculo } = await supabase
          .from("crianca_responsaveis")
          .select("id")
          .eq("crianca_id", convite.crianca_id)
          .eq("responsavel_id", user.id)
          .single()

        if (vinculo) { setStatus("ja_vinculado"); return }
      }

      setStatus("valido")
    }
    verificar()
  }, [codigo])

  async function aceitar() {
    setAceitando(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Salva o código no sessionStorage e redireciona para login
      sessionStorage.setItem("fracta_convite", codigo)
      window.location.href = `/care/login?redirect=/care/convite/${codigo}`
      return
    }

    // Buscar convite
    const { data: convite } = await supabase
      .from("convites")
      .select("id, crianca_id")
      .eq("codigo", codigo)
      .single()

    if (!convite) { setStatus("invalido"); setAceitando(false); return }

    // Vincular responsável à criança
    await supabase.from("crianca_responsaveis").insert({
      crianca_id: convite.crianca_id,
      responsavel_id: user.id,
      tipo: "secundario",
    })

    // Marcar convite como usado
    await supabase.from("convites").update({
      usado: true,
      usado_por: user.id,
    }).eq("id", convite.id)

    // Criar registro de gamificação se não existir
    await supabase.from("gamificacao").upsert({
      responsavel_id: user.id,
      pontos: 0, streak_atual: 0, streak_max: 0,
    }, { onConflict: "responsavel_id" })

    setStatus("aceito")
    setAceitando(false)
  }

  const bg = "radial-gradient(ellipse 80% 60% at 20% 10%,rgba(122,224,64,.10) 0%,transparent 55%),radial-gradient(ellipse 60% 70% at 80% 90%,rgba(43,191,164,.13) 0%,transparent 55%),linear-gradient(160deg,#e8f8ff 0%,#f0fdfb 35%,#edfff8 65%,#ddf4ff 100%)"

  return (
    <div style={{ minHeight:"100vh", background:bg, fontFamily:"var(--font-sans)", color:"#1E3A5F", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div style={{ marginBottom:32 }}>
        <FractaLogo logo="care" height={36} alt="FractaCare" />
      </div>

      <div style={{ background:"rgba(255,255,255,.84)", backdropFilter:"blur(14px)", borderRadius:24, border:"1px solid rgba(43,191,164,.18)", boxShadow:"0 4px 28px rgba(43,191,164,.07)", padding:"32px 24px", width:"100%", maxWidth:440, boxSizing:"border-box" as const, textAlign:"center" }}>

        {status === "loading" && (
          <>
            <div style={{ width:32, height:32, borderRadius:"50%", border:"3px solid rgba(43,191,164,.2)", borderTopColor:"#2BBFA4", animation:"spin 1s linear infinite", margin:"0 auto 16px" }} />
            <p style={{ color:"#8a9ab8", fontSize:".9rem" }}>Verificando convite...</p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </>
        )}

        {status === "invalido" && (
          <>
            <div style={{ fontSize:"2.5rem", marginBottom:16 }}>❌</div>
            <h2 style={{ fontSize:"1.2rem", fontWeight:800, marginBottom:8 }}>Convite inválido</h2>
            <p style={{ fontSize:".88rem", color:"#8a9ab8", lineHeight:1.7, marginBottom:24 }}>Este link de convite não existe ou foi digitado incorretamente.</p>
            <Link href="/care" style={{ display:"block", padding:"12px", borderRadius:10, background:"linear-gradient(135deg,#2BBFA4,#1e9e88)", color:"white", textDecoration:"none", fontWeight:700, fontSize:".88rem" }}>
              Ir para o FractaCare
            </Link>
          </>
        )}

        {status === "expirado" && (
          <>
            <div style={{ fontSize:"2.5rem", marginBottom:16 }}>⏰</div>
            <h2 style={{ fontSize:"1.2rem", fontWeight:800, marginBottom:8 }}>Convite expirado</h2>
            <p style={{ fontSize:".88rem", color:"#8a9ab8", lineHeight:1.7, marginBottom:24 }}>Este link expirou após 7 dias. Peça um novo convite ao responsável principal.</p>
            <Link href="/care" style={{ display:"block", padding:"12px", borderRadius:10, background:"linear-gradient(135deg,#2BBFA4,#1e9e88)", color:"white", textDecoration:"none", fontWeight:700, fontSize:".88rem" }}>
              Ir para o FractaCare
            </Link>
          </>
        )}

        {status === "usado" && (
          <>
            <div style={{ fontSize:"2.5rem", marginBottom:16 }}>✅</div>
            <h2 style={{ fontSize:"1.2rem", fontWeight:800, marginBottom:8 }}>Convite já utilizado</h2>
            <p style={{ fontSize:".88rem", color:"#8a9ab8", lineHeight:1.7, marginBottom:24 }}>Este convite já foi aceito anteriormente.</p>
            <Link href="/care" style={{ display:"block", padding:"12px", borderRadius:10, background:"linear-gradient(135deg,#2BBFA4,#1e9e88)", color:"white", textDecoration:"none", fontWeight:700, fontSize:".88rem" }}>
              Entrar no FractaCare
            </Link>
          </>
        )}

        {status === "ja_vinculado" && (
          <>
            <div style={{ fontSize:"2.5rem", marginBottom:16 }}>🔗</div>
            <h2 style={{ fontSize:"1.2rem", fontWeight:800, marginBottom:8 }}>Você já tem acesso!</h2>
            <p style={{ fontSize:".88rem", color:"#8a9ab8", lineHeight:1.7, marginBottom:24 }}>Você já está vinculado ao perfil de {nomeCrianca}.</p>
            <Link href="/care/dashboard" style={{ display:"block", padding:"12px", borderRadius:10, background:"linear-gradient(135deg,#2BBFA4,#1e9e88)", color:"white", textDecoration:"none", fontWeight:700, fontSize:".88rem" }}>
              Ver dashboard
            </Link>
          </>
        )}

        {status === "valido" && (
          <>
            <div style={{ fontSize:"2.5rem", marginBottom:16 }}>👨‍👩‍👦</div>
            <h2 style={{ fontSize:"1.2rem", fontWeight:800, marginBottom:8 }}>Você foi convidado!</h2>
            <p style={{ fontSize:".9rem", color:"#5a7a9a", lineHeight:1.7, marginBottom:8 }}>
              Você recebeu acesso ao perfil de
            </p>
            <div style={{ fontSize:"1.4rem", fontWeight:800, color:"#2BBFA4", marginBottom:20 }}>
              {nomeCrianca}
            </div>
            <p style={{ fontSize:".82rem", color:"#8a9ab8", lineHeight:1.65, marginBottom:24 }}>
              Ao aceitar, você poderá acompanhar o desenvolvimento, registrar atividades e ver o mapa de habilidades.
            </p>
            <button onClick={aceitar} disabled={aceitando} style={{
              width:"100%", padding:"14px", borderRadius:12, border:"none",
              background:"linear-gradient(135deg,#2BBFA4,#1e9e88)",
              color:"white", fontWeight:800, fontSize:".95rem",
              cursor:aceitando ? "default" : "pointer", fontFamily:"var(--font-sans)",
              boxShadow:"0 4px 18px rgba(43,191,164,.35)",
            }}>
              {aceitando ? "Aceitando..." : "Aceitar convite"}
            </button>
            <p style={{ fontSize:".72rem", color:"#aabbcc", marginTop:12 }}>
              Você precisará estar logado ou criar uma conta
            </p>
          </>
        )}

        {status === "aceito" && (
          <>
            <div style={{ fontSize:"2.5rem", marginBottom:16 }}>🎉</div>
            <h2 style={{ fontSize:"1.2rem", fontWeight:800, marginBottom:8 }}>Acesso confirmado!</h2>
            <p style={{ fontSize:".88rem", color:"#5a7a9a", lineHeight:1.7, marginBottom:24 }}>
              Você agora tem acesso ao perfil de <strong style={{ color:"#2BBFA4" }}>{nomeCrianca}</strong> no FractaCare.
            </p>
            <button onClick={() => window.location.href = "/care/dashboard"} style={{
              width:"100%", padding:"13px", borderRadius:12, border:"none",
              background:"linear-gradient(135deg,#2BBFA4,#1e9e88)",
              color:"white", fontWeight:800, fontSize:".9rem",
              cursor:"pointer", fontFamily:"var(--font-sans)",
            }}>
              Ver dashboard →
            </button>
          </>
        )}
      </div>
    </div>
  )
}
