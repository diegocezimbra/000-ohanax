# YouTube Content Automation Platform — Use Cases (Core Only) v2

## Visão Geral

Plataforma multi-tenant para automação completa de criação e publicação de vídeos no YouTube via pipeline de IA.

**Pipeline 100% Automático:**
Fonte → Extração + Pesquisa Web → Tópicos (filtro richness ≥ 7) → História → Roteiro (com auto-enriquecimento se curto) → Imagens/Vídeos → Thumbnail → Narração → Montagem → Fila de Publicação (review manual, máx 3/dia)

---

## Arquitetura Resumida

**Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind, Shadcn/UI, React Query
**Backend:** Node.js + NestJS, Prisma, PostgreSQL (RLS para multi-tenancy), Redis + BullMQ (filas)
**Storage:** S3 (imagens, áudios, vídeos)
**IA:** OpenAI/Claude (texto), DALL-E/Flux (imagens), Runway/Kling (vídeo), ElevenLabs (TTS)
**Pesquisa Web:** Tavily API / Serper API / Google Custom Search (enriquecimento automático)
**Video:** FFmpeg (montagem final)

### Multi-Tenancy
- `project_id` em todas as tabelas + Row-Level Security no PostgreSQL
- Credenciais YouTube e API keys isoladas e criptografadas por projeto (AES-256-GCM)
- Todas as queries filtram por `project_id` via global scope no ORM

### Modelo de Dados

```
Project (1) ──→ (1) YouTubeCredential
Project (1) ──→ (1) ProjectSettings (storytelling, AI config, visual identity)
Project (1) ──→ (N) ContentSource
ContentSource (1) ──→ (N) ResearchResult (pesquisas web vinculadas)
Project (1) ──→ (N) Topic
Topic (1) ──→ (N) ResearchResult (pesquisas web adicionais)
Topic (1) ──→ (1) Story
Story (1) ──→ (1) Script
Script (1) ──→ (N) ScriptSegment
ScriptSegment (1) ──→ (N) VisualAsset (image ou video)
Script (1) ──→ (1) Narration
Script (1) ──→ (1) Thumbnail
Script (1) ──→ (1) FinalVideo
FinalVideo (1) ──→ (1) Publication (status: queued / scheduled / publishing / published / failed)
```

---

## Framework de Storytelling (Global — Aplicado a Todos os Projetos)

### Padrão Narrativo (Configurável por Projeto)

**1. HOOK (0:00 - 0:30):** O adversário ri/zomba/duvida. Humilhação ou desprezo.
"Quando os generais nazistas viram os tanques americanos, eles riram."

**2. CONTEXTO (0:30 - 5:00):** Background histórico. O que estava em jogo.

**3. DESENVOLVIMENTO (5:00 - 15:00):** Jornada, dificuldades, momentos de dúvida.

**4. VIRADA (15:00 - 20:00):** As mesas viram. O adversário percebe que subestimou.

**5. RESOLUÇÃO TRIUNFANTE (20:00 - 25:00+):** Vitória completa. Contraste zombaria vs resultado.

### Gatilhos Psicológicos
- Patriotismo / Orgulho Nacional
- Underdog / Subestimado
- Vingança / Justiça Poética
- Curiosidade / Mistério
- Raiva Justa

### Template de Título
`[ADVERSÁRIO] ri/zomba de [PROTAGONISTA] sobre [ASSUNTO] — [CONSEQUÊNCIA DRAMÁTICA]`

---

## PIPELINE AUTOMÁTICO — VISÃO GERAL DO FLUXO

