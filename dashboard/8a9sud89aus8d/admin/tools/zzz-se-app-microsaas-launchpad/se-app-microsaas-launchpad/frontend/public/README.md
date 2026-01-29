# 🚀 Landing Page de Alta Conversão

Template de landing page baseado em **pesquisa científica** de CRO (Conversion Rate Optimization).

---

## 📊 Princípios Aplicados (com fonte)

| Princípio | Impacto | Fonte |
|-----------|---------|-------|
| Remover navegação | +100% conversão | Unbounce |
| CTA em 1ª pessoa ("Quero meu...") | +90% cliques | ClickZ |
| Copy nível 5ª-7ª série | 11.1% vs 5.3% | Unbounce |
| 3 depoimentos | +34% conversão | WikiJob |
| Logos de clientes | +69% conversão | Unbounce |
| Garantia 30 dias | +21-26% conversão | Quick Sprout |
| Formulários ≤4 campos | +160% conversão | HubSpot |
| Velocidade ≤2.5s | +1.11% por 100ms | Cloudflare |
| 1 objetivo por página | -266% se múltiplos | KhrisDigital |

---

## 📁 Estrutura

```
landing-template/
├── index.html          # HTML (NÃO EDITE)
├── config.js           # ⭐ TODAS configurações
├── README.md           # Instruções
└── assets/
    ├── css/styles.css  # Estilos (NÃO EDITE)
    ├── js/main.js      # JavaScript (NÃO EDITE)
    └── images/         # Suas imagens
```

---

## 🎯 Como Usar

### 1. Copie a pasta
```bash
cp -r landing-template/ meu-produto/
```

### 2. Edite o `config.js`
O arquivo está **completamente documentado** com:
- Explicação de cada campo
- Dados de pesquisa
- Exemplos prontos

### 3. Adicione imagens em `assets/images/`
- `favicon.png` (32x32px)
- `og-image.jpg` (1200x630px)
- `hero-mockup.png`
- `testimonial-1.jpg`, `testimonial-2.jpg`, etc.
- `logo-1.png`, `logo-2.png`, etc. (logos de clientes)

