# Plano Executável: Micro SaaS do Zero ao $100K MRR

> **Documento de Trabalho para Fundador Técnico Full-Time**  
> Baseado em pesquisa de casos reais e métricas validadas

---

## Sumário Executivo

Este documento transforma a pesquisa do playbook em um sistema executável de decisões e ações. Cada seção contém: o framework conceitual, a metodologia de aplicação, os critérios de avaliação com scoring, e os templates prontos para uso.

**Premissas do plano:**
- Fundador técnico com domínio de múltiplas stacks
- Dedicação full-time ao projeto
- Capital inicial mínimo (< $500 para ferramentas)
- Objetivo: alcançar $100K MRR em 24-48 meses

---

## FASE 1: DESCOBERTA E VALIDAÇÃO DE IDEIA

### 1.1 Framework de Seleção de Ideias

A metodologia central é **"Copy and Improve"** — encontrar produtos que já geram receita e criar uma versão melhor para um nicho mais específico.

#### Fontes de Mineração de Ideias (em ordem de prioridade)

| Fonte | O que procurar | Sinal de oportunidade |
|-------|----------------|----------------------|
| **G2/Capterra** | Reviews de 2-3 estrelas | Reclamações recorrentes sobre features específicas |
| **Acquire.com** | Produtos vendidos por $50K-$500K | Valida que existe mercado pagante |
| **Shopify App Store** | Apps com 100-500 reviews, 3-4 estrelas | Grande o suficiente para ter demanda, pequeno o suficiente para competir |
| **Atlassian Marketplace** | Plugins com problemas de UX | Mercado B2B com alto willingness to pay |
| **Product Hunt** | Produtos lançados há 6-12 meses | Validação inicial feita, momento de capturar mercado |
| **IndieHackers** | Fundadores compartilhando receita | Prova de conceito público |

#### Processo de Mineração (4 horas)

**Passo 1: Varredura inicial (1 hora)**
```
Ação: Abrir 3 fontes simultaneamente
- Tab 1: G2 → Categoria de interesse → Ordenar por "Most Reviews"
- Tab 2: Acquire.com → Filtrar $50K-$200K → SaaS only
- Tab 3: Shopify App Store → Categoria → Ordenar por relevância

Saída: Lista de 20 produtos potenciais para análise
```

**Passo 2: Análise de reviews negativos (2 horas)**
```
Para cada produto da lista:
1. Ler 20 reviews de 1-3 estrelas
2. Categorizar reclamações em:
   - [FEATURE] Feature que falta
   - [UX] Problema de usabilidade
   - [SUPPORT] Suporte ruim
   - [PRICE] Preço alto demais
   - [TECH] Problemas técnicos

3. Marcar produtos com 5+ reclamações na mesma categoria
```

**Passo 3: Documentação estruturada (1 hora)**
```
Para cada ideia promissora, preencher:

NOME DA IDEIA: _______________
PRODUTO ORIGINAL: _______________
CATEGORIA DE DOR: [FEATURE/UX/SUPPORT/PRICE/TECH]
DESCRIÇÃO DA DOR (1 frase): _______________
NICHO ESPECÍFICO: _______________
PREÇO DO CONCORRENTE: $___/mês
```

---

### 1.2 Sistema de Scoring de Ideias

Cada ideia passa por avaliação em 6 dimensões. A pontuação mínima para prosseguir é **70/100**.

#### Matriz de Avaliação

| Critério | Peso | 0-5 pts | 6-10 pts | 11-15 pts | 16-20 pts |
|----------|------|---------|----------|-----------|-----------|
| **Demanda comprovada** (25%) | 25 | Nenhum concorrente | 1-2 concorrentes pequenos | 3-5 concorrentes, alguns com receita | 5+ concorrentes com receita pública |
| **Poder de compra** (20%) | 20 | Estudantes/hobbyistas | Freelancers | PMEs | Empresas/Profissionais |
| **Frequência do problema** (20%) | 20 | Anual | Mensal | Semanal | Diário |
| **Acessibilidade** (15%) | 15 | Impossível identificar | Comunidades genéricas | Grupos específicos identificados | Canais claros + keywords validadas |
| **Complexidade do MVP** (10%) | 10 | 6+ meses | 2-4 meses | 1-2 meses | 2-4 semanas |
| **Expertise pessoal** (10%) | 10 | Zero conhecimento | Conhecimento superficial | Experiência prática | Especialista/insider |

#### Template de Scoring

```
IDEIA: _______________

DEMANDA COMPROVADA: ___/25
Evidências:
- Concorrentes identificados: _______________
- Receita pública encontrada: $_______________
- Reviews/downloads: _______________

PODER DE COMPRA: ___/20
Evidências:
- Persona primária: _______________
- Gasto atual em ferramentas: $___/mês
- Orçamento típico do segmento: _______________

FREQUÊNCIA DO PROBLEMA: ___/20
Evidências:
- Com que frequência o problema ocorre: _______________
- Impacto de não resolver: _______________

ACESSIBILIDADE: ___/15
Evidências:
- Comunidades identificadas: _______________
- Keywords com volume: _______________
- Canais de distribuição: _______________

COMPLEXIDADE MVP: ___/10
Evidências:
- Features core necessárias: _______________
- Estimativa de tempo: ___ semanas
- Stack técnica: _______________

EXPERTISE PESSOAL: ___/10
Evidências:
- Experiência no domínio: _______________
- Conhecimento técnico específico: _______________

SCORE TOTAL: ___/100

DECISÃO: [ ] PROSSEGUIR (70+) / [ ] DESCARTAR (<70)
```

---

### 1.3 Metodologia de Validação Pré-Build

Antes de escrever uma linha de código, a ideia precisa passar por 3 gates de validação.

#### Gate 1: Validação de Conversação (Semana 1)

**Objetivo:** Confirmar que o problema existe e pessoas pagariam para resolvê-lo.

**Meta:** 10 conversas com potenciais clientes.

**Script de Abordagem (The Mom Test)**

