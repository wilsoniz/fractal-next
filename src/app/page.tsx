'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{
      background: '#07111f',
      color: '#e8edf2',
      minHeight: '100vh',
      fontFamily: 'var(--font-sans)',
    }}>

      {/* ── Navbar ── */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 40px',
        borderBottom: '0.5px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, fontWeight: 500, letterSpacing: '-0.3px' }}>
          <FractaLogo size={28} />
          Fracta Behavior
        </div>

        <div style={{ display: 'flex', gap: 28 }}>
          {[['Sobre', '#'], ['Base científica', '#'], ['Para clínicas', '#']].map(([label, href]) => (
            <a key={label} href={href} style={{ fontSize: 13, color: 'rgba(232,237,242,0.5)', textDecoration: 'none' }}>
              {label}
            </a>
          ))}
        </div>

        <a href="mailto:contato@fractabehavior.com" style={{
          fontSize: 13, color: '#1D9E75', textDecoration: 'none',
          border: '0.5px solid rgba(29,158,117,0.4)', padding: '7px 16px', borderRadius: 6,
        }}>
          Contato
        </a>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        padding: '80px 40px 64px',
        textAlign: 'center',
        borderBottom: '0.5px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          display: 'inline-block', fontSize: 11, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'rgba(29,158,117,0.9)',
          border: '0.5px solid rgba(29,158,117,0.25)', padding: '5px 14px',
          borderRadius: 20, marginBottom: 32,
        }}>
          Análise do Comportamento Aplicada
        </div>

        <h1 style={{
          fontSize: 48, fontWeight: 400, lineHeight: 1.1,
          letterSpacing: '-1.5px', color: '#e8edf2', marginBottom: 20,
          maxWidth: 680, marginLeft: 'auto', marginRight: 'auto',
        }}>
          Infraestrutura digital para{' '}
          <span style={{ color: '#1D9E75' }}>desenvolvimento infantil</span>
          {' '}e prática clínica.
        </h1>

        <p style={{
          fontSize: 16, color: 'rgba(232,237,242,0.5)', lineHeight: 1.65,
          maxWidth: 480, margin: '0 auto 48px', fontWeight: 400,
        }}>
          Um ecossistema que conecta famílias, terapeutas e a criança em um único sistema de dados, ciência e acompanhamento contínuo.
        </p>
      </section>

      {/* ── Plataformas ── */}
      <div style={{ height: 40 }} />

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 1, background: 'rgba(255,255,255,0.06)',
        margin: '0 40px', borderRadius: 12, overflow: 'hidden',
      }}>
        <PlatformCard
          tag="Para famílias"
          tagColor="#1D9E75"
          tagBg="rgba(29,158,117,0.12)"
          name="FractaCare"
          desc="Acompanhe o desenvolvimento do seu filho com atividades personalizadas baseadas em ciência comportamental."
          features={[
            'Mapa de habilidades por domínio',
            'Atividades guiadas para o cotidiano',
            'Evolução registrada em tempo real',
            'Conexão com o terapeuta da criança',
          ]}
          dotColor="rgba(29,158,117,0.5)"
          actionLabel="Acessar FractaCare"
          actionColor="#1D9E75"
          actionBorder="rgba(29,158,117,0.3)"
          href="/care/login"
          logo={<CareLogoPlaceholder />}
          borderRadius="12px 0 0 12px"
        />

        <PlatformCard
          tag="Para terapeutas ABA"
          tagColor="#378ADD"
          tagBg="rgba(55,138,221,0.12)"
          name="FractaClinic"
          desc="Plataforma completa para terapeutas conduzirem intervenções guiadas, supervisão e crescimento profissional."
          features={[
            'Planos de intervenção e programas',
            'Sessão clínica com registro de trials',
            'Supervisão e educação continuada',
            'Carteira de pacientes e receita',
          ]}
          dotColor="rgba(55,138,221,0.5)"
          actionLabel="Acessar FractaClinic"
          actionColor="#378ADD"
          actionBorder="rgba(55,138,221,0.3)"
          href="/clinic/login"
          logo={<ClinicLogoPlaceholder />}
          borderRadius="0"
        />

        <PlatformCard
          tag="Para a criança"
          tagColor="#EF9F27"
          tagBg="rgba(239,159,39,0.12)"
          name="Fracta Spark"
          desc="Interface de treino digital enviada pelo terapeuta. A criança executa, o sistema registra cada tentativa."
          features={[
            'Treino MTS com estímulos configurados',
            'Reforço elaborado e conquistas',
            'Dados salvos automaticamente',
            'Sem login — acesso por link do terapeuta',
          ]}
          dotColor="rgba(239,159,39,0.5)"
          actionLabel="Acessar Fracta Spark"
          actionColor="#EF9F27"
          actionBorder="rgba(239,159,39,0.3)"
          href="/apprentice"
          logo={<SparkLogoPlaceholder />}
          borderRadius="0 12px 12px 0"
        />
      </div>

      <div style={{ height: 40 }} />

      {/* ── Divider ── */}
      <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.06)', margin: '0 40px' }} />

      {/* ── FractaEngine ── */}
      <section style={{
        padding: '64px 40px',
        display: 'flex',
        gap: 60,
        alignItems: 'flex-start',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'rgba(29,158,117,0.7)', marginBottom: 16,
          }}>
            FractaEngine
          </div>
          <h2 style={{
            fontSize: 28, fontWeight: 400, letterSpacing: '-0.8px',
            color: '#e8edf2', lineHeight: 1.2, marginBottom: 16,
          }}>
            O sistema inteligente<br />que conecta tudo.
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(232,237,242,0.45)', lineHeight: 1.7 }}>
            O FractaEngine analisa cada sessão, calcula evolução por domínio, detecta barreiras e orienta o próximo passo da intervenção — em tempo real, para o terapeuta e para a família.
          </p>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { dot: '#1D9E75', title: 'Matching inteligente', desc: 'conecta a demanda da família ao perfil do terapeuta' },
            { dot: '#378ADD', title: 'Previsibilidade clínica', desc: 'analisa tendência de evolução por domínio' },
            { dot: '#EF9F27', title: 'Intervenção guiada', desc: 'recomendações baseadas em dados de tentativas' },
            { dot: '#8B7FE8', title: 'Radar compartilhado', desc: 'mesmos dados, visões distintas para família e terapeuta' },
          ].map(({ dot, title, desc }) => (
            <div key={title} style={{
              background: 'rgba(13,32,53,0.75)',
              border: '0.5px solid rgba(26,58,92,0.5)',
              borderRadius: 8, padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0 }} />
              <div style={{ fontSize: 13, color: 'rgba(232,237,242,0.6)' }}>
                <span style={{ color: '#e8edf2', fontWeight: 500 }}>{title}</span>
                {' — '}{desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        padding: '24px 40px',
        borderTop: '0.5px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 12, color: 'rgba(232,237,242,0.25)' }}>
          © 2025 Fracta Behavior. Todos os direitos reservados.
        </span>
        <div style={{ display: 'flex', gap: 20 }}>
          {[['Privacidade', '#'], ['Termos', '#'], ['Contato', 'mailto:contato@fractabehavior.com']].map(([label, href]) => (
            <a key={label} href={href} style={{ fontSize: 12, color: 'rgba(232,237,242,0.25)', textDecoration: 'none' }}>
              {label}
            </a>
          ))}
        </div>
      </footer>

    </main>
  );
}

/* ── Sub-componentes ── */

function PlatformCard({
  tag, tagColor, tagBg, name, desc, features, dotColor,
  actionLabel, actionColor, actionBorder, href, logo, borderRadius,
}: {
  tag: string; tagColor: string; tagBg: string; name: string; desc: string;
  features: string[]; dotColor: string; actionLabel: string; actionColor: string;
  actionBorder: string; href: string; logo: React.ReactNode; borderRadius: string;
}) {
  return (
    <Link href={href} style={{
      background: 'rgba(13,32,53,0.75)',
      padding: '36px 32px',
      display: 'flex', flexDirection: 'column', gap: 20,
      borderRadius, textDecoration: 'none', cursor: 'pointer',
      transition: 'background 0.2s',
    }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(13,32,53,0.95)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(13,32,53,0.75)')}
    >
      <span style={{
        fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
        fontWeight: 500, padding: '4px 10px', borderRadius: 4,
        background: tagBg, color: tagColor, alignSelf: 'flex-start',
      }}>
        {tag}
      </span>

      {/* Logo placeholder — substituir pela tag <Image> quando os arquivos chegarem */}
      <div style={{ height: 36, display: 'flex', alignItems: 'center' }}>
        {logo}
      </div>

      <div>
        <div style={{ fontSize: 20, fontWeight: 500, color: '#e8edf2', letterSpacing: '-0.4px', marginBottom: 8 }}>
          {name}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(232,237,242,0.45)', lineHeight: 1.6 }}>
          {desc}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {features.map(f => (
          <div key={f} style={{ fontSize: 12, color: 'rgba(232,237,242,0.4)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
            {f}
          </div>
        ))}
      </div>

      <div style={{
        fontSize: 12, fontWeight: 500, padding: '9px 16px',
        borderRadius: 6, textAlign: 'center',
        border: `0.5px solid ${actionBorder}`, color: actionColor,
        marginTop: 4,
      }}>
        {actionLabel}
      </div>
    </Link>
  );
}

/* Logos placeholder — substituir pelo componente <Image> quando os arquivos chegarem:
   import Image from 'next/image';
   <Image src="/logos/fractacare.svg" alt="FractaCare" width={120} height={36} />
*/

function FractaLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <polygon points="14,2 26,22 2,22" fill="none" stroke="#1D9E75" strokeWidth="1.2" />
      <polygon points="14,9 20,20 8,20" fill="rgba(29,158,117,0.15)" stroke="#1D9E75" strokeWidth="0.8" />
      <polygon points="14,15 17,20 11,20" fill="#1D9E75" />
    </svg>
  );
}

function CareLogoPlaceholder() {
  return (
    <svg width="110" height="28" viewBox="0 0 110 28" fill="none">
      <polygon points="14,2 24,20 4,20" fill="none" stroke="#1D9E75" strokeWidth="1" />
      <polygon points="14,8 19,18 9,18" fill="rgba(29,158,117,0.15)" stroke="#1D9E75" strokeWidth="0.7" />
      <polygon points="14,13 17,18 11,18" fill="#1D9E75" />
      <text x="32" y="19" fill="#e8edf2" fontSize="14" fontWeight="500" fontFamily="var(--font-sans)">FractaCare</text>
    </svg>
  );
}

function ClinicLogoPlaceholder() {
  return (
    <svg width="120" height="28" viewBox="0 0 120 28" fill="none">
      <polygon points="14,2 24,20 4,20" fill="none" stroke="#378ADD" strokeWidth="1" />
      <polygon points="14,8 19,18 9,18" fill="rgba(55,138,221,0.15)" stroke="#378ADD" strokeWidth="0.7" />
      <polygon points="14,13 17,18 11,18" fill="#378ADD" />
      <text x="32" y="19" fill="#e8edf2" fontSize="14" fontWeight="500" fontFamily="var(--font-sans)">FractaClinic</text>
    </svg>
  );
}

function SparkLogoPlaceholder() {
  return (
    <svg width="110" height="28" viewBox="0 0 110 28" fill="none">
      <polygon points="14,2 24,20 4,20" fill="none" stroke="#EF9F27" strokeWidth="1" />
      <polygon points="14,8 19,18 9,18" fill="rgba(239,159,39,0.15)" stroke="#EF9F27" strokeWidth="0.7" />
      <polygon points="14,13 17,18 11,18" fill="#EF9F27" />
      <text x="32" y="19" fill="#e8edf2" fontSize="14" fontWeight="500" fontFamily="var(--font-sans)">Fracta Spark</text>
    </svg>
  );
}
