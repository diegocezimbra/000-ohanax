import { db } from '../../db.js';

export async function initYouTubeTables() {
  try {
    await db.analytics.query(`
      -- 1. Projects
      CREATE TABLE IF NOT EXISTS yt_projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        language VARCHAR(10) NOT NULL DEFAULT 'pt-BR',
        niche VARCHAR(100) NOT NULL DEFAULT 'custom',
        logo_url TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        pipeline_paused BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_yt_projects_status ON yt_projects(status);

      -- 2. Project Settings (1:1 with project)
      CREATE TABLE IF NOT EXISTS yt_project_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES yt_projects(id) ON DELETE CASCADE,
        -- Storytelling
        storytelling_style VARCHAR(50) NOT NULL DEFAULT 'dramatico',
        target_video_length VARCHAR(50) NOT NULL DEFAULT '30-45 minutes',
        language VARCHAR(10) NOT NULL DEFAULT 'pt-BR',
        narrative_template TEXT DEFAULT 'Hook (0:00-0:30): Abrir com o momento mais dramatico ou chocante. Contexto (0:30-5:00): Apresentar protagonista e o mundo dele. Desenvolvimento (5:00-20:00): Tensao crescente com obstaculos e decisoes. Virada (20:00-30:00): Climax dramatico, ponto sem retorno. Resolucao Triunfante (30:00+): Consequencias e conexao emocional.',
        emotional_triggers TEXT DEFAULT 'Patriotismo, Underdog, Vinganca, Curiosidade, Raiva Justa',
        title_template TEXT DEFAULT '[TOPICO]: A Historia [ADJETIVO_EMOCIONAL] que [ACAO_DRAMATICA]',
        narration_tone VARCHAR(50) DEFAULT 'dramatico',
        target_duration_minutes INTEGER DEFAULT 30,
        min_richness_score INTEGER DEFAULT 5,
        -- LLM
        llm_provider VARCHAR(20) NOT NULL DEFAULT 'gemini',
        llm_api_key TEXT,
        llm_model VARCHAR(100) NOT NULL DEFAULT 'gemini-2.0-flash',
        -- Search
        search_provider VARCHAR(20) NOT NULL DEFAULT 'serper',
        search_api_key TEXT,
        -- Image (z_image_turbo via Replicate)
        image_provider VARCHAR(20) NOT NULL DEFAULT 'z_image_turbo',
        image_api_key TEXT,
        image_style VARCHAR(200) DEFAULT 'cinematic, photorealistic',
        openai_api_key TEXT,
        replicate_api_key TEXT,
        dalle_style VARCHAR(20) NOT NULL DEFAULT 'vivid',
        -- Video (veo3 = google/veo-3-fast via Replicate)
        video_provider VARCHAR(20) DEFAULT 'veo3',
        video_api_key TEXT,
        -- TTS
        tts_provider VARCHAR(20) NOT NULL DEFAULT 'elevenlabs',
        tts_api_key TEXT,
        elevenlabs_api_key TEXT,
        tts_voice_id VARCHAR(100),
        tts_model VARCHAR(100),
        tts_speed NUMERIC(3,2) DEFAULT 1.0,
        tts_stability NUMERIC(3,2) DEFAULT 0.75,
        -- Visual Identity
        visual_style VARCHAR(200) NOT NULL DEFAULT 'cinematic, photorealistic',
        brand_colors TEXT,
        watermark_url TEXT,
        thumbnail_font VARCHAR(100) DEFAULT 'Inter Bold',
        thumbnail_font_size INTEGER DEFAULT 72,
        thumbnail_text_color VARCHAR(20) DEFAULT '#FFFFFF',
        thumbnail_text_position VARCHAR(20) DEFAULT 'center',
        thumbnail_stroke_color VARCHAR(20) DEFAULT '#000000',
        thumbnail_stroke_width INTEGER DEFAULT 2,
        transition_type VARCHAR(30) DEFAULT 'crossfade',
        transition_duration_ms INTEGER DEFAULT 500,
        ken_burns_intensity NUMERIC(3,2) DEFAULT 0.05,
        background_music_volume NUMERIC(3,2) DEFAULT 0.15,
        -- Publishing
        max_publications_per_day INTEGER NOT NULL DEFAULT 1,
        max_publishes_per_day INTEGER NOT NULL DEFAULT 1,
        preferred_publish_hour INTEGER NOT NULL DEFAULT 14,
        publication_times JSONB DEFAULT '["14:00"]',
        publication_days JSONB DEFAULT '["mon","tue","wed","thu","fri"]',
        publication_timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
        default_visibility VARCHAR(20) DEFAULT 'public',
        auto_publish BOOLEAN NOT NULL DEFAULT false,
        -- YouTube OAuth
        youtube_connected BOOLEAN NOT NULL DEFAULT false,
        youtube_channel_id VARCHAR(100),
        youtube_channel_name VARCHAR(200),
        youtube_channel_avatar_url TEXT,
        youtube_category_id VARCHAR(10) DEFAULT '22',
        youtube_access_token TEXT,
        youtube_refresh_token TEXT,
        youtube_token_expires_at TIMESTAMPTZ,
        google_client_id TEXT,
        google_client_secret TEXT,
        -- Timestamps
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_yt_settings_project UNIQUE(project_id)
      );

      -- 3. Content Sources
      CREATE TABLE IF NOT EXISTS yt_content_sources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES yt_projects(id) ON DELETE CASCADE,
        title VARCHAR(500),
        source_type VARCHAR(30) NOT NULL CHECK (source_type IN ('url','pdf','text','youtube')),
        url TEXT,
        raw_content TEXT,
        processed_content TEXT,
        word_count INTEGER,
        status VARCHAR(30) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending','processing','processed','error')),
        error_message TEXT,
        is_deleted BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_yt_sources_project ON yt_content_sources(project_id);
      CREATE INDEX IF NOT EXISTS idx_yt_sources_status ON yt_content_sources(status);

      -- 4. Topics (each becomes one video)
      CREATE TABLE IF NOT EXISTS yt_topics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES yt_projects(id) ON DELETE CASCADE,
        source_id UUID REFERENCES yt_content_sources(id) ON DELETE SET NULL,
        title VARCHAR(500) NOT NULL,
        angle TEXT,
        target_audience VARCHAR(200),
        estimated_duration VARCHAR(50),
        richness_score INTEGER NOT NULL DEFAULT 0 CHECK (richness_score BETWEEN 0 AND 10),
        key_points JSONB DEFAULT '[]',
        series_name VARCHAR(200),
        series_order INTEGER NOT NULL DEFAULT 0,
        search_keywords JSONB DEFAULT '[]',
        hook_idea TEXT,
        pipeline_stage VARCHAR(30) NOT NULL DEFAULT 'idea'
          CHECK (pipeline_stage IN (
            'idea','topics_generated','story_created','script_created',
            'visuals_creating','visuals_created',
            'thumbnails_created','narration_created',
            'video_assembled','queued_for_publishing',
            'scheduled','published','error','discarded','rejected'
          )),
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        pipeline_error TEXT,
        is_deleted BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_yt_topics_project ON yt_topics(project_id);
      CREATE INDEX IF NOT EXISTS idx_yt_topics_source ON yt_topics(source_id);
      CREATE INDEX IF NOT EXISTS idx_yt_topics_stage ON yt_topics(pipeline_stage);

      -- 5. Research Results
      CREATE TABLE IF NOT EXISTS yt_research_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES yt_projects(id) ON DELETE CASCADE,
        source_id UUID REFERENCES yt_content_sources(id) ON DELETE SET NULL,
        topic_id UUID REFERENCES yt_topics(id) ON DELETE SET NULL,
        query TEXT,
        title VARCHAR(500),
        url TEXT,
        snippet TEXT,
        relevance_score DECIMAL(3,2) NOT NULL DEFAULT 0.0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_yt_research_source ON yt_research_results(source_id);
      CREATE INDEX IF NOT EXISTS idx_yt_research_topic ON yt_research_results(topic_id);

      -- 6. Stories (1:1 with topic)
      CREATE TABLE IF NOT EXISTS yt_stories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        topic_id UUID NOT NULL REFERENCES yt_topics(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        word_count INTEGER NOT NULL DEFAULT 0,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_yt_stories_topic UNIQUE(topic_id)
      );

      -- 7. Scripts (1:1 with topic)
      CREATE TABLE IF NOT EXISTS yt_scripts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        topic_id UUID NOT NULL REFERENCES yt_topics(id) ON DELETE CASCADE,
        youtube_title VARCHAR(200),
        youtube_description TEXT,
        youtube_tags JSONB DEFAULT '[]',
        chapters JSONB DEFAULT '[]',
        total_duration_estimate INTEGER NOT NULL DEFAULT 0,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_yt_scripts_topic UNIQUE(topic_id)
      );

      -- 8. Script Segments
      CREATE TABLE IF NOT EXISTS yt_script_segments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        script_id UUID NOT NULL REFERENCES yt_scripts(id) ON DELETE CASCADE,
        segment_index INTEGER NOT NULL,
        segment_type VARCHAR(30) NOT NULL DEFAULT 'main',
        narration_text TEXT NOT NULL,
        visual_direction TEXT,
        duration_seconds INTEGER NOT NULL DEFAULT 45,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_yt_segments_script ON yt_script_segments(script_id);

      -- 9. Visual Assets
      CREATE TABLE IF NOT EXISTS yt_visual_assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        topic_id UUID NOT NULL REFERENCES yt_topics(id) ON DELETE CASCADE,
        segment_id UUID NOT NULL REFERENCES yt_script_segments(id) ON DELETE CASCADE,
        asset_type VARCHAR(20) NOT NULL DEFAULT 'image'
          CHECK (asset_type IN ('image','video')),
        s3_key TEXT,
        prompt_used TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        metadata JSONB DEFAULT '{}',
        status VARCHAR(20) NOT NULL DEFAULT 'completed',
        is_selected BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_yt_visuals_segment ON yt_visual_assets(segment_id);
      CREATE INDEX IF NOT EXISTS idx_yt_visuals_topic ON yt_visual_assets(topic_id);

      -- 10. Thumbnails (3 variants per topic)
      CREATE TABLE IF NOT EXISTS yt_thumbnails (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        topic_id UUID NOT NULL REFERENCES yt_topics(id) ON DELETE CASCADE,
        variant_index INTEGER NOT NULL,
        s3_key TEXT,
        concept JSONB DEFAULT '{}',
        is_selected BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_yt_thumbnails_topic ON yt_thumbnails(topic_id);

      -- 11. Narrations (1:1 with topic)
      CREATE TABLE IF NOT EXISTS yt_narrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        topic_id UUID NOT NULL REFERENCES yt_topics(id) ON DELETE CASCADE,
        s3_key TEXT,
        duration_seconds INTEGER,
        segment_meta JSONB,
        alignment_data JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_yt_narrations_topic UNIQUE(topic_id)
      );

      -- 12. Final Videos (1:1 with topic)
      CREATE TABLE IF NOT EXISTS yt_final_videos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        topic_id UUID NOT NULL REFERENCES yt_topics(id) ON DELETE CASCADE,
        s3_key TEXT,
        duration_seconds INTEGER,
        file_size_mb DECIMAL(10,2),
        resolution VARCHAR(20) NOT NULL DEFAULT '1920x1080',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_yt_videos_topic UNIQUE(topic_id)
      );

      -- 13. Publications (publishing queue)
      CREATE TABLE IF NOT EXISTS yt_publications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES yt_projects(id) ON DELETE CASCADE,
        topic_id UUID NOT NULL REFERENCES yt_topics(id) ON DELETE CASCADE,
        video_id UUID NOT NULL REFERENCES yt_final_videos(id) ON DELETE CASCADE,
        youtube_title VARCHAR(200),
        youtube_description TEXT,
        youtube_tags JSONB DEFAULT '[]',
        youtube_video_id VARCHAR(50),
        youtube_url TEXT,
        status VARCHAR(30) NOT NULL DEFAULT 'pending_review'
          CHECK (status IN ('pending_review','approved','scheduled','published','rejected','failed')),
        scheduled_for TIMESTAMPTZ,
        published_at TIMESTAMPTZ,
        review_notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_yt_pubs_topic UNIQUE(topic_id)
      );
      CREATE INDEX IF NOT EXISTS idx_yt_pubs_project ON yt_publications(project_id);
      CREATE INDEX IF NOT EXISTS idx_yt_pubs_status ON yt_publications(status);

      -- 14. Job Queue
      CREATE TABLE IF NOT EXISTS yt_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES yt_projects(id) ON DELETE CASCADE,
        topic_id UUID,
        source_id UUID,
        job_type VARCHAR(50) NOT NULL
          CHECK (job_type IN (
            'extract_source','web_research_source','generate_topics',
            'generate_story','generate_script','expand_script',
            'generate_visual_prompts','generate_visual_asset',
            'generate_thumbnails','generate_narration',
            'assemble_video','publish_video'
          )),
        payload JSONB NOT NULL DEFAULT '{}',
        result JSONB,
        status VARCHAR(20) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending','processing','completed','failed','cancelled')),
        priority INTEGER NOT NULL DEFAULT 0,
        depends_on UUID REFERENCES yt_jobs(id) ON DELETE SET NULL,
        attempt INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 3,
        run_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        error_message TEXT,
        error_stack TEXT,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        locked_by VARCHAR(100),
        locked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_yt_jobs_project ON yt_jobs(project_id);
      CREATE INDEX IF NOT EXISTS idx_yt_jobs_status ON yt_jobs(status);
      CREATE INDEX IF NOT EXISTS idx_yt_jobs_claim
        ON yt_jobs(status, priority DESC, run_after)
        WHERE status = 'pending';

      -- 15. Job Logs
      CREATE TABLE IF NOT EXISTS yt_job_logs (
        id BIGSERIAL PRIMARY KEY,
        job_id UUID NOT NULL REFERENCES yt_jobs(id) ON DELETE CASCADE,
        level VARCHAR(10) NOT NULL DEFAULT 'info'
          CHECK (level IN ('debug','info','warn','error')),
        message TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_yt_job_logs_job ON yt_job_logs(job_id);
    `);
    console.log('[YouTube] All 15 tables initialized');
  } catch (err) {
    console.error('[YouTube] Error initializing tables:', err.message);
  }
}

initYouTubeTables();
