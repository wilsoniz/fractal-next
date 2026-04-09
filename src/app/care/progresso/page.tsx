"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FractaLogo } from "@/components/fracta/FractaLogo";
import { FractalTriangle } from "@/components/fracta/FractalTriangle";

type DomKey = "comunicacao"|"social"|"atencao"|"regulacao"|"brincadeira"|"flexibilidade"|"autonomia"|"motivacao";
type Periodo = "semana"|"mes"|"total";

const DOMINIOS_CONFIG = [
  { key:"comunicacao"   as DomKey, nome:"Comunicação",    icon:"💬", cor:"#2BBFA4", g:"linear-gradient(90deg,#2BBFA4,#7AE040)" },
  { key:"social"        as DomKey, nome:"Social",          icon:"🤝", cor:"#4FC3D8", g:"linear-gradient(90deg,#2A7BA8,#2BBFA4)" },
  { key:"atencao"       as DomKey, nome:"Atenção",         icon:"🎯", cor:"#7AE040", g:"linear-gradient(90deg,#4FC3D8,#2BBFA4)" },
  { key:"regulacao"     as DomKey, nome:"Regulação",       icon:"💙", cor:"#2A7BA8", g:"linear-gradient(90deg,#2A7BA8,#4FC3D8)" },
  { key:"brincadeira"   as DomKey, nome:"Brincadeira",     icon:"🎨", cor:"#2BBFA4", g:"linear-gradient(90deg,#7AE040,#2BBFA4)" },
  { key:"flexibilidade" as DomKey, nome:"Flexibilidade",   icon:"🔄", cor:"#4FC3D8", g:"linear-gradient(90deg,#4FC3D8,#7AE040)" },
  { key:"autonomia"     as DomKey, nome:"Autonomia",       icon:"⭐", cor:"#7AE040", g:"linear-gradient(90deg,#2BBFA4,#7AE040)" },
  { key:"motivacao"     as DomKey, nome:"Motivação",       icon:"🚀", cor:"#2A7BA8", g:"linear-gradient(90deg,#7AE040,#4FC3D8)" },
];

const PERIODOS: Record<Periodo, { atual: number[]; prev: number[]; label: string }> = {
  semana: { atual:[52,68,40,55,72,32,60,75], prev:[48,64,36,50,68,28,55,70], label:"Esta semana" },
  mes:    { atual:[58,72,44,60,78,38,65,82], prev:[44,60,32,48,66,26,52,68], label:"Este mês" },
  total:  { atual:[62,75,48,65,80,42,68,85], prev:[28,40,18,30,50,14,35,45], label:"Desde o início" },
};

const HABILIDADES: Record<DomKey, { n: string; s: "dom"|"dev"|"ini" }[]> = {
  comunicacao:   [{n:"Pedir o que quer",s:"dom"},{n:"Apontar para pedir",s:"dom"},{n:"Combinar 2 palavras",s:"dev"},{n:"Nomear objetos",s:"dev"}],
  social:        [{n:"Responder ao nome",s:"dom"},{n:"Atenção compartilhada",s:"dom"},{n:"Iniciar interação",s:"dev"},{n:"Turnos em brincadeira",s:"ini"}],
  atencao:       [{n:"Sustentar 3 min",s:"dom"},{n:"Seguir instrução 1 passo",s:"dev"},{n:"Completar atividade",s:"dev"},{n:"Seguir instrução 2 passos",s:"ini"}],
  regulacao:     [{n:"Esperar 10 segundos",s:"dom"},{n:"Aceitar 'não'",s:"dev"},{n:"Pedir pausa",s:"dev"},{n:"Recuperar-se de frustração",s:"ini"}],
  brincadeira:   [{n:"Explorar brinquedos",s:"dom"},{n:"Brincadeira funcional",s:"dom"},{n:"Brincadeira simbólica",s:"dev"},{n:"Jogo com turnos",s:"ini"}],
  flexibilidade: [{n:"Aceitar mudança",s:"dev"},{n:"Experimentar novidades",s:"ini"},{n:"Transições tranquilas",s:"ini"}],
  autonomia:     [{n:"Guardar brinquedos",s:"dom"},{n:"Beber no copo",s:"dom"},{n:"Vestir peças simples",s:"dev"},{n:"Lavar mãos",s:"dev"}],
  motivacao:     [{n:"Curiosidade por atividades",s:"dom"},{n:"Persistência em desafios",s:"dev"},{n:"Escolher atividade",s:"dom"}],
};

