# 📝 Descrições Completas de Todos os Campos

Este documento contém descrições detalhadas para COPIAR e COLAR no HTML principal.

---

## STEP 4: PRODUTO E PRODUCT-MARKET FIT

### Sean Ellis PMF Score (%)
```html
<div class="field-description">
    <strong>Como medir:</strong>
    Pergunte a usuários que usaram o produto 2x+ nas últimas 2 semanas:
    <br><em>"How would you feel if you could no longer use [product]?"</em>
    <ul>
        <li>Very disappointed</li>
        <li>Somewhat disappointed</li>
        <li>Not disappointed</li>
    </ul>
    <strong>Sean Ellis Score = % que respondeu "Very disappointed"</strong>
    <ul>
        <li><strong>≥40%:</strong> PMF atingido (strong)</li>
        <li><strong>30-40%:</strong> Early PMF</li>
        <li><strong><30%:</strong> Ainda buscando PMF</li>
    </ul>
    <strong>Exemplos reais:</strong> Slack 51%, Superhuman começou 22% e otimizou para 58%
    <br><strong>Mínimo de respondentes:</strong> 40+ para ser estatisticamente válido
</div>
```

### NPS - Net Promoter Score
```html
<div class="field-description">
    <strong>Como medir:</strong>
    Pergunte: <em>"Qual probabilidade de você recomendar [produto] para um amigo/colega?"</em>
    <br>Escala de 0-10:
    <ul>
        <li><strong>9-10:</strong> Promoters (fãs, indicam ativamente)</li>
        <li><strong>7-8:</strong> Passives (satisfeitos mas não evangelizam)</li>
        <li><strong>0-6:</strong> Detractors (insatisfeitos, podem falar mal)</li>
    </ul>
    <strong>NPS = % Promoters - % Detractors</strong> (range: -100 a +100)
    <ul>
        <li><strong>>70:</strong> World Class (Apple, Tesla)</li>
        <li><strong>50-70:</strong> Excellent</li>
        <li><strong>30-50:</strong> Good</li>
        <li><strong>0-30:</strong> Needs improvement</li>
        <li><strong><0:</strong> Critical issues</li>
    </ul>
    <strong>Benchmark B2B SaaS:</strong> 30-40 é mediana, 50+ é top quartile
</div>
```

### DAU - Daily Active Users
```html
<div class="field-description">
    <strong>O que contar:</strong>
    Número de usuários únicos que usam o produto POR DIA (média dos últimos 30 dias).
    <ul>
        <li><strong>Conta como "ativo":</strong> Fez login + realizou ação core (não apenas abriu)</li>
        <li><strong>B2B SaaS:</strong> Conte apenas dias úteis (segunda a sexta)</li>
        <li><strong>Não conta:</strong> Visitas passivas, apenas recebeu email</li>
    </ul>
    <strong>Por que importa:</strong> DAU/MAU ratio indica stickiness (produto vicia?)
</div>
```

### MAU - Monthly Active Users
```html
<div class="field-description">
    <strong>O que contar:</strong>
    Usuários únicos que usaram produto pelo menos 1x nos últimos 30 dias.
    <ul>
        <li><strong>Mesma definição de "ativo":</strong> Ação core, não apenas login</li>
        <li><strong>Cuidado:</strong> Não inflar com usuários inativos ou trial expirado</li>
    </ul>
    <strong>DAU/MAU Benchmarks:</strong>
    <ul>
        <li>Social Media: 50%+</li>
        <li>B2C SaaS: 20-40%</li>
        <li>B2B SaaS (workdays): 10-40%</li>
    </ul>
</div>
```

### Cohort Retention Flatten (%)
```html
<div class="field-description">
    <strong>O que é:</strong>
    Porcentagem de usuários que permanecem após a curva de retenção se estabilizar ("flatten").
    <br><br>
    <strong>Como calcular:</strong>
    <ol>
        <li>Pegue cohort de usuários que começaram em Jan/2024</li>
        <li>Veja % que ainda usa após Mês 1, 2, 3, 4, 5, 6...</li>
        <li>Curva vai cair mas em algum ponto "achata" (flatten)</li>
        <li>Esse % é sua retenção de long-term</li>
    </ol>
    <strong>Exemplos:</strong>
    <ul>
        <li>Mês 1: 100% | Mês 2: 60% | Mês 3: 42% | Mês 4: 38% | Mês 5: 37% | Mês 6: 36%</li>
        <li>Flatten = <strong>~36-37%</strong></li>
    </ul>
    <strong>Interpretação:</strong>
    <ul>
        <li><strong>≥35%:</strong> Strong PMF</li>
        <li><strong>15-35%:</strong> Moderate PMF</li>
        <li><strong>5-15%:</strong> Weak PMF</li>
        <li><strong>→0%:</strong> No PMF (churn infinito)</li>
    </ul>
</div>
```

