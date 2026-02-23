/**
 * Centralized Prompt Library - ALL AI prompts in one file.
 *
 * Every prompt dynamically incorporates user-configured settings:
 * - storytelling_style (educational, documentary, dramatic, tutorial, entertainment)
 * - narrative_template (custom 5-act structure)
 * - emotional_triggers (comma-separated psychological triggers)
 * - narration_tone (conversational, formal, dramatic, humorous, etc.)
 * - title_template (custom title format pattern)
 * - target_video_length / target_duration_minutes
 * - language (pt-BR, en, es)
 * - image_style (for visual direction guidance)
 *
 * Usage: import { buildStoryPrompt } from './prompts.js';
 *        const { system, user } = buildStoryPrompt(topic, settings, sourceContent, research);
 */

// ============================================================
// STYLE DESCRIPTORS - Maps setting values to rich descriptions
// ============================================================

const STYLE_DESCRIPTORS = {
  'pt-BR': {
    educational: {
      voice: 'professor apaixonado explicando para alunos curiosos',
      pacing: 'Construa conceitos em camadas, do simples ao complexo. Use analogias do cotidiano para ancorar ideias abstratas.',
      structure: 'Cada segmento deve ensinar algo concreto. O espectador deve sentir que ficou mais inteligente a cada minuto.',
      openingTechnique: 'Abra com um paradoxo ou misconception popular que sera desmentida ao longo do video.',
    },
    documentary: {
      voice: 'documentarista investigativo revelando uma historia que o mundo precisa conhecer',
      pacing: 'Construa a narrativa como um documentario da Netflix — camadas de revelacao, entrevistas implicitas, evidencias empilhadas.',
      structure: 'Alterne entre macro (contexto historico/social) e micro (experiencia individual de pessoas reais). Cada fato deve servir a narrativa, nao o contrario.',
      openingTechnique: 'Abra com um momento cinematografico: coloque o espectador no meio de uma cena dramatica antes de explicar como chegamos ali.',
    },
    dramatic: {
      voice: 'contador de historias cinematografico que faz cada momento pulsar com tensao e emocao',
      pacing: 'Ritmo de montanha-russa emocional: construa tensao, entregue revelacao, respire, construa de novo mais intenso.',
      structure: 'Arco dramatico completo com protagonista, antagonista, conflito, climax e resolucao. Cada cena deve ter stakes claros.',
      openingTechnique: 'COLD OPEN obrigatorio: comece no momento mais dramatico da historia inteira, depois volte no tempo com "72 horas antes..."',
    },
    tutorial: {
      voice: 'mentor experiente que simplifica o complexo com empatia e exemplos praticos',
      pacing: 'Passo a passo claro com demonstracoes visuais. Antecipe duvidas do espectador e responda antes que ele pause o video.',
      structure: 'Problema → Por que importa → Solucao passo a passo → Resultado → Proximos passos. Cada etapa com exemplo concreto.',
      openingTechnique: 'Mostre o resultado final primeiro (o "antes e depois"), depois ensine como chegar la.',
    },
    entertainment: {
      voice: 'showman carismatico que transforma qualquer assunto em espetaculo irresistivel',
      pacing: 'Energia alta constante. Humor, surpresas, referencias da cultura pop. Nunca mais que 30 segundos sem um momento "wow".',
      structure: 'Entretenimento primeiro, informacao como bonus. Rankings, desafios, comparacoes absurdas, reacoes genuinas.',
      openingTechnique: 'Abra com a coisa mais absurda, chocante ou engraçada do video inteiro. Se o espectador nao reagir em 5 segundos, voce falhou.',
    },
  },
  en: {
    educational: {
      voice: 'passionate professor explaining to curious students',
      pacing: 'Build concepts in layers, from simple to complex. Use everyday analogies to anchor abstract ideas.',
      structure: 'Each segment must teach something concrete. The viewer should feel smarter with every minute.',
      openingTechnique: 'Open with a paradox or popular misconception that will be debunked throughout the video.',
    },
    documentary: {
      voice: 'investigative documentarian revealing a story the world needs to know',
      pacing: 'Build the narrative like a Netflix documentary — layers of revelation, implied interviews, stacked evidence.',
      structure: 'Alternate between macro (historical/social context) and micro (individual experience of real people). Every fact must serve the narrative, not the other way around.',
      openingTechnique: 'Open with a cinematic moment: place the viewer in the middle of a dramatic scene before explaining how we got there.',
    },
    dramatic: {
      voice: 'cinematic storyteller who makes every moment pulse with tension and emotion',
      pacing: 'Emotional roller-coaster pacing: build tension, deliver revelation, breathe, build again even more intense.',
      structure: 'Complete dramatic arc with protagonist, antagonist, conflict, climax, and resolution. Every scene must have clear stakes.',
      openingTechnique: 'Mandatory COLD OPEN: start at the most dramatic moment of the entire story, then jump back in time with "72 hours earlier..."',
    },
    tutorial: {
      voice: 'experienced mentor who simplifies the complex with empathy and practical examples',
      pacing: 'Clear step-by-step with visual demonstrations. Anticipate viewer questions and answer them before they pause the video.',
      structure: 'Problem → Why it matters → Step-by-step solution → Result → Next steps. Each step with a concrete example.',
      openingTechnique: 'Show the end result first (the "before and after"), then teach how to get there.',
    },
    entertainment: {
      voice: 'charismatic showman who transforms any subject into an irresistible spectacle',
      pacing: 'Constant high energy. Humor, surprises, pop culture references. Never more than 30 seconds without a "wow" moment.',
      structure: 'Entertainment first, information as a bonus. Rankings, challenges, absurd comparisons, genuine reactions.',
      openingTechnique: 'Open with the most absurd, shocking, or hilarious thing in the entire video. If the viewer doesn\'t react in 5 seconds, you\'ve failed.',
    },
  },
};

const TONE_DESCRIPTORS = {
  'pt-BR': {
    conversational: 'Tom de conversa entre amigos. Use "voce", "a gente", girias naturais. Como se estivesse no bar explicando algo fascinante para um amigo.',
    formal: 'Tom profissional e autoritativo, mas nunca robotico. Linguagem precisa, dados rigorosos, credibilidade maxima. Inspire confianca como um especialista respeitado.',
    dramatic: 'Tom intenso e cinematografico. Frases curtas de impacto. Pausas dramaticas. Construa tensao como um thriller. Cada palavra deve ter peso.',
    humorous: 'Tom leve com humor inteligente. Piadas contextuais, ironias sutis, analogias absurdas que grudam na memoria. Entretenha enquanto informa.',
    inspirational: 'Tom motivacional e empoderador. Fale como se acreditasse profundamente no potencial do espectador. Historias de superacao, licoes de vida, chamadas a acao.',
    documentary: 'Tom de narrador de documentario premium. Objetivo mas envolvente. Deixe os fatos falarem, mas guie a interpretacao com entonacao estrategica.',
    suspense: 'Tom misterioso e tenso. Reveale informacoes em conta-gotas. Crie atmosfera de "algo esta errado". Use perguntas retoricas que criam ansiedade positiva.',
    epic: 'Tom grandioso e majestoso. Escala epica. Palavras que evocam magnitude: colossal, extraordinario, sem precedentes. Como narrar a queda de um imperio.',
  },
  en: {
    conversational: 'Friendly conversational tone. Use "you", "we", natural slang. Like explaining something fascinating to a friend at a bar.',
    formal: 'Professional and authoritative tone, but never robotic. Precise language, rigorous data, maximum credibility. Inspire trust like a respected expert.',
    dramatic: 'Intense cinematic tone. Short impactful sentences. Dramatic pauses. Build tension like a thriller. Every word must carry weight.',
    humorous: 'Light tone with intelligent humor. Contextual jokes, subtle irony, absurd analogies that stick in memory. Entertain while informing.',
    inspirational: 'Motivational and empowering tone. Speak as if you deeply believe in the viewer\'s potential. Stories of overcoming, life lessons, calls to action.',
    documentary: 'Premium documentary narrator tone. Objective yet engaging. Let the facts speak, but guide interpretation with strategic intonation.',
    suspense: 'Mysterious and tense tone. Release information in drips. Create an atmosphere of "something is wrong". Use rhetorical questions that create positive anxiety.',
    epic: 'Grand and majestic tone. Epic scale. Words that evoke magnitude: colossal, extraordinary, unprecedented. Like narrating the fall of an empire.',
  },
};

