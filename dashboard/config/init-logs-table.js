/**
 * Script para criar tabela de logs do oEntregador no PostgreSQL
 *
 * Executar: node config/init-logs-table.js
 */
import pg from 'pg';

const { Pool } = pg;

const analyticsPool = new Pool({
  connectionString: 'postgres://postgres:Jmlj3x7AiZoaVp3dVU930g09YdIsAMoVMu7g4JTLeVIDSrYompRRWR2FhBoON8IR@5.161.213.157:5441/postgres',
  max: 5
});

async function initLogsTable() {
  const client = await analyticsPool.connect();

  try {
    console.log('Criando tabela de logs do oEntregador...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS oentregador_logs (
        id SERIAL PRIMARY KEY,
        -- Contexto do usuário
        user_id VARCHAR(255),
        user_name VARCHAR(255),
        user_email VARCHAR(255),
        user_role VARCHAR(50),
        -- Contexto da empresa
        company_id VARCHAR(255),
        company_name VARCHAR(255),
        -- Detalhes da ação
        action VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL,
        resource VARCHAR(100),
        resource_id VARCHAR(255),
        -- Dados da requisição
        method VARCHAR(10),
        endpoint TEXT,
        ip_address VARCHAR(50),
        user_agent TEXT,
        -- Resultado
        status VARCHAR(20) NOT NULL,
        status_code INTEGER,
        error_message TEXT,
        -- Dados de mudança
        old_value JSONB,
        new_value JSONB,
        metadata JSONB,
        -- Timestamps
        duration INTEGER,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Índices para performance
      CREATE INDEX IF NOT EXISTS idx_oentregador_logs_timestamp ON oentregador_logs(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_oentregador_logs_company ON oentregador_logs(company_id);
      CREATE INDEX IF NOT EXISTS idx_oentregador_logs_user ON oentregador_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_oentregador_logs_action ON oentregador_logs(action);
      CREATE INDEX IF NOT EXISTS idx_oentregador_logs_category ON oentregador_logs(category);
    `);

    console.log('✅ Tabela oentregador_logs criada com sucesso!');

    // Verificar se foi criada
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'oentregador_logs'
      ORDER BY ordinal_position
    `);

    console.log('\nColunas da tabela:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error.message);
    throw error;
  } finally {
    client.release();
    await analyticsPool.end();
  }
}

initLogsTable();