### 4. Deploy!
- **Netlify**: Arraste a pasta em [app.netlify.com/drop](https://app.netlify.com/drop)
- **Vercel**: `npx vercel`
- **GitHub Pages**: Settings > Pages

---

## 🎨 Paletas de Cores

### SaaS Moderno (Cardápio Digital)
```javascript
theme: {
  primary: "#6366F1",      // Roxo/Índigo
  primaryDark: "#4F46E5",
  cta: "#10B981",          // Verde (contraste!)
  ctaHover: "#059669",
  accent: "#F59E0B"        // Amarelo
}
```

### Fintech / Investimentos
```javascript
theme: {
  primary: "#1E3A5F",      // Azul Navy
  primaryDark: "#1E3A8A",
  cta: "#10B981",          // Verde
  ctaHover: "#059669",
  accent: "#F59E0B"        // Dourado
}
```

### Food / BBQ
```javascript
theme: {
  primary: "#7C2D12",      // Marrom
  primaryDark: "#6B2A10",
  cta: "#F59E0B",          // Dourado
  ctaHover: "#D97706",
  accent: "#DC2626"        // Vermelho
}
```

### Logística / Hub
```javascript
theme: {
  primary: "#1E40AF",      // Azul
  primaryDark: "#1E3A8A",
  cta: "#F97316",          // Laranja
  ctaHover: "#EA580C",
  accent: "#10B981"        // Verde
}
```

### Jurídico / Gov
```javascript
theme: {
  primary: "#065F46",      // Verde escuro
  primaryDark: "#064E3B",
  cta: "#F59E0B",          // Dourado
  ctaHover: "#D97706",
  accent: "#1E40AF"        // Azul
}
```

---

## 📐 Estrutura de Seções (Ordem Otimizada)

A ordem das seções segue a jornada psicológica do visitante:

1. **HERO** - Promessa + CTA acima da dobra (57% do tempo de visualização)
2. **LOGO BAR** - Autoridade imediata (+69% conversão)
3. **PROBLEMA** - Agitar dor (PAS Framework)
4. **SOLUÇÃO** - Apresentar produto
5. **BENEFÍCIOS** - O que ele GANHA (não features)
6. **COMO FUNCIONA** - Reduz fricção mental
7. **DEPOIMENTOS** - Prova social (+34%)
8. **COMPARATIVO** - Antes/Depois
9. **PREÇOS** - Ancoragem + Destaque
10. **GARANTIA** - Remove risco (+21-26%)
11. **FAQ** - Mata objeções
12. **CTA FINAL** - Urgência genuína

---

## ✍️ Checklist de Copy

### Headlines
- [ ] 8-13 palavras (ideal)
- [ ] Benefício concreto (não feature)
- [ ] Números específicos (527, não "500+")
- [ ] Números ímpares (+20% performance)

### CTAs
- [ ] Primeira pessoa ("Quero meu...", "Criar minha...")
- [ ] Verbo de ação (Quero, Criar, Começar)
- [ ] Subtext com benefício (Grátis, 5min, Sem cartão)

### Depoimentos
- [ ] Nome completo + Cargo + Empresa
- [ ] Foto real
- [ ] Métrica específica ("Economizei R$400")
- [ ] Rating (5 estrelas)

### Geral
- [ ] Copy nível 5ª-7ª série
- [ ] Sem jargões técnicos
- [ ] Benefícios > Features

---

## ⚡ Checklist de Performance

### Core Web Vitals
- [ ] LCP ≤ 2.5s (hero image otimizada)
- [ ] CLS = 0 (tamanhos de imagem definidos)
- [ ] INP < 200ms (JS minimal)

### Otimizações
- [ ] Imagens WebP/AVIF
- [ ] Imagens < 200KB
- [ ] Lazy loading em imagens abaixo da dobra
- [ ] Fontes com `display: swap`

---

## 🔧 Seções Opcionais

Cada seção pode ser desativada com `show: false`:

```javascript
// Desativa a seção de comparativo
comparison: {
  show: false,
  // ...
}
```

---

## 📱 Mobile-First

O template é otimizado para mobile (83% do tráfego):

- **Sticky CTA** no mobile (sempre visível)
- **Botões 48px** (Apple Guidelines)
- **Touch targets** adequados
- **WhatsApp float** para contato direto

---

## 📈 Analytics Recomendados

Configure no `config.js`:

```javascript
analytics: {
  googleAnalytics: "G-XXXXXXXXXX",
  clarity: "xxxxxxxx",  // Microsoft Clarity (GRÁTIS!)
  facebookPixel: "1234567890",
  hotjar: "1234567"
}
```

### Por que Microsoft Clarity?
- 100% gratuito
- Heatmaps ilimitados
- Session recordings
- Sem limite de pageviews

---

## 🧪 O que Testar (A/B)

Prioridade de testes baseada em impacto:

1. **Headline** - Maior impacto (500% variação)
2. **CTA text** - "Quero meu" vs "Comece seu"
3. **CTA color** - Contraste é mais importante que cor
4. **Hero image** - Com pessoa vs Produto só
5. **Preço destaque** - Qual plano destacar
6. **Garantia** - 30 dias vs 60 dias vs 1 ano

---

## 📋 Checklist de Lançamento

### Antes de publicar
- [ ] Todas as strings editadas no `config.js`
- [ ] Imagens adicionadas e otimizadas
- [ ] Links de CTA apontando para destino correto
- [ ] WhatsApp com número correto
- [ ] Analytics configurado
- [ ] Testado em mobile (Chrome DevTools)
- [ ] Testado em desktop
- [ ] Velocidade < 3s (PageSpeed Insights)
- [ ] Favicon e OG Image configurados

### Após publicar
- [ ] Verificar no Google PageSpeed
- [ ] Testar formulário/CTA end-to-end
- [ ] Configurar goals no GA4
- [ ] Ativar Clarity para heatmaps

---

## 📚 Referências

- [Unbounce Conversion Benchmark Report 2024](https://unbounce.com/conversion-benchmark-report/)
- [Nielsen Norman Group - Eye Tracking](https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/)
- [CXL - Cialdini's Principles](https://cxl.com/blog/cialdinis-principles-persuasion/)
- [Crazy Egg Case Study (+363%)](https://conversion-rate-experts.com/crazy-egg-case-study/)
- [Dropbox Growth Study](https://www.linkedin.com/pulse/how-explainer-video-helped-dropbox-grow-0-100-million)

---

## 📄 Licença

MIT - Use como quiser!

---

**Dúvidas?** O `config.js` está completamente documentado com explicações e exemplos.
