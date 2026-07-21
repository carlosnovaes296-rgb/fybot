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
    targetValue: "Meta Diária 2% sobre o valor da banca",
    lossValue: "Limite de Perda (10% da Banca)",
    currentProfit: "Lucro de Hoje (Em Tempo Real)",
    resetManual: "Reset Operacional",
    resetDesc: "",
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
    targetValue: "Daily Target (2% of Bankroll)",
    lossValue: "Loss Limit (10% of Bankroll)",
    currentProfit: "Today's Profit (Real-time)",
    resetManual: "Operational Reset",
    resetDesc: "",
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
    targetValue: "Meta Diaria (2% de la Banca)",
    lossValue: "Límite de Pérdida (10% de la Banca)",
    currentProfit: "Ganancia de Hoy (En Tiempo Real)",
    resetManual: "Reset Operacional",
    resetDesc: "",
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
  const [targetVal, setTargetVal] = useState(stats.dailyProfitTarget || (stats.balance * 0.02) || 200);
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


  const floatingProfit = (stats.equity || 0) - (stats.balance || 0);
  const totalDailyProfit = stats.dailyProfit || 0;
  const realTimeProfit = totalDailyProfit;
  const liveTarget = stats.balance * 0.02;
  const pct = Math.min(100, Math.max(0, (totalDailyProfit / (liveTarget || 200)) * 100));
  const isBlocked = !!stats.systemBlocked;

  return (
    <div id="v8-daily-target-module" className="relative w-full space-y-2">
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


      <div className="flex flex-col gap-6 w-full">

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
                      value={Math.round((stats.balance || 0) * 0.02)}
                      readOnly
                      disabled
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-7 pr-3 text-sm font-mono font-bold text-white/50 cursor-not-allowed"
                    />
                    <span className="absolute right-3 top-2 text-[10px] text-yellow-500 font-bold bg-yellow-500/10 px-2 py-0.5 rounded">AUTO (2%)</span>
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
