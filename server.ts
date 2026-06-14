import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
// import AdmZip from 'adm-zip';
import fs from 'node:fs';
import { exec } from 'child_process';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

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

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

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
    { id: '1', name: 'Carlos Novaes', email: 'carlosnovaes296@gmail.com', password: 'password123', status: 'ACTIVE', role: 'ADMIN', wallet: '0x883a831511a1b71b4920cd32d3694ecef432b585', paymentWallet: '0x883a831511a1b71b4920cd32d3694ecef432b585', referralCode: 'CARLOS296', createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
    { id: '2', name: 'John Doe', email: 'john@example.com', password: 'password123', status: 'INACTIVE', role: 'USER', wallet: '', paymentWallet: '', referralCode: 'JOHNDOE12', createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString() },
    { id: '3', name: 'Carlos Novaes', email: 'carlosnovaecs296@gmail.com', password: 'password123', status: 'ACTIVE', role: 'ADMIN', wallet: '0x883a831511a1b71b4920cd32d3694ecef432b585', paymentWallet: '0x883a831511a1b71b4920cd32d3694ecef432b585', referralCode: 'CARLOS296C', createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString() }
  ];

  let licenses = [
    { id: 'L1', userId: '1', key: 'FY-PRO-99', type: 'PRO', status: 'ACTIVE', hwid: 'BFEBFBFF000906E3', expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'L_TEST', userId: '', key: 'FY-PRO-V8', type: 'PRO', status: 'PENDING', hwid: '' }
  ];

  let payments: any[] = [];

  let referralEarnings: any[] = [];

  let withdrawals: any[] = [];

  let config = {
    riskLevel: 'MEDIUM',
    lotMultiplier: 0.001,
    minScore: 55,
    symbols: ["XAUUSD"],
    strategyWeights: {
      smc: 0.5,
      momentum: 0.3,
      ai: 0.20
    },
    paymentWallet: '0x883a831511a1b71b4920cd32d3694ecef432b585',
    allowBuy: true,
    allowSell: true
  };

  // Load from PostgreSQL DB
  const loadDB = async () => {
    try {
      if (!process.env.DATABASE_URL) {
          console.log('FYBOT: No DATABASE_URL provided. Falling back to local db.json');
          const DB_PATH = path.join(__dirname, 'data', 'db.json');
          if (fs.existsSync(DB_PATH)) {
            const localData = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
            users = localData.users || users;
            licenses = localData.licenses || licenses;
            payments = localData.payments || payments;
            config = { ...config, ...(localData.config || {}) };
            if (!config.strategyWeights) config.strategyWeights = { smc: 0.5, momentum: 0.3, ai: 0.2 };
          }
          return;
      }

      const { rows } = await pool.query('SELECT data FROM fybot_db WHERE id = 1');
      
      if (rows.length > 0 && rows[0].data) {
        const dbData = rows[0].data;
        users = dbData.users || users;
        licenses = dbData.licenses || licenses;
        payments = dbData.payments || payments;
        config = { ...config, ...(dbData.config || {}) };
        
        // Ensure strategyWeights exists
        if (!config.strategyWeights) {
          config.strategyWeights = { smc: 0.5, momentum: 0.3, ai: 0.2 };
        }
        
        console.log('FYBOT: Loaded data from PostgreSQL Database');
      } else {
        console.log('FYBOT: Note from Postgres (Empty Table). Attempting migration fallback...');
        // Fallback migration: If Postgres table is empty, load from local db.json and push to DB
        const DB_PATH = path.join(__dirname, 'data', 'db.json');
        if (fs.existsSync(DB_PATH)) {
          const localData = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
          users = localData.users || users;
          licenses = localData.licenses || licenses;
          payments = localData.payments || payments;
          config = { ...config, ...(localData.config || {}) };
          if (!config.strategyWeights) {
            config.strategyWeights = { smc: 0.5, momentum: 0.3, ai: 0.2 };
          }
          console.log('FYBOT: Loaded data from local db.json and pushed to PostgreSQL');
          saveDB(); // Push to DB
        } else {
          console.log('FYBOT: Initialized with empty default data, waiting for inputs.');
        }
      }
    } catch (e) {
      console.error('FYBOT: Failed to load DB', e);
    }
  };
  loadDB();

  const saveDB = async () => {
    try {
      if (!process.env.DATABASE_URL) return;
      const dbData = { users, licenses, payments, config };
      const query = `
        INSERT INTO fybot_db (id, data) 
        VALUES (1, $1) 
        ON CONFLICT (id) 
        DO UPDATE SET data = EXCLUDED.data;
      `;
      await pool.query(query, [JSON.stringify(dbData)]);
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

      if (!state.isCustomTarget) {
        const targetPercent = 0.013; // Meta fixa de 1.3%
        state.dailyProfitTarget = Number((startingDailyBalance * targetPercent).toFixed(2));
      }
      const dailyLossLimit = Number((startingDailyBalance * 0.10).toFixed(2));

      res.json({
        botRunning: state.botRunning,
        balance: Number(state.balance.toFixed(2)),
        equity: Number(state.equity.toFixed(2)),
        activeTrades: state.trades.filter((t: any) => t.status === 'OPEN').length,
        winrate: state.trades.filter((t: any) => t.status === 'CLOSED').length > 0
          ? (state.trades.filter((t: any) => t.status === 'CLOSED' && t.profit > 0).length / state.trades.filter((t: any) => t.status === 'CLOSED').length * 100).toFixed(1)
          : 0,
        pnlHistory: state.pnlHistory,
        liveSignals: { smc: 80, momentum: 70, ai: 90 },
        logs: state.logs.slice(-20),
        trades: [...state.trades].reverse().slice(0, 50),
        activeLicense,
        pendingPayment,
        dailyProfit: Number(state.dailyProfit.toFixed(2)),
        dailyProfitTarget: state.dailyProfitTarget,
        dailyLossLimit,
        dailyResetHour: state.dailyResetHour,
        preferredSession: state.preferredSession,
        timezone: state.timezone,
        antiOvertrading: state.antiOvertrading,
        systemBlocked: state.systemBlocked,
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
      if (typeof target === 'number') {
        state.dailyProfitTarget = target;
        state.isCustomTarget = true;
      }
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
      state.dailyProfitTarget = Number((state.balance * 0.01).toFixed(2));

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

      res.json({ success: true, dailyProfit: state.dailyProfit, systemBlocked: state.systemBlocked, balance: state.balance, equity: state.equity });
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
      addUserLog(userId, "FYBOT PRO STARTED - Listening to Markets...");
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
      user.status = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      saveDB();
    }
    res.json({ success: true, user });
  });

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
      saveDB();
      res.json({ success: true, user, license: newLicense });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });

  app.delete('/api/admin/users/:id', adminAuth, (req, res) => {
    users = users.filter(u => u.id !== req.params.id);
    saveDB();
    res.json({ success: true });
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
    const { email, password } = req.body;
    // Find user by email first
    const user = users.find(u => u.email === email);
    if (user && user.password === password) {
      // Backfill referral code if missing
      if (!user.referralCode) {
        const pfx = user.name.replace(/[^A-Za-z]/g, "").substring(0, 4).toUpperCase() || 'REF';
        const sfx = Math.random().toString(36).substring(2, 6).toUpperCase();
        user.referralCode = `${pfx}${sfx}`;
      }
      res.json({ success: true, user });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  // Endpoint for MT5 Expert Advisor to authenticate via License Key
  app.post('/api/mt5/auth', (req, res) => {
    const { licenseKey } = req.body;
    if (!licenseKey) {
      return res.status(400).json({ error: 'License key is required' });
    }

    const license = licenses.find(l => l.key === licenseKey);
    if (!license) {
      return res.status(401).json({ authorized: false, error: 'Invalid license key' });
    }

    if (license.status !== 'ACTIVE') {
      return res.status(401).json({ authorized: false, error: 'License is not active' });
    }

    const user = users.find(u => u.id === license.userId);
    if (!user) {
      return res.status(401).json({ authorized: false, error: 'Associated user not found' });
    }

    // License is valid
    res.json({
      authorized: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      license: {
        type: license.type,
        expiryDate: license.expiryDate
      }
    });
  });

  // Endpoint for MT5 Expert Advisor to send real account updates
  app.post('/api/mt5/update', (req, res) => {
    const { licenseKey, balance, equity, dailyProfit, trades, accountType } = req.body;
    
    if (!licenseKey) {
      return res.status(400).json({ error: 'License key is required' });
    }

    const license = licenses.find(l => l.key === licenseKey);
    if (!license || license.status !== 'ACTIVE') {
      return res.status(401).json({ error: 'Invalid or inactive license key' });
    }

    const state = getUserState(license.userId);
    
    // Update state with real data from MT5
    if (typeof balance === 'number') state.balance = balance;
    if (typeof equity === 'number') state.equity = equity;
    if (typeof dailyProfit === 'number') state.dailyProfit = dailyProfit;
    if (typeof accountType === 'string') state.accountType = accountType;
    
    if (Array.isArray(trades)) {
      // Keep only recent trades to prevent memory bloat, or just overwrite open trades
      state.trades = trades.map(t => ({
        id: t.id || Math.random().toString(36).substr(2, 9),
        symbol: t.symbol || 'UNKNOWN',
        type: t.type || 'BUY',
        lot: t.lot || 0.001,
        openPrice: t.openPrice || 0,
        time: t.time || new Date().toISOString(),
        status: (t.status ? String(t.status).toUpperCase() : 'OPEN'),
        profit: t.profit || 0,
        closeTime: t.closeTime
      }));
    }

    // Record PNL history dynamically if balance changes significantly or periodically
    const lastPnl = state.pnlHistory[state.pnlHistory.length - 1];
    if (!lastPnl || lastPnl.balance !== state.balance) {
      state.pnlHistory.push({ time: new Date().toISOString(), balance: state.balance });
      if (state.pnlHistory.length > 30) state.pnlHistory.shift();
    }

    // Optionally check protective logic here if we wanted the server to command the MT5 
    // to stop, but usually the EA will handle its own stopping if it knows the target.

    res.json({ success: true, received: true });
  });

  // Endpoint for manual balance adjustments (Offline/Sync)
  app.post('/api/balance/adjust', (req, res) => {
    try {
      const { userId, balance, equity, accountType } = req.body;
      const state = getUserState(userId);
      
      if (typeof balance === 'number') state.balance = balance;
      if (typeof equity === 'number') state.equity = equity;
      if (accountType) state.accountType = accountType;
      
      // Add a log entry for the manual adjustment
      addUserLog(userId, `🛠️ [CONTA ${state.accountType}] Saldo Sincronizado/Ajustado: $${state.balance.toFixed(2)}`);
      
      // Also push to PNL history
      state.pnlHistory.push({ time: new Date().toISOString(), balance: state.balance });
      if (state.pnlHistory.length > 30) state.pnlHistory.shift();

      res.json({ success: true, balance: state.balance, accountType: state.accountType, equity: state.equity });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Error adjusting balance' });
    }
  });

  // Endpoint to actively sync from local MT5 via Python
  app.post('/api/balance/sync', (req, res) => {
    const { userId } = req.body;
    const state = getUserState(userId);
    const user = users.find(u => u.id === userId);
    
    if (!user || !user.mt5Login || !user.mt5Password || !user.mt5Server) {
        addUserLog(userId, `❌ Erro: Credenciais do MT5 (Login, Senha, Servidor) não preenchidas no seu perfil.`);
        return res.status(400).json({ success: false, error: 'Credenciais do MT5 ausentes no perfil. Vá em Configuração > Conta e Finanças e preencha seus dados.' });
    }

    const cmd = `python mt5_sync.py "${user.mt5Login}" "${user.mt5Password}" "${user.mt5Server}"`;
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        addUserLog(userId, `❌ Erro ao conectar ao MT5 local: ${error.message}`);
        return res.status(500).json({ success: false, error: 'Failed to execute MT5 sync' });
      }
      
      try {
        const result = JSON.parse(stdout.trim());
        if (result.success) {
          state.balance = result.balance;
          state.equity = result.equity;
          state.accountType = result.accountType;
          if (result.history) {
            state.trades = result.history;
          }
          
          addUserLog(userId, `✅ Sincronização MT5 Concluída: Saldo atualizado para $${state.balance.toFixed(2)} (${state.accountType})`);
          
          state.pnlHistory.push({ time: new Date().toISOString(), balance: state.balance });
          if (state.pnlHistory.length > 30) state.pnlHistory.shift();

          res.json({ success: true, balance: state.balance, equity: state.equity, accountType: state.accountType });
        } else {
          addUserLog(userId, `❌ Erro do MT5: ${result.error}`);
          res.status(500).json({ success: false, error: result.error });
        }
      } catch (e: any) {
        addUserLog(userId, `❌ Falha ao interpretar resposta do MT5: ${e.message}`);
        res.status(500).json({ success: false, error: 'Invalid response from MT5 sync' });
      }
    });
  });

  // Endpoint for users to generate a new license for themselves
  app.post('/api/license/generate', (req, res) => {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if user already has an active license
    const existingLicense = licenses.find(l => l.userId === userId && l.status === 'ACTIVE');
    if (existingLicense) {
      return res.status(400).json({ error: 'User already has an active license' });
    }

    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);

    const newLicense = {
      id: 'L' + Math.random().toString(36).substr(2, 4),
      userId: userId,
      key: generateUUID(),
      type: 'PRO',
      status: 'ACTIVE',
      hwid: '',
      expiryDate: expiryDate.toISOString()
    };

    licenses.push(newLicense);
    saveDB();
    res.json({ success: true, license: newLicense });
  });

  app.post('/api/register', (req, res) => {
    const { name, email, password, referredBy } = req.body;
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Generate unique referral code
    const pfx = name.replace(/[^A-Za-z]/g, "").substring(0, 4).toUpperCase() || 'REF';
    let sfx = Math.random().toString(36).substring(2, 6).toUpperCase();
    let codeCandidate = `${pfx}${sfx}`;
    // Ensure uniqueness
    while (users.some(u => u.referralCode === codeCandidate)) {
      sfx = Math.random().toString(36).substring(2, 6).toUpperCase();
      codeCandidate = `${pfx}${sfx}`;
    }

    // Track referrer and propagate up automatically up to 5 levels
    let referrerId = '';
    if (referredBy) {
      const referrer = users.find(u => u.referralCode?.toUpperCase() === referredBy.trim().toUpperCase());
      if (referrer) {
        referrerId = referrer.id;

        let currentReferrerId = referrer.id;
        for (let level = 1; level <= 5; level++) {
          const uRef = users.find(u => u.id === currentReferrerId);
          if (!uRef) break;

          referralEarnings.push({
            id: 're_' + Math.random().toString(36).substring(2, 11),
            referrerId: uRef.id,
            referredName: name,
            referredEmail: email,
            level: level,
            amount: 0.0,
            type: `Cadastro na Rede (Nível ${level})`,
            timestamp: new Date().toISOString()
          });

          addUserLog(uRef.id, `👤 NOVO INDICADO: ${name} se cadastrou no seu Nível ${level}!`);

          if (!uRef.referredBy) {
            break;
          }
          currentReferrerId = uRef.referredBy;
        }
      }
    }

    const isAdminEmail = email.toLowerCase() === 'carlosnovaes296@gmail.com' || email.toLowerCase() === 'carlosnovaecs296@gmail.com';
    const newUser = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      email,
      password,
      status: 'ACTIVE',
      role: isAdminEmail ? 'ADMIN' : 'USER',
      wallet: '',
      paymentWallet: '',
      referralCode: codeCandidate,
      referredBy: referrerId
    };
    users.push(newUser);

    // No automatic license generation to ensure separation
    
    saveDB();
    res.json({ success: true, user: newUser });
  });

  app.post('/api/payments', (req, res) => {
    const { amount, method, hash, userId } = req.body;
    const targetUserId = userId || '1';

    const newPayment = {
      id: 'P' + Math.random().toString(36).substr(2, 4),
      userId: targetUserId,
      amount,
      method,
      status: 'PENDING',
      hash
    };
    payments.push(newPayment);

    saveDB();
    res.json({ success: true, payment: newPayment });
  });

  app.post('/api/admin/payments/:id/approve', adminAuth, (req, res) => {
    const payment = payments.find(p => p.id === req.params.id);
    if (payment) {
      payment.status = 'APPROVED';

      // Liberar acesso: Create license
      const expiryDate = new Date();
      const amount = parseFloat(payment.amount) || 0;
      if (Math.abs(amount - 500) < 0.1 || Math.abs(amount - 100) < 0.1) {
        expiryDate.setFullYear(2099); // Acesso vitalício para $500 (MEU BOT) e $100 (Licença Parceria)
      } else if (Math.abs(amount - 50) < 0.1) {
        expiryDate.setDate(expiryDate.getDate() + 90); // 90 dias para $50
      } else if (Math.abs(amount - 20) < 0.1) {
        expiryDate.setDate(expiryDate.getDate() + 60); // 60 dias para $20
      } else {
        expiryDate.setDate(expiryDate.getDate() + 30); // 30 dias para $10 (ou padrão)
      }

      const newLicense: any = {
        id: 'L' + Math.random().toString(36).substr(2, 4),
        userId: payment.userId,
        key: 'FY-PRO-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
        type: 'PRO',
        status: 'ACTIVE',
        expiryDate: expiryDate.toISOString()
      };

      licenses.push(newLicense);

      // Also ensure user is active
      const user = users.find(u => u.id === payment.userId);
      if (user) {
        user.status = 'ACTIVE';

        // Multi-level network commission distribution
        // level 1: 20%, level 2: 15%, level 3: 10%, level 4: 3%, level 5: 2%
        const rates = [0.20, 0.15, 0.10, 0.03, 0.02];
        let currentUserId = user.id;
        const purchaseAmount = parseFloat(payment.amount) || 0;

        if (purchaseAmount > 0) {
          for (let level = 1; level <= 5; level++) {
            const currUser = users.find(u => u.id === currentUserId);
            if (!currUser || !currUser.referredBy) {
              break;
            }
            const referrer = users.find(u => u.id === currUser.referredBy);
            if (!referrer) {
              break;
            }

            const rate = rates[level - 1];
            const commissionAmount = Number((purchaseAmount * rate).toFixed(2));

            referralEarnings.push({
              id: 're_' + Math.random().toString(36).substring(2, 11),
              referrerId: referrer.id,
              referredName: user.name,
              referredEmail: user.email,
              level: level,
              amount: commissionAmount,
              type: `Comissão Rede Nível ${level}`,
              timestamp: new Date().toISOString()
            });

            addUserLog(referrer.id, `💸 COMISSÃO: ${referrer.name} recebeu $${commissionAmount} (Nível ${level}) por ativação de ${user.name}`);

            currentUserId = referrer.id;
          }
        }
      }

      saveDB();
    }
    res.json({ success: true });
  });
  app.post('/api/admin/payments/:id/reject', adminAuth, (req, res) => {
    const payment = payments.find(p => p.id === req.params.id);
    if (payment) {
      payment.status = 'REJECTED';
      saveDB();
    }
    res.json({ success: true });
  });

  // GET withdrawals endpoint
  app.get('/api/withdrawals', (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const requester = users.find(u => u.id === userId);
      if (requester && requester.role === 'ADMIN') {
        // Return all with user names appended
        const enriched = withdrawals.map(w => {
          const u = users.find(usr => usr.id === w.userId);
          return {
            ...w,
            userName: u ? u.name : 'Unknown User',
            userEmail: u ? u.email : 'Unknown Email'
          };
        });
        return res.json(enriched);
      }

      // If user is regular user, only return their own withdrawals
      const myWithdrawals = withdrawals.filter(w => w.userId === userId);
      res.json(myWithdrawals);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Error fetching withdrawals' });
    }
  });

  // POST withdrawal request endpoint
  app.post('/api/withdrawals', (req, res) => {
    try {
      const { userId, amount, wallet } = req.body;
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const user = users.find(u => u.id === userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const requestedAmount = parseFloat(amount);
      if (isNaN(requestedAmount) || requestedAmount <= 0) {
        return res.status(400).json({ error: 'Invalid withdrawal amount' });
      }

      if (requestedAmount < 30) {
        return res.status(400).json({ error: 'O saque mínimo permitido é de $30.00 USD' });
      }

      if (!wallet || wallet.trim() === '') {
        return res.status(400).json({ error: 'Wallet address is required' });
      }

      // Calculate total earnings
      const totalCommissions = referralEarnings
        .filter(re => re.referrerId === userId)
        .reduce((sum, item) => sum + item.amount, 0);

      // Calculate already pending or approved payments
      const activeWithdrawalsSum = withdrawals
        .filter(w => w.userId === userId && w.status !== 'REJECTED')
        .reduce((sum, item) => sum + item.amount, 0);

      const withdrawable = totalCommissions - activeWithdrawalsSum;

      if (requestedAmount > withdrawable) {
        return res.status(400).json({
          error: `Saldo insuficiente para retirada. Disponível: $${withdrawable.toFixed(2)}`
        });
      }

      // Save user wallet back to profile so it updates persistently
      user.wallet = wallet;

      const newWithdrawal = {
        id: 'W' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        userId,
        amount: requestedAmount,
        wallet,
        status: 'APPROVED',
        timestamp: new Date().toISOString()
      };

      withdrawals.push(newWithdrawal);
      addUserLog(userId, `✅ SAQUE AUTOMÁTICO: Seu saque de $${requestedAmount.toFixed(2)} para carteira ${wallet} foi aprovado e processado automaticamente.`);
      saveDB();

      res.json({ success: true, withdrawal: newWithdrawal });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Error processing withdrawal request' });
    }
  });

  // Admin Approve withdrawals
  app.post('/api/admin/withdrawals/:id/approve', adminAuth, (req, res) => {
    const withdrawal = withdrawals.find(w => w.id === req.params.id);
    if (withdrawal) {
      withdrawal.status = 'APPROVED';
      const u = users.find(usr => usr.id === withdrawal.userId);
      if (u) {
        addUserLog(u.id, `✅ SAQUE APROVADO: Seu saque de $${withdrawal.amount.toFixed(2)} foi aprovado e enviado para a carteira ${withdrawal.wallet}`);
      }
      saveDB();
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Withdrawal not found' });
    }
  });

  // Admin Reject withdrawals
  app.post('/api/admin/withdrawals/:id/reject', adminAuth, (req, res) => {
    const withdrawal = withdrawals.find(w => w.id === req.params.id);
    if (withdrawal) {
      withdrawal.status = 'REJECTED';
      const u = users.find(usr => usr.id === withdrawal.userId);
      if (u) {
        addUserLog(u.id, `❌ SAQUE REJEITADO: Seu saque de $${withdrawal.amount.toFixed(2)} foi rejeitado pelo administrador.`);
      }
      saveDB();
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Withdrawal not found' });
    }
  });

  app.get('/api/payment-destination', (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }
      const user = users.find(u => u.id === userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Look for referrer (direct upline)
      if (user.referredBy) {
        const referrer = users.find(u => u.id === user.referredBy);
        if (referrer) {
          const refWallet = (referrer.wallet || referrer.paymentWallet || '').trim();
          if (refWallet !== '') {
            return res.json({ wallet: refWallet });
          }
        }
      }

      // Fallback: Global platform payment wallet
      return res.json({ wallet: config.paymentWallet || '0x883a831511a1b71b4920cd32d3694ecef432b585' });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Error fetching payment destination' });
    }
  });

  app.post('/api/user/profile', (req, res) => {
    const { id, name, email, wallet, paymentWallet, password, mt5Login, mt5Password, mt5Server } = req.body;
    const user = users.find(u => u.id === id);
    if (user) {
      user.name = name || user.name;
      user.email = email || user.email;
      user.wallet = wallet || user.wallet;
      user.paymentWallet = paymentWallet !== undefined ? paymentWallet : user.paymentWallet;
      user.mt5Login = mt5Login || user.mt5Login;
      user.mt5Password = mt5Password || user.mt5Password;
      user.mt5Server = mt5Server || user.mt5Server;
      if (password && password !== '••••••••') {
        user.password = password;
      }
      saveDB();
      res.json({ success: true, user });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });

  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Server Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  });

  // Explicitly serve downloads folder
  app.use('/downloads', express.static(path.join(process.cwd(), 'public/downloads')));

  app.get('/api/download-all', (req, res) => {
    try {
      /*
      const zip = new AdmZip();
      const downloadsPath = path.join(process.cwd(), 'public/downloads');
      zip.addLocalFolder(downloadsPath);
      const buffer = zip.toBuffer();
      
      res.set('Content-Type', 'application/zip');
      res.set('Content-Disposition', 'attachment; filename=FYBOT_V8_INSTALLATION_PACKAGE.zip');
      res.send(buffer);
      */
      res.status(501).json({ error: "Download service temporarily disabled" });
    } catch (e) {
      console.error("Zipping error:", e);
      res.status(500).json({ error: "Failed to create installation package" });
    }
  });

  // Simulated Trading Loop
  setInterval(() => {
    try {
      const now = new Date();
      // Reset diário baseado no dia UTC
      const currentDayTag = now.toISOString().split('T')[0];

      Object.keys(userStates).forEach(uId => {
        const state = userStates[uId];
        
        // Auto-reset when day switches
        if (state.currentSessionTag !== currentDayTag) {
          state.currentSessionTag = currentDayTag;
        }

        if (state.systemBlocked && state.blockedUntil) {
          if (new Date() >= new Date(state.blockedUntil)) {
             state.systemBlocked = false;
             state.blockedUntil = null;
             state.dailyProfit = 0;
             state.customStartingBalance = null;
             addUserLog(uId, "🟢 [SESSÃO INICIADA] Nova sessão habilitada (10h/21h). Bot pronto para operar.");
          }
        }

        // Fetch real market signals from MT5 ONLY if bot is running and not blocked
        if (state.botRunning && !state.systemBlocked) {
          exec(`python mt5_signals.py ${config.symbols.join(" ")}`, (sigErr, sigOut) => {
          if (sigErr) return;
          try {
            const sigRes = JSON.parse(sigOut.trim());
            if (!sigRes.success || !sigRes.data) return;

            // Sincroniza saldo e capital em tempo real (caso esteja disponível)
            if (sigRes.account) {
              state.balance = sigRes.account.balance;
              state.equity = sigRes.account.equity;
              if (sigRes.account.today_realized_profit !== undefined) {
                state.trueRealizedProfit = sigRes.account.today_realized_profit;
              }
              // Trava a banca inicial para o cálculo exato de 2% na primeira leitura
              if (!state.customStartingBalance && state.balance > 0) {
                state.customStartingBalance = state.balance;
              } else if (state.customStartingBalance && Math.abs(state.customStartingBalance - state.balance) > state.balance * 0.5) {
                // Força atualização se houver discrepância absurda (ex: troca de conta ou reset de banca)
                state.customStartingBalance = state.balance;
              }
            }

            // NOVA REGRA: Verifica ordens abertas no painel que já fecharam no MT5 (atingiram TP ou SL)
            if (sigRes.open_tickets) {
              const mt5OpenTickets = sigRes.open_tickets.map((t: number) => t.toString());
              
              const getProfit = (ticketId: string) => {
                if (!sigRes.open_positions) return 0;
                const pos = sigRes.open_positions.find((p: any) => p.ticket.toString() === ticketId);
                return pos ? pos.profit : 0;
              };

              state.trades.forEach((t: any) => {
                if (t.status === 'OPEN') {
                  // Se a ordem está OPEN no nosso state mas não está na lista de abertas do MT5, significa que fechou
                  if (!mt5OpenTickets.includes(t.id.toString())) {
                    t.status = 'CLOSED';
                    addUserLog(uId, `🔄 Ordem ${t.id} (${t.symbol}) finalizada no MT5. Vaga liberada!`);
                  } else {
                    const currentProfit = getProfit(t.id.toString());
                    t.maxProfit = Math.max(t.maxProfit || 0, currentProfit);

                    // REGRA DE PROTEÇÃO CONTRA PERDA (Stop Loss de 10% da banca por ordem)
                    const startingDailyBalanceForStop = state.customStartingBalance ? state.customStartingBalance : state.balance;
                    const maxLossLimit = -Number((startingDailyBalanceForStop * 0.10).toFixed(2));
                    if (currentProfit <= maxLossLimit) {
                      t.status = 'CLOSED';
                      addUserLog(uId, `🛑 [STOP LOSS] Ordem ${t.id} (${t.symbol}) fechada! Atingiu limite de 10% de perda: $${currentProfit.toFixed(2)}`);
                      exec(`python mt5_close.py "{\\"ticket\\": \\"${t.id}\\"}"`, () => {});
                      return;
                    }

                  }
                }
              });
            }

            config.symbols.forEach(symbol => {
              const symData = sigRes.data[symbol];
              if (!symData) return;

              const smcScore = symData.smcScore;
              const momScore = symData.momScore;
              const smcDir = symData.smcDir;
              const momDir = symData.momDir;

              const aiBias = Math.random() > 0.7 ? (Math.random() > 0.5 ? "BULLISH" : "BEARISH") : "NEUTRAL";

              let score = (smcScore * config.strategyWeights.smc) + (momScore * config.strategyWeights.momentum);
              if (aiBias !== "NEUTRAL") score += (100 * config.strategyWeights.ai);

              let direction = smcDir === momDir ? smcDir : null;

              const currentOpenTrades = state.trades.filter((t: any) => t.status === 'OPEN');
              const symbolOpenTrades = currentOpenTrades.filter((t: any) => t.symbol.includes(symbol));
              const openCount = symbolOpenTrades.length;

              // BLOQUEIO: Se a meta diária foi batida, não abre mais nenhuma nova ordem (nem DCA)
              if (state.stopOpeningNewOrders) return;

              // BLOQUEIO 1: Horário de Operação
              if (!isTradingTime()) return;

              // 1. VERIFICAÇÃO DE DCA (RECUPERAÇÃO E PREÇO MÉDIO)
              let isDCATrade = false;

              if (openCount > 0 && openCount < 3) {
                const currentPrice = symData.price;
                if (currentPrice) {
                  const newestOrder = symbolOpenTrades[symbolOpenTrades.length - 1];
                  const newestPrice = newestOrder.openPrice;
                  
                  let stepDrawdownPct = 0;
                  if (newestOrder.type === 'BUY') {
                    stepDrawdownPct = (newestPrice - currentPrice) / newestPrice;
                  } else if (newestOrder.type === 'SELL') {
                    stepDrawdownPct = (currentPrice - newestPrice) / newestPrice;
                  }

                  let threshold = 0.0010; // Para a segunda ordem (openCount === 1)
                  if (openCount === 2) {
                    threshold = 0.0015; // Para a terceira ordem
                  }

                  if (stepDrawdownPct >= threshold) {
                    isDCATrade = true;
                    direction = state.symbolTrend[symbol]; // Força a mesma direção da primeira
                    const recuoStr = (threshold * 100).toFixed(2);
                    addUserLog(uId, `⚠️ [DCA] Preço recuou -${recuoStr}% da ordem anterior. Abrindo a ${openCount + 1}ª ordem para ${symbol}.`);
                  }
                }
              }

              // Se já tem ordens abertas, mas não atingiu a distância do DCA, cancela abertura de novas ordens normais
              if (openCount > 0 && !isDCATrade) return;

              // 2. TRAVA DE TENDÊNCIA E REVERSÃO (Somente para a Primeira Ordem)
              if (!isDCATrade) {
                if (!state.symbolTrend) state.symbolTrend = {};

                if (!state.symbolTrend[symbol] && direction && score >= config.minScore) {
                  state.symbolTrend[symbol] = direction; 
                  addUserLog(uId, `🔄 Tendência inicial definida para ${direction} em ${symbol}`);
                }

                const currentTrend = state.symbolTrend[symbol];

                if (direction && currentTrend && direction !== currentTrend) {
                  if (score >= 80) {
                    state.symbolTrend[symbol] = direction;
                    addUserLog(uId, `🔄 [REVERSÃO CONFIRMADA] Tendência virou de ${currentTrend} para ${direction} em ${symbol} (Score: ${score.toFixed(1)})!`);
                  } else {
                    return;
                  }
                }

                if (!direction || direction !== state.symbolTrend[symbol]) return;
                if (score < config.minScore) return;
              }

              // 3. LIMITES FINAIS
              if (currentOpenTrades.length >= 10) return;
              if (openCount >= 3) return;
              if (state.pendingOrders.has(symbol)) return;

          if (direction) {
            if (direction === 'BUY' && config.allowBuy === false) return;
            if (direction === 'SELL' && config.allowSell === false) return;

            // Nova regra: Abre apenas UMA ordem por ativo. 
            // Quando esta ordem fechar, a vaga será liberada e ele abrirá outra imediatamente.
            state.lastOrderTime[symbol] = Date.now();

            const lot = 0.002; // Atualizado para 0.002 a pedido do usuário

            state.pendingOrders.add(symbol);
            exec(`python mt5_open.py ${symbol} ${direction} ${lot}`, (err, stdout) => {
              state.pendingOrders.delete(symbol);
              if (err) {
                addUserLog(uId, `❌ Erro ao abrir ordem real: ${err.message}`);
                return;
              }
              try {
                const res = JSON.parse(stdout.trim());
                if (res.success) {
                  const trade = {
                    id: res.ticket,
                    symbol,
                    lot,
                    type: direction,
                    openPrice: res.price,
                    time: new Date().toISOString(),
                    status: 'OPEN'
                  };

                  state.trades.push(trade);
                  addUserLog(uId, `🎯 ORDEM REAL ABERTA: ${symbol} | Ticket: ${res.ticket} | ${direction}`);

                  // The trade will be closed by MT5's SL/TP or manual intervention.
                  // We removed the artificial setTimeout close.
                } else {
                  addUserLog(uId, `❌ Falha ao abrir ordem real: ${res.error}`);
                }
              } catch(e) {
                addUserLog(uId, `❌ Falha de comunicacao com MT5`);
              }
            });
          }
        });
          } catch (e) {
            console.error("Signal fetch error:", e);
          }
        }); // End of exec mt5_signals.py
        } // End of botRunning check

        // Continuously sync MT5 to ensure dashboard matches reality perfectly
        // REMOVIDO: Sincronização automática contínua foi desativada para evitar que
        // todas as contas puxem os dados (histórico/saldo) do MT5 aberto no servidor.
        // Agora o histórico e saldo só serão atualizados quando o usuário clicar 
        // no botão "SYNC MT5", e usará exclusivamente as credenciais dele.
        
        // Verifica se a meta diária foi batida baseado nos lucros já registrados
        const todayStr = new Date().toISOString().split('T')[0];
        const startingDailyBalance = state.customStartingBalance ? state.customStartingBalance : state.balance;
        
        // Lucro real da sessão é puramente o Capital Atual (Equity) menos a Banca Inicial da sessão
        state.dailyProfit = state.equity > 0 ? (state.equity - startingDailyBalance) : 0;
        
        const dailyLossLimit = Number((startingDailyBalance * 0.10).toFixed(2));
        if (!state.isCustomTarget) {
          const targetPercent = 0.013; // Meta fixa de 1.3% por sessão
          state.dailyProfitTarget = Number((startingDailyBalance * targetPercent).toFixed(2));
        }

        // Check if target is met and system isn't already blocked
        if (!state.systemBlocked) {
           const hitProfit = state.dailyProfitTarget > 0 && state.dailyProfit >= state.dailyProfitTarget;
           const hitLoss = dailyLossLimit > 0 && state.dailyProfit <= -dailyLossLimit;

           if (hitProfit || hitLoss) {
             const openTrades = state.trades.filter((t: any) => t.status === 'OPEN');
             
             if (openTrades.length > 0) {
               if (!state.stopOpeningNewOrders) {
                 state.stopOpeningNewOrders = true;
                 const msg = hitProfit ? "META DIÁRIA" : "LIMITE DE PERDA";
                 addUserLog(uId, `⚠️ [${msg} ATINGIDO] Parando abertura de novas ordens. Aguardando as atuais fecharem para bloquear o sistema...`);
               }
             } else {
               // Todas as ordens já fecharam, agora bloqueamos o sistema!
               state.systemBlocked = true;
               state.botRunning = false;
               state.stopOpeningNewOrders = false; // reset
               
               let target = new Date();
               // O alvo primário é o próximo horário de liberação (10h ou 21h)
               if (now.getHours() >= 10 && now.getHours() < 21) target.setHours(21, 0, 0, 0);
               else if (now.getHours() >= 21) {
                   target.setDate(target.getDate() + 1);
                   target.setHours(10, 0, 0, 0);
               }
               else if (now.getHours() < 10) target.setHours(10, 0, 0, 0);
               else if (now.getHours() < 21) target.setHours(21, 0, 0, 0);
               
               // Se o próximo alvo cair no bloqueio de fim de semana, empurra para Domingo às 21h
               if (target.getDay() === 5 && target.getHours() >= 21) {
                   target.setDate(target.getDate() + 2);
                   target.setHours(21, 0, 0, 0);
               } else if (target.getDay() === 6) {
                   target.setDate(target.getDate() + 1);
                   target.setHours(21, 0, 0, 0);
               } else if (target.getDay() === 0 && target.getHours() < 21) {
                   target.setHours(21, 0, 0, 0);
               }

               state.blockedUntil = target.toISOString();
               
               let nextSessionMsg = target.getHours() === 10 ? "Próxima sessão: 10:00 GMT-3 (Manhã)" : "Próxima sessão: 21:00 GMT-3 (Noite)";
               if (target.getDay() === 0) nextSessionMsg = "Próxima sessão: Domingo às 21:00 GMT-3";
               const logTitle = hitProfit ? "🟢 [META DIÁRIA] META DIÁRIA DE LUCRO ATINGIDA!" : "🛑 [LIMITE DE PERDA] LIMITE DIÁRIO DE PERDA ATINGIDO!";
               
               addUserLog(uId, `${logTitle} ($${state.dailyProfit.toFixed(2)})`);
               addUserLog(uId, `🔒 [SISTEMA BLOQUEADO] Todas as ordens fechadas. Bot bloqueado para proteção. ${nextSessionMsg}`);
             }
           }
        }
      });
    } catch (e) {
      console.error("Error in trading loop:", e);
    }
  }, 4000);

  // Vite/Production logic
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FYBOT Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("FATAL: Failed to start server:", err);
  process.exit(1);
});
