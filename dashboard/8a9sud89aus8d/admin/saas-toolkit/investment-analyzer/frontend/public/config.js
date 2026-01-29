/**
 * ============================================
 * LANDING PAGE DE ALTA CONVERSÃO
 * ============================================
 * 
 * Template baseado em pesquisa científica:
 * - Cases: Dropbox (+10%), Crazy Egg (+363%), Slack (30% free-to-paid)
 * - Frameworks: PAS, AIDA, StoryBrand, Cialdini
 * - Dados: Unbounce, VWO, Nielsen Norman Group
 * 
 * PRINCÍPIOS APLICADOS:
 * ✓ 1 único CTA/objetivo por página
 * ✓ Sem navegação (dobra conversões)
 * ✓ CTA em primeira pessoa ("Quero meu...")
 * ✓ Copy nível 5ª-7ª série (11.1% vs 5.3%)
 * ✓ Prova social com métricas específicas
 * ✓ Headlines 8-13 palavras
 * ✓ Formulários ≤4 campos
 * ✓ Mobile-first (83% do tráfego)
 * ✓ Velocidade ≤2.5s (cada 100ms = +1.11%)
 * 
 * ESTRUTURA DE SEÇÕES (ordem otimizada):
 * 1. Hero (above the fold)
 * 2. Logo Bar (autoridade)
 * 3. Problema (agitar dor - PAS)
 * 4. Solução (apresentar produto)
 * 5. Benefícios (não features)
 * 6. Como Funciona (3 passos)
 * 7. Prova Social (depoimentos)
 * 8. Comparativo (antes/depois)
 * 9. Preços (ancoragem)
 * 10. Garantia (risk reversal)
 * 11. FAQ (matar objeções)
 * 12. CTA Final (urgência)
 * 
 * INSTRUÇÕES:
 * 1. Edite APENAS este arquivo
 * 2. Adicione imagens em assets/images/
 * 3. Deploy
 */

