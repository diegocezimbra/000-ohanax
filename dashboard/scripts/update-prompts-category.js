/**
 * Script para atualizar categorias e remover prompts duplicados
 * Execute: node scripts/update-prompts-category.js
 */

import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgres://postgres:Jmlj3x7AiZoaVp3dVU930g09YdIsAMoVMu7g4JTLeVIDSrYompRRWR2FhBoON8IR@5.161.213.157:5441/postgres',
  max: 5
});

async function updatePrompts() {
  console.log('🚀 Atualizando prompts...\n');

  try {
    // 1. Remover prompt duplicado do Smart Noter
    const deleteResult = await pool.query(
      `DELETE FROM admin_prompts WHERE title = $1 RETURNING id`,
      ['Smart Noter - Documentação Técnica']
    );

    if (deleteResult.rows.length > 0) {
      console.log('✅ Removido prompt duplicado: "Smart Noter - Documentação Técnica"');
    } else {
      console.log('ℹ️  Prompt "Smart Noter - Documentação Técnica" não encontrado');
    }

    // 2. Listar prompts atuais
    const prompts = await pool.query('SELECT id, title, category FROM admin_prompts ORDER BY id');
    console.log('\n📋 Prompts atuais:');
    prompts.rows.forEach(p => {
      console.log(`   [${p.id}] ${p.title} (${p.category})`);
    });

    console.log('\n🏁 Atualização concluída!');
  } catch (err) {
    console.error('❌ Erro:', err.message);
  }

  await pool.end();
}

updatePrompts().catch(console.error);
