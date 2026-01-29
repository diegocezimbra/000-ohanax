# Especificação Completa: Seções Adicionais do Investment Evaluator v2

Este documento detalha todas as seções que devem ser adicionadas ao formulário HTML para atingir 100% de cobertura do manual de avaliação de investimentos.

---

## 1. SEÇÃO: Frameworks de Valuation

### 1.1 Berkus Method (Pre-Revenue)

**Propósito:** Avaliar startups sem receita atribuindo valor a elementos de redução de risco.

**Quando usar:** Empresas pre-seed/seed sem MRR significativo.

**Campos de Input:**

| Campo | Tipo | Opções/Range | Peso |
|-------|------|--------------|------|
| Ideia Sólida (Risco de Produto) | Select 0-5 | 0 = Não validada, 1 = Conceito inicial, 2 = Problema validado, 3 = Solução validada, 4 = Early adopters interessados, 5 = Demanda comprovada | $0-500K |
| Protótipo/MVP (Risco Tecnológico) | Select 0-5 | 0 = Apenas ideia, 1 = Wireframes, 2 = Protótipo clickável, 3 = MVP funcional, 4 = Produto beta, 5 = Produto production-ready | $0-500K |
| Equipe de Qualidade (Risco de Execução) | Select 0-5 | 0 = Solo founder inexperiente, 1 = Time incompleto, 2 = Time básico, 3 = Time sólido, 4 = Time experiente, 5 = All-star team com exits | $0-500K |
| Relacionamentos Estratégicos (Risco de Mercado) | Select 0-5 | 0 = Sem network, 1 = Contatos iniciais, 2 = Advisors relevantes, 3 = Parcerias LOI, 4 = Parcerias assinadas, 5 = Clientes enterprise comprometidos | $0-500K |
| Rollout/Vendas Iniciais (Risco de Produção) | Select 0-5 | 0 = Sem vendas, 1 = Primeiros users gratuitos, 2 = Primeiros pagantes, 3 = Receita recorrente inicial, 4 = Crescimento consistente, 5 = Product-market fit evidente | $0-500K |

**Cálculos Automáticos:**
```javascript
berkusValuation = (ideiaScore/5 * 500000) + (prototipoScore/5 * 500000) + 
                  (equipeScore/5 * 500000) + (relacionamentosScore/5 * 500000) + 
                  (rolloutScore/5 * 500000)

// Max: $2.5M pre-money
// Ajuste regional (opcional): multiplicador para mercados diferentes (ex: Brasil = 0.6x)
```

**Output Visual:**
- Barra de progresso para cada elemento (0-$500K)
- Valuation total calculado em destaque
- Comparação com range típico do estágio
- Indicador se está dentro/fora do range esperado

**Benchmarks Visuais:**
- $0-$500K = Pre-seed muito early
- $500K-$1M = Pre-seed típico
- $1M-$1.5M = Pre-seed forte
- $1.5M-$2M = Seed early
- $2M-$2.5M = Seed com tração

---

### 1.2 Risk Factor Summation Method

**Propósito:** Ajustar valuation base por 12 fatores de risco específicos.

**Campos de Input:**

| Fator de Risco | Tipo | Range | Impacto |
|----------------|------|-------|---------|
| Management Risk | Select | -2 a +2 | -$500K a +$500K |
| Stage of Business | Select | -2 a +2 | -$500K a +$500K |
| Legislation/Political Risk | Select | -2 a +2 | -$500K a +$500K |
| Manufacturing Risk | Select | -2 a +2 | -$500K a +$500K |
| Sales/Marketing Risk | Select | -2 a +2 | -$500K a +$500K |
| Funding/Capital Risk | Select | -2 a +2 | -$500K a +$500K |
| Competition Risk | Select | -2 a +2 | -$500K a +$500K |
| Technology Risk | Select | -2 a +2 | -$500K a +$500K |
| Litigation Risk | Select | -2 a +2 | -$500K a +$500K |
| International Risk | Select | -2 a +2 | -$500K a +$500K |
| Reputation Risk | Select | -2 a +2 | -$500K a +$500K |
| Exit Potential Risk | Select | -2 a +2 | -$500K a +$500K |

