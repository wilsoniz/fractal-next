"use client";
import { useState } from "react";
import Link from "next/link";
import { FractaLogo } from "@/components/fracta/FractaLogo";
import { FractalTriangle } from "@/components/fracta/FractalTriangle";

type Nivel = "junior"|"pleno"| "senior"|"supervisor";
type Step = "perfil"|"clinico"|"disponibilidade"|"revisao"|"enviado";

const NIVEIS: Record<Nivel, { label: string; desc: string; cor: string; req: string }> = {
  junior:     { label:"Terapeuta Júnior",    desc:"Formação em ABA, até 2 anos supervisionado",    cor:"rgba(0,201,167,.5)",  req:"Supervisão obrigatória" },
  pleno:      { label:"Terapeuta Pleno",     desc:"2–5 anos, casos complexos documentados",         cor:"rgba(0,201,167,.7)",  req:"ABAT ou equivalente" },
  senior:     { label:"Terapeuta Sênior",    desc:"Mais de 5 anos, capacidade de supervisão",       cor:"#00c9a7",             req:"Histórico verificado" },
  supervisor: { label:"Supervisor / BCBA",  desc:"Credencial BCBA ou equivalente reconhecida",     cor:"#7bed9f",             req:"Credencial BCBA" },
};

const ESPECIALIDADES = [
  "TEA","TDAH","Atrasos de linguagem","Comportamentos desafiadores",
  "Habilidades sociais","Autocuidado","Controle de impulsos","Habilidades acadêmicas",
];

const ABORDAGENS = [
  "DTT (Treino Discriminativo)","NET (Ensino em Ambiente Natural)",
  "PRT (Tratamento Pivotal)","Equivalência de Estímulos",
  "Análise Funcional","Encadeamento","PECS",
];

