path = "src/app/clinic/sessao/page.tsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove o segundo bloco duplicado corrompido
DUPLICADO = """
// ── Checklist guiado por estágio ──────────────────────────────────────────────
const CHECKLIST_GUIADO: Record<string, { item: string; obrigatorio: boolean }[]> = {
  warmup_pairing: [
    { item: 'Cumprimentar a criança pelo nome', obrigatorio: true },
    { item: 'Oferecer item preferido sem exigências', obrigatorio: true },
    { item: 'Seguir a liderança da criança por 2 min', obrigatorio: true },
    { item: 'Verificar estado emocional e disposição', obrigatorio: false },
  ],
  assent_checklist: [
    { item: 'Explicar a atividade de forma acessível', obrigatorio: true },
    { item: 'Verificar sinais de aceitação (verbal ou não-verbal)', obrigatorio: true },
    { item: 'Confirmar que a criança pode encerrar quando quiser', obrigatorio: true },
    { item: 'Registrar forma de assentimento obtida', obrigatorio: false },
  ],
  preference_assessment: [
    { item: 'Apresentar 3 a 5 itens preferidos', obrigatorio: true },
    { item: 'Observar hierarquia de escolha', obrigatorio: true },
    { item: 'Selecionar reforçador primário da sessão', obrigatorio: true },
    { item: 'Verificar saciação de sessões anteriores', obrigatorio: false },
  ],
  clinical_actions: [
    { item: 'Revisar programa antes de iniciar', obrigatorio: true },
    { item: 'Posicionar materiais fora do alcance', obrigatorio: false },
    { item: 'Aplicar SD com clareza e volume adequado', obrigatorio: true },
    { item: 'Registrar cada tentativa imediatamente', obrigatorio: true },
  ],
  break: [
    { item: 'Sinalizar pausa de forma clara', obrigatorio: true },
    { item: 'Remover exigências completamente', obrigatorio: true },
    { item: 'Observar comportamento passivamente', obrigatorio: false },
  ],
  closing_preparation: [
    { item: 'Encerrar com atividade preferida', obrigatorio: true },
    { item: 'Registrar observações da sessão', obrigatorio: true },
    { item: 'Comunicar evolução ao responsável', obrigatorio: false },
    { item: 'Planejar próxima sessão', obrigatorio: false },
  ],
}

function ChecklistGuiado({ stageKey, nivel }: { stageKey: string; nivel: string }) {
  const itens = CHECKLIST_GUIADO[stageKey] ?? []
  const [checks, setChecks] = useState<boolean[]>(itens.map(() => false))
  const obrigatorios = itens.filter(i => i.obrigatorio).length
  const obrigatoriosMarcados = itens.filter((i, idx) => i.obrigatorio && checks[idx]).length
  const completo = obrigatoriosMarcados === obrigatorios
  const isGuiado = nivel === 'abat' || nivel
function uid()"""

TARGET = "function uid()"

if DUPLICADO not in content:
    print("ERRO: bloco duplicado não encontrado — pode já ter sido removido.")
    # Conta ocorrencias
    count = content.count("const CHECKLIST_GUIADO")
    print(f"Ocorrências de CHECKLIST_GUIADO: {count}")
else:
    content = content.replace(DUPLICADO, "\nfunction uid()", 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK — duplicata removida com sucesso.")
