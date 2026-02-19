/**
 * Story Generator - Creates 5000-8000 word cinematic narratives from topics.
 * Optimized for YouTube retention (hook framework, pattern interrupts, visual cues).
 * Uses the project's storytelling style and enriches with research.
 */
import { db } from '../../db.js';
import { generateText } from './adapters/llm-adapter.js';
import { getProjectSettings } from './settings-helper.js';

/**
 * Generate a story narrative for a topic.
 * @param {string} topicId
 * @returns {Promise<Object>} Created story row
 */
export async function generateStory(topicId) {
  const pool = db.analytics;

  // Get topic with project info
  const { rows: topics } = await pool.query(
    'SELECT * FROM yt_topics WHERE id = $1',
    [topicId],
  );
  const topic = topics[0];
  if (!topic) throw new Error(`Topic ${topicId} not found`);

  const settings = await getProjectSettings(topic.project_id);

  // Gather context: source content + research
  const sourceContent = await getSourceContent(topic.source_id);
  const research = await getResearchContent(topicId, topic.source_id);

  // Generate story
  const storyText = await callLlmForStory(topic, sourceContent, research, settings);
  const wordCount = storyText.split(/\s+/).length;

  // Check if story meets minimum length, expand if needed
  let finalStory = storyText;
  if (wordCount < 4500) {
    finalStory = await expandStory(storyText, topic, settings);
  }

  const finalWordCount = finalStory.split(/\s+/).length;

  // Upsert story (one story per topic)
  const { rows } = await pool.query(
    `INSERT INTO yt_stories (topic_id, content, word_count, version)
     VALUES ($1, $2, $3, 1)
     ON CONFLICT (topic_id) DO UPDATE
     SET content = $2, word_count = $3, version = yt_stories.version + 1, updated_at = NOW()
     RETURNING *`,
    [topicId, finalStory, finalWordCount],
  );

  // Update topic stage
  await pool.query(
    `UPDATE yt_topics SET pipeline_stage = 'story_created', updated_at = NOW() WHERE id = $1`,
    [topicId],
  );

  return rows[0];
}

/**
 * Edit a story manually (preserves version history).
 */
export async function updateStory(topicId, content) {
  const pool = db.analytics;
  const wordCount = content.split(/\s+/).length;

  const { rows } = await pool.query(
    `UPDATE yt_stories
     SET content = $1, word_count = $2, version = version + 1, updated_at = NOW()
     WHERE topic_id = $3
     RETURNING *`,
    [content, wordCount, topicId],
  );

  if (rows.length === 0) throw new Error(`Story for topic ${topicId} not found`);
  return rows[0];
}

// --- Internal ---

async function getSourceContent(sourceId) {
  if (!sourceId) return '';
  const { rows } = await db.analytics.query(
    'SELECT processed_content, raw_content FROM yt_content_sources WHERE id = $1',
    [sourceId],
  );
  return rows[0]?.processed_content || rows[0]?.raw_content || '';
}

async function getResearchContent(topicId, sourceId) {
  const { rows } = await db.analytics.query(
    `SELECT title, snippet, url FROM yt_research_results
     WHERE (topic_id = $1 OR source_id = $2) AND relevance_score >= 0.5
     ORDER BY relevance_score DESC LIMIT 15`,
    [topicId, sourceId],
  );
  return rows;
}

