'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ background: '#07111f', color: '#e8edf2', minHeight: '100vh', fontFamily: 'var(--font-sans)' }}>

      {/* ── Navbar ── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logos/fracta-behavior.png" alt="Fracta Behavior" style={{ height: 32, width: 'auto', mixBlendMode: 'screen' }} />
        <a href="mailto:contato@fractabehavior.com" style={{
          fontSize: 12, color: '#1D9E75', textDecoration: 'none',
          border: '0.5px solid rgba(29,158,117,0.4)', padding: '6px 14px', borderRadius: 6,
        }}>
          Contato
        </a>
      </nav>

      {/* ── Hero ── */}
      <section style={{ padding: '52px 24px 44px', textAlign: 'center', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
        <div style={{
          display: 'inline-block', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'rgba(29,158,117,0.9)', border: '0.5px solid rgba(29,158,117,0.25)',
          padding: '5px 14px', borderRadius: 20, marginBottom: 28,
        }}>
          Análise do Comportamento Aplicada
        </div>

        <h1 style={{
          fontSize: 'clamp(24px, 6vw, 48px)', fontWeight: 400, lineHeight: 1.15,
          letterSpacing: '-1px', color: '#e8edf2', marginBottom: 18,
        }}>
          Infraestrutura digital para{' '}
          <span style={{ color: '#1D9E75' }}>desenvolvimento infantil</span>
          {' '}e prática clínica.
        </h1>

        <p style={{
          fontSize: 15, color: 'rgba(232,237,242,0.5)', lineHeight: 1.65,
          maxWidth: 480, margin: '0 auto', fontWeight: 400,
        }}>
          Um ecossistema que conecta famílias, terapeutas e a criança em um único sistema de dados, ciência e acompanhamento contínuo.
        </p>
      </section>

      {/* ── Plataformas ── */}
      <div style={{ padding: '32px 20px' }}>

        {/* Care */}
        <div style={cardStyle}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/fracta-care.png" alt="FractaCare" style={logoStyle} />
          <span style={{ ...tagStyle, background: 'rgba(29,158,117,0.12)', color: '#1D9E75' }}>Para famílias</span>
          <p style={descStyle}>
            Acompanhe o desenvolvimento do seu filho com atividades personalizadas baseadas em ciência comportamental.
          </p>
          <div style={featuresStyle}>
            {['Mapa de habilidades por domínio', 'Atividades guiadas para o cotidiano', 'Evolução registrada em tempo real', 'Conexão com o terapeuta da criança'].map(f => (
              <div key={f} style={featureItemStyle}>
                <div style={{ ...dotStyle, background: 'rgba(29,158,117,0.6)' }} />{f}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            <Link href="/care/login" style={{ ...ctaStyle, color: '#1D9E75', borderColor: 'rgba(29,158,117,0.3)' }}>
              Acessar FractaCare
            </Link>
            <Link href="/captura" style={{ ...saibaMaisStyle, color: 'rgba(29,158,117,0.7)' }}>
              Saiba mais sobre o FractaCare
            </Link>
          </div>
        </div>

        {/* Clinic */}
        <div style={cardStyle}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/fracta-clinic.png" alt="FractaClinic" style={logoStyle} />
          <span style={{ ...tagStyle, background: 'rgba(55,138,221,0.12)', color: '#378ADD' }}>Para terapeutas ABA</span>
          <p style={descStyle}>
            Plataforma completa para terapeutas conduzirem intervenções guiadas, supervisão e crescimento profissional.
          </p>
          <div style={featuresStyle}>
            {['Planos de intervenção e programas', 'Sessão clínica com registro de trials', 'Supervisão e educação continuada', 'Carteira de pacientes e receita'].map(f => (
              <div key={f} style={featureItemStyle}>
                <div style={{ ...dotStyle, background: 'rgba(55,138,221,0.6)' }} />{f}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            <Link href="/clinic/login" style={{ ...ctaStyle, color: '#378ADD', borderColor: 'rgba(55,138,221,0.3)' }}>
              Acessar FractaClinic
            </Link>
            <Link href="/clinic-landing" style={{ ...saibaMaisStyle, color: 'rgba(55,138,221,0.7)' }}>
              Saiba mais sobre o FractaClinic
            </Link>
          </div>
        </div>

        {/* Spark */}
        <div style={cardStyle}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/fracta-spark.png" alt="Fracta Spark" style={logoStyle} />
          <span style={{ ...tagStyle, background: 'rgba(239,159,39,0.12)', color: '#EF9F27' }}>Para a criança</span>
          <p style={descStyle}>
            Interface de treino digital enviada pelo terapeuta. A criança executa, o sistema registra cada tentativa.
          </p>
          <div style={featuresStyle}>
            {['Treino MTS com estímulos configurados', 'Reforço elaborado e conquistas', 'Dados salvos automaticamente', 'Sem login — acesso por link do terapeuta'].map(f => (
              <div key={f} style={featureItemStyle}>
                <div style={{ ...dotStyle, background: 'rgba(239,159,39,0.6)' }} />{f}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            <Link href="/spark" style={{ ...saibaMaisStyle, color: 'rgba(239,159,39,0.8)', border: '0.5px solid rgba(239,159,39,0.3)', borderRadius: 6, padding: '9px 16px', textAlign: 'center' }}>
              Saiba mais do Spark
            </Link>
          </div>
        </div>

      </div>

      {/* ── Divider ── */}
      <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.06)', margin: '0 20px' }} />

      {/* ── FractaEngine ── */}
      <section style={{ padding: '48px 24px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logos/fracta-engine.png" alt="FractaEngine" style={{ ...logoStyle, marginBottom: 16 }} />
        <h2 style={{
          fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: 400, letterSpacing: '-0.6px',
          color: '#e8edf2', lineHeight: 1.2, marginBottom: 12,
        }}>
          O sistema inteligente<br />que conecta tudo.
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(232,237,242,0.45)', lineHeight: 1.7, marginBottom: 24 }}>
          O FractaEngine analisa cada sessão, calcula evolução por domínio, detecta barreiras e orienta o próximo passo da intervenção — em tempo real, para o terapeuta e para a família.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { dot: '#1D9E75', title: 'Matching inteligente', desc: 'conecta a demanda da família ao perfil do terapeuta' },
            { dot: '#378ADD', title: 'Previsibilidade clínica', desc: 'analisa tendência de evolução por domínio' },
            { dot: '#EF9F27', title: 'Intervenção guiada', desc: 'recomendações baseadas em dados de tentativas' },
            { dot: '#8B7FE8', title: 'Radar compartilhado', desc: 'mesmos dados, visões distintas para família e terapeuta' },
          ].map(({ dot, title, desc }) => (
            <div key={title} style={{
              background: 'rgba(13,32,53,0.75)', border: '0.5px solid rgba(26,58,92,0.5)',
              borderRadius: 8, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0, marginTop: 6 }} />
              <div style={{ fontSize: 13, color: 'rgba(232,237,242,0.6)', lineHeight: 1.55 }}>
                <span style={{ color: '#e8edf2', fontWeight: 500 }}>{title}</span>{' — '}{desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        padding: '20px 24px', borderTop: '0.5px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', textAlign: 'center',
      }}>
        <span style={{ fontSize: 11, color: 'rgba(232,237,242,0.2)' }}>
          © 2025 Fracta Behavior. Todos os direitos reservados.
        </span>
        <div style={{ display: 'flex', gap: 16 }}>
          {[['Privacidade', '#'], ['Termos', '#'], ['Contato', 'mailto:contato@fractabehavior.com']].map(([label, href]) => (
            <a key={label} href={href} style={{ fontSize: 11, color: 'rgba(232,237,242,0.25)', textDecoration: 'none' }}>
              {label}
            </a>
          ))}
        </div>
      </footer>

      {/* ── Responsividade desktop ── */}
      <style>{`
        @media (min-width: 768px) {
          .platform-section {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1px;
            background: rgba(255,255,255,0.06);
            border-radius: 12px;
            overflow: hidden;
          }
          .engine-inner {
            display: flex;
            flex-direction: row;
            gap: 60px;
            align-items: flex-start;
          }
          footer {
            flex-direction: row !important;
            justify-content: space-between !important;
          }
        }
      `}</style>

    </main>
  );
}

/* ── Estilos compartilhados ── */

const cardStyle: React.CSSProperties = {
  background: 'rgba(13,32,53,0.75)',
  border: '0.5px solid rgba(26,58,92,0.5)',
  borderRadius: 10,
  padding: '28px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  marginBottom: 12,
};

const logoStyle: React.CSSProperties = {
  height: 36,
  width: 'auto',
  maxWidth: 160,
  objectFit: 'contain',
  mixBlendMode: 'screen',
};

const tagStyle: React.CSSProperties = {
  fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
  fontWeight: 500, padding: '4px 10px', borderRadius: 4,
  alignSelf: 'flex-start',
};

const descStyle: React.CSSProperties = {
  fontSize: 13, color: 'rgba(232,237,242,0.45)', lineHeight: 1.6, margin: 0,
};

const featuresStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 8, flex: 1,
};

const featureItemStyle: React.CSSProperties = {
  fontSize: 12, color: 'rgba(232,237,242,0.4)',
  display: 'flex', alignItems: 'flex-start', gap: 8,
};

const dotStyle: React.CSSProperties = {
  width: 4, height: 4, borderRadius: '50%', flexShrink: 0, marginTop: 5,
};

const ctaStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 500, padding: '9px 16px',
  borderRadius: 6, textAlign: 'center',
  border: '0.5px solid', textDecoration: 'none',
  display: 'block',
};

const saibaMaisStyle: React.CSSProperties = {
  fontSize: 12, textAlign: 'center', textDecoration: 'none',
  padding: '6px 0', display: 'block',
};