```
MENSAGEM INICIAL (LinkedIn/Reddit/Email):

"Oi [Nome], vi que você [contexto específico - ex: trabalha com X, 
postou sobre Y]. Estou pesquisando como [personas] lidam com [problema]. 
Você teria 15 minutos para uma conversa rápida? Não estou vendendo nada, 
só querendo entender melhor o dia a dia."

---

ROTEIRO DA CONVERSA:

1. CONTEXTO (2 min)
   "Me conta um pouco sobre seu trabalho com [área]"

2. PROBLEMA (5 min)
   "Como você lida com [problema específico] hoje?"
   "Quanto tempo você gasta nisso por semana?"
   "O que mais te frustra nesse processo?"

3. SOLUÇÕES ATUAIS (3 min)
   "Você já tentou usar alguma ferramenta para isso?"
   "O que funcionou? O que não funcionou?"
   "Quanto você paga/pagaria por uma solução?"

4. VALIDAÇÃO DE VALOR (3 min)
   "Se existisse uma ferramenta que [proposta de valor], 
    isso mudaria seu dia a dia?"
   "Quanto você pagaria por mês por isso?"
   "Você conhece outras pessoas com esse mesmo problema?"

5. FECHAMENTO (2 min)
   "Posso te avisar quando tiver algo para testar?"
   [Coletar email]
```

**Planilha de Tracking de Conversas**

| # | Nome | Perfil | Canal | Problema confirmado? | Pagaria? | Quanto? | Email coletado? |
|---|------|--------|-------|---------------------|----------|---------|-----------------|
| 1 |      |        |       | S/N                 | S/N      | $       | S/N             |
| 2 |      |        |       | S/N                 | S/N      | $       | S/N             |
| ... | ... | ... | ... | ... | ... | ... | ... |

**Critérios de Aprovação do Gate 1:**
- Mínimo 10 conversas realizadas
- 70%+ confirmam que o problema existe
- 50%+ dizem que pagariam
- Média de willingness to pay ≥ $30/mês

---

#### Gate 2: Validação de Landing Page (Semana 2)

**Objetivo:** Confirmar interesse real através de ação (signup para waitlist).

**Estrutura da Landing Page**

```
[HEADER]
- Logo simples (pode ser texto)
- Headline: "Verbo + Resultado para [Persona]"
  Exemplo: "Automatize relatórios de feedback para professores online"

[HERO SECTION]
- Subheadline: Explicação em 1 frase do como
- Mockup/Screenshot (pode ser Figma básico)
- CTA: "Entrar na lista de espera"
- Social proof inicial: "Junte-se a X pessoas interessadas"

[PROBLEMA]
- 3 bullet points dos problemas que resolve
- "Você está cansado de..."

[SOLUÇÃO]
- 3-4 features principais com ícones
- Benefícios, não funcionalidades

[PRICING PREVIEW]
- "A partir de $X/mês"
- "Planos para [personas]"

[CTA FINAL]
- Form de email
- "Seja o primeiro a saber quando lançarmos"
```

**Ferramentas recomendadas:**
- Carrd ($19/ano) - mais rápido
- Framer (grátis) - mais customizável
- Typedream (grátis) - bom design padrão

**Estratégia de Tráfego para Teste (Budget: $0-100)**

| Canal | Ação | Meta de visitas |
|-------|------|-----------------|
| Reddit | 3 posts em subreddits relevantes (valor primeiro, link sutil) | 200 |
| Twitter/X | 5 threads sobre o problema | 100 |
| LinkedIn | 3 posts + DMs para personas | 50 |
| Product Hunt "Upcoming" | Cadastrar página | 50 |
| Comunidades de nicho | Participação genuína + menção | 100 |
| **Total** | | **500** |

**Critérios de Aprovação do Gate 2:**
- Mínimo 500 visitantes únicos
- Taxa de conversão ≥ 10% (50+ emails)
- Bounce rate < 70%
- Tempo médio na página > 30 segundos

---

#### Gate 3: Validação de Pré-Venda (Semana 3)

**Objetivo:** Confirmar que pessoas realmente pagarão (não só "pagariam").

**Estratégia: Oferta de Early Bird / Founding Member**

```
EMAIL PARA LISTA DE ESPERA:

Assunto: Vagas limitadas - Acesso antecipado a [Produto]

---

Oi [Nome],

Você foi um dos primeiros a se inscrever para [Produto], 
e quero te agradecer com uma oferta especial.

Estamos abrindo 20 vagas para Founding Members com:
- 50% de desconto vitalício ($X/mês em vez de $Y/mês)
- Acesso ao roadmap e influência nas features
- Suporte direto comigo via WhatsApp/Slack
- Garantia de 30 dias (dinheiro de volta, sem perguntas)

O produto estará pronto em [X semanas].

Para garantir sua vaga, é só responder este email 
confirmando seu interesse.

[CTA: Quero ser Founding Member]

---

Ps: Só tenho 20 vagas nessa condição. 
Depois disso, o preço volta ao normal.
```

**Critérios de Aprovação do Gate 3:**
- Mínimo 5 pessoas confirmam interesse em pagar
- Pelo menos 2 pagamentos efetivos (mesmo que parciais)
- Média de compromisso ≥ $29/mês

---

### 1.4 Decisão Final: Go/No-Go

```
CHECKLIST DE VALIDAÇÃO COMPLETA

Ideia: _______________
Data: _______________

GATE 1 - CONVERSAS
[ ] 10+ conversas realizadas
[ ] 70%+ confirmam problema
[ ] 50%+ pagariam
[ ] Média WTP ≥ $30/mês
Status: PASSOU / NÃO PASSOU

GATE 2 - LANDING PAGE
[ ] 500+ visitantes
[ ] 10%+ conversão
[ ] 50+ emails coletados
Status: PASSOU / NÃO PASSOU

GATE 3 - PRÉ-VENDA
[ ] 5+ interessados confirmados
[ ] 2+ pagamentos/compromissos
[ ] WTP confirmado na prática
Status: PASSOU / NÃO PASSOU

---

DECISÃO FINAL:
[ ] GO - Iniciar desenvolvimento do MVP
[ ] PIVOT - Ajustar proposta e re-validar
[ ] KILL - Descartar e testar próxima ideia

Assinatura: _______________ Data: _______________
```

---

## FASE 2: DESENVOLVIMENTO DO MVP

### 2.1 Framework de Escopo Mínimo