**Opções para cada fator:**
- -2 = Risco muito alto (red flag)
- -1 = Risco acima da média
- 0 = Risco neutro/médio
- +1 = Risco abaixo da média
- +2 = Risco muito baixo (vantagem clara)

**Input Adicional:**
- Valuation Base (input numérico): Valuation mediana de comparáveis no mercado

**Cálculo Automático:**
```javascript
totalAdjustment = sum(allFactors) * 250000  // cada ponto = $250K
adjustedValuation = baseValuation + totalAdjustment
```

**Output Visual:**
- Lista dos 12 fatores com indicadores coloridos (-2 vermelho, +2 verde)
- Soma total do ajuste
- Valuation final ajustado
- Gráfico radar dos 12 fatores

---

### 1.3 VC Method

**Propósito:** Calcular valuation trabalhando retroativamente do exit esperado.

**Campos de Input:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| Investment Amount | Number | Valor do investimento proposto |
| Projected Revenue at Exit | Number | Revenue projetado no ano do exit |
| Years to Exit | Number (1-10) | Tempo esperado até exit |
| Exit Multiple | Number | Múltiplo de revenue esperado no exit (ex: 6x) |
| Target ROI | Select | Baseado no estágio |

**Opções de Target ROI:**
- Pre-seed: 100% (2x), 150% (2.5x), 200% (3x)
- Seed: 70% (1.7x), 100% (2x), 150% (2.5x)
- Series A: 50% (1.5x), 75% (1.75x), 100% (2x)
- Series B+: 30% (1.3x), 40% (1.4x), 50% (1.5x)

**Cálculos Automáticos:**
```javascript
terminalValue = projectedRevenue * exitMultiple
postMoneyValuation = terminalValue / Math.pow(1 + targetROI, yearsToExit)
preMoneyValuation = postMoneyValuation - investmentAmount
ownershipRequired = investmentAmount / postMoneyValuation * 100
```

**Output Visual:**
- Terminal Value projetado
- Post-Money Valuation
- Pre-Money Valuation
- % Ownership que investidor receberá
- Tabela de sensibilidade (variando ROI e múltiplo)
- Comparação com valuation pedido (se informado)

**Tabela de Sensibilidade (gerada automaticamente):**
```
Exit Multiple →    4x      5x      6x      7x      8x
ROI ↓
30%              $XXM    $XXM    $XXM    $XXM    $XXM
50%              $XXM    $XXM    $XXM    $XXM    $XXM
75%              $XXM    $XXM    $XXM    $XXM    $XXM
100%             $XXM    $XXM    $XXM    $XXM    $XXM
```

---

### 1.4 First Chicago Method (Scenario Analysis)

**Propósito:** Valuation ponderada por cenários probabilísticos.

**Campos de Input para CADA CENÁRIO (Best/Base/Worst):**

| Campo | Best Case | Base Case | Worst Case |
|-------|-----------|-----------|------------|
| Probabilidade (%) | Input (20-30% típico) | Input (40-60% típico) | Input (20-30% típico) |
| Revenue Year 5 | Number | Number | Number |
| Exit Multiple | Number | Number | Number |
| Discount Rate | Number | Number | Number |

**Validação:** Soma das probabilidades deve = 100%

**Descrição dos Cenários (texto de ajuda):**
- **Best Case:** Tudo funciona - crescimento acelerado, expansão de mercado, exit premium
- **Base Case:** Setbacks razoáveis - crescimento moderado, alguns pivots, exit típico
- **Worst Case:** Falha significativa - crescimento lento, down-round ou liquidação parcial

**Cálculos Automáticos:**
```javascript
// Para cada cenário
scenarioValue = (revenue * multiple) / Math.pow(1 + discountRate, 5)

// Valor ponderado
weightedValuation = (bestValue * bestProb) + (baseValue * baseProb) + (worstValue * worstProb)
```

**Output Visual:**
- 3 cards mostrando cada cenário com seu valor
- Gráfico de barras comparando os 3 cenários
- Valor ponderado final em destaque
- Indicador de dispersão (desvio entre cenários)

---

## 2. SEÇÃO: Due Diligence Legal Completo

### 2.1 Estrutura Corporativa

**Campos de Input:**