```
┌─────────────────────────────────────────────────────────────────────┐
│  FONTE ADICIONADA                                                    │
│  (URL, PDF, texto, YouTube transcript)                               │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ETAPA 1: EXTRAÇÃO + PESQUISA WEB AUTOMÁTICA                        │
│  - Extrai conteúdo da fonte                                          │
│  - Identifica temas/entidades principais (via LLM)                   │
│  - Faz 3-5 pesquisas web automáticas sobre os temas                  │
│  - Salva resultados como ResearchResult vinculados à fonte           │
│  - Material total: fonte original + pesquisas = base rica            │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ETAPA 2: GERAÇÃO DE TÓPICOS                                        │
│  - LLM analisa fonte + pesquisas e gera 5-15 tópicos                │
│  - Cada tópico com richness score (1-10)                             │
│  - FILTRO: só tópicos com richness ≥ 7 seguem no pipeline           │
│  - Tópicos com richness < 7 ficam salvos como "descartados"         │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       ▼  (para CADA tópico com richness ≥ 7)
┌─────────────────────────────────────────────────────────────────────┐
│  ETAPA 3: GERAÇÃO DA HISTÓRIA                                       │
│  - LLM cria história narrativa (4.000-8.000 palavras)               │
│  - Usa: dados do tópico + fonte + pesquisas web                      │
│  - Segue arco narrativo do projeto                                   │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ETAPA 4: GERAÇÃO DO ROTEIRO                                        │
│  - LLM transforma história em roteiro segmentado (25+ min)          │
│  - Verifica duração: palavras / 150 wpm                              │
│  - SE duração < alvo:                                                │
│    → Sistema faz pesquisas web adicionais sobre o tópico             │
│    → Envia material extra para LLM expandir o roteiro               │
│    → Loop até atingir duração alvo (máx 2 tentativas)               │
│  - Output: segmentos numerados + título + descrição + tags           │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ETAPA 5: GERAÇÃO DE ASSETS VISUAIS                                 │
│  - LLM gera prompts de imagem/vídeo para cada segmento              │
│  - API de imagem gera imagens (batch, paralelo)                      │
│  - Para segmentos com sugestão "video": API de vídeo gera clip       │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ETAPA 6: GERAÇÃO DE THUMBNAIL                                      │
│  - LLM gera 3 prompts de thumbnail de alta conversão                 │
│  - Gera 3 imagens → seleciona a de melhor score automaticamente     │
│  - (Texto na thumbnail adicionado via template do projeto)           │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ETAPA 7: NARRAÇÃO (TTS)                                             │
│  - Concatena segmentos → envia para API de TTS                       │
│  - Forced alignment (Whisper) → timestamps por segmento             │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ETAPA 8: MONTAGEM DO VÍDEO                                         │
│  - FFmpeg monta: imagens/vídeos + narração + transições              │
│  - Ken Burns em imagens estáticas                                    │
│  - Encoding: H.264, 1080p, 30fps                                    │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ETAPA 9: FILA DE PUBLICAÇÃO                                        │
│  - Vídeo pronto entra na fila com status "queued"                    │
│  - AGUARDA REVIEW MANUAL do usuário                                  │
│  - Usuário aprova → status "scheduled"                               │
│  - Publicação automática: máximo 3 vídeos/dia por projeto           │
│  - Cron job publica espaçados ao longo do dia                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## PÁGINAS E USE CASES

---

## PÁGINA 1: PROJETOS

**Rota:** `/projects` (listagem) | `/projects/new` (criação) | `/projects/{id}/settings` (config)

### UC-1.1: Listar Projetos
- Grid de cards com: nome, logo, status YouTube (conectado/desconectado), contadores (tópicos, vídeos na fila, publicados), último vídeo publicado
- Botão "Novo Projeto"
- Clique no card → entra no projeto

### UC-1.2: Criar Projeto
- **Formulário em abas:**

**Aba "Geral":**
- Nome do projeto, descrição, idioma (en-US, pt-BR, etc.)
- Upload de logo (opcional)
- Categoria/nicho: WW2, Cold War, True Crime, Disasters, Political Scandals, Custom

**Aba "Storytelling":**
- Template narrativo: campos editáveis para cada bloco (hook, contexto, desenvolvimento, virada, resolução)
- Gatilhos psicológicos: checkboxes (patriotismo, underdog, vingança, curiosidade, raiva justa)
- Template de título com placeholders: `{adversary}`, `{protagonist}`, `{topic}`, `{consequence}`
- Tom da narração: formal, casual, dramático, documental
- Duração alvo dos vídeos: 10-15min, 15-25min, 25-40min
- Richness score mínimo: padrão 7 (configurável 1-10)
- Publicações por dia: padrão 3 (configurável)

**Aba "IA":**
- LLM: provedor (OpenAI/Anthropic) + API key + modelo
- TTS: provedor (ElevenLabs/OpenAI TTS) + API key + voz (com preview de áudio)
- Imagem: provedor (DALL-E/Flux/Midjourney) + API key + estilo visual (realistic, cinematic, vintage, etc.)
- Vídeo (opcional): provedor (Runway/Kling) + API key
- Pesquisa Web: provedor (Tavily/Serper) + API key

**Aba "YouTube":**
- Botão "Conectar ao YouTube" → OAuth2 com Google (scopes: `youtube.upload`, `youtube.readonly`)
- Exibe nome do canal + avatar + status "Conectado"
- Botão "Testar Conexão" / "Reconectar"

### UC-1.3: Editar Projeto
- Mesmas abas, dados preenchidos, cada aba salva independentemente

---

## PÁGINA 2: FONTES DE CONTEÚDO

**Rota:** `/projects/{id}/sources`

**Layout:** Tabela com: título, tipo (badge), data, status do pipeline (ícone), nº de tópicos gerados, ações

### UC-2.1: Adicionar Fonte — URL
1. Clica "Adicionar Fonte" → seleciona "URL"
2. Informa URL
3. Sistema faz scraping: extrai título, texto principal, autor, data
4. Preview do conteúdo extraído → confirma
5. Salva ContentSource tipo `url`
6. **DISPARA PIPELINE AUTOMÁTICO** (ver Etapa 1)

### UC-2.2: Adicionar Fonte — PDF
1. Upload de PDF (drag & drop)
2. Extrai texto (pdf-parse + OCR se necessário)
3. Preview → confirma
4. Salva ContentSource tipo `pdf`
5. **DISPARA PIPELINE AUTOMÁTICO**

### UC-2.3: Adicionar Fonte — Texto Manual
1. Rich text editor: título, corpo, referência
2. Salva ContentSource tipo `manual`
3. **DISPARA PIPELINE AUTOMÁTICO**

### UC-2.4: Adicionar Fonte — YouTube (Transcrição)
1. Informa URL do vídeo
2. Extrai transcrição via YouTube Transcript API
3. Preview → confirma
4. Salva ContentSource tipo `youtube_transcript`
5. **DISPARA PIPELINE AUTOMÁTICO**

### UC-2.5: Visualizar Status do Pipeline da Fonte
- Na listagem, cada fonte mostra ícone de status:
  - 🔄 Processando (pesquisa web / gerando tópicos)
  - ✅ Concluído (tópicos gerados, pipeline rodando)
  - ❌ Erro (clicável para ver detalhes)
- Clique na fonte → expande/abre detalhe com: conteúdo extraído, pesquisas web feitas, tópicos gerados

### UC-2.6: Editar/Excluir Fonte
- Editar conteúdo extraído
- Excluir (soft delete, com confirmação se tem tópicos vinculados)

---

## PÁGINA 3: TÓPICOS E HISTÓRIAS

**Rota:** `/projects/{id}/topics`

**Layout:** Lista/tabela com status badge por etapa do pipeline + filtros

### UC-3.1: Geração Automática de Tópicos (disparado pelo pipeline)

**Este passo roda automaticamente após a fonte ser adicionada e pesquisada. O use case descreve o que o sistema faz internamente:**

1. Sistema recebe conteúdo da fonte + resultados das pesquisas web
2. Envia para LLM:

```
PROMPT:
"Dado o conteúdo abaixo sobre [nicho do projeto], identifique 5 a 15 histórias
que possam virar vídeos de YouTube de [duração alvo] minutos.

