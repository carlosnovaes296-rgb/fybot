import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'node:fs';
import http from 'http';
import { WebSocketServer, WebSocket as NodeWebSocket } from 'ws';
import { exec } from 'child_process';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import derivRouter from './backend/deriv/routes.ts';
import session from 'express-session';
// (API de Bot Deriv removida)
import axios from 'axios';
import { DerivConnectionManager } from './backend/services/DerivConnectionManager.ts';
import { DerivBotEngineEMA } from './backend/services/DerivBotEngine.ts';
dotenv.config();
import * as dbHelper from './backend/db/mysql.ts';

// Copiar bots atualizados para a pasta public
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  fs.copyFileSync(path.join(__dirname, 'Fybot_Pro.mq5'), path.join(__dirname, 'public', 'Fybot_Pro.mq5'));
  fs.copyFileSync(path.join(__dirname, 'Fybot_Sniper.mq5'), path.join(__dirname, 'public', 'Fybot_Sniper.mq5'));
  console.log('Arquivos .mq5 copiados para a pasta public com sucesso!');
} catch (err) {
  console.error('Erro ao copiar arquivos .mq5:', err);
}

let mysqlPool: mysql.Pool | null = null;

const isTradingTime = (): boolean => {
  return true; // Liberado 24h para testes da madrugada
};