O MVP deve ser construído em **2-4 semanas**. Se a estimativa passar disso, o escopo está errado.

#### Metodologia MoSCoW Adaptada

```
MUST HAVE (Sem isso, não resolve o problema core)
┌─────────────────────────────────────────────────┐
│ Feature 1: ___________________________________ │
│ Feature 2: ___________________________________ │
│ Feature 3: ___________________________________ │
│ (Máximo 3 features)                            │
└─────────────────────────────────────────────────┘

SHOULD HAVE (Melhora a experiência, mas v1 funciona sem)
┌─────────────────────────────────────────────────┐
│ Feature 4: ___________________________________ │
│ Feature 5: ___________________________________ │
│ (Máximo 2 features - deixar para v1.1)         │
└─────────────────────────────────────────────────┘

WON'T HAVE (Ideias para futuro)
┌─────────────────────────────────────────────────┐
│ Feature 6: ___________________________________ │
│ Feature 7: ___________________________________ │
│ (Documentar mas não desenvolver)               │
└─────────────────────────────────────────────────┘
```

#### Componentes Obrigatórios do MVP

| Componente | Implementação recomendada | Tempo estimado |
|------------|---------------------------|----------------|
| **Autenticação** | Supabase Auth / Auth0 / Clerk | 2-4 horas |
| **Database** | Supabase / PlanetScale / Firebase | 4-8 horas |
| **Pagamentos** | Stripe Checkout | 4-8 horas |
| **UI básica** | Tailwind + shadcn/ui | 8-16 horas |
| **Core feature** | Depende do produto | 40-80 horas |
| **Landing page** | Já feita na validação | 0 horas |
| **Deploy** | Vercel / Railway / Render | 1-2 horas |

**Tempo total estimado: 60-120 horas = 2-3 semanas full-time**

---

### 2.2 Stack Técnica Recomendada

#### Para máxima velocidade (Web SaaS)

```
FRONTEND
├── Next.js 14+ (App Router)
├── Tailwind CSS
├── shadcn/ui (componentes)
└── React Query (data fetching)

BACKEND
├── Next.js API Routes ou
├── Supabase Edge Functions ou
├── Node.js + Express (se precisar mais controle)

DATABASE
├── Supabase (PostgreSQL gerenciado)
│   ├── Row Level Security built-in
│   ├── Realtime subscriptions
│   └── Auth integrado

PAGAMENTOS
├── Stripe
│   ├── Checkout (hosted)
│   ├── Customer Portal
│   └── Webhooks para lifecycle

INFRA
├── Vercel (deploy)
├── Resend (emails transacionais)
└── Upstash (Redis/rate limiting se necessário)

CUSTO MENSAL: $0-20 até ~1000 usuários
```

#### Alternativa para mobile-first ou extensões

```
EXTENSÃO CHROME/BROWSER
├── Plasmo framework
├── React
└── Supabase para backend

MOBILE (se absolutamente necessário)
├── React Native + Expo
├── Firebase
└── RevenueCat para pagamentos

DESKTOP APP
├── Tauri (Rust + WebView)
├── Electron (se precisar de mais recursos)
```

---

### 2.3 Cronograma de Desenvolvimento (3 Semanas)

#### Semana 1: Fundação

| Dia | Tarefa | Entregável |
|-----|--------|------------|
| D1 | Setup do projeto + estrutura de pastas | Repo no GitHub, projeto rodando local |
| D2 | Autenticação completa | Login/Signup/Logout funcionando |
| D3 | Modelo de dados + migrations | Schema do banco definido e aplicado |
| D4 | Stripe integration básica | Checkout + webhook de pagamento |
| D5 | UI shell (layout, navegação) | App navegável (mesmo sem funcionalidades) |

#### Semana 2: Core Feature

| Dia | Tarefa | Entregável |
|-----|--------|------------|
| D6-D7 | Core feature parte 1 | 50% da feature principal |
| D8-D9 | Core feature parte 2 | 100% da feature principal |
| D10 | Integração pagamento + feature | Usuário pago tem acesso à feature |

#### Semana 3: Polish + Deploy

| Dia | Tarefa | Entregável |
|-----|--------|------------|
| D11 | Testes manuais + bug fixes | Lista de bugs zerada |
| D12 | Emails transacionais (welcome, receipt) | Fluxo de email funcionando |
| D13 | Deploy em produção | App live em domínio próprio |
| D14 | Onboarding básico + docs mínima | Usuário consegue usar sem ajuda |
| D15 | Buffer para imprevistos | — |

---

### 2.4 Checklist de Lançamento do MVP

```
PRÉ-LANÇAMENTO

Funcionalidade
[ ] Core feature funciona sem erros críticos
[ ] Usuário consegue criar conta
[ ] Usuário consegue pagar
[ ] Usuário pago acessa feature premium
[ ] Usuário consegue cancelar assinatura

Infraestrutura
[ ] HTTPS configurado
[ ] Domínio próprio apontando
[ ] Variáveis de ambiente em produção
[ ] Stripe em modo live (não test)
[ ] Backup de banco configurado

Comunicação
[ ] Email de boas-vindas configurado
[ ] Email de confirmação de pagamento
[ ] Página de sucesso pós-pagamento
[ ] Página de erro genérica

Legal (mínimo)
[ ] Termos de uso (pode ser template)
[ ] Política de privacidade (pode ser template)
[ ] Política de reembolso clara

Monitoramento
[ ] Analytics básico (Plausible/Umami/GA)
[ ] Error tracking (Sentry)
[ ] Uptime monitoring (BetterStack/UptimeRobot)
```

---

## FASE 3: ESTRATÉGIA DE LIFETIME DEAL (LTD)

### 3.1 Decisão: LTD Sim ou Não?

#### Framework de Decisão

```
USAR LTD SE:
[+] Produto tem baixo custo marginal por usuário
[+] Precisa de cash inicial para runway
[+] Quer volume de usuários para feedback rápido
[+] Produto não depende de APIs caras (OpenAI, etc.)
[+] Consegue dedicar 3-4 semanas para suporte intenso

NÃO USAR LTD SE:
[-] Custo por usuário é alto (AI, infraestrutura pesada)
[-] Já tem tração e pagantes recorrentes
[-] Não tem capacidade de suporte
[-] Produto ainda muito instável
[-] Prefere crescimento lento e sustentável
```