MATERIAL DISPONÍVEL:
- Fonte original: [conteúdo extraído]
- Pesquisas web complementares: [resultados das pesquisas]

Cada história DEVE ter:
- Um antagonista claro que zomba/subestima/duvida
- Um protagonista que surpreende/vence
- Uma virada dramática
- Potencial para gerar [gatilhos configurados no projeto]

Para cada história retorne JSON:
{
  "title": "formato: [Antagonista] [zombaria] [Protagonista] — [Consequência]",
  "hook": "frase de abertura dramática (1-2 frases)",
  "summary": "resumo do arco narrativo (3-5 frases)",
  "antagonist": "quem zomba",
  "protagonist": "quem vence",
  "turning_point": "momento de virada",
  "emotional_triggers": ["patriotism", "underdog", ...],
  "estimated_richness": 1-10,
  "key_search_terms": ["termos para pesquisa adicional se necessário"]
}"
```

3. Sistema recebe tópicos com scores
4. **FILTRO:** só tópicos com `richness ≥ [mínimo configurado no projeto, padrão 7]` seguem
5. Tópicos abaixo do filtro: salvos com status `discarded` (visíveis na UI com badge cinza)
6. Tópicos aprovados: salvos com status `idea` → pipeline continua automaticamente

### UC-3.2: Criar Tópico Manual
- Formulário: título, hook, resumo, antagonista, protagonista, virada, triggers
- Link para fontes relacionadas
- Ao salvar: **DISPARA PIPELINE AUTOMÁTICO** a partir da Etapa 3 (gerar história)

### UC-3.3: Geração Automática de História (disparado pelo pipeline)

**Roda automaticamente para cada tópico com richness ≥ 7:**

1. Sistema compila: dados do tópico + conteúdo da fonte + pesquisas web
2. Envia para LLM:

```
PROMPT:
"Crie uma história narrativa completa e detalhada sobre [tópico].