async function callLlmForStory(topic, sourceContent, research, settings) {
  const style = settings.storytelling_style || 'educational';
  const keyPoints = typeof topic.key_points === 'string'
    ? JSON.parse(topic.key_points)
    : (topic.key_points || []);

  const researchBlock = research.length > 0
    ? `\n\nResearch findings:\n${research.map(r => `- ${r.title} (${r.url}): ${r.snippet}`).join('\n')}`
    : '';

  const result = await generateText({
    provider: settings.llm_provider || 'anthropic',
    apiKey: settings.llm_api_key,
    model: settings.llm_model,
    systemPrompt: `Voce e um roteirista de elite para YouTube, especialista em retenção de audiencia e storytelling cinematografico. Toda a narrativa DEVE ser escrita em Portugues Brasileiro (pt-BR).

Estilo narrativo: ${style}
Meta: 5000-8000 palavras
Idioma obrigatorio: Portugues do Brasil (pt-BR)

=== FRAMEWORK DE ABERTURA (primeiras 200 palavras) ===
55% dos espectadores abandonam no primeiro minuto. Sua abertura DEVE usar UMA destas tecnicas:

TECNICA 1 - COLD OPEN: Comece no momento mais dramatico/surpreendente da historia, depois volte no tempo. Ex: "O homem olha para o abismo. Daqui a 30 segundos, ele vai tomar a decisao que mudaria o destino de um imperio inteiro."

TECNICA 2 - ESTATISTICA CHOCANTE: Abra com um dado que quebra expectativas. Ex: "97% das pessoas que tentaram isso morreram. Os 3% que sobreviveram descobriram algo que a ciencia nao consegue explicar."

TECNICA 3 - PERGUNTA PROVOCATIVA: Uma pergunta que desafia a sabedoria convencional. Ex: "E se tudo que voce aprendeu sobre [tema] estivesse completamente errado?"

TECNICA 4 - CENARIO IMERSIVO: Coloque o espectador dentro da cena. Ex: "Imagine que voce acorda e percebe que esta trancado num submarino a 400 metros de profundidade. O oxigenio acaba em 6 horas."

Nos primeiros 15 segundos, a PROPOSTA DE VALOR deve estar clara — o espectador precisa saber exatamente POR QUE deve continuar assistindo.

=== ESTRUTURA NARRATIVA (NAO e um despejo de informacoes) ===
Use arco narrativo classico centrado em PESSOAS:

1. SETUP (10% da historia): Apresente o protagonista e o mundo normal dele. Use detalhes sensoriais concretos — o que a pessoa via, ouvia, sentia. Estabeleca as apostas (o que esta em jogo).

2. TENSAO CRESCENTE (50% da historia): Introduza obstaculos, decisoes dificeis, consequencias inesperadas. Cada secao deve terminar com um micro-gancho que force o espectador a continuar. Alterne entre a perspectiva macro (o grande cenario) e a micro (a experiencia pessoal de individuos).

3. CLIMAX (20% da historia): O momento de maior tensao. Decisoes irreversiveis. Consequencias dramaticas. Use tempo presente para momentos dramaticos: "Ele caminha ate a porta. Suas maos tremem. Ele sabe que nao ha volta."

4. RESOLUCAO (20% da historia): Consequencias, licoes, e conexao com o presente. Amarre TUDO de volta ao gancho inicial, criando circularidade satisfatoria.

IMPORTANTE: Historias centradas em pessoas comuns geram 30-40% mais engajamento do que despejos de informacao politica/militar. SEMPRE ancore a narrativa em individuos reais e suas experiencias.

=== INTERRUPCOES DE PADRAO (a cada 800-1000 palavras) ===
Inclua 2-3 "pattern interrupts" distribuidos ao longo do texto:
- Fato contraintuitivo que contradiz o que acabou de ser dito: "Mas aqui esta o detalhe que ninguem conta..."
- Mudanca subita de perspectiva: zoom do panorama geral para uma historia pessoal intima
- Revelacao surpreendente: "O que ninguem percebeu na epoca era que..."
- Conexao inesperada com algo moderno/cotidiano

=== GATILHOS EMOCIONAIS ===
Cada secao deve ativar pelo menos UM destes gatilhos:
- MEDO: ameaca, perigo iminente, consequencias terriveis
- CURIOSIDADE: misterio, informacao incompleta, "o que aconteceu depois?"
- SURPRESA: revelacao que muda toda a perspectiva
- ADMIRACAO: escala epica, feitos extraordinarios, beleza impossivel
- INJUSTICA: algo errado que precisa ser exposto/corrigido

=== MARCADORES VISUAIS [VISUAL] ===
A cada 100-150 palavras, insira um marcador visual no formato:
[VISUAL: descricao detalhada da cena]

Estas descricoes DEVEM ser DINAMICAS (movimento, acao, transformacao), NAO estaticas:
- BOM: [VISUAL: Camera mergulha do ceu noturno estrelado ate uma fogueira solitaria onde um homem desenha mapas na areia]
- BOM: [VISUAL: Time-lapse da construcao de uma catedral gotica — pedras subindo, arcos se formando, vitrais sendo instalados ao longo de decadas]
- RUIM: [VISUAL: Foto de um castelo] (estatico demais)
- RUIM: [VISUAL: Mapa da Europa] (generico demais)

A proporcao ideal e 3 cenas visuais para cada ponto narrativo — isso aumenta o tempo medio de visualizacao em 25-40%.

=== TECNICAS DE ESCRITA ===
- Use segunda pessoa ("voce") para engajar diretamente o espectador
- Varie o comprimento das frases: curtas e impactantes misturadas com explicativas mais longas
- Use analogias modernas para explicar conceitos complexos
- Inclua dados especificos e numeros concretos (nao generalize)
- Tenha OPINIAO e ANALISE propria — nao use tom neutro estilo Wikipedia
- Mostre insight criativo genuino e analise original (politica do YouTube contra conteudo inautentico pune producao em massa sem esforco criativo)

=== FECHAMENTO ===
O encerramento DEVE:
- Retomar o gancho da abertura, fechando o circulo narrativo
- Oferecer uma reflexao ou pergunta que fica na mente do espectador
- NAO usar frases cliche como "e essa e a historia de..."

=== ANTI-PADROES PROIBIDOS ===
NUNCA faca nenhum destes:
- "Neste video vamos falar sobre..." ou "Hoje vamos discutir..."
- "E importante notar que...", "Vale a pena mencionar...", "Como todos sabemos..."
- Repetir o mesmo ponto com palavras diferentes
- Listar fatos sem contexto narrativo (isso NAO e uma redacao escolar)
- Usar tom neutro/enciclopedico — tenha personalidade e posicao
- Usar filler generico para encher palavra
- Escrever menos que 5000 palavras`,
    userPrompt: `Video topic: ${topic.title}
Angle: ${topic.angle || 'general'}
Target audience: ${topic.target_audience || 'general'}
Key points to cover:\n${keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Source material:\n${sourceContent.substring(0, 12000)}${researchBlock}`,
    maxTokens: 12000,
    temperature: 0.85,
  });

  return result.text;
}