---

### 3.2 Estrutura de Pricing para LTD

#### Fórmula Base

```
PREÇO LTD = Preço Mensal × 14-16

Exemplo:
- Preço mensal planejado: $29/mês
- LTD sugerido: $29 × 15 = $435
- Com desconto de lançamento (30%): $305

Arredondar para número "limpo": $299 ou $349
```

#### Estrutura de Tiers

```
TIER 1 - STARTER ($49-79)
├── 1 usuário
├── Limites básicos (ex: 100 ações/mês)
├── Features core apenas
└── Suporte por email

TIER 2 - PRO ($149-199)
├── 3-5 usuários
├── Limites aumentados (ex: 500 ações/mês)
├── Features avançadas
├── Suporte prioritário
└── [MAIS VENDIDO - destacar]

TIER 3 - AGENCY ($299-399)
├── Usuários ilimitados ou 10+
├── Limites altos (ex: 2000 ações/mês)
├── White-label ou API access
├── Onboarding dedicado
└── Suporte via chat

CODE STACKING
├── 2 códigos = 2x limites + 1 feature bônus
├── 3 códigos = 3x limites + todas features
├── Máximo: 5 códigos
```

---

### 3.3 Sequência de LTD (Privado → Marketplace)

#### Fase 1: LTD Privado (Semanas 1-3)

**Canais:**
- Email para lista de validação
- Reddit: r/SaaS, r/Entrepreneur, r/SideProject
- Facebook: grupos de LTD (MarTech Wise, Ken Moo LTD)
- Twitter: thread de lançamento

**Template de Anúncio para Grupos**

```
🚀 [LIFETIME DEAL] Nome do Produto - $X (normalmente $Y/mês)

Oi pessoal! Sou o fundador do [Produto], uma ferramenta que 
[descrição em 1 linha].

Estou oferecendo um LTD exclusivo para esta comunidade antes 
de lançar no AppSumo.

O QUE FAZ:
• [Benefício 1]
• [Benefício 2]  
• [Benefício 3]

TIERS:
🥉 Tier 1 ($49): [resumo]
🥈 Tier 2 ($149): [resumo] ← mais popular
🥇 Tier 3 ($299): [resumo]

BÔNUS EXCLUSIVO para os primeiros 50:
• [Bônus 1]
• [Bônus 2]

GARANTIA: 60 dias de reembolso, sem perguntas.

👉 Link: [URL]

Qualquer dúvida, estou aqui nos comentários!
```

**Meta Fase 1:** 
- 50-100 vendas
- $5.000-$15.000 revenue
- 20+ testimonials coletados

---

#### Fase 2: LTD em Marketplace (Semanas 4-8)

**Opções de Marketplace (em ordem de recomendação para iniciantes):**

| Plataforma | Comissão | Preço típico | Pros | Cons |
|------------|----------|--------------|------|------|
| **AppSumo Marketplace** | 30% | $49-99 | Maior audiência | Comissão alta, processo longo |
| **PitchGround** | 20-25% | $49-299 | Flexível, boa comunidade | Menor audiência |
| **SaaSZilla** | 15-20% | $49-199 | Data-driven, bom suporte | Novo, menor audiência |
| **Dealify** | Variável | Variável | Alternativo | Menor |

**Preparação para AppSumo**

```
REQUISITOS APPSUMO SELECT:
[ ] Mínimo 3 pessoas no time (ou parecer ter)
[ ] Produto além do beta (pagantes existentes)
[ ] Documentação completa
[ ] Vídeo demo de 2-3 minutos
[ ] Roadmap público
[ ] Integrações funcionando
[ ] Suporte preparado para volume

TIMELINE:
- Aplicação: 1-2 semanas para resposta
- Preparação: 2-4 semanas
- Campanha: 2-4 semanas ativas
- Suporte pós: 4-8 semanas intenso
```

**Template de Página de Deal**

```
ESTRUTURA DA PÁGINA:

1. HEADLINE FORTE
   "[Verbo] seu [resultado] em [tempo/facilidade]"

2. VÍDEO DEMO (2-3 min)
   - 30s: Problema
   - 60s: Solução em ação
   - 30s: Resultados
   - 30s: Call to action

3. PROBLEMA (3 bullets)
   • Dor 1
   • Dor 2
   • Dor 3

4. SOLUÇÃO (5-7 features com screenshots)

5. COMPARAÇÃO (Vs. competidores)

6. ROADMAP (Próximos 6 meses)

7. TESTIMONIALS (Mínimo 5)

8. FAQ (10-15 perguntas comuns)

9. GARANTIA (60 dias)
```

---

### 3.4 Gestão de LTD Pós-Venda

#### Suporte Durante Campanha

```
INFRAESTRUTURA DE SUPORTE:

Ferramentas:
- Intercom ou Crisp (chat ao vivo)
- Notion (knowledge base)
- Loom (respostas em vídeo)
- Templates de resposta (30+ prontos)

Equipe mínima:
- Você (fundador): Respostas complexas + comentários públicos
- 1-2 VAs ($5-10/hora): Respostas repetitivas, triagem

SLA Target:
- Chat: < 5 minutos primeira resposta
- Email: < 4 horas
- Comentários AppSumo: < 2 horas
```

#### Transição LTD → Recorrente

```
ESTRATÉGIA DE TRANSIÇÃO:

Mês 1-2 (Durante LTD):
- Coletar feedback intensivamente
- Identificar power users
- Documentar requests de features

Mês 3 (Fim do LTD):
- Anunciar fim do LTD
- Última chance com urgência
- Preparar pricing recorrente

Mês 4+ (Pós-LTD):
- Pricing regular ativo
- LTD users em tier separado
- Upsell para features adicionais
- Programa de referral para LTD users

CONVERSÃO LTD → RECORRENTE:
Meta realista: 10-20% dos LTD users indicam novos pagantes
Estratégia: Recompensa por indicação (créditos, features)
```

---

## FASE 4: PRICING E MODELO DE NEGÓCIO

### 4.1 Framework de Pricing Inicial

#### Regra de Ouro: Nunca Gratuito

