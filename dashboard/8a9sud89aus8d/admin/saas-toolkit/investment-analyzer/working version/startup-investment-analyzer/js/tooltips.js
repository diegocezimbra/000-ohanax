// ===========================
// Tooltip System - Auto-inject tooltips
// ===========================

const tooltipData = {
    // STEP 1: Informações Básicas
    companyName: "Nome oficial da startup que você está analisando. Este nome aparecerá no relatório final.",

    stage: `<strong>Estágio atual de maturidade.</strong> Define benchmarks automáticos:
        <ul>
            <li><strong>Pre-Seed:</strong> Ideia validada, protótipo</li>
            <li><strong>Seed:</strong> Primeiros clientes, buscando PMF</li>
            <li><strong>Series A:</strong> PMF comprovado, crescimento acelerado</li>
            <li><strong>Series B+:</strong> Escala estabelecida, liderança de mercado</li>
        </ul>`,

    vertical: `<strong>Múltiplos de Valuation por Vertical:</strong>
        <ul>
            <li><strong>AI-Native:</strong> 8-15x ARR (maior múltiplo)</li>
            <li><strong>Cybersecurity:</strong> 6-10x ARR</li>
            <li><strong>Fintech:</strong> 5-8x ARR</li>
            <li><strong>Horizontal SaaS:</strong> 3-5x ARR</li>
        </ul>`,

    foundedYear: "Ano em que a empresa foi oficialmente fundada. Ajuda a avaliar maturidade vs tração.",

    location: "Cidade/país onde a startup está baseada. <strong>Influencia valuation:</strong> EUA tem múltiplos ~1.5-2x maiores que LATAM.",

    problemSolution: `<strong>Descreva (2-3 frases):</strong>
        <ul>
            <li><strong>Problema:</strong> Qual dor específica? Quantifique se possível</li>
            <li><strong>Solução:</strong> Como resolve de forma única?</li>
            <li><strong>Exemplo:</strong> "Clínicas perdem $50K/ano com no-shows. DentalFlow usa IA para reduzir no-shows em 70%"</li>
        </ul>`,

    uniqueInsight: `<strong>Por que AGORA é o momento certo? (60% dos VCs citam timing como crítico)</strong>
        <ul>
            <li><strong>Tech Enablers:</strong> IA, 5G, blockchain</li>
            <li><strong>Regulação:</strong> LGPD, Open Banking</li>
            <li><strong>Behavior:</strong> Remote work, e-commerce</li>
            <li><strong>Economics:</strong> Cloud caiu 10x de custo</li>
        </ul>`,

    // STEP 2: Equipe
    numFounders: "Total de fundadores principais. <strong>Ideal: 2-3 founders</strong> com skills complementares (Tech + Business).",

    founderCommitment: "<strong>RED FLAG:</strong> Founders part-time. Startup exige dedicação total para competir e executar rápido.",

    obsession: `<strong>"Você perseguiria isso por 10 anos sem garantia?"</strong>
        <br>5 = Paixão inabalável | 3 = Acredita mas não é calling | 1 = Só oportunidade`,

    domainKnowledge: `<strong>"Fala a linguagem do mercado?"</strong>
        <br>5 = Expert reconhecido | 3 = Trabalhou no setor | 1 = Outsider completo`,

    trackRecord: `<strong>"Já construiu/lançou algo?"</strong>
        <br>5 = Exit $10M+ | 4 = Startup com tração | 1 = Nunca "shipped" nada
        <br><em>Até startup falha conta positivo!</em>`,

    networkAccess: `<strong>"Tem relacionamentos com 50+ potenciais clientes?"</strong>
        <br>5 = Rolodex com 100+ decisores | 3 = Conhece mas precisa de intros | 1 = Zero network`,

    personalExperience: `<strong>"Viveu essa dor na pele?"</strong>
        <br>5 = Sofreu anos com esse problema | 3 = Viu colegas sofrerem | 1 = Leu em reports`,

    industryExperience: "Anos trabalhando no setor (não necessariamente empreendendo). <strong>60% dos VCs consideram essencial.</strong>",

    previousStartup: "25%+ dos founders top VC-backed trabalharam em Google/Microsoft. Não é requisito mas sinaliza execução em escala.",

    technicalTeam: "<strong>RED FLAG:</strong> Startup tech sem CTO/founder técnico. Terceirização de core tech raramente funciona.",

    teamDynamics: "Conflito entre founders é causa #1 de falha. <strong>Ideal: já trabalharam juntos antes.</strong>",

    founderOwnership: `<strong>Ownership muito baixo = motivação comprometida</strong>
        <ul>
            <li>Pre-Seed: 85-95% | RED FLAG <80%</li>
            <li>Seed: 70-85% | RED FLAG <60%</li>
            <li>Series A: 55-70% | RED FLAG <50%</li>
            <li>Series B: 40-55% | RED FLAG <35%</li>
        </ul>`,

    // STEP 3: Mercado
    tam: `<strong>TAM = Total Addressable Market</strong>
        <br>Tamanho TOTAL do mercado global. Em USD.
        <ul>
            <li><strong>Mínimo para VC:</strong> $1B+ (para suportar unicórnio)</li>
            <li><strong>Exemplo:</strong> Mercado global de CRM = $50B/ano</li>
        </ul>`,

    sam: `<strong>SAM = Serviceable Available Market</strong>
        <br>Parcela do TAM que você pode REALISTICAMENTE servir.
        <br><strong>Benchmark:</strong> SAM tipicamente 20-40% do TAM`,

    som: `<strong>SOM = Serviceable Obtainable Market</strong>
        <br>Quanto você pode capturar nos primeiros 3-5 anos.
        <br><strong>Benchmark:</strong> Startups SaaS capturam 2-5% do SAM inicialmente`,

    potentialCustomers: `<strong>Total de empresas/pessoas no seu ICP (Ideal Customer Profile)</strong>
        <ul>
            <li><strong>B2B:</strong> 50.000 PMEs com 10-200 funcionários</li>
            <li><strong>B2C:</strong> 5M usuários iPhone em SP com renda $3K+</li>
        </ul>`,

    avgRevenuePerCustomer: `<strong>ACV - Annual Contract Value por cliente</strong>
        <ul>
            <li><strong>SMB SaaS:</strong> $500-$5.000/ano</li>
            <li><strong>Mid-Market:</strong> $5.000-$50.000/ano</li>
            <li><strong>Enterprise:</strong> $50.000-$500.000+/ano</li>
        </ul>`,

    marketGrowthRate: `<strong>CAGR - Crescimento anual do mercado</strong>
        <ul>
            <li><strong>Mercado quente:</strong> 25-50%+ (IA, Cloud)</li>
            <li><strong>Mercado saudável:</strong> 10-25%</li>
            <li><strong>RED FLAG:</strong> Negativo = mercado em declínio</li>
        </ul>`,

    numCompetitors: `<strong>Competidores DIRETOS (fazendo exatamente a mesma coisa)</strong>
        <ul>
            <li>0-3: Mercado novo ou nicho</li>
            <li>4-10: Competição saudável</li>
            <li>10+: Mercado saturado</li>
        </ul>`,

    // STEP 4: Produto
    productStage: "Estágio atual do desenvolvimento do produto. Afeta significativamente o score de risco.",

    differentiation: `<strong>Seja honesto na avaliação:</strong>
        <br>10x melhor = Não há comparação | Similar = Feature parity | Me-too = Cópia descarada`,

    seanEllis: `<strong>Pergunta: "How would you feel if you could no longer use [product]?"</strong>
        <ul>
            <li><strong>≥40%:</strong> PMF atingido (strong)</li>
            <li><strong>30-40%:</strong> Early PMF</li>
            <li><strong><30%:</strong> Ainda buscando PMF</li>
        </ul>
        <em>Exemplos: Slack 51%, Superhuman 58%</em>`,

    nps: `<strong>Net Promoter Score: "Qual probabilidade de recomendar?"</strong>
        <br>NPS = % Promoters (9-10) - % Detractors (0-6)
        <ul>
            <li>>70: World Class</li>
            <li>50-70: Excellent</li>
            <li>30-50: Good (mediana B2B SaaS)</li>
        </ul>`,

    dau: "Usuários únicos que usam o produto POR DIA (média 30 dias). <strong>Conta apenas ação core, não apenas login.</strong>",

    mau: "Usuários únicos nos últimos 30 dias. <strong>Mesma definição de 'ativo' do DAU.</strong>",

    cohortRetention: `<strong>% onde curva de retenção se estabiliza</strong>
        <ul>
            <li>≥35%: Strong PMF</li>
            <li>15-35%: Moderate PMF</li>
            <li>5-15%: Weak PMF</li>
            <li>→0%: No PMF</li>
        </ul>`,

    techQuality: "Como avaliar se não é técnico: Pergunte ao CTO <strong>'Você tem medo de fazer deploys?'</strong>",

    scalability: "<strong>Sistema aguenta 10x usuários sem rebuild?</strong> Cloud-native escala fácil. Monolito requer reescrita.",

    security: "<strong>Importante:</strong> Enterprise B2B exige SOC 2. Sem isso, não vende para grandes empresas.",

    // STEP 5: Métricas SaaS
    mrr: `<strong>MRR = Monthly Recurring Revenue</strong>
        <ul>
            <li><strong>Inclui:</strong> Planos mensais + 1/12 anuais</li>
            <li><strong>NÃO inclui:</strong> Setup fees, serviços profissionais</li>
        </ul>`,

    arr: "Calculado automaticamente: MRR × 12",

    totalCustomers: "Clientes PAGANTES ativos (não trials ou freemium).",

    arpa: `<strong>ARPA = MRR / Clientes</strong> Indica segmento:
        <br>$0-$100: Consumer | $100-$500: SMB | $500-$2K: Mid-Market | $2K+: Enterprise`,

    growthRate: `<strong>((ARR atual - ARR há 12 meses) / ARR há 12 meses) × 100</strong>
        <br>Benchmarks: Seed 200%+ | Series A 115% | Series B 95% | Growth 60%`,

    monthlyChurn: `<strong>Churn% = (Clientes perdidos / Clientes início mês) × 100</strong>
        <ul>
            <li><strong>Enterprise:</strong> <1% mensal</li>
            <li><strong>SMB:</strong> 3-5% mensal</li>
            <li><strong>RED FLAG:</strong> >10% mensal</li>
        </ul>`,

    nrr: `<strong>A MÉTRICA MAIS CRÍTICA para SaaS!</strong>
        <br>Para cada 1% aumento em NRR → valor empresa sobe 12% em 5 anos
        <ul>
            <li><strong>120%+:</strong> BEST - Múltiplos 10-15x</li>
            <li><strong>110-120%:</strong> Better - Múltiplos 7-10x</li>
            <li><strong>100-110%:</strong> Good - Múltiplos 5-7x</li>
            <li><strong><90%:</strong> Problemático - Múltiplos 1-2x</li>
        </ul>`,

    grr: `<strong>GRR = Receita retida SEM expansion</strong>
        <br>Nunca passa de 100%. Mostra stickiness.
        <br>Benchmarks: Enterprise 95%+ | Mid-Market 90-95% | SMB 85-90%`,

    logoRetention: `<strong>% de CLIENTES (não receita) que renovam anualmente</strong>
        <ul>
            <li>>90%: Strong (moat defensável)</li>
            <li>80-90%: Good</li>
            <li><70%: Weak (problema de retention)</li>
        </ul>`,

    newMRR: "Receita de clientes NOVOS no último mês.",

    expansionMRR: "Upsells, cross-sells, upgrades de clientes existentes.",

    churnedMRR: "Receita perdida de clientes que cancelaram.",

    contractionMRR: "Receita perdida de downgrades.",

    customerConcentration: `<strong>% receita dos TOP 10 clientes</strong>
        <ul>
            <li><30%: Excelente diversificação</li>
            <li>30-50%: Aceitável mas monitor</li>
            <li>>50%: RED FLAG - risco concentrado</li>
            <li>Single >15%: RED FLAG crítico</li>
        </ul>`,

    // STEP 6: Financeiro
    salesMarketingSpend: `<strong>Incluir tudo de S&M:</strong>
        <br>Salários (sales, marketing, SDRs, CS) + Ferramentas (HubSpot, Ads) + Eventos + Conteúdo
        <br><strong>NÃO incluir:</strong> R&D, G&A, Cloud`,

    newCustomersQuarter: "Clientes PAGANTES que fecharam no trimestre (primeiro pagamento recebido). Não conta trials.",

    grossMargin: `<strong>Gross Margin = (Revenue - COGS) / Revenue × 100</strong>
        <ul>
            <li><strong>COGS:</strong> Hosting, APIs, Support</li>
            <li><strong>Benchmarks:</strong> 80%+ Excelente | 70-80% Saudável | <60% Problema</li>
        </ul>`,

    ebitdaMargin: `<strong>Lucro operacional antes de juros/impostos</strong>
        <br>Contexto por estágio: Seed -50% a -100% NORMAL | Series B -20% a -40% | Pre-IPO 0% a +20%`,

    cash: "Inclui: Conta corrente + Investimentos líquidos (<30 dias). <strong>NÃO incluir:</strong> AR ($ a receber).",

    monthlyBurn: `<strong>Quanto você GASTA por mês (absoluto)</strong>
        <br>Burn = Despesas - Receita
        <br>Usado para calcular Runway (Cash / Burn)`,

    totalRaised: "Total de capital levantado em todas as rodadas até agora.",

    currentValuation: "Valuation Pre-Money da última rodada (ou atual se não levantou recentemente).",

    seekingAmount: "Quanto capital está buscando levantar nesta rodada.",

    previousQuarterARR: "ARR do trimestre ANTERIOR. Usado para calcular Magic Number (eficiência S&M).",

    revenuePerEmployee: `<strong>ARR / Total Funcionários</strong>
        <br>Benchmarks: Seed $42K | Series A $90K | Series B+ $120K+ | Público $200K+`,

    totalEmployees: "Total de funcionários (full-time equivalents). Inclui founders."
};

// Função para injetar tooltips automaticamente
function injectTooltips() {
    Object.keys(tooltipData).forEach(fieldId => {
        const input = document.getElementById(fieldId);
        if (!input) return;

        const label = input.closest('.form-group')?.querySelector('label');
        if (!label || label.querySelector('.info-icon')) return; // Já tem tooltip

        // Criar estrutura do tooltip
        const wrapper = document.createElement('div');
        wrapper.className = 'label-with-tooltip';

        const infoIcon = document.createElement('span');
        infoIcon.className = 'info-icon';

        const tooltipContent = document.createElement('span');
        tooltipContent.className = 'tooltip-content';
        tooltipContent.innerHTML = tooltipData[fieldId];

        infoIcon.appendChild(tooltipContent);

        // Reorganizar DOM
        label.parentNode.insertBefore(wrapper, label);
        wrapper.appendChild(label);
        wrapper.appendChild(infoIcon);
    });
}

// Executar quando o DOM carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectTooltips);
} else {
    injectTooltips();
}