const CONFIG = {

  // ============================================
  // META & SEO
  // ============================================
  meta: {
    title: "CardápioDigital — Cardápio Online Grátis para Restaurantes",
    description: "Crie seu cardápio digital em 5 minutos. +500 restaurantes já usam. QR Code grátis. Comece agora sem cartão.",
    keywords: "cardápio digital, menu online, qr code restaurante",
    author: "CardápioDigital",
    url: "https://cardapiodigital.com.br",
    ogImage: "assets/images/og-image.jpg",
    favicon: "assets/images/favicon.png"
  },

  // ============================================
  // TEMA DE CORES
  // ============================================
  // REGRA: CTA deve CONTRASTAR com primary
  // Teste HubSpot: contraste > cor específica
  //
  // PALETAS PRONTAS:
  // ─────────────────────────────────────────
  // SaaS Moderno (Cardápio):
  //   primary: "#6366F1", cta: "#10B981", accent: "#F59E0B"
  //
  // Fintech/Investimentos:
  //   primary: "#1E3A5F", cta: "#10B981", accent: "#F59E0B"
  //
  // Food/BBQ:
  //   primary: "#7C2D12", cta: "#F59E0B", accent: "#DC2626"
  //
  // Logística:
  //   primary: "#1E40AF", cta: "#F97316", accent: "#10B981"
  //
  // Jurídico/Gov:
  //   primary: "#065F46", cta: "#F59E0B", accent: "#1E40AF"
  // ─────────────────────────────────────────
  theme: {
    primary: "#6366F1",       // Cor da marca (headers, textos)
    primaryDark: "#4F46E5",   // Hover do primary
    cta: "#10B981",           // COR DO BOTÃO - deve contrastar!
    ctaHover: "#059669",      // Hover do CTA
    accent: "#F59E0B",        // Destaques (badges, ícones)
    dark: "#111827",          // Texto principal
    medium: "#6B7280",        // Texto secundário
    light: "#F9FAFB",         // Backgrounds claros
    white: "#FFFFFF",
    danger: "#EF4444",        // Erros, alertas
    
    // Gradientes
    heroGradient: "linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)",
    ctaGradient: "linear-gradient(135deg, #10B981 0%, #059669 100%)"
  },

  // ============================================
  // HEADER (mínimo - sem navegação!)
  // ============================================
  // PESQUISA: Remover navegação DOBRA conversões
  // Apenas logo + CTA
  header: {
    logo: {
      text: "CardápioDigital",
      icon: "🍽️",
      image: ""  // Se preferir imagem, coloque o path aqui
    },
    // Apenas 1 CTA no header
    cta: {
      text: "Começar Grátis",
      href: "#cta-final"
    }
  },

  // ============================================
  // HERO SECTION (Above the Fold)
  // ============================================
  // PESQUISA: 57% do tempo de visualização
  // Usuários formam opinião em 50ms
  // 
  // DEVE CONTER:
  // - Headline de BENEFÍCIO (não feature)
  // - Subheadline explicando o "como"
  // - CTA contrastante
  // - Prova social rápida
  hero: {
    // Badge de urgência/novidade (opcional)
    badge: {
      show: true,
      icon: "✨",
      text: "Novo: 12 temas profissionais inclusos"
    },
    
    // HEADLINE: 8-13 palavras, benefício concreto
    // Números ímpares performam 20% melhor
    // Superlativos negativos performam 30% melhor
    headline: {
      before: "Pare de perder vendas com",
      highlight: "cardápio de papel",
      after: ""
    },
    
    // SUBHEADLINE: Explica o "como" em 1 frase
    subheadline: "Crie seu cardápio digital em 5 minutos. Seus clientes escaneiam o QR Code e pedem direto do celular.",
    
    // CTA PRINCIPAL
    // REGRA: Primeira pessoa converte 90% mais
    // "Quero meu X" > "Comece seu X"
    cta: {
      primary: {
        text: "Quero Criar Meu Cardápio",
        href: "#cta-final",
        subtext: "Grátis • Sem cartão • 5 min setup"
      },
      // CTA secundário (opcional) - para quem precisa mais info
      secondary: {
        show: true,
        text: "Ver exemplo ao vivo",
        href: "#demo",
        icon: "▶"
      }
    },
    
    // MÉTRICAS (prova social rápida)
    // Números específicos > números redondos
    stats: [
      { value: "527", label: "Restaurantes ativos" },
      { value: "4.9", label: "Nota no Google", icon: "⭐" },
      { value: "5min", label: "Setup completo" }
    ],
    
    // IMAGEM/VÍDEO
    // Vídeo aumentou conversão Dropbox em +10%
    // Crazy Egg: vídeo = +64% conversão
    media: {
      type: "image",  // "image" ou "video"
      src: "assets/images/hero-mockup.png",
      alt: "Cardápio digital no celular",
      // Se video:
      videoId: "",  // YouTube ID
      videoPoster: ""
    }
  },

  // ============================================
  // LOGO BAR (Prova Social Rápida)
  // ============================================
  // PESQUISA: Logos aumentam conversão em 69%
  // com baixa carga cognitiva
  logoBar: {
    show: true,
    title: "Usado por restaurantes como",
    // Logos de clientes ou "Como visto em"
    logos: [
      { src: "assets/images/logo-1.png", alt: "Cliente 1" },
      { src: "assets/images/logo-2.png", alt: "Cliente 2" },
      { src: "assets/images/logo-3.png", alt: "Cliente 3" },
      { src: "assets/images/logo-4.png", alt: "Cliente 4" },
      { src: "assets/images/logo-5.png", alt: "Cliente 5" }
    ]
  },

  // ============================================
  // SEÇÃO PROBLEMA (PAS Framework)
  // ============================================
  // PESQUISA: Agitar a dor antes de apresentar solução
  // aumenta conexão emocional e conversão
  problem: {
    show: true,
    
    // Headline que identifica com a dor
    headline: "Seu cardápio está custando dinheiro",
    subheadline: "Donos de restaurante perdem até R$2.000/mês com cardápios desatualizados, impressões caras e clientes confusos.",
    
    // Lista de problemas (agitação)
    // Ícone + Problema + Consequência
    problems: [
      {
        icon: "💸",
        title: "R$300+ em impressão por mês",
        description: "Cada mudança de preço = nova impressão. Dinheiro jogado fora."
      },
      {
        icon: "😤",
        title: "Clientes esperando atendimento",
        description: "Garçom ocupado explicando o cardápio em vez de vendendo mais."
      },
      {
        icon: "🦠",
        title: "Cardápio sujo e rasgado",
        description: "Mesma superfície tocada por dezenas de mãos. Péssima impressão."
      },
      {
        icon: "📉",
        title: "Promoções que ninguém vê",
        description: "Difícil atualizar. Quando atualiza, ninguém nota."
      }
    ],
    
    // Transição para solução
    transition: "E se existisse uma forma de resolver tudo isso em 5 minutos?"
  },

  // ============================================
  // SEÇÃO SOLUÇÃO
  // ============================================
  // Apresenta o produto como resposta aos problemas
  solution: {
    show: true,
    
    headline: "Um cardápio que trabalha por você",
    subheadline: "CardápioDigital elimina impressões, acelera pedidos e impressiona seus clientes.",
    
    // Imagem/GIF do produto em ação
    media: {
      src: "assets/images/solution-demo.png",
      alt: "Demo do CardápioDigital"
    },
    
    // Pontos principais (máx 3-4)
    points: [
      {
        icon: "⚡",
        title: "Atualização instantânea",
        description: "Mudou o preço? 2 cliques. Zero impressão."
      },
      {
        icon: "📱",
        title: "QR Code nas mesas",
        description: "Cliente escaneia e vê tudo no próprio celular."
      },
      {
        icon: "🎨",
        title: "Visual profissional",
        description: "12 temas prontos. Seu restaurante com cara de premium."
      }
    ]
  },

  // ============================================
  // BENEFÍCIOS (Não Features!)
  // ============================================
  // REGRA: Feature → Benefício → Resultado
  // "O que isso significa para MIM?"
  benefits: {
    show: true,
    
    headline: "Por que donos de restaurante amam o CardápioDigital",
    subheadline: "",
    
    // Grid de benefícios (6 items ideal)
    items: [
      {
        icon: "💰",
        title: "Economize R$3.600/ano",
        description: "Sem custos de impressão. Atualize quantas vezes quiser, grátis.",
        // Métrica específica aumenta credibilidade
        metric: "-R$300/mês"
      },
      {
        icon: "⏱️",
        title: "Liberte seus garçons",
        description: "Cliente vê tudo no celular. Garçom foca em vender, não explicar.",
        metric: "+5min/mesa"
      },
      {
        icon: "📈",
        title: "Aumente o ticket médio",
        description: "Fotos de alta qualidade vendem. Clientes pedem mais quando veem.",
        metric: "+23% ticket"
      },
      {
        icon: "🚀",
        title: "Pronto em 5 minutos",
        description: "Cadastre, adicione itens, imprima QR. Simples assim.",
        metric: "5min setup"
      },
      {
        icon: "📊",
        title: "Saiba o que vende mais",
        description: "Analytics básico mostra seus pratos mais visualizados.",
        metric: "Dados reais"
      },
      {
        icon: "🔄",
        title: "Sempre atualizado",
        description: "Promoção do dia, prato que acabou... Atualiza em segundos.",
        metric: "Tempo real"
      }
    ]
  },

  // ============================================
  // COMO FUNCIONA (3 Passos)
  // ============================================
  // PESQUISA: Reduz fricção mental
  // Mostra que é simples e rápido
  howItWorks: {
    show: true,
    
    headline: "Funcionando em 3 passos simples",
    subheadline: "Não precisa de conhecimento técnico. Se sabe usar WhatsApp, sabe usar CardápioDigital.",
    
    steps: [
      {
        number: "1",
        title: "Cadastre seu restaurante",
        description: "1 minuto. Só precisa de nome e senha. Sem cartão de crédito.",
        icon: "📝",
        image: "assets/images/step-1.png"
      },
      {
        number: "2",
        title: "Monte seu cardápio",
        description: "Adicione categorias, itens, fotos e preços. Arrasta e solta.",
        icon: "🎯",
        image: "assets/images/step-2.png"
      },
      {
        number: "3",
        title: "Imprima o QR Code",
        description: "Geramos automaticamente. Imprima e coloque nas mesas. Pronto!",
        icon: "🚀",
        image: "assets/images/step-3.png"
      }
    ],
    
    // CTA após os passos
    cta: {
      show: true,
      text: "Quero Começar Agora",
      href: "#cta-final"
    }
  },

  // ============================================
  // PROVA SOCIAL (Depoimentos)
  // ============================================
  // PESQUISA: WikiJob +34% com 3 depoimentos
  // Depoimentos com métricas específicas > genéricos
  // Vídeo testimonials = +25-80% vs texto
  testimonials: {
    show: true,
    
    headline: "O que nossos clientes dizem",
    subheadline: "Resultados reais de restaurantes como o seu",
    
    // Destaque numérico
    highlight: {
      show: true,
      number: "4.9",
      label: "Nota média de satisfação",
      sublabel: "baseado em 127 avaliações"
    },
    
    items: [
      {
        // REGRA: Nome completo, cargo, foto, métrica específica
        quote: "Economizei R$400 no primeiro mês só em impressão. Meus clientes adoram ver as fotos dos pratos antes de pedir.",
        author: "Maria Santos",
        role: "Dona do Bistrô da Maria, SP",
        avatar: "assets/images/testimonial-1.jpg",
        metric: "-R$400/mês",
        rating: 5,
        // Vídeo (opcional) - aumenta conversão em 25-80%
        video: ""
      },
      {
        quote: "Meu ticket médio subiu 23% depois que coloquei fotos profissionais no cardápio. As pessoas pedem mais quando veem.",
        author: "João Oliveira",
        role: "Gerente do Bar do João, RJ",
        avatar: "assets/images/testimonial-2.jpg",
        metric: "+23% vendas",
        rating: 5,
        video: ""
      },
      {
        quote: "Setup em 10 minutos. O suporte me ajudou a configurar tudo. Simples demais, não sei como fiquei tanto tempo sem.",
        author: "Ana Costa",
        role: "Proprietária da Cafeteria Aroma, MG",
        avatar: "assets/images/testimonial-3.jpg",
        metric: "10min setup",
        rating: 5,
        video: ""
      }
    ]
  },

  // ============================================
  // COMPARATIVO (Antes/Depois)
  // ============================================
  // Mostra claramente a transformação
  comparison: {
    show: true,
    
    headline: "Cardápio de papel vs. CardápioDigital",
    
    before: {
      title: "Antes",
      subtitle: "Cardápio tradicional",
      points: [
        "R$300+/mês em impressão",
        "Atualização leva dias",
        "Sem fotos ou fotos ruins",
        "Garçom explica cada item",
        "Sem dados de vendas",
        "Visual amador"
      ]
    },
    after: {
      title: "Depois",
      subtitle: "Com CardápioDigital",
      points: [
        "R$0 em impressão",
        "Atualização em 2 cliques",
        "Fotos de alta qualidade",
        "Cliente se serve pelo celular",
        "Analytics de visualização",
        "12 temas profissionais"
      ]
    }
  },

  // ============================================
  // PREÇOS
  // ============================================
  // PESQUISA: Ancoragem - mostrar plano mais caro primeiro
  // Destacar o plano recomendado
  // Mostrar economia anual
  pricing: {
    show: true,
    
    headline: "Escolha seu plano",
    subheadline: "Comece grátis. Upgrade quando precisar.",
    
    // Badge de desconto
    badge: {
      show: true,
      text: "🎉 20% OFF no plano anual"
    },
    
    // Toggle mensal/anual
    billingToggle: {
      show: true,
      monthly: "Mensal",
      annual: "Anual",
      annualDiscount: "-20%"
    },
    
    plans: [
      {
        name: "Grátis",
        description: "Para experimentar",
        price: {
          monthly: "R$0",
          annual: "R$0"
        },
        period: "/mês",
        features: [
          "1 cardápio",
          "Até 20 itens",
          "3 temas básicos",
          "QR Code padrão",
          "Marca d'água"
        ],
        limitations: [
          "Suporte por email"
        ],
        cta: {
          text: "Começar Grátis",
          href: "#cta-final"
        },
        highlighted: false,
        badge: ""
      },
      {
        name: "Pro",
        description: "Mais popular",
        price: {
          monthly: "R$79",
          annual: "R$63"
        },
        period: "/mês",
        features: [
          "Cardápios ilimitados",
          "Itens ilimitados",
          "Todos os 12 temas",
          "QR Code personalizado",
          "Sem marca d'água",
          "Analytics básico",
          "Suporte prioritário"
        ],
        limitations: [],
        cta: {
          text: "Quero o Pro",
          href: "#cta-final"
        },
        highlighted: true,  // Destaque visual
        badge: "Mais Popular"
      },
      {
        name: "Business",
        description: "Para redes",
        price: {
          monthly: "R$199",
          annual: "R$159"
        },
        period: "/mês",
        features: [
          "Tudo do Pro",
          "Multi-unidades",
          "Domínio próprio",
          "White-label",
          "API de integração",
          "Gerente de conta",
          "SLA 99.9%"
        ],
        limitations: [],
        cta: {
          text: "Falar com Vendas",
          href: "#cta-final"
        },
        highlighted: false,
        badge: ""
      }
    ]
  },

  // ============================================
  // GARANTIA (Risk Reversal)
  // ============================================
  // PESQUISA: Money-back 30 dias = +21-26% conversão
  // Garantia de 1 ano = DOBRA conversões (+3% refunds)
  guarantee: {
    show: true,
    
    headline: "Garantia de 30 dias",
    subheadline: "Se não gostar, devolvemos 100% do seu dinheiro. Sem perguntas, sem burocracia.",
    
    // Ícone de garantia/selo
    icon: "🛡️",
    
    // Pontos da garantia
    points: [
      "Cancele quando quiser",
      "Sem multa ou fidelidade",
      "Reembolso em até 7 dias úteis"
    ],
    
    // Assinatura (adiciona credibilidade)
    signature: {
      show: true,
      name: "Diego Ferreira",
      role: "Fundador, CardápioDigital",
      image: "assets/images/founder.jpg"
    }
  },

  // ============================================
  // FAQ (Matar Objeções)
  // ============================================
  // PESQUISA: FAQ bem feito reduz atrito e suporte
  // Ordenar por objeções mais comuns
  faq: {
    show: true,
    
    headline: "Perguntas frequentes",
    subheadline: "",
    
    items: [
      {
        question: "Precisa baixar algum aplicativo?",
        answer: "Não! Seus clientes acessam o cardápio direto pelo navegador do celular. Basta escanear o QR Code. Funciona em qualquer celular, iOS ou Android."
      },
      {
        question: "E se eu quiser cancelar?",
        answer: "Cancele quando quiser, sem multa. No plano grátis, sua conta fica ativa para sempre. Nos planos pagos, você tem 30 dias de garantia."
      },
      {
        question: "Preciso de conhecimento técnico?",
        answer: "Zero. Se você sabe usar WhatsApp, sabe usar o CardápioDigital. É arrastar e soltar. E nosso suporte te ajuda se precisar."
      },
      {
        question: "Funciona sem internet no restaurante?",
        answer: "O cardápio precisa de internet para carregar, mas a maioria dos clientes usa o próprio 4G/5G do celular. Você não precisa oferecer WiFi."
      },
      {
        question: "Posso ter cardápios diferentes (almoço, jantar)?",
        answer: "Sim! No plano Pro você pode criar cardápios ilimitados e alternar entre eles com um clique."
      },
      {
        question: "Como funciona o suporte?",
        answer: "Plano Grátis: email (resposta em 48h). Plano Pro: chat prioritário (resposta em 4h). Business: WhatsApp direto com seu gerente de conta."
      }
    ]
  },

  // ============================================
  // CTA FINAL (Urgência + Escassez)
  // ============================================
  // PESQUISA: Última chance de converter
  // Urgência GENUÍNA (não falsa)
  ctaFinal: {
    show: true,
    
    headline: "Pronto para modernizar seu cardápio?",
    subheadline: "Junte-se a 527 restaurantes que já faturam mais com CardápioDigital",
    
    // CTA principal
    cta: {
      text: "Criar Meu Cardápio Grátis",
      href: "https://app.cardapiodigital.com.br/cadastro",
      subtext: "Setup em 5 minutos • Sem cartão de crédito"
    },
    
    // Urgência genuína (opcional)
    urgency: {
      show: true,
      text: "🎁 Bônus: Primeiros 50 cadastros do mês ganham consultoria grátis de cardápio",
      // Se quiser contador (use com honestidade!)
      countdown: {
        show: false,
        endDate: "2024-12-31T23:59:59"
      }
    },
    
    // Trust signals finais
    trustSignals: [
      "✓ Grátis para sempre no plano básico",
      "✓ Sem cartão de crédito",
      "✓ Suporte em português"
    ]
  },

  // ============================================
  // FOOTER
  // ============================================
  footer: {
    logo: {
      text: "CardápioDigital",
      icon: "🍽️"
    },
    tagline: "Cardápios digitais que vendem mais",
    
    links: [
      { text: "Termos de Uso", href: "/termos" },
      { text: "Privacidade", href: "/privacidade" },
      { text: "Contato", href: "/contato" }
    ],
    
    social: [
      { icon: "instagram", href: "https://instagram.com/cardapiodigital" },
      { icon: "whatsapp", href: "https://wa.me/5511999999999" }
    ],
    
    copyright: "© 2024 CardápioDigital. Todos os direitos reservados.",
    
    // Trust badges (máx 3-4)
    badges: [
      { src: "assets/images/badge-ssl.png", alt: "Site Seguro SSL" },
      { src: "assets/images/badge-stripe.png", alt: "Pagamento Seguro" }
    ]
  },

  // ============================================
  // STICKY CTA (Mobile)
  // ============================================
  // PESQUISA: 83% do tráfego é mobile
  // CTA sempre visível aumenta conversão
  stickyCta: {
    show: true,
    text: "Criar Cardápio Grátis",
    href: "#cta-final",
    // Só mostra após scroll
    showAfterScroll: 500  // pixels
  },

  // ============================================
  // WHATSAPP FLOAT
  // ============================================
  whatsapp: {
    show: true,
    number: "5511999999999",
    message: "Olá! Quero saber mais sobre o CardápioDigital",
    position: "left"  // "left" ou "right" (right se sticky CTA existir)
  },

  // ============================================
  // ANALYTICS
  // ============================================
  analytics: {
    googleAnalytics: "",      // G-XXXXXXXXXX
    googleTagManager: "",     // GTM-XXXXXXX
    facebookPixel: "",        // Pixel ID
    hotjar: "",               // Hotjar ID
    clarity: ""               // Microsoft Clarity ID (grátis!)
  },

  // ============================================
  // FORMULÁRIO (se necessário)
  // ============================================
  // PESQUISA: ≤4 campos = +160% conversão
  // Multi-step = +86% vs single page
  form: {
    show: false,  // Se true, mostra form em vez de redirect
    
    // Campos (máximo 4!)
    fields: [
      { name: "name", label: "Seu nome", type: "text", required: true },
      { name: "email", label: "Seu email", type: "email", required: true },
      { name: "restaurant", label: "Nome do restaurante", type: "text", required: true },
      { name: "phone", label: "WhatsApp", type: "tel", required: false }  // Opcional!
    ],
    
    // Multi-step (recomendado se >3 campos)
    multiStep: {
      enabled: false,
      steps: [
        { fields: ["name", "email"], title: "Seus dados" },
        { fields: ["restaurant", "phone"], title: "Seu restaurante" }
      ]
    },
    
    submitButton: "Criar Minha Conta Grátis",
    successMessage: "Pronto! Verifique seu email.",
    
    // Webhook/endpoint
    endpoint: "https://api.cardapiodigital.com.br/signup"
  }

};

// ============================================
// NÃO EDITE ABAIXO
// ============================================
if (typeof module !== 'undefined') module.exports = CONFIG;