```
POR QUE NÃO OFERECER FREE TIER:

1. QUALIDADE DO FEEDBACK
   Usuário grátis: "Legal, poderia ter X"
   Usuário pago: "Preciso de X para meu trabalho funcionar"

2. SUPORTE
   Usuários grátis: 60% do suporte
   Receita: 0%

3. PSICOLOGIA (Penny Gap)
   Usuário acostumado com $0 resiste a qualquer preço
   Melhor começar cobrando $1 que dar grátis

4. CONVERSÃO
   Freemium → Pago: ~2-4%
   Trial com cartão → Pago: ~48%
```

#### Estrutura de Pricing Recomendada

```
MODELO: TRIAL + TIERS

FREE TRIAL (14 dias, cartão obrigatório)
├── Acesso completo ao Tier Pro
├── Onboarding guiado
├── Email no dia 7 lembrando
├── Email no dia 12 com urgência
└── Conversão após trial: 40-50%

---

TIER STARTER ($29-49/mês)
├── Para: Usuários individuais, teste inicial
├── Limites: Básicos
├── Features: Core apenas
├── Suporte: Email, 48h SLA

TIER PRO ($79-149/mês) ← DESTACAR
├── Para: Profissionais sérios, pequenos times
├── Limites: 5-10x do Starter
├── Features: Todas
├── Suporte: Prioritário, 24h SLA
├── Bônus: Onboarding call

TIER BUSINESS ($249-499/mês)
├── Para: Times, agências
├── Limites: Alto/Ilimitado
├── Features: Todas + API + White-label
├── Suporte: Dedicado
├── Bônus: Account manager
```

---

### 4.2 Implementação Técnica de Pricing

#### Setup Stripe

```javascript
// Estrutura de produtos no Stripe

// 1. Criar produtos
const products = {
  starter: {
    name: "Starter",
    monthly: "price_xxx", // $29/mês
    annual: "price_yyy",  // $290/ano (2 meses grátis)
  },
  pro: {
    name: "Pro", 
    monthly: "price_xxx", // $99/mês
    annual: "price_yyy",  // $990/ano (2 meses grátis)
  },
  business: {
    name: "Business",
    monthly: "price_xxx", // $299/mês
    annual: "price_yyy",  // $2990/ano (2 meses grátis)
  }
};

// 2. Checkout Session
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  payment_method_types: ['card'],
  line_items: [{
    price: selectedPriceId,
    quantity: 1,
  }],
  subscription_data: {
    trial_period_days: 14,
  },
  success_url: `${domain}/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${domain}/pricing`,
});

// 3. Webhook para eventos
switch (event.type) {
  case 'customer.subscription.created':
    // Ativar acesso
    break;
  case 'customer.subscription.deleted':
    // Revogar acesso
    break;
  case 'invoice.payment_failed':
    // Email de recuperação
    break;
}
```

---

### 4.3 Revisão de Preços

#### Cronograma de Revisão

| Período | Ação | Critério para aumentar |
|---------|------|------------------------|
| Lançamento | Preço inicial conservador | — |
| 3 meses | Primeira revisão | Churn < 5% + demanda estável |
| 6 meses | Segunda revisão | Fila de espera ou trial conversion > 50% |
| 12 meses | Revisão anual | Benchmark contra concorrentes |

#### Táticas de Aumento de Preço

```
REGRAS:

1. GRANDFATHER SEMPRE
   - Clientes existentes mantêm preço atual
   - Aumentos só para novos clientes
   - Comunicar com transparência

2. TESTE EM NOVOS APENAS
   - A/B test pricing para novos visitantes
   - Medir conversão, não só receita

3. COMUNICAÇÃO
   Template:
   "Estamos aumentando preços para novos clientes em [data].
    Como cliente atual, seu preço permanece [valor].
    Obrigado por fazer parte desde o início!"

4. QUANDO NÃO AUMENTAR
   - Churn > 7% mensal
   - Muitas reclamações de preço
   - Competidor direto mais barato com feature parity
```

---

## FASE 5: AQUISIÇÃO E CRESCIMENTO

### 5.1 Estratégia de Conteúdo

#### Priorização de Conteúdo (Bottom-Up)

```
ORDEM DE CRIAÇÃO:

1. BOTTOM OF FUNNEL (Primeiro - Alta conversão)
   [ ] Página "[Concorrente] alternatives" × 5 principais
   [ ] Página "[Produto] vs [Concorrente]" × 5 principais
   [ ] Página de preços detalhada
   [ ] Casos de uso por persona × 3

2. MIDDLE OF FUNNEL (Segundo)
   [ ] "How to [resolver problema]" × 10 artigos
   [ ] "Best [categoria] tools for [persona]" × 5
   [ ] Templates/recursos gratuitos × 3

3. TOP OF FUNNEL (Depois de ter tração)
   [ ] Conteúdo educacional amplo
   [ ] Thought leadership
   [ ] Newsletter
```

#### Template de Página "Alternativa a X"

```markdown
# Procurando alternativas ao [Concorrente]?

[Concorrente] é uma ferramenta popular para [função], 
mas pode não ser ideal se você:
- [Limitação 1 do concorrente]
- [Limitação 2]
- [Limitação 3]

## Por que [Seu Produto] é diferente

| Feature | [Concorrente] | [Seu Produto] |
|---------|---------------|---------------|
| [Feature 1] | ❌ ou parcial | ✅ |
| [Feature 2] | ✅ | ✅ |
| [Feature 3] | ❌ | ✅ |
| Preço | $X/mês | $Y/mês |

## O que nossos clientes dizem

> "[Testimonial de cliente que veio do concorrente]"
> — Nome, Cargo

## Faça um teste grátis de 14 dias

[CTA: Começar gratuitamente]

Sem compromisso. Cancele quando quiser.
```

---

### 5.2 Programmatic SEO

#### Oportunidades para Micro SaaS