// ============================================================
// TRIGGER SYSTEM - Maps trigger keys to prompt instructions
// ============================================================

const TRIGGER_INSTRUCTIONS = {
  'pt-BR': {
    patriotismo: {
      instruction: 'PATRIOTISMO: Conecte a narrativa com orgulho nacional/cultural. Mostre como o tema impacta a identidade do povo. Use frases como "nosso pais", "nossa historia".',
      technique: 'Insira momentos onde o espectador sinta orgulho de sua origem ou cultura.',
    },
    underdog: {
      instruction: 'UNDERDOG: Posicione o protagonista como subestimado. Mostre a arrogancia de quem duvidou. O espectador deve torcer desesperadamente pelo azarao.',
      technique: 'Crie contraste entre a expectativa de fracasso e o resultado surpreendente.',
    },
    vinganca: {
      instruction: 'VINGANCA/JUSTICA POETICA: Construa a injustica primeiro (o espectador precisa sentir raiva). Depois entregue a vinganca ou justica de forma satisfatoria e inesperada.',
      technique: 'A resolucao deve ser proporcional a injustica — quanto maior o crime, mais doce a vinganca.',
    },
    curiosidade: {
      instruction: 'CURIOSIDADE: Plante perguntas nao respondidas a cada 60-90 segundos. Use knowledge gaps: revele parte da informacao e segure a parte crucial para depois.',
      technique: 'Frases-gatilho: "Mas o que ninguem sabia era...", "E aqui a historia fica bizarra...", "Existe um detalhe que muda tudo..."',
    },
    raiva_justa: {
      instruction: 'RAIVA JUSTA: Apresente uma situacao clara de injustica, corrupcao ou abuso de poder. O espectador deve sentir indignacao visceral e querer que alguem pague.',
      technique: 'Mostre as vitimas primeiro (humanize), depois revele o responsavel e a magnitude do dano.',
    },
    surpresa: {
      instruction: 'SURPRESA/CHOQUE: Prepare revelacoes que virem a perspectiva do espectador em 180 graus. O que ele achava que sabia esta completamente errado.',
      technique: 'Setup-Payoff: construa uma narrativa que parece ir numa direcao, depois revele que a realidade e completamente diferente.',
    },
    identificacao: {
      instruction: 'IDENTIFICACAO PESSOAL: O espectador deve se ver no protagonista. Use cenarios, problemas e emocoes universais que qualquer pessoa ja viveu.',
      technique: 'Descreva sensacoes fisicas e emocionais especificas: "aquele frio na barriga", "o coracao disparando", "a sensacao de que tudo vai dar errado".',
    },
    urgencia: {
      instruction: 'URGENCIA/FOMO: Crie a sensacao de que o espectador PRECISA saber disso agora. Deadlines, countdowns, janelas de oportunidade fechando.',
      technique: 'Frases-gatilho: "Enquanto voce assiste isso...", "Em poucos meses isso vai mudar tudo...", "A maioria das pessoas so vai descobrir quando for tarde demais..."',
    },
    esperanca: {
      instruction: 'ESPERANCA: Mostre que ha luz no fim do tunel. Mesmo nos momentos mais sombrios da narrativa, plante sementes de que algo bom esta por vir.',
      technique: 'Contraste escuridao com momentos de humanidade, generosidade ou descoberta que restauram a fe.',
    },
    indignacao: {
      instruction: 'INDIGNACAO: Exponha algo que esta errado no mundo e que PRECISA ser falado. O espectador deve sentir que finalmente alguem teve coragem de dizer a verdade.',
      technique: 'Use dados concretos que chocam. "Enquanto X acontecia, Y lucrava bilhoes." Mostre a hipocrisia com evidencias.',
    },
    nostalgia: {
      instruction: 'NOSTALGIA: Conecte o tema com memorias afetivas. Epocas, lugares, sensacoes que o espectador viveu ou gostaria de ter vivido.',
      technique: 'Descricoes sensoriais de epocas passadas: sons, cheiros, cores, objetos que ativam memoria emocional.',
    },
    empoderamento: {
      instruction: 'EMPODERAMENTO: O espectador deve terminar o video sentindo que PODE fazer algo. Conhecimento e poder — mostre como essa informacao transforma a vida dele.',
      technique: 'Termine segmentos com "e agora que voce sabe disso..." ou "com essa informacao, voce nunca mais vai..."',
    },
  },
  en: {
    patriotismo: {
      instruction: 'PATRIOTISM: Connect the narrative with national/cultural pride. Show how the topic impacts people\'s identity. Use phrases like "our country", "our history".',
      technique: 'Insert moments where the viewer feels pride in their origin or culture.',
    },
    underdog: {
      instruction: 'UNDERDOG: Position the protagonist as underestimated. Show the arrogance of doubters. The viewer must desperately root for the underdog.',
      technique: 'Create contrast between the expectation of failure and the surprising result.',
    },
    vinganca: {
      instruction: 'REVENGE/POETIC JUSTICE: Build the injustice first (the viewer needs to feel anger). Then deliver revenge or justice in a satisfying and unexpected way.',
      technique: 'The resolution must be proportional to the injustice — the bigger the crime, the sweeter the revenge.',
    },
    curiosidade: {
      instruction: 'CURIOSITY: Plant unanswered questions every 60-90 seconds. Use knowledge gaps: reveal part of the information and hold the crucial part for later.',
      technique: 'Trigger phrases: "But what nobody knew was...", "And here the story gets bizarre...", "There\'s one detail that changes everything..."',
    },
    raiva_justa: {
      instruction: 'RIGHTEOUS ANGER: Present a clear situation of injustice, corruption, or abuse of power. The viewer must feel visceral outrage and want someone to pay.',
      technique: 'Show the victims first (humanize), then reveal who\'s responsible and the magnitude of the damage.',
    },
    surpresa: {
      instruction: 'SURPRISE/SHOCK: Prepare revelations that flip the viewer\'s perspective 180 degrees. What they thought they knew is completely wrong.',
      technique: 'Setup-Payoff: build a narrative that seems to go one direction, then reveal reality is completely different.',
    },
    identificacao: {
      instruction: 'PERSONAL IDENTIFICATION: The viewer must see themselves in the protagonist. Use universal scenarios, problems, and emotions everyone has experienced.',
      technique: 'Describe specific physical and emotional sensations: "that pit in your stomach", "your heart racing", "the feeling that everything is about to go wrong".',
    },
    urgencia: {
      instruction: 'URGENCY/FOMO: Create the feeling that the viewer NEEDS to know this now. Deadlines, countdowns, closing windows of opportunity.',
      technique: 'Trigger phrases: "While you\'re watching this...", "In a few months this will change everything...", "Most people won\'t find out until it\'s too late..."',
    },
    esperanca: {
      instruction: 'HOPE: Show there\'s light at the end of the tunnel. Even in the darkest moments, plant seeds that something good is coming.',
      technique: 'Contrast darkness with moments of humanity, generosity, or discovery that restore faith.',
    },
    indignacao: {
      instruction: 'OUTRAGE: Expose something wrong with the world that NEEDS to be spoken about. The viewer must feel someone finally had the courage to tell the truth.',
      technique: 'Use concrete shocking data. "While X was happening, Y was profiting billions." Show hypocrisy with evidence.',
    },
    nostalgia: {
      instruction: 'NOSTALGIA: Connect the topic with affective memories. Eras, places, sensations the viewer lived or wished they had lived.',
      technique: 'Sensory descriptions of past eras: sounds, smells, colors, objects that activate emotional memory.',
    },
    empoderamento: {
      instruction: 'EMPOWERMENT: The viewer must finish the video feeling they CAN do something. Knowledge is power — show how this information transforms their life.',
      technique: 'End segments with "and now that you know this..." or "with this information, you\'ll never again..."',
    },
  },
};