| Campo | Tipo | Opções |
|-------|------|--------|
| Jurisdição de Incorporação | Select | Delaware C-Corp (ideal), Delaware LLC, Cayman Islands, Brasil LTDA, Brasil S/A, Outro |
| Status do Certificate of Incorporation | Select | ✓ Completo e atualizado, ⚠ Precisa revisão, ✗ Problemas identificados, N/A |
| Bylaws Atualizados | Select | ✓ Sim, ⚠ Desatualizado, ✗ Não existe |
| Board Resolutions Documentadas | Select | ✓ Todas documentadas, ⚠ Parcialmente, ✗ Não documentadas |
| Good Standing Certificates | Select | ✓ Todas jurisdições OK, ⚠ Pendências menores, ✗ Problemas |
| Organograma com Subsidiárias | Select | ✓ Claro e documentado, ⚠ Incompleto, ✗ Não existe |

**Scoring:**
- Cada ✓ = 2 pontos
- Cada ⚠ = 1 ponto
- Cada ✗ = 0 pontos
- Delaware C-Corp = +2 pontos bônus

**Output:** Score de Estrutura Corporativa (0-14 pontos) com indicador visual

---

### 2.2 Cap Table Analysis

**Campos de Input:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| Total Shareholders | Number | Número de acionistas |
| Founders Ownership (%) | Number | % total dos founders |
| ESOP Pool (%) | Number | % reservado para opções |
| SAFEs Outstanding | Number ($) | Valor total de SAFEs pendentes |
| Convertible Notes Outstanding | Number ($) | Valor total de notas conversíveis |
| 409A Valuation Date | Date | Data da última 409A |
| 409A Valuation Amount | Number | Valor da última 409A |

**Checklists (Sim/Não/Parcial):**
- [ ] Vesting schedules documentados para todos founders
- [ ] 83(b) elections filed para todos founders
- [ ] Option agreements padronizados
- [ ] Fully diluted cap table disponível
- [ ] Histórico de todas as rodadas documentado

**Red Flags Automáticos (baseado nos inputs):**
```javascript
redFlags = []
if (foundersOwnership < stageExpectedOwnership) redFlags.push("Founder ownership baixo para o estágio")
if (totalShareholders > 15) redFlags.push("Cap table complexo (>15 shareholders)")
if (esopPool < 10) redFlags.push("ESOP pool pequeno (<10%)")
if (esopPool > 25) redFlags.push("ESOP pool muito grande (>25%)")
if (daysSince409A > 365) redFlags.push("409A desatualizada (>12 meses)")
```

**Cálculos Automáticos:**
- Fully Diluted Shares (estimativa)
- Conversion price dos SAFEs/Notes
- Diluição esperada na rodada atual
- Comparação ownership vs benchmark do estágio

---

### 2.3 IP e Propriedade Intelectual

**Campos de Input:**

| Campo | Tipo | Opções |
|-------|------|--------|
| Patents Issued | Number | Quantidade |
| Patents Pending | Number | Quantidade |
| Trademarks Registered | Number | Quantidade |
| IP Assignment Status | Select | ✓ Todos assinados (founders/employees/contractors), ⚠ Parcial, ✗ Gaps identificados |
| Open Source Compliance | Select | ✓ Audit completo OK, ⚠ Audit pendente, ✗ Problemas identificados |
| Freedom to Operate Opinion | Select | ✓ Obtido, ⚠ Em andamento, ✗ Não obtido, N/A |
| Trade Secrets Documentation | Select | ✓ Documentado, ⚠ Parcial, ✗ Não documentado |

**Checklists Detalhados:**

**IP Assignments:**
- [ ] Todos founders assinaram IP assignment
- [ ] Todos employees assinaram IP assignment
- [ ] Todos contractors assinaram IP assignment
- [ ] Consultants e advisors incluídos
- [ ] Nenhum IP criado antes da empresa sem assignment

**Open Source:**
- [ ] Inventário de todas bibliotecas open source
- [ ] Licenças GPL identificadas e tratadas
- [ ] Política de uso de open source implementada
- [ ] Nenhuma violação de licença conhecida

**Output Visual:**
- Score de IP Protection (0-100)
- Lista de red flags identificados
- Recomendações de ação

---

## 3. SEÇÃO: Due Diligence Técnico Expandido

### 3.1 Code Quality Assessment

**Campos de Input:**

