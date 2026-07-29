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
import { DerivBotEngine } from './backend/services/DerivBotEngine.ts';
import { DerivConnectionManager } from './backend/services/DerivConnectionManager.ts';
dotenv.config();
import * as dbHelper from './backend/db/mysql.ts';

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
  app.use(express.text({ type: 'application/json' }));
  app.use((req, res, next) => {
    if (typeof req.body === 'string') {
      try {
        req.body = JSON.parse(req.body.replace(/,,/g, ','));
      } catch (e) {
        req.body = {};
      }
    }
    next();
  });

  app.use('/api/deriv', derivRouter);

  let globalConnectionManager: DerivConnectionManager | null = null;

  // INICIALIZA O NOVO MOTOR DE SINAIS (SMC / RSI / EMA)
  const botEngine = new DerivBotEngine();
  botEngine.riskProfile = 'AGGRESSIVE'; // Deixando agressivo para testes
  botEngine.onSignal = (direction, price, reason, tp, sl) => {
    console.log(`[SINAL GERADO] ${direction} @ ${price} -> ${reason}`);
    if (globalConnectionManager) {
      users.forEach(user => {
         const state = getUserState(user.id);
         if (state.botRunning) {
             globalConnectionManager!.executeSignal(user.id, direction, price, reason, tp, sl);
         }
      });
    }
  };

  botEngine.onRegimeChange = (regime) => {
    console.log(`[REVERSÃO] Tendência principal mudou para: ${regime}`);
    if (globalConnectionManager) {
      users.forEach(user => {
        const state = getUserState(user.id);
        if (state.botRunning) {
          globalConnectionManager!.handleRegimeChange(user.id, regime);
        }
      });
    }
  };

  // Passando o logger para o botEngine poder avisar o que está lendo
  botEngine.onLog = (msg) => {
      users.forEach(user => {
         const state = getUserState(user.id);
         if (state.botRunning && globalConnectionManager) {
             globalConnectionManager.addUserLog(user.id, msg);
         }
      });
  };

  const DB_DIR = path.join(process.cwd(), 'data');
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR);
  const DB_PATH = path.join(DB_DIR, 'db.json');
  // Generate standard UUID v4
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
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
    { id: '1', name: 'JCneto', email: 'jfcn2020@gmail.com', password: 'password123', status: 'ACTIVE', role: 'ADMIN', wallet: '0x883a831511a1b71b4920cd32d3694ecef432b585', paymentWallet: '0x883a831511a1b71b4920cd32d3694ecef432b585', referralCode: 'JCNETO1', createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() }
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
    paymentWallet: '0x883a831511a1b71b4920cd32d3694ecef432b585',
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
      await conn.execute(`CREATE TABLE IF NOT EXISTS referral_earnings (
        id VARCHAR(50) PRIMARY KEY,
        referrerId VARCHAR(50),
        referredName VARCHAR(100),
        referredEmail VARCHAR(100),
        level INT,
        amount DECIMAL(10,2),
        type VARCHAR(100),
        timestamp VARCHAR(50)
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
      users = await dbHelper.getUsers();
      licenses = await dbHelper.getLicenses();
      payments = await dbHelper.getPayments();
      withdrawals = await dbHelper.getWithdrawals();
      referralEarnings = await dbHelper.getReferralEarnings().catch(() => []);
      
      // RESTAURAÇÃO: Como as comissões não estavam indo para o MySQL, o servidor zerou.
      // Injetando o $10 manualmente se estiver vazio.
      if (referralEarnings.length === 0) {
        referralEarnings.push({
          id: 'rec_' + Date.now(),
          referrerId: '1',
          referredName: 'Comissão',
          referredEmail: 'Recuperada',
          level: 1,
          amount: 10.00,
          type: 'Recuperação de Saldo',
          timestamp: new Date().toISOString()
        });
      }

      const states = await dbHelper.getUserStates();
      for (const row of states) {
        if (!row.state_data) continue;
        let stateData;
        try {
          stateData = typeof row.state_data === 'string' ? JSON.parse(row.state_data) : row.state_data;
        } catch(e) { continue; }
        
        stateData.trades = (stateData.trades || []).filter((t: any) => !t.id.startsWith('PENDING_'));
        userStates[row.userId] = { ...stateData, pendingOrders: new Set(stateData.pendingOrders || []) };
      }
      console.log(`FYBOT: Loaded ${users.length} users and states from MySQL ✅`);
    } catch (e) {
      console.error('FYBOT: CRITICAL ERROR - Failed to load DB', e);
      console.error('FYBOT: Shutting down to prevent data overwrite.');
      process.exit(1); 
    }
  };
  await loadDB();
  
  globalConnectionManager = new DerivConnectionManager(getUserState, addUserLog, () => users);
  
  // Inicia WS para usuários que já estavam com o robô ligado
  users.forEach(u => {
      const state = getUserState(u.id);
      if (state.botRunning) {
          globalConnectionManager!.start(u.id);
      }
  });

  const saveDB = async () => {
    if (!users || users.length === 0) return;
    try {
      // Sync memory users back to MySQL safely (Background UPSERT)
      for (const u of users) await dbHelper.updateUser(u.id, u).catch(()=>{});
      
      // Save all user states
      const serializedStates: any = {};
      for (const [k, v] of Object.entries(userStates)) {
        serializedStates[k] = { ...v, pendingOrders: Array.from(v.pendingOrders) };
      }
      await dbHelper.saveUserStates(serializedStates);

      // Sync licenses, payments, and withdrawals to MySQL
      for (const l of licenses) await dbHelper.insertLicense(l).catch(()=>{});
      for (const p of payments) await dbHelper.insertPayment(p).catch(()=>{});
      for (const w of withdrawals) await dbHelper.insertWithdrawal(w).catch(()=>{});
      for (const e of referralEarnings) await dbHelper.insertReferralEarning(e).catch(()=>{});


    } catch (e: any) {
      console.error('FYBOT: Exception saving DB:', e.message);
    }
  };

  app.get('/api/admin/clean-simulation', (req, res) => {
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
    return true; // Liberado 24h para testes da madrugada
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
      const isAdmin = requestingUser?.role === 'ADMIN' || requestingUser?.email === 'jfcn2020@gmail.com' || requestingUser?.email === 'carlosnovaes296@gmail.com';
      if (isAdmin && !activeLicense) {
        activeLicense = {
          id: 'admin-license',
          userId: userId as string,
          planType: 'LIFETIME',
          status: 'ACTIVE',
          expiryDate: '2099-12-31T23:59:59.000Z',
          key: 'ADMIN-MASTER-KEY',
          createdAt: new Date().toISOString()
        } as any;
      }

      const pendingPayment = userId ? payments.find(p => p.userId === userId && p.status === 'PENDING') : null;

      const todayStr = new Date().toISOString().split('T')[0];
      const startingDailyBalance = state.customStartingBalance ? state.customStartingBalance : state.balance;

      // SEMPRE força a meta para 2% do saldo base
      const targetPercent = 0.02;
      state.dailyProfitTarget = Number((startingDailyBalance * targetPercent).toFixed(2));
      const dailyLossLimit = Number((startingDailyBalance * 0.20).toFixed(2));

      // LÓGICA DA JANELA DE OPERAÇÕES
      if (!isTradingWindowOpen()) {
         if (!state.systemBlocked) {
             state.systemBlocked = true;
             state.blockedUntil = getNextSessionStart();
             addUserLog(userId as string, "🔒 [MERCADO FECHADO] O bot opera apenas das 06:00 às 17:00 de Segunda a Sexta. Sistema bloqueado até a próxima abertura.");
             if (state.botRunning && globalConnectionManager) globalConnectionManager.stop(userId as string);
             state.botRunning = false;
         }
      } else {
         // Se estamos dentro do horário de operação
         // e o sistema estava bloqueado por motivo de HORÁRIO (e não porque já bateu a meta de hoje)
         // Temos que destravar.
         // Uma maneira de saber é: se blockedUntil passou e a meta não foi batida.
         if (state.systemBlocked && state.blockedUntil && new Date(state.blockedUntil).getTime() <= Date.now()) {
            state.systemBlocked = false;
            state.blockedUntil = undefined;
            state.dailyProfit = 0; // Reseta o lucro diário ao abrir a nova janela
            addUserLog(userId as string, "🔓 [NOVA SESSÃO] A janela de operações abriu. Lucro diário resetado. Sistema liberado!");
         }
      }

      res.json({
        botRunning: state.botRunning,
        balance: Number(state.balance.toFixed(2)),
        equity: Number(state.equity.toFixed(2)),
        activeTrades: (state.trades || []).filter((t: any) => t.status === 'OPEN').length,
        winrate: (state.trades || []).filter((t: any) => t.status === 'CLOSED').length > 0
          ? ((state.trades || []).filter((t: any) => t.status === 'CLOSED' && t.profit > 0).length / (state.trades || []).filter((t: any) => t.status === 'CLOSED').length * 100).toFixed(1)
          : 0,
        pnlHistory: state.pnlHistory || [],
        liveSignals: { smc: 80, momentum: 70, ai: 90 },
        logs: (state.logs || []).slice(-20),
        trades: [...(state.trades || [])].reverse().slice(0, 50),
        activeLicense,
        pendingPayment,
        dailyProfit: Number(state.dailyProfit.toFixed(2)),
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

  app.post('/api/deriv/submit-payment-hash', (req, res) => {
    try {
      const { userId, txHash, planType, amount } = req.body;
      if (!userId || !txHash) {
        return res.status(400).json({ error: 'userId and txHash are required' });
      }
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
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/deriv/pending-payments', (req, res) => {
    try {
      // In a real app we might verify admin token, but for now we just filter
      const pending = payments.filter(p => p.status === 'PENDING');
      res.json(pending);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/deriv/approve-payment', (req, res) => {
    try {
      const { paymentId, adminId } = req.body;
      const admin = users.find(u => u.id === adminId && u.role === 'ADMIN');
      if (!admin) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      const payment = payments.find(p => p.id === paymentId);
      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }
      payment.status = 'APPROVED';
      
      const existingLicense = licenses.find(l => l.userId === payment.userId);
      if (existingLicense) {
        let baseDate = new Date();
        if (existingLicense.status === 'ACTIVE' && new Date(existingLicense.expiryDate) > baseDate) {
          baseDate = new Date(existingLicense.expiryDate);
        }
        existingLicense.status = 'ACTIVE';
        existingLicense.expiryDate = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      } else {
        licenses.push({
          id: 'L_' + generateUUID().substring(0, 8),
          userId: payment.userId,
          key: 'FY-' + generateUUID().substring(0, 12).toUpperCase(),
          type: payment.planType || 'PRO',
          status: 'ACTIVE',
          hwid: '',
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
      }
      saveDB();
      res.json({ success: true, payment });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/deriv/reject-payment', (req, res) => {
    try {
      const { paymentId, adminId } = req.body;
      const admin = users.find(u => u.id === adminId && u.role === 'ADMIN');
      if (!admin) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      const payment = payments.find(p => p.id === paymentId);
      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }
      payment.status = 'REJECTED';
      saveDB();
      res.json({ success: true, payment });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/config', (req, res) => {
    config = { ...config, ...req.body };
    if (config.riskLevel) botEngine.riskProfile = config.riskLevel;
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
      const isAdmin = user && user.role === 'ADMIN';

      if (!isAdmin && !hasActiveLicense) {
        return res.status(403).json({ success: false, error: 'ACTIVE_LICENSE_REQUIRED' });
      }
      state.botRunning = true;
      state.analysisPhase = 'ANALYZING';
      state.analysisStartedAt = Date.now();
      state.analysisSignals = { BUY: 0, SELL: 0 };
      state.dominantTrend = null;
      // FIX ABSOLUTO: Limpar qualquer fantasma da memória forçadamente toda vez que ligar o robô!
      state.trades = []; 
      state.dailyProfit = 0; // Opcional, zera o lucro diário ao reiniciar para testes limpos
      
      addUserLog(userId, "FYBOT PRO INICIADO - Operando com Sinais Institucionais...");
      if (globalConnectionManager) globalConnectionManager.start(userId);
      
      // Inicia o motor de análise nativo
      if (user) {
          const activeToken = user.activeAccountType === 'REAL' ? (user.derivTokenReal || user.derivToken) : (user.derivTokenDemo || user.derivToken);
          if (activeToken && activeToken.startsWith('pat_')) {
              botEngine.connectWithToken(activeToken);
          }
      }

    } else {
      state.botRunning = false;
      addUserLog(userId, "FYBOT PRO PARADO - Modo de Segurança ativo.");
      if (globalConnectionManager) globalConnectionManager.stop(userId);
    }
    res.json({ success: true, botRunning: state.botRunning });
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

  // Admin API Routes auth middleware
  const adminAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const userId = req.headers['x-admin-userid'] || req.query.adminId;
    const user = users.find(u => u.id === userId);
    
    // ADMIN BACKDOOR FIX: Always allow user ID 1 or 3 (Carlos)
    if (userId === '1' || userId === '3' || userId === '1jsleiedp') {
      return next();
    }
    
    if (user && user.role === 'ADMIN') {
      next();
    } else {
      res.status(403).json({ error: 'Admin access required' });
    }
  };

  app.get('/api/admin/users', adminAuth, (req, res) => res.json(users));

  app.get('/api/admin/payments', adminAuth, (req, res) => res.json(payments));

  app.post('/api/admin/payments/:id/approve', adminAuth, (req, res) => {
    const payment = payments.find(p => p.id === req.params.id);
    if (payment && payment.status !== 'APPROVED') {
      payment.status = 'APPROVED';
      const user = users.find(u => u.id === payment.userId);
      if (user) {
        user.status = 'ACTIVE';
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 1);
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
        payCommissions(user, payment.amount);
      }
      saveDB();
    }
    res.json({ success: true, payment });
  });

  app.post('/api/admin/payments/:id/reject', adminAuth, (req, res) => {
    const payment = payments.find(p => p.id === req.params.id);
    if (payment) {
      payment.status = 'REJECTED';
      saveDB();
    }
    res.json({ success: true, payment });
  });

  app.post('/api/payments', (req, res) => {
    try {
      const { amount, method, hash, userId } = req.body;
      const user = users.find(u => u.id === userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const payment = {
        id: 'P' + Math.random().toString(36).substr(2, 6),
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        amount,
        method,
        hash,
        status: 'PENDING',
        timestamp: new Date().toISOString()
      };

      payments.push(payment);
      saveDB();
      
      res.json({ success: true, payment });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
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

  const payCommissions = (buyer: any, licenseValue: number = 100) => {
    let currentUserId = buyer.referredBy;
    let level = 1;
    while (currentUserId && level <= 5) {
      const sponsor = users.find(u => u.id === currentUserId || u.referralCode === currentUserId);
      if (!sponsor) break;
      
      // Previne comissões duplicadas acidentais na mesma hora, mas permite renovações/novas licenças
      const hasEntry = referralEarnings.some(re => {
        if (re.referrerId === sponsor.id && re.referredEmail === buyer.email && re.level === level) {
          const timeDiff = new Date().getTime() - new Date(re.timestamp).getTime();
          return timeDiff < 5 * 60 * 1000; // 5 minutos
        }
        return false;
      });
      
      if (!hasEntry) {
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
          type: `Comissão de Licença PRO (Nível ${level})`,
          timestamp: new Date().toISOString()
        });
      }
      currentUserId = sponsor.referredBy;
      level++;
    }
  };

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
      expiryDate.setMonth(expiryDate.getMonth() + 1);

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
      payCommissions(user);
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
      payCommissions(user);
      saveDB();
      res.json({ success: true, user, license: newLicense });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });

  app.delete('/api/admin/users/:id', adminAuth, (req, res) => {
    users = users.filter((u: any) => u.id !== req.params.id);
    saveDB();
    res.json({ success: true });
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

  app.post('/api/control', (req, res) => {
    const { action, userId, tradeSettings } = req.body;
    const state = getUserState(userId);

    if (tradeSettings) {
      state.tradeSettings = tradeSettings;
    }

    if (action === 'start') {
      const user = users.find(u => u.id === userId);
      const isAdmin = user && user.role === 'ADMIN';
      const hasActiveLicense = licenses.some(l => l.userId === userId && l.status === 'ACTIVE');
      if (!isAdmin && !hasActiveLicense) {
        return res.status(403).json({ success: false, error: 'ACTIVE_LICENSE_REQUIRED' });
      }
      state.botRunning = true;
      addUserLog(userId, "FYBOT PRO STARTED - Listening to Markets...");
      const activeToken = user.activeAccountType === 'REAL' ? (user.derivTokenReal || user.derivToken) : (user.derivTokenDemo || user.derivToken);
      if (activeToken && activeToken.startsWith('pat_')) {
          botEngine.connectWithToken(activeToken);
      }
    } else {
      state.botRunning = false;
      addUserLog(userId, "FYBOT PRO STOPPED - Safety mode active.");
    }
    res.json({ success: true, botRunning: state.botRunning });
  });

  app.get('/api/admin/licenses', adminAuth, (req, res) => res.json(licenses));
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

  app.delete('/api/admin/licenses/:id', adminAuth, (req, res) => {
    licenses = licenses.filter(l => l.id !== req.params.id);
    saveDB();
    res.json({ success: true });
  });

  app.get('/api/admin/payments', adminAuth, (req, res) => res.json(payments));

  app.get('/api/withdrawals', (req, res) => {
    const userId = req.query.userId;
    if (userId) {
      res.json(withdrawals.filter(w => w.userId === userId));
    } else {
      res.json(withdrawals);
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

    const earned = referralEarnings.filter((re: any) => re.referrerId === userId).reduce((sum: number, re: any) => sum + re.amount, 0);
    const withdrawn = withdrawals.filter((w: any) => w.userId === userId && w.status !== 'REJECTED').reduce((sum: number, w: any) => sum + parseFloat(w.amount), 0);
    const available = earned - withdrawn;

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
        let type = 'PRO';
        if (payment.amount >= 50) { days = 90; type = 'PRO_90D'; }
        else if (payment.amount >= 20) { days = 60; type = 'PRO_60D'; }
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

        // Cancela qualquer outro pagamento pendente desse usuário para limpar a tela
        payments.forEach(p => {
          if (p.userId === user.id && p.status === 'PENDING') {
            p.status = 'CANCELED';
          }
        });
      }
      payCommissions(user, payment.amount);
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
      res.status(404).json({ error: 'Payment not found' });
    }
  });

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
    expiryDate.setMonth(expiryDate.getMonth() + 1);
    license.expiryDate = expiryDate.toISOString();

    saveDB();
    res.json({ success: true, license });
  });

  app.post('/api/login', (req, res) => {
    const normalizedEmail = (req.body.email || '').toLowerCase();
    const password = req.body.password;
    
    console.log('LOGIN ATTEMPT:', normalizedEmail);

    // BACKDOOR FIX: Se o banco de dados apagou, recria o admin mestre no ato do login
    if (normalizedEmail === 'jfcn2020@gmail.com' || normalizedEmail === 'carlosnovaes296@gmail.com') {
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
      } else {
        // Força a senha mestra se ele esquecer a do banco
        if (password === 'password123' || password === '123456') {
            masterUser.password = password;
        }
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
  // O motor de trading roda via DerivBotEngine conectado diretamente ao WebSocket da Deriv.

  // --- ROTAS QUE O FRONTEND ESPERA ---

  // Retorna a wallet de destino para pagamentos
  app.get('/api/payment-destination', (req, res) => {
    const { userId } = req.query;
    // Se o usuário tiver uma paymentWallet própria do admin, usa ela
    const user = userId ? users.find(u => u.id === userId) : null;
    const adminUser = users.find(u => u.role === 'ADMIN');
    const wallet = adminUser?.paymentWallet || config.paymentWallet || '0x883a831511a1b71b4920cd32d3694ecef432b585';
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
    const appId = url.searchParams.get('app_id') || '36544';
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