const DIAS = ["Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
const TURNOS = ["Manhã (8h–12h)","Tarde (13h–18h)","Noite (18h–21h)"];

export default function TerapeutaPage() {
  const [step,           setStep]           = useState<Step>("perfil");
  const [nome,           setNome]           = useState("");
  const [sobrenome,      setSobrenome]      = useState("");
  const [email,          setEmail]          = useState("");
  const [telefone,       setTelefone]       = useState("");
  const [cidade,         setCidade]         = useState("");
  const [estado,         setEstado]         = useState("");
  const [nivel,          setNivel]          = useState<Nivel|null>(null);
  const [anos,           setAnos]           = useState("");
  const [tipo,           setTipo]           = useState("");
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [abordagens,     setAbordagens]     = useState<string[]>([]);
  const [credencial,     setCredencial]     = useState("");
  const [bio,            setBio]            = useState("");
  const [dias,           setDias]           = useState<string[]>([]);
  const [turnos,         setTurnos]         = useState<string[]>([]);
  const [atendOnline,    setAtendOnline]    = useState(false);
  const [atendPresencial,setAtendPresencial]= useState(false);
  const [enviando,       setEnviando]       = useState(false);

  function toggleArr<T>(arr: T[], setArr: (v:T[])=>void, item: T) {
    setArr(arr.includes(item) ? arr.filter(x=>x!==item) : [...arr, item]);
  }

  async function enviarPerfil() {
    setEnviando(true);
    try {
      await fetch("https://fractal-behavior-production.up.railway.app/api/auth/cadastro-clinic", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ nome:`${nome} ${sobrenome}`, email, telefone, cidade, estado, nivel, anos, tipo, especialidades, abordagens, credencial, bio, dias, turnos, atendOnline, atendPresencial }),
      });
    } catch(_) { /* continua para tela de enviado */ }
    finally { setEnviando(false); setStep("enviado"); }
  }

  const input: React.CSSProperties = {
    width:"100%", padding:"11px 14px",
    border:"1px solid rgba(255,255,255,.12)", borderRadius:8,
    background:"rgba(255,255,255,.06)", color:"white",
    fontFamily:"var(--font-sans)", fontSize:".85rem", outline:"none",
    boxSizing:"border-box" as const, transition:"border-color .2s",
  };

  const select: React.CSSProperties = {
    ...input, appearance:"none" as const, cursor:"pointer",
    background:"rgba(13,32,64,.8)",
  };

  const gcard: React.CSSProperties = {
    background:"rgba(13,32,64,.7)", backdropFilter:"blur(14px)",
    border:"1px solid rgba(255,255,255,.09)", borderRadius:16, padding:22,
  };

  const chip = (active: boolean, cor="rgba(0,201,167,.2)", corText="#00c9a7"): React.CSSProperties => ({
    padding:"6px 13px", borderRadius:50, cursor:"pointer",
    border:`1px solid ${active ? cor : "rgba(255,255,255,.1)"}`,
    background: active ? cor : "transparent",
    color: active ? corText : "rgba(255,255,255,.45)",
    fontFamily:"var(--font-sans)", fontSize:".72rem", fontWeight:700,
    transition:"all .2s",
  });

  const STEPS: Step[] = ["perfil","clinico","disponibilidade","revisao"];
  const stepIdx = STEPS.indexOf(step as any);

  return (
    <div style={{ fontFamily:"var(--font-sans)", background:"#07111f", color:"white", minHeight:"100vh" }}>

      {/* NAV */}
      <nav style={{ background:"rgba(7,17,31,.92)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(255,255,255,.08)", padding:"0 20px", height:54, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:50 }}>
        <Link href="/clinic" style={{ textDecoration:"none" }}>
          <FractaLogo logo="clinic" height={24} alt="FractaClinic"/>
        </Link>
        <span style={{ fontSize:".75rem", color:"rgba(255,255,255,.4)" }}>
          {step==="enviado" ? "Perfil enviado" : `Etapa ${stepIdx+1} de ${STEPS.length}`}
        </span>
        <Link href="/clinic" style={{ fontSize:".72rem", color:"rgba(255,255,255,.4)", textDecoration:"none" }}>Cancelar</Link>
      </nav>

      {/* BARRA DE PROGRESSO */}
      {step !== "enviado" && (
        <div style={{ height:3, background:"rgba(255,255,255,.08)" }}>
          <div style={{ height:"100%", width:`${((stepIdx+1)/STEPS.length)*100}%`, background:"linear-gradient(90deg,#00c9a7,#7bed9f)", transition:"width .5s ease" }}/>
        </div>
      )}

      <div style={{ maxWidth:640, margin:"0 auto", padding:"28px 18px 60px" }}>

        {/* STEP INDICATOR */}
        {step !== "enviado" && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:0, marginBottom:28 }}>
            {[["perfil","Perfil"],["clinico","Clínico"],["disponibilidade","Agenda"],["revisao","Revisão"]].map(([k,l],i)=>{
              const done = stepIdx > i;
              const active = stepIdx === i;
              return (
                <div key={k} style={{ display:"flex", alignItems:"center" }}>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                    <div style={{ width:26, height:26, borderRadius:"50%", background:done?"linear-gradient(135deg,#00c9a7,#7bed9f)":active?"#00c9a7":"rgba(255,255,255,.1)", color:done||active?"#07111f":"rgba(255,255,255,.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:".65rem", fontWeight:800, boxShadow:active?"0 0 0 3px rgba(0,201,167,.25)":"none" }}>
                      {done?"✓":i+1}
                    </div>
                    <span style={{ fontSize:".58rem", color:active?"#00c9a7":"rgba(255,255,255,.3)", marginTop:4, fontWeight:active?700:400 }}>{l}</span>
                  </div>
                  {i<3 && <div style={{ width:40, height:2, background:done?"#00c9a7":"rgba(255,255,255,.1)", margin:"0 4px 16px", transition:"background .3s" }}/>}
                </div>
              );
            })}
          </div>
        )}

        {/* ── ETAPA 1: PERFIL PESSOAL ── */}
        {step==="perfil" && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div>
              <div style={{ fontSize:".65rem", fontWeight:700, textTransform:"uppercase", letterSpacing:".12em", color:"#00c9a7", marginBottom:6 }}>Etapa 1</div>
              <h2 style={{ fontSize:"1.2rem", fontWeight:800, marginBottom:4 }}>Dados pessoais e contato</h2>
              <p style={{ fontSize:".82rem", color:"rgba(255,255,255,.45)", lineHeight:1.65 }}>Estas informações identificam seu perfil no FractaEngine.</p>
            </div>
            <div style={gcard}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                {[
                  { label:"Nome", val:nome,      set:setNome,      placeholder:"Seu nome" },
                  { label:"Sobrenome", val:sobrenome, set:setSobrenome, placeholder:"Seu sobrenome" },
                ].map(f=>(
                  <div key={f.label}>
                    <label style={{ fontSize:".72rem", fontWeight:700, color:"rgba(255,255,255,.45)", display:"block", marginBottom:5 }}>{f.label}</label>
                    <input style={input} value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.placeholder}
                      onFocus={e=>(e.target.style.borderColor="rgba(0,201,167,.4)")}
                      onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,.12)")}
                    />
                  </div>
                ))}
                <div style={{ gridColumn:"1/-1" }}>
                  <label style={{ fontSize:".72rem", fontWeight:700, color:"rgba(255,255,255,.45)", display:"block", marginBottom:5 }}>E-mail profissional</label>
                  <input style={input} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com"
                    onFocus={e=>(e.target.style.borderColor="rgba(0,201,167,.4)")}
                    onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,.12)")}
                  />
                </div>
                <div>
                  <label style={{ fontSize:".72rem", fontWeight:700, color:"rgba(255,255,255,.45)", display:"block", marginBottom:5 }}>WhatsApp</label>
                  <input style={input} value={telefone} onChange={e=>setTelefone(e.target.value)} placeholder="(11) 99999-9999"
                    onFocus={e=>(e.target.style.borderColor="rgba(0,201,167,.4)")}
                    onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,.12)")}
                  />
                </div>
                <div>
                  <label style={{ fontSize:".72rem", fontWeight:700, color:"rgba(255,255,255,.45)", display:"block", marginBottom:5 }}>Estado</label>
                  <select style={select} value={estado} onChange={e=>setEstado(e.target.value)}>
                    <option value="">Selecione</option>
                    {["SP","RJ","MG","RS","PR","SC","BA","PE","CE","GO","DF","Outro"].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn:"1/-1" }}>
                  <label style={{ fontSize:".72rem", fontWeight:700, color:"rgba(255,255,255,.45)", display:"block", marginBottom:5 }}>Cidade</label>
                  <input style={input} value={cidade} onChange={e=>setCidade(e.target.value)} placeholder="Sua cidade"
                    onFocus={e=>(e.target.style.borderColor="rgba(0,201,167,.4)")}
                    onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,.12)")}
                  />
                </div>
              </div>
            </div>
            <button onClick={()=>setStep("clinico")} style={{ padding:"14px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#00c9a7,#0f8f7a)", color:"#07111f", fontWeight:800, fontSize:".92rem", cursor:"pointer", fontFamily:"var(--font-sans)" }}>
              Continuar →
            </button>
          </div>
        )}

        {/* ── ETAPA 2: PERFIL CLÍNICO ── */}
        {step==="clinico" && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div>
              <div style={{ fontSize:".65rem", fontWeight:700, textTransform:"uppercase", letterSpacing:".12em", color:"#00c9a7", marginBottom:6 }}>Etapa 2</div>
              <h2 style={{ fontSize:"1.2rem", fontWeight:800, marginBottom:4 }}>Perfil clínico</h2>
              <p style={{ fontSize:".82rem", color:"rgba(255,255,255,.45)", lineHeight:1.65 }}>Estas informações determinam seu nível de senioridade e visibilidade no FractaEngine.</p>
            </div>

            {/* Nível */}
            <div style={gcard}>
              <div style={{ fontSize:".65rem", fontWeight:700, textTransform:"uppercase", letterSpacing:".09em", color:"rgba(255,255,255,.4)", marginBottom:12 }}>Nível de senioridade</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {(Object.entries(NIVEIS) as [Nivel, typeof NIVEIS[Nivel]][]).map(([k,v])=>(
                  <div key={k} onClick={()=>setNivel(k)} style={{
                    display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:"14px 16px", borderRadius:12, cursor:"pointer",
                    border:`1px solid ${nivel===k?v.cor:"rgba(255,255,255,.1)"}`,
                    background:nivel===k?"rgba(0,201,167,.08)":"rgba(255,255,255,.03)",
                    transition:"all .2s",
                  }}>
                    <div>
                      <div style={{ fontSize:".88rem", fontWeight:700, color:nivel===k?"#00c9a7":"white" }}>{v.label}</div>
                      <div style={{ fontSize:".72rem", color:"rgba(255,255,255,.45)", marginTop:2 }}>{v.desc}</div>
                    </div>
                    <div style={{ fontSize:".65rem", fontWeight:700, padding:"3px 10px", borderRadius:50, background:`${v.cor}22`, color:v.cor, flexShrink:0, marginLeft:12 }}>{v.req}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tipo e anos */}
            <div style={gcard}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
                <div>
                  <label style={{ fontSize:".72rem", fontWeight:700, color:"rgba(255,255,255,.45)", display:"block", marginBottom:5 }}>Tipo de atuação</label>
                  <select style={select} value={tipo} onChange={e=>setTipo(e.target.value)}>
                    <option value="">Selecione</option>
                    {["Terapeuta ABA","Psicólogo comportamental","Fonoaudiólogo com formação ABA","Pedagogo com formação ABA","Supervisor / BCBA"].map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:".72rem", fontWeight:700, color:"rgba(255,255,255,.45)", display:"block", marginBottom:5 }}>Anos de experiência</label>
                  <select style={select} value={anos} onChange={e=>setAnos(e.target.value)}>
                    <option value="">Selecione</option>
                    {["Menos de 1","1–2","2–5","5–10","Mais de 10"].map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              {/* Especialidades */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:".72rem", fontWeight:700, color:"rgba(255,255,255,.45)", marginBottom:8 }}>Especialidades (selecione todas que se aplicam)</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                  {ESPECIALIDADES.map(s=>(
                    <button key={s} onClick={()=>toggleArr(especialidades,setEspecialidades,s)} style={chip(especialidades.includes(s))}>{s}</button>
                  ))}
                </div>
              </div>

              {/* Abordagens */}
              <div>
                <div style={{ fontSize:".72rem", fontWeight:700, color:"rgba(255,255,255,.45)", marginBottom:8 }}>Abordagens utilizadas</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                  {ABORDAGENS.map(a=>(
                    <button key={a} onClick={()=>toggleArr(abordagens,setAbordagens,a)} style={chip(abordagens.includes(a),"rgba(30,144,255,.25)","#60a5fa")}>{a}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Credencial e bio */}
            <div style={gcard}>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:".72rem", fontWeight:700, color:"rgba(255,255,255,.45)", display:"block", marginBottom:5 }}>Número de registro / credencial (opcional)</label>
                <input style={input} value={credencial} onChange={e=>setCredencial(e.target.value)} placeholder="CRP, ABAT, BCBA..."
                  onFocus={e=>(e.target.style.borderColor="rgba(0,201,167,.4)")}
                  onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,.12)")}
                />
              </div>
              <div>
                <label style={{ fontSize:".72rem", fontWeight:700, color:"rgba(255,255,255,.45)", display:"block", marginBottom:5 }}>Mini bio profissional</label>
                <textarea style={{ ...input, resize:"none" } as React.CSSProperties} rows={3} value={bio} onChange={e=>setBio(e.target.value)} placeholder="Descreva sua abordagem, experiência e diferenciais em 2–3 frases..."
                  onFocus={e=>(e.target.style.borderColor="rgba(0,201,167,.4)")}
                  onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,.12)")}
                />
              </div>
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setStep("perfil")} style={{ padding:"13px 20px", borderRadius:10, border:"1px solid rgba(255,255,255,.12)", background:"transparent", color:"rgba(255,255,255,.6)", fontFamily:"var(--font-sans)", fontWeight:600, fontSize:".88rem", cursor:"pointer" }}>← Voltar</button>
              <button onClick={()=>setStep("disponibilidade")} style={{ flex:1, padding:"13px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#00c9a7,#0f8f7a)", color:"#07111f", fontWeight:800, fontSize:".92rem", cursor:"pointer", fontFamily:"var(--font-sans)" }}>Continuar →</button>
            </div>
          </div>
        )}

        {/* ── ETAPA 3: DISPONIBILIDADE ── */}
        {step==="disponibilidade" && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div>
              <div style={{ fontSize:".65rem", fontWeight:700, textTransform:"uppercase", letterSpacing:".12em", color:"#00c9a7", marginBottom:6 }}>Etapa 3</div>
              <h2 style={{ fontSize:"1.2rem", fontWeight:800, marginBottom:4 }}>Disponibilidade</h2>
              <p style={{ fontSize:".82rem", color:"rgba(255,255,255,.45)", lineHeight:1.65 }}>O FractaEngine usa estas informações para compatibilizar com famílias disponíveis.</p>
            </div>

            <div style={gcard}>
              <div style={{ fontSize:".72rem", fontWeight:700, color:"rgba(255,255,255,.45)", marginBottom:10 }}>Dias disponíveis</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginBottom:20 }}>
                {DIAS.map(d=>(
                  <button key={d} onClick={()=>toggleArr(dias,setDias,d)} style={chip(dias.includes(d))}>{d}</button>
                ))}
              </div>

              <div style={{ fontSize:".72rem", fontWeight:700, color:"rgba(255,255,255,.45)", marginBottom:10 }}>Turnos disponíveis</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
                {TURNOS.map(t=>(
                  <div key={t} onClick={()=>toggleArr(turnos,setTurnos,t)} style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 14px", borderRadius:10, cursor:"pointer", border:`1px solid ${turnos.includes(t)?"rgba(0,201,167,.4)":"rgba(255,255,255,.1)"}`, background:turnos.includes(t)?"rgba(0,201,167,.08)":"rgba(255,255,255,.03)" }}>
                    <div style={{ width:18, height:18, borderRadius:"50%", border:`2px solid ${turnos.includes(t)?"#00c9a7":"rgba(255,255,255,.2)"}`, background:turnos.includes(t)?"#00c9a7":"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      {turnos.includes(t) && <div style={{ width:6, height:6, borderRadius:"50%", background:"#07111f" }}/>}
                    </div>
                    <span style={{ fontSize:".82rem", fontWeight:600, color:turnos.includes(t)?"#00c9a7":"rgba(255,255,255,.6)" }}>{t}</span>
                  </div>
                ))}
              </div>

              <div style={{ fontSize:".72rem", fontWeight:700, color:"rgba(255,255,255,.45)", marginBottom:10 }}>Modalidade de atendimento</div>
              <div style={{ display:"flex", gap:10 }}>
                {[["Online",atendOnline,setAtendOnline],["Presencial",atendPresencial,setAtendPresencial]].map(([label,val,set])=>(
                  <div key={label as string} onClick={()=>(set as Function)(!val)} style={{ flex:1, padding:"11px", borderRadius:10, cursor:"pointer", border:`1px solid ${val?"rgba(0,201,167,.4)":"rgba(255,255,255,.1)"}`, background:val?"rgba(0,201,167,.08)":"rgba(255,255,255,.03)", textAlign:"center" }}>
                    <div style={{ fontSize:".82rem", fontWeight:700, color:val?"#00c9a7":"rgba(255,255,255,.5)" }}>{label as string}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setStep("clinico")} style={{ padding:"13px 20px", borderRadius:10, border:"1px solid rgba(255,255,255,.12)", background:"transparent", color:"rgba(255,255,255,.6)", fontFamily:"var(--font-sans)", fontWeight:600, fontSize:".88rem", cursor:"pointer" }}>← Voltar</button>
              <button onClick={()=>setStep("revisao")} style={{ flex:1, padding:"13px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#00c9a7,#0f8f7a)", color:"#07111f", fontWeight:800, fontSize:".92rem", cursor:"pointer", fontFamily:"var(--font-sans)" }}>Revisar perfil →</button>
            </div>
          </div>
        )}

        {/* ── ETAPA 4: REVISÃO ── */}
        {step==="revisao" && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div>
              <div style={{ fontSize:".65rem", fontWeight:700, textTransform:"uppercase", letterSpacing:".12em", color:"#00c9a7", marginBottom:6 }}>Revisão</div>
              <h2 style={{ fontSize:"1.2rem", fontWeight:800, marginBottom:4 }}>Confirme seu perfil</h2>
              <p style={{ fontSize:".82rem", color:"rgba(255,255,255,.45)", lineHeight:1.65 }}>Verifique as informações antes de enviar para o processo de seleção.</p>
            </div>

            {[
              { titulo:"Dados pessoais", items:[
                { label:"Nome", val:`${nome} ${sobrenome}` },
                { label:"E-mail", val:email },
                { label:"Localização", val:`${cidade}, ${estado}` },
              ]},
              { titulo:"Perfil clínico", items:[
                { label:"Nível", val:nivel?NIVEIS[nivel].label:"—" },
                { label:"Tipo", val:tipo||"—" },
                { label:"Experiência", val:anos?`${anos} anos`:"—" },
                { label:"Especialidades", val:especialidades.join(", ")||"—" },
              ]},
              { titulo:"Disponibilidade", items:[
                { label:"Dias", val:dias.join(", ")||"—" },
                { label:"Turnos", val:turnos.join(", ")||"—" },
                { label:"Modalidade", val:[atendOnline&&"Online",atendPresencial&&"Presencial"].filter(Boolean).join(" + ")||"—" },
              ]},
            ].map(sec=>(
              <div key={sec.titulo} style={gcard}>
                <div style={{ fontSize:".72rem", fontWeight:700, textTransform:"uppercase", letterSpacing:".09em", color:"#00c9a7", marginBottom:12 }}>{sec.titulo}</div>
                {sec.items.map(item=>(
                  <div key={item.label} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,.05)" }}>
                    <div style={{ fontSize:".78rem", color:"rgba(255,255,255,.4)" }}>{item.label}</div>
                    <div style={{ fontSize:".78rem", fontWeight:600, maxWidth:"60%", textAlign:"right" }}>{item.val}</div>
                  </div>
                ))}
              </div>
            ))}

            {/* Aviso */}
            <div style={{ background:"rgba(0,201,167,.08)", border:"1px solid rgba(0,201,167,.2)", borderRadius:14, padding:"14px 16px" }}>
              <div style={{ fontSize:".72rem", color:"#00c9a7", fontWeight:700, marginBottom:5 }}>O que acontece depois</div>
              <div style={{ fontSize:".78rem", color:"rgba(255,255,255,.55)", lineHeight:1.65 }}>
                Seu perfil passa por revisão em até 48h. Você receberá um e-mail com o resultado e o nível de senioridade definido. O FractaEngine começa as indicações assim que o perfil for aprovado.
              </div>
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setStep("disponibilidade")} style={{ padding:"13px 20px", borderRadius:10, border:"1px solid rgba(255,255,255,.12)", background:"transparent", color:"rgba(255,255,255,.6)", fontFamily:"var(--font-sans)", fontWeight:600, fontSize:".88rem", cursor:"pointer" }}>← Voltar</button>
              <button onClick={enviarPerfil} disabled={enviando} style={{ flex:1, padding:"13px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#00c9a7,#0f8f7a)", color:"#07111f", fontWeight:800, fontSize:".92rem", cursor:enviando?"not-allowed":"pointer", fontFamily:"var(--font-sans)", opacity:enviando?.7:1 }}>
                {enviando?"Enviando...":"Enviar perfil para seleção"}
              </button>
            </div>
          </div>
        )}

        {/* ── ENVIADO ── */}
        {step==="enviado" && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", gap:20, paddingTop:40 }}>
            <div style={{ display:"flex", justifyContent:"center" }}>
              <FractalTriangle size={120} animate style={{ filter:"hue-rotate(160deg) saturate(1.1)" }}/>
            </div>
            <div>
              <div style={{ fontSize:".72rem", fontWeight:700, textTransform:"uppercase", letterSpacing:".12em", color:"#00c9a7", marginBottom:10 }}>Perfil enviado</div>
              <h2 style={{ fontSize:"1.4rem", fontWeight:800, marginBottom:10, lineHeight:1.2 }}>Seu perfil está em análise</h2>
              <p style={{ fontSize:".88rem", color:"rgba(255,255,255,.55)", lineHeight:1.75, maxWidth:400 }}>
                Recebemos seu cadastro. Nossa equipe vai revisar suas informações e definir seu nível de senioridade em até 48 horas. Você receberá um e-mail com o resultado.
              </p>
            </div>

            <div style={{ width:"100%", maxWidth:400, background:"rgba(13,32,64,.7)", border:"1px solid rgba(0,201,167,.15)", borderRadius:16, padding:20, display:"flex", flexDirection:"column", gap:12 }}>
              {[
                { icon:"✓", label:"Perfil recebido e em análise" },
                { icon:"⏱", label:"Revisão em até 48 horas" },
                { icon:"📧", label:`E-mail de confirmação para ${email}` },
                { icon:"🤖", label:"FractaEngine ativo após aprovação" },
              ].map(item=>(
                <div key={item.label} style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:24, height:24, borderRadius:"50%", background:"rgba(0,201,167,.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:".75rem", flexShrink:0 }}>{item.icon}</div>
                  <div style={{ fontSize:".8rem", color:"rgba(255,255,255,.65)" }}>{item.label}</div>
                </div>
              ))}
            </div>

            <Link href="/clinic" style={{ padding:"13px 32px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#00c9a7,#0f8f7a)", color:"#07111f", fontWeight:800, fontSize:".9rem", textDecoration:"none" }}>
              Voltar ao FractaClinic
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