MATERIAL DISPONÍVEL:
- Resumo do tópico: [summary]
- Fonte original: [conteúdo]
- Pesquisas web: [resultados]

Siga RIGOROSAMENTE este arco narrativo:

1. ABERTURA: O antagonista ([antagonist]) zomba/ri/desdenha de ([protagonist]).
   Criar cena vívida com diálogo reconstruído.
2. CONTEXTO HISTÓRICO: Situar no tempo/espaço. O que estava em jogo.
3. PERSONAGENS: Desenvolver antagonista e protagonista com profundidade humana.
4. DESENVOLVIMENTO: Tensão progressiva, obstáculos, momentos de dúvida.
5. VIRADA: [turning_point] — momento dramático que muda tudo.
6. RESOLUÇÃO: Triunfo completo do protagonista. Contraste com a zombaria inicial.

Regras:
- Entre 4.000 e 8.000 palavras
- Detalhes vívidos, diálogos reconstruídos, descrições sensoriais
- Tom: [tom do projeto]
- Idioma: [idioma do projeto]
- 100% FACTUAL. Não inventar eventos. Diálogos dramatizados mas baseados em registros.
- Se houver informações conflitantes nas fontes, priorizar a mais confiável.
- Retornar em texto corrido."
```

3. Salva história vinculada ao tópico
4. Status: `story_created` → pipeline continua

### UC-3.4: Visualizar Tópicos
- Lista com: título, richness score (badge colorida), status do pipeline (etapa atual), data
- Filtros: por status, por richness, por fonte de origem
- Clique no tópico → abre detalhe com história + status de cada etapa

### UC-3.5: Editar História (manual, opcional)
- Rich text editor com auto-save
- Sidebar com fontes originais para referência
- Botão "Regenerar trecho" → seleciona texto, IA reescreve
- Se editar: pode re-disparar pipeline das etapas seguintes

### UC-3.6: Reprocessar Tópico Descartado
- Tópicos com richness < 7 ficam visíveis com badge "Descartado"
- Usuário pode forçar manualmente: "Processar mesmo assim" → entra no pipeline

---

## PÁGINA 4: ROTEIROS

**Rota:** `/projects/{id}/topics/{topicId}/script`

**Layout:** Editor de segmentos — cards empilhados, cada um com texto + visual hint + tempo estimado

### UC-4.1: Geração Automática de Roteiro com Auto-Enriquecimento (disparado pelo pipeline)

**Roda automaticamente após história ser criada:**

1. Sistema envia história + config para LLM:

```
=== MEGA PROMPT — GERAÇÃO DE ROTEIRO ===

Você é um roteirista profissional de documentários narrativos para YouTube.
Seu objetivo é criar roteiros que PRENDAM a audiência do primeiro ao último segundo.

## CONTEXTO DO PROJETO
- Canal: [nome]
- Nicho: [nicho]
- Idioma: [idioma]
- Tom: [tom]
- Duração alvo: [duração] minutos
- Gatilhos: [lista de triggers ativos]

## ESTRUTURA OBRIGATÓRIA

### BLOCO 1 — HOOK DEVASTADOR (primeiros 30 segundos)
Comece com a cena mais impactante. O antagonista zombando, rindo, desprezando.
Use diálogo reconstruído. O espectador PRECISA sentir raiva ou indignação
nos primeiros 10 segundos.
Exemplo: "Quando o general [X] viu [Y], ele não conteve a risada.
Virou-se para seus oficiais e disse: '[desprezo]'. Ele não fazia ideia
do que estava por vir."

### BLOCO 2 — CONTEXTUALIZAÇÃO (2-5 minutos)
Transição suave do hook para o contexto.
Situe o espectador: quando, onde, por quê.
Apresente personagens com profundidade humana.
Termine com frase que aumente a tensão.

### BLOCO 3 — CONSTRUÇÃO DE TENSÃO (5-15 minutos)
Ritmo crescente. Alterne esperança e desespero.
Detalhes específicos: números, nomes, datas, locais.
Pelo menos 2-3 "mini-cliffhangers" internos.
Cada parágrafo faz o espectador querer ouvir o próximo.

### BLOCO 4 — A GRANDE VIRADA (15-20 minutos)
O momento que muda tudo. Suspense. Frases curtas para impacto.
Arrepio. Callback à zombaria do hook.

### BLOCO 5 — RESOLUÇÃO TRIUNFANTE (20-25+ minutos)
Consequências completas. Reação do antagonista ao resultado.
Reflexão poderosa que reforça o gatilho emocional.
Última frase memorável e "compartilhável".

