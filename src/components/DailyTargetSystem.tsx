import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  AlertTriangle,
  Timer,
  Settings,
  TrendingUp,
  RefreshCw,
  Zap,
  Cpu,
  Flame,
  Sliders,
  Check,
  Lock
} from 'lucide-react';

interface Stats {
  botRunning: boolean;
  balance: number;
  equity: number;
  activeTrades: number;
  winrate: string | number;
  pnlHistory: { time: string, balance: number }[];
  activeLicense?: any;
  dailyProfit?: number;
  dailyProfitTarget?: number;
  dailyLossLimit?: number;
  dailyResetHour?: string;
  preferredSession?: string;
  timezone?: string;
  antiOvertrading?: boolean;
  systemBlocked?: boolean;
  blockedUntil?: string | number | Date;
}

interface DailyTargetSystemProps {
  stats: Stats;
  language: 'pt' | 'en' | 'es';
  fetchStatus: () => Promise<void>;
  isAdmin?: boolean;
  userId?: string;
}

const targetTranslations = {
  pt: {
    title: "META DIÁRIA INTELIGENTE",
    subtitle: "V8 PRO SAFETY GATE - Proteção Avançada de Capital",
    targetValue: "Meta 1% em cada sessão",
    lossValue: "Limite de Perda (10% da Banca)",
    currentProfit: "Lucro de Hoje (Em Tempo Real)",
    resetManual: "Reset Operacional",
    resetDesc: "Liberar operações 24 horas por dia de Domingo 20 horas até sexta feira 15 horas",
    simulateProfit: "Testar Ganho (+$50)",
    simulateLoss: "Testar Perda (-$150/x)",
    simulateGoal: "Simular Meta",
    vpsStatus: "Proteção VPS Ativa",
    systemStatus: "Meta de Segurança",
    active: "SISTEMA ATIVO / EM BUSCA",
    offline: "SISTEMA OFFLINE",
    blocked: "SISTEMA BLOQUEADO",
    blockedMsgHeader: "META DIÁRIA BATIDA",
    lossMsgHeader: "LIMITE DE PERDA ATINGIDO",
    congratsMsg: "Parabéns! Meta diária atingida. O sistema bloqueou novas operações automaticamente para proteger seu lucro consolidado.",
    lossCongratsMsg: "Atenção: O limite de perda diária de 20% foi alcançado. O sistema interrompeu todas as ordens ativas automaticamente para proteger seu capital restante.",
    successProtected: "Lucro protegido com sucesso no VPS.",
    lossProtected: "Capital protegido com sucesso no VPS.",
    nextSession: "Próxima sessão em:",
    configTitle: "Configurações Operacionais",
    resetHourLabel: "Horário de Reset Automático",
    preferredSessionLabel: "Sessão Operacional Preferida",
    timezoneLabel: "Fuso Horário",
    antiOvertradingLabel: "Proteção Anti-Overtrading",
    antiOvertradingDesc: "Impede novas e-entradas após bater a primeira meta do dia.",
    saveConfigBtn: "Salvar Configurações",
    configSuccess: "Parâmetros da Meta Diária atualizados!",
    manualResetSuccess: "Ciclo diário resetado! Operações liberadas.",
    simulations: "Painel de Simulações de Risco"
  },
  en: {
    title: "SMART DAILY TARGET",
    subtitle: "V8 PRO SAFETY GATE - Advanced Capital Protection",
    targetValue: "Daily Target (1% of Bankroll)",
    lossValue: "Loss Limit (10% of Bankroll)",
    currentProfit: "Today's Profit (Real-time)",
    resetManual: "Operational Reset",
    resetDesc: "Release operations and reset daily cycle",
    simulateProfit: "Simulate Gain (+$50)",
    simulateLoss: "Simulate Loss (-$150/x)",
    simulateGoal: "Simulate Goal",
    vpsStatus: "VPS Protection Active",
    systemStatus: "Security Target",
    active: "SYSTEM ACTIVE / RUNNING",
    offline: "SYSTEM OFFLINE",
    blocked: "SYSTEM BLOCKED",
    blockedMsgHeader: "DAILY TARGET REACHED",
    lossMsgHeader: "LOSS LIMIT REACHED",
    congratsMsg: "Congratulations! Daily profit target reached. The system automatically locked new entries to secure your consolidated gains.",
    lossCongratsMsg: "Attention: The maximum daily loss limit of 20% has been reached. The system automatically terminated all open trades and halted further activity to preserve your capital.",
    successProtected: "Profit successfully secured on VPS.",
    lossProtected: "Capital successfully secured on VPS.",
    nextSession: "Next session in:",
    configTitle: "Operational Config",
    resetHourLabel: "Automatic Reset Time",
    preferredSessionLabel: "Preferred Trading Session",
    timezoneLabel: "Timezone",
    antiOvertradingLabel: "Anti-Overtrading Shield",
    antiOvertradingDesc: "Blocks duplicate trading after daily target is met.",
    saveConfigBtn: "Save Operational Settings",
    configSuccess: "Daily Target parameters updated!",
    manualResetSuccess: "Daily cycle reset! Operations unlocked.",
    simulations: "Risk Simulation Controls"
  },
  es: {
    title: "META DIARIA INTELIGENTE",
    subtitle: "V8 PRO SAFETY GATE - Protección de Capital Avanzada",
    targetValue: "Meta Diaria (1% de la Banca)",
    lossValue: "Límite de Pérdida (10% de la Banca)",
    currentProfit: "Ganancia de Hoy (En Tiempo Real)",
    resetManual: "Reajuste Operativo",
    resetDesc: "Desbloquear operaciones y reiniciar ciclo diario",
    simulateProfit: "Simular Ganancia (+$50)",
    simulateLoss: "Simular Pérdida (-$150/x)",
    simulateGoal: "Simular Meta",
    vpsStatus: "Protección VPS Activa",
    systemStatus: "Meta de Seguridad",
    active: "SISTEMA ACTIVO / OPERANDO",
    offline: "SISTEMA OFFLINE",
    blocked: "SISTEMA BLOQUEADO",
    blockedMsgHeader: "META DIARIA ALCANZADA",
    lossMsgHeader: "LÍMITE DE PÉRDIDA ALCANZADO",
    congratsMsg: "¡Felicidades! Meta diaria de ganancias lograda. El sistema ha bloqueado nuevas entradas de forma automática para asegurar sus ganancias.",
    lossCongratsMsg: "Atención: Se ha alcanzado el límite de pérdida diaria del 20%. El sistema ha cerrado todas las operaciones abiertas automáticamente para proteger su capital restante.",
    successProtected: "Ganancia protegida con éxito en el VPS.",
    lossProtected: "Capital protegido con éxito en el VPS.",
    nextSession: "Próxima sesión en:",
    configTitle: "Configuraciones Operativas",
    resetHourLabel: "Hora de Reajuste Automático",
    preferredSessionLabel: "Sesión de Trading Preferida",
    timezoneLabel: "Zona Horaria",
    antiOvertradingLabel: "Protección Anti-Overtrading",
    antiOvertradingDesc: "Evita operaciones impulsivas después del primer objetivo diario.",
    saveConfigBtn: "Guardar Parámetros",
    configSuccess: "¡Parámetros de Meta Diaria actualizados!",
    manualResetSuccess: "¡Ciclo diario reiniciado! Operaciones desbloqueadas.",
    simulations: "Panel de Simulación de Riesgo"
  }
};

