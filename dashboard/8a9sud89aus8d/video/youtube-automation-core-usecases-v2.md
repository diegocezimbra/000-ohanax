# YouTube Content Automation Platform — Use Cases (Core Only) v3

## Visao Geral

Plataforma multi-tenant para automacao completa de criacao e publicacao de videos no YouTube via Content Engine de IA.

**Content Engine (Modelo Pool):**
Fontes alimentam um **Pool de Conhecimento** acumulativo. O **Content Engine** (cron) monitora o buffer de videos e, quando necessario, cruza TODAS as fontes do pool para descobrir a melhor historia possivel, enriquece com pesquisa web direcionada, e envia pelo pipeline: Roteiro -> Visuais -> Thumbnail -> Narracao -> Montagem -> Fila de Publicacao (review manual).

**Fluxo Resumido:**
```
Fontes --> [Extracao + Pesquisa Web] --> Pool de Conhecimento (acumulativo)
                                              |
Content Engine (cron) verifica: buffer < target?
                                              |
                              SIM --> Analisa POOL INTEIRO
                                    --> Cruza fontes (many-to-many)
                                    --> Consulta TopicHistory (deduplicacao)
                                    --> Seleciona melhor historia
                                    --> Pesquisa web direcionada para enriquecer
                                    --> Cria historia (abertura CONECTA a resolucao)
                                    --> Pipeline: script -> visuals -> thumbnail -> narration -> assembly -> publish
```

---

## Arquitetura Resumida

**Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind, Shadcn/UI, React Query
**Backend:** Node.js + NestJS, Prisma, PostgreSQL (RLS para multi-tenancy), Redis + BullMQ (filas)
**Storage:** S3 (imagens, audios, videos)
**IA:** OpenAI/Claude (texto), DALL-E/Flux (imagens), Runway/Kling (video), ElevenLabs (TTS)
**Pesquisa Web:** Tavily API / Serper API / Google Custom Search (enriquecimento automatico)
**Video:** FFmpeg (montagem final)

### Multi-Tenancy
- `project_id` em todas as tabelas + Row-Level Security no PostgreSQL
- Credenciais YouTube e API keys isoladas e criptografadas por projeto (AES-256-GCM)
- Todas as queries filtram por `project_id` via global scope no ORM

### Modelo de Dados

```
Project (1) --> (1) YouTubeCredential
Project (1) --> (1) ProjectSettings (storytelling, AI config, visual identity, Content Engine config)
Project (1) --> (N) ContentSource
ContentSource (1) --> (N) ResearchResult (pesquisas web no ingest)
ContentSource (N) <--> (N) Topic  [via TopicSource junction table]
Project (1) --> (N) Topic
Topic (1) --> (N) ResearchResult (pesquisas web adicionais na story enrichment)
Topic (1) --> (1) Story
Story (1) --> (1) Script
Script (1) --> (N) ScriptSegment
ScriptSegment (1) --> (N) VisualAsset (image ou video)
Script (1) --> (1) Narration
Script (1) --> (1) Thumbnail
Script (1) --> (1) FinalVideo
FinalVideo (1) --> (1) Publication (status: queued / scheduled / publishing / published / failed)
Project (1) --> (N) TopicHistory (deduplicacao de historias ja contadas)

--- Junction Table ---
TopicSource (topic_id, source_id, relevance_score)
  - Tracks which sources contributed to each topic/story
  - Many-to-many: 1 topic can use N sources, 1 source can feed N topics

--- Source Status ---
ContentSource.status: pending | processing | available | exhausted | error
  - pending: added but not yet processed
  - processing: extraction + web research in progress
  - available: in pool, ready for Content Engine to use
  - exhausted: used in enough stories, deprioritized
  - error: extraction/processing failed

--- TopicHistory ---
TopicHistory {
  id, project_id, topic_id,
  story_fingerprint (hash of key narrative elements),
  title, antagonist, protagonist, turning_point,
  source_ids[] (which sources contributed),
  created_at
}
  - Content Engine checks this before selecting new stories
  - Prevents repeating stories already told
```

---

## Framework de Storytelling (Global — Aplicado a Todos os Projetos)

### Padrao Narrativo (Configuravel por Projeto)

**1. HOOK (0:00 - 0:30):** O adversario ri/zomba/duvida. Humilhacao ou desprezo.
"Quando os generais nazistas viram os tanques americanos, eles riram."

**2. CONTEXTO (0:30 - 5:00):** Background historico. O que estava em jogo.

**3. DESENVOLVIMENTO (5:00 - 20:00):** Jornada, dificuldades, momentos de duvida.

**4. VIRADA (20:00 - 30:00):** As mesas viram. O adversario percebe que subestimou.

**5. RESOLUCAO TRIUNFANTE (30:00+):** Vitoria completa. Contraste zombaria vs resultado.

**IMPORTANTE:** A abertura (hook) DEVE conectar tematicamente a resolucao. O Content Engine garante que a historia selecionada tem coerencia inicio-meio-fim antes de entrar no pipeline.

### Gatilhos Psicologicos
- Patriotismo / Orgulho Nacional
- Underdog / Subestimado
- Vinganca / Justica Poetica
- Curiosidade / Misterio
- Raiva Justa

### Template de Titulo
`[ADVERSARIO] ri/zomba de [PROTAGONISTA] sobre [ASSUNTO] -- [CONSEQUENCIA DRAMATICA]`

---

## CONTENT ENGINE — VISAO GERAL DO FLUXO

```
                     ┌──────────────────────────────────────────┐
                     │       POOL DE FONTES (Conhecimento)       │
                     │                                           │
                     │  Source A [available] ──┐                  │
                     │  Source B [available] ──┼── Cross-reference│
                     │  Source C [available] ──┘                  │
                     │  Source D [exhausted]                      │
                     │  Source E [processing]                     │
                     │                                           │
                     │  + ResearchResults vinculados a cada fonte │
                     └──────────────────┬───────────────────────┘
                                        │
              ┌─────────────────────────┼─────────────────────────┐
              │                         │                          │
              ▼                         ▼                          ▼
┌───────────────────────┐ ┌────────────────────────┐ ┌──────────────────────┐
│  INGEST DE FONTE      │ │  CONTENT ENGINE (CRON) │ │  PIPELINE DE VIDEO   │
│  (evento: fonte add)  │ │  (periodico)           │ │  (por historia)      │
│                       │ │                        │ │                      │
│  1. Extrai conteudo   │ │  1. Checa buffer:      │ │  ETAPA 1: Script     │
│  2. Pesquisa web      │ │     buffer < target?   │ │  ETAPA 2: Visuals    │
│  3. Salva no pool     │ │  2. SE SIM:            │ │  ETAPA 3: Thumbnail  │
│  4. Status: available │ │     - Analisa TODO pool │ │  ETAPA 4: Narracao   │
│                       │ │     - Cruza fontes     │ │  ETAPA 5: Montagem   │
│  NAO dispara pipeline │ │     - Checa TopicHist  │ │  ETAPA 6: Publish Q  │
│                       │ │     - Seleciona melhor │ │                      │
│                       │ │     - Pesquisa web +   │ │                      │
│                       │ │     - Cria historia    │ │                      │
│                       │ │     - Envia ao pipeline│ │                      │
└───────────────────────┘ └────────────────────────┘ └──────────────────────┘
```

### Content Engine — Configuracao por Projeto

| Parametro | Default | Descricao |
|-----------|---------|-----------|
| `duration_target` | `30-40min` | Faixa de duracao alvo por video (opcoes: 30-40min, 40-50min, 50-60min). MINIMO 30 MINUTOS |
| `publications_per_day` | `3` | Maximo de publicacoes por dia |
| `buffer_size` | `7` | Numero de videos prontos a manter no buffer |
| `max_gen_per_day` | `5` | Maximo de historias que o engine pode gerar por dia |
| `min_richness` | `7` | Score minimo de riqueza para uma historia ser selecionada (1-10) |

### Content Engine — Logica do Cron

```
A CADA EXECUCAO DO CRON:

1. pipeline_buffer = COUNT(videos com status IN [queued, scheduled])
2. pipeline_target = project.settings.buffer_size (default: 7)
3. gen_today = COUNT(topics criados hoje)
4. max_gen = project.settings.max_gen_per_day (default: 5)

SE pipeline_buffer < pipeline_target E gen_today < max_gen:
  → DISPARAR CICLO DE GERACAO (ver abaixo)
SENAO:
  → NOOP (buffer cheio ou limite diario atingido)
```

### Content Engine — Ciclo de Geracao