// ============================================================
// 1. TOPIC GENERATOR PROMPT
// ============================================================

/**
 * Build the topic generation prompt incorporating user settings.
 * @param {string} sourceContent - Processed source material
 * @param {string} researchContext - Research findings
 * @param {Object} settings - Project settings from DB
 * @param {Array} contentAngles - Available content angles
 * @returns {{ system: string, user: string }}
 */
export function buildTopicPrompt(sourceContent, researchContext, settings, contentAngles) {
  const style = settings.storytelling_style || 'dramatic';
  const language = settings.language || 'en';
  const styleDesc = getStyleDesc(language, style);
  const toneDesc = getToneDesc(language, settings.narration_tone || 'dramatic');
  const targetLength = settings.target_video_length || '30-45 minutes';
  const titleTemplate = settings.title_template || '';
  const triggers = parseTriggers(settings.emotional_triggers);
  const triggersBlock = buildTriggersBlock(triggers, language);
  const isPt = language === 'pt-BR';

  const anglesDescription = contentAngles
    .map((a, i) => `${i + 1}. "${a.label}" (${a.id}): ${a.description}`)
    .join('\n');

  const system = `You are an ELITE YouTube content strategist, specialist in explosive channel growth.
You deeply understand YouTube's 2025 algorithm: Watch Time, Session Time, CTR, and Audience Retention are the metrics that matter.

CHANNEL PROFILE:
- Storytelling style: ${style} — ${styleDesc.voice}
- Narration tone: ${toneDesc}
- Target duration: ${targetLength}
- Language: ${langLabel(language)}

CRITICAL: ALL output (titles, descriptions, keyPoints, hookIdea, everything) MUST be written in ${langLabel(language)}. Do NOT mix languages.

## APPROACH: SERIES FIRST (YouTube 2025)

The algorithm prioritizes SERIES and PLAYLISTS because they increase Session Time. Organize topics into 2-3 thematic SERIES of 3-5 videos.
Each series MUST have narrative progression — the viewer needs to feel they MUST watch the next one.

Series strategies that work:
- Chronological: "The Rise and Fall of [X]" (Part 1, 2, 3)
- Thematic: "Secrets of [Niche]" (independent but connected episodes)
- Investigative: "The [X] Case" (progressive revelations)
- Ranking: "[N] Greatest [X] in History" (each video deepens one item)

## MANDATORY STRATEGIC ANGLES

Each topic MUST use one of these proven high-CTR angles:
${anglesDescription}

## OPTIMIZED TITLE SYSTEM

${titleTemplate ? `USER-CONFIGURED TITLE TEMPLATE (use as base, adapt creatively):
"${titleTemplate}"

Adapt this template for each topic keeping the structure but varying the words.` : ''}

INVIOLABLE RULES for titles:
1. Maximum 60 characters (truncates on mobile after that)
2. Primary keyword in the FIRST 40 characters (YouTube SEO weight)
3. EXACTLY ONE emotional power word per title${isPt ? ': CHOCANTE, REVELADO, SECRETO, PROIBIDO, INCRIVEL, VERDADE, MISTERIOSO, PERIGOSO, URGENTE, IMPOSSIVEL' : ': SHOCKING, REVEALED, SECRET, FORBIDDEN, INCREDIBLE, TRUTH, MYSTERIOUS, DANGEROUS, URGENT, IMPOSSIBLE'}
4. Create CURIOSITY GAP: the title must create a question in the viewer's mind that only the video answers
5. ZERO fake clickbait — the content MUST deliver what the title promises
6. Proven CTR formats (8%+ average CTR):
   ${isPt ? `- "A Verdade [adjetivo] Sobre [tema] que [consequencia]"
   - "[Entidade] Escondeu [revelacao] por [periodo]"
   - "Por Que [evento contraintuitivo] [verbo dramatico]"` : `- "The [adjective] Truth About [topic] that [consequence]"
   - "[Entity] Hid [revelation] for [period]"
   - "Why [counterintuitive event] [dramatic verb]"`}

## MANDATORY PSYCHOLOGICAL TRIGGERS

${triggersBlock ? `The user configured these psychological triggers for the channel. ALL topics must incorporate at least 2 of these:

${triggersBlock}

For each topic, indicate which triggers were applied in the "appliedTriggers" field.` : 'Apply curiosity, surprise, and urgency triggers naturally in each topic.'}

## EVERGREEN CONTENT (MAXIMUM PRIORITY)

Prioritize topics searchable year-round. History, science, mysteries, and biographies don't expire.
Mental test: "Would someone search for this in 2 years?" If not, discard.

## OUTPUT FORMAT

For each topic, return:
- title: Optimized title (max 60 chars, in ${langLabel(language)})
- angle: ID of the strategic angle used
- angleDescription: How the angle was specifically applied
- targetAudience: Specific and detailed target audience
- estimatedDuration: Target duration (${targetLength})
- richnessScore: 1-10 (how much content depth is available from the source)
- keyPoints: Array of 5-8 main discussion points (each with enough substance for 2-3 minutes of video)
- seriesName: Series name (in ${langLabel(language)})
- seriesOrder: Position in series (1, 2, 3...)
- searchKeywords: Array of 5-8 long-tail SEO keywords people actually search for
- hookIdea: Hook concept in 1-2 sentences for thumbnail + video opening
- appliedTriggers: Array of psychological triggers applied to this topic
- thumbnailConcept: Visual description of thumbnail concept (facial expression, text overlay, colors)

Generate between 8 and 15 topics organized in 2-3 series.

Return JSON: { "series": [{ "name": "...", "theme": "...", "videoCount": N }], "topics": [...] }`;

  const user = `Source material:\n${sourceContent.substring(0, 15000)}${researchContext}`;

  return { system, user };
}

// ============================================================
// 2. STORY GENERATOR PROMPT
// ============================================================

/**
 * Build the story generation prompt incorporating ALL user settings.
 * @param {Object} topic - Topic row from DB
 * @param {string} sourceContent - Processed source material
 * @param {Array} research - Research rows
 * @param {Object} settings - Project settings from DB
 * @returns {{ system: string, user: string }}
 */
