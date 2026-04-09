export default function ManutencaoPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.10),transparent_35%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(255,255,255,0.06),transparent_30%)]" />
      <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.03] blur-3xl" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">
        <div className="w-full max-w-4xl">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 backdrop-blur-md">
              <span className="inline-block h-2 w-2 rounded-full bg-white/70" />
              Fracta temporariamente indisponível
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight leading-tight md:text-6xl">
              Estamos refinando a experiência para voltar ainda melhor.
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/60 md:text-lg">
              O sistema está temporariamente em manutenção para melhorias de
              performance, estabilidade e qualidade da experiência.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.22em] text-white/35">
                Status
              </p>
              <h2 className="mt-3 text-xl font-medium text-white">
                Manutenção em andamento
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/55">
                Estamos realizando ajustes estratégicos para garantir mais
                fluidez, segurança e consistência na navegação.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.22em] text-white/35">
                Objetivo
              </p>
              <h2 className="mt-3 text-xl font-medium text-white">
                Melhorar a experiência
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/55">
                Essa pausa é temporária e faz parte de uma atualização focada em
                estabilidade, desempenho e usabilidade.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.22em] text-white/35">
                Retorno
              </p>
              <h2 className="mt-3 text-xl font-medium text-white">
                Em breve no ar
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/55">
                O acesso será restabelecido assim que a nova versão estiver
                pronta para entrega com o padrão de qualidade esperado.
              </p>
            </div>
          </div>

          <div className="mx-auto mt-8 max-w-2xl rounded-[28px] border border-white/10 bg-white/[0.025] px-6 py-5 text-center backdrop-blur-xl">
            <p className="text-sm text-white/45">
              Obrigado pela compreensão.
            </p>
            <p className="mt-2 text-base text-white/70">
              Estamos usando esse tempo para entregar uma experiência mais
              sólida, previsível e premium.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}