### Diferenciação vs Competidores
```html
<div class="field-description">
    <strong>Avalie honestamente:</strong>
    <ul>
        <li><strong>10x melhor:</strong> Não há comparação, competidor é piada (iPhone vs Blackberry)</li>
        <li><strong>Claramente superior:</strong> Vence em 3-4 dimensões importantes</li>
        <li><strong>Diferenciação moderada:</strong> Melhor em 1-2 coisas, pior em outras</li>
        <li><strong>Similar:</strong> Feature parity, competição em preço/marketing</li>
        <li><strong>Me-too:</strong> Cópia descarada, zero diferenciação</li>
    </ul>
    <strong>Red flag:</strong> Se você não consegue articular diferenciação em 1 frase, há problema.
</div>
```

### Qualidade Técnica
```html
<div class="field-description">
    <strong>Avalie o estado atual do código e infraestrutura:</strong>
    <ul>
        <li><strong>Excelente:</strong> CI/CD automatizado, testes 80%+, deploy sem medo, documentado</li>
        <li><strong>Boa:</strong> Código limpo, alguns testes, deploy controlado, minor tech debt</li>
        <li><strong>Adequada:</strong> Funciona mas precisa refactoring, teste manual, deploy nervoso</li>
        <li><strong>Tech debt:</strong> Código confuso, sem testes, bugs recorrentes, medo de mexer</li>
        <li><strong>Severa:</strong> Sistema frágil, incêndios constantes, requer rebuild</li>
    </ul>
    <strong>Como avaliar se não é técnico:</strong> Pergunte ao CTO "Você tem medo de fazer deploys?"
</div>
```

### Escalabilidade
```html
<div class="field-description">
    <strong>Sistema aguenta 10x usuários sem rebuild?</strong>
    <ul>
        <li><strong>Cloud-native:</strong> Auto-scaling, serverless, horizontal scaling fácil</li>
        <li><strong>Bem arquitetado:</strong> Escala com esforço mas não requer reescrita</li>
        <li><strong>Adequado atual:</strong> Funciona para tamanho atual, requer investimento para 10x</li>
        <li><strong>Limitações:</strong> Gargalos conhecidos, vertical scaling apenas</li>
        <li><strong>Single point:</strong> Se banco cair, tudo cai. Monolito frágil.</li>
    </ul>
</div>
```

### Segurança
```html
<div class="field-description">
    <strong>Nível de maturidade de segurança:</strong>
    <ul>
        <li><strong>SOC 2 Type II:</strong> Auditoria completa, enterprise-ready, GDPR/LGPD</li>
        <li><strong>SOC 2 em progresso:</strong> Contratou auditor, estimativa 6-12 meses</li>
        <li><strong>Básica:</strong> HTTPS, encryption at rest, basic auth, sem pentest</li>
        <li><strong>Gaps:</strong> Sabe que tem problemas mas não priorizou</li>
        <li><strong>Significativos:</strong> Dados em plain text, sem 2FA, vulnerabilidades conhecidas</li>
    </ul>
    <strong>Importante:</strong> Enterprise B2B exige SOC 2. Sem isso, não vende para grandes empresas.
</div>
```

---

## STEP 5: MÉTRICAS SAAS