export function buildStoryPrompt(topic, sourceContent, research, settings) {
  const style = settings.storytelling_style || 'dramatic';
  const language = settings.language || 'en';
  const styleDesc = getStyleDesc(language, style);
  const tone = settings.narration_tone || 'dramatic';
  const toneDesc = getToneDesc(language, tone);
  const narrativeTemplate = settings.narrative_template || '';
  const triggers = parseTriggers(settings.emotional_triggers);
  const triggersBlock = buildTriggersBlock(triggers, language);
  const targetMinutes = settings.target_duration_minutes || 30;
  const targetWords = targetMinutes * 280;
  const minWords = Math.round(targetWords * 0.85);
  const imageStyle = settings.image_style || 'cinematic, photorealistic';

  const keyPoints = typeof topic.key_points === 'string'
    ? JSON.parse(topic.key_points)
    : (topic.key_points || []);

  const researchBlock = research.length > 0
    ? `\n\nSupplementary research (use as factual base, cite specific data):\n${research.map(r => `- ${r.title} (${r.url}): ${r.snippet}`).join('\n')}`
    : '';

  const system = `You are an elite YouTube screenwriter with a proven track record of viral videos (10M+ views). You master cinematic storytelling, audience psychology, and the YouTube 2025 algorithm.

CHANNEL NARRATIVE IDENTITY:
- Style: ${style.toUpperCase()} — ${styleDesc.voice}
- Pacing: ${styleDesc.pacing}
- Structure: ${styleDesc.structure}
- Tone: ${toneDesc}
- Mandatory language: ${langLabel(language)}

CRITICAL: Write the ENTIRE story in ${langLabel(language)}. Do NOT mix languages. Every sentence, every word must be in ${langLabel(language)}.

PRODUCTION TARGET:
- Target video duration: ${targetMinutes} minutes
- Required words: ${minWords}-${targetWords} words (${Math.round(targetWords / 280)} min at ~280 words/minute narration)
- Visual style: ${imageStyle}

${narrativeTemplate ? `=== CHANNEL NARRATIVE TEMPLATE (FOLLOW THIS STRUCTURE) ===

The user configured this narrative template. Your story MUST follow this structure:

${narrativeTemplate}

Adapt the content to the template above, keeping the defined act/phase structure.` : `=== DEFAULT NARRATIVE STRUCTURE ===

${styleDesc.openingTechnique}

NARRATIVE ARC (5 acts centered on PEOPLE):

ACT 1 — HOOK (0:00 to 0:30, ~150 words):
55% of viewers abandon in the first minute. ${styleDesc.openingTechnique}
In the first 15 seconds, the VALUE PROPOSITION must be crystal clear — the viewer needs to know WHY to stay.
Use one of these proven techniques:
- COLD OPEN: Start at the most dramatic moment, then jump back in time
- IMPOSSIBLE STATISTIC: A fact that breaks the viewer's reality
- IMMERSIVE SCENARIO: Place the viewer INSIDE the scene ("Imagine you...")
- FORBIDDEN QUESTION: Question something no one dares to question

ACT 2 — CONTEXT AND SETUP (first 15%, ~${Math.round(targetWords * 0.15)} words):
Introduce the protagonist, their world, and what's at stake. Use concrete sensory details.
Establish the STAKES: what happens if the protagonist fails? Why should the viewer care?

ACT 3 — RISING TENSION (50% of text, ~${Math.round(targetWords * 0.50)} words):
Growing obstacles, impossible decisions, unexpected consequences. Each segment ends with a micro-hook.
Alternate MACRO (big picture) with MICRO (individual experience).
Every 800-1000 words, insert PATTERN INTERRUPT (counterintuitive fact, perspective shift, revelation).

ACT 4 — CLIMAX (20%, ~${Math.round(targetWords * 0.20)} words):
The moment of maximum tension. Irreversible decisions. Use PRESENT TENSE for immediacy.
"He walks. His hands tremble. He knows there's no turning back."

ACT 5 — RESOLUTION (15%, ~${Math.round(targetWords * 0.15)} words):
Consequences, lessons, connection to the present. TIE EVERYTHING back to the opening hook — satisfying circularity.`}

=== PSYCHOLOGICAL TRIGGERS (INCORPORATE IN NARRATIVE) ===

${triggersBlock ? `The following psychological triggers were selected for this channel. Every 2-3 minutes of narration (~600-800 words), AT LEAST ONE trigger must be activated:

${triggersBlock}

Distribute triggers throughout the narrative naturally. Don't force them all in the same section.` : `Activate at least one emotional trigger per section:
- CURIOSITY: mystery, incomplete information, "what happened next?"
- SURPRISE: revelation that flips perspective 180 degrees
- FEAR: imminent threat, terrible consequences
- AWE: epic scale, extraordinary feats
- INJUSTICE: something wrong that needs to be exposed`}

=== VISUAL MARKERS [VISUAL] ===

Every 100-150 words, insert a visual marker:
[VISUAL: detailed and DYNAMIC scene description]

Channel visual style: ${imageStyle}

RULES for visual markers:
- ALWAYS describe MOVEMENT, ACTION, TRANSFORMATION — never static images
- Use cinematic direction language: "camera dives", "slow zoom", "time-lapse", "hard cut to"
- 3 visual scenes for each narrative point (increases watch time by 25-40%)
- GOOD: [VISUAL: Aerial camera diving from the night sky to a solitary campfire where a man draws maps in the sand with a stick]
- GOOD: [VISUAL: Accelerated time-lapse of a cathedral being built — stones piling up, arches taking shape, colored stained glass appearing over decades in 5 seconds]
- BAD: [VISUAL: Photo of a castle] — NEVER do this

=== ADVANCED WRITING TECHNIQUES ===

1. VARIED RHYTHM: Alternate short impactful sentences with long explanatory ones. "He ran. Ran like never before. His legs burned, his chest ached, every breath was a stab — but he knew stopping meant death."
2. SECOND PERSON: Use "you" to pull the viewer into the narrative
3. MODERN ANALOGIES: Explain complex concepts with everyday comparisons
4. CONCRETE DATA: Specific numbers anchor credibility. "47,000 dead in 72 hours" > "many deaths"
5. OPINION AND ANALYSIS: Take a position. Wikipedia tone is FORBIDDEN. Show genuine creative insight
6. SHOW DON'T TELL: Describe scenes instead of explaining emotions. "His hands trembled as he held the letter" > "He was nervous"

=== CLOSING (CRITICAL) ===

- EXPLICITLY revisit the opening hook, closing the circle
- Offer a reflection or question that hammers in the viewer's mind for days
- FORBIDDEN: "And that's the story of...", "I hope you enjoyed", "Until next time"

=== FORBIDDEN ANTI-PATTERNS (ZERO TOLERANCE) ===

NEVER write any of these phrases:
- "In this video we're going to talk about..." / "Today we'll discuss..."
- "It's important to note that..." / "It's worth mentioning..." / "As we all know..."
- "Without further ado..." / "Let's get straight to the point..."
- "Before we start, subscribe..."
- Repeating the same point with different words (filler)
- Listing facts without narrative context
- Neutral/encyclopedic tone — have PERSONALITY and POSITION
- Generic filler to pad word count
- Writing fewer than ${minWords} words (UNACCEPTABLE)`;

  const user = `Video topic: ${topic.title}
Narrative angle: ${topic.angle || 'general'}
Target audience: ${topic.target_audience || 'general'}
${topic.hook_idea ? `Hook concept: ${topic.hook_idea}` : ''}
${topic.series_name ? `Series: ${topic.series_name} (episode ${topic.series_order || 1})` : ''}

Key points to cover:\n${keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Source material:\n${sourceContent.substring(0, 12000)}${researchBlock}`;

  return { system, user };
}

// ============================================================
// 3. STORY EXPANSION PROMPT
// ============================================================

/**
 * Build prompt for expanding a story that's too short.
 */