```
CICLO DE GERACAO:

1. ANALISE DO POOL
   - Carrega TODAS as fontes com status "available" + seus ResearchResults
   - Cross-referencia temas, entidades, conexoes entre fontes
   - Identifica historias potenciais que CRUZAM multiplas fontes

2. DEDUPLICACAO
   - Carrega TopicHistory do projeto
   - Filtra historias que ja foram contadas (fingerprint match)
   - Remove historias com sobreposicao > 70% com historias existentes

3. RANKING
   - Classifica historias candidatas por richness score
   - Fatores: profundidade do material, potencial narrativo,
     diversidade de fontes, gatilhos emocionais
   - Descarta candidatas com richness < min_richness (default: 7)

4. SELECAO
   - Seleciona a historia com maior richness score
   - Registra as fontes usadas na TopicSource junction table

5. ENRIQUECIMENTO DIRECIONADO
   - Faz 3-5 pesquisas web ESPECIFICAS para a historia selecionada
   - Busca: detalhes, anedotas, datas, nomes, contexto adicional
   - Salva como ResearchResult vinculado ao Topic

6. CRIACAO DA HISTORIA
   - Gera historia completa (4.500-8.000 palavras)
   - GARANTE que abertura (hook) conecta com resolucao
   - Arco narrativo coerente inicio-meio-fim

7. ENVIO AO PIPELINE
   - Status: selected → researching → story_created → ...
   - Pipeline continua automaticamente
```

---

## TRES MOMENTOS DE PESQUISA WEB

### Momento 1: Ingest de Fonte (ao adicionar fonte ao pool)

1. LLM analisa o conteudo extraido e identifica:
   - Temas principais
   - Entidades (pessoas, eventos, locais, datas)
   - Lacunas de informacao
2. Sistema gera 3-5 queries de busca otimizadas
3. Executa pesquisas via API (Tavily/Serper/Google Custom Search)
4. Para cada resultado relevante:
   - Extrai texto principal da pagina
   - Filtra por relevancia (LLM classifica 1-10)
   - Salva como ResearchResult vinculado a ContentSource
5. Fonte muda de status `processing` para `available` no pool

### Momento 2: Enriquecimento de Historia (apos Content Engine selecionar historia)

1. Content Engine selecionou a melhor historia candidata
2. Sistema gera 3-5 queries de busca DIRECIONADAS para essa historia especifica:
   - Detalhes sobre o antagonista/protagonista
   - Contexto historico adicional
   - Anedotas e fatos complementares
3. Executa pesquisas web
4. Salva como ResearchResult vinculado ao Topic
5. Material usado na criacao da historia completa

### Momento 3: Expansao de Roteiro Curto

1. Apos gerar roteiro, se `total_palavras / 150 < duracao_alvo`:
   - Sistema identifica pontos do roteiro que podem ser expandidos
   - Gera 3-5 queries focadas em detalhes adicionais, anedotas, fatos complementares
   - Executa pesquisas web
   - Salva como ResearchResult vinculado ao Topic
   - Re-envia para LLM expandir roteiro com material adicional
   - Maximo 2 tentativas de expansao
   - Se ainda curto apos 2 tentativas: flag `below_target_duration` + continua pipeline

### Regras de Pesquisa Web
- Maximo de 5 pesquisas por fonte adicionada (Momento 1)
- Maximo de 5 pesquisas por enriquecimento de historia (Momento 2)
- Maximo de 5 pesquisas por tentativa de expansao de roteiro (Momento 3)
- Resultados filtrados por relevancia (score >= 6)
- Fontes priorizadas: Wikipedia, artigos academicos, sites de historia, jornais de referencia
- Evitar: foruns, redes sociais, sites de baixa credibilidade
- Todos os resultados salvos para auditoria e referencia

---

## PIPELINE STAGES (por historia/topic)

```
selected → researching → story_created → script_created → visuals_created → thumbnails_created → narration_created → video_assembled → queued_for_publishing → published
```

| Stage | Descricao |
|-------|-----------|
| `selected` | Content Engine selecionou esta historia do pool |
| `researching` | Pesquisa web direcionada para enriquecer a historia |
| `story_created` | Historia narrativa completa gerada |
| `script_created` | Roteiro segmentado gerado (30+ min) |
| `visuals_created` | Imagens/videos gerados para cada segmento |
| `thumbnails_created` | 3 thumbnails geradas, melhor selecionada |
| `narration_created` | Audio TTS gerado + timestamps por segmento |
| `video_assembled` | Video final montado (FFmpeg) |
| `queued_for_publishing` | Aguardando review manual do usuario |
| `published` | Publicado no YouTube |

Statuses adicionais: `error`, `rejected`, `discarded` (richness < min)

---

## PAGINAS E USE CASES

---

## PAGINA 1: PROJETOS

**Rota:** `/projects` (listagem) | `/projects/new` (criacao) | `/projects/{id}/settings` (config)

### UC-1.1: Listar Projetos
- Grid de cards com: nome, logo, status YouTube (conectado/desconectado), status Content Engine (ativo/pausado), contadores (fontes no pool, historias, videos na fila, publicados), ultimo video publicado
- Botao "Novo Projeto"
- Clique no card -> entra no projeto

### UC-1.2: Criar Projeto
- **Formulario em abas:**

**Aba "Geral":**
- Nome do projeto, descricao, idioma (en-US, pt-BR, etc.)
- Upload de logo (opcional)
- Categoria/nicho: WW2, Cold War, True Crime, Disasters, Political Scandals, Custom

**Aba "Storytelling":**
- Template narrativo: campos editaveis para cada bloco (hook, contexto, desenvolvimento, virada, resolucao)
- Gatilhos psicologicos: checkboxes (patriotismo, underdog, vinganca, curiosidade, raiva justa)
- Template de titulo com placeholders: `{adversary}`, `{protagonist}`, `{topic}`, `{consequence}`
- Tom da narracao: formal, casual, dramatico, documental

**Aba "Content Engine":**
- Duracao alvo dos videos: 30-40min, 40-50min, 50-60min (MINIMO 30 MINUTOS)
- Publicacoes por dia: padrao 3 (configuravel)
- Buffer size: padrao 7 videos (configuravel)
- Max geracoes por dia: padrao 5 (configuravel)
- Richness score minimo: padrao 7 (configuravel 1-10)

**Aba "IA":**
- LLM: provedor (OpenAI/Anthropic) + API key + modelo
- TTS: provedor (ElevenLabs/OpenAI TTS) + API key + voz (com preview de audio)
- Imagem: provedor (DALL-E/Flux/Midjourney) + API key + estilo visual (realistic, cinematic, vintage, etc.)
- Video (opcional): provedor (Runway/Kling) + API key
- Pesquisa Web: provedor (Tavily/Serper) + API key

**Aba "YouTube":**
- Botao "Conectar ao YouTube" -> OAuth2 com Google (scopes: `youtube.upload`, `youtube.readonly`)
- Exibe nome do canal + avatar + status "Conectado"
- Botao "Testar Conexao" / "Reconectar"

### UC-1.3: Editar Projeto
- Mesmas abas, dados preenchidos, cada aba salva independentemente

---

## PAGINA 2: POOL DE FONTES (Conhecimento)

**Rota:** `/projects/{id}/sources`

**Sidebar label:** "Pool de Fontes" (dentro da secao "Conhecimento")

**Layout:** Tabela com: titulo, tipo (badge), data, status no pool (icone), num de historias que usaram esta fonte, health score, acoes

### UC-2.1: Adicionar Fonte — URL
1. Clica "Adicionar Fonte" -> seleciona "URL"
2. Informa URL
3. Sistema faz scraping: extrai titulo, texto principal, autor, data
4. Preview do conteudo extraido -> confirma
5. Salva ContentSource tipo `url`, status `pending`
6. **INICIA INGEST** (extracao + pesquisa web -> status `processing` -> `available`)
7. Fonte entra no Pool de Conhecimento. **NAO dispara pipeline.**

### UC-2.2: Adicionar Fonte — PDF
1. Upload de PDF (drag & drop)
2. Extrai texto (pdf-parse + OCR se necessario)
3. Preview -> confirma
4. Salva ContentSource tipo `pdf`, status `pending`
5. **INICIA INGEST** -> status `available` no pool

### UC-2.3: Adicionar Fonte — Texto Manual
1. Rich text editor: titulo, corpo, referencia
2. Salva ContentSource tipo `manual`, status `pending`
3. **INICIA INGEST** -> status `available` no pool

### UC-2.4: Adicionar Fonte — YouTube (Transcricao)
1. Informa URL do video
2. Extrai transcricao via YouTube Transcript API
3. Preview -> confirma
4. Salva ContentSource tipo `youtube_transcript`, status `pending`
5. **INICIA INGEST** -> status `available` no pool

### UC-2.5: Visualizar Status da Fonte no Pool
- Na listagem, cada fonte mostra status no pool:
  - `pending` — Aguardando processamento
  - `processing` — Extracao + pesquisa web em andamento
  - `available` — No pool, pronta para uso pelo Content Engine
  - `exhausted` — Ja usada em historias suficientes, deprioritizada
  - `error` — Falha no processamento (clicavel para ver detalhes)
- Clique na fonte -> expande/abre detalhe com:
  - Conteudo extraido
  - Pesquisas web feitas (Momento 1)
  - Historias que usaram esta fonte (via TopicSource)
  - Health score (riqueza restante de conteudo)

