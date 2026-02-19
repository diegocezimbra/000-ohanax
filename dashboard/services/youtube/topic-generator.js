/**
 * Topic Generator - Generates video topics from processed sources using LLM.
 *
 * Features:
 * - Series-first approach (YouTube 2025 algorithm prioritizes series/playlists)
 * - Strategic angle framework with 5 proven content angles
 * - Evergreen content priority with SEO keyword generation
 * - All output in Portuguese (pt-BR)
 * - Optimized titles: front-loaded keywords, max 60 chars, emotional power words
 * - hookIdea, searchKeywords, seriesName, seriesOrder in output
 */
import { db } from '../../db.js';
import { generateText, parseJsonResponse } from './adapters/llm-adapter.js';
import { getProjectSettings } from './settings-helper.js';

// --- Strategic Angle Framework ---

const CONTENT_ANGLES = [
  {
    id: 'hidden_truth',
    label: 'O que realmente aconteceu',
    description: 'Revelacao de verdade oculta. Perspectiva contraintuitiva que desafia a narrativa popular.',
  },
  {
    id: 'person_story',
    label: 'A pessoa que mudou tudo',
    description: 'Historia centrada em uma pessoa fascinante. Narrativa emocional com arco dramatico claro.',
  },
  {
    id: 'curiosity_gap',
    label: 'X coisas que ninguem te conta sobre...',
    description: 'Lista de fatos surpreendentes. Curiosidade que forca o clique e a retencao.',
  },
  {
    id: 'superlative',
    label: 'A maior/pior/mais [evento] da historia',
    description: 'Superlativo dramatico. Escala e magnitude que impressionam o espectador.',
  },
  {
    id: 'consequence',
    label: 'Como [evento] mudou o mundo para sempre',
    description: 'Impacto e consequencia. Mostra como um evento alterou o curso da historia.',
  },
];

/**
 * Generate topics from a processed source.
 * @param {string} projectId
 * @param {string} sourceId
 * @returns {Promise<Array<Object>>} Created topic rows
 */
export async function generateTopicsFromSource(projectId, sourceId) {
  const pool = db.analytics;
  const settings = await getProjectSettings(projectId);

  const source = await fetchSource(pool, sourceId, projectId);
  const content = source.processed_content || source.raw_content;
  if (!content) throw new Error('Source has no content to generate topics from');

  const researchContext = await fetchResearchContext(pool, sourceId);
  const topics = await callLlmForTopics(content, researchContext, settings);

  return saveTopics(pool, projectId, sourceId, topics);
}

/**
 * Regenerate topics for a source (delete old drafts, create new).
 */
export async function regenerateTopics(projectId, sourceId) {
  const pool = db.analytics;

  await pool.query(
    `DELETE FROM yt_topics
     WHERE project_id = $1 AND source_id = $2
     AND status = 'draft' AND pipeline_stage = 'topics_generated'`,
    [projectId, sourceId],
  );

  return generateTopicsFromSource(projectId, sourceId);
}

// --- Data Fetching ---

async function fetchSource(pool, sourceId, projectId) {
  const { rows } = await pool.query(
    'SELECT * FROM yt_content_sources WHERE id = $1 AND project_id = $2',
    [sourceId, projectId],
  );
  if (rows.length === 0) throw new Error(`Source ${sourceId} not found`);
  return rows[0];
}

async function fetchResearchContext(pool, sourceId) {
  const { rows } = await pool.query(
    'SELECT title, snippet FROM yt_research_results WHERE source_id = $1 ORDER BY relevance_score DESC LIMIT 10',
    [sourceId],
  );

  if (rows.length === 0) return '';

  return `\n\nPesquisa complementar:\n${rows.map(r => `- ${r.title}: ${r.snippet}`).join('\n')}`;
}

// --- LLM Topic Generation ---

async function callLlmForTopics(content, researchContext, settings) {
  const storytellingStyle = settings.storytelling_style || 'documental-narrativo';
  const targetLength = settings.target_video_length || '10-15 minutos';
  const anglesDescription = formatAnglesForPrompt();

  const result = await generateText({
    provider: settings.llm_provider || 'anthropic',
    apiKey: settings.llm_api_key,
    model: settings.llm_model,
    systemPrompt: buildSystemPrompt(storytellingStyle, targetLength, anglesDescription),
    userPrompt: `Material fonte:\n${content.substring(0, 15000)}${researchContext}`,
    maxTokens: 6000,
    temperature: 0.8,
    responseFormat: 'json',
  });

  const parsed = parseJsonResponse(result.text);
  const rawTopics = extractTopicsArray(parsed);

  return sanitizeTopics(rawTopics, targetLength);
}