### MRR - Monthly Recurring Revenue
```html
<div class="field-description">
    <strong>O que incluir:</strong>
    Receita RECORRENTE mensal de assinaturas ativas (em USD).
    <ul>
        <li><strong>Inclui:</strong> Planos mensais + 1/12 de planos anuais</li>
        <li><strong>NÃO inclui:</strong> One-time fees, setup fees, serviços profissionais</li>
        <li><strong>Exemplo:</strong> 10 clientes × $500/mês = $5.000 MRR</li>
    </ul>
    <strong>Componentes do MRR:</strong>
    <ul>
        <li><strong>New MRR:</strong> Clientes novos este mês</li>
        <li><strong>Expansion MRR:</strong> Upsells/upgrades de clientes existentes</li>
        <li><strong>Contraction MRR:</strong> Downgrades</li>
        <li><strong>Churned MRR:</strong> Cancelamentos</li>
    </ul>
    <strong>Net New MRR = New + Expansion - Contraction - Churned</strong>
</div>
```

### ARPA - Average Revenue Per Account
```html
<div class="field-description">
    <strong>Como calcular:</strong>
    ARPA = MRR Total / Número de Clientes Pagantes
    <ul>
        <li><strong>Exemplo:</strong> $50.000 MRR ÷ 100 clientes = $500 ARPA</li>
    </ul>
    <strong>Por que importa:</strong>
    ARPA indica seu segmento de mercado:
    <ul>
        <li><strong>$0-$100/mês:</strong> SMB/Consumer (CAC baixo mas churn alto)</li>
        <li><strong>$100-$500/mês:</strong> SMB (sweet spot para PLG)</li>
        <li><strong>$500-$2.000/mês:</strong> Mid-Market (sales-assisted)</li>
        <li><strong>$2.000+/mês:</strong> Enterprise (sales team necessário)</li>
    </ul>
    <strong>Regra de ouro:</strong> ARPA deve ser 3x+ seu CAC para unit economics saudáveis.
</div>
```

### Growth Rate YoY (%)
```html
<div class="field-description">
    <strong>Como calcular:</strong>
    Growth = ((ARR atual - ARR há 12 meses) / ARR há 12 meses) × 100
    <ul>
        <li><strong>Exemplo:</strong> ARR dez/2024 = $3M | ARR dez/2023 = $1M</li>
        <li>Growth = ($3M - $1M) / $1M = 200%</li>
    </ul>
    <strong>Benchmarks por estágio (Bessemer VIP 2024):</strong>
    <ul>
        <li><strong>Seed ($0-$1M ARR):</strong> 200%+ (top quartile 230%+)</li>
        <li><strong>Series A ($1-$10M):</strong> 115% (top 135%+)</li>
        <li><strong>Series B ($10-$25M):</strong> 95% (top 110%+)</li>
        <li><strong>Growth ($25M+):</strong> 60% (top 80%+)</li>
    </ul>
    <strong>Growth Endurance:</strong> Empresas saudáveis mantêm ~70% do growth rate YoY.
</div>
```

### Monthly Churn Rate (%)
```html
<div class="field-description">
    <strong>Como calcular (Logo Churn):</strong>
    Churn% = (Clientes perdidos no mês / Clientes no início do mês) × 100
    <ul>
        <li><strong>Exemplo:</strong> Perdeu 8 de 100 clientes = 8% monthly churn</li>
    </ul>
    <strong>Benchmarks MENSAIS aceitáveis:</strong>
    <ul>
        <li><strong>Enterprise B2B:</strong> <1% (12% anual)</li>
        <li><strong>Mid-Market:</strong> 1-2% (12-24% anual)</li>
        <li><strong>SMB:</strong> 3-5% (30-50% anual)</li>
        <li><strong>Consumer/Low-touch:</strong> 5-10%</li>
    </ul>
    <strong>RED FLAG:</strong> >10% monthly = modelo quebrado
    <br><br>
    <strong>Annual Churn ≠ Monthly × 12:</strong>
    <br>Annual = 1 - (1 - monthly%)^12
    <br>Exemplo: 5% monthly = 46% annual (não 60%!)
</div>
```