### UC-2.6: Pool Stats (Dashboard)
- Total de fontes no pool por status
- Fontes mais utilizadas (por num de historias)
- Fontes nunca utilizadas
- Fontes com mais potencial restante
- **Endpoints:** `api.sources.pool.stats`, `api.sources.pool.health`

### UC-2.7: Editar/Excluir Fonte
- Editar conteudo extraido (re-processa pesquisa web)
- Excluir (soft delete, com confirmacao se fonte foi usada em historias)

---

## PAGINA 3: HISTORIAS (Descobertas pelo Content Engine)

**Rota:** `/projects/{id}/topics`

**Sidebar label:** "Historias" (dentro da secao "Conhecimento")

**Layout:** Lista/tabela com status badge por etapa do pipeline + filtros

### UC-3.1: Descoberta Automatica de Historias (disparado pelo Content Engine)

**Este passo roda automaticamente quando o Content Engine detecta que o buffer esta baixo. O use case descreve o que o sistema faz internamente:**

1. Content Engine carrega TODAS as fontes com status `available` do pool + seus ResearchResults
2. Cruza conteudo entre fontes para encontrar conexoes e historias ricas
3. Envia para LLM:

```
PROMPT:
"Dado o POOL DE CONHECIMENTO abaixo sobre [nicho do projeto], identifique as melhores
historias que possam virar videos de YouTube de [duracao alvo] minutos.

POOL DE FONTES (cross-reference TODAS):
- Fonte 1: [conteudo extraido + pesquisas web]
- Fonte 2: [conteudo extraido + pesquisas web]
- Fonte 3: [conteudo extraido + pesquisas web]
...

HISTORIAS JA CONTADAS (NAO REPETIR):
[lista de TopicHistory: titulo, antagonista, protagonista, turning_point]

Cada historia DEVE ter:
- Um antagonista claro que zomba/subestima/duvida
- Um protagonista que surpreende/vence
- Uma virada dramatica
- A abertura DEVE CONECTAR tematicamente com a resolucao
- Potencial para gerar [gatilhos configurados no projeto]
- PODE E DEVE cruzar multiplas fontes para criar historias mais ricas

Para cada historia retorne JSON:
{
  "title": "formato: [Antagonista] [zombaria] [Protagonista] -- [Consequencia]",
  "hook": "frase de abertura dramatica (1-2 frases)",
  "summary": "resumo do arco narrativo (3-5 frases)",
  "antagonist": "quem zomba",
  "protagonist": "quem vence",
  "turning_point": "momento de virada",
  "hook_resolution_connection": "como o hook se conecta com a resolucao",
  "emotional_triggers": ["patriotism", "underdog", ...],
  "estimated_richness": 1-10,
  "source_ids": ["ids das fontes usadas"],
  "key_search_terms": ["termos para pesquisa adicional"]
}"
```

4. Sistema recebe historias candidatas com scores
5. **FILTRO:** so historias com `richness >= [minimo configurado, padrao 7]` sao consideradas
6. **DEDUPLICACAO:** compara fingerprints com TopicHistory, descarta duplicadas
7. Seleciona a historia com MAIOR richness score
8. Registra fontes usadas na TopicSource junction table
9. **PESQUISA WEB DIRECIONADA** (Momento 2): 3-5 pesquisas especificas para enriquecer a historia selecionada
10. Gera historia completa -> status `story_created` -> pipeline continua

### UC-3.2: Criar Historia Manual
- Formulario: titulo, hook, resumo, antagonista, protagonista, virada, triggers
- Link para fontes do pool (seleciona multiplas fontes relacionadas)
- Ao salvar: **DISPARA PIPELINE** a partir da pesquisa web direcionada + geracao de historia

### UC-3.3: Geracao Automatica de Historia (disparado pelo Content Engine)

**Roda automaticamente para a historia selecionada pelo engine:**

1. Sistema compila: dados da historia candidata + conteudo das fontes usadas (multiplas) + pesquisas web (Momentos 1 e 2)
2. Envia para LLM:

```
PROMPT:
"Crie uma historia narrativa completa e detalhada sobre [topico].

MATERIAL DISPONIVEL:
- Resumo da historia: [summary]
- Fontes originais (MULTIPLAS — cross-reference):
  - Fonte 1: [conteudo]
  - Fonte 2: [conteudo]
  - ...
- Pesquisas web do pool: [resultados Momento 1]
- Pesquisas web direcionadas: [resultados Momento 2]

Siga RIGOROSAMENTE este arco narrativo:

1. ABERTURA: O antagonista ([antagonist]) zomba/ri/desdenha de ([protagonist]).
   Criar cena vivida com dialogo reconstruido.
   A ABERTURA DEVE PLANTAR A SEMENTE DA RESOLUCAO — o elemento de zombaria
   sera o mesmo que se inverte no final.
2. CONTEXTO HISTORICO: Situar no tempo/espaco. O que estava em jogo.
3. PERSONAGENS: Desenvolver antagonista e protagonista com profundidade humana.
4. DESENVOLVIMENTO: Tensao progressiva, obstaculos, momentos de duvida.
5. VIRADA: [turning_point] — momento dramatico que muda tudo.
6. RESOLUCAO: Triunfo completo do protagonista. Contraste com a zombaria inicial.
   O hook e a resolucao DEVEM formar um arco coerente.

Regras:
- Entre 4.500 e 8.000 palavras (MINIMO 30 MINUTOS de narracao a 150 wpm)
- Detalhes vividos, dialogos reconstruidos, descricoes sensoriais
- Tom: [tom do projeto]
- Idioma: [idioma do projeto]
- 100% FACTUAL. Nao inventar eventos. Dialogos dramatizados mas baseados em registros.
- Se houver informacoes conflitantes nas fontes, priorizar a mais confiavel.
- Retornar em texto corrido."
```

3. Salva historia vinculada ao topic
4. Registra no TopicHistory (fingerprint, sources, etc.)
5. Status: `story_created` -> pipeline continua

### UC-3.4: Visualizar Historias
- Lista com: titulo, richness score (badge colorida), status do pipeline (etapa atual), fontes usadas (badges), data
- Filtros: por status, por richness, por fonte de origem
- Clique na historia -> abre detalhe com historia + fontes utilizadas + status de cada etapa

### UC-3.5: Editar Historia (manual, opcional)
- Rich text editor com auto-save
- Sidebar com fontes originais (do pool) para referencia
- Botao "Regenerar trecho" -> seleciona texto, IA reescreve
- Se editar: pode re-disparar pipeline das etapas seguintes

### UC-3.6: Ver Fontes de uma Historia
- Lista de todas as fontes que contribuiram para esta historia
- Score de relevancia de cada fonte para esta historia especifica
- **Endpoint:** `api.topics.sources`

---

## PAGINA 4: ROTEIROS

**Rota:** `/projects/{id}/topics/{topicId}/script`

**Layout:** Editor de segmentos — cards empilhados, cada um com texto + visual hint + tempo estimado

### UC-4.1: Geracao Automatica de Roteiro com Auto-Enriquecimento (disparado pelo pipeline)

**Roda automaticamente apos historia ser criada:**

1. Sistema envia historia + config para LLM:

```
=== MEGA PROMPT — GERACAO DE ROTEIRO ===

Voce e um roteirista profissional de documentarios narrativos para YouTube.
Seu objetivo e criar roteiros que PRENDAM a audiencia do primeiro ao ultimo segundo.

## CONTEXTO DO PROJETO
- Canal: [nome]
- Nicho: [nicho]
- Idioma: [idioma]
- Tom: [tom]
- Duracao alvo: [duracao] minutos (MINIMO 30 MINUTOS)
- Gatilhos: [lista de triggers ativos]

## ESTRUTURA OBRIGATORIA

### BLOCO 1 — HOOK DEVASTADOR (primeiros 30 segundos)
Comece com a cena mais impactante. O antagonista zombando, rindo, desprezando.
Use dialogo reconstruido. O espectador PRECISA sentir raiva ou indignacao
nos primeiros 10 segundos.
IMPORTANTE: O hook DEVE plantar a semente do que sera resolvido no final.
A zombaria especifica aqui sera o que se inverte na resolucao.
Exemplo: "Quando o general [X] viu [Y], ele nao conteve a risada.
Virou-se para seus oficiais e disse: '[desprezo]'. Ele nao fazia ideia
do que estava por vir."

### BLOCO 2 — CONTEXTUALIZACAO (2-5 minutos)
Transicao suave do hook para o contexto.
Situe o espectador: quando, onde, por que.
Apresente personagens com profundidade humana.
Termine com frase que aumente a tensao.

### BLOCO 3 — CONSTRUCAO DE TENSAO (5-20 minutos)
Ritmo crescente. Alterne esperanca e desespero.
Detalhes especificos: numeros, nomes, datas, locais.
Pelo menos 3-5 "mini-cliffhangers" internos.
Cada paragrafo faz o espectador querer ouvir o proximo.

### BLOCO 4 — A GRANDE VIRADA (20-30 minutos)
O momento que muda tudo. Suspense. Frases curtas para impacto.
Arrepio. Callback a zombaria do hook.

### BLOCO 5 — RESOLUCAO TRIUNFANTE (30+ minutos)
Consequencias completas. Reacao do antagonista ao resultado.
Reflexao poderosa que reforca o gatilho emocional.
CALLBACK EXPLICITO ao hook — a zombaria especifica se inverte.
Ultima frase memoravel e "compartilhavel".

## REGRAS ABSOLUTAS

1. NARRACAO CONTINUA. 100% texto narrado. Sem indicacoes de camera,
   sem "[musica dramatica]", sem "B-roll". APENAS o texto falado.

2. TECNICAS OBRIGATORIAS:
   - Open loops: "Mas havia algo que ninguem sabia ainda..."
   - Transicoes de expectativa: "O que aconteceu a seguir mudaria tudo."
   - Detalhes sensoriais: sons, cheiros, visuais, texturas
   - Numeros: "47 homens", "as 3:42 da madrugada", "a 800 metros"
   - Contraste: alternar lado do antagonista e protagonista
   - Callback ao hook: referenciar a zombaria inicial 3-5x ao longo do roteiro

3. SEGMENTACAO:
   Divida o roteiro em SEGMENTOS de 30-60 segundos (50-120 palavras cada).
   Cada segmento = UMA cena visual distinta.

   Formato:
   [SEGMENT_01]
   {texto da narracao}
   [/SEGMENT_01]

4. METRICAS:
   - ~150 palavras/minuto
   - 30 min = ~4.500 palavras / 36-50 segmentos
   - 40 min = ~6.000 palavras / 48-60 segmentos
   - 50 min = ~7.500 palavras / 60-75 segmentos
   - ZERO filler — cada segmento avanca a narrativa

5. METADATA:
   Gere tambem:
   - youtube_title: template do projeto, max 100 chars
   - youtube_description: 2-3 paragrafos com SEO
   - youtube_tags: 15-20 tags

## HISTORIA BASE
[historia completa]

## OUTPUT
JSON: { title, description, tags, segments: [{ number, text, visual_hint }] }
```