```
TEMPLATES DE PÁGINAS PROGRAMÁTICAS:

1. INTEGRAÇÕES
   "[Seu produto] + [Ferramenta X] integration"
   Exemplo: "TaskFlow + Slack integration"
   Volume: 1 página por integração suportada

2. USE CASES
   "[Seu produto] for [indústria/persona]"
   Exemplo: "TaskFlow for marketing agencies"
   Volume: 1 página por vertical

3. TEMPLATES
   "Free [tipo de template] template"
   Exemplo: "Free project brief template"
   Volume: 10-50 templates

4. COMPARAÇÕES
   "[Produto A] vs [Produto B] for [use case]"
   Exemplo: "Asana vs Monday for small teams"
   Volume: Matriz de concorrentes
```

#### Implementação Técnica

```javascript
// Geração dinâmica de páginas (Next.js exemplo)

// pages/integrations/[slug].tsx
export async function getStaticPaths() {
  const integrations = await getIntegrations();
  return {
    paths: integrations.map(i => ({
      params: { slug: i.slug }
    })),
    fallback: 'blocking'
  };
}

export async function getStaticProps({ params }) {
  const integration = await getIntegration(params.slug);
  return {
    props: { integration },
    revalidate: 86400 // Rebuild diário
  };
}

// Template da página
export default function IntegrationPage({ integration }) {
  return (
    <>
      <SEO 
        title={`${productName} + ${integration.name} Integration`}
        description={`Connect ${productName} with ${integration.name}...`}
      />
      <IntegrationContent data={integration} />
    </>
  );
}
```

---

### 5.3 Canais de Distribuição

#### Reddit Strategy

```
ABORDAGEM:

1. CONSTRUIR KARMA (2 semanas antes de qualquer promoção)
   - Participar genuinamente em 5-10 subreddits do nicho
   - Responder perguntas, ajudar pessoas
   - Meta: 1000+ karma

2. POSTS QUE FUNCIONAM
   ✅ "I built X and here's what I learned"
   ✅ "How I solved [problema] for my [contexto]"
   ✅ "Sharing my [resultado] - open to feedback"
   
   ❌ "Check out my new app!"
   ❌ Links diretos sem contexto
   ❌ Respostas genéricas com link

3. SUBREDDITS PARA SAAS
   - r/SaaS (108k members)
   - r/Entrepreneur (2M+ members)
   - r/SideProject (200k members)
   - r/startups (900k members)
   - r/indiehackers (menor, mais focado)
   - Subreddits específicos do nicho

4. TEMPLATE DE POST BOM

   Título: "I built [produto] after struggling with [problema] - here's the journey"

   Corpo:
   - Contexto pessoal (por que construí)
   - O problema real
   - O que tentei antes
   - Como resolvi
   - Resultados/learnings
   - Link no final (opcional, às vezes melhor nos comentários)
   - "Happy to answer any questions"
```

#### Product Hunt Strategy

```
PREPARAÇÃO (4-6 semanas antes):

Semana -6 a -4:
[ ] Criar página "Coming Soon"
[ ] Coletar 200+ subscribers
[ ] Preparar assets (logo, screenshots, GIFs)

Semana -4 a -2:
[ ] Recrutar hunter (opcional, mas ajuda)
[ ] Preparar maker comment detalhado
[ ] Alinhar com early users para upvotes dia 1

Semana -2 a -1:
[ ] Finalizar tagline (< 60 caracteres)
[ ] Gravar vídeo demo (1-2 minutos)
[ ] Preparar respostas para FAQ
[ ] Agendar lançamento (terça-quinta, 00:01 PT)

DIA DO LANÇAMENTO:
[ ] Publicar 00:01 Pacific Time
[ ] Postar maker comment imediato
[ ] Notificar lista de espera
[ ] Responder TODOS os comentários
[ ] Postar em redes sociais
[ ] Atualizar ao longo do dia

MÉTRICAS ESPERADAS:
- Top 10: ~500-1000 upvotes
- Product of the Day: 300-500 upvotes
- Front page: 100-200 upvotes
- Visitantes: 2000-10000 dependendo do rank
- Conversões típicas: 1-5% dos visitantes
```

---

### 5.4 Sistema de Referral

#### Estrutura do Programa

```
DOUBLE-SIDED REWARDS:

Referrer ganha: 1 mês grátis (ou $20 crédito)
Referred ganha: 20% desconto no primeiro mês

MECÂNICA:
1. Usuário acessa dashboard
2. Seção "Invite friends" com link único
3. Amigo se cadastra pelo link
4. Amigo paga primeiro mês
5. Ambos recebem recompensas

LIMITES:
- Máximo 12 referrals por usuário
- Só conta se referred pagar 2+ meses
- Anti-fraud: mesmo IP/cartão não conta
```

#### Implementação Simples

```javascript
// Modelo de dados
const ReferralSchema = {
  referrer_id: String,
  referred_id: String,
  referral_code: String,
  status: ['pending', 'completed', 'paid'],
  reward_given: Boolean,
  created_at: Date,
  completed_at: Date
};

// Gerar código
function generateReferralCode(userId) {
  return `${userId.slice(0,4)}-${randomString(6)}`;
}

// Tracking
function trackReferral(code, newUserId) {
  const referrer = await findUserByCode(code);
  await createReferral({
    referrer_id: referrer.id,
    referred_id: newUserId,
    status: 'pending'
  });
}

// Completar após pagamento
async function completeReferral(userId) {
  const referral = await findPendingReferral(userId);
  if (referral) {
    await updateReferral(referral.id, { status: 'completed' });
    await giveReward(referral.referrer_id);
    await giveDiscount(userId);
  }
}
```

---

## FASE 6: MÉTRICAS E MILESTONES

### 6.1 Dashboard de Métricas

#### Métricas Críticas por Estágio

```
$0 - $1K MRR (Validação)
├── Conversões trial → pago
├── Feedback qualitativo
├── NPS dos primeiros clientes
└── Meta: Provar que alguém paga

$1K - $5K MRR (Product-Market Fit)
├── Churn rate mensal
├── Activation rate (% que usa core feature)
├── Fonte de aquisição principal
└── Meta: Encontrar canal repetível

$5K - $25K MRR (Escala inicial)
├── LTV (Lifetime Value)
├── CAC (Custo de Aquisição)
├── LTV:CAC ratio (meta: >3:1)
├── Tempo para payback
└── Meta: Unit economics positiva

$25K - $100K MRR (Escala)
├── Growth rate mensal
├── Net Revenue Retention
├── Margem bruta
├── Runway
└── Meta: Crescimento sustentável
```