### NRR - Net Revenue Retention (%)
```html
<div class="field-description">
    <strong>A MÉTRICA MAIS CRÍTICA para SaaS</strong>
    <br><br>
    <strong>Como calcular:</strong>
    <ol>
        <li>Pegue cohort de clientes de Jan/2024 com $100K MRR</li>
        <li>Em Jan/2025, quanto esse mesmo cohort gera? (ignora novos clientes)</li>
        <li>Se gera $120K = NRR de 120%</li>
    </ol>
    <strong>Fórmula:</strong> NRR = (ARR início - churn - contraction + expansion) / ARR início × 100
    <br><br>
    <strong>Benchmarks (Bessemer):</strong>
    <ul>
        <li><strong>120%+:</strong> BEST - Múltiplos de 10-15x ARR</li>
        <li><strong>110-120%:</strong> Better - Múltiplos de 7-10x</li>
        <li><strong>100-110%:</strong> Good - Múltiplos de 5-7x</li>
        <li><strong>90-100%:</strong> Needs improvement</li>
        <li><strong><90%:</strong> Problemático - Múltiplos de 1-2x apenas</li>
    </ul>
    <strong>Por que é tão importante:</strong>
    <ul>
        <li>Para cada 1% aumento em NRR → valor empresa sobe 12% em 5 anos</li>
        <li>NRR >100% = crescimento orgânico sem novos clientes</li>
        <li>Indica satisfaction + expansion revenue (upsells)</li>
    </ul>
    <strong>Exemplos IPO:</strong>
    <ul>
        <li>Snowflake: 158% NRR</li>
        <li>Datadog: 130%+ NRR</li>
    </ul>
</div>
```

### GRR - Gross Revenue Retention (%)
```html
<div class="field-description">
    <strong>O que é:</strong>
    GRR = Receita retida SEM contar expansion (upsells).
    <br><br>
    <strong>Fórmula:</strong> GRR = (ARR início - churn - contraction) / ARR início × 100
    <ul>
        <li><strong>Diferença do NRR:</strong> GRR nunca passa de 100% (não tem expansion)</li>
        <li><strong>GRR mostra:</strong> Quanto você mantém (stickiness)</li>
        <li><strong>NRR mostra:</strong> Quanto cresce dentro da base</li>
    </ul>
    <strong>Benchmarks:</strong>
    <ul>
        <li><strong>Enterprise:</strong> 95%+ (churn <5% anual)</li>
        <li><strong>Mid-Market:</strong> 90-95%</li>
        <li><strong>SMB:</strong> 85-90%</li>
    </ul>
    <strong>Exemplo:</strong>
    <br>Cohort com $100K ARR:
    <ul>
        <li>Churn: -$8K</li>
        <li>Contraction: -$3K</li>
        <li>Expansion: +$25K</li>
        <li><strong>GRR:</strong> ($100K - $8K - $3K) / $100K = 89%</li>
        <li><strong>NRR:</strong> ($100K - $8K - $3K + $25K) / $100K = 114%</li>
    </ul>
</div>
```

### Logo Retention (% anual)
```html
<div class="field-description">
    <strong>O que é:</strong>
    Percentual de CLIENTES (não receita) que renovam anualmente.
    <br><br>
    <strong>Como calcular:</strong>
    <br>Logo Retention = (Clientes que renovaram / Clientes elegíveis para renovar) × 100
    <ul>
        <li><strong>Exemplo:</strong> De 100 clientes com renewal em 2024, 92 renovaram = 92%</li>
    </ul>
    <strong>Benchmarks:</strong>
    <ul>
        <li><strong>>90%:</strong> Strong (moat defensável)</li>
        <li><strong>80-90%:</strong> Good</li>
        <li><strong>70-80%:</strong> Acceptable (SMB)</li>
        <li><strong><70%:</strong> Weak (problema de retention)</li>
    </ul>
    <strong>Logo vs Revenue Retention:</strong>
    <ul>
        <li>Logo Retention pode ser 90% mas Revenue Retention 110% (porque clientes que ficam, expandem)</li>
    </ul>
</div>
```

### SaaS Quick Ratio
```html
<div class="field-description">
    <strong>Métrica de saúde de crescimento</strong>
    <br><br>
    <strong>Fórmula:</strong>
    <br>Quick Ratio = (New MRR + Expansion MRR) / (Churned MRR + Contraction MRR)
    <br><br>
    <strong>Interpretação:</strong>
    <ul>
        <li><strong>≥4:</strong> Startup extremamente saudável (crescimento acelerado)</li>
        <li><strong>2-4:</strong> OK, crescendo mas pode melhorar</li>
        <li><strong>1-2:</strong> Preocupante, crescimento neutralizado por churn</li>
        <li><strong><1:</strong> RED FLAG crítico - perdendo mais do que ganha</li>
    </ul>
    <strong>Exemplo:</strong>
    <ul>
        <li>New MRR: $35K</li>
        <li>Expansion: $18K</li>
        <li>Churn: $8K</li>
        <li>Contraction: $3K</li>
        <li><strong>Quick Ratio = ($35K + $18K) / ($8K + $3K) = 4.8</strong> ✓ Excelente</li>
    </ul>
    <strong>Contexto 2024:</strong> Média indústria declinou de 2.55 (2021) para 1.82 (2024).
</div>
```