export function buildStoryExpansionPrompt(story, topic, settings) {
  const language = settings.language || 'en';
  const tone = settings.narration_tone || 'dramatic';
  const toneDesc = getToneDesc(language, tone);
  const targetMinutes = settings.target_duration_minutes || 30;
  const targetWords = targetMinutes * 280;
  const triggers = parseTriggers(settings.emotional_triggers);
  const triggersBlock = buildTriggersBlock(triggers, language);
  const imageStyle = settings.image_style || 'cinematic, photorealistic';

  const system = `You are an elite screenwriter expanding a YouTube narrative that is TOO SHORT to reach the target duration.

PARAMETERS:
- Tone: ${toneDesc}
- Language: ${langLabel(language)}
- Target: at least ${targetWords} words (needed for a ${targetMinutes}+ minute video)
- Visual style: ${imageStyle}

CRITICAL: Write EVERYTHING in ${langLabel(language)}. Do NOT mix languages.

Return the COMPLETE expanded story (NOT just the additions). The expanded story must flow as if it was written all at once.

=== WHAT TO ADD ===

1. PERSONAL STORIES AND ANECDOTES: Insert 2-3 micro-narratives of real people or concrete characters. Describe sensory experiences — what they saw, heard, felt. Stories of ordinary people generate 30-40% more engagement.

2. CONCRETE DATA AND STATISTICS: Replace "many" with real numbers. "An estimated 47,000 people lost their lives in 72 hours" > "many died".

3. SENSORY DETAILS: Stone texture, smell of smoke, sound of footsteps, cutting wind cold. Cinematic immersion.

4. EMOTIONAL MOMENTS: Slow down at maximum tension points. Short sentences. Suspense. The reader must FEEL the weight of each decision.

5. VISUAL MARKERS: [VISUAL: DYNAMIC description] every 100-150 words. Style: ${imageStyle}. MOVEMENT and TRANSFORMATION, never static images.

6. PATTERN INTERRUPTS: At least 3 throughout the text — counterintuitive facts, perspective shifts, surprising revelations.

7. NARRATIVE TRANSITIONS: Each paragraph must have a micro-hook pulling to the next.

${triggersBlock ? `8. PSYCHOLOGICAL TRIGGERS: Incorporate these triggers in expanded sections:\n${triggersBlock}` : ''}

=== FORBIDDEN ===
- Do NOT change existing tone, style, or narrative voice
- Do NOT add generic introductions or filler
- Do NOT repeat existing points
- Do NOT break the narrative arc
- Do NOT remove existing [VISUAL] markers`;

  const user = `Topic: ${topic.title}\n\nCurrent story (too short, needs expansion to ${targetWords}+ words):\n${story}`;

  return { system, user };
}

// ============================================================
// 4. SCRIPT GENERATOR PROMPT
// ============================================================

/**
 * Build the script generation prompt incorporating user settings.
 */
export function buildScriptPrompt(storyContent, topic, settings) {
  const style = settings.storytelling_style || 'dramatic';
  const language = settings.language || 'en';
  const styleDesc = getStyleDesc(language, style);
  const tone = settings.narration_tone || 'dramatic';
  const toneDesc = getToneDesc(language, tone);
  const targetMinutes = settings.target_duration_minutes || 30;
  const triggers = parseTriggers(settings.emotional_triggers);
  const triggersBlock = buildTriggersBlock(triggers, language);
  const imageStyle = settings.image_style || 'cinematic, photorealistic';

  const system = `You are an elite YouTube screenplay writer who specializes in MAXIMUM RETENTION scripts. Your scripts consistently achieve 70%+ retention at 30 seconds and 50%+ average view duration on ${targetMinutes}+ minute videos. You understand YouTube's 2025 algorithm deeply: watch time, session time, and click-through rate are everything.

CHANNEL IDENTITY:
- Storytelling style: ${style} — ${styleDesc.voice}
- Narration tone: ${toneDesc}
- Visual aesthetic: ${imageStyle}
- Target duration: ${targetMinutes}-${targetMinutes + 10} minutes
- Language: ${langLabel(language)}

CRITICAL: ALL narration text MUST be written in ${langLabel(language)}. Do NOT mix languages.

Your job: convert a narrative into a segmented video script optimized for the YouTube algorithm, incorporating the channel's unique voice and psychological triggers.

Return ONLY valid JSON in this exact structure:
{
  "segments": [
    {
      "type": "hook|intro|main|example|data|transition|climax|conclusion|cta",
      "narrationText": "Exact words the narrator will say",
      "visualDirection": "Precise visual and camera direction",
      "durationSeconds": number,
      "emotionalBeat": "Which emotion this segment targets",
      "notes": "Optional production notes"
    }
  ],
  "chapters": [
    { "title": "Keyword-rich chapter name", "startSegment": 0 }
  ],
  "totalDuration": estimated total seconds
}

=== SEGMENT STRUCTURE RULES ===

1. HOOK SEGMENT (first segment, 15-25 seconds, type: "hook")
   - ${styleDesc.openingTechnique}
   - The narrator MUST say the main topic keyword aloud within the first two sentences (YouTube AI transcription for search ranking).
   - End with KNOWLEDGE GAP: tease a shocking revelation that forces continued watching.
   - Visual direction: HIGH ENERGY. 3-4 different visuals in 15 seconds, dramatic close-ups, bold text overlays, cinematic movement. Style: ${imageStyle}.
   - Target: 80%+ retention at 30-second mark.

2. INTRO SEGMENT (25-50 seconds, type: "intro")
   - Brief context AFTER hook grabbed attention.
   - Explicit value promise: ${language === 'pt-BR' ? '"Se voce ficar ate o final, vai descobrir [specific valuable thing]."' : '"If you stay until the end, you\'ll discover [specific valuable thing]."'}
   - PATTERN INTERRUPT at the 25-35 second mark (critical drop-off point): music change, dramatic visual shift, tonal change.
   - Tone: ${toneDesc}

3. MAIN CONTENT SEGMENTS (bulk of the video, type: "main", "example", "data", or "transition")
   - Create 25-40 main segments, each 30-60 seconds of narration (100-180 words each).
   - EVERY segment starts with a MINI-HOOK. Never ${language === 'pt-BR' ? '"E entao...", "Alem disso...", "O proximo ponto..."' : '"And then...", "Furthermore...", "The next point..."'}
   - Every 3rd segment: PATTERN INTERRUPT (surprising fact, perspective shift, rhetorical question, dramatic tonal shift).
   - EMOTIONAL PEAKS every 2-3 minutes. Flat energy = death.
   - BRIDGING PHRASES: ${language === 'pt-BR' ? '"Mas isso nao foi nada comparado ao que veio depois...", "E aqui a historia fica realmente interessante..."' : '"But that was nothing compared to what came next...", "And here the story gets really interesting..."'}
   - Vary segment lengths: alternate 25-second punchy with 50-second deep-dive segments.
   - TRANSITIONS (type: "transition"): 2-3 per script max, under 15 seconds each. Create anticipation, don't summarize.

${triggersBlock ? `   PSYCHOLOGICAL TRIGGERS (apply throughout main segments):
${triggers.map(t => `   - ${getTriggerInfo(language, t)?.instruction || t}`).join('\n')}` : ''}

4. CLIMAX SEGMENT (type: "climax", 40-60 seconds)
   - MOST dramatic, surprising, emotionally intense moment.
   - Biggest revelation, most shocking data, most unexpected twist.
   - Visual: Most intense visuals of the entire script. Slow-motion, dramatic zoom-ins, impactful text overlays. Style: ${imageStyle}.

5. CONCLUSION SEGMENT (type: "conclusion", 30-45 seconds)
   - CIRCULAR STORYTELLING: Tie back to the opening hook. ${language === 'pt-BR' ? '"Lembra do que eu falei no comeco? Agora voce entende..."' : '"Remember what I said at the beginning? Now you understand..."'}
   - Deliver on the value promise from intro.
   - Leave a thought-provoking final insight the viewer will want to share.

6. CTA SEGMENT (last, 15-20 seconds, type: "cta")
   - TEASE NEXT VIDEO for session time: ${language === 'pt-BR' ? '"No proximo video, vou revelar [intriguing topic]..."' : '"In the next video, I\'ll reveal [intriguing topic]..."'}
   - SPECIFIC comment prompt: ${language === 'pt-BR' ? '"Me conta nos comentarios: [concrete question related to content]?"' : '"Tell me in the comments: [concrete question related to content]?"'}
   - End screen: mention related video.
   - Visual: End screen layout with thumbnail placeholder, subscribe animation, comment prompt.

=== VISUAL DIRECTION RULES (ALL SEGMENTS) ===

Visual aesthetic for this channel: ${imageStyle}

- NEVER static images. ALWAYS MOTION, TRANSFORMATION, ACTION.
- 3:1 VISUAL-TO-NARRATION ratio: 3 visual moments per narration point.
- CAMERA MOVEMENT in every segment: "zoom in slowly", "pan across", "dolly forward", "whip-pan to..."
- PEOPLE DOING THINGS > abstract concepts. "A mother picking up a product, checking the price, putting it back frustrated."
- Specify TRANSITIONS: match cuts, whip pans, fade-to-black, morph effects.
- On-screen TEXT for key stats, quotes, emphasis words (bold, animated, with sound effect).

=== CHAPTER RULES ===

- Exactly 4-8 chapters.
- Titles with SEARCHABLE KEYWORDS. Never "Introducao" or "Conclusao".
- First chapter = hook topic itself.
- Each title compelling enough to click from chapter list.
- Front-load most important keyword in each title.

=== PACING ===

- Target: ${targetMinutes}-${targetMinutes + 10} minutes total.
- First 60 seconds are make-or-break.
- PATTERN INTERRUPT at 25-35 second mark.
- Build toward climax with ESCALATING intensity.
- Never 90+ seconds without engagement trigger.
- For ${targetMinutes}+ minute videos: 2-3 major act breaks with mini-cliffhangers.

=== LANGUAGE ===

- ALL narration in ${langLabel(language)}.
- Tone: ${toneDesc}
- Short punchy sentences mixed with longer ones for rhythm.`;

  const user = `Topic: ${topic.title}
Angle/Hook: ${topic.angle || 'Not specified'}
${topic.hook_idea ? `Hook concept: ${topic.hook_idea}` : ''}
${topic.series_name ? `Series: ${topic.series_name} (episode ${topic.series_order || 1})` : ''}
Target keyword (MUST be spoken aloud in first segment): ${topic.title}

Story to convert into a retention-optimized screenplay:
${storyContent.substring(0, 20000)}`;

  return { system, user };
}