#### Template de Dashboard Semanal

```
DASHBOARD SEMANAL - Semana de ___/___/___

RECEITA
├── MRR atual: $______
├── MRR semana passada: $______
├── Crescimento: ____%
├── New MRR: $______
├── Churned MRR: $______
└── Net new MRR: $______

CLIENTES
├── Total pagantes: ______
├── Novos esta semana: ______
├── Churned esta semana: ______
├── Churn rate: ____%
└── Trial → Paid conversion: ____%

AQUISIÇÃO
├── Visitantes únicos: ______
├── Trials iniciados: ______
├── Visitor → Trial: ____%
├── Principal fonte: ______
└── CAC estimado: $______

ENGAJAMENTO
├── DAU: ______
├── WAU: ______
├── DAU/MAU ratio: ____%
├── Core feature usage: ____%
└── Support tickets: ______

AÇÕES PARA PRÓXIMA SEMANA
1. ______________________________
2. ______________________________
3. ______________________________
```

---

### 6.2 Milestones e Timeline

#### Roadmap de 12 Meses

```
MÊS 1: VALIDAÇÃO
├── 10+ conversas com clientes
├── Landing page com 10%+ conversão
├── 50+ emails na lista
└── Decisão go/no-go

MÊS 2: MVP
├── MVP funcional deployed
├── 10 beta users ativos
├── Stripe funcionando
└── Primeiros $100-500 em receita

MÊS 3: LTD PRIVADO
├── LTD em grupos Reddit/Facebook
├── 50-100 vendas LTD
├── $5K-15K em revenue
├── 20+ testimonials
└── Milestone: $1K MRR equivalente

MÊS 4-5: LTD MARKETPLACE
├── Lançamento AppSumo/PitchGround
├── $20K-50K em revenue adicional
├── 200-500 clientes LTD
├── Knowledge base completa
└── Milestone: $2-3K MRR equivalente

MÊS 6: TRANSIÇÃO
├── Fim do LTD
├── Pricing recorrente ativo
├── Trial de 14 dias rodando
├── 50 clientes recorrentes
└── Milestone: $3-5K MRR real

MÊS 7-9: CRESCIMENTO ORGÂNICO
├── 10 páginas de conteúdo SEO
├── Product Hunt launch
├── Referral program ativo
├── 100+ clientes
└── Milestone: $8-15K MRR

MÊS 10-12: ESCALA
├── Programmatic SEO iniciado
├── Primeiro hire (suporte)
├── 200+ clientes
├── Churn < 5%
└── Milestone: $15-25K MRR

---

PROJEÇÃO 12-24 MESES:
├── Mês 18: $40-60K MRR
├── Mês 24: $70-100K MRR
└── Dependente de: execução + mercado + sorte
```

---

### 6.3 Benchmarks de Saúde

#### Sinais de Que Está Funcionando

```
MÉTRICAS SAUDÁVEIS:

✅ Churn mensal < 5%
✅ Trial conversion > 40% (com cartão)
✅ NPS > 30
✅ Core feature usage > 60%
✅ Suporte < 2h/dia
✅ CAC payback < 6 meses
✅ LTV:CAC > 3:1
✅ Crescimento > 5% mensal

SINAIS DE ALERTA:

⚠️ Churn > 7% mensal → Problema de produto ou fit
⚠️ Trial conversion < 20% → Problema de onboarding
⚠️ NPS < 0 → Problema sério de produto
⚠️ Crescimento < 3% → Canal saturado
⚠️ Suporte > 4h/dia → Precisa automatizar ou hire
⚠️ CAC subindo → Canal ficando caro
```

---

## FASE 7: OPERAÇÕES E SUSTENTABILIDADE

### 7.1 Gestão de Tempo (Full-time Solo Founder)

#### Alocação Semanal Recomendada (50h)

```
DESENVOLVIMENTO (20h - 40%)
├── Features novas: 10h
├── Bug fixes: 5h
├── Tech debt: 3h
└── Infra/DevOps: 2h

GROWTH (15h - 30%)
├── Conteúdo/SEO: 6h
├── Comunidade (Reddit, Twitter): 4h
├── Outreach/parcerias: 3h
└── Analytics/otimização: 2h

SUPORTE (8h - 16%)
├── Responder tickets: 5h
├── Documentação: 2h
└── Calls com clientes: 1h

ADMIN (5h - 10%)
├── Financeiro: 1h
├── Planejamento: 2h
├── Emails/comunicação: 2h

BUFFER (2h - 4%)
└── Imprevistos
```

#### Rotina Diária Sugerida

```
MANHÃ (Alta energia)
08:00 - 08:30: Review métricas + emails urgentes
08:30 - 12:00: Deep work (desenvolvimento ou conteúdo)

ALMOÇO
12:00 - 13:00: Pausa real (sem trabalho)

TARDE (Energia moderada)
13:00 - 15:00: Suporte + comunicação
15:00 - 17:00: Tarefas menores, meetings
17:00 - 18:00: Planejamento do próximo dia

NOITE
18:00+: Off (sustentabilidade!)

REGRAS:
- Notificações desligadas durante deep work
- Suporte só em horário definido
- 1 dia por semana sem código (growth only)
- 1 dia por semana off (sustentabilidade)
```

---

### 7.2 Quando Contratar

#### Decisão Framework

```
CONTRATAR SUPORTE QUANDO:
[ ] Tickets > 2h/dia consistentemente
[ ] Você não consegue tirar férias
[ ] Tempo de resposta > 24h
[ ] Está afetando desenvolvimento

CONTRATAR CONTEÚDO QUANDO:
[ ] SEO provado que funciona
[ ] Backlog de 20+ artigos mapeados
[ ] Seu tempo em conteúdo > 10h/semana
[ ] CAC do conteúdo < CAC de ads

CONTRATAR DEV QUANDO:
[ ] Revenue > $50K MRR
[ ] Backlog de 6+ meses de features
[ ] Você é gargalo técnico
[ ] Tech debt crítico acumulado

ORDEM TÍPICA:
1. VA para suporte ($5-15/h)
2. Freelancer de conteúdo ($50-200/artigo)
3. Primeiro funcionário (suporte senior ou growth)
4. Segundo funcionário (developer)
```