## REGRAS ABSOLUTAS

1. NARRAÇÃO CONTÍNUA. 100% texto narrado. Sem indicações de câmera,
   sem "[música dramática]", sem "B-roll". APENAS o texto falado.

2. TÉCNICAS OBRIGATÓRIAS:
   - Open loops: "Mas havia algo que ninguém sabia ainda..."
   - Transições de expectativa: "O que aconteceu a seguir mudaria tudo."
   - Detalhes sensoriais: sons, cheiros, visuais, texturas
   - Números: "47 homens", "às 3:42 da madrugada", "a 800 metros"
   - Contraste: alternar lado do antagonista e protagonista
   - Callback ao hook: referenciar a zombaria inicial 2-3x ao longo do roteiro

3. SEGMENTAÇÃO:
   Divida o roteiro em SEGMENTOS de 30-60 segundos (50-120 palavras cada).
   Cada segmento = UMA cena visual distinta.

   Formato:
   [SEGMENT_01]
   {texto da narração}
   [/SEGMENT_01]

4. MÉTRICAS:
   - ~150 palavras/minuto
   - 25 min = ~3.750 palavras / 30-40 segmentos
   - 35 min = ~5.250 palavras / 42-55 segmentos
   - ZERO filler — cada segmento avança a narrativa

5. METADATA:
   Gere também:
   - youtube_title: template do projeto, máx 100 chars
   - youtube_description: 2-3 parágrafos com SEO
   - youtube_tags: 15-20 tags

## HISTÓRIA BASE
[história completa]

## OUTPUT
JSON: { title, description, tags, segments: [{ number, text, visual_hint }] }
```

2. Sistema recebe roteiro e calcula duração: `total_palavras / 150`

3. **VERIFICAÇÃO DE DURAÇÃO — AUTO-ENRIQUECIMENTO:**
   ```
   SE duração_estimada < duração_alvo DO projeto:
     → Sistema identifica os pontos do roteiro que podem ser expandidos
     → Faz 3-5 pesquisas web automáticas focadas no tópico:
       - Busca por detalhes adicionais, anedotas, fatos complementares
       - Usa os key_search_terms do tópico + termos extraídos do roteiro
       - Salva resultados como ResearchResult vinculados ao tópico
     → Re-envia para LLM com prompt de expansão:

       "O roteiro abaixo tem [X] palavras ([Y] minutos estimados).
       A duração alvo é [Z] minutos.
       
       MATERIAL ADICIONAL DE PESQUISA:
       [resultados das novas pesquisas web]
       
       Expanda o roteiro usando APENAS fatos reais do material adicional.
       Mantenha a mesma estrutura e qualidade narrativa.
       Adicione: detalhes históricos, anedotas reais, contexto adicional,
       personagens secundários, consequências de longo prazo.
       
       NÃO adicione filler. Cada novo segmento deve AGREGAR à narrativa.
       
       Retorne o roteiro completo expandido no mesmo formato de segmentos."

     → Máximo 2 tentativas de expansão
     → Se após 2 tentativas ainda estiver curto: salva como está + flag "below_target_duration"
   ```

4. Salva Script + ScriptSegments
5. Status: `script_generated` → pipeline continua

### UC-4.2: Editar Roteiro (manual, opcional)
- Cards de segmentos com edição inline
- Drag & drop para reordenar
- "Regenerar segmento" → envia contexto (anterior + posterior) para IA
- "Dividir segmento" / "Fundir segmentos"
- Tempo total estimado atualizado em tempo real
- Auto-save

### UC-4.3: Aprovar Roteiro (manual, opcional)
- No fluxo automático, o roteiro é aprovado automaticamente após geração
- Usuário pode pausar o pipeline e revisar manualmente se quiser
- Botão "Reprovar e Regenerar" → volta à Etapa 4

---

## PÁGINA 5: ASSETS VISUAIS (IMAGENS + VÍDEOS)

**Rota:** `/projects/{id}/topics/{topicId}/visuals`

**Layout:** Grid — esquerda: texto do segmento | direita: asset gerado (imagem ou vídeo)

### UC-5.1: Geração Automática de Prompts de Imagem (disparado pelo pipeline)

1. Sistema envia segmentos para LLM:

```
=== PROMPT — DIREÇÃO DE ARTE ===

Você é um diretor de arte especializado em prompts para IA geradora de imagens.

