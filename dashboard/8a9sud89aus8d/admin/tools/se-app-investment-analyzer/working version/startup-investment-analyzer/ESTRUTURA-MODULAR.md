# 📁 Estrutura Modular do Projeto

## Visão Geral

O projeto foi refatorado em módulos pequenos (< 200 linhas cada) para facilitar manutenção e leitura.

## Estrutura de Arquivos

```
startup-investment-analyzer/
├── index.html                    # Página principal (805 linhas)
├── css/
│   └── style.css                 # Estilos (955 linhas)
├── js/
│   ├── main.js                   # Entry point (58 linhas)
│   ├── modules/                  # Módulos core
│   │   ├── state.js              # Gerenciamento de estado (56 linhas)
│   │   ├── utils.js              # Funções utilitárias (112 linhas)
│   │   ├── validation.js         # Validação de formulários (68 linhas)
│   │   ├── navigation.js         # Navegação entre steps (83 linhas)
│   │   ├── events.js             # Event listeners (115 linhas)
│   │   ├── scoring.js            # Cálculo de scores (195 linhas)
│   │   ├── reportHelpers.js      # Helpers para relatório (175 linhas)
│   │   └── report.js             # Geração de relatório (196 linhas)
│   ├── calculations/             # Módulos de cálculo
│   │   ├── founderMarketFit.js   # Founder-Market Fit (70 linhas)
│   │   ├── marketAttractiveness.js # Atratividade de mercado (80 linhas)
│   │   ├── pmf.js                # Product-Market Fit (97 linhas)
│   │   ├── saasMetrics.js        # Métricas SaaS (130 linhas)
│   │   └── unitEconomics.js      # Unit Economics (194 linhas)
│   └── tooltips.js               # Sistema de tooltips (294 linhas)
└── assets/                       # Imagens e recursos
```

## Ordem de Carregamento

Os scripts são carregados na seguinte ordem no `index.html`:

### 1. Core Modules (Base)
```html
<script src="js/modules/state.js"></script>      <!-- Estado global -->
<script src="js/modules/utils.js"></script>      <!-- Utilidades -->
<script src="js/modules/validation.js"></script> <!-- Validação -->
<script src="js/modules/navigation.js"></script> <!-- Navegação -->
```

### 2. Calculation Modules
```html
<script src="js/calculations/founderMarketFit.js"></script>
<script src="js/calculations/marketAttractiveness.js"></script>
<script src="js/calculations/pmf.js"></script>
<script src="js/calculations/saasMetrics.js"></script>
<script src="js/calculations/unitEconomics.js"></script>
```

### 3. Feature Modules
```html
<script src="js/modules/scoring.js"></script>       <!-- Score total -->
<script src="js/modules/reportHelpers.js"></script> <!-- Helpers -->
<script src="js/modules/report.js"></script>        <!-- Relatório -->
<script src="js/modules/events.js"></script>        <!-- Eventos -->
```

### 4. Extras & Entry Point
```html
<script src="js/tooltips.js"></script>  <!-- Tooltips -->
<script src="js/main.js"></script>      <!-- Inicialização -->
```

## Descrição dos Módulos

### Core Modules

#### `state.js`
- Gerencia estado global da aplicação
- Armazena: step atual, formData, scores
- Getters e setters centralizados

#### `utils.js`
- Formatação de moeda, percentual, números
- Helpers para ler valores do formulário
- LocalStorage save/load
- Atualização de range inputs

#### `validation.js`
- Validação de campos obrigatórios
- Mostra/limpa mensagens de erro
- Scroll para primeiro campo inválido

#### `navigation.js`
- Controla navegação entre steps
- Atualiza progress bar
- Gerencia botões prev/next
- Transições suaves entre etapas

#### `events.js`
- Inicializa todos event listeners
- Orquestra cálculos quando form muda
- Salva dados no state e localStorage
- Atualiza benchmarks dinâmicos

#### `scoring.js`
- Calcula score total ponderado (0-100)
- Scores por categoria (team, market, product, etc.)
- Atualiza live score no UI
- Mapeamento de valores qualitativos

#### `reportHelpers.js`
- Funções auxiliares para relatório
- Gera cards de categoria
- Benchmarks por estágio
- Veredictos e recomendações

#### `report.js`
- Gera relatório HTML final
- Insights automáticos
- Pontos fortes e fracos
- Recomendação de investimento

### Calculation Modules

#### `founderMarketFit.js`
- Implementa NFX Framework (7 componentes)
- Mapeia experiência e track record
- Calcula score 0-35
- Rating: Excepcional → Insuficiente

#### `marketAttractiveness.js`
- Porter's Five Forces
- Cálculo de atratividade (0-100%)
- Bottom-up TAM validation
- Warnings de market sizes

#### `pmf.js`
- Sean Ellis Test
- DAU/MAU ratio
- Cohort retention
- Status: Strong PMF → Pre-PMF

#### `saasMetrics.js`
- ARR calculation
- Quick Ratio (new+expansion / churn+contraction)
- NRR rating
- Annual churn

#### `unitEconomics.js`
- CAC, LTV, LTV/CAC
- CAC Payback period
- Rule of 40
- Runway calculation
- Magic Number

### Extra

#### `tooltips.js`
- Auto-injeta ícones ⓘ nos labels
- Tooltips com descrições ricas
- Suporta HTML (listas, bold, etc.)
- Responsivo mobile

#### `main.js`
- Entry point da aplicação
- Inicializa módulos na ordem correta
- Carrega dados salvos do localStorage
- Expõe API global: `window.StartupAnalyzer`

## Como Adicionar Novo Módulo

1. Crie arquivo em `js/modules/` ou `js/calculations/`
2. Mantenha < 200 linhas
3. Use naming convention: PascalCase para objetos
4. Adicione script tag no `index.html` na seção apropriada
5. Documente aqui

## Dependências Entre Módulos

```
main.js
  └─ Events.initialize()
      ├─ Navigation (prev/next)
      ├─ Validation (form checks)
      ├─ FounderMarketFit.calculate()
      ├─ MarketAttractiveness.calculate()
      ├─ PMF.calculate()
      ├─ SaaSMetrics.calculate()
      ├─ UnitEconomics.calculate()
      └─ Scoring.updateLiveScore()
          └─ Report.generate()
```

## Comunicação Entre Módulos

Todos os módulos acessam:
- `AppState` - para ler/escrever formData e scores
- `Utils` - para formatação e helpers
- Uns aos outros diretamente (ex: `Events` chama `Navigation.nextStep()`)

## Vantagens da Estrutura Modular

✅ **Legibilidade**: Arquivos < 200 linhas, fácil de entender
✅ **Manutenibilidade**: Mudanças isoladas por módulo
✅ **Reutilização**: Módulos independentes
✅ **Testabilidade**: Cada módulo pode ser testado isoladamente
✅ **Performance**: Browser cacheia módulos separadamente
✅ **Debugging**: Stack traces mais claros

## Migração do Código Antigo

O `app.js` original (1137 linhas) foi dividido em:
- 4 core modules (state, utils, validation, navigation)
- 5 calculation modules
- 4 feature modules (scoring, reportHelpers, report, events)
- 1 entry point (main)

**Total**: 14 arquivos bem organizados vs 1 arquivo monolítico