const STATUS_LABEL = { dom:"Dominada", dev:"Em desenvolvimento", ini:"Iniciando" };
const STATUS_STYLE: Record<string, React.CSSProperties> = {
  dom: { background:"rgba(43,191,164,.15)", color:"#1a7a6a" },
  dev: { background:"rgba(245,158,11,.12)", color:"#b45309" },
  ini: { background:"rgba(100,116,139,.1)", color:"#5a7a9a" },
};

const CONQUISTAS = [
  { nome:"Pediu ajuda pela 1ª vez",      date:"3 dias atrás",    g:"linear-gradient(135deg,#2BBFA4,#7AE040)", icon:"💬", isNew:true  },
  { nome:"Esperou 10 segundos",           date:"1 semana atrás",  g:"linear-gradient(135deg,#2A7BA8,#4FC3D8)", icon:"⏱️", isNew:false },
  { nome:"Brincadeira com turnos",        date:"2 semanas atrás", g:"linear-gradient(135deg,#7AE040,#2BBFA4)", icon:"🎮", isNew:false },
  { nome:"Seguiu instrução de 2 passos",  date:"3 semanas atrás", g:"linear-gradient(135deg,#4FC3D8,#2BBFA4)", icon:"✅", isNew:false },
];

// ── RADAR SVG ─────────────────────────────────────────────
function RadarSVG({ atual, prev }: { atual: number[]; prev: number[] }) {
  const cx=180, cy=180, maxR=120, n=8;
  const step = (2*Math.PI)/n;
  const start = -Math.PI/2;
  function pt(i: number, r: number): [number,number] {
    const a = start + i*step;
    return [cx + r*Math.cos(a), cy + r*Math.sin(a)];
  }
  function pStr(pts: [number,number][]) { return pts.map(p=>p.join(",")).join(" "); }
  const prevPts  = prev.map((v,i) => pt(i,(v/100)*maxR));
  const atualPts = atual.map((v,i) => pt(i,(v/100)*maxR));

  return (
    <svg viewBox="0 0 360 360" width="280" height="280" style={{ overflow:"visible" }}>
      <defs>
        <linearGradient id="rg-prog" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2BBFA4" stopOpacity={0.28}/>
          <stop offset="100%" stopColor="#7AE040" stopOpacity={0.14}/>
        </linearGradient>
      </defs>
      {[.25,.5,.75,1].map(f=>(
        <polygon key={f} points={pStr(Array.from({length:n},(_,i)=>pt(i,maxR*f)))} fill="none" stroke="rgba(43,191,164,0.15)" strokeWidth="1"/>
      ))}
      {Array.from({length:n},(_,i)=>{
        const [x2,y2]=pt(i,maxR);
        return <line key={i} x1={cx} y1={cy} x2={x2} y2={y2} stroke="rgba(43,191,164,0.12)" strokeWidth="1"/>;
      })}
      {/* Polígono anterior — tracejado */}
      <polygon points={pStr(prevPts)} fill="rgba(43,191,164,.05)" stroke="rgba(43,191,164,.3)" strokeWidth="1.5" strokeDasharray="5 4"/>
      {/* Polígono atual */}
      <polygon points={pStr(atualPts)} fill="url(#rg-prog)" stroke="#2BBFA4" strokeWidth="2.5"/>
      {/* Pontos e labels */}
      {atual.map((v,i)=>{
        const d = DOMINIOS_CONFIG[i];
        const [x,y]  = pt(i,(v/100)*maxR);
        const [lx,ly]= pt(i,maxR+26);
        const [px,py]= pt(i,(v/100)*maxR-15);
        return (
          <g key={d.key}>
            <circle cx={x} cy={y} r={5} fill={d.cor} stroke="white" strokeWidth="2"/>
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontFamily="Plus Jakarta Sans,sans-serif" fontWeight="700" fill="#1E3A5F">{d.nome}</text>
            <text x={px} y={py} textAnchor="middle" dominantBaseline="middle" fontSize="8.5" fontFamily="Plus Jakarta Sans,sans-serif" fontWeight="800" fill={d.cor}>{v}%</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── SPARKLINE ────────────────────────────────────────────
function Sparkline({ cur, g }: { cur: number; g: string }) {
  const vals = [cur-18,cur-12,cur-15,cur-8,cur-10,cur-4,cur-2,cur].map(v=>Math.max(10,Math.min(100,v)));
  const W=100,H=28,pad=2;
  const stepX=(W-2*pad)/(vals.length-1);
  const pts=vals.map((v,i)=>`${pad+i*stepX},${H-pad-(v/100)*(H-2*pad)}`).join(" ");
  const lastX=pad+(vals.length-1)*stepX;
  const lastY=H-pad-(vals[vals.length-1]/100)*(H-2*pad);
  return (
    <svg width="100%" height="28" viewBox="0 0 100 28" preserveAspectRatio="none" style={{ marginTop:6 }}>
      <polyline points={pts} fill="none" stroke="rgba(43,191,164,.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={lastX} cy={lastY} r="2.5" fill="#2BBFA4"/>
    </svg>
  );
}

// ── DETAIL CHART ─────────────────────────────────────────
function DetailChart({ cur, prev }: { cur: number; prev: number }) {
  const vals = [prev-8,prev-2,prev+4,prev+8,cur-5,cur-1,cur];
  const W=320,H=64,pad=8;
  const stepX=(W-2*pad)/(vals.length-1);
  const pts=vals.map((v,i)=>`${pad+i*stepX},${H-pad-(v/100)*(H-2*pad)}`);
  const polyPts=pts.join(" ");
  const areaPts=`${polyPts} ${pad+(vals.length-1)*stepX},${H} ${pad},${H}`;
  return (
    <svg width="100%" height="64" viewBox="0 0 320 64" preserveAspectRatio="none">
      <defs>
        <linearGradient id="dlg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2BBFA4" stopOpacity={0.2}/>
          <stop offset="100%" stopColor="#2BBFA4" stopOpacity={0}/>
        </linearGradient>
      </defs>
      <polygon points={areaPts} fill="url(#dlg)"/>
      <polyline points={polyPts} fill="none" stroke="#2BBFA4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {vals.map((v,i)=>{
        const x=pad+i*stepX;
        const y=H-pad-(v/100)*(H-2*pad);
        return <circle key={i} cx={x} cy={y} r={i===vals.length-1?4:2.5} fill={i===vals.length-1?"#2BBFA4":"rgba(43,191,164,.5)"} stroke="white" strokeWidth="1.5"/>;
      })}
    </svg>
  );
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────
export default function ProgressoPage() {
  const [periodo,  setPeriodo]  = useState<Periodo>("mes");
  const [selected, setSelected] = useState<number|null>(null);
  const [nome,     setNome]     = useState("Lucas");
  const [idade,    setIdade]    = useState("4");
  const [barsOk,   setBarsOk]  = useState(false);

  useEffect(()=>{
    const n=sessionStorage.getItem("fracta_nome");
    const i=sessionStorage.getItem("fracta_idade");
    if(n) setNome(n);
    if(i) setIdade(i);
    setTimeout(()=>setBarsOk(true),200);
  },[]);

  const d = PERIODOS[periodo];

  const card: React.CSSProperties = {
    background:"rgba(255,255,255,.84)", backdropFilter:"blur(14px)",
    borderRadius:22, border:"1px solid rgba(43,191,164,.18)",
    boxShadow:"0 4px 28px rgba(43,191,164,.06)", padding:22,
  };

  return (
    <div style={{
      fontFamily:"var(--font-sans)", color:"#1E3A5F", minHeight:"100vh",
      background:"radial-gradient(ellipse 80% 60% at 20% 10%, rgba(122,224,64,.10) 0%, transparent 55%), radial-gradient(ellipse 60% 70% at 80% 90%, rgba(43,191,164,.13) 0%, transparent 55%), linear-gradient(160deg,#e8f8ff 0%,#f0fdfb 35%,#edfff8 65%,#ddf4ff 100%)",
    }}>

      {/* NAV */}
      <nav style={{ background:"rgba(255,255,255,.78)", backdropFilter:"blur(18px)", borderBottom:"1px solid rgba(43,191,164,.15)", padding:"0 20px", height:56, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:50 }}>
        <Link href="/app" style={{ display:"flex", alignItems:"center", gap:7, textDecoration:"none", color:"#2BBFA4", fontSize:".82rem", fontWeight:600 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Painel
        </Link>
        <FractaLogo logo="care" height={28} alt="FractaCare"/>
        <div style={{ width:28, height:28, borderRadius:"50%", background:"linear-gradient(135deg,#2BBFA4,#2A7BA8)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:".58rem", fontWeight:800, color:"white" }}>AC</div>
      </nav>

      <div style={{ maxWidth:600, margin:"0 auto", padding:"24px 16px 90px", display:"flex", flexDirection:"column", gap:18 }}>

        {/* HEADER */}
        <div>
          <div style={{ fontSize:".78rem", color:"#8a9ab8", marginBottom:3 }}>Acompanhamento</div>
          <div style={{ fontSize:"1.35rem", fontWeight:800, letterSpacing:"-.02em" }}>Progresso de {nome}</div>
        </div>

        {/* SUMÁRIO */}
        <div style={card}>
          <div style={{ fontSize:".62rem", fontWeight:700, textTransform:"uppercase", letterSpacing:".09em", color:"#2BBFA4", marginBottom:6 }}>Visão geral · {d.label}</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
            {[
              { val:"18", label:"Atividades" },
              { val:"+14%", label:"Evolução média" },
              { val:"3", label:"Habilidades novas" },
            ].map(s=>(
              <div key={s.label} style={{ background:"rgba(255,255,255,.7)", border:"1px solid rgba(43,191,164,.1)", borderRadius:16, padding:"14px", textAlign:"center" }}>
                <div style={{ fontSize:"1.6rem", fontWeight:800, color:"#2BBFA4", lineHeight:1 }}>{s.val}</div>
                <div style={{ fontSize:".62rem", fontWeight:700, textTransform:"uppercase", letterSpacing:".07em", color:"#8a9ab8", marginTop:4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RADAR */}
        <div style={card}>
          <div style={{ fontSize:".62rem", fontWeight:700, textTransform:"uppercase", letterSpacing:".09em", color:"#2BBFA4", marginBottom:6 }}>Mapa de habilidades</div>
          <div style={{ fontSize:"1rem", fontWeight:800, color:"#1E3A5F", marginBottom:14 }}>Radar de desenvolvimento</div>

          {/* Period tabs */}
          <div style={{ display:"flex", gap:6, marginBottom:18 }}>
            {(["semana","mes","total"] as Periodo[]).map(p=>(
              <button key={p} onClick={()=>{ setPeriodo(p); setSelected(null); }} style={{
                padding:"7px 16px", borderRadius:50, border:`1.5px solid ${periodo===p?"transparent":"rgba(43,191,164,.2)"}`,
                background:periodo===p?"linear-gradient(135deg,#2BBFA4,#7AE040)":"transparent",
                color:periodo===p?"white":"#8a9ab8",
                fontFamily:"var(--font-sans)", fontSize:".75rem", fontWeight:700, cursor:"pointer",
                boxShadow:periodo===p?"0 3px 12px rgba(43,191,164,.3)":"none", transition:"all .2s",
              }}>
                {p==="semana"?"Semana":p==="mes"?"Mês":"Total"}
              </button>
            ))}
          </div>

          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
            <RadarSVG atual={d.atual} prev={d.prev}/>
            <div style={{ display:"flex", gap:16, justifyContent:"center" }}>
              <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:".68rem", fontWeight:600, color:"#8a9ab8" }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:"#2BBFA4" }}/>Atual
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:".68rem", fontWeight:600, color:"#8a9ab8" }}>
                <div style={{ width:8, height:8, borderRadius:"50%", border:"1.5px dashed #2BBFA4", background:"rgba(43,191,164,.2)" }}/>Período anterior
              </div>
            </div>
          </div>
        </div>

        {/* DOMÍNIOS — clicáveis */}
        <div style={card}>
          <div style={{ fontSize:".62rem", fontWeight:700, textTransform:"uppercase", letterSpacing:".09em", color:"#2BBFA4", marginBottom:6 }}>Por domínio</div>
          <div style={{ fontSize:".88rem", fontWeight:700, color:"#1E3A5F", marginBottom:14 }}>Toque para ver detalhes</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {DOMINIOS_CONFIG.map((dom,i)=>{
              const cur  = d.atual[i];
              const prev = d.prev[i];
              const delta= cur-prev;
              const isSelected = selected===i;
              return (
                <div key={dom.key} onClick={()=>setSelected(isSelected?null:i)} style={{
                  background:isSelected?"rgba(43,191,164,.08)":"rgba(255,255,255,.7)",
                  border:`1px solid ${isSelected?"rgba(43,191,164,.4)":"rgba(43,191,164,.15)"}`,
                  borderRadius:18, padding:"13px 14px", cursor:"pointer",
                  transition:"all .2s", boxShadow:isSelected?"0 4px 16px rgba(43,191,164,.1)":"none",
                }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                    <div style={{ fontSize:".82rem", fontWeight:700, color:"#1E3A5F" }}>{dom.nome}</div>
                    <div style={{ fontSize:".92rem", fontWeight:800, color:dom.cor }}>{cur}%</div>
                  </div>
                  <div style={{ height:6, background:"rgba(43,191,164,.12)", borderRadius:50, overflow:"hidden", marginBottom:4 }}>
                    <div style={{ height:"100%", width:barsOk?`${cur}%`:"0%", background:dom.g, borderRadius:50, transition:"width 1.2s ease" }}/>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ fontSize:".65rem", fontWeight:700, color:delta>=5?"#22a870":delta<0?"#f59e0b":"#8a9ab8" }}>
                      {delta>0?"+":""}{delta}% vs anterior
                    </div>
                  </div>
                  <Sparkline cur={cur} g={dom.g}/>
                </div>
              );
            })}
          </div>
        </div>

        {/* DETALHE DO DOMÍNIO SELECIONADO */}
        {selected !== null && (()=>{
          const dom  = DOMINIOS_CONFIG[selected];
          const cur  = d.atual[selected];
          const prev = d.prev[selected];
          const habs = HABILIDADES[dom.key] ?? [];
          return (
            <div style={{ background:"linear-gradient(135deg,rgba(43,191,164,.1),rgba(42,123,168,.07))", border:"1px solid rgba(43,191,164,.2)", borderRadius:20, padding:22 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:".65rem", fontWeight:700, textTransform:"uppercase", letterSpacing:".1em", color:"#2BBFA4", marginBottom:3 }}>{dom.nome}</div>
                  <div style={{ fontSize:".95rem", fontWeight:800, color:"#1E3A5F" }}>{dom.nome}</div>
                </div>
                <div style={{ fontSize:"1.5rem", fontWeight:800, color:"#2BBFA4" }}>{cur}%</div>
              </div>
              <div style={{ marginBottom:14 }}>
                <DetailChart cur={cur} prev={prev}/>
              </div>
              <div style={{ fontSize:".72rem", fontWeight:600, color:"#8a9ab8", marginBottom:10 }}>Habilidades neste domínio</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {habs.map(h=>(
                  <div key={h.n} style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ fontSize:".8rem", color:"#1E3A5F", fontWeight:500 }}>{h.n}</div>
                    <span style={{ fontSize:".65rem", fontWeight:700, padding:"2px 9px", borderRadius:50, ...STATUS_STYLE[h.s] }}>{STATUS_LABEL[h.s]}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ENGINE */}
        <div style={{ background:"linear-gradient(135deg,rgba(43,191,164,.1),rgba(42,123,168,.07))", border:"1px solid rgba(43,191,164,.2)", borderRadius:20, padding:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
            <FractaLogo logo="engine" height={20} alt="FractaEngine"/>
            <span style={{ fontSize:".65rem", fontWeight:700, textTransform:"uppercase", letterSpacing:".1em", color:"#2BBFA4" }}>FractaEngine</span>
          </div>
          <p style={{ fontSize:".88rem", color:"#1E3A5F", lineHeight:1.7 }}>
            {nome} avançou mais em <strong style={{ color:"#2BBFA4" }}>Interação social</strong> {periodo==="semana"?"essa semana":periodo==="mes"?"este mês":"desde o início"}. O FractaEngine identificou que ele está pronto para iniciar <strong style={{ color:"#2BBFA4" }}>combinação de duas palavras</strong> no domínio de Comunicação.
          </p>
        </div>

        {/* CONQUISTAS */}
        <div style={card}>
          <div style={{ fontSize:".62rem", fontWeight:700, textTransform:"uppercase", letterSpacing:".09em", color:"#2BBFA4", marginBottom:6 }}>Conquistas recentes</div>
          <div style={{ fontSize:".95rem", fontWeight:800, color:"#1E3A5F", marginBottom:16 }}>O que {nome} aprendeu</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {CONQUISTAS.map(c=>(
              <div key={c.nome} style={{ display:"flex", alignItems:"center", gap:13, padding:"13px 16px", background:"rgba(255,255,255,.7)", border:"1px solid rgba(43,191,164,.12)", borderRadius:16 }}>
                <div style={{ width:40, height:40, borderRadius:12, background:c.g, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1rem", flexShrink:0 }}>{c.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:".88rem", fontWeight:700, color:"#1E3A5F" }}>{c.nome}</div>
                  <div style={{ fontSize:".7rem", color:"#8a9ab8" }}>{c.date}</div>
                </div>
                {c.isNew && (
                  <span style={{ fontSize:".6rem", fontWeight:800, padding:"2px 9px", borderRadius:50, background:"linear-gradient(135deg,#2BBFA4,#7AE040)", color:"white", flexShrink:0 }}>Novo</span>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* MOBILE TAB BAR */}
      <nav style={{ position:"fixed", bottom:0, left:0, right:0, background:"rgba(255,255,255,.92)", backdropFilter:"blur(16px)", borderTop:"1px solid rgba(43,191,164,.15)", padding:"10px 0", zIndex:100 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)" }}>
          {[
            { href:"/app",             label:"Home",       icon:"M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
            { href:"/dashboard/atividade",   label:"Atividades", icon:"M9 11l3 3L22 4" },
            { href:"/dashboard/progresso",   label:"Progresso",  icon:"M22 12h-4l-3 9L9 3l-3 9H2", active:true },
            { href:"/app",             label:"Meu filho",  icon:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8" },
          ].map(item=>(
            <Link key={item.label} href={item.href} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"6px 0", textDecoration:"none", color:item.active?"#2BBFA4":"#8a9ab8" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon}/>
              </svg>
              <span style={{ fontSize:".62rem", fontWeight:600 }}>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
