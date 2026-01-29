// Helpers / Utility Functions

// Formatters
export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

export function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pt-BR');
}

export function formatDateTime(date) {
  if (!date) return '-';
  return new Date(date).toLocaleString('pt-BR');
}

export function formatNumber(num) {
  if (!num && num !== 0) return '--';
  return num.toLocaleString('pt-BR');
}

// Project helpers
export function getProjectClass(projectName) {
  if (!projectName) return '';
  if (projectName.includes('auth')) return 'auth';
  if (projectName.includes('billing')) return 'billing';
  if (projectName.includes('security')) return 'security';
  if (projectName.includes('oentregador')) return 'oentregador';
  if (projectName.includes('post-automation')) return 'post-automation';
  if (projectName.includes('cardapio')) return 'cardapio';
  if (projectName.includes('redutor')) return 'redutor';
  return '';
}

export function formatProjectName(name) {
  if (!name) return '-';
  const map = {
    'app-auth': 'Auth',
    'app-billing': 'Billing',
    'security-audit': 'Security',
    'app-oentregador': 'oEntregador',
    'oentregador': 'oEntregador',
    'app-post-automation': 'Post Automation',
    'cardapio-digital': 'Cardapio Digital',
    'redutor-inss': 'Redutor INSS'
  };
  return map[name] || name;
}

// Project mapping
export const projectMapping = {
  'auth': 'app-auth',
  'billing': 'app-billing',
  'security': 'security-audit',
  'oentregador': 'app-oentregador'
};

// Chart theme
export const chartTheme = {
  background: 'transparent',
  textColor: '#a1a1aa',
  gridColor: '#27272a',
  tooltipBg: '#18181b',
  tooltipBorder: '#27272a'
};