2. Sistema recebe roteiro e calcula duracao: `total_palavras / 150`

3. **VERIFICACAO DE DURACAO — AUTO-ENRIQUECIMENTO (Momento 3 de Pesquisa Web):**
   ```
   SE duracao_estimada < duracao_alvo DO projeto (MINIMO 30 MIN):
     -> Sistema identifica os pontos do roteiro que podem ser expandidos
     -> Faz 3-5 pesquisas web automaticas focadas na historia:
       - Busca por detalhes adicionais, anedotas, fatos complementares
       - Usa os key_search_terms da historia + termos extraidos do roteiro
       - Salva resultados como ResearchResult vinculados ao Topic
     -> Re-envia para LLM com prompt de expansao:

       "O roteiro abaixo tem [X] palavras ([Y] minutos estimados).
       A duracao alvo e [Z] minutos (MINIMO 30 MINUTOS).

       MATERIAL ADICIONAL DE PESQUISA:
       [resultados das novas pesquisas web]

       Expanda o roteiro usando APENAS fatos reais do material adicional.
       Mantenha a mesma estrutura e qualidade narrativa.
       Adicione: detalhes historicos, anedotas reais, contexto adicional,
       personagens secundarios, consequencias de longo prazo.

       NAO adicione filler. Cada novo segmento deve AGREGAR a narrativa.

       Retorne o roteiro completo expandido no mesmo formato de segmentos."

     -> Maximo 2 tentativas de expansao
     -> Se apos 2 tentativas ainda estiver curto: salva como esta + flag "below_target_duration"
   ```

4. Salva Script + ScriptSegments
5. Status: `script_created` -> pipeline continua

### UC-4.2: Editar Roteiro (manual, opcional)
- Cards de segmentos com edicao inline
- Drag & drop para reordenar
- "Regenerar segmento" -> envia contexto (anterior + posterior) para IA
- "Dividir segmento" / "Fundir segmentos"
- Tempo total estimado atualizado em tempo real
- Auto-save

### UC-4.3: Aprovar Roteiro (manual, opcional)
- No fluxo automatico, o roteiro e aprovado automaticamente apos geracao
- Usuario pode pausar o engine e revisar manualmente se quiser
- Botao "Reprovar e Regenerar" -> volta a geracao de roteiro

---

## PAGINA 5: ASSETS VISUAIS (IMAGENS + VIDEOS)

**Rota:** `/projects/{id}/topics/{topicId}/visuals`

**Layout:** Grid — esquerda: texto do segmento | direita: asset gerado (imagem ou video)

### UC-5.1: Geracao Automatica de Prompts de Imagem (disparado pelo pipeline)

1. Sistema envia segmentos para LLM:

```
=== PROMPT — DIRECAO DE ARTE ===

Voce e um diretor de arte especializado em prompts para IA geradora de imagens.

## CONTEXTO
- Estilo visual: [estilo do projeto]
- Nicho: [nicho]
- Epoca: [se aplicavel]
- Aspect ratio: 16:9 (1920x1080) — SEMPRE paisagem

## REGRAS

1. Cada prompt gera UMA imagem cinematografica que ilustra a cena
2. NUNCA texto/lettering na imagem
3. Linguagem tecnica de fotografia:
   - Angulo: low angle, bird's eye, dutch angle, close-up, wide shot
   - Iluminacao: dramatic lighting, golden hour, chiaroscuro, rim light
   - Composicao: rule of thirds, leading lines, depth of field
4. Detalhes de epoca: uniformes, tecnologia, arquitetura, veiculos corretos
5. CONSISTENCIA visual entre segmentos:
   - Mesma paleta de cores
   - Mesmo estilo artistico
   - Personagens recorrentes com descricao consistente
6. Cenas de emocao: expressoes faciais, linguagem corporal
7. Cenas de acao: movimento, dinamismo
8. Evitar: gore, conteudo sensivel, rostos de pessoas reais

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

2. Salva prompts -> dispara geracao de imagens automaticamente

### UC-5.2: Geracao Automatica de Imagens (Batch — disparado pelo pipeline)
1. Jobs enfileirados (BullMQ) — um por segmento, execucao paralela
2. Cada job chama API de imagem (DALL-E 3 / Flux)
3. Imagens salvas no S3, vinculadas ao segmento
4. Para segmentos com `asset_type_suggestion: "video"`: chama API de video (Runway/Kling) -> clip 3-5s
5. Retry automatico: ate 3x por segmento
6. Ao concluir todos os segmentos -> pipeline continua

### UC-5.3: Visualizar e Editar Assets (manual, opcional)
- Grid com segmentos + assets gerados
- "Regenerar" imagem/video de um segmento
- Upload manual de asset proprio
- Selecionar entre versoes alternativas
- Storyboard horizontal com preview da sequencia completa

---

## PAGINA 6: THUMBNAIL

**Rota:** `/projects/{id}/topics/{topicId}/thumbnail`

### UC-6.1: Geracao Automatica de Thumbnail (disparado pelo pipeline)

1. LLM gera 3 prompts de thumbnail:

```
PROMPT:
"Crie prompts para thumbnail de YouTube de ALTA CONVERSAO.

Titulo: [titulo]
Hook: [hook]
Nicho: [nicho]

REGRAS:
1. Contraste extremo — cores vibrantes em telas pequenas
2. Emocao forte — expressao facial exagerada (choque, raiva, surpresa)
3. Composicao simples — max 2-3 elementos
4. Curiosidade — algo que faca querer saber mais
5. Contraste narrativo — quem zomba vs quem vence
6. 16:9 (1280x720)
7. NUNCA texto na imagem (adicionado depois automaticamente)
8. Cores: vermelho, amarelo, preto — melhores para CTR
9. Rostos grandes (30%+ da area)