### Customer Concentration (%)
```html
<div class="field-description">
    <strong>O que medir:</strong>
    Percentual da receita que vem dos TOP 10 clientes.
    <br><br>
    <strong>Como calcular:</strong>
    <br>(ARR dos 10 maiores clientes / ARR total) × 100
    <br><br>
    <strong>Benchmarks:</strong>
    <ul>
        <li><strong><30%:</strong> Excelente diversificação</li>
        <li><strong>30-50%:</strong> Aceitável mas monitor</li>
        <li><strong>>50%:</strong> RED FLAG - risco concentrado</li>
        <li><strong>Single customer >15%:</strong> RED FLAG crítico</li>
    </ul>
    <strong>Por que importa:</strong>
    <ul>
        <li>Perder 1 cliente pode quebrar a empresa</li>
        <li>Cliente grande tem poder de negociação (price pressure)</li>
        <li>Dificulta exit/aquisição (comprador tem medo)</li>
    </ul>
    <strong>Exemplo de problema real:</strong>
    <br>Startup com 60% revenue em 1 cliente. Cliente não renovou → layoff de 40% do time.
</div>
```

---

## STEP 6: UNIT ECONOMICS E FINANCEIRO

### Sales & Marketing Spend (último trimestre)
```html
<div class="field-description">
    <strong>O que incluir (tudo relacionado a S&M):</strong>
    <ul>
        <li><strong>Salários:</strong> Time de sales, marketing, SDRs, customer success</li>
        <li><strong>Ferramentas:</strong> HubSpot, Salesforce, Google Ads, LinkedIn Ads</li>
        <li><strong>Mídia paga:</strong> Ads, sponsorships, events</li>
        <li><strong>Conteúdo:</strong> Agências, freelancers, produção</li>
        <li><strong>Eventos:</strong> Conferências, booth, travel</li>
    </ul>
    <strong>NÃO incluir:</strong>
    <ul>
        <li>R&D / Produto</li>
        <li>G&A (finance, legal, HR)</li>
        <li>Infraestrutura / Cloud costs</li>
    </ul>
    <strong>Por que importa:</strong>
    Usado para calcular CAC e Magic Number (eficiência de S&M).
</div>
```

### Novos Clientes (último trimestre)
```html
<div class="field-description">
    <strong>O que contar:</strong>
    Clientes PAGANTES que fecharam no trimestre (não trials ou freemium).
    <ul>
        <li><strong>Conta:</strong> Primeiro pagamento recebido</li>
        <li><strong>Não conta:</strong> Trials, freemium, POC sem compromisso</li>
    </ul>
    <strong>Usado para:</strong>
    <br>CAC = S&M Spend / Novos Clientes
    <br><br>
    <strong>Ajuste se necessário:</strong>
    Se ciclo de vendas é longo (6+ meses), considerar lag entre spend e conversão.
</div>
```

### CAC - Customer Acquisition Cost
```html
<div class="field-description">
    <strong>Calculado automaticamente:</strong>
    <br>CAC = S&M Spend Trimestral / Novos Clientes Trimestre
    <br><br>
    <strong>Tipos de CAC:</strong>
    <ul>
        <li><strong>Blended CAC:</strong> Todos os clientes (orgânico + pago)</li>
        <li><strong>Paid CAC:</strong> Apenas canais pagos</li>
    </ul>
    Diferença revela saúde de crescimento orgânico.
    <br><br>
    <strong>Benchmarks por segmento:</strong>
    <ul>
        <li><strong>SMB SaaS:</strong> $200-$500</li>
        <li><strong>Mid-Market:</strong> $500-$5.000</li>
        <li><strong>Enterprise:</strong> $5.000-$50.000+</li>
    </ul>
    <strong>Regra crítica:</strong> LTV deve ser 3x+ CAC (mínimo)
</div>
```

