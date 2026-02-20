/**
 * Central configuration defaults for the YouTube Automation platform.
 * Single source of truth — used by both:
 *   - GET /projects/:pid/settings/defaults  (project-scoped)
 *   - GET /config/defaults                  (global, for wizard before project exists)
 *
 * The frontend must NEVER hardcode these lists.
 */

export function getConfigDefaults() {
  return {
    niches: [
      { value: 'history', label: 'Historia' },
      { value: 'science', label: 'Ciencia' },
      { value: 'technology', label: 'Tecnologia' },
      { value: 'finance', label: 'Financas' },
      { value: 'education', label: 'Educacao' },
      { value: 'health', label: 'Saude' },
      { value: 'business', label: 'Negocios' },
      { value: 'entertainment', label: 'Entretenimento' },
      { value: 'lifestyle', label: 'Estilo de Vida' },
      { value: 'other', label: 'Outro' },
    ],
    languages: [
      { value: 'pt-BR', label: 'Portugues (Brasil)' },
      { value: 'en', label: 'Ingles' },
      { value: 'es', label: 'Espanhol' },
    ],
    storytelling_styles: [
      { value: 'educational', label: 'Educacional' },
      { value: 'documentary', label: 'Documentario' },
      { value: 'dramatic', label: 'Dramatico' },
      { value: 'tutorial', label: 'Tutorial' },
      { value: 'entertainment', label: 'Entretenimento' },
    ],
    narration_tones: [
      { value: 'conversational', label: 'Conversacional' },
      { value: 'formal', label: 'Formal' },
      { value: 'dramatic', label: 'Dramatico' },
      { value: 'humorous', label: 'Humoristico' },
      { value: 'inspirational', label: 'Inspiracional' },
      { value: 'documentary', label: 'Documentario' },
      { value: 'suspense', label: 'Suspense' },
      { value: 'epic', label: 'Epico' },
    ],
    psychological_triggers: [
      { key: 'patriotismo', label: 'Patriotismo / Orgulho Nacional' },
      { key: 'underdog', label: 'Underdog / Subestimado' },
      { key: 'vinganca', label: 'Vinganca / Justica Poetica' },
      { key: 'curiosidade', label: 'Curiosidade / Misterio' },
      { key: 'raiva_justa', label: 'Raiva Justa' },
      { key: 'surpresa', label: 'Surpresa / Choque' },
      { key: 'identificacao', label: 'Identificacao Pessoal' },
      { key: 'urgencia', label: 'Urgencia / FOMO' },
      { key: 'esperanca', label: 'Esperanca' },
      { key: 'indignacao', label: 'Indignacao' },
      { key: 'nostalgia', label: 'Nostalgia' },
      { key: 'empoderamento', label: 'Empoderamento' },
    ],
    pipeline_stages: [
      { key: 'selected', label: 'Selecionada' },
      { key: 'researching', label: 'Pesquisando' },
      { key: 'story_created', label: 'Historia Criada' },
      { key: 'script_created', label: 'Roteiro Criado' },
      { key: 'visuals_created', label: 'Visuais Criados' },
      { key: 'thumbnails_created', label: 'Thumbnails Criadas' },
      { key: 'narration_created', label: 'Narracao Criada' },
      { key: 'video_assembled', label: 'Video Montado' },
      { key: 'queued_for_publishing', label: 'Na Fila' },
      { key: 'published', label: 'Publicado' },
    ],
    pipeline_extra_stages: [
      { key: 'discarded', label: 'Descartado' },
      { key: 'rejected', label: 'Rejeitado' },
      { key: 'error', label: 'Erro' },
    ],
    youtube_categories: [
      { id: '1', name: 'Film & Animation' },
      { id: '2', name: 'Autos & Vehicles' },
      { id: '10', name: 'Music' },
      { id: '15', name: 'Pets & Animals' },
      { id: '17', name: 'Sports' },
      { id: '20', name: 'Gaming' },
      { id: '22', name: 'People & Blogs' },
      { id: '23', name: 'Comedy' },
      { id: '24', name: 'Entertainment' },
      { id: '25', name: 'News & Politics' },
      { id: '26', name: 'Howto & Style' },
      { id: '27', name: 'Education' },
      { id: '28', name: 'Science & Technology' },
    ],
    ai_providers: [
      { function: 'Texto / Roteiro (LLM)', provider: 'Gemini', detail: 'Google Gemini via GEMINI_API_KEY', configured: !!process.env.GOOGLE_API_KEY },
      { function: 'Narracao (TTS)', provider: 'Fish Audio', detail: 'Fish Audio OpenAudio S1 via FISH_AUDIO_API_KEY', configured: !!process.env.FISH_AUDIO_API_KEY },
      { function: 'Imagem (Visuais)', provider: 'Replicate', detail: 'prunaai/z-image-turbo — 1024x1024, 8 steps', configured: !!process.env.REPLICATE_API_TOKEN },
      { function: 'Video (Cenas Animadas)', provider: 'Replicate', detail: 'google/veo-3-fast — 720p', configured: !!process.env.REPLICATE_API_TOKEN },
      { function: 'Pesquisa Web', provider: 'Serper', detail: 'serper.dev via SERPER_API_KEY', configured: !!process.env.SERPER_API_KEY },
      { function: 'Montagem Final', provider: 'FFmpeg', detail: 'Processamento local', configured: true },
    ],
    duration_targets: [
      { value: '30-40', label: '30-40 minutos' },
      { value: '40-50', label: '40-50 minutos' },
      { value: '50-60', label: '50-60 minutos' },
    ],
    transitions: [
      { value: 'crossfade', label: 'Crossfade' },
      { value: 'fade', label: 'Fade' },
      { value: 'dissolve', label: 'Dissolve' },
      { value: 'wipe', label: 'Wipe' },
      { value: 'none', label: 'Nenhuma' },
    ],
    visibilities: [
      { value: 'public', label: 'Publico' },
      { value: 'unlisted', label: 'Nao Listado' },
      { value: 'private', label: 'Privado' },
    ],
    timezones: [
      { value: 'America/Sao_Paulo', label: 'Brasilia (GMT-3)' },
      { value: 'America/New_York', label: 'Nova York (GMT-5)' },
      { value: 'Europe/Lisbon', label: 'Lisboa (GMT+0)' },
      { value: 'UTC', label: 'UTC' },
    ],
    storytelling_defaults: {
      hook: 'O adversario ri, zomba ou duvida publicamente. Cena de humilhacao ou desprezo que estabelece a tensao inicial. A abertura DEVE conectar tematicamente com a resolucao final — o espectador precisa sentir que voltou ao ponto de partida, mas agora com a perspectiva invertida.',
      context: 'Background historico detalhado. O que estava em jogo, quem eram os protagonistas, qual era o cenario geopolitico/social. Construir o mundo para que o espectador entenda a gravidade do conflito e se importe com o desfecho.',
      development: 'Jornada do protagonista com dificuldades reais, momentos de duvida e quase-desistencia. Incluir detalhes humanos (conversas, decisoes dificeis, sacrificios). O espectador precisa torcer ativamente pelo protagonista.',
      twist: 'O momento em que as mesas viram. O adversario percebe que subestimou. Detalhar a reacao, o choque, a mudanca de poder. Este e o climax emocional — usar linguagem cinematica e ritmo acelerado.',
      resolution: 'Vitoria completa e definitiva. Contraste explicito entre a zombaria inicial e o resultado final. Fechar o arco narrativo conectando diretamente com o hook de abertura. Deixar o espectador com sensacao de satisfacao e justica.',
      title_template: '{adversary} ri de {protagonist} sobre {topic} -- {consequence}',
      narrative_template: 'GANCHO (0-15s): Abra com uma pergunta provocativa, fato chocante ou cenario que gere identificacao imediata. O espectador precisa sentir "isso e sobre mim" nos primeiros 5 segundos.\n\nCONTEXTO (15s-2min): Apresente o problema/tema com dados concretos, exemplos reais e linguagem visual. Use analogias do cotidiano para tornar conceitos complexos acessiveis.\n\nDESENVOLVIMENTO (2min-8min): Construa a narrativa em 3-4 blocos, cada um com:\n- Uma mini-revelacao ou virada que mantem a curiosidade\n- Evidencias (dados, estudos, exemplos reais)\n- Conexao emocional (como isso afeta a vida da pessoa)\nUse transicoes que criem expectativa: "Mas o que ninguem te conta e..."\n\nCLIMAX (8min-10min): Entregue o insight principal — a grande revelacao que muda a perspectiva do espectador. Este e o momento "aha!" que faz o video valer a pena.\n\nCONCLUSAO (10min-12min): Recapitule os 2-3 pontos principais, de um passo acionavel concreto e termine com uma reflexao que faca o espectador querer comentar e compartilhar.',
      emotional_triggers: 'curiosidade, surpresa, identificacao, urgencia, esperanca, indignacao, nostalgia, empoderamento',
    },
  };
}