## CONTEXTO
- Estilo visual: [estilo do projeto]
- Nicho: [nicho]
- Época: [se aplicável]
- Aspect ratio: 16:9 (1920x1080) — SEMPRE paisagem

## REGRAS

1. Cada prompt gera UMA imagem cinematográfica que ilustra a cena
2. NUNCA texto/lettering na imagem
3. Linguagem técnica de fotografia:
   - Ângulo: low angle, bird's eye, dutch angle, close-up, wide shot
   - Iluminação: dramatic lighting, golden hour, chiaroscuro, rim light
   - Composição: rule of thirds, leading lines, depth of field
4. Detalhes de época: uniformes, tecnologia, arquitetura, veículos corretos
5. CONSISTÊNCIA visual entre segmentos:
   - Mesma paleta de cores
   - Mesmo estilo artístico
   - Personagens recorrentes com descrição consistente
6. Cenas de emoção: expressões faciais, linguagem corporal
7. Cenas de ação: movimento, dinamismo
8. Evitar: gore, conteúdo sensível, rostos de pessoas reais

## OUTPUT (por segmento)
{
  "segment_number": N,
  "image_prompt": "50-150 palavras",
  "negative_prompt": "o que evitar",
  "mood": "dark/triumphant/tense/hopeful",
  "color_palette": "cores dominantes",
  "asset_type_suggestion": "image" ou "video"
}

## SEGMENTOS
[lista de segmentos com texto + visual_hint]
```

2. Salva prompts → dispara geração de imagens automaticamente

### UC-5.2: Geração Automática de Imagens (Batch — disparado pelo pipeline)
1. Jobs enfileirados (BullMQ) — um por segmento, execução paralela
2. Cada job chama API de imagem (DALL-E 3 / Flux)
3. Imagens salvas no S3, vinculadas ao segmento
4. Para segmentos com `asset_type_suggestion: "video"`: chama API de vídeo (Runway/Kling) → clip 3-5s
5. Retry automático: até 3x por segmento
6. Ao concluir todos os segmentos → pipeline continua

### UC-5.3: Visualizar e Editar Assets (manual, opcional)
- Grid com segmentos + assets gerados
- "Regenerar" imagem/vídeo de um segmento
- Upload manual de asset próprio
- Selecionar entre versões alternativas
- Storyboard horizontal com preview da sequência completa

---

## PÁGINA 6: THUMBNAIL

**Rota:** `/projects/{id}/topics/{topicId}/thumbnail`

### UC-6.1: Geração Automática de Thumbnail (disparado pelo pipeline)

1. LLM gera 3 prompts de thumbnail:

```
PROMPT:
"Crie prompts para thumbnail de YouTube de ALTA CONVERSÃO.

Título: [título]
Hook: [hook]
Nicho: [nicho]

REGRAS:
1. Contraste extremo — cores vibrantes em telas pequenas
2. Emoção forte — expressão facial exagerada (choque, raiva, surpresa)
3. Composição simples — máx 2-3 elementos
4. Curiosidade — algo que faça querer saber mais
5. Contraste narrativo — quem zomba vs quem vence
6. 16:9 (1280x720)
7. NUNCA texto na imagem (adicionado depois automaticamente)
8. Cores: vermelho, amarelo, preto — melhores para CTR
9. Rostos grandes (30%+ da área)

