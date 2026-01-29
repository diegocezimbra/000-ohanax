/**
 * Script para migrar prompts de arquivos .md para o banco de dados
 * Execute: node scripts/migrate-prompts.js
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

// Conexão com o banco analytics
const pool = new Pool({
  connectionString: 'postgres://postgres:Jmlj3x7AiZoaVp3dVU930g09YdIsAMoVMu7g4JTLeVIDSrYompRRWR2FhBoON8IR@5.161.213.157:5441/postgres',
  max: 5
});

// Definir os prompts a serem migrados
const promptsToMigrate = [
  {
    file: 'PROMPT_ANALISE_CODIGO_COMPLETO.md',
    title: 'Sistema de Análise Crítica de Código com Multi-Agentes',
    category: 'analysis',
    description: 'Sistema completo de análise de qualidade de software com múltiplos agentes especialistas (SOLID, Clean Code, Segurança, etc.)'
  },
  {
    file: 'dev-code-review.md',
    title: 'Code Review Expert',
    category: 'dev',
    description: 'Prompt para revisão de código focado em qualidade, bugs, performance e segurança'
  },
  {
    file: 'README.md',
    title: 'Smart Noter - Documentação Técnica',
    category: 'dev',
    description: 'Documentação técnica completa para desenvolver o Smart Noter - app de transcrição e análise de áudio'
  }
];

async function migrate() {
  console.log('🚀 Iniciando migração de prompts...\n');

  const promptsDir = join(__dirname, '../8a9sud89aus8d/admin/prompts');

  // Criar tabela se não existir
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_prompts (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(50) NOT NULL DEFAULT 'dev',
      content TEXT NOT NULL,
      description TEXT,
      tags TEXT[],
      is_favorite BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ Tabela verificada/criada\n');

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const prompt of promptsToMigrate) {
    try {
      const filePath = join(promptsDir, prompt.file);
      const content = readFileSync(filePath, 'utf-8');

      // Verificar se já existe
      const existing = await pool.query(
        'SELECT id FROM admin_prompts WHERE title = $1',
        [prompt.title]
      );

      if (existing.rows.length > 0) {
        console.log(`⏭️  Pulando "${prompt.title}" - já existe`);
        skipped++;
        continue;
      }

      // Inserir
      await pool.query(
        `INSERT INTO admin_prompts (title, category, content, description, is_favorite)
         VALUES ($1, $2, $3, $4, $5)`,
        [prompt.title, prompt.category, content, prompt.description, true]
      );

      console.log(`✅ Importado: "${prompt.title}"`);
      imported++;
    } catch (err) {
      console.error(`❌ Erro em "${prompt.title}": ${err.message}`);
      errors++;
    }
  }

  console.log('\n📊 Resumo da migração:');
  console.log(`   ✅ Importados: ${imported}`);
  console.log(`   ⏭️  Pulados: ${skipped}`);
  console.log(`   ❌ Erros: ${errors}`);

  await pool.end();
  console.log('\n🏁 Migração concluída!');
}

migrate().catch(console.error);