| Campo | Tipo | Opções (Eficode 1-5) |
|-------|------|---------------------|
| Overall Code Health | Select | 1 = Excelente, 2 = Bom com minor issues, 3 = Moderate concerns, 4 = Significant tech debt, 5 = Beyond repair |
| Test Coverage (%) | Number | 0-100% |
| CI/CD Maturity | Select | 1 = Fully automated, 2 = Mostly automated, 3 = Partial, 4 = Manual mostly, 5 = No CI/CD |
| Documentation Quality | Select | 1-5 scale |
| Code Review Process | Select | ✓ Mandatory PRs, ⚠ Informal, ✗ None |

**Métricas Técnicas (se disponíveis):**
- Cyclomatic Complexity (média)
- Code Duplication (%)
- Dependencies desatualizadas (quantidade)
- Known vulnerabilities (quantidade)

---

### 3.2 Security Assessment

**Campos de Input:**

| Campo | Tipo | Opções |
|-------|------|--------|
| SOC 2 Type II Status | Select | ✓ Certified, ⚠ Type I only, ⚠ In progress, ✗ Not started |
| SOC 2 Certification Date | Date | Data da certificação |
| ISO 27001 Status | Select | ✓ Certified, ⚠ In progress, ✗ Not started, N/A |
| Penetration Test - Last Date | Date | Data do último pentest |
| Penetration Test - Critical Findings | Number | Findings críticos não resolvidos |
| Bug Bounty Program | Select | ✓ Active, ⚠ Planned, ✗ None |
| Security Incidents (last 24mo) | Number | Quantidade de incidentes |
| Data Breach History | Select | ✓ None, ⚠ Minor incidents, ✗ Major breach |

**Data Protection Checklist:**
- [ ] Encryption at rest implementada
- [ ] Encryption in transit (TLS 1.2+)
- [ ] PII handling policy documentada
- [ ] Data retention policy implementada
- [ ] GDPR/LGPD compliance (se aplicável)
- [ ] Right to deletion implementado

**OWASP Top 10 Compliance:**
- [ ] Injection prevention
- [ ] Broken Authentication addressed
- [ ] Sensitive Data Exposure mitigated
- [ ] XXE prevention
- [ ] Access Control implemented
- [ ] Security Misconfiguration addressed
- [ ] XSS prevention
- [ ] Insecure Deserialization addressed
- [ ] Components with vulnerabilities tracked
- [ ] Logging & Monitoring implemented

**Output:**
- Security Score (0-100)
- Compliance checklist visual
- Risk indicators por área
- Estimated cost to remediate gaps

---

### 3.3 Architecture & Scalability

**Campos de Input:**

| Campo | Tipo | Opções |
|-------|------|--------|
| Architecture Type | Select | Monolith, Modular Monolith, Microservices, Serverless, Hybrid |
| Cloud Provider | Select | AWS, GCP, Azure, Multi-cloud, On-premise, Hybrid |
| Single Points of Failure | Number | Quantidade identificada |
| Auto-scaling Implemented | Select | ✓ Yes, ⚠ Partial, ✗ No |
| Database Type | Select | SQL, NoSQL, Multi-model, Time-series |
| Database Scaling | Select | ✓ Horizontally scalable, ⚠ Vertical only, ✗ Limited |
| Load Testing - Max RPS | Number | Requests per second testado |
| Load Testing - 10x Current Traffic | Select | ✓ Passed, ⚠ Issues identified, ✗ Not tested |
| Disaster Recovery RTO | Number (hours) | Recovery Time Objective |
| Disaster Recovery RPO | Number (hours) | Recovery Point Objective |
| Multi-region Deployment | Select | ✓ Yes, ⚠ Planned, ✗ No |

**Technical Debt Assessment:**
- Estimated months to address critical debt
- Impact on development velocity (%)
- Refactoring roadmap exists (Y/N)

**Output:**
- Scalability Score (0-100)
- Single Points of Failure list
- Capacity vs current usage ratio
- Estimated infrastructure cost at 10x scale

---

## 4. SEÇÃO: Due Diligence Financeiro Expandido

### 4.1 Revenue Quality Assessment