async function expandStory(story, topic, settings) {
  const result = await generateText({
    provider: settings.llm_provider || 'anthropic',
    apiKey: settings.llm_api_key,
    model: settings.llm_model,
    systemPrompt: `Voce e um roteirista de elite expandindo uma narrativa de YouTube que esta curta demais. Escreva TUDO em Portugues Brasileiro (pt-BR). Meta: pelo menos 5500 palavras no total.

Retorne a historia COMPLETA expandida (nao apenas as adicoes).

=== O QUE ADICIONAR ===

1. HISTORIAS PESSOAIS E ANEDOTAS: Insira pelo menos 2-3 micro-narrativas de pessoas reais ou personagens concretos afetados pelos eventos. Descreva suas experiencias sensoriais — o que viram, ouviram, sentiram. Historias de pessoas comuns geram 30-40% mais engajamento.

2. DADOS E ESTATISTICAS ESPECIFICAS: Substitua afirmacoes vagas por numeros concretos. Em vez de "muitas pessoas morreram", use "estima-se que 47.000 pessoas perderam a vida em apenas 72 horas". Dados especificos ancoram credibilidade.

3. DETALHES SENSORIAIS: Adicione descricoes vividas em momentos-chave — a textura da pedra, o cheiro de fumaca, o som de passos no corredor vazio, o frio cortante do vento. Estes detalhes criam imersao cinematografica.

4. MOMENTOS EMOCIONAIS: Expanda os pontos de maior tensao emocional. Desacelere nesses momentos. Use frases curtas. Crie suspense. Deixe o leitor sentir o peso de cada decisao.

5. MARCADORES VISUAIS: Adicione marcadores [VISUAL: descricao dinamica da cena] a cada 100-150 palavras onde estiverem faltando. Descreva cenas com MOVIMENTO e TRANSFORMACAO, nao imagens estaticas.

6. PATTERN INTERRUPTS: Se a historia nao tiver pelo menos 2 interrupcoes de padrao (fatos contraintuitivos, mudancas de perspectiva, revelacoes surpreendentes), adicione-os em pontos estrategicos.

7. TRANSICOES NARRATIVAS: Melhore as transicoes entre secoes — cada paragrafo deve ter um micro-gancho que puxa para o proximo.

=== O QUE NAO FAZER ===
- NAO mude o tom, estilo ou voz narrativa
- NAO adicione introducoes genericas ou filler
- NAO repita pontos que ja existem
- NAO quebre a estrutura do arco narrativo existente
- NAO remova marcadores [VISUAL] que ja existem`,
    userPrompt: `Topic: ${topic.title}\n\nCurrent story (too short):\n${story}`,
    maxTokens: 12000,
    temperature: 0.85,
  });

  return result.text;
}