Gere 3 variacoes:
- V1: Foco no antagonista (zombaria/arrogancia)
- V2: Foco no contraste (antes/depois)
- V3: Foco no objeto/evento central"
```

2. Gera 3 imagens
3. **Selecao automatica:** sistema usa a V2 (contraste) como padrao (maior CTR historico)
4. Texto do titulo renderizado automaticamente sobre a thumbnail usando template visual do projeto (fonte, cor, posicao, stroke configurados no projeto)
5. Salva thumbnail final -> pipeline continua

### UC-6.2: Editar Thumbnail (manual, opcional)
- Visualizar as 3 variacoes e trocar selecao
- Editor canvas overlay para ajustar texto
- Regenerar variacoes
- Upload de thumbnail custom

---

## PAGINA 7: NARRACAO (TTS)

**Rota:** `/projects/{id}/topics/{topicId}/narration`

### UC-7.1: Geracao Automatica de Narracao (disparado pelo pipeline)

1. Sistema concatena todos os segmentos do roteiro
2. Envia para API de TTS (ElevenLabs/OpenAI TTS):
   - Texto completo
   - Voice ID do projeto
   - Velocidade/estabilidade configuradas
3. Recebe audio (MP3/WAV) -> salva no S3
4. **Forced alignment automatico** (Whisper/Gentle):
   - Mapeia texto -> timestamps
   - Salva timestamp inicio/fim de cada segmento
5. Validacao: se alignment falhar para algum segmento -> marca para review
6. Pipeline continua

### UC-7.2: Visualizar e Editar Narracao (manual, opcional)
- Player com waveform + marcadores de segmento
- Play individual por segmento
- "Regenerar trecho" -> gera novo audio so daquele segmento -> splice automatico
- Ajustar pausas entre segmentos

---

## PAGINA 8: MONTAGEM DO VIDEO

**Rota:** `/projects/{id}/topics/{topicId}/assembly`

**Layout:** Timeline simplificada — track de audio + track de visuais

### UC-8.1: Montagem Automatica (disparado pelo pipeline)

1. Sistema monta automaticamente:
   - Trilha de audio: narracao completa
   - Trilha visual: cada imagem/video com duracao = timestamp do segmento na narracao
   - **Transicoes:** crossfade 0.5s (padrao do projeto, configuravel)
   - **Ken Burns Effect** em imagens estaticas:
     - Zoom/pan lento, direcao variada
     - Intensidade: sutil 5% (padrao)
     - NAO aplicado em assets de video
2. Processamento via FFmpeg:
   - Encoding: H.264 High Profile, 1080p, 30fps
   - Audio: AAC 192kbps
   - Container: MP4
3. Video salvo no S3 como FinalVideo
4. Status: `video_assembled` -> entra na Fila de Publicacao (`queued_for_publishing`)

### UC-8.2: Ajustar Montagem (manual, opcional)
- Timeline visual com preview
- Trocar asset de um segmento
- Alterar tipo de transicao entre segmentos
- Ajustar Ken Burns por segmento
- Adicionar musica de fundo (upload royalty-free, volume 15-20%)
- Re-renderizar apos ajustes

---

## PAGINA 9: FILA DE PUBLICACAO

**Rota:** `/projects/{id}/publishing`

**Layout:** Lista de videos prontos aguardando review + calendario de publicacao

### UC-9.1: Revisar Fila de Publicacao
- Lista de videos com status `queued_for_publishing` (gerados automaticamente pelo pipeline)
- Cada item mostra: thumbnail, titulo, duracao, data de criacao, richness score, fontes usadas (badges)
- **Acoes por video:**
  - **Preview rapido** (player inline)
  - **Aprovar** -> muda para `scheduled`, entra na fila de publicacao automatica
  - **Editar antes de aprovar** -> abre formulario com titulo, descricao, tags, thumbnail editaveis
  - **Reprocessar** -> volta a historia para uma etapa anterior do pipeline
  - **Rejeitar** -> marca como `rejected`, nao sera publicado

### UC-9.2: Publicacao Automatica (max configuravel/dia)
- Videos com status `scheduled` entram na fila de publicacao
- **Regra:** maximo de `publications_per_day` publicacoes por dia por projeto (configuravel em Content Engine settings, padrao: 3)
- Cron job distribui as publicacoes ao longo do dia (ex: 9h, 14h, 19h — ou horarios configuraveis)
- Para cada publicacao:
  1. Upload via YouTube Data API v3 (resumable)
  2. Set metadata (titulo, descricao, tags)
  3. Upload de thumbnail
  4. Visibilidade: Public (padrao, configuravel)
  5. Status: `publishing` -> `published`
  6. Salva YouTube video ID
- Se falhar: retry ate 3x com exponential backoff -> se persistir: status `failed` + alerta

### UC-9.3: Gerenciar Publicacoes
- Filtros: por status (queued_for_publishing, scheduled, published, failed, rejected)
- Ordenacao: por data de criacao, por richness score
- Videos publicados: link direto para o YouTube
- Videos com falha: botao "Tentar novamente"
- Calendario visual: mostra quais dias tem publicacao agendada

### UC-9.4: Configurar Horarios de Publicacao
- Configuravel por projeto em Settings:
  - Max publicacoes por dia (padrao: 3, alinhado com Content Engine settings)
  - Horarios preferenciais (ex: 09:00, 14:00, 19:00)
  - Dias da semana ativos (ex: seg-sex, ou todos os dias)
  - Timezone do canal

---

## PAGINA 10: PIPELINE + CONTENT ENGINE (VISAO GERAL DO PROJETO)

**Rota:** `/projects/{id}/pipeline`

**Layout:** Header com status do Content Engine + Kanban board com todas as etapas

### UC-10.1: Status do Content Engine
- **Header da pagina mostra:**
  - Status do engine: Ativo / Pausado (com indicador visual)
  - Buffer atual: X de Y videos prontos (ex: "3/7 videos no buffer")
  - Barra de progresso do buffer
  - Geracoes hoje: X de Y (ex: "2/5 geracoes hoje")
  - Proxima execucao do cron: "em 15 minutos"
  - Botoes: "Pausar Engine" / "Retomar Engine" / "Forcar Geracao Agora"
- **Endpoints:** `api.contentEngine.status`, `api.contentEngine.trigger`, `api.contentEngine.pause`, `api.contentEngine.resume`

### UC-10.2: Visualizar Pipeline (Kanban)
- Colunas (refletem pipeline stages):
  1. `selected` — Selecionada pelo Content Engine
  2. `researching` — Pesquisa web direcionada em andamento
  3. `story_created` — Historia criada
  4. `script_created` — Roteiro gerado
  5. `visuals_created` — Assets visuais gerados
  6. `thumbnails_created` — Thumbnails geradas
  7. `narration_created` — Narracao pronta
  8. `video_assembled` — Video montado
  9. `queued_for_publishing` — Aguardando review
  10. `published` — Publicado
  11. `discarded` — Richness < min_richness
  12. `rejected` — Rejeitado pelo usuario
  13. `error` — Erro em alguma etapa
- Cards: titulo, richness score, fontes usadas (icones), data, barra de progresso
- Badge de "auto" nos cards que estao sendo processados automaticamente
- Clique no card -> abre historia na etapa atual
- Contador por coluna

### UC-10.3: Historico do Content Engine
- Log de todas as execucoes do engine:
  - Data/hora
  - Acao: "geracao disparada" / "buffer cheio — noop" / "limite diario atingido"
  - Historia gerada (se aplicavel)
  - Fontes usadas
  - Richness score
- **Endpoint:** `api.contentEngine.history`

### UC-10.4: Monitorar Pipeline Automatico
- Indicador em tempo real: quantos jobs estao rodando, na fila, concluidos, com erro
- Para jobs com erro: botao "Retry" individual
- Log simplificado por historia: quais etapas concluiram, qual esta rodando, qual falhou

### UC-10.5: Bulk Actions
- Selecionar multiplas historias:
  - Re-disparar pipeline de uma etapa especifica
  - Mover para "Rejeitado"
  - Aprovar para publicacao (da fila)

### UC-10.6: Pausar/Retomar Engine
- Botao global: "Pausar Engine" -> Content Engine para de gerar novas historias
- Jobs em execucao no pipeline terminam normalmente
- "Retomar Engine" -> Content Engine volta a verificar buffer e gerar
- Util para: revisar conteudo antes de continuar, limitar custos de API
- **Endpoints:** `api.contentEngine.pause`, `api.contentEngine.resume`

---

## PAGINA 11: CONFIGURACOES DO PROJETO (SETTINGS)

**Rota:** `/projects/{id}/settings`

**Layout:** Duas secoes principais: Content Engine + YouTube

### Secao 1: Content Engine

| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| Duracao alvo | Select | 30-40min | Opcoes: 30-40min, 40-50min, 50-60min |
| Publicacoes por dia | Number | 3 | Max videos publicados por dia |
| Buffer size | Number | 7 | Videos prontos a manter no buffer |
| Max geracoes/dia | Number | 5 | Max historias geradas pelo engine por dia |
| Richness minimo | Slider (1-10) | 7 | Score minimo para uma historia seguir no pipeline |
| Engine ativo | Toggle | ON | Liga/desliga o Content Engine |

**Endpoint:** `api.settings.updateContentEngine`

### Secao 2: YouTube

- Conexao OAuth2 (ja existente no UC-1.2)
- Horarios de publicacao
- Dias da semana ativos
- Timezone
- Visibilidade padrao (Public/Unlisted/Private)

### Secao 3: Storytelling (movida de UC-1.2)

- Template narrativo
- Gatilhos psicologicos
- Template de titulo
- Tom da narracao

### Secao 4: IA (movida de UC-1.2)

- LLM, TTS, Imagem, Video, Pesquisa Web — provedores e API keys

---

## SIDEBAR / NAVEGACAO

```
[Logo do Projeto]

-- Conhecimento --
  Pool de Fontes          /projects/{id}/sources
  Historias               /projects/{id}/topics

-- Producao --
  Pipeline                /projects/{id}/pipeline
  Fila de Publicacao      /projects/{id}/publishing

-- Configuracao --
  Settings                /projects/{id}/settings
