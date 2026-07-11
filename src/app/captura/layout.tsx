import type { Metadata } from 'next'

// CM-LP-A1 C7: metadata própria da landing do Care (title, description e Open
// Graph) — a página é client component, então a metadata vive neste layout.
export const metadata: Metadata = {
  title: 'FractaCare — Desenvolvimento infantil guiado por ciência e amor',
  description:
    'Avalie gratuitamente as habilidades do seu filho em cerca de 3 minutos e receba atividades personalizadas para o dia a dia, com base em ABA. Gratuito para famílias.',
  openGraph: {
    title: 'FractaCare — Desenvolvimento infantil guiado por ciência e amor',
    description:
      'Avaliação gratuita, mapa de habilidades e atividades para o cotidiano. Gratuito para famílias, sem cartão.',
    type: 'website',
    siteName: 'Fracta Behavior',
    images: [{ url: '/logos/fracta-care.png' }],
  },
}

export default function CapturaLayout({ children }: { children: React.ReactNode }) {
  return children
}