### LTV - Lifetime Value
```html
<div class="field-description">
    <strong>Calculado automaticamente:</strong>
    <br>LTV = (ARPA × Gross Margin%) / Churn Rate%
    <br><br>
    <strong>O que significa:</strong>
    Quanto lucro você gera de um cliente durante toda vida dele.
    <br><br>
    <strong>Exemplo:</strong>
    <ul>
        <li>ARPA: $500/mês</li>
        <li>Gross Margin: 80%</li>
        <li>Monthly Churn: 3%</li>
        <li><strong>LTV = ($500 × 0.80) / 0.03 = $13.333</strong></li>
    </ul>
    <strong>Interpretação:</strong>
    <ul>
        <li>Cliente médio fica 1/churn = 1/0.03 = 33 meses</li>
        <li>Gera $500 × 33 = $16.500 revenue bruto</li>
        <li>Com 80% margin = $13.333 lucro</li>
    </ul>
</div>
```

### LTV/CAC Ratio
```html
<div class="field-description">
    <strong>A métrica FUNDAMENTAL de unit economics</strong>
    <br><br>
    <strong>Calculado:</strong> LTV / CAC
    <br><br>
    <strong>Benchmarks:</strong>
    <ul>
        <li><strong>>5:1:</strong> Excelente mas pode estar subinvestindo em growth</li>
        <li><strong>3:1-5:1:</strong> IDEAL - sweet spot</li>
        <li><strong>2:1-3:1:</strong> Aceitável, precisa melhorar</li>
        <li><strong><2:1:</strong> Modelo insustentável - perde dinheiro em cada cliente</li>
    </ul>
    <strong>Por vertical (médias):</strong>
    <ul>
        <li>B2B SaaS: 4:1</li>
        <li>Cybersecurity: 5:1</li>
        <li>Fintech: 5:1</li>
    </ul>
    <strong>Importante:</strong>
    <ul>
        <li>Ratio >5 pode indicar que você deveria investir MAIS em S&M para crescer faster</li>
        <li>VCs preferem ver 3:1 com crescimento rápido do que 10:1 com crescimento lento</li>
    </ul>
</div>
```

### CAC Payback Period
```html
<div class="field-description">
    <strong>Calculado automaticamente:</strong>
    <br>CAC Payback = CAC / (ARPA × Gross Margin%)
    <br><br>
    <strong>O que significa:</strong>
    Quantos MESES você leva para recuperar o custo de adquirir cliente.
    <br><br>
    <strong>Exemplo:</strong>
    <ul>
        <li>CAC: $1.500</li>
        <li>ARPA: $500/mês</li>
        <li>Gross Margin: 75%</li>
        <li><strong>Payback = $1.500 / ($500 × 0.75) = 4 meses</strong></li>
    </ul>
    <strong>Benchmarks:</strong>
    <ul>
        <li><strong>0-6 meses:</strong> BEST (capital efficient)</li>
        <li><strong>6-12 meses:</strong> Better (saudável)</li>
        <li><strong>12-18 meses:</strong> Good (típico SaaS)</li>
        <li><strong>18-24 meses:</strong> Aceitável para Enterprise</li>
        <li><strong>>24 meses:</strong> Preocupante (requer muito capital)</li>
    </ul>
    <strong>Por que importa:</strong>
    Quanto mais rápido payback → menos capital necessário para crescer.
</div>
```

### Gross Margin (%)
```html
<div class="field-description">
    <strong>Como calcular:</strong>
    <br>Gross Margin = (Revenue - COGS) / Revenue × 100
    <br><br>
    <strong>O que incluir em COGS (Cost of Goods Sold):</strong>
    <ul>
        <li><strong>Hosting:</strong> AWS, GCP, Azure (infra direta)</li>
        <li><strong>Third-party APIs:</strong> OpenAI, Twilio, Stripe fees</li>
        <li><strong>Customer Success:</strong> Onboarding, support (debatível)</li>
    </ul>
    <strong>NÃO incluir:</strong>
    <ul>
        <li>R&D / Engineering</li>
        <li>Sales & Marketing</li>
        <li>G&A</li>
    </ul>
    <strong>Benchmarks SaaS:</strong>
    <ul>
        <li><strong>80%+:</strong> Excelente (SaaS puro, low infra)</li>
        <li><strong>70-80%:</strong> Saudável (benchmark padrão)</li>
        <li><strong>60-70%:</strong> OK mas pode melhorar</li>
        <li><strong><60%:</strong> Problema estrutural (AI-heavy pode justificar)</li>
    </ul>
    <strong>Por estágio:</strong>
    <ul>
        <li>Early-stage: 65-70% OK</li>
        <li>Growth+: 75%+ esperado</li>
    </ul>
</div>
```