function buildSystemPrompt(storytellingStyle, targetLength, anglesDescription) {
  return `Voce e um estrategista de conteudo para YouTube especializado em ${storytellingStyle}.
Seu objetivo e gerar topicos de video que MAXIMIZEM retencao, cliques e crescimento do canal.

IDIOMA: Todo o conteudo DEVE ser em Portugues do Brasil (pt-BR).

## ABORDAGEM: SERIES PRIMEIRO

O algoritmo do YouTube em 2025 prioriza series e playlists. Organize os topicos em 2-3 SERIES de 3-5 videos cada.
Cada serie deve ter um fio condutor tematico que faca o espectador querer assistir o proximo video.

Exemplos de series:
- "Misterios Nao Resolvidos da Historia" (3 episodios)
- "As Maiores Fraudes do Seculo" (4 episodios)
- "Segredos que Governos Esconderam" (3 episodios)

## ANGULOS ESTRATEGICOS OBRIGATORIOS

Cada topico DEVE usar um destes angulos comprovados:
${anglesDescription}

## REGRAS PARA TITULOS (CRITICO)

1. Maximo 60 caracteres (aparece melhor na UI do YouTube)
2. Palavras-chave principais nos PRIMEIROS 40 caracteres
3. Use palavras de poder emocional: chocante, incrivel, secreto, revelado, proibido, misterioso, assustador, impossivel, verdadeiro, escondido
4. NAO use clickbait falso - o conteudo deve entregar o que o titulo promete
5. Formatos que funcionam:
   - "O Segredo [adjetivo] que [consequencia]"
   - "A Verdade Proibida sobre [tema]"
   - "Por que [evento surpreendente] Aconteceu"
   - "[Numero] Fatos Chocantes sobre [tema]"

## PRIORIDADE: CONTEUDO EVERGREEN

Priorize topicos que sejam pesquisaveis o ano inteiro (historia nao expira).
Evite eventos datados ou tendencias temporarias.
Pense: "Alguem pesquisaria isso daqui a 2 anos?"

## FORMATO DE SAIDA

Para cada topico, retorne:
- title: Titulo otimizado (max 60 chars, pt-BR)
- angle: Qual angulo estrategico foi usado (ID do angulo)
- angleDescription: Breve descricao do angulo especifico aplicado
- targetAudience: Publico-alvo especifico
- estimatedDuration: Duracao alvo (deve caber em "${targetLength}")
- richnessScore: 1-10 (quanta profundidade de conteudo esta disponivel)
- keyPoints: Array de 4-8 pontos principais de discussao
- seriesName: Nome da serie a que este topico pertence
- seriesOrder: Posicao na serie (1, 2, 3...)
- searchKeywords: Array de 3-5 palavras-chave SEO que pessoas pesquisariam
- hookIdea: Conceito de gancho em uma frase para thumbnail/abertura

Gere entre 8 e 15 topicos organizados em series.

Retorne um JSON com a estrutura: { "series": [...], "topics": [...] }
Onde cada item de "series" tem: { "name": "...", "theme": "...", "videoCount": N }
E cada item de "topics" segue o formato acima.`;
}

function formatAnglesForPrompt() {
  return CONTENT_ANGLES
    .map((a, i) => `${i + 1}. "${a.label}" (${a.id}): ${a.description}`)
    .join('\n');
}

// --- Topic Parsing & Sanitization ---

function extractTopicsArray(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (parsed.topics && Array.isArray(parsed.topics)) return parsed.topics;
  if (parsed.series && Array.isArray(parsed.series)) {
    // Some LLMs nest topics inside series objects
    const allTopics = [];
    for (const series of parsed.series) {
      if (series.topics && Array.isArray(series.topics)) {
        for (const topic of series.topics) {
          allTopics.push({ ...topic, seriesName: topic.seriesName || series.name });
        }
      }
    }
    if (allTopics.length > 0) return allTopics;
  }
  return [];
}

function sanitizeTopics(rawTopics, targetLength) {
  return rawTopics
    .filter(t => t.title && t.keyPoints)
    .map(t => ({
      title: sanitizeTitle(String(t.title)),
      angle: String(t.angle || 'hidden_truth').substring(0, 100),
      angleDescription: String(t.angleDescription || t.angle || '').substring(0, 500),
      targetAudience: String(t.targetAudience || 'Publico geral').substring(0, 200),
      estimatedDuration: String(t.estimatedDuration || targetLength),
      richnessScore: clampScore(t.richnessScore),
      keyPoints: sanitizeKeyPoints(t.keyPoints),
      seriesName: String(t.seriesName || '').substring(0, 200),
      seriesOrder: Number(t.seriesOrder) || 0,
      searchKeywords: sanitizeSearchKeywords(t.searchKeywords),
      hookIdea: String(t.hookIdea || '').substring(0, 300),
    }));
}

function sanitizeTitle(title) {
  // Enforce max 60 characters; truncate at last full word
  let cleaned = title.substring(0, 60);
  if (title.length > 60) {
    const lastSpace = cleaned.lastIndexOf(' ');
    if (lastSpace > 30) {
      cleaned = cleaned.substring(0, lastSpace);
    }
  }
  return cleaned.trim();
}

function clampScore(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return 5;
  return Math.min(10, Math.max(1, num));
}

function sanitizeKeyPoints(keyPoints) {
  if (!Array.isArray(keyPoints)) return [];
  return keyPoints
    .map(String)
    .filter(Boolean)
    .slice(0, 8);
}

function sanitizeSearchKeywords(keywords) {
  if (!Array.isArray(keywords)) return [];
  return keywords
    .map(k => String(k).toLowerCase().trim())
    .filter(k => k.length > 0)
    .slice(0, 5);
}

// --- Database Persistence ---

async function saveTopics(pool, projectId, sourceId, topics) {
  const savedTopics = [];

  for (const topic of topics) {
    const { rows } = await pool.query(
      `INSERT INTO yt_topics (
        project_id, source_id, title, angle, target_audience,
        estimated_duration, richness_score, key_points,
        series_name, series_order, search_keywords, hook_idea,
        pipeline_stage, status
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'topics_generated', 'draft')
       RETURNING *`,
      [
        projectId,
        sourceId,
        topic.title,
        topic.angle,
        topic.targetAudience,
        topic.estimatedDuration,
        topic.richnessScore,
        JSON.stringify(topic.keyPoints),
        topic.seriesName || null,
        topic.seriesOrder || 0,
        JSON.stringify(topic.searchKeywords),
        topic.hookIdea || null,
      ],
    );
    savedTopics.push(rows[0]);
  }

  return savedTopics;
}
