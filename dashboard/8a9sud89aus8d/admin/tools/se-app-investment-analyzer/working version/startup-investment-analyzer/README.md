# 🚀 Startup Investment Analyzer

## Framework Completo de Análise VC para Investimentos em Startups

Uma aplicação web interativa e profissional para análise completa de investimentos em startups, baseada em frameworks de **Bessemer Venture Partners**, **Sequoia**, **a16z**, **Y Combinator**, **NFX** e **Hamilton Helmer**.

---

## 📋 Índice

- [Características](#-características)
- [Como Usar](#-como-usar)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Frameworks Implementados](#-frameworks-implementados)
- [Métricas Calculadas](#-métricas-calculadas)
- [Sistema de Scoring](#-sistema-de-scoring)
- [Tecnologias](#-tecnologias)

---

## ✨ Características

### 🎯 Análise Multi-Dimensional

- **7 Etapas de Avaliação**: Informações Básicas, Equipe, Mercado, Produto, Métricas, Financeiro e Relatório
- **Cálculos em Tempo Real**: Todas as métricas são calculadas dinamicamente conforme você preenche
- **Score Ponderado**: Sistema de scoring 0-100 com pesos específicos por categoria
- **Benchmarks Automáticos**: Comparação automática com benchmarks da indústria por estágio

### 📊 Métricas Implementadas

**Equipe:**
- Founder-Market Fit Score (NFX Framework)
- Avaliação de experiência e comprometimento
- Cap table health check

**Mercado:**
- TAM/SAM/SOM com validação bottom-up
- Porter's Five Forces
- Market timing e enablers

**Produto:**
- Sean Ellis Test (PMF)
- NPS e engagement metrics
- DAU/MAU ratio
- Cohort retention analysis

**Métricas SaaS:**
- ARR/MRR
- Net Revenue Retention (NRR)
- Gross Revenue Retention (GRR)
- SaaS Quick Ratio
- Logo retention

**Unit Economics:**
- CAC (Customer Acquisition Cost)
- LTV (Lifetime Value)
- LTV/CAC Ratio
- CAC Payback Period
- Magic Number
- Rule of 40

**Financeiro:**
- Gross Margin
- EBITDA Margin
- Runway
- Revenue per Employee

### 🎨 Interface

- **Design Moderno**: UI/UX inspirada em dashboards de VC profissionais
- **Responsivo**: Funciona perfeitamente em desktop, tablet e mobile
- **Gradientes e Animações**: Transições suaves e feedback visual em tempo real
- **Dark/Light Elements**: Hierarquia visual clara com uso estratégico de cores

---

## 🚀 Como Usar

### 1. Abrir a Aplicação

```bash
# Navegue até a pasta do projeto
cd startup-investment-analyzer

# Abra o index.html no seu navegador
# Duplo clique no arquivo OU
# Use um servidor local (recomendado):
python -m http.server 8000
# Acesse: http://localhost:8000
```

### 2. Preencher o Formulário

1. **Etapa 1 - Informações Básicas**
   - Nome da empresa, estágio, vertical
   - Problema/solução e "Why Now"

2. **Etapa 2 - Equipe**
   - Avalie os founders usando o Founder-Market Fit Framework
   - Deslize os sliders (1-5) para cada categoria
   - Preencha experiência e ownership

3. **Etapa 3 - Mercado**
   - TAM/SAM/SOM (valores em USD)
   - Porter's Five Forces
   - Enablers de mercado

4. **Etapa 4 - Produto**
   - Sean Ellis score, NPS
   - DAU/MAU para engagement
   - Avaliação técnica

5. **Etapa 5 - Métricas**
   - MRR/ARR
   - Churn e retention
   - Componentes de MRR

6. **Etapa 6 - Financeiro**
   - S&M spend e CAC
   - Gross margin e EBITDA
   - Cash e runway

7. **Etapa 7 - Relatório**
   - Clique em "Gerar Relatório Final"
   - Veja o score, breakdown por categoria
   - Leia insights, pontos fortes e riscos
   - Recomendação de investimento

### 3. Interpretar os Resultados

**Score Total (0-100):**
- **80-100**: 🟢 STRONG INVEST - Prosseguir agressivamente
- **70-79**: 🟢 INVEST - Due diligence final
- **60-69**: 🟡 CONDITIONAL - Negociar termos
- **50-59**: 🟡 HOLD - Aguardar melhorias
- **40-49**: 🟠 WEAK PASS - Passar a menos que melhore
- **<40**: 🔴 STRONG PASS - Não investir

---

## 📁 Estrutura do Projeto

```
startup-investment-analyzer/
│
├── index.html              # Página principal com formulário multi-etapas
├── README.md              # Este arquivo
│
├── css/
│   └── style.css          # Estilos completos (gradientes, animações, responsivo)
│
├── js/
│   └── app.js             # Lógica de cálculos, scoring e relatório
│
└── assets/
    └── (imagens futuras)
```

---

## 🧮 Frameworks Implementados

### 1. **Founder-Market Fit Framework (NFX)**

Score de 7-35 pontos baseado em:
- Obsession (1-5)
- Domain Knowledge (1-5)
- Track Record (1-5)
- Network Access (1-5)
- Personal Experience (1-5)
- Industry Experience (1-5)
- Previous Startup (1-5)

**Interpretação:**
- 30-35: Excepcional
- 22-29: Forte
- 15-21: Moderado
- 8-14: Fraco

### 2. **Sean Ellis PMF Test**

Pergunta: "How would you feel if you could no longer use [product]?"

**Benchmark:** ≥40% "Very Disappointed" = PMF atingido

### 3. **Porter's Five Forces**

Score de 1-5 (menor = melhor para a empresa):
- Ameaça de novos entrantes
- Poder dos fornecedores
- Poder dos compradores
- Ameaça de substitutos
- Rivalidade competitiva

**Market Attractiveness Score:** 100 - ((Σ forças / 25) × 100)

### 4. **Hamilton Helmer's 7 Powers**

Avaliado indiretamente através de:
- NRR (Network Effects / Switching Costs)
- Diferenciação (Counter-Positioning)
- Gross Margin (Scale Economies)
- Logo Retention (Brand)

### 5. **Bessemer VIP Benchmarks**

Benchmarks por estágio:
- Seed: 200%+ growth, NRR 120%+
- Series A: 100-150% growth, NRR 120-140%
- Series B+: 60-80% growth, Rule of 40

---

## 📊 Métricas Calculadas

### Automáticas (em tempo real):

1. **ARR** = MRR × 12
2. **LTV** = (ARPA × Gross Margin%) / Churn Rate%
3. **CAC** = S&M Spend / Novos Clientes
4. **LTV/CAC Ratio** = LTV / CAC
5. **CAC Payback** = CAC / (ARPA × Gross Margin%)
6. **Rule of 40** = Growth% + EBITDA%
7. **Magic Number** = ((ARR atual - ARR anterior) × 4) / S&M Spend
8. **Quick Ratio** = (New MRR + Expansion) / (Churn + Contraction)
9. **Runway** = Cash / Monthly Burn
10. **DAU/MAU Ratio** = (DAU / MAU) × 100
11. **Annual Churn** = 1 - (1 - Monthly Churn%)^12
12. **Bottom-Up TAM** = Potenciais Clientes × Receita Média

### Benchmarks Aplicados:

| Métrica | Excelente | Bom | Adequado | Ruim |
|---------|-----------|-----|----------|------|
| **LTV/CAC** | >5:1 | 3-5:1 | 2-3:1 | <2:1 |
| **CAC Payback** | <6m | 6-12m | 12-18m | >18m |
| **NRR** | ≥120% | 110-120% | 100-110% | <100% |
| **Rule of 40** | ≥40% | 30-40% | 20-30% | <20% |
| **Quick Ratio** | ≥4 | 2-4 | 1-2 | <1 |
| **Gross Margin** | ≥80% | 70-80% | 60-70% | <60% |
| **Sean Ellis** | ≥40% | 30-40% | 20-30% | <20% |

---

## 🎯 Sistema de Scoring

### Pesos por Categoria:

| Categoria | Peso | Componentes |
|-----------|------|-------------|
| **Team** | 20% | Founder-Market Fit, Commitment, Technical, Dynamics |
| **Market** | 15% | TAM/SAM/SOM, Porter's Forces, Enablers |
| **Product** | 12% | Sean Ellis, NPS, Differentiation, Tech Quality |
| **Moat** | 8% | NRR, Differentiation, Logo Retention |
| **Financial** | 18% | LTV/CAC, CAC Payback, Rule of 40 |
| **Traction** | 10% | NRR, Quick Ratio, Churn |
| **Valuation** | 7% | Multiple vs ARR benchmark |
| **Risk** | 5% | General risk factors |
| **Exit** | 5% | Exit potential |

### Cálculo:

```
Score Total = Σ (Score Categoria × Peso Categoria)
```

### Ajustes:

- **Red Flags:** -2 pontos cada
- **Critical Risks:** -5 pontos cada

---

## 💻 Tecnologias

- **HTML5**: Estrutura semântica
- **CSS3**: Gradientes, animações, flexbox, grid
- **JavaScript (Vanilla)**: Sem dependências, ~900 linhas
- **Google Fonts**: Inter (tipografia moderna)

**Por que sem frameworks?**
- Performance máxima
- Fácil customização
- Zero dependências externas
- Funciona offline após primeiro carregamento

---

## 📈 Roadmap Futuro

- [ ] Exportação para PDF profissional
- [ ] Salvamento local (LocalStorage)
- [ ] Comparação de múltiplas startups
- [ ] Gráficos interativos (Chart.js)
- [ ] Integração com APIs (Crunchbase, PitchBook)
- [ ] Modo offline (PWA)
- [ ] Multi-idioma (EN/PT)

---

## 📄 Licença

Este projeto é baseado em frameworks públicos e dados de mercado disponíveis publicamente. Uso educacional e profissional livre.

---

## 🙏 Créditos

Frameworks e metodologias baseados em:
- **Bessemer Venture Partners** - State of the Cloud 2024
- **Sequoia Capital** - Metrics that Matter
- **a16z** - 16 Startup Metrics
- **Y Combinator** - Startup School
- **NFX** - Founder-Market Fit Framework
- **Hamilton Helmer** - 7 Powers Framework

---

## 📞 Suporte

Para questões ou sugestões:
- Abra uma issue no repositório
- Email: [seu-email]

---

**Desenvolvido com ❤️ para a comunidade VC e empreendedora**

Versão 1.0 | Janeiro 2025