### EBITDA Margin (%)
```html
<div class="field-description">
    <strong>O que é:</strong>
    EBITDA = Earnings Before Interest, Taxes, Depreciation, Amortization
    <br>Simplificado: Lucro operacional antes de juros/impostos.
    <br><br>
    <strong>Como calcular:</strong>
    <br>EBITDA Margin = EBITDA / Revenue × 100
    <br><br>
    <strong>Contexto por estágio:</strong>
    <ul>
        <li><strong>Seed/Series A:</strong> -50% a -100% é NORMAL (burn para crescer)</li>
        <li><strong>Series B:</strong> -20% a -40%</li>
        <li><strong>Series C+:</strong> -10% a +10%</li>
        <li><strong>Pre-IPO:</strong> 0% a +20%</li>
    </ul>
    <strong>Rule of 40:</strong>
    <br>Growth Rate% + EBITDA Margin% ≥ 40%
    <ul>
        <li>Exemplo: 60% growth + (-20%) EBITDA = 40% ✓</li>
        <li>Ou: 20% growth + 20% EBITDA = 40% ✓</li>
    </ul>
</div>
```

### Rule of 40
```html
<div class="field-description">
    <strong>A métrica que define empresas SaaS de classe mundial</strong>
    <br><br>
    <strong>Fórmula:</strong>
    <br>Rule of 40 = Growth Rate% + EBITDA Margin%
    <br><br>
    <strong>Interpretação:</strong>
    <ul>
        <li><strong>≥60%:</strong> Top tier, unicorn potential</li>
        <li><strong>40-60%:</strong> Excelente, VC-backable</li>
        <li><strong>20-40%:</strong> Moderado, comum em privadas</li>
        <li><strong><20%:</strong> Abaixo do esperado</li>
    </ul>
    <strong>Contexto:</strong>
    <ul>
        <li>Apenas 15% das empresas PRIVADAS atingem Rule of 40</li>
        <li>Mediana privadas: 12-34%</li>
        <li>Maioria públicas: 40%+</li>
    </ul>
    <strong>Trade-off:</strong>
    <ul>
        <li>Early-stage: Prioriza Growth (100% growth, -60% EBITDA = 40%)</li>
        <li>Late-stage: Balanceia (40% growth, 0% EBITDA = 40%)</li>
        <li>Mature: Prioriza Profit (10% growth, 30% EBITDA = 40%)</li>
    </ul>
    <strong>Bessemer "Rule of X":</strong> Crescimento vale 2-3x mais que profitabilidade para late-stage cloud.
</div>
```

### Cash / Equivalentes
```html
<div class="field-description">
    <strong>O que incluir:</strong>
    <ul>
        <li>Dinheiro em conta corrente</li>
        <li>Investimentos líquidos (CDB, Tesouro, etc)</li>
        <li>Qualquer ativo convertível em <30 dias</li>
    </ul>
    <strong>NÃO incluir:</strong>
    <ul>
        <li>AR (accounts receivable - $ a receber)</li>
        <li>Equity investments</li>
        <li>Inventory (se aplicável)</li>
    </ul>
</div>
```

### Monthly Burn Rate
```html
<div class="field-description">
    <strong>O que é:</strong>
    Quanto você GASTA por mês (valor absoluto, sempre positivo).
    <br><br>
    <strong>Como calcular:</strong>
    <br>Burn = Despesas Mensais - Receita Mensal
    <ul>
        <li><strong>Exemplo:</strong> $150K despesas - $30K receita = $120K burn</li>
    </ul>
    <strong>Componentes:</strong>
    <ul>
        <li>Payroll (maior parte)</li>
        <li>Cloud / Infra</li>
        <li>Marketing spend</li>
        <li>Office / SG&A</li>
    </ul>
    <strong>Usado para calcular Runway:</strong>
    <br>Runway = Cash / Monthly Burn
</div>
```

