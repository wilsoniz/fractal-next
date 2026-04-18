with open('src/app/care/atividade/page.tsx', 'r') as f:
    content = f.read()

# 1. Adiciona searchParams (só se ainda não tiver)
if 'programaIdUrl' not in content:
    content = content.replace(
        '  const [fase,        setFase]        = useState<Fase>("loading");',
        '  const searchParams = useSearchParams();\n  const programaIdUrl = searchParams.get("programaId");\n\n  const [fase,        setFase]        = useState<Fase>("loading");'
    )
    print("searchParams adicionado")
else:
    print("searchParams ja existe")

# 2. Substitui logica de planos
old = (
    '    // 3. Busca planos ativos\n'
    '    const { data: planos } = await supabase\n'
    '      .from("planos")\n'
    '      .select("id, programa_id, status, tipo_plano, score_inicio")\n'
    '      .eq("crianca_id", crianca.id)\n'
    '      .eq("status", "ativo")\n'
    '      .order("prioridade", { ascending: true })\n'
    '      .limit(3);\n'
    '\n'
    '    let planoAtivo: Plano | null = planos?.[0] ?? null;\n'
    '\n'
    '    // 4. Se não tiver plano ativo, cria um baseado no radar\n'
    '    if (!planoAtivo) {'
)

new = (
    '    // 3. Busca ou cria plano para o programa selecionado\n'
    '    let planoAtivo: Plano | null = null;\n'
    '\n'
    '    if (programaIdUrl) {\n'
    '      const { data: planoExistente } = await supabase\n'
    '        .from("planos")\n'
    '        .select("id, programa_id, status, tipo_plano, score_inicio")\n'
    '        .eq("crianca_id", crianca.id)\n'
    '        .eq("programa_id", programaIdUrl)\n'
    '        .eq("status", "ativo")\n'
    '        .single();\n'
    '      if (planoExistente) {\n'
    '        planoAtivo = planoExistente;\n'
    '      } else {\n'
    '        const { data: novoPlano } = await supabase\n'
    '          .from("planos")\n'
    '          .insert({\n'
    '            crianca_id: crianca.id,\n'
    '            programa_id: programaIdUrl,\n'
    '            status: "ativo",\n'
    '            prioridade: 2,\n'
    '            tipo_plano: "principal",\n'
    '            gerado_por: "engine",\n'
    '            iniciado_em: new Date().toISOString(),\n'
    '          })\n'
    '          .select("id, programa_id, status, tipo_plano, score_inicio")\n'
    '          .single();\n'
    '        planoAtivo = novoPlano ?? null;\n'
    '      }\n'
    '    } else {\n'
    '      const { data: planos } = await supabase\n'
    '        .from("planos")\n'
    '        .select("id, programa_id, status, tipo_plano, score_inicio")\n'
    '        .eq("crianca_id", crianca.id)\n'
    '        .eq("status", "ativo")\n'
    '        .order("prioridade", { ascending: true })\n'
    '        .limit(1);\n'
    '      planoAtivo = planos?.[0] ?? null;\n'
    '    }\n'
    '\n'
    '    // 4. Se ainda nao tiver plano, cria baseado no radar\n'
    '    if (!planoAtivo) {'
)

if old in content:
    content = content.replace(old, new)
    print("planos OK")
else:
    print("ERRO: trecho nao encontrado")

with open('src/app/care/atividade/page.tsx', 'w') as f:
    f.write(content)

print("programaIdUrl no arquivo:", "programaIdUrl" in content)
print("busca por programa_id:", "programa_id: programaIdUrl" in content)