**Campos de Input:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| Total Revenue (LTM) | Number | Receita últimos 12 meses |
| Recurring Revenue (%) | Number | % que é recorrente |
| One-time Revenue (%) | Number | % de receita não-recorrente |
| Services Revenue (%) | Number | % de serviços/consulting |
| ASC 606 Compliant | Select | ✓ Yes, ⚠ Partial, ✗ No |
| Deferred Revenue | Number | Total de receita diferida |
| Revenue Recognition Policy | Textarea | Descrição da política |

**Revenue por Cohort (inputs opcionais para análise avançada):**
- Cohort Q1: MRR inicial → MRR atual
- Cohort Q2: MRR inicial → MRR atual
- Cohort Q3: MRR inicial → MRR atual
- Cohort Q4: MRR inicial → MRR atual

**Cálculos:**
```javascript
revenueQualityScore = (recurringPct * 0.5) + (100 - servicesPct) * 0.3 + (asc606Score * 20)
```

---

### 4.2 Quality of Earnings (QoE) - PE Standard

**Campos de Input:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| Reported EBITDA | Number | EBITDA reportado |
| Adjustments - One-time Expenses | Number | Gastos não-recorrentes |
| Adjustments - Owner Compensation | Number | Compensação acima do mercado |
| Adjustments - Related Party | Number | Transações com partes relacionadas |
| Adjustments - Pro Forma | Number | Ajustes pro forma |
| Adjusted EBITDA | Number (calculado) | EBITDA ajustado |

**Proof of Cash:**
- [ ] Bank statements reconciled
- [ ] Revenue tied to deposits
- [ ] Expenses tied to payments
- [ ] No unexplained variances

**Working Capital Analysis:**
- Accounts Receivable (Average Days)
- Accounts Payable (Average Days)
- Inventory Days (if applicable)
- Net Working Capital Trend

**Output:**
- EBITDA Bridge visual (reported → adjusted)
- Quality of Earnings Score
- Red flags de revenue recognition
- Working capital requirements estimate

---

### 4.3 Customer Analysis

**Campos de Input:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| Total Customers | Number | Total de clientes pagantes |
| Top Customer Revenue (%) | Number | % do maior cliente |
| Top 5 Customers Revenue (%) | Number | % dos top 5 |
| Top 10 Customers Revenue (%) | Number | % dos top 10 |
| Average Contract Length | Number (months) | Duração média |
| Multi-year Contracts (%) | Number | % em contratos >12 meses |
| Auto-renewal Rate (%) | Number | % que renova automaticamente |

**Customer Health:**
- Customers with NPS >8: ___
- Customers at risk of churn: ___
- Customers expanding: ___
- Customers contracting: ___

**Red Flags Automáticos:**
```javascript
if (topCustomerPct > 25) flag("Alta dependência de único cliente")
if (top10Pct > 50) flag("Concentração significativa")
if (avgContractLength < 12) flag("Contratos curtos - maior risco de churn")
```

---

## 5. SEÇÃO: Porter's 5 Forces Completo

### Campos de Input (cada força 1-5):

| Força | Campo | Opções |
|-------|-------|--------|
| **Ameaça de Novos Entrantes** | newEntrantsThreat | 1 = Muito baixa (barreiras altas), 2 = Baixa, 3 = Moderada, 4 = Alta, 5 = Muito alta (fácil entrar) |
| **Poder dos Fornecedores** | supplierPower | 1 = Muito baixo, 2 = Baixo, 3 = Moderado, 4 = Alto, 5 = Muito alto |
| **Poder dos Compradores** | buyerPower | 1 = Muito baixo (lock-in), 2 = Baixo, 3 = Moderado, 4 = Alto, 5 = Muito alto (commodity) |
| **Ameaça de Substitutos** | substitutesThreat | 1 = Muito baixa, 2 = Baixa, 3 = Moderada, 4 = Alta, 5 = Muito alta |
| **Rivalidade Competitiva** | competitiveRivalry | 1 = Muito baixa (blue ocean), 2 = Baixa, 3 = Moderada, 4 = Alta, 5 = Muito alta (saturado) |

**Para cada força, campos descritivos:**
- Principais fatores (textarea)
- Tendência (Melhorando / Estável / Piorando)
- Mitigantes identificados (textarea)

**Cálculos:**
```javascript
// Score invertido (menor = melhor para a empresa)
industryAttractiveness = 100 - ((newEntrants + suppliers + buyers + substitutes + rivalry) / 25 * 100)
```