```

Labels atualizados:
- "Fontes de Conteudo" -> "Pool de Fontes"
- "Topicos" -> "Historias"
- Secao "Conteudo" -> "Conhecimento"
- "Pausar Pipeline" -> "Pausar Engine" / "Retomar Engine"

---

## API ENDPOINTS (novos em v3)

### Content Engine
```
GET    /api/content-engine/status         -> { active, buffer_current, buffer_target, gen_today, max_gen, next_run }
POST   /api/content-engine/trigger        -> Forca execucao imediata do engine
POST   /api/content-engine/pause          -> Pausa o engine
POST   /api/content-engine/resume         -> Retoma o engine
GET    /api/content-engine/history        -> Log de execucoes do engine
```

### Pool de Fontes
```
GET    /api/sources/pool/stats            -> { total, by_status: { available, exhausted, processing, ... } }
GET    /api/sources/pool/health           -> { sources: [{ id, health_score, times_used, potential_remaining }] }
```

### Historias (Topics)
```
GET    /api/topics/:id/sources            -> [{ source_id, title, relevance_score }]
```

### Settings
```
PUT    /api/settings/content-engine       -> { duration_target, publications_per_day, buffer_size, max_gen_per_day, min_richness }
```

---

## RESUMO DE PAGINAS

| # | Pagina | Rota | Funcao |
|---|--------|------|--------|
| 1 | Projetos | `/projects` | Listagem, criacao, selecao |
| 2 | Settings do Projeto | `/projects/{id}/settings` | Config: Content Engine + YouTube + Storytelling + IA |
| 3 | Pool de Fontes | `/projects/{id}/sources` | Pool de conhecimento, adicionar fontes, ver status e health |
| 4 | Historias | `/projects/{id}/topics` | Historias descobertas pelo Content Engine, status do pipeline |
| 5 | Detalhe da Historia | `/projects/{id}/topics/{topicId}` | Historia + fontes usadas + navegacao para cada etapa |
| 6 | Roteiro | `/projects/{id}/topics/{topicId}/script` | Visualizar/editar roteiro segmentado (30+ min) |
| 7 | Assets Visuais | `/projects/{id}/topics/{topicId}/visuals` | Imagens e videos por segmento |
| 8 | Thumbnail | `/projects/{id}/topics/{topicId}/thumbnail` | Thumbnail gerada + editor de texto |
| 9 | Narracao | `/projects/{id}/topics/{topicId}/narration` | Player, waveform, edicao de trechos |
| 10 | Montagem | `/projects/{id}/topics/{topicId}/assembly` | Timeline, transicoes, render final |
| 11 | Fila de Publicacao | `/projects/{id}/publishing` | Review, aprovacao, agendamento, calendario |
| 12 | Pipeline + Content Engine | `/projects/{id}/pipeline` | Status do engine + Kanban de todas as historias por etapa |

**Total: 12 paginas — Content Engine autonomo com pool de conhecimento acumulativo, geracao inteligente de historias por cross-referencing de multiplas fontes, deduplicacao via TopicHistory, e review manual antes da publicacao. MINIMO 30 MINUTOS por video.**






Guia definitivo: monetização e algoritmo do YouTube para canais de história
Vídeos com imagens estáticas tipo slideshow estão explicitamente listados como não-monetizáveis nas políticas oficiais do YouTube — mas canais de história/documentário que adicionam movimento, narração original e valor educacional são monetizados normalmente. A política de julho de 2025 ("Inauthentic Content") mira conteúdo produzido em massa e sem esforço criativo, não o uso de ferramentas de IA em si. googleGoogle Support O algoritmo em 2024-2025 prioriza satisfação do espectador sobre watch time bruto, Outlierkit opera com 5 sistemas de recomendação separados e processa 80 bilhões de sinais diários Neil Patel para decidir o que mostrar a cada usuário. Este relatório detalha exatamente o que funciona, com números concretos e exemplos reais.

PARTE 1: POLÍTICA DE MONETIZAÇÃO — O QUE O YOUTUBE ACEITA E REJEITA
Slideshows de imagens estáticas são explicitamente proibidos para monetização
A política oficial do YouTube Partner Program (YPP), atualizada em 15 de julho de 2025, lista de forma inequívoca entre os conteúdos não elegíveis para monetização: "Image slideshows or scrolling text with minimal or no narrative, commentary, or educational value." Google Support Esta regra está na seção "Inauthentic Content" (anteriormente chamada "Repetitious Content"). Google Supportgoogle
A palavra-chave aqui é "com mínima ou nenhuma narrativa, comentário ou valor educacional." Isso cria uma distinção crucial: slideshows sem narração substantiva são proibidos, mas imagens com narração original, análise profunda e valor educacional podem ser aceitas. A política é baseada em princípios, não em regras prescritivas — o YouTube não especifica "X% do vídeo deve ser footage" ou "imagens não podem exceder Y segundos." Em vez disso, aplica um teste qualitativo: o conteúdo demonstra esforço criativo humano genuíno? google
Adicionar transições (crossfade, zoom, Ken Burns effect) ajuda, mas não é suficiente por si só. Análises de especialistas convergem: efeitos visuais precisam ser combinados com narração original que contenha opinião, análise ou insights únicos; valor educacional ou de entretenimento demonstrável; e variação substancial entre vídeos. Simplesmente aplicar pan-and-zoom em imagens estáticas com TTS genérico continua vulnerável a ser flaggeado. SubscribrMilx
"Reused content" e "Inauthentic content" são políticas distintas
O YouTube mantém duas políticas separadas que frequentemente se confundem. Reused content refere-se a conteúdo que já existe no YouTube ou em outra fonte online, republicado sem "significant original commentary, substantive modifications, or educational or entertainment value." Google Supportgoogle Importante: esta política se aplica mesmo com permissão do criador original, porque não é baseada em copyright. googleGoogle Support
Inauthentic content (nova nomenclatura desde julho 2025) refere-se a "mass-produced or repetitive content" Google Support — conteúdo produzido com template com pouca variação entre vídeos, ou facilmente replicável em escala. Google Support +2 Exemplos explícitos incluem: leituras de materiais não criados pelo uploader, conteúdo repetitivo com baixo valor educacional, e conteúdo produzido em massa usando template similar. google +2
O teste prático oficial: "If the average viewer can clearly tell that content on your channel differs from video to video, it's fine to monetize." Google Support +2 Os revisores do YouTube analisam o tema principal, os vídeos mais vistos, os vídeos mais recentes, a maior proporção de watch time, metadados e a seção "Sobre" do canal. Google Supportgoogle A violação pode remover monetização do canal inteiro, não apenas de vídeos individuais. Factually +2
IA e TTS são permitidos, mas sob escrutínio crescente
Não existe proibição de conteúdo gerado por IA no YouTube. WP SEO AI A plataforma declarou oficialmente: "We welcome creators using AI tools to enhance their storytelling, and channels that use AI in their content remain eligible to monetize." Onewrk +3 A distinção fundamental é entre IA como ferramenta (permitido) e IA como processo criativo completo (não monetizável). Onewrk +3
Para TTS/text-to-speech, não há política explícita proibindo vozes sintéticas. Toolify Canais usando TTS de alta qualidade com scripts originais, boa edição e conteúdo variado mantêm monetização. Resemble AISubscribr O risco está em TTS robótico + imagens genéricas + nenhum valor original — este combo é o alvo principal de enforcement. Quasa +2
Desde março de 2024, a divulgação de conteúdo gerado por IA é obrigatória para conteúdo realista que possa enganar espectadores. Influencer Marketing Hub +3 A ferramenta de disclosure está no YouTube Studio durante o upload. Subscribr Para a maioria dos vídeos, o label aparece na descrição expandida; para tópicos sensíveis (saúde, notícias, eleições, finanças), aparece de forma mais proeminente no próprio player. YouTube Blog +2 Não divulgar pode resultar em remoção do conteúdo ou suspensão do YPP. Google SupportTsfhr Importante: o label de IA não limita audiência nem monetização — é puramente sobre transparência. Conteúdo claramente não-realista (animações, fantasia) e usos produtivos (geração de scripts, legendas automáticas) não requerem divulgação. YouTube Blog +2
Canais de história monetizados provam que o formato funciona — com movimento
Todos os grandes canais de história/documentário monetizados compartilham uma característica: adicionam movimento às imagens. O espectro vai de extremamente simples a elaborado.
OverSimplified (9.4M inscritos, 1.36B views, apenas 33 vídeos) usa animações em After Effects com personagens simples e humor. X Média de 37.1 milhões de views por vídeo, X faturamento estimado de $5M+ em ads. Publica menos de 4 vídeos/ano, X mas cada upload é um evento. Estratégia única: publica vídeos em pares (Parte 1 + Parte 2 no mesmo dia), com 70% de retenção da Parte 1 para a Parte 2. X
Kings and Generals (3.98M inscritos, 958M views) usa mapas animados com movimentos de tropas, gráficos detalhados e narração profissional. InflutrendEducators Technology Publica ~6 vídeos/semana, com vídeos de 32+ minutos. PLAYBOARD Faturamento estimado de $22K/mês. Influtrend Patrocinado por NordVPN, MagellanTV, Manscaped. YouTubers.meThoughtLeaders
The Infographics Show (15.3M inscritos, 6B+ views) ThoughtLeaders usa infográficos 2D animados com templates do Envato Elements + After Effects. Publica ~12 vídeos/semana. ThoughtLeaders Faturamento estimado de $4.41M/ano. Anideos
Historia Civilis (~1.5M inscritos) representa o mínimo viável: quadrados coloridos representando exércitos e entidades políticas sobre mapas simples, com narração excepcional. Uploads muito raros. Tasty Edits Totalmente monetizado. Prova que mesmo visuais extremamente simples funcionam se a pesquisa e narração são excepcionais.
Canais demonetizados incluem: StoriezTold (flaggeado por conteúdo repetitivo IA + slideshow idêntico em todos os vídeos), True Crime Case Files (83K inscritos, removido por 150+ vídeos de histórias geradas por IA apresentadas como fato), Knolli e The Armchair Historian (demonetizado por símbolos históricos como suásticas, mesmo em contexto educacional). ThoughtLeadersTasty Edits
O requisito mínimo de originalidade na prática
O YouTube não define um percentual quantitativo de originalidade. Os critérios são qualitativos:

Conteúdo deve ser "original and authentic" — criação própria OU conteúdo emprestado "changed significantly" Simplified +2
Não pode ser "mass-produced or repetitive" googleGoogle Support
Deve ser feito "for the enjoyment or education of viewers, rather than for the sole purpose of getting views" googleGoogle Support
Para conteúdo reusado, deve adicionar "significant original commentary" OU "substantive modifications" OU "educational or entertainment value" Google Supportgoogle

Na prática, canais monetizados com sucesso fazem: visuais customizados (animações, mapas animados, gráficos originais — não apenas download de imagens do Google); narração com personalidade, opinião e análise (não leitura de Wikipedia); variação real entre vídeos; e qualidade de produção que evidencie esforço humano.

PARTE 2: O ALGORITMO DO YOUTUBE EM 2024-2025
Cinco sistemas de recomendação, não um algoritmo único
O YouTube opera com 5 sistemas de recomendação separados: Home (browse features), Suggested Videos (up next), Search, Subscriptions e Shorts. Cada um usa sinais primários diferentes. posteverywhere Mais de 70% de todo o watch time no YouTube vem de recomendações algorítmicas, não de search ou subscriptions. PostEverywhereScriptstorm
O Home feed personaliza baseado em interesses amplos e histórico de visualização de longo prazo (semanas/meses). PostEverywhereposteverywhere CTR orgânico médio no Home: 3.5%. Focus Digitalfocus-digital Favorece conteúdo com engajamento forte nas primeiras 24-48 horas. OnewrkAMW
Suggested Videos (sidebar/next-up) é contextual — baseado na sessão de visualização atual. Vista SocialStranger Show Agrupa conteúdo em tópicos que espectadores comumente assistem em sequência. Bufferposteverywhere CTR orgânico médio: 9.5%. Focus Digitalfocus-digital O sinal crítico aqui é session time. AIR Media-Tech
YouTube Search é o único sistema baseado em intenção. Prioriza relevância primeiro (keywords em título, descrição, tags, transcrição automática), depois satisfação. Solveig Multimediaposteverywhere CTR orgânico médio: 12.5%. Focus Digitalfocus-digital Canais pequenos podem ranquear acima de grandes se satisfizerem melhor a query. vidiq +2 A IA do YouTube agora analisa conteúdo falado — dizer a keyword-alvo nos primeiros 60 segundos ajuda o ranking.
Em late 2025, o algoritmo de Shorts foi totalmente desacoplado do long-form. Performance ruim em Shorts não arrasta mais a performance de vídeos longos e vice-versa. Outlierkit
As métricas que o algoritmo realmente prioriza
O YouTube processou uma mudança paradigmática em 2024-2025: de watch time bruto para "satisfaction-weighted discovery." vidIQ +2 Todd Beaupré (Senior Director of Growth & Discovery do YouTube) Beehiiv confirmou que o sistema agora usa surveys de satisfação (milhões enviados mensalmente), análise de sentimento de comentários, retenção de longo prazo (se o espectador volta ao YouTube), e supressão de feedback negativo ("Not interested" carrega peso significativo). Marketing Agent BlogSocialBee
A hierarquia de sinais, do mais ao menos impactante:
Watch time e retenção continuam no topo, mas agora são contextuais — "better to hold 70% for 6 minutes than 30% for 10." Marketing Agent Blog CTR (click-through rate) é o sinal de primeira impressão — thumbnail e título determinam se o vídeo entra no funil. Satisfaction surveys são o novo peso pesado desde 2025 Marketing Agent Blog — modelos de ML preveem satisfação para todos os usuários. vidIQPostEverywhere Session time mede se o vídeo leva a mais tempo na plataforma. vidIQ Engajamento (likes, comments, shares, playlist additions) importa, iMark InfoTech com comentários valendo significativamente mais que likes. Canais que respondem a 50+ comentários nas primeiras 2 horas veem 15-20% mais alcance.
Beaupré confirmou que não existe fórmula única: "We've enabled the system to learn that different factors can have different importance in different contexts. Watch time may be more important in television versus mobile, or in podcasts as opposed to music." PostEverywhereSocialBee
Benchmarks concretos de CTR e retenção
CTR (Click-Through Rate):
Faixa CTRClassificaçãoNotasAbaixo de 2%BaixoThumbnail/título precisam de revisão imediata2-4%Abaixo da médiaPrecisa melhorar4-6%Médio/BomMédia da indústria6-8%Bom/Forte8-10%Muito forteYouTube testa com audiência mais ampla10%+ExcepcionalGeralmente nichos menores com audiência fiel
CTR por nicho (Focus Digital, 2025): Gaming 8.5%, Saúde 8.0%, Tech Reviews 7.5%, Educação/Tutoriais 4.5%. EvenDigitfocus-digital O CTR naturalmente cai conforme as impressões aumentam Thumbnail Test — um vídeo pode começar com 12% CTR para audiência quente (inscritos) e cair para 5% quando atinge audiências frias. Awesomecreatoracademy Um vídeo com 5% CTR em 100K impressões supera 15% CTR em 10K impressões. Ytshark
Retenção de audiência (Retention Rabbit, 10.000+ vídeos analisados):
Duração do vídeoRetenção médiaRetenção "boa"Menos de 5 min~40%50-70%5-10 min31.5%50%+10+ min20-30%40-60%25+ min—40% já é forte; 50% é excepcional
55% dos espectadores são perdidos no primeiro minuto. Retentionrabbit Apenas 16.8% dos vídeos superam 50% de retenção. Retentionrabbit Vídeos educacionais how-to têm a maior retenção média: OpusClip 42.1%. retentionrabbit Para canais de documentário com vídeos de 25-40 minutos, 30-40% de retenção representa engajamento substancial — MrBeast observou que "é mais difícil ter 70% de retenção em um vídeo de 30 minutos do que ter milhões de views." TechCrunch Canais que melhoram a retenção média em 10 pontos percentuais veem um aumento correlacionado de 25%+ em impressões. Retentionrabbit
Como funcionam as primeiras 24-48 horas
O processo de teste funciona em fases. Primeiro, o YouTube mostra o vídeo a um grupo de teste pequeno Metricool — tipicamente inscritos ou espectadores com gostos similares. vidIQ O algoritmo monitora CTR + retenção inicial. Se fortes: sinal de qualidade → expansão para audiências mais amplas. Metricool Este processo leva tipicamente 3-5 dias para completar o "teste da água." Lenos
Dados específicos: vídeos que geram 50% do engajamento total dentro de 24 horas tipicamente alcançam 3x mais alcance orgânico. Swydo Engajamento forte nos primeiros 30 minutos gera boosts promocionais significativos. AMW Se o CTR ficar abaixo da média do canal após 48 horas, a recomendação é trocar a thumbnail. vidIQ Publicar 1-2 horas antes do horário de pico da audiência pode melhorar a performance das primeiras 48 horas em 20-35%. Dataslayer
O YouTube não para de testar após 48 horas. Continua testando com novas audiências por meses ou anos Lenos — conteúdo evergreen (como história/documentário) pode ter uma "segunda vida" com milhares de novas impressões quando o algoritmo descobre uma nova audiência ressonante. Hootsuite Blog
Vídeos longos têm vantagem crescente, especialmente na TV
Todd Beaupré no VidCon: "Make the video as long as it needs to be." TechCrunch O algoritmo não favorece duração por si só — favorece satisfação. Porém, na prática, conteúdo long-form (30+ min) viu 35-45% mais promoção em 2025, Hashmeta impulsionado pelo crescimento de Connected TV PostEverywhere (+14% ano/ano), AIR Media-Tech onde espectadores preferem conteúdo longo. Long-form responde por mais de 70% do watch time total do YouTube. Mediacube
A sessão média para vídeos longos é 3-4x maior que para Shorts. Mediacube Porém, a regra de ouro permanece: "shorter videos with high retention beat longer videos with low retention." vidiq +2 O YouTube agora prioriza "Valued Watch Time" — 50% de retenção significa que o conteúdo entregou sua promessa. Gank BlogOutlierkit
Para canais de documentário/história, isso é uma vantagem natural: o formato encoraja watch times longos, e o conteúdo educacional tem a maior retenção média por nicho (42.1%). Flarecutretentionrabbit
Session time e o efeito cascata nas recomendações
Session time mede quanto tempo o espectador fica no YouTube após assistir seu vídeo. Se seu vídeo consistentemente leva a mais tempo assistindo (seu conteúdo ou de outros), você é recompensado. vidIQAIR Media-Tech O padrão ideal: "espectador assiste seu vídeo, engaja, depois assiste 2-3 vídeos a mais." vidiqvidIQ
Playlists são a ferramenta mais subestimada aqui. ScriptstormHootsuite Blog End screens estratégicos podem elevar session time em 10-30%. Um caso documentado: canal edutainment com série de 4 partes usando end screens sequenciais viu session time subir de 9:12 para 14:05, com tráfego Suggested dobrando em 10 dias. Scriptstorm Outro canal que reestruturou end screens viu session time crescer 30% em 6 semanas. AIR Media-Tech
Canais novos não são penalizados — e têm boost ativo em 2025
Beaupré confirmou que o algoritmo avalia cada vídeo individualmente, não faz média do desempenho do canal. Search Engine Journal Não existe "penalty box." Search Engine Journal Em 2025, o YouTube está ativamente promovendo canais com menos de 500 inscritos, colocando-os ao lado de criadores estabelecidos no Home feed. vidiq +2 Novos canais recebem um "welcome gift" — teste elevado nas primeiras semanas. Loomly Se os sinais iniciais são fortes (CTR + retenção), o YouTube testa com audiências mais amplas em dias em vez de semanas. vidiq +2
O que importa para canais novos: cada vídeo recebe teste com uma audiência-semente independente do tamanho do canal. PostEverywhere O fator determinante é como essa audiência responde — não a contagem de inscritos. PostEverywhere Foco em nicho é crítico: trocar de nicho confunde o algoritmo sobre para quem recomendar. LoomlyvidIQ

PARTE 3: OTIMIZAÇÃO PRÁTICA PARA O PIPELINE DE PRODUÇÃO
SEO do YouTube em 2025 opera com IA semântica
O YouTube agora usa Google Gemini para analisar tom, elementos visuais, thumbnails, transcrições e significado semântico — não apenas títulos e tags. dataslayerSolveig Multimedia Isso torna mais difícil "hackear" o sistema com keyword stuffing.
Para títulos: front-load keywords nos primeiros 40-60 caracteres; manter abaixo de 70 caracteres; promessas específicas superam perguntas vagas (dobram o CTR). Para descrições: keywords nas primeiras 1-2 frases; incluir timestamps/chapters Solveig Multimedia (4-8 capítulos); transcrição na descrição ajuda classificação de tópicos. Para tags: primeira tag = keyword exata; incluir variações; 10-15 tags no máximo; tags são agora um fator menor, mas úteis para nichos específicos.
A thumbnail é a alavanca mais poderosa de CTR
90% dos vídeos top-performing usam thumbnails customizadas. Awisee Faces com emoção forte aumentam CTR em 20-30%. Awiseeposteverywhere Textos com menos de 12 caracteres superam designs carregados de texto. Blog Para canais de história/documentário sem rostos: cenas de ação dramáticas, mapas com tensão visual, momentos históricos-chave com alto contraste são as melhores práticas. O YouTube oferece "Test & Compare" — até 3 thumbnails por vídeo testadas com audiência real. Usevisualsposteverywhere
O recurso mais contraintuitivo: thumbnails com expressões tristes aparecem em apenas 1.8% dos vídeos mas alcançam a média mais alta de views: 2.3M. Blog A Netflix confirma: thumbnails perdem eficácia com mais de 3 rostos. Shopify
Os primeiros 30 segundos determinam o destino do vídeo
Se mais de 40% dos espectadores saem nos primeiros 30 segundos, o hook não está funcionando. OpusClip Acima de 70% de retenção aos 30 segundos é sólido; SocialRails acima de 80% é excepcional. 1of10 Estratégias comprovadas: cold open (começar no momento mais compelling, criar mistério); entregar valor nos primeiros 15 segundos; Retentionrabbit eliminar intros ou manter abaixo de 5 segundos; pattern interrupt aos 25-35 segundos (mudança de música, efeito sonoro, mudança visual). Vídeos com proposta de valor clara nos primeiros 15 segundos têm 18% mais retenção no mark de 1 minuto. retentionrabbit
Frequência de upload: qualidade supera quantidade, mas consistência importa
Dados do vidIQ (5 milhões de canais analisados): canais postando 12+ vezes/mês crescem views 8x mais rápido PostEverywhere e inscritos 3x mais rápido que canais postando menos de 1x/mês. PostEverywherevidIQ Porém, Todd Beaupré diz que o algoritmo não faz fator de frequência de upload diretamente — espectadores é que esperam consistência. Metricool
Para canais de documentário/história, a frequência ótima depende da qualidade: OverSimplified publica menos de 4 vídeos/ano X com 37M views cada; X Kings and Generals publica 6/semana PLAYBOARD com ~500K views cada. Ambos modelos funcionam. A recomendação geral: 1-2 vídeos longos/semana + 2-5 Shorts mantém consistência sem sacrificar qualidade. Tirar pausas não mata o canal — o algoritmo recompensa padrões de engajamento de longo prazo. Search Engine Journal
Estratégias específicas para canais de história e documentário
Os canais mais bem-sucedidos do nicho compartilham práticas que se alinham com o algoritmo:
Formato em série é crítico. O algoritmo de 2025 dá prioridade a séries. Criar 2-3 séries repetíveis com branding reconhecível. vidIQ +2 A estratégia de upload pareado do OverSimplified (Parte 1 + Parte 2 no mesmo dia) gera session time massivo com 70% de carryover entre partes. X
Identidade visual consistente. Toda thumbnail deve ser instantaneamente reconhecível como do canal. Shopify Kurzgesagt, OverSimplified e Kings and Generals todas alcançam isso — o espectador identifica o conteúdo antes de ler o título.
Storytelling sobre information dumps. O sucesso do OverSimplified vem de tornar tópicos complexos acessíveis através de humor. Async +2 Conteúdo sobre "história de pessoas comuns" alcança 30-40% mais engajamento que história política/militar. Subscribr
Conteúdo evergreen é vantagem. História não expira. O algoritmo de 2025 ativamente ressurfa conteúdo antigo quando tópicos se tornam relevantes. Hootsuite BlogDataslayer RPM do nicho educação/história: tipicamente $6-$12, com audiências Tier-1 (EUA, UK, Canadá, Austrália) rendendo mais. Flarecut
Animação de estruturas históricas (pirâmides, Machu Picchu) mantém espectadores 40% mais tempo que imagens estáticas. O ratio ideal é 3:1 visual mapping para narração — três cenas visuais distintas para cada ponto narrativo — o que aumenta average view duration em 25-40%. Subscribr
Mudanças recentes que impactam a estratégia em 2025
Várias mudanças significativas: o Home feed reduziu de 6 vídeos long-form por fileira para apenas 2, redirecionando 80% dos slots para Shorts PPC Land — impacto significativo na descoberta de long-form na homepage. Múltiplos criadores reportaram ~30% de queda em views a partir de agosto 2025, com shift de desktop para mobile. PPC LandPPC Land O YouTube integra E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) crescentemente iMark InfoTech — manter-se dentro de um nicho e cobrir tópicos relacionados posiciona o canal como autoridade. HashmetaiMark InfoTech

Conclusão: o modelo viável para produção automatizada
A linha entre conteúdo monetizável e não-monetizável é clara: IA como ferramenta de produção é bem-vinda; IA como substituto total do processo criativo é rejeitada. CineD +3 Para um pipeline automatizado de vídeos de história, o modelo viável exige imagens com movimento real (Ken Burns, animações de mapas, overlays animados, transições cinematográficas — não slideshows estáticos), narração com personalidade e análise original (TTS de alta qualidade com scripts que contenham insights únicos, não leituras de Wikipedia), variação substancial entre vídeos (evitar template idêntico em todos os uploads), TubeBuddy e qualidade visual que evidencie esforço criativo. Subscribr
Os números definem os targets: CTR de 6%+ para o nicho educacional, retenção de 35-40%+ para vídeos de 25+ minutos, hook forte nos primeiros 15 segundos mantendo 70%+ de retenção aos 30 segundos, e formato de série com end screens sequenciais para maximizar session time. O algoritmo não penaliza canais novos PostEverywhereSubscribr — mas recompensa desproporcionalmente conteúdo que gera satisfação genuína, medida agora não apenas por watch time, mas por surveys de satisfação, retorno à plataforma e sentimento nos comentários. Marketing Agent BlogPostEverywhere O conteúdo que sobrevive à política de "Inauthentic Content" e performa bem algoritmicamente é aquele que um espectador humano reconheceria como feito com intenção criativa — não produzido em linha de montagem. CineD +3