---

### 7.3 Burnout Prevention

#### Sinais de Alerta

```
FÍSICOS:
- Sono ruim consistente
- Dores de cabeça frequentes
- Sempre cansado

MENTAIS:
- Dificuldade de concentração
- Irritabilidade
- Perda de motivação

COMPORTAMENTAIS:
- Trabalhando fins de semana consistentemente
- Sem hobbies ou vida social
- Checando métricas obsessivamente
```

#### Protocolos de Proteção

```
DIÁRIO:
- Horário de término fixo
- Exercício (30min+)
- Tempo com família/amigos

SEMANAL:
- 1 dia completamente off
- 1 atividade não-trabalho

MENSAL:
- Review de horas trabalhadas
- 1 fim de semana prolongado

TRIMESTRAL:
- 1 semana off (mesmo que parcial)
- Review de goals e prioridades

REGRA DE OURO:
Se você quebrar, o negócio quebra junto.
Sustentabilidade pessoal = sustentabilidade do negócio.
```

---

## APÊNDICES

### A. Checklist de Lançamento Completo

```
PRÉ-VALIDAÇÃO
[ ] 10+ conversas com potenciais clientes
[ ] Problema confirmado por 70%+
[ ] Willingness to pay confirmado
[ ] Landing page com 10%+ conversão
[ ] 50+ emails coletados
[ ] 2+ pré-vendas/compromissos

MVP
[ ] Core feature funcional
[ ] Auth implementado
[ ] Pagamentos Stripe funcionando
[ ] Deploy em produção
[ ] Domínio configurado
[ ] SSL ativo
[ ] Analytics instalado
[ ] Error tracking ativo

LTD
[ ] Tiers definidos
[ ] Página de deal criada
[ ] FAQ preparado (15+ perguntas)
[ ] Templates de suporte prontos
[ ] Capacidade de suporte confirmada
[ ] Garantia definida (30-60 dias)

CRESCIMENTO
[ ] 5 páginas "alternative to" criadas
[ ] Product Hunt agendado
[ ] Programa de referral ativo
[ ] Presença em 3+ comunidades
[ ] Newsletter configurada

OPERACIONAL
[ ] Termos de uso publicados
[ ] Política de privacidade publicada
[ ] Processo de reembolso definido
[ ] Backup de dados configurado
[ ] Runbook de incidentes criado
```

### B. Stack de Ferramentas Recomendadas

```
DESENVOLVIMENTO
├── IDE: VS Code + GitHub Copilot
├── Versionamento: GitHub
├── CI/CD: GitHub Actions ou Vercel
├── Hosting: Vercel, Railway, ou Render
└── Database: Supabase ou PlanetScale

PAGAMENTOS
├── Processador: Stripe
├── Invoicing: Stripe (built-in)
└── Taxes: Stripe Tax ou Paddle

ANALYTICS
├── Produto: PostHog ou Mixpanel (free tier)
├── Website: Plausible ou Umami
└── Error: Sentry

SUPORTE
├── Chat: Crisp (free até 2 seats)
├── Tickets: Linear ou Notion
├── Knowledge base: Notion ou GitBook
└── Onboarding: Tours com Shepherd.js

MARKETING
├── Email: Resend + React Email
├── Newsletter: Buttondown ou Substack
├── Social scheduling: Buffer (free)
└── SEO: Ahrefs lite ou Ubersuggest

PRODUTIVIDADE
├── Notes: Obsidian ou Notion
├── Tasks: Linear ou Todoist
├── Calendar: Cal.com (para calls)
└── Docs: Notion ou Google Docs

CUSTO TOTAL ESTIMADO: $50-150/mês até $10K MRR
```

### C. Templates de Comunicação

#### Email de Boas-Vindas

```
Assunto: Bem-vindo ao [Produto] 🎉

Oi [Nome],

Obrigado por se juntar ao [Produto]!

Aqui está o que você precisa para começar:

1. [Link para primeiro passo]
2. [Link para documentação]
3. [Link para vídeo de 2 min]

Se tiver qualquer dúvida, responda este email — 
eu leio pessoalmente todas as mensagens.

Nos próximos dias, vou enviar algumas dicas para 
você aproveitar ao máximo o [Produto].

Abraço,
[Seu nome]
Fundador, [Produto]

P.S. Se quiser um tour guiado, agende aqui: [link calendly]
```

#### Email de Trial Expirando

```
Assunto: Seu trial termina em 2 dias

Oi [Nome],

Seu trial do [Produto] termina em 2 dias.

Vi que você [ação específica que fizeram].
Isso me mostra que você está [interpretação positiva].

Para continuar tendo acesso:
→ [CTA: Escolher um plano]

Se tiver dúvidas sobre qual plano escolher, 
me responda — fico feliz em ajudar.

[Seu nome]

P.S. Se não for o momento certo, sem problemas.
     Mas me conta o porquê? Ajuda muito a melhorar.
```

#### Pedido de Review

```
Assunto: Pode me ajudar com 2 minutos?

Oi [Nome],

Você está usando o [Produto] há [X semanas/meses] e 
parece estar [insight sobre uso deles].

Tenho um pedido: você poderia deixar uma review rápida no G2?
→ [Link direto para review]

Leva 2 minutos e ajuda MUITO outros [personas] 
a descobrirem o [Produto].

Como agradecimento, vou adicionar [benefício] na sua conta.

Obrigado demais!
[Seu nome]
```

---

## Notas Finais

Este plano é um guia, não uma bíblia. Adapte conforme aprende sobre seu mercado específico. Os fundadores que chegam a $100K MRR não seguem planos perfeitamente — eles executam consistentemente, aprendem rápido, e ajustam a rota.

**Três verdades para lembrar:**

1. **Validação > Construção.** Cada hora validando economiza dias construindo a coisa errada.

2. **Distribuição = Produto.** O melhor produto com distribuição ruim perde para produto mediano com distribuição excelente.

3. **Consistência > Intensidade.** 50h/semana por 3 anos vence 80h/semana por 6 meses seguido de burnout.

---

*Documento gerado em Dezembro/2024. Revisar e atualizar trimestralmente.*