Gere 3 variações:
- V1: Foco no antagonista (zombaria/arrogância)
- V2: Foco no contraste (antes/depois)
- V3: Foco no objeto/evento central"
```

2. Gera 3 imagens
3. **Seleção automática:** sistema usa a V2 (contraste) como padrão (maior CTR histórico)
4. Texto do título renderizado automaticamente sobre a thumbnail usando template visual do projeto (fonte, cor, posição, stroke configurados no projeto)
5. Salva thumbnail final → pipeline continua

### UC-6.2: Editar Thumbnail (manual, opcional)
- Visualizar as 3 variações e trocar seleção
- Editor canvas overlay para ajustar texto
- Regenerar variações
- Upload de thumbnail custom

---

## PÁGINA 7: NARRAÇÃO (TTS)

**Rota:** `/projects/{id}/topics/{topicId}/narration`

### UC-7.1: Geração Automática de Narração (disparado pelo pipeline)

1. Sistema concatena todos os segmentos do roteiro
2. Envia para API de TTS (ElevenLabs/OpenAI TTS):
   - Texto completo
   - Voice ID do projeto
   - Velocidade/estabilidade configuradas
3. Recebe áudio (MP3/WAV) → salva no S3
4. **Forced alignment automático** (Whisper/Gentle):
   - Mapeia texto → timestamps
   - Salva timestamp início/fim de cada segmento
5. Validação: se alignment falhar para algum segmento → marca para review
6. Pipeline continua

### UC-7.2: Visualizar e Editar Narração (manual, opcional)
- Player com waveform + marcadores de segmento
- Play individual por segmento
- "Regenerar trecho" → gera novo áudio só daquele segmento → splice automático
- Ajustar pausas entre segmentos

---

## PÁGINA 8: MONTAGEM DO VÍDEO

**Rota:** `/projects/{id}/topics/{topicId}/assembly`

**Layout:** Timeline simplificada — track de áudio + track de visuais

### UC-8.1: Montagem Automática (disparado pelo pipeline)

1. Sistema monta automaticamente:
   - Trilha de áudio: narração completa
   - Trilha visual: cada imagem/vídeo com duração = timestamp do segmento na narração
   - **Transições:** crossfade 0.5s (padrão do projeto, configurável)
   - **Ken Burns Effect** em imagens estáticas:
     - Zoom/pan lento, direção variada
     - Intensidade: sutil 5% (padrão)
     - NÃO aplicado em assets de vídeo
2. Processamento via FFmpeg:
   - Encoding: H.264 High Profile, 1080p, 30fps
   - Áudio: AAC 192kbps
   - Container: MP4
3. Vídeo salvo no S3 como FinalVideo
4. Status: `video_ready` → entra na Fila de Publicação

### UC-8.2: Ajustar Montagem (manual, opcional)
- Timeline visual com preview
- Trocar asset de um segmento
- Alterar tipo de transição entre segmentos
- Ajustar Ken Burns por segmento
- Adicionar música de fundo (upload royalty-free, volume 15-20%)
- Re-renderizar após ajustes

---

## PÁGINA 9: FILA DE PUBLICAÇÃO

**Rota:** `/projects/{id}/publishing`

**Layout:** Lista de vídeos prontos aguardando review + calendário de publicação

### UC-9.1: Revisar Fila de Publicação
- Lista de vídeos com status `queued` (gerados automaticamente pelo pipeline)
- Cada item mostra: thumbnail, título, duração, data de criação, richness score do tópico original
- **Ações por vídeo:**
  - ▶️ **Preview rápido** (player inline)
  - ✅ **Aprovar** → muda para `scheduled`, entra na fila de publicação automática
  - ✏️ **Editar antes de aprovar** → abre formulário com título, descrição, tags, thumbnail editáveis
  - 🔄 **Reprocessar** → volta o tópico para uma etapa anterior do pipeline
  - ❌ **Rejeitar** → marca como `rejected`, não será publicado

### UC-9.2: Publicação Automática (máx 3/dia)
- Vídeos com status `scheduled` entram na fila de publicação
- **Regra:** máximo de 3 publicações por dia por projeto (configurável em Settings)
- Cron job distribui as publicações ao longo do dia (ex: 9h, 14h, 19h — ou horários configuráveis)
- Para cada publicação:
  1. Upload via YouTube Data API v3 (resumable)
  2. Set metadata (título, descrição, tags)
  3. Upload de thumbnail
  4. Visibilidade: Public (padrão, configurável)
  5. Status: `publishing` → `published`
  6. Salva YouTube video ID
- Se falhar: retry até 3x com exponential backoff → se persistir: status `failed` + alerta

### UC-9.3: Gerenciar Publicações
- Filtros: por status (queued, scheduled, published, failed, rejected)
- Ordenação: por data de criação, por richness score
- Vídeos publicados: link direto para o YouTube
- Vídeos com falha: botão "Tentar novamente"
- Calendário visual: mostra quais dias têm publicação agendada

### UC-9.4: Configurar Horários de Publicação
- Configurável por projeto em Settings:
  - Máx publicações por dia (padrão: 3)
  - Horários preferenciais (ex: 09:00, 14:00, 19:00)
  - Dias da semana ativos (ex: seg-sex, ou todos os dias)
  - Timezone do canal

---

## PÁGINA 10: PIPELINE (VISÃO GERAL DO PROJETO)

**Rota:** `/projects/{id}/pipeline`

**Layout:** Kanban board com todas as etapas

### UC-10.1: Visualizar Pipeline
- Colunas:
  1. 💡 Ideia (tópicos gerados)
  2. 📖 História Criada
  3. 📝 Roteiro Gerado
  4. 🎨 Assets Gerados
  5. 🎙️ Narração Pronta
  6. 🎬 Vídeo Pronto
  7. 📋 Na Fila (aguardando review)
  8. 📤 Agendado
  9. ✅ Publicado
  10. ⚫ Descartado (richness < 7)
  11. ❌ Rejeitado
- Cards: título, richness score, data, barra de progresso
- Badge de "auto" nos cards que estão sendo processados automaticamente
- Clique no card → abre tópico na etapa atual
- Contador por coluna

### UC-10.2: Monitorar Pipeline Automático
- Indicador em tempo real: quantos jobs estão rodando, na fila, concluídos, com erro
- Para jobs com erro: botão "Retry" individual
- Log simplificado por tópico: quais etapas concluíram, qual está rodando, qual falhou

### UC-10.3: Bulk Actions
- Selecionar múltiplos tópicos:
  - Re-disparar pipeline de uma etapa específica
  - Mover para "Rejeitado"
  - Aprovar para publicação (da fila)

### UC-10.4: Pausar/Retomar Pipeline
- Botão global: "Pausar Pipeline" → nenhum novo job é enfileirado
- Jobs em execução terminam normalmente
- "Retomar" → jobs pendentes voltam a ser enfileirados
- Útil para: revisar conteúdo antes de continuar, limitar custos de API

---

## ETAPA AUTOMÁTICA: PESQUISA WEB (Enriquecimento)

**Esta etapa roda automaticamente em dois momentos e não tem página própria. Os resultados são visíveis nas páginas de Fontes e Tópicos.**

### Momento 1: Após adição de fonte

1. LLM analisa o conteúdo extraído e identifica:
   - Temas principais
   - Entidades (pessoas, eventos, locais, datas)
   - Lacunas de informação
2. Sistema gera 3-5 queries de busca otimizadas
3. Executa pesquisas via API (Tavily/Serper/Google Custom Search)
4. Para cada resultado relevante:
   - Extrai texto principal da página
   - Filtra por relevância (LLM classifica 1-10)
   - Salva como ResearchResult vinculado à ContentSource
5. Material consolidado (fonte + pesquisas) vai para geração de tópicos

### Momento 2: Expansão de roteiro curto

1. Após gerar roteiro, se `total_palavras / 150 < duração_alvo`:
   - Sistema identifica pontos do roteiro que podem ser expandidos
   - Gera 3-5 queries focadas em detalhes adicionais, anedotas, fatos complementares
   - Executa pesquisas web
   - Salva como ResearchResult vinculado ao Topic
   - Re-envia para LLM expandir roteiro com material adicional
   - Máximo 2 tentativas de expansão
   - Se ainda curto após 2 tentativas: flag `below_target_duration` + continua pipeline

### Regras de Pesquisa Web
- Máximo de 5 pesquisas por fonte adicionada
- Máximo de 5 pesquisas por tentativa de expansão de roteiro
- Resultados filtrados por relevância (score ≥ 6)
- Fontes priorizadas: Wikipedia, artigos acadêmicos, sites de história, jornais de referência
- Evitar: fóruns, redes sociais, sites de baixa credibilidade
- Todos os resultados salvos para auditoria e referência

---

## RESUMO DE PÁGINAS

| # | Página | Rota | Função |
|---|--------|------|--------|
| 1 | Projetos | `/projects` | Listagem, criação, seleção |
| 2 | Settings do Projeto | `/projects/{id}/settings` | Config completa (geral, storytelling, IA, YouTube) |
| 3 | Fontes de Conteúdo | `/projects/{id}/sources` | Adicionar fontes, ver status do pipeline |
| 4 | Tópicos | `/projects/{id}/topics` | Lista de tópicos gerados, histórias, status |
| 5 | Detalhe do Tópico | `/projects/{id}/topics/{topicId}` | História + navegação para cada etapa |
| 6 | Roteiro | `/projects/{id}/topics/{topicId}/script` | Visualizar/editar roteiro segmentado |
| 7 | Assets Visuais | `/projects/{id}/topics/{topicId}/visuals` | Imagens e vídeos por segmento |
| 8 | Thumbnail | `/projects/{id}/topics/{topicId}/thumbnail` | Thumbnail gerada + editor de texto |
| 9 | Narração | `/projects/{id}/topics/{topicId}/narration` | Player, waveform, edição de trechos |
| 10 | Montagem | `/projects/{id}/topics/{topicId}/assembly` | Timeline, transições, render final |
| 11 | Fila de Publicação | `/projects/{id}/publishing` | Review, aprovação, agendamento, calendário |
| 12 | Pipeline (Kanban) | `/projects/{id}/pipeline` | Visão geral de todos os tópicos por etapa |

**Total: 12 páginas — pipeline 100% automático com review antes da publicação**