**Output Visual:**
- Diagrama de Porter's 5 Forces (pentágono)
- Cada força colorida (verde/amarelo/vermelho)
- Score de atratividade da indústria
- Comparação com médias de SaaS

---

## 6. SEÇÃO: Risk Matrix Visual

### Campos de Input (expandido do existente):

| Categoria de Risco | Likelihood (1-5) | Impact (1-5) | Mitigants |
|-------------------|------------------|--------------|-----------|
| Market Risk | Select | Select | Textarea |
| Technology Risk | Select | Select | Textarea |
| Execution Risk | Select | Select | Textarea |
| Team/People Risk | Select | Select | Textarea |
| Financial/Capital Risk | Select | Select | Textarea |
| Regulatory/Compliance Risk | Select | Select | Textarea |
| Competition Risk | Select | Select | Textarea |
| Timing Risk | Select | Select | Textarea |

**Likelihood Scale:**
1 = Muito improvável (<10%)
2 = Improvável (10-25%)
3 = Possível (25-50%)
4 = Provável (50-75%)
5 = Muito provável (>75%)

**Impact Scale:**
1 = Insignificante
2 = Menor
3 = Moderado
4 = Maior
5 = Catastrófico

**Cálculos:**
```javascript
riskScore = likelihood * impact
// Por risco: 1-6 = Low, 7-14 = Medium, 15-25 = High/Critical
```

**Output Visual:**
- Risk Matrix 5x5 (heatmap)
- Cada risco plotado na matriz
- Código de cores: Verde (1-6), Amarelo (7-14), Vermelho (15-25)
- Lista priorizada de riscos (maior score primeiro)
- Total Risk Score ponderado

**Risk Response Strategy (auto-sugerido):**
```javascript
if (riskScore <= 6) strategy = "Accept"
else if (riskScore <= 14 && likelihood > impact) strategy = "Monitor"
else if (riskScore <= 14 && impact > likelihood) strategy = "Mitigate"
else strategy = "Critical Priority - Mitigate/Avoid"
```

---

## 7. SEÇÃO: Exit Readiness Scorecard

### 7.1 Financial Readiness

**Checklist com Pontuação:**

| Item | Status | Pontos |
|------|--------|--------|
| 3 years clean audited financials | ✓/⚠/✗ | 0-10 |
| Revenue recognition (ASC 606) compliant | ✓/⚠/✗ | 0-5 |
| EBITDA positive or clear path | ✓/⚠/✗ | 0-10 |
| Gross margins >70% | ✓/⚠/✗ | 0-5 |
| NRR >100% | ✓/⚠/✗ | 0-10 |
| Rule of 40 compliant | ✓/⚠/✗ | 0-5 |
| Clean cap table | ✓/⚠/✗ | 0-5 |
| No outstanding litigation | ✓/⚠/✗ | 0-5 |

### 7.2 Operational Readiness

| Item | Status | Pontos |
|------|--------|--------|
| Management team in place (not founder-dependent) | ✓/⚠/✗ | 0-10 |
| Documented processes and SOPs | ✓/⚠/✗ | 0-5 |
| Customer concentration <15% per customer | ✓/⚠/✗ | 0-5 |
| Key contracts assignable | ✓/⚠/✗ | 0-5 |
| IP fully documented and protected | ✓/⚠/✗ | 0-5 |
| No key person risk | ✓/⚠/✗ | 0-5 |
| Scalable infrastructure | ✓/⚠/✗ | 0-5 |

### 7.3 Strategic Readiness

| Item | Status | Pontos |
|------|--------|--------|
| Clear growth story articulated | ✓/⚠/✗ | 0-5 |
| Identified potential acquirers | ✓/⚠/✗ | 0-5 |
| Investment banker selected (if applicable) | ✓/⚠/✗ | 0-3 |
| Data room prepared | ✓/⚠/✗ | 0-5 |
| CIM (Confidential Information Memorandum) ready | ✓/⚠/✗ | 0-5 |
| Management presentation ready | ✓/⚠/✗ | 0-3 |

**Cálculos:**
```javascript
totalPossiblePoints = 100
exitReadinessScore = sumOfAllPoints
readinessLevel = score >= 80 ? "Exit Ready" : score >= 60 ? "Needs Work" : "Not Ready"
```