export default function DailyTargetSystem({ stats, language, fetchStatus, isAdmin = false, userId }: DailyTargetSystemProps) {
  const t = targetTranslations[language] || targetTranslations['pt'];

  // Form states local fallback
  const [targetVal, setTargetVal] = useState(stats.dailyProfitTarget || (stats.balance * 0.01) || 160);
  const [resetHour, setResetHour] = useState(stats.dailyResetHour || "08:00");
  const [session, setSession] = useState(stats.preferredSession || "Brasil 10h/21h");
  const [tz, setTz] = useState(stats.timezone || "GMT-3");
  const [overtrading, setOvertrading] = useState(stats.antiOvertrading !== false);

  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const [countdown, setCountdown] = useState("00:00:00");

  // Sync state if stats loads later
  useEffect(() => {
    if (stats.dailyProfitTarget !== undefined) setTargetVal(stats.dailyProfitTarget);
    if (stats.dailyResetHour !== undefined) setResetHour(stats.dailyResetHour);
    if (stats.preferredSession !== undefined) setSession(stats.preferredSession);
    if (stats.timezone !== undefined) setTz(stats.timezone);
    if (stats.antiOvertrading !== undefined) setOvertrading(stats.antiOvertrading);
  }, [stats]);

  // Timed Notification helper
  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Countdown clock calculation
  useEffect(() => {
    let firedReset = false;
    const calculateCountdown = async () => {
      const now = new Date();

      // Parse timezone offset
      let offset = 0;
      if (tz === "GMT-3") offset = -3;
      else if (tz === "GMT+1") offset = 1;
      else if (tz === "GMT-5") offset = -5;

      // Parse reset hours and minutes
      const [hoursStr, minutesStr] = resetHour.split(":");
      const targetHours = parseInt(hoursStr, 10) || 8;
      const targetMinutes = parseInt(minutesStr, 10) || 0;

      // Calculate next reset time in UTC
      const targetUTC = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        targetHours - offset,
        targetMinutes,
        0,
        0
      ));

      // If target time is past, set to tomorrow
      if (now.getTime() >= targetUTC.getTime()) {
        targetUTC.setUTCDate(targetUTC.getUTCDate() + 1);
      }

      const diffMs = targetUTC.getTime() - now.getTime();

      // If blocked and timer hits 0, auto reset on server/client
      if (stats.systemBlocked && diffMs <= 1000 && !firedReset) {
        firedReset = true;
        try {
          const res = await fetch('/api/daily-target/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
          });
          if (res.ok) {
            await fetchStatus();
          }
        } catch (err) {
          console.error("Auto-reset error:", err);
        }
      }

      const h = Math.floor(diffMs / (1000 * 60 * 60));
      const m = Math.floor((diffMs / (1000 * 60)) % 60);
      const s = Math.floor((diffMs / 1000) % 60);

      setCountdown(
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      );
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);
    return () => clearInterval(interval);
  }, [resetHour, tz, stats.systemBlocked]);

  // Actions
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/daily-target/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: Number(targetVal),
          resetHour,
          session,
          tz,
          overtrading,
          userId
        })
      });
      if (res.ok) {
        await fetchStatus();
        showNotification(t.configSuccess);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleResetManual = async () => {
    setResetting(true);
    try {
      const res = await fetch('/api/daily-target/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        await fetchStatus();
        showNotification(t.manualResetSuccess);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setResetting(false);
    }
  };

  const handleSimulateGain = async (amount: number) => {
    setSimulating(true);
    try {
      const res = await fetch('/api/daily-target/simulate-profit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profit: amount, userId })
      });
      if (res.ok) {
        await fetchStatus();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  const floatingProfit = (stats.equity || 0) - (stats.balance || 0);
  const totalDailyProfit = stats.dailyProfit || 0;
  const realTimeProfit = totalDailyProfit;
  const pct = Math.min(100, Math.max(0, (totalDailyProfit / (stats.dailyProfitTarget || (stats.balance * 0.01) || 160)) * 100));
  const isBlocked = !!stats.systemBlocked;

  return (
    <div id="v8-daily-target-module" className="relative w-full space-y-6">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-[#121217] border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.2)] text-yellow-500 text-xs px-4 py-2.5 rounded-xl font-bold"
          >
            <ShieldCheck size={14} className="text-yellow-500" />
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
            <h2 className="text-lg font-bold text-white tracking-wide font-sans">{t.title}</h2>
          </div>
          <p className="text-xs text-white/40">{t.subtitle}</p>
        </div>

        {/* Core Quick Status Lights */}
        <div className="flex items-center gap-3">
          <div className="bg-white/5 border border-white/5 px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-mono text-[10px] font-bold text-white/60">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
            {t.vpsStatus}
          </div>
          <div className={`bg-white/5 border border-white/5 px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-mono text-[10px] font-bold ${isBlocked ? 'text-yellow-500' : 'text-emerald-400'
            }`}>
            <div className={`w-2 h-2 rounded-full ${isBlocked ? 'bg-yellow-500 animate-pulse shadow-[0_0_6px_rgba(234,179,8,0.5)]' : 'bg-emerald-400 animate-pulse'}`} />
            {isBlocked ? t.offline : t.active}
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${isAdmin ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-8 items-stretch`}>

        {/* MAIN VISUAL CARD - NEON GREEN OR SECURED BLOCKED CONTAINER */}
        <div className={`${isAdmin ? 'lg:col-span-2' : ''} flex flex-col justify-between`}>
          <div className="bg-[#0f0f12] border border-white/5 rounded-3xl p-6 relative overflow-hidden h-full flex flex-col justify-between">

            {/* Grid neon highlights */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-yellow-500/[0.03] via-transparent to-transparent pointer-events-none" />

            <AnimatePresence mode="wait">
              {isBlocked ? (
                // META DIÁRIA BATIDA NEON GREEN GLOW WINNER LOCK STATE OR DRAWDOWN RED LOCK STATE
                <motion.div
                  key="blocked-card"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="relative z-10 h-full flex flex-col lg:flex-row gap-6"
                >
                  <div className="flex-1 flex flex-col justify-between space-y-6 py-4">
                  {realTimeProfit < 0 ? (
                    // DRAWDOWN / DAILY LOSS HIT RED WARNING STATE
                    <>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1.5 bg-[#2a1215] border border-red-500/30 px-3 py-1 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.1)]">
                            <AlertTriangle size={14} className="text-red-400 animate-pulse" />
                            <span className="text-[10px] font-black tracking-widest text-red-100 uppercase">
                              {t.lossMsgHeader}
                            </span>
                          </div>
                          <h3 className="text-2xl font-black tracking-tighter text-red-500 uppercase pt-2 drop-shadow-[0_0_6px_rgba(239,68,68,0.3)]">
                            {t.blocked}
                          </h3>
                        </div>

                        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 animate-bounce">
                          <Lock size={20} />
                        </div>
                      </div>

                      {/* Profit value readout with clean styling */}
                      <div className="bg-red-500/[0.02] border border-red-500/10 rounded-2xl p-4 flex justify-between items-center bg-gradient-to-r from-red-500/[0.03] to-transparent">
                        <div>
                          <p className="text-xs font-bold text-white/80 uppercase tracking-widest mb-1">{t.currentProfit}</p>
                          <h4 className="text-3xl font-mono font-black text-red-400 tracking-tight">
                            -{Math.abs(realTimeProfit).toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
                          </h4>
                        </div>
                        {isAdmin && (
                          <div className="text-right">
                            <p className="text-xs font-bold text-white/80 uppercase tracking-widest mb-1">{t.lossValue}</p>
                            <span className="text-xl font-bold text-white/80 font-mono tracking-tight">
                              ${(stats.dailyLossLimit || (stats.balance * 0.10))?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Warning system details */}
                      <div className="bg-red-950/20 border border-red-900/30 p-5 rounded-2xl space-y-3">
                        <p className="text-lg text-red-200 font-semibold leading-relaxed">
                          {t.lossCongratsMsg}
                        </p>
                        <div className="flex items-center gap-2 text-[15px] text-red-400 font-bold tracking-wider uppercase bg-red-500/5 px-3 py-1.5 rounded w-fit">
                          <ShieldCheck size={16} />
                          {t.lossProtected}
                        </div>
                      </div>
                    </>
                  ) : (
                    // STANDARD GREEN WINNING TARGET REACHED
                    <>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1.5 bg-[#152e1d] border border-emerald-500/30 px-3 py-1 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                            <Flame size={14} className="text-emerald-400 animate-bounce" />
                            <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase">
                              {t.blockedMsgHeader}
                            </span>
                          </div>
                          <h3 className="text-2xl font-black tracking-tighter text-emerald-400 uppercase pt-2 drop-shadow-[0_0_6px_rgba(52,211,153,0.3)]">
                            {t.blocked}
                          </h3>
                          {stats.blockedUntil && (
                            <p className="text-xs font-bold text-emerald-500/80 mt-1">
                              {new Date(stats.blockedUntil).getHours() === 10 ? 'PRÓXIMA SESSÃO: 10:00 GMT-3 (NY)' : 'PRÓXIMA SESSÃO: 21:00 GMT-3 (ÁSIA)'}
                            </p>
                          )}
                        </div>

                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 animate-pulse">
                          <Lock size={20} />
                        </div>
                      </div>

                      {/* Profit value readout with clean styling */}
                      <div className="bg-emerald-500/[0.02] border border-emerald-500/10 rounded-2xl p-4 flex justify-between items-center bg-gradient-to-r from-emerald-500/[0.03] to-transparent">
                        <div>
                          <p className="text-xs font-bold text-white/80 uppercase tracking-widest mb-1">{t.currentProfit}</p>
                          <h4 className="text-3xl font-mono font-black text-emerald-400 tracking-tight">
                            {realTimeProfit >= 0 ? '+' : '-'}{Math.abs(realTimeProfit).toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
                          </h4>
                        </div>
                        {isAdmin && (
                          <div className="text-right">
                            <p className="text-xs font-bold text-white/80 uppercase tracking-widest mb-1">{t.targetValue}</p>
                            <h5 className="text-xl font-mono font-bold text-white/80">
                              ${stats.dailyProfitTarget?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </h5>
                          </div>
                        )}
                      </div>

                      {/* Warning system details */}
                      <div className="bg-emerald-950/10 border border-emerald-900/30 p-5 rounded-2xl space-y-3">
                        <p className="text-lg text-emerald-400 font-semibold leading-relaxed">
                          {t.congratsMsg}
                        </p>
                        <div className="flex items-center gap-2 text-[15px] text-emerald-500 font-bold tracking-wider uppercase bg-emerald-500/5 px-3 py-1.5 rounded w-fit">
                          <ShieldCheck size={16} />
                          {t.successProtected}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Big Cyber Digital Timer */}
                  <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-xl relative">
                        <Timer size={18} className="animate-spin" style={{ animationDuration: '4s' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block absolute -top-0.5 -right-0.5 animate-ping" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{t.nextSession}</p>
                        <p className="text-xs text-yellow-500/80 font-bold">{session} ({tz})</p>
                      </div>
                    </div>

                    <div className="text-center md:text-right">
                      <span className="text-3xl font-mono font-black tracking-wider text-yellow-500 bg-yellow-500/5 border border-yellow-500/10 px-5 py-1.5 rounded-xl block shadow-[0_0_12px_rgba(234,179,8,0.1)]">
                        {countdown}
                      </span>
                    </div>
                  </div>
                  </div>
                  {/* DIREITA: FOTO DO BOT DORMINDO */}
                  <div className="hidden lg:flex w-[40%] flex-col items-center justify-between pointer-events-none gap-4">
                    <img 
                      src="/sleeping_bot.png" 
                      alt="Bot Dormindo" 
                      className="w-full h-full object-cover rounded-3xl drop-shadow-[0_0_25px_rgba(255,255,255,0.1)] hover:scale-[1.02] transition-transform duration-700"
                    />
                    <p className="text-emerald-500 font-black tracking-widest uppercase text-lg animate-pulse text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                      Silêncio, é hora de sono profundo para o Fybot
                    </p>
                  </div>
                </motion.div>
              ) : (
                // ACTIVE OPERATIONAL MODE WITH TARGET TARGET MOCK / ACTIVE PROGRESS
                <motion.div
                  key="active-card"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="relative z-10 h-full flex flex-col lg:flex-row gap-6"
                >
                  <div className="flex-1 space-y-6 py-2 flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] text-white/30 uppercase tracking-widest font-black mb-1">{t.systemStatus}</p>
                      <h3 className="text-xl font-bold text-white uppercase flex items-center gap-1.5">
                        <Cpu size={16} className="text-yellow-500 animate-pulse" />
                        V8 SAFETY SHIELD
                      </h3>
                    </div>

                    <div className="px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-[9px] font-black text-yellow-500 font-mono uppercase tracking-widest">
                      RESET às {resetHour} ({tz})
                    </div>
                  </div>

                  {/* Standard Values read-out */}
                  <div className={`grid ${isAdmin ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1'} gap-4`}>
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-between h-full">
                      <p className="text-xs font-bold text-white/80 uppercase tracking-wider mb-2 min-h-[32px] flex items-start">{t.currentProfit}</p>
                      <span className={`text-2xl font-mono font-black ${realTimeProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                        {realTimeProfit >= 0 ? '+' : '-'}{Math.abs(realTimeProfit).toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
                      </span>
                    </div>

                    {isAdmin && (
                      <>
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-between h-full">
                          <p className="text-xs font-bold text-white/80 uppercase tracking-wider mb-2 min-h-[32px] flex items-start">{t.targetValue}</p>
                          <span className="text-2xl font-mono font-black text-white">
                            ${(stats.dailyProfitTarget || (stats.balance * 0.01) || targetVal)?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 border-red-500/10 flex flex-col justify-between h-full">
                          <p className="text-xs text-red-400/90 uppercase tracking-wider mb-2 font-bold min-h-[32px] flex items-start">{t.lossValue}</p>
                          <span className="text-2xl font-mono font-black text-red-400">
                            ${(stats.dailyLossLimit || (stats.balance * 0.10))?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Horizontal Dynamic Neon Cyber Progress Indicator */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-mono font-bold text-white/40">
                      <span>{pct.toFixed(0)}% PROGRESSO</span>
                      <span className="text-yellow-500">FASE PROTETIVA V8</span>
                    </div>
                    <div className="w-full h-3 bg-white/5 border border-white/10 rounded-full overflow-hidden p-0.5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5 }}
                        className="h-full bg-gradient-to-r from-yellow-500 to-emerald-400 rounded-full relative"
                      >
                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_50%,rgba(255,255,255,0.4)_50%)] bg-[length:8px_100%] opacity-10 animate-pulse" />
                      </motion.div>
                    </div>
                  </div>

                  {/* Status checklist helper */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-white/70">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-[9px] font-bold">✓</div>
                      <span> VPS Latência Baixa (&lt;1.8ms)</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/70">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-[9px] font-bold">✓</div>
                      <span> Sinais Estratégicos Inteligentes</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/70 col-span-1 md:col-span-2">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-[9px] font-bold">✓</div>
                      <span> Proteção contra Over-Trading Operacional</span>
                    </div>
                  </div>
                  </div>
                  {/* DIREITA: FOTO DO BOT ACORDADO */}
                  <div className="hidden lg:flex w-1/2 flex-col items-center justify-center pointer-events-none gap-4">
                    <img 
                      src="/awake_bot.png" 
                      alt="Bot Acordado" 
                      className="w-[70%] h-auto object-contain rounded-3xl drop-shadow-[0_0_25px_rgba(255,255,255,0.1)] hover:scale-105 transition-transform duration-700"
                    />
                    <p className="text-emerald-500 font-black tracking-widest uppercase text-lg animate-pulse text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] mt-4">
                      Olá, tô de volta! Vamos ao trabalho e boa sorte!
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

        {/* CONTROLS AND OP SETUP PANEL */}
        {(!isAdmin && stats.activeLicense?.expiryDate && new Date(stats.activeLicense.expiryDate).getFullYear() > 2090) && (
          <div className="bg-[#0f0f12] border border-white/5 rounded-3xl p-6 flex flex-col justify-center mt-8">
            <button
              onClick={handleResetManual}
              disabled={resetting}
              className="w-fit mx-auto px-12 py-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/20 hover:border-emerald-500/40 active:scale-95 transition-all flex items-center justify-center gap-4 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.15)]"
            >
              <RefreshCw size={28} className={resetting ? 'animate-spin text-[#00ff9d]' : 'text-[#00ff9d] drop-shadow-[0_0_8px_rgba(0,255,157,0.5)]'} />
              <div className="text-left">
                <p className="font-black text-xl uppercase tracking-wider leading-none mb-1.5 text-[#00ff9d] drop-shadow-[0_0_8px_rgba(0,255,157,0.5)]">{t.resetManual}</p>
                <p className="text-[14px] text-[#00ff9d]/80 font-bold uppercase tracking-widest leading-none">{t.resetDesc}</p>
              </div>
            </button>
          </div>
        )}

        {isAdmin && (
          <div className="bg-[#0f0f12] border border-white/5 rounded-3xl p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="font-bold uppercase tracking-wider text-xs text-white/60 flex items-center gap-2">
                <Sliders size={14} className="text-yellow-500" />
                {t.configTitle}
              </h3>

              <form onSubmit={handleSaveConfig} className="space-y-4">
                {/* Daily target selection */}
                <div>
                  <label className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5 font-bold">
                    {t.targetValue} (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-white/30">$</span>
                    <input
                      type="number"
                      value={Math.round((stats.balance || 0) * 0.01)}
                      readOnly
                      disabled
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-7 pr-3 text-sm font-mono font-bold text-white/50 cursor-not-allowed"
                    />
                    <span className="absolute right-3 top-2 text-[10px] text-yellow-500 font-bold bg-yellow-500/10 px-2 py-0.5 rounded">AUTO (1%)</span>
                  </div>
                </div>

                {/* Automatic reset time config */}
                <div>
                  <label className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5 font-bold">
                    {t.resetHourLabel}
                  </label>
                  <input
                    type="time"
                    value={resetHour}
                    onChange={(e) => setResetHour(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm font-mono font-bold text-white focus:outline-none focus:border-yellow-500/50 transition-colors"
                  />
                </div>

                {/* Operative preferred session options */}
                <div>
                  <label className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5 font-bold">
                    {t.preferredSessionLabel}
                  </label>
                  <select
                    value={session}
                    onChange={(e) => setSession(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs font-bold text-white focus:outline-none focus:border-yellow-500/50 transition-colors cursor-pointer"
                  >
                    <option value="Brasil 10h/21h" className="bg-[#0f0f12]">Brasil — 10:00 e 21:00 BRT ⚡</option>
                    <option value="London/NY" className="bg-[#0f0f12]">Londres / Nova York (Standard)</option>
                    <option value="New York" className="bg-[#0f0f12]">Nova York (Operações NY)</option>
                    <option value="London" className="bg-[#0f0f12]">Londres (London Session)</option>
                    <option value="Tokyo" className="bg-[#0f0f12]">Tóquio (Asian Session)</option>
                  </select>
                </div>

                {/* Timezone configuration */}
                <div>
                  <label className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5 font-bold">
                    {t.timezoneLabel}
                  </label>
                  <select
                    value={tz}
                    onChange={(e) => setTz(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs font-bold text-white focus:outline-none focus:border-yellow-500/50 transition-colors cursor-pointer"
                  >
                    <option value="UTC" className="bg-[#0f0f12]">UTC (Standard Internacional)</option>
                    <option value="GMT-3" className="bg-[#0f0f12]">GMT-3 (Brasília / São Paulo)</option>
                    <option value="GMT+1" className="bg-[#0f0f12]">GMT+1 (Londres CET)</option>
                    <option value="GMT-5" className="bg-[#0f0f12]">GMT-5 (EST New York)</option>
                  </select>
                </div>

                {/* Anti Overtrading protection shield toggle */}
                <div className="flex items-center justify-between gap-2 bg-white/[0.02] border border-white/5 rounded-2xl p-3">
                  <div className="flex-1">
                    <p className="text-[10px] text-white font-bold">{t.antiOvertradingLabel}</p>
                    <p className="text-[9px] text-white/40 leading-tight">{t.antiOvertradingDesc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOvertrading(!overtrading)}
                    className={`w-10 h-6 rounded-full flex items-center p-0.5 transition-all ${overtrading ? 'bg-emerald-500' : 'bg-white/10'
                      }`}
                  >
                    <div className={`w-5 h-5 bg-black rounded-full transition-all ${overtrading ? 'transform translate-x-4' : 'transform translate-x-0'
                      }`} />
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 bg-yellow-500 text-black font-bold text-xs rounded-xl hover:bg-yellow-400 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-yellow-500/10 cursor-pointer"
                >
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                  {t.saveConfigBtn}
                </button>
              </form>
            </div>

            {/* OPERATIONAL RESET CONTROL (ONLY FOR LIFETIME) */}
            {(stats.activeLicense?.expiryDate && new Date(stats.activeLicense.expiryDate).getFullYear() > 2090) && (
              <div className="border-t border-white/5 pt-5 mt-5">
                <button
                  onClick={handleResetManual}
                  disabled={resetting}
                  className="w-fit mx-auto px-12 py-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/20 hover:border-emerald-500/40 active:scale-95 transition-all flex items-center justify-center gap-4 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                >
                  <RefreshCw size={28} className={resetting ? 'animate-spin text-[#00ff9d]' : 'text-[#00ff9d] drop-shadow-[0_0_8px_rgba(0,255,157,0.5)]'} />
                  <div className="text-left">
                    <p className="font-black text-xl uppercase tracking-wider leading-none mb-1.5 text-[#00ff9d] drop-shadow-[0_0_8px_rgba(0,255,157,0.5)]">{t.resetManual}</p>
                    <p className="text-[14px] text-[#00ff9d]/80 font-bold uppercase tracking-widest leading-none">{t.resetDesc}</p>
                  </div>
                </button>
              </div>
            )}



          </div>
        )}

      </div>
    </div>
  );
}