### Runway (meses)
```html
<div class="field-description">
    <strong>Calculado automaticamente:</strong>
    <br>Runway = Cash / Monthly Burn
    <br><br>
    <strong>O que significa:</strong>
    Quantos meses você aguenta antes de zerar caixa (sem levantar $).
    <br><br>
    <strong>Benchmarks:</strong>
    <ul>
        <li><strong>18+ meses:</strong> Confortável, pode focar em execução</li>
        <li><strong>12-18 meses:</strong> Saudável, começar prep para próxima rodada</li>
        <li><strong>6-12 meses:</strong> Atenção, acelerar fundraising</li>
        <li><strong><6 meses:</strong> CRITICAL - modo emergência</li>
    </ul>
    <strong>Regra de fundraising:</strong>
    <ul>
        <li>Series Seed/A: leva 3-6 meses</li>
        <li>Series B+: leva 6-9 meses</li>
        <li>Começar quando runway = 12-15 meses</li>
    </ul>
</div>
```

### Magic Number
```html
<div class="field-description">
    <strong>Métrica de eficiência de S&M</strong>
    <br><br>
    <strong>Fórmula:</strong>
    <br>Magic Number = ((ARR atual - ARR trimestre anterior) × 4) / S&M Spend trimestre anterior
    <br><br>
    <strong>O que significa:</strong>
    Para cada $1 gasto em S&M, quanto de ARR incremental você gera (anualizado).
    <br><br>
    <strong>Exemplo:</strong>
    <ul>
        <li>ARR Q4: $3M | ARR Q3: $2.5M</li>
        <li>S&M Spend Q3: $180K</li>
        <li>Magic = (($3M - $2.5M) × 4) / $180K = $2M / $180K = 1.11</li>
    </ul>
    <strong>Interpretação:</strong>
    <ul>
        <li><strong>>1.0:</strong> Muito eficiente - investir MAIS em S&M!</li>
        <li><strong>0.75-1.0:</strong> Eficiente - escalar com confiança</li>
        <li><strong>0.5-0.75:</strong> Aceitável - otimizar antes de escalar</li>
        <li><strong><0.5:</strong> Ineficiente - revisar go-to-market</li>
    </ul>
    <strong>Nota:</strong> Magic Number >1 indica que você está subinvestindo em growth.
</div>
```

### Revenue per Employee
```html
<div class="field-description">
    <strong>Como calcular:</strong>
    <br>Revenue per Employee = ARR / Total de Funcionários
    <br><br>
    <strong>Benchmarks por estágio (Bessemer):</strong>
    <ul>
        <li><strong>Seed:</strong> $42K (mediana) | $80K (top quartile)</li>
        <li><strong>Series A:</strong> $90K (mediana) | $150K (top)</li>
        <li><strong>Series B+:</strong> $120K+ (mediana)</li>
        <li><strong>Público:</strong> $200K+ (efficient at scale)</li>
    </ul>
    <strong>O que indica:</strong>
    <ul>
        <li>Eficiência operacional</li>
        <li>Level de automation</li>
        <li>Qualidade de hiring</li>
    </ul>
    <strong>Nota:</strong>
    <ul>
        <li>Baixo revenue/employee em early-stage é OK (investindo em produto)</li>
        <li>Growth-stage deve melhorar essa métrica</li>
    </ul>
</div>
```

---

## Resumo de Uso

**Como integrar ao HTML:**

1. Copie cada `<div class="field-description">` para o campo correspondente
2. Cole logo APÓS o `<input>` ou `<select>` do campo
3. Ajuste formatação se necessário

**Exemplo de integração:**
```html
<div class="form-group">
    <label for="seanEllis">Sean Ellis PMF Score (%) *</label>
    <input type="number" id="seanEllis" name="seanEllis" min="0" max="100" step="1" required>

    <!-- COLE A DESCRIÇÃO AQUI -->
    <div class="field-description">
        <strong>Como medir:</strong>
        Pergunte a usuários que usaram o produto 2x+ nas últimas 2 semanas:
        ...
    </div>
</div>
```

Isso tornará CADA campo autoexplicativo para quem está preenchendo!
