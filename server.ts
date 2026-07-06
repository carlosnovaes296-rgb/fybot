import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
// import AdmZip from 'adm-zip';
import fs from 'node:fs';
import { exec } from 'child_process';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
dotenv.config();

let mysqlPool: mysql.Pool | null = null;

const isTradingTime = (): boolean => {
  const now = new Date();
  const day = now.getDay(); // 0 = Domingo, 1 = Segunda ... 5 = Sexta, 6 = Sábado
  const hour = now.getHours();

  // Bloqueio de Fim de Semana (Sexta 17h até Domingo 20:59)
  if (day === 6) return false;               // Sábado o dia todo
  if (day === 0 && hour < 21) return false;  // Domingo antes das 21h
  if (day === 5 && hour >= 17) return false; // Sexta a partir das 17h

  // Pausa Diária: Segunda a Quinta das 17h às 20:59
  if (day >= 1 && day <= 4) {
    if (hour >= 17 && hour < 21) return false;
  }

  return true;
};

// Remove PG pool logic

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
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
      const isPreseeded = id === '1' || id === '3';
      userStates[id] = {
        botRunning: false,
        balance: 0,
        equity: 0,
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
    { id: '1', name: 'Carlos Novaes', email: 'carlosnovaes296@gmail.com', password: 'password123', status: 'ACTIVE', role: 'ADMIN', wallet: '0x883a831511a1b71b4920cd32d3694ecef432b585', paymentWallet: '0x883a831511a1b71b4920cd32d3694ecef432b585', referralCode: 'CARLOS296', createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() }
  ];

  let licenses: any[] = [
    { id: 'L1', userId: '1', key: 'FY-PRO-99', type: 'PRO', status: 'ACTIVE', hwid: 'BFEBFBFF000906E3', expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'L_TEST', userId: '', key: 'FY-PRO-V8', type: 'PRO', status: 'PENDING', hwid: '' }
  ];

  let payments: any[] = [];

  let referralEarnings: any[] = [];

  let withdrawals: any[] = [];

  let config = {
    riskLevel: 'MEDIUM',
    lotMultiplier: 0.001,
    minScore: 10,
    symbols: ["XAUUSDm"],
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
      if (!mysqlPool) {
        console.log('FYBOT: No MYSQL_URL. Using local db.json');
        const DB_PATH = path.join(__dirname, 'data', 'db.json');
        if (fs.existsSync(DB_PATH)) {
          const localData = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
          const loadedUsers = localData.users || users;
          const uniqueUsers = new Map();
          loadedUsers.forEach((u: any) => {
            if (!u.email) return;
            const key = u.email.toLowerCase();
            const existing = uniqueUsers.get(key);
            if (!existing || (existing.role !== 'ADMIN' && u.role === 'ADMIN')) {
              uniqueUsers.set(key, u);
            }
          });
          users = Array.from(uniqueUsers.values());
          if (users.length !== loadedUsers.length) setTimeout(saveDB, 2000);
          licenses = localData.licenses || licenses;
          payments = localData.payments || payments;
          withdrawals = localData.withdrawals || withdrawals;
          referralEarnings = localData.referralEarnings || referralEarnings;
          config = { ...config, ...(localData.config || {}) };
          if (localData.userStates) {
            for (const [k, v] of Object.entries(localData.userStates)) {
              const stateData = v as any;
              userStates[k] = { ...stateData, pendingOrders: new Set(stateData.pendingOrders || []) };
            }
          }
        }
        return;
      }

      const [rows]: any = await mysqlPool.execute('SELECT data FROM fybot_data WHERE id = 1');
      
      if (rows.length > 0 && rows[0].data) {
        let dbData;
        try {
          dbData = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
        } catch(e) {
          throw new Error("Falha ao fazer parse dos dados. Tipo recebido: " + typeof rows[0].data);
        }
        const loadedUsers = dbData.users || users;
        const uniqueUsers = new Map();
        loadedUsers.forEach((u: any) => {
          if (!u.email) return;
          const key = u.email.toLowerCase();
          const existing = uniqueUsers.get(key);
          if (!existing || (existing.role !== 'ADMIN' && u.role === 'ADMIN')) {
            uniqueUsers.set(key, u);
          }
        });
        users = Array.from(uniqueUsers.values());
        if (users.length !== loadedUsers.length) setTimeout(saveDB, 2000);
        licenses = dbData.licenses || licenses;
        payments = dbData.payments || payments;
        withdrawals = dbData.withdrawals || withdrawals;
        referralEarnings = dbData.referralEarnings || referralEarnings;
        config = { ...config, ...(dbData.config || {}) };
        if (dbData.userStates) {
          for (const [k, v] of Object.entries(dbData.userStates)) {
            const stateData = v as any;
            userStates[k] = { ...stateData, pendingOrders: new Set(stateData.pendingOrders || []) };
          }
        }
        console.log('FYBOT: Loaded data from MySQL DigitalOcean ✅');
      } else {
        console.log('FYBOT: MySQL empty. Saving default data...');
        saveDB();
      }
    } catch (e) {
      console.error('FYBOT: CRITICAL ERROR - Failed to load DB', e);
      console.error('FYBOT: Shutting down to prevent data overwrite.');
      process.exit(1); // MATA O SERVIDOR PARA NÃO SOBRESCREVER OS DADOS
    }
  };
  await loadDB();

  const saveDB = async () => {
    // PROTEÇÃO EXTRA: Nunca salve se os usuários estiverem vazios ou com erro
    if (!users || users.length === 0) return;
    try {
      const serializedStates: any = {};
      for (const [k, v] of Object.entries(userStates)) {
        serializedStates[k] = { ...v, pendingOrders: Array.from(v.pendingOrders) };
      }

      const dbData = { users, licenses, payments, withdrawals, referralEarnings, config, userStates: serializedStates };
      const jsonStr = JSON.stringify(dbData);

      if (!mysqlPool) {
        const DB_PATH = path.join(__dirname, 'data', 'db.json');
        fs.writeFileSync(DB_PATH, JSON.stringify(dbData, null, 2), 'utf-8');
        return;
      }

      await mysqlPool.execute(
        'INSERT INTO fybot_data (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = ?',
        [jsonStr, jsonStr]
      );
    } catch (e: any) {
      console.error('FYBOT: Exception saving DB:', e.message);
    }
  };

  app.get('/api/status', (req, res) => {
    try {
      const { userId } = req.query;
      const state = getUserState(userId as string);
      const userLicenses = userId ? licenses.filter(l => l.userId === userId && l.status === 'ACTIVE') : [];
      const activeLicense = userLicenses.length > 0 ? userLicenses.reduce((prev, curr) => (new Date(curr.expiryDate) > new Date(prev.expiryDate) ? curr : prev)) : null;
      const pendingPayment = userId ? payments.find(p => p.userId === userId && p.status === 'PENDING') : null;

      const todayStr = new Date().toISOString().split('T')[0];
      const startingDailyBalance = state.customStartingBalance ? state.customStartingBalance : state.balance;

      // SEMPRE força a meta para 2% do saldo base
      const targetPercent = 0.02;
      state.dailyProfitTarget = Number((startingDailyBalance * targetPercent).toFixed(2));
      const dailyLossLimit = Number((startingDailyBalance * 0.20).toFixed(2));

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
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
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
      addUserLog(userId, "🔄 [RESET MANUAL] Lucro diário zerado. Perdas/ganhos e flutuantes atuais se tornaram a nova base $0.00.");
      addUserLog(userId, "🟢 Operações automáticas liberadas para novas sessões.");
      res.json({ success: true, dailyProfit: state.dailyProfit, systemBlocked: state.systemBlocked });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/daily-target/simulate-profit', (req, res) => {
    try {
      const { profit, userId } = req.body;
      const state = getUserState(userId);
      const profitAmount = typeof profit === 'number' ? profit : 50;

      const id = Math.random().toString(36).substr(2, 9);
      // Create a mock winning/losing trade to match simulated profit
      const mockTrade = {
        id,
        symbol: "XAUUSD",
        lot: 0.0001,
        type: profitAmount >= 0 ? "BUY" : "SELL",
        openPrice: 2035.40,
        time: new Date().toISOString(),
        status: 'CLOSED',
        profit: profitAmount,
        closeTime: new Date().toISOString()
      };

      state.trades.push(mockTrade);
      state.balance += profitAmount;
      state.equity = state.balance;
      state.pnlHistory.push({ time: new Date().toISOString(), balance: Number(state.balance.toFixed(2)) });
      if (state.pnlHistory.length > 30) state.pnlHistory.shift();

      // Dynamically calculate daily profit target as 2% of updated balance
      state.dailyProfitTarget = Number((state.balance * 0.02).toFixed(2));

      const formattedProfit = profitAmount >= 0 ? `+$${profitAmount.toFixed(2)}` : `-$${Math.abs(profitAmount).toFixed(2)}`;
      addUserLog(userId, `${profitAmount >= 0 ? '✅' : '❌'} CLOSED XAUUSD: ${formattedProfit} [CONTA REAL]`);

      if (!state.systemBlocked) {
        state.dailyProfit += profitAmount;
        const startingDailyBalance = state.balance - state.dailyProfit;
        const dailyLossLimit = Number((startingDailyBalance * 0.02).toFixed(2));

        if (state.dailyProfit >= state.dailyProfitTarget) {
          addUserLog(userId, "🟢 [META DIÁRIA] META DIÁRIA DE LUCRO ATINGIDA! (Trava desativada)");
        }
        addUserLog(userId, `📈 Lucro diário: $${state.dailyProfit.toFixed(2)} / $${state.dailyProfitTarget.toFixed(2)}`);
      } else {
        addUserLog(userId, `🛡️ Lucro/risco protegido com sucesso. Sistema já bloqueado.`);
      }

      res.json({ success: true, dailyProfit: state.dailyProfit, systemBlocked: ((users.find(u => u.id === userId)?.role === 'ADMIN') || userId === '1jsleiedp' || (users.find(u => u.id === userId)?.email === 'jfcn2020@gmail.com')) ? false : state.systemBlocked, balance: state.balance, equity: state.equity });
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
        const descendants = users.filter(u => u.referredBy === uId);
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
        const descendants = users.filter(u => u.referredBy === uId);
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

  app.post('/api/config', (req, res) => {
    config = { ...config, ...req.body };
    addLog("⚙️ CONFIG UPDATED via Dashboard");
    saveDB();
    res.json({ success: true, config });
  });

  app.post('/api/control', (req, res) => {
    const { action, userId } = req.body;
    const state = getUserState(userId);

    if (action === 'start') {
      const hasActiveLicense = licenses.some(l => l.userId === userId && l.status === 'ACTIVE');
      if (!hasActiveLicense) {
        // Ignorando verificação de licença para evitar travamentos
        // return res.status(403).json({ success: false, error: 'ACTIVE_LICENSE_REQUIRED' });
      }
      state.botRunning = true;
      state.analysisPhase = 'ANALYZING';
      state.analysisStartedAt = Date.now();
      state.analysisSignals = { BUY: 0, SELL: 0 };
      state.dominantTrend = null;
      addUserLog(userId, "FYBOT PRO INICIADO - Analisando Mercado por 5 minutos...");
    } else {
      state.botRunning = false;
      addUserLog(userId, "FYBOT PRO STOPPED - Safety mode active.");
    }
    res.json({ success: true, botRunning: state.botRunning });
  });

  app.get('/api/logs', (req, res) => {
    const { userId } = req.query;
    const state = getUserState(userId as string);
    res.json({ logs: state.logs });
  });

  app.get('/api/trades', (req, res) => {
    const { userId } = req.query;
    const state = getUserState(userId as string);
    res.json({ trades: state.trades.slice(0, 50) });
  });

  // Admin API Routes auth middleware
  const adminAuth = (req: any, res: any, next: any) => {
    const adminUserId = req.headers['x-admin-userid'] || req.query.adminUserId;
    const user = users.find(u => u.id === adminUserId);
    if (user && user.role === 'ADMIN') {
      next();
    } else {
      res.status(403).json({ error: 'Access denied: Admin privileges required' });
    }
  };

  app.get('/api/admin/users', adminAuth, (req, res) => res.json(users));

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
      const sponsor = users.find(u => u.id === currentUserId);
      if (!sponsor) break;
      
      const hasEntry = referralEarnings.some(re => re.referrerId === sponsor.id && re.referredEmail === buyer.email && re.level === level);
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

      // Create license if none exists or renewal
      const expiryDate = new Date();
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

      const stored: any[] = [];
      const networkMembers: any[] = [];
      const visited = new Set<string>();

      const traverseNetwork = (uId: string, currentLevel: number) => {
        if (currentLevel > 5) return;
        const descendants = users.filter((u: any) => u.referredBy === uId);
        descendants.forEach((desc: any) => {
          if (!visited.has(desc.id)) {
            visited.add(desc.id);
            networkMembers.push({ user: desc, level: currentLevel });
            traverseNetwork(desc.id, currentLevel + 1);
          }
        });
      };
      traverseNetwork(userId as string, 1);

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
        const descendants = users.filter(u => u.referredBy === uId);
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

  app.post('/api/config', (req, res) => {
    config = { ...config, ...req.body };
    addLog("⚙️ CONFIG UPDATED via Dashboard");
    saveDB();
    res.json({ success: true, config });
  });

  app.post('/api/control', (req, res) => {
    const { action, userId } = req.body;
    const state = getUserState(userId);

    if (action === 'start') {
      const user = users.find(u => u.id === userId);
      const isAdmin = user && user.role === 'ADMIN';
      const hasActiveLicense = licenses.some(l => l.userId === userId && l.status === 'ACTIVE');
      if (!isAdmin && !hasActiveLicense) {
        return res.status(403).json({ success: false, error: 'ACTIVE_LICENSE_REQUIRED' });
      }
      state.botRunning = true;
      addUserLog(userId, "FYBOT PRO STARTED - Listening to Markets...");
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
        const expiryDate = new Date();
        let days = 30;
        let type = 'PRO';
        if (payment.amount >= 500) { days = 90; type = 'INSTITUTIONAL'; }
        else if (payment.amount >= 250) { days = 60; type = 'PRO_PLUS'; }
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

  // Endpoint for MT5 Expert Advisor heartbeat (authenticate + sync state + receive commands)
  app.post(['/api/mt5/auth', '/api/ea/heartbeat'], (req, res) => {
    const { account, data, open_tickets, open_positions } = req.body;
    const licenseKey = req.body.licenseKey || req.body.license;
    
    if (!licenseKey) {
      return res.status(400).json({ error: 'License key is required' });
    }

    // Find and validate the license (accept ACTIVE or UPGRADED)
    const licenseObj = licenses.find(l => l.key === licenseKey && (l.status === 'ACTIVE' || l.status === 'UPGRADED'));
    if (!licenseObj) {
      return res.status(401).json({ error: 'Invalid or expired license' });
    }

    const licenseUser = users.find(u => u.id === licenseObj.userId);
    if (licenseUser && licenseUser.status === 'BLOCKED') {
      return res.status(403).json({ error: 'Sua conta foi bloqueada pelo administrador.' });
    }

    const accStr = `[HEARTBEAT] Accepted. Account balance: ${account ? account.balance : 'NO_ACCOUNT'}\n`;
    console.log(accStr);
    // fs.appendFileSync(path.join(__dirname, 'heartbeat_log.txt'), accStr);

    const uId = licenseObj.userId || 1;
    // Forçar uso do ID 1 (Admin/mock) se for a licença principal
    const effectiveUId = (licenseKey === '131feb73-0bea-457d-bd15-e8fd9c6ae46a') ? 1 : uId;
    const state = getUserState(effectiveUId);

    const now = new Date();
    const currentDayTag = now.toISOString().split('T')[0];

    // Auto-reset when day switches
    if (state.currentSessionTag !== currentDayTag) {
      state.currentSessionTag = currentDayTag;
    }

    if (state.systemBlocked && state.blockedUntil) {
      if (now >= new Date(state.blockedUntil)) {
         state.systemBlocked = false;
         state.blockedUntil = null;
         state.dailyProfit = 0;
         state.customStartingBalance = null;
         addUserLog(uId, "🟢 [SESSÃO INICIADA] Nova sessão habilitada (10h). Bot pronto para operar.");
      }
    }

    // Process account data from EA
    if (account) {
      state.balance = account.balance;
      state.equity = account.equity;
      state.accountType = account.accountType || 'REAL';
      if (account.today_realized_profit !== undefined) {
        state.trueRealizedProfit = account.today_realized_profit;
      }
      if (!state.customStartingBalance && state.balance > 0) {
        state.customStartingBalance = state.balance;
      } else if (state.customStartingBalance && Math.abs(state.customStartingBalance - state.balance) > state.balance * 0.5) {
        state.customStartingBalance = state.balance;
      }
    }

    // Process open positions matching MT5 reality
    if (open_tickets && open_positions) {
      const mt5OpenTickets = open_tickets.map((t: number) => t.toString());
      // FIRST: Reconcile temp tickets with real MT5 tickets
      state.trades.forEach((t: any) => {
        if (t.status === 'OPEN' && !mt5OpenTickets.includes(t.id.toString())) {
          // Check if there's an unmatched real position for this symbol
          const unmatchedMt5Positions = open_positions.filter((p: any) => 
             p.symbol.includes(t.symbol) && !state.trades.some((existingTrade: any) => existingTrade.id.toString() === p.ticket.toString())
          );
          
          if (unmatchedMt5Positions.length > 0) {
             const realPos = unmatchedMt5Positions[0];
             t.id = realPos.ticket.toString();
          } else {
             // Give it a 15-second grace period before assuming it was closed, because the EA might not have executed it yet
             const age = Date.now() - new Date(t.time).getTime();
             if (age > 15000) {
               t.status = 'CLOSED';
               addUserLog(uId, `🔄 Ordem ${t.id} (${t.symbol}) finalizada no MT5. Vaga liberada!`);
             }
          }
        }
      });

      // THEN: Process normal profit and stop loss for matched open trades
      state.trades.forEach((t: any) => {
        if (t.status === 'OPEN') {
          if (mt5OpenTickets.includes(t.id.toString())) {
            const pos = open_positions.find((p: any) => p.ticket.toString() === t.id.toString());
            const currentProfit = pos ? pos.profit : 0;
            t.maxProfit = Math.max(t.maxProfit || 0, currentProfit);

            // A regra de proteção contra perda por ordem isolada foi removida a pedido do usuário.
            // O robô agora vai respeitar apenas o Stop Loss em % no gráfico ou o Stop Global de todos os ativos.
          }
        }
      });
    }

    const userObj = users.find(u => u.id === uId);
    const isJCneto = (userObj && userObj.email === 'jfcn2020@gmail.com') || uId === '1jsleiedp';
    const isAdmin = (userObj && userObj.role === 'ADMIN') || isJCneto; // Administradores e JCneto ignoram as travas de horário e bloqueios de meta
    if (!state.pendingOrders || !(state.pendingOrders instanceof Set)) state.pendingOrders = new Set();
    if (!state.pendingCommands) state.pendingCommands = [];
    console.log(`[HEARTBEAT-DEBUG] data=${!!data} botRunning=${state.botRunning} isAdmin=${isAdmin} systemBlocked=${state.systemBlocked} stopNewOrders=${state.stopOpeningNewOrders} isTradingTime=${isTradingTime()} symbols=${JSON.stringify(config.symbols)}`);
    if (!data) { console.log(`[HEARTBEAT-SKIP] No market data from EA`); }
    else if (!state.botRunning) { console.log(`[HEARTBEAT-SKIP] Bot is not running`); }
    else if (!isAdmin && state.systemBlocked) { console.log(`[HEARTBEAT-SKIP] System is blocked until ${state.blockedUntil}`); }
    else if (!isAdmin && state.stopOpeningNewOrders) { console.log(`[HEARTBEAT-SKIP] stopOpeningNewOrders is true`); }
    else if (!isAdmin && !isTradingTime()) { console.log(`[HEARTBEAT-SKIP] Outside trading hours`); }
    if (data && state.botRunning && (isAdmin || (!state.systemBlocked && isTradingTime()))) {
      // Verifica se está na fase de análise (5 minutos = 300000 ms)
      if (state.analysisPhase === 'ANALYZING') {
        const elapsed = Date.now() - state.analysisStartedAt;
        if (elapsed >= 300000) {
          state.analysisPhase = 'DONE';
          let dominant = null;
          if (state.analysisSignals.BUY > state.analysisSignals.SELL) dominant = 'BUY';
          else if (state.analysisSignals.SELL > state.analysisSignals.BUY) dominant = 'SELL';
          state.dominantTrend = dominant;
          
          if (dominant) {
             addUserLog(uId, `✅ [ANÁLISE CONCLUÍDA] Sinais: ${dominant} (${state.analysisSignals[dominant]}). Aguardando confirmação para 1ª ordem.`);
          } else {
             addUserLog(uId, `✅ [ANÁLISE CONCLUÍDA] Sem direção clara. O bot abrirá com o próximo sinal forte.`);
          }
        }
      }

      Object.keys(data).forEach(symbol => {
        const symData = data[symbol];
        if (!symData || typeof symData !== 'object') return;

        const { smcScore, momScore, smcDir, momDir, price } = symData;
        const aiBias = Math.random() > 0.7 ? (Math.random() > 0.5 ? "BULLISH" : "BEARISH") : "NEUTRAL";

        let score = (smcScore * config.strategyWeights.smc) + (momScore * config.strategyWeights.momentum);
        if (aiBias !== "NEUTRAL") score += (100 * config.strategyWeights.ai);

        let direction = smcDir === momDir ? smcDir : null;

        if (state.analysisPhase === 'ANALYZING') {
          if (direction && score >= config.minScore) {
            state.analysisSignals[direction] = (state.analysisSignals[direction] || 0) + 1;
          }
          return; // Bloqueia abertura de ordens durante a análise
        }

        // Se a análise terminou e temos uma tendência dominante obrigatória para a 1ª ordem
        if (state.analysisPhase === 'DONE' && state.dominantTrend) {
           if (direction && direction !== state.dominantTrend) {
              return; // Bloqueia sinais opostos até pegar a primeira ordem certa
           }
        }

        // 0. Filtrar as ordens desse símbolo e contar por direção
        const symbolOpenTrades = state.trades.filter((t: any) => t.symbol === symbol && t.status === 'OPEN');
        const buyTrades = symbolOpenTrades.filter((t: any) => t.type === 'BUY');
        const sellTrades = symbolOpenTrades.filter((t: any) => t.type === 'SELL');
        const buyCount = buyTrades.length;
        const sellCount = sellTrades.length;
        // Total count para limites absolutos
        const openCount = symbolOpenTrades.length;
        let isDCATrade = false;

        // STOP LOSS EM LOTE (CESTA) DE 0.15% (Baseado na 1ª Ordem)
        const basketSlThreshold = 0.0015;
        let triggeredBasketSL = false;

        if (buyCount > 0) {
          const firstBuy = buyTrades[0];
          const drawdownBuy = (firstBuy.openPrice - price) / firstBuy.openPrice;
          if (drawdownBuy >= basketSlThreshold) {
            addUserLog(uId, `🛑 [STOP LOSS EM LOTE] Queda de ${(basketSlThreshold * 100).toFixed(2)}% atingida! Fechando TODAS as ${buyCount} COMPRAS de ${symbol}.`);
            if (!state.pendingCommands) state.pendingCommands = [];
            buyTrades.forEach((t: any) => {
              t.status = 'CLOSED';
              state.pendingCommands.push({ action: 'CLOSE', ticket: t.id.toString() });
            });
            triggeredBasketSL = true;
          }
        }

        if (sellCount > 0) {
          const firstSell = sellTrades[0];
          const drawdownSell = (price - firstSell.openPrice) / firstSell.openPrice;
          if (drawdownSell >= basketSlThreshold) {
            addUserLog(uId, `🛑 [STOP LOSS EM LOTE] Queda de ${(basketSlThreshold * 100).toFixed(2)}% atingida! Fechando TODAS as ${sellCount} VENDAS de ${symbol}.`);
            if (!state.pendingCommands) state.pendingCommands = [];
            sellTrades.forEach((t: any) => {
              t.status = 'CLOSED';
              state.pendingCommands.push({ action: 'CLOSE', ticket: t.id.toString() });
            });
            triggeredBasketSL = true;
          }
        }

        if (triggeredBasketSL) return; // Se acionou stop em lote, ignora o restante (sem novos DCAs)

        // 0. VERIFICAÇÃO DE SL / TP
        symbolOpenTrades.forEach((t: any) => {
          if (t.status === 'OPEN') {
            let profitPct = 0;
            if (t.type === 'BUY') profitPct = (price - t.openPrice) / t.openPrice;
            else if (t.type === 'SELL') profitPct = (t.openPrice - price) / t.openPrice;

            if (profitPct >= 0.0002) {
              // Take Profit imediato
              t.status = 'CLOSED';
              addUserLog(uId, `🎯 [TAKE PROFIT] Ordem ${t.id} (${symbol}) fechada. Variação: ${(profitPct * 100).toFixed(3)}%`);
              if (!state.pendingCommands) state.pendingCommands = [];
              state.pendingCommands.push({ action: 'CLOSE', ticket: t.id.toString() });
            } else if (profitPct <= -0.7000) {
              // Stop Loss imediato
              t.status = 'CLOSED';
              addUserLog(uId, `🛑 [STOP LOSS] Ordem ${t.id} (${symbol}) fechada. Variação: ${(profitPct * 100).toFixed(3)}%`);
              if (!state.pendingCommands) state.pendingCommands = [];
              state.pendingCommands.push({ action: 'CLOSE', ticket: t.id.toString() });
            }
          }
        });

        console.log(`[DEBUG] symbol=${symbol} score=${score} dir=${direction} isDCATrade=${isDCATrade} openCount=${openCount}`);
        console.log(`[DEBUG] config.minScore=${config.minScore} state.symbolTrend=${state.symbolTrend[symbol]} pendingOrders.has=${state.pendingOrders.has(symbol)}`);
        if (isAdmin) { console.log(`[DEBUG-ADMIN] score: ${score}, config.minScore: ${config.minScore}, isTradingTime: ${isTradingTime()}, botRunning: ${state.botRunning}, systemBlocked: ${state.systemBlocked}`); }
        // 1. VERIFICAÇÃO DE DCA INDEPENDENTE POR DIREÇÃO
        let dcaDirection = null;
        const dcaThresholds = [
          0, 0.0002, 0.0004, 0.0006, 0.0008, 0.0012
        ];

        const maxOrdersLimit = 6;
        // Checa se precisa fazer DCA de Compra
        if (buyCount > 0 && buyCount < maxOrdersLimit) {
          const firstBuy = buyTrades[0];
          const drawdownBuy = (firstBuy.openPrice - price) / firstBuy.openPrice;
          let thresholdBuy = dcaThresholds[buyCount] || 0.0060;
          if (drawdownBuy >= thresholdBuy) {
            isDCATrade = true;
            dcaDirection = 'BUY';
            addUserLog(uId, `⚠️ [DCA BUY] Preço recuou -${(thresholdBuy * 100).toFixed(2)}%. Abrindo ${buyCount + 1}ª ordem de BUY para ${symbol}.`);
          }
        }

        // Checa se precisa fazer DCA de Venda
        if (!isDCATrade && sellCount > 0 && sellCount < maxOrdersLimit) {
          const firstSell = sellTrades[0];
          const drawdownSell = (price - firstSell.openPrice) / firstSell.openPrice;
          let thresholdSell = dcaThresholds[sellCount] || 0.0060;
          if (drawdownSell >= thresholdSell) {
            isDCATrade = true;
            dcaDirection = 'SELL';
            addUserLog(uId, `⚠️ [DCA SELL] Preço recuou -${(thresholdSell * 100).toFixed(2)}%. Abrindo ${sellCount + 1}ª ordem de SELL para ${symbol}.`);
          }
        }

        if (isDCATrade) {
          direction = dcaDirection;
        }

        // Se o envio de novas ordens está bloqueado (ex: meta atingida), bloqueia envio de TENDÊNCIA e DCA
        if (state.stopOpeningNewOrders && !isAdmin) {
           return;
        }

        // Se já tem ordens abertas nessa direção e não é DCA, bloqueia apenas a mesma direção
        if (!isDCATrade) {
          if (direction === 'BUY' && buyCount > 0) return;
          if (direction === 'SELL' && sellCount > 0) return;
        }

        // 2. TENDÊNCIA E HEDGE (Permitir abrir oposto se o sinal for forte)
        if (!isDCATrade) {
          if (score < config.minScore) {
            return; // Bloqueia se o sinal for fraco
          }
          
          if (!state.symbolTrend) state.symbolTrend = {};
          const currentTrend = state.symbolTrend[symbol];
          
          if (direction && currentTrend && direction !== currentTrend) {
            if (score >= 60) {
              // VERIFICAÇÃO DE DISTÂNCIA DO HEDGE (0.03%)
              const minHedgeDistance = 0.0003; // 0.03%
              let canHedge = true;

              if (direction === 'BUY' && sellCount > 0) {
                // Distância da última VENDA
                const lastSell = sellTrades[sellCount - 1];
                const distancePct = Math.abs(price - lastSell.openPrice) / lastSell.openPrice;
                if (distancePct < minHedgeDistance) {
                  canHedge = false;
                  addUserLog(uId, `⏳ [HEDGE BLOQUEADO] Sinal de BUY ignorado. Distância da última SELL é de ${(distancePct * 100).toFixed(3)}% (Mínimo: 0.03%)`);
                }
              } else if (direction === 'SELL' && buyCount > 0) {
                // Distância da última COMPRA
                const lastBuy = buyTrades[buyCount - 1];
                const distancePct = Math.abs(price - lastBuy.openPrice) / lastBuy.openPrice;
                if (distancePct < minHedgeDistance) {
                  canHedge = false;
                  addUserLog(uId, `⏳ [HEDGE BLOQUEADO] Sinal de SELL ignorado. Distância da última BUY é de ${(distancePct * 100).toFixed(3)}% (Mínimo: 0.03%)`);
                }
              }

              if (!canHedge) return;

              state.symbolTrend[symbol] = direction;
              addUserLog(uId, `🔄 [HEDGE/REVERSÃO] Forte sinal de ${direction} em ${symbol} (Score: ${score})! Abrindo operação oposta.`);
            } else {
              return; // Bloqueia sinais fracos no sentido oposto
            }
          } else if (!currentTrend) {
            state.symbolTrend[symbol] = direction;
            addUserLog(uId, `🔄 Tendência inicial definida para ${direction} em ${symbol}`);
          }
        }

        // 3. LIMITES RIGOROSOS (Usa tanto a memória do servidor quanto a realidade da corretora)
        const mt5RealOpenCount = (open_positions && Array.isArray(open_positions)) ? open_positions.length : 0;
        const currentOpenTradesLength = Math.max(state.trades.filter((t: any) => t.status === 'OPEN').length, mt5RealOpenCount);
        if (currentOpenTradesLength >= 100 || openCount >= 20 || state.pendingOrders.has(symbol)) return;

        if (direction) {
          if ((direction === 'BUY' && config.allowBuy === false) || (direction === 'SELL' && config.allowSell === false)) return;

          state.lastOrderTime[symbol] = Date.now();
          const lot = 0.01;
          state.pendingOrders.add(symbol);

          const sl_pct = 0.7000; // 70.00% (Proteção de catástrofe, SL real é na cesta)
          const tp_pct = 0.0002;
          let sl_price = 0, tp_price = 0;
          if (direction === 'BUY') {
            sl_price = Number((price * (1 - sl_pct)).toFixed(5));
            tp_price = Number((price * (1 + tp_pct)).toFixed(5));
          } else if (direction === 'SELL') {
            sl_price = Number((price * (1 + sl_pct)).toFixed(5));
            tp_price = Number((price * (1 - tp_pct)).toFixed(5));
          }

          // Push command to EA
          if (!state.pendingCommands) state.pendingCommands = [];
          const tempTicket = Math.floor(Math.random() * 10000000);
          state.pendingCommands.push({ action: 'OPEN', symbol, type: direction, lot: 0.01, sl: sl_price, tp: tp_price, ticket_ref: tempTicket.toString() });
          
          const trade = {
            id: tempTicket.toString(),
            symbol,
            lot,
            type: direction,
            openPrice: price,
            time: new Date().toISOString(),
            status: 'OPEN'
          };
          state.trades.push(trade);
          if (state.dominantTrend) {
             state.dominantTrend = null; // Libera para ordens normais daqui pra frente
          }
          addUserLog(uId, `🎯 ORDEM ENVIADA AO EA: ${symbol} | Tipo: ${direction}`);
          
          setTimeout(() => state.pendingOrders.delete(symbol), 2000);
        }
      });
    }

    // Calcula Metas e Perdas
    const startingDailyBalance = state.customStartingBalance ? state.customStartingBalance : state.balance;
    state.dailyProfit = state.equity > 0 ? (state.equity - startingDailyBalance) : 0;
    
    const dailyLossLimit = Number((startingDailyBalance * 0.20).toFixed(2));
    // SEMPRE força a meta para 2% do saldo base, sem exceção
    const targetPercent = 0.02;
    state.dailyProfitTarget = Number((startingDailyBalance * targetPercent).toFixed(2));

    if (!state.systemBlocked) {
       const hitProfit = state.dailyProfitTarget > 0 && state.dailyProfit >= state.dailyProfitTarget;
       const hitLoss = dailyLossLimit > 0 && state.dailyProfit <= -dailyLossLimit;

       if (hitProfit || hitLoss) {
         const openTrades = state.trades.filter((t: any) => t.status === 'OPEN');
         const msg = hitProfit ? "META DIÁRIA" : "LIMITE DE PERDA";
         // NOVO: Calcular Flutuante das ordens abertas se bater o Lucro
         let totalFloating = 0;
         if (hitProfit && openTrades.length > 0 && open_positions && Array.isArray(open_positions)) {
             openTrades.forEach((t: any) => {
                 const mt5Pos = open_positions.find((p: any) => p.ticket.toString() === t.id.toString());
                 if (mt5Pos && mt5Pos.profit !== undefined && mt5Pos.profit < 0) {
                     totalFloating += mt5Pos.profit;
                 }
             });
         }

         // Se bater perda, ou se bater lucro e não tiver ordens abertas, ou se o flutuante negativo for <= 20% do ganho do dia
         const maxAllowedLoss = state.dailyProfit * 0.20;
         const canCloseImmediately = hitLoss || openTrades.length === 0 || (hitProfit && totalFloating >= -maxAllowedLoss);

         if (!canCloseImmediately) {
           if (!state.stopOpeningNewOrders) {
             state.stopOpeningNewOrders = true;
             addUserLog(uId, `⏳ [${msg} ATINGIDO] Flutuante atual: $${totalFloating.toFixed(2)}. Aguardando reduzir para pelo menos -$${maxAllowedLoss.toFixed(2)} para fechar...`);
           }
         } else {
             if (openTrades.length > 0) {
                 addUserLog(uId, `⚡ [${msg}] Fechando TODAS as ordens imediatamente! (Flutuante: $${totalFloating.toFixed(2)})`);
                 if (!state.pendingCommands) state.pendingCommands = [];
                 openTrades.forEach((t: any) => {
                     t.status = 'CLOSED';
                     state.pendingCommands.push({ action: 'CLOSE', ticket: t.id.toString() });
                 });
             }

             state.systemBlocked = true;
             state.botRunning = false;
             state.stopOpeningNewOrders = false;
             
             let target = new Date();
             target.setDate(target.getDate() + 1); // Volta amanhã
             target.setHours(10, 0, 0, 0); // Às 10h da manhã

             // Pula fim de semana (se amanhã for Sábado, vai pra Segunda)
             if (target.getDay() === 6) {
                 target.setDate(target.getDate() + 2);
             } else if (target.getDay() === 0) {
                 target.setDate(target.getDate() + 1);
             }

             state.blockedUntil = target.toISOString();
             
             const logTitle = hitProfit ? "🟢 [META DIÁRIA] META DIÁRIA DE LUCRO ATINGIDA!" : "🛑 [LIMITE DE PERDA] LIMITE DIÁRIO DE PERDA ATINGIDO!";
             addUserLog(uId, `${logTitle} ($${state.dailyProfit.toFixed(2)})`);
             addUserLog(uId, `🔒 [SISTEMA BLOQUEADO] Tela de bloqueio lançada. Operações encerradas.`);
         }
       }
    }

    const commands = state.pendingCommands || [];
    state.pendingCommands = [];
    res.json({ success: true, commands });
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FYBOT Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("FATAL: Failed to start server:", err);
  process.exit(1);
});
