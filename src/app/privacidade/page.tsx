import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Política de Privacidade — Fracta Behavior',
  description: 'Como o Fracta Behavior coleta, usa e protege os dados de famílias, crianças e profissionais.',
}

const h2: React.CSSProperties = { fontSize: '1.05rem', fontWeight: 800, color: '#1E3A5F', margin: '28px 0 10px' }
const p: React.CSSProperties = { fontSize: '.9rem', color: '#3a5a7a', lineHeight: 1.75, margin: '0 0 12px' }
const li: React.CSSProperties = { fontSize: '.9rem', color: '#3a5a7a', lineHeight: 1.75, marginBottom: 6 }

export default function PrivacidadePage() {
  return (
    <main style={{ fontFamily: 'var(--font-sans)', background: '#f7fbfd', minHeight: '100vh' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 80px' }}>
        <Link href="/" style={{ fontSize: '.8rem', color: '#2BBFA4', textDecoration: 'none', fontWeight: 600 }}>← Fracta Behavior</Link>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1E3A5F', margin: '16px 0 6px' }}>Política de Privacidade</h1>
        <p style={{ fontSize: '.78rem', color: '#8a9ab8', marginBottom: 24 }}>Vigente a partir de 11 de julho de 2026.</p>

        <p style={p}>
          O Fracta Behavior é um ecossistema de apoio ao desenvolvimento infantil e à prática
          clínica em Análise do Comportamento Aplicada (ABA), composto pelo FractaCare
          (famílias) e pelo FractaClinic (profissionais). Esta política explica, em linguagem
          direta, quais dados tratamos, por que tratamos e quais são os seus direitos, em
          conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
        </p>

        <h2 style={h2}>1. Quais dados coletamos</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li style={li}><strong>Dados da conta do responsável:</strong> nome, e-mail e senha (armazenada de forma criptografada).</li>
          <li style={li}><strong>Dados da criança, informados pelo responsável legal:</strong> nome, data de nascimento ou idade, diagnóstico (quando o responsável optar por informar) e observações.</li>
          <li style={li}><strong>Dados de uso clínico-educacional:</strong> respostas de avaliações e triagens, mapas de habilidades, registros de práticas e atividades realizadas.</li>
          <li style={li}><strong>Documentos enviados pelo responsável:</strong> laudos e documentos da criança, armazenados em área privada com acesso restrito.</li>
          <li style={li}><strong>Dados de profissionais (FractaClinic):</strong> nome, e-mail, credenciais profissionais e dados de uso da plataforma.</li>
        </ul>

        <h2 style={h2}>2. Dados de crianças</h2>
        <p style={p}>
          Todos os dados de crianças são fornecidos e geridos <strong>pelo responsável legal</strong>,
          no melhor interesse da criança (art. 14 da LGPD). O Fracta não coleta dados
          diretamente de crianças e não exibe publicidade dirigida a elas.
        </p>

        <h2 style={h2}>3. Para que usamos os dados</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li style={li}>Gerar o mapa de habilidades, recomendações de atividades e o acompanhamento do desenvolvimento;</li>
          <li style={li}>Guardar o histórico e a documentação da criança para a própria família;</li>
          <li style={li}>Quando a família decidir vincular um profissional, compartilhar com ele as informações necessárias ao acompanhamento;</li>
          <li style={li}>Manter a segurança, prevenir fraudes e melhorar o produto.</li>
        </ul>
        <p style={p}><strong>Não vendemos dados pessoais.</strong> Não usamos dados de crianças para publicidade.</p>

        <h2 style={h2}>4. Com quem os dados são compartilhados</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li style={li}><strong>Provedores de infraestrutura</strong> que processam dados em nosso nome (hospedagem e banco de dados — atualmente Supabase), sob controles de acesso;</li>
          <li style={li}><strong>Profissional vinculado pela família</strong>, quando e somente quando a família estabelecer o vínculo;</li>
          <li style={li}><strong>Autoridades</strong>, apenas quando exigido por lei.</li>
        </ul>

        <h2 style={h2}>5. Como protegemos os dados</h2>
        <p style={p}>
          Usamos criptografia em trânsito, controle de acesso por linha no banco de dados
          (cada família só acessa as suas crianças), armazenamento privado para documentos e
          princípio do menor privilégio no acesso interno.
        </p>

        <h2 style={h2}>6. Por quanto tempo guardamos</h2>
        <p style={p}>
          Enquanto a conta existir. Ao solicitar a exclusão da conta, os dados pessoais são
          excluídos ou anonimizados, ressalvadas obrigações legais de retenção.
        </p>

        <h2 style={h2}>7. Seus direitos (LGPD)</h2>
        <p style={p}>
          Você pode solicitar a qualquer momento: confirmação de tratamento, acesso, correção,
          anonimização ou exclusão dos dados, portabilidade e revogação de consentimento.
          Basta escrever para <a href="mailto:contato@fractabehavior.com" style={{ color: '#2BBFA4' }}>contato@fractabehavior.com</a>.
          Responderemos nos prazos da LGPD.
        </p>

        <h2 style={h2}>8. Cookies e armazenamento local</h2>
        <p style={p}>
          Usamos armazenamento local do navegador para manter sua sessão e preferências
          (por exemplo, a criança ativa no painel). Não usamos cookies de publicidade.
        </p>

        <h2 style={h2}>9. Alterações desta política</h2>
        <p style={p}>
          Podemos atualizar esta política; a data de vigência no topo sempre refletirá a
          versão atual. Mudanças relevantes serão comunicadas no produto.
        </p>

        <h2 style={h2}>10. Contato</h2>
        <p style={p}>
          Fracta Behavior · <a href="mailto:contato@fractabehavior.com" style={{ color: '#2BBFA4' }}>contato@fractabehavior.com</a>
        </p>

        <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid rgba(43,191,164,.15)', fontSize: '.78rem', color: '#8a9ab8' }}>
          Ver também os <Link href="/termos" style={{ color: '#2BBFA4' }}>Termos de Uso</Link>.
        </div>
      </div>
    </main>
  )
}
