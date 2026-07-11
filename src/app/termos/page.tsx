import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Termos de Uso — Fracta Behavior',
  description: 'Condições de uso do FractaCare (famílias) e do FractaClinic (profissionais).',
}

const h2: React.CSSProperties = { fontSize: '1.05rem', fontWeight: 800, color: '#1E3A5F', margin: '28px 0 10px' }
const p: React.CSSProperties = { fontSize: '.9rem', color: '#3a5a7a', lineHeight: 1.75, margin: '0 0 12px' }
const li: React.CSSProperties = { fontSize: '.9rem', color: '#3a5a7a', lineHeight: 1.75, marginBottom: 6 }

export default function TermosPage() {
  return (
    <main style={{ fontFamily: 'var(--font-sans)', background: '#f7fbfd', minHeight: '100vh' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 80px' }}>
        <Link href="/" style={{ fontSize: '.8rem', color: '#2BBFA4', textDecoration: 'none', fontWeight: 600 }}>← Fracta Behavior</Link>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1E3A5F', margin: '16px 0 6px' }}>Termos de Uso</h1>
        <p style={{ fontSize: '.78rem', color: '#8a9ab8', marginBottom: 24 }}>Vigentes a partir de 11 de julho de 2026.</p>

        <h2 style={h2}>1. O que é o Fracta Behavior</h2>
        <p style={p}>
          O Fracta Behavior oferece o <strong>FractaCare</strong>, ferramenta de apoio a famílias
          no acompanhamento do desenvolvimento infantil com base em Análise do Comportamento
          Aplicada (ABA), e o <strong>FractaClinic</strong>, plataforma de gestão clínica para
          profissionais. Ao criar uma conta, você concorda com estes termos e com a{' '}
          <Link href="/privacidade" style={{ color: '#2BBFA4' }}>Política de Privacidade</Link>.
        </p>

        <h2 style={h2}>2. O Fracta não substitui acompanhamento profissional</h2>
        <p style={p}>
          O FractaCare é uma ferramenta de apoio e psicoeducação. <strong>Ele não realiza
          diagnóstico, não prescreve tratamento e não substitui a avaliação ou o
          acompanhamento de profissionais de saúde.</strong> As avaliações e triagens do
          produto indicam áreas do desenvolvimento que podem merecer atenção e prática —
          nunca conclusões diagnósticas. Em caso de preocupação com a saúde ou segurança da
          criança, procure um profissional qualificado. O Fracta não é um serviço de
          emergência.
        </p>

        <h2 style={h2}>3. Gratuidade para famílias</h2>
        <p style={p}>
          <strong>O FractaCare é gratuito para famílias.</strong> Avaliação, mapa de
          habilidades e atividades não têm custo para o responsável. A monetização do Fracta
          ocorre exclusivamente do lado profissional (FractaClinic), cujas condições
          comerciais são apresentadas ao profissional na própria plataforma.
        </p>

        <h2 style={h2}>4. Conta e responsabilidades</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li style={li}>A conta no FractaCare deve ser criada por pessoa maior de 18 anos, responsável legal pela criança ou autorizada por ele;</li>
          <li style={li}>Você é responsável pela veracidade das informações fornecidas e pela guarda das suas credenciais;</li>
          <li style={li}>O compartilhamento de acesso ao perfil de uma criança (convites) é decisão e responsabilidade do responsável que convida;</li>
          <li style={li}>Profissionais no FractaClinic são responsáveis por suas condutas clínicas e pelo cumprimento das normas de seus conselhos profissionais.</li>
        </ul>

        <h2 style={h2}>5. Uso adequado</h2>
        <p style={p}>
          É vedado usar a plataforma para finalidade ilícita, tentar acessar dados de
          terceiros, comprometer a segurança do serviço ou inserir conteúdo falso. Contas em
          violação podem ser suspensas.
        </p>

        <h2 style={h2}>6. Conteúdo e propriedade intelectual</h2>
        <p style={p}>
          O conteúdo do Fracta (textos, atividades, marca, software) é protegido. Os dados
          que você insere continuam seus — nós os tratamos conforme a Política de
          Privacidade.
        </p>

        <h2 style={h2}>7. Disponibilidade e alterações</h2>
        <p style={p}>
          Trabalhamos para manter o serviço disponível e em evolução; funcionalidades podem
          ser adicionadas, ajustadas ou descontinuadas. Estes termos podem ser atualizados —
          a data de vigência no topo reflete a versão atual.
        </p>

        <h2 style={h2}>8. Limitação de responsabilidade</h2>
        <p style={p}>
          Na extensão permitida pela lei, o Fracta não se responsabiliza por decisões
          tomadas exclusivamente com base nas informações do produto sem acompanhamento
          profissional, nem por indisponibilidades temporárias do serviço.
        </p>

        <h2 style={h2}>9. Lei aplicável</h2>
        <p style={p}>
          Estes termos são regidos pela legislação brasileira.
        </p>

        <h2 style={h2}>10. Contato</h2>
        <p style={p}>
          Fracta Behavior · <a href="mailto:contato@fractabehavior.com" style={{ color: '#2BBFA4' }}>contato@fractabehavior.com</a>
        </p>

        <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid rgba(43,191,164,.15)', fontSize: '.78rem', color: '#8a9ab8' }}>
          Ver também a <Link href="/privacidade" style={{ color: '#2BBFA4' }}>Política de Privacidade</Link>.
        </div>
      </div>
    </main>
  )
}
