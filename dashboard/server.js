import express from 'express';
import cors from 'cors';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';

// Importar rotas modulares
import authRoutes from './routes/auth.js';
import billingRoutes from './routes/billing.js';
import securityRoutes from './routes/security.js';
import oentregadorRoutes from './routes/oentregador.js';
import overviewRoutes from './routes/overview.js';
import adsRoutes from './routes/ads.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3333;

// Senha do dashboard via variavel de ambiente (Amplify)
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD;
const SECRET_ROUTE = '/8a9sud89aus8d';

// =============================================================================
// MIDDLEWARE CONFIGURATION
// =============================================================================

app.use(cors({
  origin: ['https://www.ohanax.com', 'https://ohanax.com', 'http://localhost:3333'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// =============================================================================
// AUTENTICACAO DO DASHBOARD
// =============================================================================

// Middleware de autenticacao para o dashboard
function authMiddleware(req, res, next) {
  const authToken = req.cookies?.dashboard_auth;

  if (authToken === DASHBOARD_PASSWORD) {
    return next();
  }

  // Retorna pagina de login
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Admin Access</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #0f172a;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .login-box {
          background: #1e293b;
          padding: 40px;
          border-radius: 12px;
          border: 1px solid #334155;
          width: 100%;
          max-width: 400px;
        }
        h1 {
          color: #f1f5f9;
          font-size: 24px;
          margin-bottom: 30px;
          text-align: center;
        }
        input {
          width: 100%;
          padding: 14px 16px;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 8px;
          color: #f1f5f9;
          font-size: 16px;
          margin-bottom: 20px;
        }
        input:focus {
          outline: none;
          border-color: #3b82f6;
        }
        button {
          width: 100%;
          padding: 14px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          transition: background 0.2s;
        }
        button:hover { background: #2563eb; }
        .error {
          color: #f87171;
          text-align: center;
          margin-bottom: 20px;
          display: ${req.query.error ? 'block' : 'none'};
        }
      </style>
    </head>
    <body>
      <div class="login-box">
        <h1>Admin Dashboard</h1>
        <p class="error">Senha incorreta</p>
        <form method="POST" action="${SECRET_ROUTE}/login">
          <input type="password" name="password" placeholder="Senha" autofocus required>
          <button type="submit">Entrar</button>
        </form>
      </div>
    </body>
    </html>
  `);
}

// Rota de login
app.post(`${SECRET_ROUTE}/login`, (req, res) => {
  const { password } = req.body;

  if (password === DASHBOARD_PASSWORD) {
    // Cookie seguro, expira em 30 dias
    res.cookie('dashboard_auth', password, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
      sameSite: 'strict'
    });
    return res.redirect(SECRET_ROUTE);
  }

  res.redirect(`${SECRET_ROUTE}?error=1`);
});

// Logout
app.get(`${SECRET_ROUTE}/logout`, (req, res) => {
  res.clearCookie('dashboard_auth');
  res.redirect(SECRET_ROUTE);
});

// =============================================================================
// DASHBOARD STATIC FILES (protegido por autenticacao)
// =============================================================================

app.use(SECRET_ROUTE, authMiddleware, express.static(join(__dirname, '8a9sud89aus8d')));

// =============================================================================
// API ROUTES (modulares)
// =============================================================================

app.use('/api/auth', authRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/oentregador', oentregadorRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api', overviewRoutes);

// =============================================================================
// WEBSITE ESTATICO (RAIZ)
// =============================================================================

// Serve arquivos estaticos do site principal
app.use(express.static(__dirname, {
  index: 'index.html',
  extensions: ['html']
}));

// Fallback para o site principal
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Dashboard available at http://localhost:${PORT}${SECRET_ROUTE}`);
});