// ============================================================
// 5. YOUTUBE METADATA PROMPT
// ============================================================

/**
 * Build the YouTube metadata (title, description, tags) prompt.
 */
export function buildMetadataPrompt(topic, scriptData, chapterTimestamps, narrationPreview, settings) {
  const titleTemplate = settings.title_template || '';
  const language = settings.language || 'pt-BR';

  const system = `You are a YouTube SEO and metadata specialist. You understand that title and description are the two biggest levers for Click-Through Rate (CTR) and search discovery. Your metadata consistently achieves 8%+ CTR.

Generate YouTube metadata optimized for CTR, search ranking, and session time. Return ONLY valid JSON:
{
  "title": "YouTube video title",
  "description": "Full YouTube description",
  "tags": ["tag1", "tag2", ...]
}

=== TITLE RULES ===

${titleTemplate ? `USER-CONFIGURED TITLE TEMPLATE (adapt creatively for this topic):
"${titleTemplate}"

Use this as a structural guide, replacing placeholders with topic-specific content.` : ''}

- Maximum 60 characters total. Hard limit (YouTube truncates at ~60 chars on mobile).
- FRONT-LOAD the primary keyword in the first 40 characters.
- Use EXACTLY ONE emotional power word: "Chocante", "Revelado", "Secreto", "Proibido", "Incrivel", "Verdade", "Misterioso", "Perigoso", "Urgente", "Impressionante".
- Create CURIOSITY GAP: the viewer must feel they NEED to click.
- Proven CTR structures:
  - "[Keyword]: O Segredo Que Ninguem Te Conta"
  - "[Keyword] - A Verdade Chocante Revelada"
  - "Por Que [Keyword] Vai Mudar Tudo"
  - "O Que [Entity] Escondeu Sobre [Keyword]"
- No ALL CAPS entire title. Capitalize only power word/key phrase.
- No clickbait the video can't deliver on.
- No emojis in title.

=== DESCRIPTION RULES ===

- First 150 characters CRITICAL: contain primary keyword + compelling hook (shown in search preview).
- Structure:
  1. HOOK LINE: Main keyword + reason to watch
  2. BLANK LINE
  3. CHAPTER TIMESTAMPS (use exact timestamps below)
  4. BLANK LINE
  5. CONTENT SUMMARY: 2-3 sentences with secondary keywords
  6. BLANK LINE
  7. 3 HASHTAGS: #PrimaryKeyword #SecondaryKeyword #BroadCategory
  8. END

- 800-1500 characters total. Main keyword 2-3 times naturally.

=== TAGS ===

- First tag = EXACT primary keyword.
- Tags 2-5: Long-tail variations.
- Tags 6-10: Related broader topics.
- Tags 11-15: Trending/complementary keywords.
- 10-15 tags, all lowercase ${langLabel(language)}.

=== LANGUAGE ===
CRITICAL: ALL metadata (title, description, tags) MUST be in ${langLabel(language)}. Do NOT mix languages.`;

  const user = `Primary keyword (front-load in title, first tag): ${topic.title}
Angle: ${topic.angle || 'General'}
${topic.hook_idea ? `Hook concept: ${topic.hook_idea}` : ''}
Chapter timestamps for description:
${chapterTimestamps}
Opening narration (for context): ${narrationPreview}
Total video duration: ${Math.round(scriptData.totalDuration / 60)} minutes`;

  return { system, user };
}

// ============================================================
// 6. SCRIPT ENRICHMENT PROMPT
// ============================================================

/**
 * Build prompt for enriching weak script segments.
 */
export function buildScriptEnrichmentPrompt(topic, weakSegments, settings) {
  const language = settings.language || 'en';
  const tone = settings.narration_tone || 'dramatic';
  const toneDesc = getToneDesc(language, tone);
  const imageStyle = settings.image_style || 'cinematic, photorealistic';
  const triggers = parseTriggers(settings.emotional_triggers);

  const system = `You are a YouTube script enrichment specialist. Your job is to upgrade weak script segments to maximize viewer retention.

Channel tone: ${toneDesc}
Visual style: ${imageStyle}

For each segment provided, return an upgraded version with:
1. RICHER NARRATION (120-180 words): Add emotional hooks, rhetorical questions, vivid storytelling details. Every segment must start with a mini-hook.
2. DETAILED VISUAL DIRECTION: Dynamic moving visuals, camera directions, at least 3 visual moments per segment. Style: ${imageStyle}.
3. ENGAGEMENT TRIGGERS: Each segment needs at least one: surprising fact, direct question, emotional moment, or pattern interrupt.
${triggers.length > 0 ? `4. PSYCHOLOGICAL TRIGGERS: Apply these where appropriate: ${triggers.join(', ')}` : ''}

Return JSON array:
[
  {
    "segmentIndex": number,
    "narrationText": "Enriched narration in ${language}",
    "visualDirection": "Detailed dynamic visual direction"
  }
]

CRITICAL: Write all narration in ${langLabel(language)}. Do NOT mix languages. Tone: ${toneDesc}`;

  const user = `Topic: ${topic.title}\n\nWeak segments to enrich:\n${JSON.stringify(weakSegments)}`;

  return { system, user };
}

// ============================================================
// 7. STORY OUTLINE PROMPT (Chapter-based generation)
// ============================================================

/**
 * Build the outline generation prompt.
 * Returns JSON with ~30-50 chapters, distributed by narrative arc.
 * @param {Object} topic - Topic row from DB
 * @param {string} sourceContent - Processed source material
 * @param {Array} research - Research rows
 * @param {Object} settings - Project settings from DB
 * @returns {{ system: string, user: string }}
 */