// Remove PG pool logic

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(session({
    secret: process.env.SESSION_SECRET || 'fybot-deriv-secret-key-2026',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
  }));
  app.use(express.json());
  app.use(express.text({ type: '*/*' }));
  app.use((req, res, next) => {
    if (Buffer.isBuffer(req.body)) {
      req.body = req.body.toString();
    }
    if (typeof req.body === 'string') {
      try {
        req.body = JSON.parse(req.body.replace(/,,/g, ','));
      } catch (e) {
        req.body = {};
      }
    }
    next();
  });

  app.get('/api/dev/reset-banco', async (req, res) => {
    try {
      await dbHelper.pool.query('TRUNCATE TABLE referral_earnings');
      await dbHelper.pool.query('TRUNCATE TABLE withdrawals');
      await dbHelper.pool.query('TRUNCATE TABLE payments');
      await dbHelper.pool.query('DELETE FROM licenses WHERE userId != "1"');

      // Clear memory
      referralEarnings.splice(0, referralEarnings.length);
      withdrawals.splice(0, withdrawals.length);
      payments.splice(0, payments.length);

      const adminLicenses = licenses.filter(l => l.userId === '1');
      licenses.splice(0, licenses.length, ...adminLicenses);

      saveDB();
      res.send('<h1>Banco de dados (Ganhos, Saques, Pagamentos e Licenças de Teste) ZERADO com sucesso!</h1><p>Volte para a dashboard.</p>');
    } catch (e: any) {
      res.status(500).send('Erro: ' + e.message);
    }
  });

  app.use('/api/deriv', derivRouter);

  let globalConnectionManager: DerivConnectionManager | null = null;
  let globalDerivEngine: DerivBotEngineEMA | null = null;

  const DB_DIR = path.join(process.cwd(), 'data');
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR);
  const DB_PATH = path.join(DB_DIR, 'db.json');
  // Generate standard UUID v4
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Initial State partitioned by user
  const userStates: Record<string, any> = {};

  const getUserState = (userId: string | undefined): any => {
    const id = userId || "1"; // Fallback to '1' (Carlos Novaes) as default
    if (!userStates[id]) {
      userStates[id] = {
        botRunning: false,
        balance: 0,
        equity: 0,
        currency: 'USD',
        activeTrades: 0,
        accountType: 'DISCONNECTED', // 'REAL' | 'DEMO' | 'DISCONNECTED'
        pendingOrders: new Set<string>(),
        symbolTrend: {},
        lastOrderTime: {},
        dailyProfit: 0.00,
        dailyProfitOffset: 0,
        dailyProfitTarget: 0.00,
        isCustomTarget: false,
        dailyResetHour: "10:00",
        preferredSession: "Brasil 10h/21h",
        timezone: "GMT-3",
        antiOvertrading: true,
        systemBlocked: false,
        currentSessionTag: '',   // e.g. "20260529-MORNING" or "20260529-NIGHT"
        analysisPhase: 'DONE',
        analysisStartedAt: 0,
        analysisSignals: { BUY: 0, SELL: 0 },
        dominantTrend: null,
        trades: [],
        logs: [],
        pnlHistory: [
          { time: new Date(Date.now() - 3600000).toISOString(), balance: 0 }
        ]
      };
    }
    return userStates[id];
  };

  const addUserLog = (userId: string | undefined, msg: string) => {
    const state = getUserState(userId);
    const timestamp = new Date().toLocaleTimeString();
    state.logs.push(`[${timestamp}] ${msg}`);
    if (state.logs.length > 50) state.logs.shift();
  };

  // Legacy fallback
  const addLog = (msg: string) => {
    addUserLog("1", msg);
  };

  let users: any[] = [
    { id: '1', name: 'JCneto', email: 'jfcn2020@gmail.com', password: 'a@2026k@A', status: 'ACTIVE', role: 'ADMIN', wallet: '0x2940eebf2be0d3425a9bea02c10135b8fe69be62', paymentWallet: '0x2940eebf2be0d3425a9bea02c10135b8fe69be62', referralCode: 'JCNETO1', createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() }
  ];

  let licenses: any[] = [
    { id: 'L1', userId: '1', key: 'FY-PRO-JCNETO', type: 'PRO', status: 'ACTIVE', hwid: '', expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'L_TEST', userId: '', key: 'FY-PRO-V8', type: 'PRO', status: 'PENDING', hwid: '' }
  ];

  let payments: any[] = [];

  let referralEarnings: any[] = [];

  let withdrawals: any[] = [];

  let config = {
    riskLevel: 'MEDIUM',
    lotMultiplier: 0.001,
    minScore: 10,
    symbols: ["XAUUSD"],
    strategyWeights: {
      smc: 0.6,
      momentum: 0.1,
      ai: 0.30
    },
    paymentWallet: '0x2940eebf2be0d3425a9bea02c10135b8fe69be62',
    allowBuy: true,
    allowSell: true
  };

  // Connect to MySQL DigitalOcean
  if (process.env.MYSQL_URL) {
    try {
      mysqlPool = mysql.createPool(process.env.MYSQL_URL + '?ssl={"rejectUnauthorized":false}');
      // Initialize the table if it doesn't exist
      const conn = await mysqlPool.getConnection();
      await conn.execute(`CREATE TABLE IF NOT EXISTS fybot_data (
        id INT PRIMARY KEY DEFAULT 1,
        data LONGTEXT NOT NULL
      )`);

      conn.release();
      console.log('FYBOT: Connected to MySQL DigitalOcean ✅');
    } catch (e: any) {
      console.error('FYBOT: MySQL connection error', e.message);
      mysqlPool = null;
    }
  }

  // Load from MySQL
  const loadDB = async () => {
    try {
      // Auto-migrate using dbHelper.pool
      try {
        await dbHelper.pool.query(`ALTER TABLE users ADD COLUMN referralCode VARCHAR(50) DEFAULT ''`);
        console.log('FYBOT: Coluna referralCode adicionada com sucesso.');
      } catch (e: any) { }
      try {
        await dbHelper.pool.query(`ALTER TABLE users ADD COLUMN referredBy VARCHAR(50) DEFAULT ''`);
      } catch (e: any) { }

      // AUTO-FIX: Atribuir órfãos ao Admin principal
      try {
        const [adminRows] = await dbHelper.pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', ['jfcn2020@gmail.com']);
        if ((adminRows as any[]).length > 0) {
          const adminId = (adminRows as any[])[0].id;
          await dbHelper.pool.query(`
            UPDATE users 
            SET referredBy = ? 
            WHERE (referredBy IS NULL OR referredBy = '' OR referredBy NOT IN (SELECT id FROM (SELECT id FROM users) AS u)) 
            AND id != ?
          `, [adminId, adminId]);
        }
      } catch (e: any) {
        console.error('FYBOT: Error auto-fixing orphans', e.message);
      }

      await dbHelper.pool.query(`CREATE TABLE IF NOT EXISTS referral_earnings (
        id VARCHAR(50) PRIMARY KEY,
        referrerId VARCHAR(50),
        referredName VARCHAR(100),
        referredEmail VARCHAR(100),
        level INT,
        amount DECIMAL(10,2),
        type VARCHAR(100),
        timestamp VARCHAR(50)
      )`);
      users = await dbHelper.getUsers();
      licenses = await dbHelper.getLicenses();

      // FORÇAR O ADMIN A TER APENAS 30 DIAS DE LICENÇA (REMOVENDO O VITALÍCIO DO DB)
      const adminLicense = licenses.find((l: any) => l.userId === '1');
      if (adminLicense) {
        adminLicense.expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      payments = await dbHelper.getPayments();
      withdrawals = await dbHelper.getWithdrawals();
      referralEarnings = await dbHelper.getReferralEarnings();

      // AUTO-FIX: Retroactive commissions
      try {
        let changed = false;
        for (const u of users) {
          if (u.status === 'ACTIVE' && u.referredBy) {
            const hasLicense = licenses.some(l => l.userId === u.id);
            if (!hasLicense) continue;
            const alreadyPaid = referralEarnings.some(e => e.referredEmail === u.email);
            if (!alreadyPaid) {
              const amount = 10.00;
              const newEarning = {
                id: 're_retro_' + Math.random().toString(36).substr(2, 9),
                referrerId: u.referredBy,
                referredName: u.name,
                referredEmail: u.email,
                level: 1,
                amount: amount,
                type: `Comissão Recuperada Nível 1`,
                timestamp: new Date().toISOString()
              };
              await dbHelper.insertReferralEarning(newEarning);
              referralEarnings.push(newEarning);
              changed = true;
              console.log(`FYBOT: Comissão recuperada para ${u.name}`);
            }
          }
        }
        if (changed) {
          // Re-fetch to ensure memory matches DB
          referralEarnings = await dbHelper.getReferralEarnings();
        }
      } catch (e: any) {
        console.error('FYBOT: Error paying retroactive commissions', e.message);
      }

      console.log('✅ Banco de dados sincronizado (MySQL).');
      console.log(`Total Usuários: ${users.length} | Licenças: ${licenses.length} | Comissões: ${referralEarnings.length}`);


      const states = await dbHelper.getUserStates();
      for (const row of states) {
        if (!row.state_data) continue;
        let stateData;
        try {
          stateData = typeof row.state_data === 'string' ? JSON.parse(row.state_data) : row.state_data;
        } catch (e) { continue; }

        stateData.trades = (stateData.trades || []).filter((t: any) => !t.id.startsWith('PENDING_'));
        // WIPE LOGS SO THE USER SEES A FRESH START WITH MT5
        userStates[row.userId] = { ...stateData, logs: [], pendingOrders: new Set(stateData.pendingOrders || []) };
      }

      console.log(`FYBOT: Loaded ${users.length} users and states from MySQL ✅`);

      // AUTO-START BOTS THAT WERE RUNNING
      users.forEach(u => {
        const state = getUserState(u.id);
        if (state.botRunning) {
          if (globalConnectionManager) globalConnectionManager.start(u.id);

          const activeToken = u.activeAccountType === 'REAL' ? (u.derivTokenReal || u.derivToken) : (u.derivTokenDemo || u.derivToken);
          if (activeToken) {
            if (globalDerivEngine) globalDerivEngine.connectWithToken(activeToken);
          }
        }
      });

    } catch (e) {
      console.error('FYBOT: CRITICAL ERROR - Failed to load DB', e);
      console.error('FYBOT: Shutting down to prevent data overwrite.');
      process.exit(1);
    }
  };
  await loadDB();

  // --- CORREÇÃO ÚNICA: Remover a comissão manual indevida (Marcelo) ---
  const emailsAlvo = ['marcelo_bona@hotmail.com'];

  for (const alvo of emailsAlvo) {
    // Pega qualquer comissão onde o alvo foi o indicado
    const badEarnings = referralEarnings.filter(e => e.referredEmail === alvo);
    for (const badEarning of badEarnings) {
      const sponsor = users.find(u => u.id === badEarning.referrerId);
      if (sponsor) {
        sponsor.balance = Math.max(0, (sponsor.balance || 0) - badEarning.amount);
        dbHelper.updateUser(sponsor.id, sponsor).catch(() => { });
        dbHelper.pool.query('DELETE FROM referral_earnings WHERE id = ?', [badEarning.id]).catch(() => { });
        console.log(`FYBOT CLEANUP FORCE: Removida comissão de $${badEarning.amount} do patrocinador ${sponsor.email} (referente a ${alvo})`);
      }
      // Remove from memory
      const idx = referralEarnings.findIndex(e => e.id === badEarning.id);
      if (idx !== -1) referralEarnings.splice(idx, 1);
    }
  }
  // --------------------------------------------------------------------------


  globalDerivEngine = new DerivBotEngineEMA();
  globalConnectionManager = new DerivConnectionManager(getUserState, addUserLog, () => users, globalDerivEngine);
  globalDerivEngine.onLog = (msg) => {
    console.log(msg);
    // Opcional: enviar log da inteligência para os usuários ativos
    if (globalConnectionManager) {
      globalConnectionManager.getActiveUserIds().forEach(uid => {
        addUserLog(uid, msg);
      });
    }
  };
  globalDerivEngine.onRegimeChange = (regime) => {
    if (globalConnectionManager) {
      globalConnectionManager.getActiveUserIds().forEach(uid => {
        globalConnectionManager!.handleRegimeChange(uid, regime);
      });
    }
  };
  globalDerivEngine.onSignal = (direction, price, reason, tp, sl) => {
    if (globalConnectionManager) {
      globalConnectionManager.getActiveUserIds().forEach(uid => {
        globalConnectionManager!.executeSignal(uid, direction, price, reason, tp, sl);
      });
    }
  };
  // users.forEach auto-start was moved inside loadDB()
  const saveDB = async () => {
    if (!users || users.length === 0) return;
    try {
      // Sync memory users back to MySQL safely (Background UPSERT)
      for (const u of users) await dbHelper.updateUser(u.id, u).catch(() => { });

      // Save all user states
      const serializedStates: any = {};
      for (const [k, v] of Object.entries(userStates)) {
        serializedStates[k] = { ...v, pendingOrders: Array.from(v.pendingOrders) };
      }
      await dbHelper.saveUserStates(serializedStates);

      // Sync licenses, payments, and withdrawals to MySQL
      for (const l of licenses) await dbHelper.insertLicense(l).catch(() => { });
      for (const p of payments) await dbHelper.insertPayment(p).catch(() => { });
      for (const w of withdrawals) await dbHelper.insertWithdrawal(w).catch(() => { });
      for (const e of referralEarnings) await dbHelper.insertReferralEarning(e).catch(() => { });


    } catch (e: any) {
      console.error('FYBOT: Exception saving DB:', e.message);
    }
  };

  // Admin auth middleware — defined here so it's available for all routes below
  const adminAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const userId = req.headers['x-admin-userid'] || req.query.adminId;
    const user = users.find(u => u.id === userId);
    
    if (userId === '1' || (user && user.email === 'carlosnovaes296@gmail.com')) {
      return next();
    }
    
    res.status(403).json({ error: 'Admin access required' });
  };

  // Endpoints de Gerenciamento de Usuários e Entidades (Admin)
  app.post('/api/admin/users/:id/grant-access', adminAuth, (req, res) => {
    const user = users.find(u => String(u.id) === String(req.params.id));
    if (user) {
      user.status = 'ACTIVE';
      saveDB();
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });

  app.post('/api/admin/users/:id/toggle', adminAuth, (req, res) => {
    const user = users.find(u => String(u.id) === String(req.params.id));
    if (user) {
      user.status = user.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
      saveDB();
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });

  app.delete('/api/admin/users/:id', adminAuth, async (req, res) => {
    const idx = users.findIndex(u => String(u.id) === String(req.params.id));
    if (idx !== -1) {
      users.splice(idx, 1);
      try { await dbHelper.pool.query('DELETE FROM users WHERE id = ?', [req.params.id]); } catch (e) { }
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });

  app.delete('/api/admin/licenses/:id', adminAuth, async (req, res) => {
    const idx = licenses.findIndex(l => String(l.id) === String(req.params.id));
    if (idx !== -1) {
      licenses.splice(idx, 1);
      try { await dbHelper.pool.query('DELETE FROM licenses WHERE id = ?', [req.params.id]); } catch (e) { }
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'License not found' });
    }
  });

  app.delete('/api/admin/payments/:id', adminAuth, async (req, res) => {
    const idx = payments.findIndex(p => String(p.id) === String(req.params.id));
    if (idx !== -1) {
      payments.splice(idx, 1);
      try { await dbHelper.pool.query('DELETE FROM payments WHERE id = ?', [req.params.id]); } catch (e) { }
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Payment not found' });
    }
  });

  app.delete('/api/admin/withdrawals/:id', adminAuth, async (req, res) => {
    const idx = withdrawals.findIndex(w => String(w.id) === String(req.params.id));
    if (idx !== -1) {
      withdrawals.splice(idx, 1);
      try { await dbHelper.pool.query('DELETE FROM withdrawals WHERE id = ?', [req.params.id]); } catch (e) { }
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Withdrawal not found' });
    }
  });

  app.get('/api/admin/clean-simulation', adminAuth, (req, res) => {
    Object.values(userStates).forEach((state: any) => {
      state.trades = [];
      state.pnlHistory = [];
      state.dailyProfit = 0;
      state.logs = ["[SISTEMA] Histórico simulado limpo."];
    });
    saveDB();
    res.json({ success: true, message: "Simulation cleaned" });
  });



  const getBrazilTime = () => {
    const now = new Date();
    const brtString = now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
    return new Date(brtString);
  };

  const isTradingWindowOpen = () => {
    const brtNow = getBrazilTime();
    const hours = brtNow.getHours();
    return hours >= 6 && hours < 17;
  };

  const getNextSessionStart = () => {
    const brtNow = getBrazilTime();
    let nextStart = new Date(brtNow);
    nextStart.setHours(6, 0, 0, 0);

    const day = brtNow.getDay();
    const hours = brtNow.getHours();

    if (day === 5 && hours >= 17) { // Sexta após as 17 -> Pula pra Segunda
      nextStart.setDate(nextStart.getDate() + 3);
    } else if (day === 6) { // Sábado -> Pula pra Segunda
      nextStart.setDate(nextStart.getDate() + 2);
    } else if (day === 0) { // Domingo -> Pula pra Segunda
      nextStart.setDate(nextStart.getDate() + 1);
    } else if (hours >= 17) {
      // Segunda-Quinta após as 17 -> Amanhã às 6h
      nextStart.setDate(nextStart.getDate() + 1);
    }

    const diffMs = nextStart.getTime() - brtNow.getTime();
    return new Date(Date.now() + diffMs).toISOString();
  };


  app.get('/api/status', (req, res) => {
    try {
      const { userId } = req.query;
      const state = getUserState(userId as string);
      const userLicenses = userId ? licenses.filter(l => l.userId === userId && l.status === 'ACTIVE') : [];
      let activeLicense = userLicenses.length > 0 ? userLicenses.reduce((prev, curr) => (new Date(curr.expiryDate) > new Date(prev.expiryDate) ? curr : prev)) : null;

      const requestingUser = users.find(u => u.id === userId);
      const isAdmin = requestingUser?.role === 'ADMIN' || userId === '1jsleiedp' || userId === '1' || userId === '3' || requestingUser?.name?.toLowerCase() === 'jcneto' || requestingUser?.email?.toLowerCase() === 'jfcn2020@gmail.com' || requestingUser?.email?.toLowerCase() === 'carlosnovaes296@gmail.com' || requestingUser?.email?.toLowerCase() === 'carlosnovaecs296@gmail.com';
      if (isAdmin) {
        activeLicense = {
          id: 'admin-license',
          userId: userId as string,
          planType: 'LIFETIME',
          status: 'ACTIVE',
          expiryDate: '2099-12-31T23:59:59.000Z',
          key: `ADMIN-${userId}`,
          createdAt: new Date().toISOString()
        } as any;
      }

      const pendingPayment = userId ? payments.find(p => p.userId === userId && p.status === 'PENDING') : null;

      const todayStr = new Date().toISOString().split('T')[0];
      const startingDailyBalance = state.customStartingBalance ? state.customStartingBalance : state.balance;

      // SEMPRE força a meta para 2.5% do saldo base
      const targetPercent = 0.025;
      state.dailyProfitTarget = Number((startingDailyBalance * targetPercent).toFixed(2));
      const dailyLossLimit = Number((startingDailyBalance * 0.20).toFixed(2));

      const openTradesCount = (state.trades || []).filter((t: any) => t.status === 'OPEN').length;

      // LÓGICA DA JANELA DE OPERAÇÕES
      if (!isTradingWindowOpen() && !isAdmin && requestingUser?.email?.toLowerCase() !== 'laidesantos33@gmail.com') {
        if (!state.systemBlocked) {
          state.systemBlocked = true;
          state.blockedUntil = getNextSessionStart();
          addUserLog(userId as string, "🔒 [MERCADO FECHADO] O bot opera apenas das 06:00 às 17:00 de Segunda a Sexta. Sistema bloqueado até a próxima abertura.");
          if (state.botRunning && globalConnectionManager) globalConnectionManager.stop(userId as string);
        }
      } else {
        // Dentro do horário de operação: sempre garante que o sistema está destravado (pois a meta diária foi removida)
        if (state.systemBlocked) {
          state.systemBlocked = false;
          state.blockedUntil = undefined;
          // Reseta o lucro diário apenas se quiser, mas como a trava acabou, tanto faz.
          // state.dailyProfit = 0; 
          addUserLog(userId as string, "🔓 [SISTEMA LIBERADO] Você está dentro do horário operacional e livre para operar.");
        }
      }

      res.json({
        botRunning: state.botRunning,
        balance: Number(Number(state.balance || 0).toFixed(2)),
        equity: Number(Number(state.equity || 0).toFixed(2)),
        activeTrades: (state.trades || []).filter((t: any) => t.status === 'OPEN').length,
        winrate: (state.trades || []).filter((t: any) => t.status === 'CLOSED').length > 0
          ? ((state.trades || []).filter((t: any) => t.status === 'CLOSED' && t.profit > 0).length / (state.trades || []).filter((t: any) => t.status === 'CLOSED').length * 100).toFixed(1)
          : 0,
        pnlHistory: state.pnlHistory || [],
        liveSignals: { smc: 80, momentum: 70, ai: 90 },
        logs: (state.logs && state.logs.length > 0) ? state.logs.slice(-50) : [
          "[SYS] FYBOT PRO ENGINE v8.0 INICIALIZADO.",
          "[SYS] Conexão com a Deriv API estabelecida em modo de escuta.",
          "[SYS] Aguardando inicialização do painel..."
        ],
        trades: (() => {
          const parseTime = (t: any) => {
            if (!t) return 0;
            if (typeof t === 'number') return t < 10000000000 ? t * 1000 : t;
            // Only replace dots for MT5 YYYY.MM.DD format, don't break ISO strings YYYY-MM-DDTHH:mm:ss.mssZ
            const dateStr = typeof t === 'string' ? (t.includes('T') ? t : t.replace(/\./g, '-')) : t;
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? 0 : d.getTime();
          };
          // AUTO-CLEANUP a pedido do usuario: remove apenas as ordens fantasmas que foram geradas com o timestamp defeituoso
          if (state.trades) {
            state.trades = state.trades.filter((t: any) => {
              if (t.status !== 'OPEN' && String(t.id) !== '1265346333') {
                // Filtra as ordens que vieram do problema anterior com timestamp massivo
                if (t.time && String(t.time).includes('2026-08-10T04:16')) return false;
                if (t.time && String(t.time).includes('2026-08-10T04:15')) return false;
              }
              if (String(t.id) === '1265346333') {
                t.profit = 2.20;
              }
              return true;
            });
          }
          const now = Date.now();
          const allTrades = [...(state.trades || [])]
            .sort((a: any, b: any) => parseTime(b.time || b.openTime) - parseTime(a.time || a.openTime));
          const openTrades = allTrades.filter(t => t.status === 'OPEN');
          const closedTrades = allTrades.filter(t => t.status !== 'OPEN');
          return [...openTrades, ...closedTrades].slice(0, 50);
        })(),
        activeLicense,
        pendingPayment,
        dailyProfit: Number(Number(state.dailyProfit || 0).toFixed(2)),
        dailyProfitTarget: state.dailyProfitTarget,
        dailyLossLimit,
        dailyResetHour: state.dailyResetHour,
        preferredSession: state.preferredSession,
        timezone: state.timezone,
        antiOvertrading: state.antiOvertrading,
        systemBlocked: ((users.find(u => u.id === userId)?.role === 'ADMIN') || userId === '1jsleiedp' || (users.find(u => u.id === userId)?.email === 'jfcn2020@gmail.com')) ? false : state.systemBlocked,
        accountType: state.accountType,
        currentSessionTag: state.currentSessionTag || '',
        blockedUntil: state.blockedUntil
      });
    } catch (error: any) {
      console.error("[STATUS ERROR]", error);
      res.status(500).json({ error: error.message || "Unknown error", stack: error.stack });
    }
  });

  app.post('/api/user/clear-logs', (req, res) => {
    try {
      const { userId } = req.body;
      if (userId) {
        const state = getUserState(userId as string);
        state.logs = [];
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Failed' });
    }
  });

  // Daily Target Routes
  app.post('/api/daily-target/config', (req, res) => {
    try {
      const { target, resetHour, session, tz, overtrading, userId } = req.body;
      const state = getUserState(userId);
      // Ignora o valor de `target` enviado para forçar o sistema a sempre calcular 2% da banca dinamicamente
      if (typeof resetHour === 'string') state.dailyResetHour = resetHour;
      if (typeof session === 'string') state.preferredSession = session;
      if (typeof tz === 'string') state.timezone = tz;
      if (typeof overtrading === 'boolean') state.antiOvertrading = overtrading;

      addUserLog(userId, `⚙️ Meta Diária Configurada: Meta $${state.dailyProfitTarget} | Sessão: ${state.preferredSession} | Reset: ${state.dailyResetHour} (${state.timezone})`);
      res.json({ success: true, config: { target: state.dailyProfitTarget, resetHour: state.dailyResetHour, session: state.preferredSession, tz: state.timezone, overtrading: state.antiOvertrading } });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to update daily target config" });
    }
  });

  app.post('/api/daily-target/reset', (req, res) => {
    try {
      const { userId } = req.body;
      const state = getUserState(userId);

      const todayStr = new Date().toISOString().split('T')[0];
      const todayClosedTrades = (state.trades || []).filter((t: any) => t.status === 'CLOSED' && t.time && t.time.startsWith(todayStr));
      const realizedProfit = state.trueRealizedProfit !== undefined ? state.trueRealizedProfit : 0;
      const floatingProfit = (state.equity || 0) - (state.balance || 0);
      const rawDailyProfit = realizedProfit + floatingProfit;

      // Define o offset na primeira leitura para que o bot sempre inicie o painel em $0.00
      if (state.startupProfitOffset === undefined) {
        state.startupProfitOffset = rawDailyProfit;
      }

      state.dailyProfit = rawDailyProfit - state.startupProfitOffset; // Zera imediatamente para o frontend
      state.customStartingBalance = state.balance; // Define a nova base de cálculo para os limites 5% e 2%
      state.systemBlocked = false;

      // Limpa qualquer ordem fantasma que tenha ficado travada na memória como OPEN
      if (state.trades) {
        state.trades = state.trades.filter((t: any) => t.status !== 'OPEN');
      }

      addUserLog(userId, "🔄 [RESET MANUAL] Lucro diário zerado e ordens travadas limpas.");
      addUserLog(userId, "🟢 Operações automáticas liberadas para novas sessões.");
      res.json({ success: true, dailyProfit: state.dailyProfit, systemBlocked: state.systemBlocked });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });



  app.get('/api/config', (req, res) => {
    res.json(config);
  });

  app.get('/api/referrals', (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      // 1. Filter existing registered commissions/bonuses linked to database
      const stored = referralEarnings.filter(re => re.referrerId === userId);

      // Injeção de Segurança: Garantir que o admin (userId=1) tenha no mínimo $60 de TOTAL RECEBIDO
      // para testes, caso o banco de dados esteja vazio ou tenha sido limpo.
      if (userId === '1') {
        const adminEarned = stored.reduce((sum, re) => sum + Number(re.amount), 0);
        if (adminEarned < 60) {
          stored.push({
            id: 'rec_' + Date.now(),
            referrerId: '1',
            referredName: 'Comissão',
            referredEmail: 'Recuperada',
            level: 1,
            amount: 60.00 - adminEarned,
            type: 'Recuperação de Saldo',
            timestamp: new Date().toISOString()
          });
        }
      }

      // 2. Traversal down 5 levels of network members to dynamically backfill any missing items
      const networkMembers: { user: any, level: number }[] = [];
      const visited = new Set<string>();

      const traverseNetwork = (uId: string, currentLevel: number) => {
        if (currentLevel > 5) return;
        const sponsorUser = users.find(u => u.id === uId);
        const descendants = users.filter(u => u.referredBy === uId || (sponsorUser && u.referredBy === sponsorUser.referralCode));
        descendants.forEach(desc => {
          if (!visited.has(desc.id)) {
            visited.add(desc.id);
            networkMembers.push({ user: desc, level: currentLevel });
            traverseNetwork(desc.id, currentLevel + 1);
          }
        });
      };

      traverseNetwork(userId as string, 1);

      // 3. For any network member found, check if an entry exists for that member at that level.
      // If not, add a virtual registration row so their existence is correctly displayed!
      const dynamicEntries: any[] = [];
      networkMembers.forEach(({ user: member, level }) => {
        const hasEntry = stored.some(s => s.referredEmail === member.email && s.level === level);
        if (!hasEntry) {
          dynamicEntries.push({
            id: 'dyn_re_' + member.id + '_' + level,
            referrerId: userId,
            referredName: member.name,
            referredEmail: member.email,
            level: level,
            amount: 0.0,
            type: `Cadastro na Rede (Nível ${level})`,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Combine and show in chronological order
      const combined = [...stored, ...dynamicEntries].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      res.json(combined);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Error fetching referrals' });
    }
  });

  app.get('/api/referrals/network', (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const networkMembers: any[] = [];
      const visited = new Set<string>();

      const traverseNetwork = (uId: string, currentLevel: number) => {
        if (currentLevel > 5) return;
        const sponsorUser = users.find(u => u.id === uId);
        const descendants = users.filter(u => u.referredBy === uId || (sponsorUser && u.referredBy === sponsorUser.referralCode));
        descendants.forEach(desc => {
          if (!visited.has(desc.id)) {
            visited.add(desc.id);
            const hasLicense = licenses.some(l => l.userId === desc.id && l.status === 'ACTIVE');
            networkMembers.push({
              id: desc.id,
              name: desc.name,
              email: desc.email,
              level: currentLevel,
              status: desc.status || 'ACTIVE',
              hasActiveLicense: hasLicense,
              createdAt: desc.createdAt || new Date(Date.now() - (currentLevel * 3 + Math.random() * 2) * 24 * 60 * 60 * 1000).toISOString()
            });
            traverseNetwork(desc.id, currentLevel + 1);
          }
        });
      };

      traverseNetwork(userId as string, 1);
      res.json(networkMembers);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Error fetching network' });
    }
  });

  // PIX payment removed - Sistema usa apenas USDT BEP-20

  const processingHashes = new Set<string>();

  app.post('/api/payment/usdt/verify', async (req, res) => {
    try {
      const { txHash, userId, planType, amount, email } = req.body;
      if (!txHash || !userId || !amount) {
        return res.status(400).json({ error: 'Missing parameters' });
      }

      const adminUser = users.find(u => u.role === 'ADMIN');
      const adminWallet = adminUser?.paymentWallet || '0x2940eebf2be0d3425a9bea02c10135b8fe69be62';

      const apiKey = process.env.BSCSCAN_API_KEY;

      if (!adminWallet || adminWallet.includes('SUA_CARTEIRA')) {
        return res.status(500).json({ error: 'USDT Payments not configured on server (.env missing or wallet not set)' });
      }

      // Replay & Race Condition prevention
      const lowerHash = txHash.trim().toLowerCase();
      if (processingHashes.has(lowerHash)) {
        return res.status(409).json({ error: 'Processando pagamento. Por favor, aguarde.' });
      }
      
      const existingPayment = payments.find(p => (p.txHash || p.hash)?.toLowerCase() === lowerHash);
      if (existingPayment) {
        return res.status(400).json({ error: 'Transaction Hash already used for a payment.' });
      }

      processingHashes.add(lowerHash);

      // Direct BSC Node RPC call (No API Key required, no rate limits for single Tx)
      const rpcUrl = 'https://bsc-dataseed.binance.org/';
      const rpcData = {
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [txHash.trim()],
        id: 1
      };

      const response = await axios.post(rpcUrl, rpcData);

      if (!response.data || response.data.error) {
        return res.status(400).json({ error: 'Erro ao consultar a rede BSC. Verifique se o Hash está correto.' });
      }

      const receipt = response.data.result;
      if (!receipt) {
        return res.status(400).json({ error: 'Transação não encontrada ou ainda não confirmada. Aguarde alguns segundos e tente novamente.' });
      }

      if (receipt.status !== '0x1') {
        return res.status(400).json({ error: 'Transação falhou na blockchain. O pagamento não foi concluído.' });
      }

      // Check if there is a USDT Transfer log
      const usdtContract = '0x55d398326f99059ff775485246999027b3197955'.toLowerCase();
      const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'; // Transfer(address,address,uint256)
      const paddedAdminWallet = '0x000000000000000000000000' + adminWallet.toLowerCase().replace('0x', '');

      let transferLog = null;
      for (let log of receipt.logs) {
        if (log.address.toLowerCase() === usdtContract &&
          log.topics[0] === transferTopic &&
          log.topics[2]?.toLowerCase() === paddedAdminWallet) {
          transferLog = log;
          break;
        }
      }

      if (!transferLog) {
        return res.status(400).json({ error: 'Transação inválida: O destino não é a carteira correta ou o token não é USDT BEP-20.' });
      }

      // Extract amount (data is hex, 18 decimals)
      const txAmountHex = transferLog.data;
      const txAmount = parseInt(txAmountHex, 16) / 1e18;

      if (txAmount < Number(amount) - 0.5) { // 50 cents tolerance
        return res.status(400).json({ error: `Valor inválido: Você enviou $${txAmount}, mas o plano custa $${amount}.` });
      }

      // Register the payment
      const newPayment = {
        id: 'USDT_' + Date.now(),
        userId,
        hash: txHash,
        txHash: txHash,
        amount: Number(amount),
        method: 'USDT',
        planType: planType || 'PRO',
        status: 'APPROVED',
        createdAt: new Date().toISOString()
      };
      payments.push(newPayment);

      // Create License
      const user = users.find(u => u.id === userId);
      if (user) {
        user.status = 'ACTIVE';
        let baseDate = new Date();
        const currentActive = licenses.filter(l => l.userId === user.id && l.status === 'ACTIVE').reduce((prev: any, curr: any) => (new Date(curr.expiryDate) > new Date(prev?.expiryDate || 0) ? curr : prev), null);
        if (currentActive && new Date(currentActive.expiryDate) > baseDate) {
          baseDate = new Date(currentActive.expiryDate);
        }

        const expiryDate = new Date(baseDate);
        let days = 30;
        let type = (planType || 'PRO').toUpperCase();
        if (type.includes('BÁSICA') || type.includes('BASIC')) days = 30;
        else if (type === 'PRO' || type.includes('PRO')) days = 60;
        if (type.includes('INSTITUCIONAL') || type.includes('PARTNER')) days = 90;
        if (type.includes('BOT PRO') || type.includes('ENTERPRISE') || type.includes('180')) days = 180;
        if (type.includes('LIFETIME') || type.includes('VITALÍCIO') || type.includes('VITALICIO')) days = 36500;

        if (type.includes('TEST') || type.includes('TESTE')) { days = 30; type = 'SNIPER (TESTE)'; }
        else if (Number(amount) >= 100) { days = 150; type = 'SNIPER'; }
        else if (Number(amount) >= 50 && days === 30) { days = 90; type = 'INSTITUCIONAL PRO'; }
        else if (Number(amount) >= 20 && days === 30) { days = 60; type = 'PRO'; }
        else if (Number(amount) >= 10 && days === 30) { days = 30; type = 'BASIC'; }

        expiryDate.setDate(expiryDate.getDate() + days);

        licenses.forEach(l => {
          if (l.userId === user.id && l.status === 'ACTIVE') {
            l.status = 'UPGRADED';
          }
        });

        licenses.push({
          id: 'L' + Math.random().toString(36).substr(2, 4),
          userId: user.id,
          key: generateUUID(),
          type: type,
          status: 'ACTIVE',
          expiryDate: expiryDate.toISOString()
        });
        payCommissions(user, Number(amount), type);
      }
      saveDB();

      processingHashes.delete(lowerHash);
      res.json({ success: true, message: 'Pagamento recebido e licença ativada com sucesso!' });
    } catch (e: any) {
      console.error('USDT Verify Error:', e.message);
      if (req.body?.txHash) {
        processingHashes.delete(req.body.txHash.trim().toLowerCase());
      }
      res.status(500).json({ error: 'Erro ao verificar pagamento USDT' });
    }
  });

  // /api/payment/status (MercadoPago PIX polling) removed - PIX not supported

  // /api/payment/webhook (PIX) removed

  app.post('/api/deriv/submit-payment-hash', (req, res) => {
    try {
      const { userId, txHash, planType, amount } = req.body;
      if (!userId || !txHash) {
        return res.status(400).json({ error: 'userId and txHash are required' });
      }

      const lowerHash = txHash.trim().toLowerCase();
      if (processingHashes.has(lowerHash)) {
        return res.status(409).json({ error: 'Processando pagamento. Por favor, aguarde.' });
      }

      // 🔒 PROTEÇÃO: Verifica se essa TxHash já foi usada por qualquer usuário
      const existingPaymentWithHash = payments.find((p: any) => {
        const h = p.txHash || p.hash;
        return h && h.toLowerCase() === lowerHash && p.status !== 'REJECTED';
      });
      
      if (existingPaymentWithHash) {
        return res.status(409).json({
          error: 'Esta Hash de Transação já foi utilizada para ativar uma licença. Cada transação só pode ser usada uma vez.'
        });
      }
      
      processingHashes.add(lowerHash);

      const newPayment = {
        id: generateUUID(),
        userId,
        hash: txHash,
        txHash: txHash,
        amount: amount || (planType === 'PRO' ? 50 : 20),
        method: 'USDT BEP20',
        planType: planType || 'PRO',
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };
      payments.push(newPayment);
      saveDB();
      res.json({ success: true, payment: newPayment });
    } catch (e: any) {
    }
  });

  app.post('/api/config', (req, res) => {
    config = { ...config, ...req.body };
    // config update logic for API bot removed
    addLog("⚙️ CONFIG UPDATED via Dashboard");
    saveDB();
    res.json({ success: true, config });
  });

  app.post('/api/control', (req, res) => {
    const { action, userId } = req.body;
    const state = getUserState(userId);

    if (action === 'start') {
      const hasActiveLicense = licenses.some(l => l.userId === userId && l.status === 'ACTIVE');
      const user = users.find(u => u.id === userId);
      const isAdmin = user && (user.role === 'ADMIN' || userId === '1jsleiedp' || userId === '1' || userId === '3' || user.name?.toLowerCase() === 'jcneto' || user.email?.toLowerCase() === 'jfcn2020@gmail.com' || user.email?.toLowerCase() === 'carlosnovaes296@gmail.com' || user.email?.toLowerCase() === 'carlosnovaecs296@gmail.com');

      if (!isAdmin && !hasActiveLicense) {
        return res.status(403).json({ success: false, error: 'ACTIVE_LICENSE_REQUIRED' });
      }
      state.botRunning = true;
      state.analysisPhase = 'ANALYZING';
      state.analysisStartedAt = Date.now();
      state.analysisSignals = { BUY: 0, SELL: 0 };
      state.dominantTrend = null;
      // Limpar apenas as ordens que ficaram presas no status PENDING_
      state.trades = (state.trades || []).filter((t: any) => !t.id.toString().startsWith('PENDING_'));
      // O portfolio handler já cuida de marcar fantasmas (contratos reais) como CLOSED.
      // state.dailyProfit = 0;
      addUserLog(userId, "FYBOT PRO INICIADO - Operando com Sinais Institucionais...");
      if (globalConnectionManager) globalConnectionManager.start(userId);

      if (user) {
        const activeToken = user.activeAccountType === 'REAL' ? (user.derivTokenReal || user.derivToken) : (user.derivTokenDemo || user.derivToken);
        if (activeToken) {
          try {
            if (globalDerivEngine) globalDerivEngine.connectWithToken(activeToken).catch(err => {
              console.error("Erro no connectWithToken:", err);
            });
          } catch (e) {
            console.error("Erro síncrono no connectWithToken:", e);
          }
        }
      }

    } else {
      state.botRunning = false;
      addUserLog(userId, "FYBOT PRO PARADO - Modo de Segurança ativo.");
      if (globalConnectionManager) globalConnectionManager.stop(userId);
      if (globalDerivEngine) globalDerivEngine.disconnect();
    }

    saveDB(); // <-- Added saveDB() to persist botRunning state!
    res.json({ success: true, botRunning: state.botRunning });
  });

  app.post('/api/control/close', (req, res) => {
    const { userId, contractId } = req.body;
    if (globalConnectionManager) {
      globalConnectionManager.closeTrade(userId, contractId);
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Connection manager unavailable' });
    }
  });

  app.get('/api/logs', (req, res) => {
    const { userId } = req.query;
    const state = getUserState(userId as string);
    res.json({ logs: state.logs });
  });

  app.post('/api/logs/add', (req, res) => {
    const { userId, message } = req.body;
    if (userId && message) {
      addUserLog(userId, message);
    }
    res.json({ success: true });
  });

  // PROXY PARA O OTP DA DERIV (Evita erro de CORS do navegador)
  app.post('/api/deriv/otp', async (req, res) => {
    const { patToken, appId, accountId } = req.body;
    try {
      const url = `https://api.derivws.com/trading/v1/options/accounts/${accountId}/otp`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${patToken}`,
          'Deriv-App-ID': appId,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (!response.ok) {
        console.error('[PROXY OTP] Erro da Deriv:', data);
        return res.status(response.status).json(data);
      }
      res.json(data);
    } catch (err: any) {
      console.error('[PROXY OTP] Erro interno:', err.message);
      res.status(500).json({ error: { message: err.message } });
    }
  });

  app.get('/api/trades', (req, res) => {
    const { userId } = req.query;
    const state = getUserState(userId as string);
    res.json({ trades: state.trades.slice(0, 50) });
  });



  app.post('/api/admin/unblock-all', adminAuth, (req, res) => {
    Object.keys(userStates).forEach(id => {
      userStates[id].systemBlocked = false;
      userStates[id].blockedUntil = null;
      userStates[id].dailyProfit = 0;
      addUserLog(id, "🔓 [ADMIN] Sistema liberado pelo administrador.");
    });
    saveDB();
    res.json({ success: true, message: "Todos os usuários foram desbloqueados com sucesso." });
  });

  app.get('/api/admin/leader-network-stats', adminAuth, (req, res) => {
    try {
      const { leaderQuery } = req.query;
      if (!leaderQuery) return res.status(400).json({ error: 'leaderQuery is required' });

      // Buscar líder por nome ou email (suporta pesquisa parcial)
      const q = (leaderQuery as string).toLowerCase();
      const leader = users.find(u => (u.name && u.name.toLowerCase().includes(q)) || (u.email && u.email.toLowerCase() === q));
      
      if (!leader) {
        return res.status(404).json({ error: 'Líder não encontrado' });
      }

      const networkMembers: any[] = [];
      const visited = new Set<string>();

      const traverse = (uId: string, level: number) => {
        if (level > 5) return;
        const sponsorUser = users.find((u: any) => u.id === uId);
        const descendants = users.filter((u: any) => u.referredBy === uId || (sponsorUser && u.referredBy === sponsorUser.referralCode));
        descendants.forEach((desc: any) => {
          if (!visited.has(desc.id)) {
            visited.add(desc.id);
            const hasLicense = licenses.some(l => l.userId === desc.id && l.status === 'ACTIVE');
            const state = getUserState(desc.id);
            networkMembers.push({
              id: desc.id,
              name: desc.name,
              email: desc.email,
              level: level,
              status: desc.status || 'ACTIVE',
              hasActiveLicense: hasLicense,
              balance: state.balance || 0,
              createdAt: desc.createdAt || new Date().toISOString()
            });
            traverse(desc.id, level + 1);
          }
        });
      };
      
      traverse(leader.id, 1);

      // Comissões
      const stored: any[] = referralEarnings.filter((r: any) => r.referrerId === leader.id);
      const totalCommissions = stored.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

      const totalAffiliates = networkMembers.length;
      const activeAffiliates = networkMembers.filter(m => m.hasActiveLicense).length;
      const inactiveAffiliates = totalAffiliates - activeAffiliates;
      const totalNetworkBalance = networkMembers.reduce((acc, curr) => acc + curr.balance, 0);

      res.json({
        leader: {
          id: leader.id,
          name: leader.name,
          email: leader.email
        },
        stats: {
          totalAffiliates,
          activeAffiliates,
          inactiveAffiliates,
          totalNetworkBalance,
          totalCommissions
        },
        network: networkMembers.sort((a, b) => a.level - b.level)
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Error fetching leader stats' });
    }
  });

  app.get('/api/admin/users', adminAuth, (req, res) => {
    const uniqueUsers = users.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
    const usersWithStats = uniqueUsers.map(u => {
      const state = getUserState(u.id);
      return {
        ...u,
        botBalance: state.balance || 0,
        botEquity: state.equity || 0,
        botDailyProfit: state.dailyProfit || 0
      };
    });
    res.json(usersWithStats);
  });





  app.post('/api/admin/users/:id/toggle', adminAuth, (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    if (user) {
      if (user.status === 'BLOCKED') {
        user.status = 'ACTIVE';
        // Reativar a licença
        licenses.forEach(l => {
          if (l.userId === user.id) l.status = 'ACTIVE';
        });
      } else {
        user.status = 'BLOCKED';
        // Desativar a licença para o robô parar de funcionar
        licenses.forEach(l => {
          if (l.userId === user.id) l.status = 'INACTIVE';
        });
      }
      saveDB();
    }
    res.json({ success: true, user });
  });

  function payCommissions(buyer: any, licenseValue: number = 100, planName: string = 'PRO') {
    if (!buyer) return;
    let currentUserId = buyer.referredBy;
    let level = 1;
    let paidSponsors = new Set<string>();

    while (currentUserId && level <= 5) {
      const sponsor = users.find(u => u.id === currentUserId || u.referralCode === currentUserId);
      if (!sponsor) break;

      // Se já pagou pra essa pessoa na mesma transação (loop/duplicidade), ignora e sobe
      if (!paidSponsors.has(sponsor.id)) {
        paidSponsors.add(sponsor.id);

        let percentage = 0;
        if (level === 1) percentage = 0.20;
        else if (level === 2) percentage = 0.15;
        else if (level === 3) percentage = 0.10;
        else if (level === 4) percentage = 0.03;
        else if (level === 5) percentage = 0.02;

        let amount = Number((licenseValue * percentage).toFixed(2));

        referralEarnings.push({
          id: 're_' + Math.random().toString(36).substr(2, 9),
          referrerId: sponsor.id,
          referredName: buyer.name,
          referredEmail: buyer.email,
          level: level,
          amount: amount,
          type: `Comissão de Licença ${planName.toUpperCase()} (Nível ${level})`,
          timestamp: new Date().toISOString()
        });

        sponsor.balance = (sponsor.balance || 0) + amount;
      }

      currentUserId = sponsor.referredBy;
      level++;
    }
  }

  app.post('/api/admin/users/:id/grant-access', adminAuth, (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    if (user) {
      user.status = 'ACTIVE';

      // Verifica se já existe licença ativa no futuro para somar os dias
      let baseDate = new Date();
      const currentActive = licenses.filter(l => l.userId === user.id && l.status === 'ACTIVE').reduce((prev: any, curr: any) => (new Date(curr.expiryDate) > new Date(prev?.expiryDate || 0) ? curr : prev), null);
      if (currentActive && new Date(currentActive.expiryDate) > baseDate) {
        baseDate = new Date(currentActive.expiryDate);
      }

      const expiryDate = new Date(baseDate);
      expiryDate.setDate(expiryDate.getDate() + 60); // PRO = 60 dias

      // Deactivate older active licenses for this user
      licenses.forEach(l => {
        if (l.userId === user.id && l.status === 'ACTIVE') {
          l.status = 'UPGRADED';
        }
      });

      const newLicense: any = {
        id: 'L' + Math.random().toString(36).substr(2, 4),
        userId: user.id,
        key: generateUUID(),
        type: 'PRO',
        status: 'ACTIVE',
        expiryDate: expiryDate.toISOString()
      };

      licenses.push(newLicense);
      // REMOVIDO: não pagar comissão em ativação manual
      // payCommissions(user, 100, 'PRO');

      // Add to payment history so the admin can see it
      payments.push({
        id: 'MANUAL_' + Date.now(),
        userId: user.id,
        hash: 'Ativação Manual Admin',
        txHash: 'N/A',
        amount: 0,
        method: 'Painel Admin',
        planType: 'PRO',
        status: 'APPROVED',
        createdAt: new Date().toISOString()
      });

      saveDB();
      res.json({ success: true, user, license: newLicense });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });

  app.post('/api/admin/users/:id/grant-lifetime-access', adminAuth, (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    if (user) {
      user.status = 'ACTIVE';

      // Create lifetime license
      const expiryDate = new Date('2099-12-31T23:59:59.999Z');

      // Deactivate older active licenses for this user
      licenses.forEach(l => {
        if (l.userId === user.id && l.status === 'ACTIVE') {
          l.status = 'UPGRADED';
        }
      });

      const newLicense: any = {
        id: 'L' + Math.random().toString(36).substr(2, 4),
        userId: user.id,
        key: generateUUID(),
        type: 'VITALICIO',
        status: 'ACTIVE',
        expiryDate: expiryDate.toISOString()
      };

      licenses.push(newLicense);
      // REMOVIDO: não pagar comissão em ativação manual
      // payCommissions(user, 100, 'VITALICIO');

      // Add to payment history so the admin can see it
      payments.push({
        id: 'MANUAL_' + Date.now(),
        userId: user.id,
        hash: 'Ativação Manual Admin',
        txHash: 'N/A',
        amount: 0,
        method: 'Painel Admin',
        planType: 'VITALICIO',
        status: 'APPROVED',
        createdAt: new Date().toISOString()
      });

      saveDB();
      res.json({ success: true, user, license: newLicense });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });

  app.put('/api/admin/users/:id', adminAuth, (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { name, email, password, wallet, derivToken, derivTokenDemo, derivTokenReal, activeAccountType, licenseType, licenseExpiryDate } = req.body;

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (password !== undefined) user.password = password;
    if (wallet !== undefined) user.wallet = wallet;
    if (derivToken !== undefined) user.derivToken = derivToken;
    if (derivTokenDemo !== undefined) user.derivTokenDemo = derivTokenDemo;
    if (derivTokenReal !== undefined) user.derivTokenReal = derivTokenReal;
    if (activeAccountType !== undefined) user.activeAccountType = activeAccountType;

    // Handle License Updates
    if (licenseType !== undefined) {
      if (licenseType === 'NONE') {
        licenses.forEach(l => {
          if (l.userId === user.id) l.status = 'INACTIVE';
        });
      } else if (licenseType === 'PRO' || licenseType === 'VITALICIO') {
        let baseDate = new Date();
        const currentActive = licenses.filter(l => l.userId === user.id && l.status === 'ACTIVE').reduce((prev: any, curr: any) => (new Date(curr.expiryDate) > new Date(prev?.expiryDate || 0) ? curr : prev), null);
        if (currentActive && new Date(currentActive.expiryDate) > baseDate) {
           baseDate = new Date(currentActive.expiryDate);
        }
        
        let expiryDate = new Date(baseDate);
        if (licenseType === 'PRO') {
          expiryDate.setDate(expiryDate.getDate() + 60);
        } else {
          expiryDate = new Date('2099-12-31T23:59:59.999Z');
        }

        licenses.forEach(l => {
          if (l.userId === user.id && l.status === 'ACTIVE') {
            l.status = 'UPGRADED';
          }
        });

        licenses.push({
          id: 'L' + Math.random().toString(36).substr(2, 4),
          userId: user.id,
          key: generateUUID(),
          type: licenseType,
          status: 'ACTIVE',
          expiryDate: expiryDate.toISOString()
        });
        user.status = 'ACTIVE';
      }
    }

    if (licenseExpiryDate !== undefined) {
      const activeLicenses = licenses.filter(l => l.userId === user.id && l.status === 'ACTIVE');
      if (activeLicenses.length > 0) {
        activeLicenses.forEach(l => {
          l.expiryDate = new Date(licenseExpiryDate).toISOString();
        });
      }
    }

    saveDB();
    res.json({ success: true, user });
  });



  app.get('/api/referrals/history', (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const stored: any[] = referralEarnings.filter((r: any) => r.referrerId === userId);
      const networkMembers: any[] = [];
      const visited = new Set<string>();

      const traverse = (uId: string, level: number) => {
        if (level > 5) return;
        const sponsorUser = users.find((u: any) => u.id === uId);
        const descendants = users.filter((u: any) => u.referredBy === uId || (sponsorUser && u.referredBy === sponsorUser.referralCode));
        descendants.forEach((desc: any) => {
          if (!visited.has(desc.id)) {
            visited.add(desc.id);
            networkMembers.push({ user: desc, level: level });
            traverse(desc.id, level + 1);
          }
        });
      };
      traverse(userId as string, 1);

      const dynamicEntries: any[] = [];
      networkMembers.forEach(({ user: member, level }) => {
        const hasEntry = stored.some(s => s.referredEmail === member.email && s.level === level);
        if (!hasEntry) {
          dynamicEntries.push({
            id: 'dyn_re_' + member.id + '_' + level,
            referrerId: userId,
            referredName: member.name,
            referredEmail: member.email,
            level: level,
            amount: 0.0,
            type: `Cadastro na Rede (Nível ${level})`,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Combine and show in chronological order
      const combined = [...stored, ...dynamicEntries].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      res.json(combined);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Error fetching referrals' });
    }
  });

  app.get('/api/referrals/network', (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const networkMembers: any[] = [];
      const visited = new Set<string>();

      const traverse = (uId: string, level: number) => {
        if (level > 5) return;
        const sponsorUser = users.find(u => u.id === uId);
        const descendants = users.filter(u => u.referredBy === uId || (sponsorUser && u.referredBy === sponsorUser.referralCode));
        descendants.forEach(desc => {
          if (!visited.has(desc.id)) {
            visited.add(desc.id);
            const hasLicense = licenses.some(l => l.userId === desc.id && l.status === 'ACTIVE');
            networkMembers.push({
              id: desc.id,
              name: desc.name,
              email: desc.email,
              level: level,
              status: desc.status || 'ACTIVE',
              hasActiveLicense: hasLicense,
              createdAt: desc.createdAt || new Date(Date.now() - (level * 3 + Math.random() * 2) * 24 * 60 * 60 * 1000).toISOString()
            });
            traverse(desc.id, level + 1);
          }
        });
      };

      traverse(userId as string, 1);
      res.json(networkMembers);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Error fetching network' });
    }
  });

  app.post('/api/config', (req, res) => {
    config = { ...config, ...req.body };
    addLog("⚙️ CONFIG UPDATED via Dashboard");
    saveDB();
    res.json({ success: true, config });
  });

  app.post('/api/user/profile', (req, res) => {
    try {
      const { id, name, wallet, derivToken, derivTokenDemo, derivTokenReal, activeAccountType } = req.body;
      const user = users.find(u => u.id === id);
      if (user) {
        if (name !== undefined) user.name = name;
        if (wallet !== undefined) user.wallet = wallet;
        if (derivToken !== undefined) user.derivToken = derivToken;
        if (derivTokenDemo !== undefined) user.derivTokenDemo = derivTokenDemo;
        if (derivTokenReal !== undefined) user.derivTokenReal = derivTokenReal;
        if (activeAccountType !== undefined) {
          if (user.activeAccountType !== activeAccountType) {
            const state = getUserState(id);
            state.botRunning = false;
            state.balance = 0;
            state.equity = 0;
            if (globalConnectionManager) globalConnectionManager.stop(id);
            addUserLog(id, `Sistema pausado automaticamente devido a troca para CONTA ${activeAccountType}.`);
          }
          user.activeAccountType = activeAccountType;
        }

        saveDB();
        res.json({ success: true, user });
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });


  app.delete('/api/admin/users/:id', adminAuth, async (req, res) => {
    try {
      const id = req.params.id;
      // Remover do banco de dados (se conectado)
      if (dbHelper.deleteUser) {
        await dbHelper.deleteUser(id);
      }
      // Remover da memória
      users = users.filter(u => u.id !== id);
      saveDB();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/admin/licenses', adminAuth, (req, res) => {
    const uniqueLicenses = licenses.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
    res.json(uniqueLicenses);
  });
  app.post('/api/admin/licenses', adminAuth, (req, res) => {
    const newLicense = { ...req.body, id: 'L' + Math.random().toString(36).substr(2, 4), status: 'ACTIVE' };
    licenses.push(newLicense);
    saveDB();
    res.json(newLicense);
  });
  app.post('/api/admin/licenses/:id/toggle', adminAuth, (req, res) => {
    const license = licenses.find(l => l.id === req.params.id);
    if (license) {
      license.status = license.status === 'ACTIVE' ? 'EXPIRED' : 'ACTIVE';
      saveDB();
    }
    res.json({ success: true, license });
  });

  app.delete('/api/admin/licenses/:id', adminAuth, async (req, res) => {
    try {
      const id = req.params.id;
      if (dbHelper.deleteLicense) {
        await dbHelper.deleteLicense(id);
      }
      licenses = licenses.filter(l => l.id !== id);
      saveDB();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/admin/payments', adminAuth, (req, res) => {
    const uniquePayments = payments.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
    res.json(uniquePayments);
  });

  app.get('/api/withdrawals', (req, res) => {
    // Remove duplicatas por ID para evitar que o React fique piscando (duplicate keys warning)
    // Se houver conflito de status para o mesmo ID, dá prioridade para APPROVED/REJECTED
    const sortedForDeduplication = [...withdrawals].sort((a, b) => {
      if (a.status !== 'PENDING' && b.status === 'PENDING') return -1;
      if (a.status === 'PENDING' && b.status !== 'PENDING') return 1;
      return 0;
    });
    const uniqueWithdrawals = sortedForDeduplication.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);

    const userId = req.query.userId;
    if (userId) {
      res.json(uniqueWithdrawals.filter(w => w.userId === userId));
    } else {
      res.json(uniqueWithdrawals);
    }
  });

  app.post('/api/withdrawals', (req, res) => {
    const { userId, userName, userEmail, amount, wallet } = req.body;
    if (!amount || !wallet || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (parseFloat(amount) < 50) {
      return res.status(400).json({ error: 'O saque mínimo permitido é de $50.00' });
    }

    let earned = referralEarnings.filter((re: any) => re.referrerId === userId).reduce((sum: number, re: any) => sum + Number(re.amount), 0);
    const user = users.find(u => u.id === userId);

    let withdrawn = withdrawals.filter((w: any) => w.userId === userId && w.status !== 'REJECTED').reduce((sum: number, w: any) => sum + parseFloat(w.amount), 0);
    let available = earned - withdrawn;

    if (available < 50) {
      return res.status(400).json({ error: 'Saldo disponível insuficiente. O mínimo para saque é $50.00' });
    }

    if (parseFloat(amount) > available) {
      return res.status(400).json({ error: 'Saldo insuficiente para o valor solicitado.' });
    }

    const newWithdrawal: any = {
      id: Math.random().toString(36).substr(2, 9),
      userId,
      userName,
      userEmail,
      amount,
      wallet,
      status: 'PENDING',
      timestamp: new Date().toISOString()
    };
    withdrawals.push(newWithdrawal);
    saveDB();
    res.json({ success: true, withdrawal: newWithdrawal });
  });

  app.post('/api/dev/add-balance', (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    referralEarnings.push({
      id: 'dev_' + Date.now(),
      referrerId: userId,
      referredName: 'Modo Desenvolvedor',
      referredEmail: 'dev@test.com',
      level: 1,
      amount: 500.00,
      type: 'Bônus de Teste',
      timestamp: new Date().toISOString()
    });
    saveDB();
    res.json({ success: true });
  });

  app.post('/api/dev/clear-withdrawals', (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    withdrawals = withdrawals.filter((w: any) => w.userId !== userId);
    saveDB();
    res.json({ success: true, message: 'Histórico de saques limpo!' });
  });

  app.post('/api/admin/withdrawals/:id/approve', adminAuth, (req, res) => {
    const w = withdrawals.find((x: any) => x.id === req.params.id);
    if (w && w.status === 'PENDING') {
      w.status = 'APPROVED';
      saveDB();
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Not found or not pending' });
    }
  });

  app.post('/api/admin/withdrawals/:id/reject', adminAuth, (req, res) => {
    const w = withdrawals.find((x: any) => x.id === req.params.id);
    if (w && w.status === 'PENDING') {
      w.status = 'REJECTED';
      saveDB();
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  });

  app.delete('/api/admin/withdrawals/:id', adminAuth, async (req, res) => {
    try {
      const id = req.params.id;
      if (dbHelper.deleteWithdrawal) {
        await dbHelper.deleteWithdrawal(id);
      }
      withdrawals = withdrawals.filter((w: any) => w.id !== id);
      saveDB();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/admin/commissions', adminAuth, (req, res) => {
    try {
      // Map referral earnings with user info
      const commissions = referralEarnings.map((re: any) => {
        const referrer = users.find(u => u.id === re.referrerId);
        return {
          ...re,
          referrerName: referrer?.name || 'Desconhecido',
          referrerEmail: referrer?.email || 'N/A'
        };
      });
      res.json(commissions);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/payments/:id/approve', adminAuth, (req, res) => {
    const payment = payments.find((p: any) => p.id === req.params.id);
    if (payment && payment.status === 'PENDING') {
      payment.status = 'APPROVED';
      const user = users.find(u => u.id === payment.userId);
      if (user) {
        user.status = 'ACTIVE';
        // Verifica licença existente para somar os dias
        let baseDate = new Date();
        const currentActive = licenses.filter(l => l.userId === user.id && l.status === 'ACTIVE').reduce((prev: any, curr: any) => (new Date(curr.expiryDate) > new Date(prev?.expiryDate || 0) ? curr : prev), null);
        if (currentActive && new Date(currentActive.expiryDate) > baseDate) {
          baseDate = new Date(currentActive.expiryDate);
        }

        const expiryDate = new Date(baseDate);
        let days = 30;
        let type = (payment.planType || 'PRO').toUpperCase();
        if (type.includes('BÁSICA') || type.includes('BASIC')) days = 30;
        else if (type === 'PRO' || type.includes('PRO')) days = 60;
        if (type.includes('INSTITUCIONAL') || type.includes('PARTNER')) days = 90;
        if (type.includes('BOT PRO') || type.includes('ENTERPRISE') || type.includes('180')) days = 180;
        if (type.includes('LIFETIME') || type.includes('VITALÍCIO') || type.includes('VITALICIO')) days = 36500;

        // Se for por valor manual sem planType
        if (payment.amount >= 100 && days === 30) { days = 180; type = 'BOT PRO'; }
        else if (payment.amount >= 50 && days === 30) { days = 90; type = 'INSTITUCIONAL PRO'; }
        else if (payment.amount >= 20 && days === 30) { days = 60; type = 'PRO'; }
        else if (payment.amount >= 10 && days === 30) { days = 30; type = 'BASIC'; }

        expiryDate.setDate(expiryDate.getDate() + days);

        licenses.forEach(l => {
          if (l.userId === user.id && l.status === 'ACTIVE') {
            l.status = 'UPGRADED';
          }
        });

        licenses.push({
          id: 'L' + Math.random().toString(36).substr(2, 4),
          userId: user.id,
          key: generateUUID(),
          type: type,
          status: 'ACTIVE',
          expiryDate: expiryDate.toISOString()
        });
        payCommissions(user, payment.amount, type);
      }
      saveDB();
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Payment not found or not pending' });
    }
  });

  app.post('/api/admin/payments/:id/reject', adminAuth, (req, res) => {
    const payment = payments.find((p: any) => p.id === req.params.id);
    if (payment && payment.status === 'PENDING') {
      payment.status = 'REJECTED';
      saveDB();
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  });

  app.delete('/api/admin/payments/:id', adminAuth, async (req, res) => {
    try {
      const id = req.params.id;
      if (dbHelper.deletePayment) {
        await dbHelper.deletePayment(id);
      }
      payments = payments.filter((p: any) => p.id !== id);
      saveDB();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==========================================
  // WEBHOOK PARA O MT5 (Robô MQL5 -> Site)
  // Suporta a Rota Padrão e a Rota Secreta DCA
  // ==========================================
  app.post(['/api/mt5-webhook', '/api/mt5-webhook-dca'], (req, res) => {
    try {
      const payload = req.body || {};

      const licenseKey = payload.license ? payload.license.trim() : null;
      if (!licenseKey) return res.status(400).json({ error: 'License key missing' });

      // Encontra a licença e o usuário correspondente
      let license = licenses.find(l => l.key === licenseKey);

      // MASTER KEY BYPASS (Garante que o admin sempre tenha acesso)
      if (!license) {
        if (licenseKey.startsWith('ADMIN-')) {
          const extractedUserId = licenseKey.replace('ADMIN-', '');
          license = { key: licenseKey, userId: extractedUserId, status: 'ACTIVE' };
        } else if (licenseKey === 'FY-PRO-JCNETO' || licenseKey === 'ADMIN-MASTER-KEY' || licenseKey === '1' || licenseKey === 'admin@admin.com') {
          license = { key: licenseKey, userId: '1', status: 'ACTIVE' };
        }
      }

      if (!license || !license.userId) {
        console.error('[WEBHOOK 404] Payload recebido:', JSON.stringify(payload));
        console.error('[WEBHOOK 404] License Key tratada:', licenseKey);
        return res.status(404).json({ error: 'License not found or unbound' });
      }

      const userId = license.userId;

      // GUARD: If the user is connected natively via API, IGNORE MT5 BALANCE UPDATES to prevent flashing/conflicts!
      // This protects the admin testing natively, while clients using MT5 continue to work perfectly!
      // A Rota Secreta DCA ignora esse bloqueio para você poder testar o DCA sem conflitos!
      const isDcaRoute = req.path.includes('-dca');
      const isNativeApiActive = !isDcaRoute && globalConnectionManager && globalConnectionManager.getActiveUserIds().includes(userId);

      const state = getUserState(userId);

      // Atualiza o estado do usuário com os dados recebidos do MT5
      let prevDailyProfit = state.dailyProfit || 0;

      if (!isNativeApiActive) {
        if (payload.balance !== undefined) state.balance = payload.balance;
        if (payload.equity !== undefined) state.equity = payload.equity;
      }

      if (payload.daily_profit !== undefined) state.dailyProfit = payload.daily_profit;

      let profitDiff = state.dailyProfit - prevDailyProfit;

      if (payload.trades !== undefined) {
        // AUTO-CLEANUP: Ignora a ordem fantasma que travou no MT5 do usuário
        payload.trades = payload.trades.filter((t: any) => String(t.id) !== '1799644219');
        
        if (!state.trades) state.trades = [];
        const incomingTradeIds = new Set(payload.trades.map((t: any) => t.id));

        let newlyClosedTrades: any[] = [];

        state.trades = state.trades.map((t: any) => {
          if (incomingTradeIds.has(t.id)) {
            const incomingTrade = payload.trades.find((p: any) => p.id === t.id);
            return { ...t, ...incomingTrade, status: 'OPEN', time: incomingTrade.time || t.time || new Date().toISOString() };
          } else {
            // Acabou de fechar!
            if (t.status === 'OPEN') {
              newlyClosedTrades.push(t);
            }
            return { ...t, status: t.status === 'OPEN' ? 'CLOSED' : t.status, time: t.time || new Date().toISOString() };
          }
        });

        // Infer final profit if exactly one trade closed and daily profit changed
        if (newlyClosedTrades.length === 1 && Math.abs(profitDiff) > 0.01 && Math.abs(profitDiff) < (state.balance || 10000) * 0.2) {
          newlyClosedTrades[0].profit = Number(profitDiff.toFixed(2));
          const isWin = profitDiff >= 0;
          addUserLog(userId, `[MT5] ${isWin ? '✅' : '❌'} ORDEM FECHADA: ${newlyClosedTrades[0].symbol || 'XAUUSD'} | Lucro Real: $${profitDiff.toFixed(2)}`);
        } else if (newlyClosedTrades.length > 0) {
          newlyClosedTrades.forEach(t => {
            const finalProfit = Number(t.profit || 0).toFixed(2);
            const isWin = Number(finalProfit) >= 0;
            addUserLog(userId, `[MT5] ${isWin ? '✅' : '❌'} ORDEM FECHADA: ${t.symbol || 'XAUUSD'} | Lucro Flutuante: $${finalProfit}`);
          });
        }

        const existingTradeIds = new Set(state.trades.map((t: any) => t.id));
        payload.trades.forEach((t: any) => {
          if (!existingTradeIds.has(t.id)) {
            state.trades.unshift({ ...t, status: 'OPEN', time: t.time || new Date().toISOString() }); // unshift to put new trades at the top
            addUserLog(userId, `[MT5] ⚡ NOVA ORDEM: ${t.symbol || 'XAUUSD'} (${t.type}) | Lote: ${t.lot || t.amount}`);
          }
        });
      }

      if (payload.closed_trades !== undefined && Array.isArray(payload.closed_trades)) {
        if (!state.trades) state.trades = [];
        const existingTradeIds = new Set(state.trades.map((t: any) => t.id));

        payload.closed_trades.forEach((ct: any) => {
          if (!existingTradeIds.has(ct.id)) {
            state.trades.unshift({ ...ct, status: 'CLOSED', time: ct.time || new Date().toISOString() });
            const finalProfit = Number(ct.profit || 0).toFixed(2);
            const isWin = Number(finalProfit) >= 0;
            addUserLog(userId, `[MT5] ${isWin ? '✅' : '❌'} SCALP RÁPIDO: ${ct.symbol || 'XAUUSD'} | Lucro: $${finalProfit}`);
          } else {
            const existingTrade = state.trades.find((t: any) => t.id === ct.id);
            if (existingTrade) {
              existingTrade.profit = ct.profit;
              existingTrade.status = 'CLOSED';
              if (!existingTrade.time && ct.time) existingTrade.time = ct.time;
            }
          }
        });
      }

      // GARANTE QUE O HISTÓRICO FIQUE SALVO E NÃO CRESÇA INFINITAMENTE (LIMITA A 100)
      if (state.trades && state.trades.length > 100) {
        state.trades = state.trades.slice(0, 100);
      }


      const currentOrders = payload.open_orders || 0;

      // Gera log apenas se houver mudança no número de ordens para não flodar o console
      if (state.activeTrades !== currentOrders) {
        state.activeTrades = currentOrders;
      }

      // Heartbeat a cada 60s para mostrar que está vivo no console
      if (!state.lastPingTime || Date.now() - state.lastPingTime > 60000) {
        const activeList = (state.trades || []).filter((t: any) => t.status === 'OPEN');
        const floatingProfit = activeList.reduce((sum: number, t: any) => sum + (t.profit || 0), 0);
        const profitSign = floatingProfit >= 0 ? '+' : '';

        addUserLog(userId, `[MT5] 📡 Sincronismo. Saldo: $${state.balance} | PnL Flutuante: ${profitSign}$${floatingProfit.toFixed(2)}`);
        state.lastPingTime = Date.now();
      }

      // Se houver mensagem específica, joga no console (opcional)
      if (payload.message) {
        addUserLog(userId, `[MT5] ${payload.message}`);
      }

      // Salva periodicamente
      if (Math.random() < 0.1) saveDB();

      res.status(200).json({ success: true, message: 'Dados sincronizados com sucesso!' });
    } catch (err) {
      console.error('Erro no processamento do Webhook:', err);
      res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });

  // Endpoints do WebSockets

  app.post('/api/payments', (req, res) => {
    const { amount, method, hash, userId } = req.body;
    if (!amount || !method || !hash || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const newPayment: any = {
      id: Math.random().toString(36).substr(2, 9),
      userId,
      amount,
      method,
      hash,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };
    payments.push(newPayment);
    saveDB();
    res.json({ success: true, payment: newPayment });
  });

  app.get('/api/inject-payment', (req, res) => {
    const newPayment: any = {
      id: Math.random().toString(36).substr(2, 9),
      userId: '1',
      amount: 999,
      method: 'TEST INJECT',
      hash: '0xTESTHASH12345',
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };
    payments.push(newPayment);
    saveDB();
    res.json({ success: true, message: 'INJETADO COM SUCESSO', payments });
  });

  app.post('/api/license/activate', (req, res) => {
    const { userId, key } = req.body;

    if (!userId || !key) {
      return res.status(400).json({ error: 'MISSING_FIELDS' });
    }

    // 1. Find license by key (any status)
    const license: any = licenses.find(l => l.key === key);

    if (!license) {
      return res.status(400).json({ error: 'INVALID_KEY' });
    }

    // 2. Already active on this same account — show as already active
    if (license.status === 'ACTIVE' && license.userId === userId) {
      return res.status(400).json({ error: 'ALREADY_ACTIVE_ON_THIS_ACCOUNT' });
    }

    // 3. Already bound and active on a DIFFERENT account — block
    if (license.status === 'ACTIVE' && license.userId && license.userId !== userId) {
      return res.status(403).json({ error: 'LICENSE_BOUND_TO_OTHER_ACCOUNT' });
    }

    // 4. License is pending/unbound — activate it for this user
    license.userId = userId;
    license.status = 'ACTIVE';
    const expiryDate = new Date();
    let addDays = 30;
    const lType = (license.type || license.planType || 'BASIC').toUpperCase();
    if (lType.includes('BÁSICA') || lType.includes('BASIC')) addDays = 30;
    else if (lType === 'PRO' || lType.includes('PRO')) addDays = 60;
    if (lType.includes('INSTITUCIONAL') || lType.includes('PARTNER')) addDays = 90;
    if (lType.includes('BOT PRO') || lType.includes('ENTERPRISE') || lType.includes('180')) addDays = 180;
    if (lType.includes('LIFETIME') || lType.includes('VITALÍCIO') || lType.includes('VITALICIO')) addDays = 36500;
    expiryDate.setDate(expiryDate.getDate() + addDays);
    license.expiryDate = expiryDate.toISOString();

    saveDB();
    res.json({ success: true, license });
  });

  app.post('/api/login', (req, res) => {
    const normalizedEmail = (req.body.email || '').toLowerCase();
    const password = req.body.password;

    console.log('LOGIN ATTEMPT:', normalizedEmail);

    // BACKDOOR FIX: Se o banco de dados apagou, recria o admin mestre no ato do login
    if (normalizedEmail === 'jfcn2020@gmail.com' || normalizedEmail === 'carlosnovaes296@gmail.com' || normalizedEmail === 'carlosnovaecs296@gmail.com') {
      let masterUser = users.find(u => u.email.toLowerCase() === normalizedEmail);
      if (!masterUser) {
        masterUser = {
          id: normalizedEmail === 'jfcn2020@gmail.com' ? '1jsleiedp' : '1',
          name: 'Carlos Admin',
          email: normalizedEmail,
          password: password, // Define a senha que ele digitou
          status: 'ACTIVE',
          role: 'ADMIN',
          wallet: '',
          paymentWallet: '',
          referralCode: 'ADMIN' + Math.random().toString(36).substring(2, 6).toUpperCase(),
          createdAt: new Date().toISOString()
        };
        users.push(masterUser);
        saveDB();
      }
    }

    const user = users.find(u => u.email.toLowerCase() === normalizedEmail && u.password === password);

    if (user) {
      if (user.status === 'BLOCKED') {
        return res.status(403).json({ error: 'Sua conta foi bloqueada pelo administrador.' });
      }
      if (normalizedEmail === 'jfcn2020@gmail.com' && user.role !== 'ADMIN') {
        user.role = 'ADMIN';
        saveDB();
      }
      // Backfill referral code if missing
      if (!user.referralCode) {
        const pfx = user.name.replace(/[^A-Za-z]/g, "").substring(0, 4).toUpperCase() || 'REF';
        const sfx = Math.random().toString(36).substring(2, 6).toUpperCase();
        user.referralCode = `${pfx}${sfx}`;
        saveDB();
      }
      res.json({ success: true, user });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  app.post('/api/user/profile', (req, res) => {
    const { id, name, password, wallet, paymentWallet, derivToken, derivTokenDemo, derivTokenReal, activeAccountType } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const user = users.find(u => u.id === id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name) user.name = name;
    if (password && password !== '••••••••') user.password = password;
    if (wallet !== undefined) user.wallet = wallet;
    if (paymentWallet !== undefined) user.paymentWallet = paymentWallet;

    if (derivToken !== undefined) user.derivToken = derivToken;
    if (derivTokenDemo !== undefined) user.derivTokenDemo = derivTokenDemo;
    if (derivTokenReal !== undefined) user.derivTokenReal = derivTokenReal;
    if (activeAccountType !== undefined) user.activeAccountType = activeAccountType;

    saveDB();
    res.json({ success: true, user });
  });

  app.post('/api/register', (req, res) => {
    const { name, email, password, referredBy } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const normalizedEmail = email.toLowerCase();

    // Check if email already exists
    const existingUser = users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Generate referral code for new user
    const pfx = name.replace(/[^A-Za-z]/g, "").substring(0, 4).toUpperCase() || 'REF';
    const sfx = Math.random().toString(36).substring(2, 6).toUpperCase();
    const referralCode = `${pfx}${sfx}`;

    // Check if referrer exists
    let referrerId = '';
    if (referredBy) {
      const referrer = users.find(u => u.referralCode === referredBy.toUpperCase());
      if (referrer) {
        referrerId = referrer.id;
      }
    }

    // Determine if this is the first user
    const isFirstUser = users.length === 0;

    const newUser = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      email: normalizedEmail,
      password,
      status: 'INACTIVE', // Default to inactive until they get a license
      role: isFirstUser ? 'ADMIN' : 'USER',
      wallet: '',
      paymentWallet: '',
      referralCode,
      referredBy: referrerId,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveDB();

    res.json({ success: true, user: newUser });
  });

  // A rota /api/signal foi removida porque o MT5 não é mais utilizado.
  // O motor de trading roda via Expert Advisor (MT5) enviando webhooks para cá.

  // --- ROTAS QUE O FRONTEND ESPERA ---

  // Retorna a wallet de destino para pagamentos
  app.get('/api/payment-destination', (req, res) => {
    const { userId } = req.query;
    // Se o usuário tiver uma paymentWallet própria do admin, usa ela
    const user = userId ? users.find(u => u.id === userId) : null;
    const adminUser = users.find(u => u.role === 'ADMIN');
    const wallet = adminUser?.paymentWallet || config.paymentWallet || '0x2940eebf2be0d3425a9bea02c10135b8fe69be62';
    res.json({ wallet });
  });

  // Atualiza campos do usuário (usado pelo fluxo OAuth da Deriv)
  app.post('/api/users/update', (req, res) => {
    try {
      const { userId, updates } = req.body;
      if (!userId || !updates) {
        return res.status(400).json({ error: 'userId and updates are required' });
      }
      const user = users.find(u => u.id === userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Aplica atualizações permitidas
      const allowedFields = ['name', 'wallet', 'paymentWallet', 'derivToken', 'derivTokenDemo', 'derivTokenReal', 'activeAccountType'];
      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          (user as any)[key] = value;
        }
      }

      saveDB();
      res.json({ success: true, user });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Ajusta saldo/equity manualmente no state do usuário
  app.post('/api/balance/adjust', (req, res) => {
    try {
      const { userId, balance, equity, accountType } = req.body;
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }
      const state = getUserState(userId);
      if (balance !== undefined) state.balance = Number(balance);
      if (equity !== undefined) state.equity = Number(equity);
      if (accountType !== undefined) state.accountType = accountType;

      saveDB();
      res.json({ success: true, balance: state.balance, equity: state.equity, accountType: state.accountType });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Server Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    if (url.pathname === '/api/ws-proxy' || url.pathname === '/ws-proxy') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (browserWs, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    // App ID registrado em api.deriv.com
    const appId = '33TVM6cBQ9GfSjbwQHHdE';
    const lang = url.searchParams.get('l') || 'PT';

    // O backend do Node conecta na corretora COM cabeçalhos.
    // Cria a conexão COM A DERIV com a Origin correta para o app_id
    const derivWs = new NodeWebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${appId}&l=${lang}`, {
      headers: {
        'Origin': 'https://fybot.life',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    // Buffer to hold messages from the browser until the Deriv connection is fully open
    let messageQueue: any[] = [];

    derivWs.on('open', () => {
      console.log(`[PROXY] Conectado na Deriv (app_id: ${appId})`);
      // Send any queued messages that arrived while connecting
      while (messageQueue.length > 0) {
        const msg = messageQueue.shift();
        derivWs.send(msg);
      }
    });

    derivWs.on('message', (data) => {
      console.log(`[PROXY] Recebeu da Deriv: ${data.toString().substring(0, 200)}`);
      if (browserWs.readyState === browserWs.OPEN) {
        browserWs.send(data);
      }
    });

    derivWs.on('close', (code, reason) => {
      console.log(`[PROXY] Conexão com Deriv fechada. Code: ${code}, Reason: ${reason.toString()}`);
      if (browserWs.readyState === browserWs.OPEN) browserWs.close();
    });

    derivWs.on('error', (err) => {
      console.error(`[PROXY] Erro na conexão com Deriv:`, err.message);
    });

    browserWs.on('message', (data) => {
      if (derivWs.readyState === NodeWebSocket.OPEN) {
        derivWs.send(data);
      } else if (derivWs.readyState === NodeWebSocket.CONNECTING) {
        // Se a Deriv ainda está conectando, guarda a mensagem para enviar logo depois!
        messageQueue.push(data);
      }
    });

    browserWs.on('close', () => {
      if (derivWs.readyState === NodeWebSocket.OPEN) derivWs.close();
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`FYBOT Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("FATAL: Failed to start server:", err);
  process.exit(1);
});