**Output Visual:**
- Score total (0-100)
- Breakdown por categoria (Financial/Operational/Strategic)
- Checklist visual com status de cada item
- Timeline sugerido para exit (baseado no score)
- Gap analysis: itens críticos faltando

---

## 8. SEÇÃO: Deal Memo Template

### Campos de Input:

**Header Section:**
| Campo | Tipo |
|-------|------|
| Company Name | Text |
| Deal Lead | Text |
| Date | Date |
| Round Type | Select (Seed, Series A, B, C, Growth) |
| Round Size | Number |
| Pre-Money Valuation | Number |
| Post-Money Valuation | Number (calculado) |
| Ownership % | Number (calculado) |
| Lead Investor | Text |
| Co-investors | Textarea |

**Executive Summary (auto-gerado + editável):**
```javascript
// Template auto-preenchido baseado nos dados do formulário
executiveSummary = `${companyName} é uma empresa de ${vertical} em estágio ${stage} 
com ARR de $${arr} crescendo ${arrGrowth}% YoY. A empresa demonstra ${pmfStatus} 
com NRR de ${nrr}% e LTV/CAC de ${ltvCac}x. O investimento de $${roundSize} 
representa ${ownership}% da empresa a uma valuation de $${preMoney} pre-money 
(${arrMultiple}x ARR).`
```

**Sections (cada uma é textarea editável com template):**

1. **Team Summary**
   - Template: Background dos founders, experiência relevante, gaps na equipe

2. **Problem & Solution**
   - Template: Pain point específico, como o produto resolve, diferenciação

3. **Market Analysis**
   - Template: TAM/SAM/SOM, growth rate, timing, competitive landscape

4. **Business Model**
   - Template: Revenue model, pricing, unit economics summary

5. **Traction**
   - Template: Key metrics, growth trajectory, notable customers

6. **Risks & Mitigants**
   - Template: Top 3-5 riscos e como mitigar cada um

7. **Investment Thesis**
   - Template: Por que investir, por que agora, path to exit, expected return

**Auto-populate Options:**
- Botão "Gerar Memo" que preenche templates baseado nos dados já inputados
- Cada seção pode ser editada manualmente
- Export para PDF/DOCX

---

## 9. SEÇÃO: IC Process Tracker

### Campos de Status:

| Stage | Status | Date | Notes |
|-------|--------|------|-------|
| Sourcing | Select: Inbound/Outbound/Referral | Date | Text |
| Initial Screening | Select: Passed/Rejected/Pending | Date | Text |
| Management Meeting | Select: Completed/Scheduled/Pending | Date | Text |
| IC Memo Presentation | Select: Approved/Rejected/Pending | Date | Text |
| Confirmatory Diligence | Select: Completed/In Progress/Not Started | Date | Text |
| Term Sheet | Select: Sent/Negotiating/Signed/Rejected | Date | Text |
| Closing | Select: Completed/Pending/Failed | Date | Text |

**Go/No-Go Checklist:**

| Red Line Criteria | Status |
|-------------------|--------|
| Founder integrity/ethics concerns | ✓ Clear / ✗ Concern |
| Cap table issues irreparáveis | ✓ Clear / ✗ Concern |
| Founder commitment questionável | ✓ Clear / ✗ Concern |
| Mercado em declínio/commoditizado | ✓ Clear / ✗ Concern |
| Valuation expectations insustentáveis | ✓ Clear / ✗ Concern |
| Regulatory/legal red flags | ✓ Clear / ✗ Concern |
| Fora do investment thesis/mandate | ✓ Clear / ✗ Concern |

**Output:**
- Timeline visual do processo
- Status atual destacado
- Dias em cada estágio
- Blockers identificados

---

## 10. SEÇÃO: Exit Multiples Reference

### Tabela de Referência (display only, não input):

**Por Vertical (2024-2025):**
| Vertical | EV/Revenue (Low) | EV/Revenue (Median) | EV/Revenue (High) |
|----------|------------------|---------------------|-------------------|
| Cybersecurity | 6x | 8x | 10x |
| AI-Native | 8x | 12x | 15x+ |
| Fintech | 5x | 6.5x | 8x |
| Healthcare | 4x | 5.5x | 7x |
| Vertical SaaS | 5x | 6.5x | 8x |
| Horizontal SaaS | 3x | 4x | 5x |
| DevTools | 5x | 7x | 10x |