export function buildOutlinePrompt(topic, sourceContent, research, settings) {
  const style = settings.storytelling_style || 'dramatic';
  const language = settings.language || 'en';
  const styleDesc = getStyleDesc(language, style);
  const tone = settings.narration_tone || 'dramatic';
  const toneDesc = getToneDesc(language, tone);
  const narrativeTemplate = settings.narrative_template || '';
  const triggers = parseTriggers(settings.emotional_triggers);
  const triggersBlock = buildTriggersBlock(triggers, language);
  const targetMinutes = settings.target_duration_minutes || 30;
  const targetWords = targetMinutes * 280;
  const imageStyle = settings.image_style || 'cinematic, photorealistic';

  const keyPoints = typeof topic.key_points === 'string'
    ? JSON.parse(topic.key_points)
    : (topic.key_points || []);

  const researchBlock = research.length > 0
    ? `\n\nSupplementary research:\n${research.map(r => `- ${r.title}: ${r.snippet}`).join('\n')}`
    : '';

  // Distribute triggers across chapters
  const triggerDistribution = triggers.length > 0
    ? `\nDistribute triggers across chapters. For each chapter, indicate the primary trigger to activate in the "triggerKey" field. Use all: ${triggers.join(', ')}`
    : '';

  const system = `You are an elite narrative architect for YouTube. Your task: create a DETAILED OUTLINE of a complete story divided into 30-50 short chapters.

CHANNEL IDENTITY:
- Style: ${style.toUpperCase()} — ${styleDesc.voice}
- Pacing: ${styleDesc.pacing}
- Structure: ${styleDesc.structure}
- Tone: ${toneDesc}
- Language: ${langLabel(language)}
- Visual style: ${imageStyle}

CRITICAL: ALL chapter titles and contextNotes MUST be written in ${langLabel(language)}. Do NOT mix languages.

PRODUCTION TARGET:
- Target duration: ${targetMinutes} minutes (~${targetWords} total words)
- Each chapter: 200-300 words (~45-65 seconds of narration)
- Total chapters: ${Math.round(targetWords / 250)} (adjust as needed)

${narrativeTemplate ? `=== NARRATIVE TEMPLATE (FOLLOW THIS STRUCTURE) ===
${narrativeTemplate}

Distribute chapters respecting the structure above.` : `=== DISTRIBUTION BY NARRATIVE ARC ===

HOOK (3% = ~${Math.round(targetWords * 0.03)} words, 1-2 chapters):
${styleDesc.openingTechnique}
Opening chapters MUST grab attention immediately.

SETUP/CONTEXT (15% = ~${Math.round(targetWords * 0.15)} words, 5-8 chapters):
Introduce protagonist, world, stakes. Concrete sensory details.

RISING TENSION (50% = ~${Math.round(targetWords * 0.50)} words, 15-25 chapters):
Growing obstacles, impossible decisions. Each chapter ends with micro-hook.
Every 5 chapters: PATTERN INTERRUPT (counterintuitive fact, revelation, perspective shift).

CLIMAX (20% = ~${Math.round(targetWords * 0.20)} words, 6-10 chapters):
Maximum tension. Irreversible decisions. Present tense for immediacy.

RESOLUTION (12% = ~${Math.round(targetWords * 0.12)} words, 4-6 chapters):
Consequences, lessons, connection to the present. Circularity with opening hook.`}

=== PSYCHOLOGICAL TRIGGERS ===

${triggersBlock || 'Distribute curiosity, surprise, fear, and awe triggers across chapters.'}
${triggerDistribution}

=== OUTPUT FORMAT ===

Return ONLY valid JSON:
{
  "totalChapters": number,
  "estimatedTotalWords": number,
  "chapters": [
    {
      "chapterNumber": 1,
      "title": "Evocative chapter title (in ${langLabel(language)})",
      "emotionalBeat": "primary emotion (e.g.: curiosity, tension, shock, awe, fear, hope)",
      "narrativeFunction": "hook|setup|rising_tension|pattern_interrupt|climax|falling_action|resolution",
      "targetWordCount": 250,
      "contextNote": "Brief description of what happens in this chapter (1-2 sentences, in ${langLabel(language)})",
      "visualHint": "Expected visual type (e.g.: emotional close-up, epic landscape, time-lapse, diagram)",
      "triggerKey": "primary psychological trigger for this chapter (or null)"
    }
  ]
}

RULES:
- Minimum 25 chapters, maximum 55
- Each title must be evocative and narrative (NOT generic like "Introduction" or "Context")
- targetWordCount varies: hook/transition chapters can have 150 words, development chapters 300+
- Sum of all targetWordCount must be ~${targetWords} (+/- 10%)
- contextNote must have enough substance to guide chapter writing
- visualHint guides the type of image/video for each chapter`;

  const user = `Topic: ${topic.title}
Angle: ${topic.angle || 'general'}
Target audience: ${topic.target_audience || 'general'}
${topic.hook_idea ? `Hook concept: ${topic.hook_idea}` : ''}
${topic.series_name ? `Series: ${topic.series_name} (episode ${topic.series_order || 1})` : ''}

Key points:\n${keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Source material:\n${sourceContent.substring(0, 12000)}${researchBlock}`;

  return { system, user };
}

// ============================================================
// 8. CHAPTER GENERATION PROMPT (Individual chapter)
// ============================================================

/**
 * Build prompt for generating a single chapter of the story.
 * Includes 4 layers of context for continuity + IMG_PROMPT generation.
 * @param {Object} chapter - Chapter from outline { chapterNumber, title, emotionalBeat, narrativeFunction, targetWordCount, contextNote, visualHint, triggerKey }
 * @param {Array} outlineChapters - Full outline (compact format for context)
 * @param {string} previousChapterText - Last N words of previous chapter
 * @param {string} runningSummary - Running summary of story so far
 * @param {Object} topic - Topic row from DB
 * @param {Object} settings - Project settings from DB
 * @returns {{ system: string, user: string }}
 */
