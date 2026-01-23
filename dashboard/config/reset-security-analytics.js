/**
 * Script para DELETAR e RECRIAR a tabela security_analytics_events
 * Isso zera todos os dados de analytics do Security para começar do zero
 *
 * Executar: node config/reset-security-analytics.js
 */
import pg from 'pg';

const { Pool } = pg;

const analyticsPool = new Pool({
  connectionString: 'postgres://postgres:Jmlj3x7AiZoaVp3dVU930g09YdIsAMoVMu7g4JTLeVIDSrYompRRWR2FhBoON8IR@5.161.213.157:5441/postgres',
  max: 5
});

async function resetSecurityAnalytics() {
  const client = await analyticsPool.connect();

  try {
    console.log('='.repeat(60));
    console.log('RESET: security_analytics_events');
    console.log('='.repeat(60));

    // 1. Verificar quantos registros existem antes de deletar
    const countBefore = await client.query(`
      SELECT COUNT(*) as total FROM security_analytics_events
    `).catch(() => ({ rows: [{ total: 0 }] }));

    console.log(`\n[INFO] Registros existentes: ${countBefore.rows[0].total}`);

    // 2. Dropar a tabela existente
    console.log('\n[1/3] Deletando tabela existente...');
    await client.query(`DROP TABLE IF EXISTS security_analytics_events CASCADE`);
    console.log('      OK - Tabela deletada');

    // 3. Criar a nova tabela com funnel_variant obrigatório
    console.log('\n[2/3] Criando nova tabela...');
    await client.query(`
      CREATE TABLE security_analytics_events (
        id SERIAL PRIMARY KEY,

        -- Identificadores de sessão/visitante
        session_id VARCHAR(64) NOT NULL,
        visitor_id VARCHAR(64),

        -- Evento
        event_name VARCHAR(100) NOT NULL,
        event_category VARCHAR(50),

        -- Variação do funil (OBRIGATÓRIO para A/B testing)
        -- Valores: 'original', 'video', 'pro'
        funnel_variant VARCHAR(20) NOT NULL DEFAULT 'original',

        -- Contexto da página
        page_url TEXT,
        page_path VARCHAR(255),
        referrer TEXT,

        -- UTM tracking
        utm_source VARCHAR(100),
        utm_medium VARCHAR(100),
        utm_campaign VARCHAR(100),
        utm_term VARCHAR(255),
        utm_content VARCHAR(255),

        -- Dados do dispositivo
        user_agent TEXT,
        ip_address VARCHAR(50),
        country VARCHAR(100),
        city VARCHAR(100),
        device_type VARCHAR(50),
        browser VARCHAR(100),
        os VARCHAR(100),

        -- Dados adicionais do evento
        event_data JSONB,

        -- Contexto do scan (se aplicável)
        scan_id VARCHAR(64),
        trial_id VARCHAR(64),

        -- Timestamps
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Índices para performance nas queries do dashboard
      CREATE INDEX idx_sae_created_at ON security_analytics_events(created_at DESC);
      CREATE INDEX idx_sae_event_name ON security_analytics_events(event_name);
      CREATE INDEX idx_sae_session_id ON security_analytics_events(session_id);
      CREATE INDEX idx_sae_visitor_id ON security_analytics_events(visitor_id);
      CREATE INDEX idx_sae_funnel_variant ON security_analytics_events(funnel_variant);
      CREATE INDEX idx_sae_page_path ON security_analytics_events(page_path);
      CREATE INDEX idx_sae_utm_source ON security_analytics_events(utm_source);

      -- Índice composto para queries de funil por variação
      CREATE INDEX idx_sae_variant_event ON security_analytics_events(funnel_variant, event_name);
      CREATE INDEX idx_sae_variant_created ON security_analytics_events(funnel_variant, created_at DESC);
    `);
    console.log('      OK - Tabela criada com todos os índices');

    // 4. Verificar estrutura
    console.log('\n[3/3] Verificando estrutura...');
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'security_analytics_events'
      ORDER BY ordinal_position
    `);

    console.log('\n--- Colunas da tabela ---');
    columns.rows.forEach(row => {
      const nullable = row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = row.column_default ? ` DEFAULT ${row.column_default}` : '';
      console.log(`  ${row.column_name.padEnd(20)} ${row.data_type.padEnd(20)} ${nullable}${defaultVal}`);
    });

    // 5. Verificar índices
    const indexes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'security_analytics_events'
    `);

    console.log('\n--- Índices criados ---');
    indexes.rows.forEach(row => {
      console.log(`  ${row.indexname}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('SUCESSO! Tabela security_analytics_events recriada.');
    console.log('Todos os dados anteriores foram deletados.');
    console.log('A coluna funnel_variant agora é obrigatória (NOT NULL).');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n[ERRO]', error.message);
    throw error;
  } finally {
    client.release();
    await analyticsPool.end();
  }
}

resetSecurityAnalytics();