**Por NRR:**
| NRR Range | Typical Multiple |
|-----------|------------------|
| <90% | 1-2x |
| 90-100% | 3-5x |
| 100-110% | 5-7x |
| 110-120% | 7-10x |
| >120% | 10-15x |

**Campos de Input para Estimativa:**
- Select: Vertical da empresa
- Input: NRR atual
- Input: Growth Rate YoY
- Input: Gross Margin

**Cálculo de Expected Multiple:**
```javascript
baseMultiple = verticalMultiples[selectedVertical].median
nrrAdjustment = calculateNRRAdjustment(nrr)
growthAdjustment = growthRate > 100 ? 1.5 : growthRate > 50 ? 1.2 : 1.0
marginAdjustment = grossMargin > 80 ? 1.2 : grossMargin > 70 ? 1.0 : 0.8

expectedMultiple = baseMultiple * nrrAdjustment * growthAdjustment * marginAdjustment
expectedValuation = arr * expectedMultiple
```

**Output:**
- Expected multiple range (low/median/high)
- Expected valuation range
- Comparação com valuation pedido
- Gap analysis se overpriced

---

## 11. INTEGRAÇÃO E SCORING FINAL

### Pesos Atualizados (com novas seções):

| Categoria | Peso | Seções Incluídas |
|-----------|------|------------------|
| Team | 20% | Avaliação de Equipe, Cap Table Health |
| Market | 15% | Análise de Mercado, Porter's 5 Forces |
| Product | 12% | Produto e Tecnologia, PMF Metrics |
| Moat | 8% | 7 Powers Framework |
| Financial | 18% | Métricas SaaS, QoE, Revenue Quality |
| Traction | 10% | Tração e Crescimento |
| Valuation | 7% | Valuation Frameworks, Comparables |
| Risk | 5% | Risk Matrix, Due Diligence |
| Exit Potential | 5% | Exit Readiness, Expected Multiples |

### Score Final Calculation:

```javascript
// Cada categoria tem score 0-100
weightedScore = 
    (teamScore * 0.20) +
    (marketScore * 0.15) +
    (productScore * 0.12) +
    (moatScore * 0.08) +
    (financialScore * 0.18) +
    (tractionScore * 0.10) +
    (valuationScore * 0.07) +
    (riskScore * 0.05) +
    (exitScore * 0.05)

// Penalties
redFlagPenalty = numberOfRedFlags * 2
criticalRiskPenalty = numberOfCriticalRisks * 5

finalScore = Math.max(0, weightedScore - redFlagPenalty - criticalRiskPenalty)
```

### Veredicto Final:

| Score Range | Veredicto | Descrição |
|-------------|-----------|-----------|
| 80-100 | 🟢 STRONG INVEST | Oportunidade excepcional. Prosseguir agressivamente. |
| 70-79 | 🟢 INVEST | Fundamentos sólidos. Due diligence final recomendada. |
| 60-69 | 🟡 CONDITIONAL INVEST | Potencial mas com ressalvas. Negociar termos. |
| 50-59 | 🟡 HOLD / MONITOR | Aguardar melhorias em áreas específicas. |
| 40-49 | 🟠 WEAK PASS | Riscos superam potencial. Passar a menos que melhore. |
| <40 | 🔴 STRONG PASS | Não investir. Múltiplos red flags ou fundamentos fracos. |

---

## PRÓXIMOS PASSOS

Para implementar todas essas seções no HTML, o formulário precisará:

1. **Expandir de ~10 para ~18 seções**
2. **Adicionar ~150 novos campos de input**
3. **Implementar ~30 novos cálculos automáticos**
4. **Criar 5 novos componentes visuais:**
   - Risk Matrix Heatmap
   - Porter's 5 Forces Diagram
   - EBITDA Bridge Chart
   - Exit Timeline
   - Scenario Analysis Chart

5. **Adicionar sistema de tabs/accordion** para organizar o volume de informação
6. **Implementar save/load** para não perder progresso
7. **Criar versão simplificada vs completa** (toggle)

Estimo que o HTML completo terá ~4000-5000 linhas de código.