export function buildChapterPrompt(chapter, outlineChapters, previousChapterText, runningSummary, topic, settings) {
  const style = settings.storytelling_style || 'dramatic';
  const language = settings.language || 'en';
  const styleDesc = getStyleDesc(language, style);
  const tone = settings.narration_tone || 'dramatic';
  const toneDesc = getToneDesc(language, tone);
  const imageStyle = settings.image_style || 'cinematic, photorealistic';
  const triggerKey = chapter.triggerKey;
  const triggerInfo = triggerKey ? getTriggerInfo(language, triggerKey) : null;

  // Compact outline for context (~500 tokens)
  const outlineCompact = outlineChapters
    .map(c => `${c.chapterNumber}. "${c.title}" [${c.emotionalBeat}] (${c.narrativeFunction})`)
    .join('\n');

  const isFirstChapter = chapter.chapterNumber === 1;
  const isLastChapter = chapter.chapterNumber === outlineChapters.length;

  const system = `You are an elite YouTube screenwriter. Your task: write ONE SINGLE CHAPTER of a long story, with maximum cinematic quality.

NARRATIVE IDENTITY:
- Style: ${style.toUpperCase()} — ${styleDesc.voice}
- Pacing: ${styleDesc.pacing}
- Tone: ${toneDesc}
- Mandatory language: ${langLabel(language)}
- Visual style: ${imageStyle}

CRITICAL: Write the ENTIRE chapter in ${langLabel(language)}. Do NOT mix languages. Every word of narration must be in ${langLabel(language)}.

=== CHAPTER ${chapter.chapterNumber}/${outlineChapters.length} ===

Title: "${chapter.title}"
Target emotion: ${chapter.emotionalBeat}
Narrative function: ${chapter.narrativeFunction}
Word target: ~${chapter.targetWordCount} words
What happens: ${chapter.contextNote}
Visual hint: ${chapter.visualHint || 'Define based on narrative'}

${isFirstChapter ? `FIRST CHAPTER — ${styleDesc.openingTechnique}
The viewer decides if they stay in the first 15 seconds. GRAB ATTENTION IMMEDIATELY.
Use one of these techniques:
- COLD OPEN: Start at the most dramatic moment
- IMPOSSIBLE STATISTIC: A fact that breaks expectations
- IMMERSIVE SCENARIO: "Imagine you..." — place the viewer INSIDE the scene
- FORBIDDEN QUESTION: Question something no one dares to question` : ''}

${isLastChapter ? `LAST CHAPTER — Circular closing.
- Revisit the hook from the first chapter
- Reflection or question that stays in the mind for days
- FORBIDDEN: "And that's the story of...", "I hope you enjoyed"` : ''}

=== PSYCHOLOGICAL TRIGGER FOR THIS CHAPTER ===

${triggerInfo ? `${triggerInfo.instruction}
Technique: ${triggerInfo.technique}` : 'Incorporate naturally: curiosity, tension, or surprise.'}

=== VISUAL MARKERS + IMG_PROMPT ===

Every 100-150 words, insert TWO consecutive markers:

1. [VISUAL: DYNAMIC narrative scene description]
   - Describe MOVEMENT, ACTION, TRANSFORMATION — never static images
   - Use cinematic language: "camera dives", "slow zoom", "time-lapse", "hard cut"
   - Visual hint for this chapter: ${chapter.visualHint || imageStyle}

2. [IMG_PROMPT: technical prompt optimized for image generation]
   - Style: ${imageStyle}
   - Include: composition, lighting, camera angle, atmosphere, dominant colors
   - Format: "scene description, artistic style, lighting, composition, aspect ratio 16:9"
   - Be SPECIFIC and TECHNICAL — this prompt will be sent directly to the image provider
   - ALWAYS in English (image providers work best in English)

Correct example:
[VISUAL: Aerial camera diving from the night sky to a solitary campfire where a man draws maps in the sand]
[IMG_PROMPT: aerial shot diving from dark night sky towards a solitary campfire on a sandy beach, a man drawing maps in the sand with a stick, warm orange firelight contrasting with deep blue night sky, cinematic composition, dramatic lighting, photorealistic, 16:9]

=== WRITING RULES ===

1. VARIED RHYTHM: Alternate short impactful sentences with longer explanatory ones
2. SHOW DON'T TELL: Describe scenes, don't explain emotions
3. MICRO-HOOK at the end: The chapter must end with tension or curiosity for the next
4. CONCRETE DATA: Specific numbers > generalizations
5. CONTINUITY: ${previousChapterText ? 'Continue naturally from the previous text — no repeating, no summarizing' : 'This is the BEGINNING of the story'}
6. FORBIDDEN: "In this chapter...", "As we saw previously...", "Let's now...", generic filler
7. Write EXACTLY ~${chapter.targetWordCount} words (not much less, not much more)

=== ANTI-PATTERNS (ZERO TOLERANCE) ===

- NEVER: "It's important to note that...", "It's worth mentioning...", "As we all know..."
- NEVER: "Without further ado...", "Let's get straight to the point..."
- NEVER: Repeat information from previous chapters as filler
- NEVER: Encyclopedic/Wikipedia tone — have PERSONALITY and POSITION
- NEVER: Static visual markers — ALWAYS movement and transformation`;

  // Build user prompt with context layers
  let userParts = [`Overall topic: ${topic.title}\nAngle: ${topic.angle || 'general'}`];

  userParts.push(`\n=== FULL OUTLINE (your position: chapter ${chapter.chapterNumber}) ===\n${outlineCompact}`);

  if (runningSummary) {
    userParts.push(`\n=== STORY SUMMARY SO FAR ===\n${runningSummary}`);
  }

  if (previousChapterText) {
    userParts.push(`\n=== LAST WORDS OF PREVIOUS CHAPTER (continue from here) ===\n...${previousChapterText}`);
  }

  userParts.push(`\n=== WRITE NOW CHAPTER ${chapter.chapterNumber}: "${chapter.title}" ===\nEmotion: ${chapter.emotionalBeat} | Function: ${chapter.narrativeFunction} | ~${chapter.targetWordCount} words`);

  return { system, user: userParts.join('\n') };
}

// ============================================================
// 9. RUNNING SUMMARY PROMPT (Context compression)
// ============================================================

/**
 * Build prompt for generating a running summary of the story so far.
 * Called every N chapters to maintain distant context cheaply.
 * @param {string} storySoFar - Full story text accumulated
 * @param {Object} topic - Topic row from DB
 * @param {Object} settings - Project settings from DB
 * @returns {{ system: string, user: string }}
 */
export function buildRunningSummaryPrompt(storySoFar, topic, settings) {
  const language = settings.language || 'en';

  const system = `You are a narrative summary assistant. Your task: summarize the story so far in 3-5 concise sentences, preserving:
1. Main events/facts presented
2. Current emotional state of the narrative
3. Latest open questions or tensions (unanswered yet)
4. Important names/data mentioned

Language: ${langLabel(language)}
Write the summary in ${langLabel(language)}. Be concise but complete. Maximum 200 words.`;

  const user = `Topic: ${topic.title}\n\nStory so far:\n${storySoFar.substring(storySoFar.length - 8000)}`;

  return { system, user };
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Resolve language key: returns 'pt-BR' or 'en' (default: 'en').
 */
function langKey(language) {
  return language === 'pt-BR' ? 'pt-BR' : 'en';
}

/**
 * Get style descriptor for language + style.
 */
function getStyleDesc(language, style) {
  const lk = langKey(language);
  return STYLE_DESCRIPTORS[lk]?.[style] || STYLE_DESCRIPTORS[lk]?.dramatic || STYLE_DESCRIPTORS.en.dramatic;
}

/**
 * Get tone descriptor for language + tone.
 */
function getToneDesc(language, tone) {
  const lk = langKey(language);
  return TONE_DESCRIPTORS[lk]?.[tone] || TONE_DESCRIPTORS[lk]?.dramatic || TONE_DESCRIPTORS.en.dramatic;
}

/**
 * Get trigger info for language + trigger key.
 */
function getTriggerInfo(language, triggerKey) {
  const lk = langKey(language);
  return TRIGGER_INSTRUCTIONS[lk]?.[triggerKey] || null;
}

/**
 * Language label for prompts.
 */
function langLabel(language) {
  return language === 'pt-BR' ? 'Brazilian Portuguese (pt-BR)' : 'English';
}

/**
 * Parse comma-separated trigger string into array of trigger keys.
 */
function parseTriggers(triggersStr) {
  if (!triggersStr) return [];
  return triggersStr
    .split(',')
    .map(t => t.trim().toLowerCase().replace(/\s+/g, '_'))
    .filter(t => t.length > 0);
}

/**
 * Build formatted trigger instructions block from trigger keys.
 */
function buildTriggersBlock(triggerKeys, language = 'en') {
  if (!triggerKeys || triggerKeys.length === 0) return '';

  const lk = langKey(language);
  const fallbackMsg = lk === 'pt-BR'
    ? 'Incorpore este gatilho psicologico naturalmente na narrativa.'
    : 'Incorporate this psychological trigger naturally into the narrative.';

  return triggerKeys
    .map(key => {
      const info = getTriggerInfo(language, key);
      if (info) {
        const techLabel = lk === 'pt-BR' ? 'Tecnica' : 'Technique';
        return `- ${info.instruction}\n  ${techLabel}: ${info.technique}`;
      }
      return `- ${key.toUpperCase()}: ${fallbackMsg}`;
    })
    .join('\n\n');
}
