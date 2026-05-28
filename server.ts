import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
// import AdmZip from 'adm-zip';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  /*
  const DB_DIR = path.join(process.cwd(), 'data');
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR);
  const DB_PATH = path.join(DB_DIR, 'db.json');
  */

  // Initial State partitioned by user
  const userStates: Record<string, any> = {};

  const getUserState = (userId: string | undefined): any => {
    const id = userId || "1"; // Fallback to '1' (Carlos Novaes) as default
    if (!userStates[id]) {
      const isPreseeded = id === '1' || id === '3';
      userStates[id] = {
        botRunning: false,
        balance: 10000,
        equity: 10000,
        dailyProfit: 0.00,
        dailyProfitTarget: 200.00,
        dailyResetHour: "08:00",
        preferredSession: "London/NY",
        timezone: "UTC",
        antiOvertrading: true,
        systemBlocked: false,
        trades: isPreseeded ? [
          { id: 'ia4wmeaok', symbol: 'EURUSD', type: 'SELL', lot: 0.0001, openPrice: 1.1, time: '2026-05-19T20:46:58.000Z', status: 'OPEN' },
          { id: 'g1i4uip2m', symbol: 'EURUSD', type: 'SELL', lot: 0.0001, openPrice: 1.1, time: '2026-05-19T20:46:46.000Z', status: 'CLOSED', profit: 74.69 },
          { id: '54kny4b0g', symbol: 'EURUSD', type: 'BUY', lot: 0.0001, openPrice: 1.1, time: '2026-05-19T20:46:38.000Z', status: 'CLOSED', profit: -62.54 },
          { id: 'r4nhjst66', symbol: 'XAUUSD', type: 'SELL', lot: 0.0001, openPrice: 1.1, time: '2026-05-19T20:46:26.000Z', status: 'CLOSED', profit: 95.32 },
          { id: '6szg2pv5l', symbol: 'EURUSD', type: 'BUY', lot: 0.0001, openPrice: 1.1, time: '2026-05-19T20:46:18.000Z', status: 'CLOSED', profit: -76.78 },
          { id: 'dmgefulz5', symbol: 'EURUSD', type: 'BUY', lot: 0.0001, openPrice: 1.1, time: '2026-05-19T20:46:14.000Z', status: 'CLOSED', profit: -17.97 },
          { id: 'v3xwxai0t', symbol: 'GBPUSD', type: 'SELL', lot: 0.0001, openPrice: 1.1, time: '2026-05-19T20:46:10.000Z', status: 'CLOSED', profit: -77.49 },
          { id: 'xky5il5qm', symbol: 'XAUUSD', type: 'BUY', lot: 0.0001, openPrice: 1.1, time: '2026-05-19T20:46:06.000Z', status: 'CLOSED', profit: 88.47 },
          { id: 'r85koly7q', symbol: 'EURUSD', type: 'SELL', lot: 0.0001, openPrice: 1.1, time: '2026-05-19T20:46:06.000Z', status: 'CLOSED', profit: -16.29 },
          { id: '1cw6s1uw2', symbol: 'XAUUSD', type: 'SELL', lot: 0.0001, openPrice: 1.1, time: '2026-05-19T20:45:54.000Z', status: 'CLOSED', profit: -41.73 }
        ] : [],
        logs: [],
        pnlHistory: [
          { time: new Date(Date.now() - 3600000).toISOString(), balance: 10000 }
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
    { id: 'L1', userId: '1', key: 'FY-PRO-99', type: 'LIFETIME', status: 'ACTIVE', hwid: 'BFEBFBFF000906E3' },
    { id: 'L_TEST', userId: '', key: 'FY-PRO-V8', type: 'PRO', status: 'PENDING', hwid: '' }
  ];

  // For demo, let's add an active monthly license for user 1 if they don't have one, or just update L1
  // Actually, let's just make L1 a monthly one for testing the countdown
  const demoExpiry = new Date();
  demoExpiry.setDate(demoExpiry.getDate() + 7); // 7 days from now
  demoExpiry.setHours(demoExpiry.getHours() + 5);
  demoExpiry.setMinutes(demoExpiry.getMinutes() + 30);

  licenses[0] = { ...licenses[0], type: 'PRO', expiryDate: demoExpiry.toISOString() } as any;

  let payments: any[] = [];

  let referralEarnings: any[] = [];

  let withdrawals: any[] = [];

  let config = {
    riskLevel: 'MEDIUM',
    lotMultiplier: 0.0001,
    minScore: 60,
    symbols: ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD"],
    strategyWeights: {
      smc: 0.4,
      momentum: 0.4,
      ai: 20
    },
    paymentWallet: '0x883a831511a1b71b4920cd32d3694ecef432b585'
  };

  /*
  // Load from DB if exists
  if (fs.existsSync(DB_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
      users = data.users || users;
      licenses = data.licenses || licenses;
      payments = data.payments || payments;
      config = data.config || config;
      console.log('FYBOT: Loaded data from persistence');
    } catch (e) {
      console.error('FYBOT: Failed to load DB', e);
    }
  }
  */

  const saveDB = () => {
    /*
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify({ users, licenses, payments, config }, null, 2));
    } catch (e) {
      console.error('FYBOT: Failed to save DB', e);
    }
    */
  };

  app.get('/api/status', (req, res) => {
    try {
      const { userId } = req.query;
      const state = getUserState(userId as string);
      const activeLicense = userId ? licenses.find(l => l.userId === userId && l.status === 'ACTIVE') : null;
      const pendingPayment = userId ? payments.find(p => p.userId === userId && p.status === 'PENDING') : null;

      // Dynamically calculate daily profit target as 2% of current balance
      state.dailyProfitTarget = Number((state.balance * 0.02).toFixed(2));
      const startingDailyBalance = state.balance - state.dailyProfit;
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
        trades: state.trades.slice(-10).reverse(),
        activeLicense,
        pendingPayment,
        dailyProfit: Number(state.dailyProfit.toFixed(2)),
        dailyProfitTarget: state.dailyProfitTarget,
        dailyLossLimit,
        dailyResetHour: state.dailyResetHour,
        preferredSession: state.preferredSession,
        timezone: state.timezone,
        antiOvertrading: state.antiOvertrading,
        systemBlocked: state.systemBlocked
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
      if (typeof target === 'number') state.dailyProfitTarget = target;
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
      state.dailyProfit = 0;
      state.systemBlocked = false;
      addUserLog(userId, "🔄 [RESET MANUAL] Sistema de Meta Diária reiniciado com sucesso.");
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
      addUserLog(userId, `${profitAmount >= 0 ? '✅' : '❌'} CLOSED XAUUSD: ${formattedProfit} [SIMULAÇÃO DE RESULTADO]`);
      
      if (!state.systemBlocked) {
        state.dailyProfit += profitAmount;
        const startingDailyBalance = state.balance - state.dailyProfit;
        const dailyLossLimit = Number((startingDailyBalance * 0.10).toFixed(2));

        if (state.dailyProfit >= state.dailyProfitTarget) {
          state.systemBlocked = true;
          state.botRunning = false;
          // Force close any remaining open target trades
          state.trades.forEach((t: any) => {
            if (t.status === 'OPEN') {
              t.status = 'CLOSED';
              t.profit = 0.00;
              t.closeTime = new Date().toISOString();
            }
          });
          addUserLog(userId, "🟢 [META DIÁRIA] META DIÁRIA DE LUCRO ATINGIDA!");
          addUserLog(userId, "🔒 [SISTEMA BLOQUEADO] Sinais automáticos encerrados para proteger lucro.");
          addUserLog(userId, "🛡️ Proteção anti-overtrading ativa. VPS Protegido.");
        } else if (state.dailyProfit <= -dailyLossLimit) {
          state.systemBlocked = true;
          state.botRunning = false;
          // Force close any remaining open target trades
          state.trades.forEach((t: any) => {
            if (t.status === 'OPEN') {
              t.status = 'CLOSED';
              t.profit = 0.00;
              t.closeTime = new Date().toISOString();
            }
          });
          addUserLog(userId, "🔴 [LIMITE DE PERDA] LIMITE DE PERDA DIÁRIA (10%) ATINGIDO!");
          addUserLog(userId, "🔒 [SISTEMA BLOQUEADO] Sinais automáticos encerrados para proteger seu capital.");
          addUserLog(userId, "🛡️ VPS interrompeu todas as ordens ativas e bloqueou novas operações.");
        } else {
          addUserLog(userId, `📈 Lucro diário: $${state.dailyProfit.toFixed(2)} / $${state.dailyProfitTarget.toFixed(2)} | Limite Perda: -$${dailyLossLimit.toFixed(2)}`);
        }
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
      if (state.systemBlocked) {
        return res.status(400).json({ success: false, error: 'SYSTEM_BLOCKED_DAILY_TARGET' });
      }
      const hasActiveLicense = licenses.some(l => l.userId === userId && l.status === 'ACTIVE');
      if (!hasActiveLicense) {
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

  app.get('/api/logs', (req, res) => {
    const { userId } = req.query;
    const state = getUserState(userId as string);
    res.json({ logs: state.logs });
  });

  app.get('/api/trades', (req, res) => {
    const { userId } = req.query;
    const state = getUserState(userId as string);
    res.json({ trades: state.trades.slice(-10).reverse() });
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
      
      const newLicense: any = {
        id: 'L' + Math.random().toString(36).substr(2, 4),
        userId: user.id,
        key: 'FY-PRO-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
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
    const license: any = licenses.find(l => l.key === key && l.status !== 'ACTIVE');
    
    if (license) {
      license.userId = userId;
      license.status = 'ACTIVE';
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);
      license.expiryDate = expiryDate.toISOString();
      
      saveDB();
      res.json({ success: true, license });
    } else {
      res.status(400).json({ error: 'INVALID_KEY_OR_ALREADY_ACTIVE' });
    }
  });

  app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    // Simple mock authentication
    const user = users.find(u => u.email === email);
    if (user) {
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
      if (Math.abs(amount - 50) < 0.1) {
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
        status: 'PENDING',
        timestamp: new Date().toISOString()
      };

      withdrawals.push(newWithdrawal);
      addUserLog(userId, `📥 SAQUE SOLICITADO: Solicitou um saque de $${requestedAmount.toFixed(2)} para carteira ${wallet}`);
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
    const { id, name, email, wallet, paymentWallet, password } = req.body;
    const user = users.find(u => u.id === id);
    if (user) {
      user.name = name || user.name;
      user.email = email || user.email;
      user.wallet = wallet || user.wallet;
      user.paymentWallet = paymentWallet !== undefined ? paymentWallet : user.paymentWallet;
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
      // Run simulation for all users that have states initialized
      Object.keys(userStates).forEach(uId => {
        const state = userStates[uId];
        if (!state.botRunning || state.systemBlocked) return;

        config.symbols.forEach(symbol => {
          // If systemBlocked was triggered concurrently, don't execute
          if (state.systemBlocked) return;

          // Simulate Strategy Signals
          const smcScore = Math.floor(Math.random() * 100);
          const momScore = Math.floor(Math.random() * 100);
          const smcDir = Math.random() > 0.5 ? "BUY" : "SELL";
          const momDir = Math.random() > 0.5 ? "BUY" : "SELL";
          
          const aiBias = Math.random() > 0.7 ? (Math.random() > 0.5 ? "BULLISH" : "BEARISH") : "NEUTRAL";
          
          let score = (smcScore * config.strategyWeights.smc) + (momScore * config.strategyWeights.momentum);
          if (aiBias !== "NEUTRAL") score += config.strategyWeights.ai;

          const direction = smcDir === momDir ? smcDir : null;

          if (score >= config.minScore && direction) {
            const lot = 0.0001;
            
            const id = Math.random().toString(36).substr(2, 9);
            const trade = {
              id,
              symbol,
              lot,
              type: direction,
              openPrice: 1.1 + Math.random() * 0.1,
              time: new Date().toISOString(),
              status: 'OPEN'
            };
            
            state.trades.push(trade);
            addUserLog(uId, `🎯 SIGNAL: ${symbol} | Score: ${score.toFixed(1)} | ${direction}`);
            
            setTimeout(() => {
              const finishedTrade = state.trades.find((t: any) => t.id === id);
              if (finishedTrade) {
                if (state.systemBlocked) {
                  finishedTrade.status = 'CLOSED';
                  finishedTrade.profit = 0.00;
                  finishedTrade.closeTime = new Date().toISOString();
                  return;
                }
                const isWin = Math.random() > 0.45;
                const profit = isWin ? (Math.random() * 100 + 20) : -(Math.random() * 80 + 10);
                finishedTrade.status = 'CLOSED';
                finishedTrade.profit = Number(profit.toFixed(2));
                finishedTrade.closeTime = new Date().toISOString();
                state.balance += profit;
                state.equity = state.balance;
                state.pnlHistory.push({ time: new Date().toISOString(), balance: Number(state.balance.toFixed(2)) });
                if (state.pnlHistory.length > 30) state.pnlHistory.shift();
                
                // Dynamically calculate daily profit target as 2% of updated balance
                state.dailyProfitTarget = Number((state.balance * 0.02).toFixed(2));
                
                addUserLog(uId, `${profit >= 0 ? '✅' : '❌'} CLOSED ${symbol}: ${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}`);

                if (!state.systemBlocked) {
                  state.dailyProfit += profit;
                  const startingDailyBalance = state.balance - state.dailyProfit;
                  const dailyLossLimit = Number((startingDailyBalance * 0.10).toFixed(2));

                  if (state.dailyProfit >= state.dailyProfitTarget) {
                    state.systemBlocked = true;
                    state.botRunning = false;
                    // Force close any remaining open target trades
                    state.trades.forEach((t: any) => {
                      if (t.status === 'OPEN') {
                        t.status = 'CLOSED';
                        t.profit = 0.00;
                        t.closeTime = new Date().toISOString();
                      }
                    });
                    addUserLog(uId, "🟢 [META DIÁRIA] META DIÁRIA DE LUCRO ATINGIDA!");
                    addUserLog(uId, "🔒 [SISTEMA BLOQUEADO] Sinais automáticos encerrados para proteger lucro.");
                    addUserLog(uId, "🛡️ Proteção anti-overtrading ativa. VPS Protegido.");
                  } else if (state.dailyProfit <= -dailyLossLimit) {
                    state.systemBlocked = true;
                    state.botRunning = false;
                    // Force close any remaining open target trades
                    state.trades.forEach((t: any) => {
                      if (t.status === 'OPEN') {
                        t.status = 'CLOSED';
                        t.profit = 0.00;
                        t.closeTime = new Date().toISOString();
                      }
                    });
                    addUserLog(uId, "🔴 [LIMITE DE PERDA] LIMITE DE PERDA DIÁRIA (10%) ATINGIDO!");
                    addUserLog(uId, "🔒 [SISTEMA BLOQUEADO] Sinais automáticos encerrados para proteger seu capital.");
                    addUserLog(uId, "🛡️ VPS interrompeu todas as ordens ativas e bloqueou novas operações.");
                  } else {
                    addUserLog(uId, `📈 Lucro diário: $${state.dailyProfit.toFixed(2)} / $${state.dailyProfitTarget.toFixed(2)} | Limite Perda: -$${dailyLossLimit.toFixed(2)}`);
                  }
                }
              }
            }, 5000 + Math.random() * 10000);
          }
        });
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
