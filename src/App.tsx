/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  BarChart3,
  Activity,
  LayoutDashboard,
  Settings,
  History,
  Clock,
  Wallet,
  TrendingUp,
  ShieldCheck,
  Zap,
  X,
  Terminal,
  ChevronRight,
  RefreshCw,
  Target,
  AlertTriangle,
  Save,
  Trash2,
  Network,
  Share2,
  DollarSign,
  Users,
  Lock,
  UserCheck,
  CreditCard,
  UserCog,
  CheckCircle2,
  XCircle,
  Download,
  Monitor,
  Send,
  Fingerprint,
  ArrowRight,
  LogOut,
  Eye,
  EyeOff,
  Globe,
  Key,
  Copy,
  Menu,
  Crown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import DailyTargetSystem from './components/DailyTargetSystem';
// @ts-ignore
import fybotLogo from './assets/images/fybot_new_logo_1779835693847.png';
// @ts-ignore
import fybotLoginBg from './assets/images/fybot_robot_bg_v3.jpg';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

import {
  User,
  ReferralEarning,
  License,
  Payment,
  Trade,
  Stats,
  Config,
  Language
} from './types';
import { translations } from './translations';
import { safeFetch } from './utils';
import { LicenseCountdown, LicenseHeaderButton } from './components/LicenseCountdown';
import { NavItem } from './components/NavItem';
import { StatCard } from './components/StatCard';
import { StrategyGauge } from './components/StrategyGauge';
import { WeightControl } from './components/WeightControl';
import { StrategyMetric } from './components/StrategyMetric';
import { AffiliateLevel } from './components/AffiliateLevel';
import { Step } from './components/Step';
import { BenefitCard, BenefitItem } from './components/BenefitCard';
import { PricingCard } from './components/PricingCard';


/*
const _unused_translations = {
  en: {},
  pt: {},
  es: {
    common: {
      buyNow: "COMPRAR AHORA",
      proAccount: "CUENTA PRO",
      warning: "Aviso",
      recommended: "Recomendado"
    },
    sidebar: {
      dashboard: "Panel",
      strategies: "Estrategias",
      analytics: "Analítica",
      history: "Historial",
      licenses: "Activar Licencia",
      installation: "Instalación",
      affiliates: "Afiliados",
      admin: "Administración",
      settings: "Configuración",
      logout: "Salir"
    },
    header: {
      active: "Motor Activo",
      idle: "Motor Inactivo",
      equity: "Capital Total",
      stop: "PARAR FYBOT",
      start: "INICIAR FYBOT",
      locked: "🔒 SISTEMA BLOQUEADO",
      broker: "Corredor: MetaTrader 5 Cloud"
    },
    login: {
      subTitle: "Ingrese sus credenciales para acceder al panel v8.",
      email: "E-mail",
      password: "Contraseña",
      button: "ENTRAR AL SISTEMA",
      authorized: "Solo Personal Autorizado",
      noAccount: "¿No tienes una cuenta?",
      signUp: "Regístrate ahora",
      haveAccount: "¿Ya tienes una cuenta?",
      login: "Inicia sesión aquí",
      name: "Nombre Completo",
      registerButton: "CREAR CUENTA"
    },
    dashboard: {
      balance: "SALDO (CONTA REAL / DEMO)",
      dailyTargetLabel: "Meta Diaria (1% de la Banca)",
      dailyLossLabel: "Límite de Pérdida Diaria (10% de la Banca)",
      dailyProfitLabel: "Ganancia de Hoy",
      activeTrades: "Posiciones Activas",
      winrate: "Tasa de Acierto",
      stepByStep: "Paso a Paso",
      installV8: "Instalar Robot v8",
      fullGuide: "Guía Completa",
      signalIntel: "Inteligencia de Señal",
      signalDesc: "Motor de consenso multifactorial agregado",
      recentExecutions: "Ejecuciones Recentes",
      viewFull: "VER HISTORIAL COMPLETO",
      noTrades: "No se han ejecutado operaciones en la sesión actual",
      running: "EN CURSO",
      intelStatus: "Estado de Inteligencia",
      intelDesc: "La estrategia está sincronizada con los nodos de MetaTrader 5 Cloud. Las rutas de arbitraje en tiempo real están estrictamente restringidas por los parámetros de riesgo actuales.",
      adjustWeights: "Ajustar Pesos",
      smc: "Estructura SMC",
      momentum: "Impulso",
      aiBias: "Lógica de Sesgo de IA",
      licenseExpires: "LA LICENCIA EXPIRA EN",
      activeLicense: "LICENCIA ACTIVA",
      grantAccess: "Liberar Acceso",
      activateLicense: "Activar Licencia",
      enterKey: "Ingrese su Clave de Licencia",
      keyPlaceholder: "FY-XXXX-XXXX-XXXX",
      activate: "Activar",
      validating: "Validando...",
      successKey: "¡Licencia activada con éxito!",
      days: "Días",
      hrs: "Hrs",
      min: "Min",
      sec: "Seg",
      remaining: "restantes",
      status: "Estado"
    },
    strategies: {
      highAccuracy: "Alta Precisión",
      trendFollowing: "Seguidor de Tendencia",
      neuralInference: "Inferencia Neural",
      smcTitle: "Conceptos de Dinero Inteligente (SMC)",
      smcDesc: "Detección de Bloques de Órdenes Institucionales y mapeo de Liquidez",
      momTitle: "Motor de Impulso",
      momDesc: "Seguimiento de velocidad y divergencia RSI/Estocástico",
      aiTitle: "Sensor de Sesgo de IA",
      aiDesc: "Sentimiento multi-tiempo y análisis de clúster de volumen",
      consensusMap: "Mapa de Consenso del Algoritmo",
      structureAlign: "Alineación de Estructura",
      structureDesc: "SMC debe confirmar una Ruptura de Estructura (BOS) o Cambio de Carácter (CHoCH) en el intervalo de 15M antes de la calificación de la operación.",
      momentumThreshold: "Umbral de Impulso",
      momentumDesc: "El Motor de Impulso requiere un mínimo de 4 velas consecutivas en la dirección de la señal o una ruptura de alta volatilidad.",
      neuralConfidence: "Confianza Neural",
      neuralDesc: "La operación solo se autoriza si la puntuación de Sesgo de IA proporciona una probabilidad >60% para la continuación de la tendencia actual.",
      executionStatus: "Estado de Ejecución",
      scanningMsg: "Actualmente escaneando 24 pools de liquidez clave y 4 pares forex principales para configuraciones de alta probabilidad."
    },
    analytics: {
      winRate: "Tasa de Victoria",
      vsLastWeek: "vs última semana",
      profitFactor: "Factor de Beneficio",
      maxDrawdown: "Reducción Máxima",
      avgTradeTime: "Tiempo Promedio de Operación",
      equityCurve: "Curva de Equidad",
      performanceTrack: "Seguimiento del desempeño en los últimos 30 días de negociación",
      advancedMetrics: "Métricas Avanzadas",
      aiInsight: "Insight de IA",
      insightText: "El mercado está mostrando una fuerte acumulación en las regiones de liquidez institucional (SMC). Recomiendo aumentar el peso en XAUUSD y reducir la exposición en pares GBP en las próximas 48h.",
      viewFullAnalysis: "VER ANÁLISE COMPLETO"
    },
    plans: {
      title: "Elija su Licencia FYBOT",
      subTitle: "Active su robot y comience a operar automáticamente en el mercado internacional Forex.",
      card1Title: "Licencia Básica",
      card1Desc: "Ideal para principiantes que desean probar la tecnología SMC.",
      card1Features: ["Licencia de 30 días"],
      card2Title: "Licencia Pro",
      card2Desc: "El mejor valor para traders intermedios.",
      card2Features: ["Licencia de 60 días"],
      card3Title: "Institucional Pro",
      card3Desc: "Máximo rendimiento para capital profesional.",
      card3Features: ["Licencia de 90 días"],
      period: "DÍAS"
    },
    installation: {
      title: "🚀 Paso Inicial: Descargar su Robot",
      subTitle: "Versión v8 Professional — Compatible con MetaTrader 5",
      downEx5: "DESCARGAR .EX5 SOLO",
      downZip: "DESCARGAR PAQUETE COMPLETO (.ZIP)",
      step1: "Extraiga el .zip o guarde el archivo .ex5 en una carpeta accesible.",
      step2: "Abra MetaTrader 5, vaya a Archivo > Abrir Carpeta de Datos.",
      step3: "Navegue a MQL5 > Experts y pegue el archivo del robot allí.",
      step4: "Reinicie MT5, localice el robot en el Navegador y arrástrelo al gráfico."
    },
    settings: {
      accountFinance: "Cuenta y Finanzas",
      accountFinanceDesc: "Configure su identidad y dirección de retiro",
      fullName: "Nombre Completo",
      emailAddress: "Dirección de Correo",
      updatePassword: "Actualizar Contraseña",
      passwordPlaceholder: "Dejar en blanco para mantener la actual",
      usdtWallet: "Billetera USDT (BEP20)",
      walletPlaceholder: "0x...",
      updateProfileBtn: "ACTUALIZAR PERFIL",
      engineConfig: "Configuración del Motor",
      engineConfigDesc: "Parámetros de riesgo y consistencia en el trading",
      riskProfile: "Perfil de Riesgo",
      lotMultiplier: "Multiplicador de Lote",
      minConsensus: "Puntuación de Consenso Mínima",
      usdtReceiver: "Billetera Receptora de Pagos USDT BEP-20",
      saveConfigBtn: "GUARDAR CONFIGURACIÓN",
      strategyWeights: "Pesos del Sesgo de Estrategia",
      warningSMC: "Aviso",
      warningSMCDesc: "Inclinarse demasiado hacia el Impulso puede aumentar el drawdown durante las fases de consolidación. El equilibrio recomendado es de 40/40/20."
    },
    admin: {
      userManagement: "Gestión de Usuarios",
      userManagementDesc: "Administre los usuarios de FYBOT y el estado de sus cuentas",
      licenseRegistry: "Registro de Licencias",
      pendingVerification: "Verificación Pendiente",
      noPendingPayments: "No hay pagos pendientes para aprobación.",
      paymentHistoryLedger: "Libro de Historial de Pagos",
      transactionId: "ID de Transacción",
      user: "Usuario",
      amount: "Monto",
      method: "Método",
      status: "Estado",
      hash: "Hash"
    }
  }
};
*/







export default function App() {
  const [language, setLanguage] = useState<Language>('pt');
  const t = translations[language];

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [stats, setStats] = useState<Stats>({
    botRunning: false,
    balance: 10000,
    equity: 10000,
    activeTrades: 0,
    winrate: 0,
    pnlHistory: [],
    activeLicense: null,
    pendingPayment: null,
    dailyProfit: 0.00,
    dailyProfitTarget: 200.00, // 2% of initial balance ($10,000)
    dailyLossLimit: 1000.00, // 10% of initial balance
    dailyResetHour: "08:00",
    preferredSession: "London/NY",
    timezone: "UTC",
    antiOvertrading: true,
    systemBlocked: false
  });
  const [logs, setLogs] = useState<string[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [referralHistory, setReferralHistory] = useState<ReferralEarning[]>([]);
  const [referralNetwork, setReferralNetwork] = useState<any[]>([]);
  const [referralSubTab, setReferralSubTab] = useState<'earnings' | 'network'>('network');
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawWallet, setWithdrawWallet] = useState('');
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [withdrawalMessage, setWithdrawalMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [filterActiveNetworkOnly, setFilterActiveNetworkOnly] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [licenseCopied, setLicenseCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<any>(null);
  const [paymentHash, setPaymentHash] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginEmail, setLoginEmail] = useState('carlosnovaes296@gmail.com');
  const [loginPassword, setLoginPassword] = useState('password123');
  const [registerName, setRegisterName] = useState('');
  const [referredByCode, setReferredByCode] = useState('');
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [licenseKeyField, setLicenseKeyField] = useState('');
  const [licenseActivationError, setLicenseActivationError] = useState<string | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ type: 'user' | 'license'; id: string; displayLabel: string } | null>(null);
  const [selectedInterval, setSelectedInterval] = useState('5M');
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'7D' | '30D' | '90D' | 'ALL'>('30D');
  const [tradeFilter, setTradeFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [manualBalanceInput, setManualBalanceInput] = useState('');
  const [manualAccountType, setManualAccountType] = useState('REAL');

  const hasActiveLicense = licenses.some(l => l.userId === currentUser?.id && l.status === 'ACTIVE') || (stats.activeLicense && stats.activeLicense.status === 'ACTIVE');

  const chartDataMap = {
    '7D': [
      { name: 'Dia 1', value: 1000 },
      { name: 'Dia 2', value: 1060 },
      { name: 'Dia 3', value: 1110 },
      { name: 'Dia 4', value: 1090 },
      { name: 'Dia 5', value: 1180 },
      { name: 'Dia 6', value: 1250 },
      { name: 'Dia 7', value: 1320 },
    ],
    '30D': [
      { name: 'Dia 1', value: 1000 },
      { name: 'Dia 5', value: 1120 },
      { name: 'Dia 10', value: 1080 },
      { name: 'Dia 15', value: 1250 },
      { name: 'Dia 20', value: 1400 },
      { name: 'Dia 25', value: 1350 },
      { name: 'Dia 30', value: 1580 },
    ],
    '90D': [
      { name: 'Mês 1', value: 1000 },
      { name: 'Mês 1.5', value: 1250 },
      { name: 'Mês 2', value: 1580 },
      { name: 'Mês 2.5', value: 1840 },
      { name: 'Mês 3', value: 2150 },
    ],
    'ALL': [
      { name: 'Dez/25', value: 1000 },
      { name: 'Jan/26', value: 1450 },
      { name: 'Fev/26', value: 1850 },
      { name: 'Mar/26', value: 2400 },
      { name: 'Abr/26', value: 2980 },
      { name: 'Mai/26', value: 3750 },
    ],
  };

  const [profileForm, setProfileForm] = useState({
    name: 'Carlos Novaes',
    email: 'carlosnovaes296@gmail.com',
    password: '••••••••',
    wallet: '0x883a831511a1b71b4920cd32d3694ecef432b585',
    paymentWallet: '',
    mt5Login: '',
    mt5Password: '',
    mt5Server: ''
  });

  const [targetPaymentWallet, setTargetPaymentWallet] = useState<string>('');

  const fetchPaymentDestination = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/payment-destination?userId=${currentUser.id}&t=${Date.now()}`);
      const data = await res.json();
      if (data && data.wallet) {
        setTargetPaymentWallet(data.wallet);
      } else {
        setTargetPaymentWallet(config?.paymentWallet || '0x883a831511a1b71b4920cd32d3694ecef432b585');
      }
    } catch (e) {
      console.error(e);
      setTargetPaymentWallet(config?.paymentWallet || '0x883a831511a1b71b4920cd32d3694ecef432b585');
    }
  };

  const logContainerRef = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (currentUser) {
      setProfileForm({
        name: currentUser.name || '',
        email: currentUser.email || '',
        password: '••••••••',
        wallet: currentUser.wallet || '',
        paymentWallet: currentUser.paymentWallet || '',
        mt5Login: currentUser.mt5Login || '',
        mt5Password: currentUser.mt5Password || '',
        mt5Server: currentUser.mt5Server || ''
      });
      setWithdrawWallet(currentUser.wallet || '');
      fetchPaymentDestination();
    }
  }, [currentUser]);

  useEffect(() => {
    if (showPaymentModal && currentUser) {
      fetchPaymentDestination();
    }
  }, [showPaymentModal]);

  useEffect(() => {
    if (stats.systemBlocked && stats.blockedUntil) {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const target = new Date(stats.blockedUntil!).getTime();
        const diff = target - now;
        if (diff <= 0) {
          setTimeLeft('');
          clearInterval(interval);
        } else {
          const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const s = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeLeft('');
    }
  }, [stats.systemBlocked, stats.blockedUntil]);

  const fetchAdminData = async () => {
    if (!isLoggedIn || currentUser?.role !== 'ADMIN') return;
    const t = Date.now();
    const headers = { 'x-admin-userid': currentUser?.id || '' };
    const [uData, lData, pData, wData] = await Promise.all([
      safeFetch(`/api/admin/users?t=${t}`, { headers }),
      safeFetch(`/api/admin/licenses?t=${t}`, { headers }),
      safeFetch(`/api/admin/payments?t=${t}`, { headers }),
      safeFetch(`/api/withdrawals?userId=${currentUser?.id}&t=${t}`)
    ]);
    if (uData) setUsers(uData);
    if (lData) setLicenses(lData);
    if (pData) setPayments(pData);
    if (wData) setWithdrawals(wData);
  };

  const toggleUser = async (id: string) => {
    await fetch(`/api/admin/users/${id}/toggle`, {
      method: 'POST',
      headers: { 'x-admin-userid': currentUser?.id || '' }
    });
    fetchAdminData();
  };

  const grantAccess = async (id: string) => {
    await fetch(`/api/admin/users/${id}/grant-access`, {
      method: 'POST',
      headers: { 'x-admin-userid': currentUser?.id || '' }
    });
    fetchAdminData();
  };

  const grantLifetimeAccess = async (id: string) => {
    await fetch(`/api/admin/users/${id}/grant-lifetime-access`, {
      method: 'POST',
      headers: { 'x-admin-userid': currentUser?.id || '' }
    });
    fetchAdminData();
  };

  const deleteUser = async (id: string, name?: string) => {
    setDeleteConfirmModal({
      type: 'user',
      id,
      displayLabel: name || id
    });
  };

  const submitActivateLicense = async () => {
    if (!licenseKeyField) return;
    setLicenseActivationError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser?.id, key: licenseKeyField })
      });
      const data = await res.json();
      if (data.success) {
        setShowLicenseModal(false);
        setLicenseKeyField('');
        setLicenseActivationError(null);
        fetchStatus();
      } else {
        const errMap: Record<string, string> = {
          'LICENSE_BOUND_TO_OTHER_ACCOUNT': language === 'en'
            ? '🔒 This license is already active on another account. Each license can only be used by one account.'
            : language === 'es'
              ? '🔒 Esta licencia ya está activa en otra cuenta. Cada licencia solo puede usarse en una cuenta.'
              : '🔒 Esta licença já está ativa em outra conta. Cada licença pode ser usada em apenas uma conta.',
          'ALREADY_ACTIVE_ON_THIS_ACCOUNT': language === 'en'
            ? '✅ This license is already active on your account.'
            : language === 'es'
              ? '✅ Esta licencia ya está activa en tu cuenta.'
              : '✅ Esta licença já está ativa na sua conta.',
          'INVALID_KEY': language === 'en'
            ? '❌ Invalid license key. Check the key and try again.'
            : language === 'es'
              ? '❌ Clave de licencia inválida. Verifique la clave e intente de nuevo.'
              : '❌ Chave de licença inválida. Verifique a chave e tente novamente.',
          'MISSING_FIELDS': language === 'en'
            ? '❌ Please enter the license key.'
            : language === 'es'
              ? '❌ Por favor ingrese la clave de licencia.'
              : '❌ Por favor insira a chave de licença.',
        };
        setLicenseActivationError(errMap[data.error] || (language === 'en' ? '❌ Invalid or unavailable key.' : '❌ Chave inválida ou indisponível.'));
      }
    } catch (err) {
      console.error(err);
      setLicenseActivationError(language === 'en' ? '❌ Connection error. Try again.' : '❌ Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const approvePayment = async (id: string) => {
    await fetch(`/api/admin/payments/${id}/approve`, {
      method: 'POST',
      headers: { 'x-admin-userid': currentUser?.id || '' }
    });
    fetchAdminData();
  };

  const deleteLicense = async (id: string, key?: string) => {
    setDeleteConfirmModal({
      type: 'license',
      id,
      displayLabel: key || id
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmModal) return;
    const { type, id } = deleteConfirmModal;
    setDeleteConfirmModal(null);
    try {
      const endpoint = type === 'user' ? `/api/admin/users/${id}` : `/api/admin/licenses/${id}`;
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'x-admin-userid': currentUser?.id || '' }
      });
      if (res.ok) {
        fetchAdminData();
      } else {
        const errData = await res.json();
        const errMsg = errData.error || (type === 'user' ? 'Failed to delete user' : 'Failed to delete license');
        alert(errMsg);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleLicense = async (id: string) => {
    await fetch(`/api/admin/licenses/${id}/toggle`, {
      method: 'POST',
      headers: { 'x-admin-userid': currentUser?.id || '' }
    });
    fetchAdminData();
  };

  const rejectPayment = async (id: string) => {
    await fetch(`/api/admin/payments/${id}/reject`, {
      method: 'POST',
      headers: { 'x-admin-userid': currentUser?.id || '' }
    });
    fetchAdminData();
  };

  const approveWithdrawal = async (id: string) => {
    await fetch(`/api/admin/withdrawals/${id}/approve`, {
      method: 'POST',
      headers: { 'x-admin-userid': currentUser?.id || '' }
    });
    fetchAdminData();
  };

  const rejectWithdrawal = async (id: string) => {
    await fetch(`/api/admin/withdrawals/${id}/reject`, {
      method: 'POST',
      headers: { 'x-admin-userid': currentUser?.id || '' }
    });
    fetchAdminData();
  };

  const handleRequestWithdrawal = async (e: any) => {
    e.preventDefault();
    if (!currentUser) return;
    setWithdrawalLoading(true);
    setWithdrawalMessage(null);

    if (parseFloat(withdrawAmount) < 30) {
      setWithdrawalMessage({
        text: language === 'en' ? 'Minimum withdrawal is $30.00 USD.' : language === 'es' ? 'El retiro mínimo es de $30.00 USD.' : 'O saque mínimo permitido é de $30.00 USD.',
        isError: true
      });
      setWithdrawalLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          amount: withdrawAmount,
          wallet: withdrawWallet
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWithdrawAmount('');
        // Update user profile wallet state in frontend since server auto-updates it too
        setCurrentUser(prev => {
          if (!prev) return null;
          return { ...prev, wallet: withdrawWallet };
        });
        setWithdrawalMessage({
          text: language === 'en'
            ? 'Withdrawal request approved and processed automatically!'
            : language === 'es'
              ? '¡Solicitud de retiro procesada y aprobada automáticamente!'
              : 'Solicitação de saque aprovada e processada automaticamente!',
          isError: false
        });
        fetchReferrals();
      } else {
        setWithdrawalMessage({
          text: data.error || (language === 'en' ? 'Failed to submit withdrawal request.' : 'Erro ao processar solicitação de saque.'),
          isError: true
        });
      }
    } catch (e: any) {
      console.error(e);
      setWithdrawalMessage({
        text: language === 'en' ? 'Server connection error.' : 'Erro de conexão com o servidor.',
        isError: true
      });
    } finally {
      setWithdrawalLoading(false);
    }
  };

  const handleManualAdjust = async () => {
    if (!currentUser || !manualBalanceInput) return;
    setLoading(true);
    try {
      const balanceVal = parseFloat(manualBalanceInput);
      if (isNaN(balanceVal)) return;

      const res = await fetch('/api/balance/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          balance: balanceVal,
          equity: balanceVal,
          accountType: manualAccountType
        })
      });
      const data = await res.json();
      if (data.success) {
        setManualBalanceInput('');
        fetchStatus();
        alert(language === 'en' ? "Balance adjusted successfully!" : "Saldo ajustado com sucesso!");
      } else {
        alert(data.error || "Update failed");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profileForm, id: currentUser.id })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        alert(language === 'en' ? "Profile updated successfully!" : language === 'es' ? "¡Perfil actualizado!" : "Perfil atualizado com sucesso!");
      } else {
        alert(data.error || "Update failed");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatus = async () => {
    if (!isLoggedIn) return;
    const data = await safeFetch(`/api/status?t=${Date.now()}&userId=${currentUser?.id || ''}`);
    if (data) {
      setStats(data);
      if (data.logs) setLogs(data.logs);
      if (data.trades) setTrades(data.trades);
    }
  };

  const fetchConfig = async () => {
    if (!isLoggedIn) return;
    const data = await safeFetch(`/api/config?t=${Date.now()}`);
    if (data) {
      setConfig(data);
    }
  };

  const fetchWithdrawals = async () => {
    if (!isLoggedIn || !currentUser) return;
    const data = await safeFetch(`/api/withdrawals?userId=${currentUser.id}&t=${Date.now()}`);
    if (data) {
      setWithdrawals(data);
    }
  };

  const fetchReferrals = async () => {
    if (!isLoggedIn || !currentUser) return;
    const [historyData, networkData] = await Promise.all([
      safeFetch(`/api/referrals?userId=${currentUser.id}&t=${Date.now()}`),
      safeFetch(`/api/referrals/network?userId=${currentUser.id}&t=${Date.now()}`)
    ]);
    if (historyData) {
      setReferralHistory(historyData);
    }
    if (networkData) {
      setReferralNetwork(networkData);
    }
    fetchWithdrawals();
  };

  const saveConfig = async () => {
    if (!config) return;
    setLoading(true);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      alert(language === 'en' ? "Configuration saved successfully!" : language === 'es' ? "¡Configuración guardada exitosamente!" : "Configuração salva com sucesso!");
    } catch (e: any) {
      console.error("Failed to save config:", e.message || e);
    } finally {
      setLoading(false);
    }
  };

  const submitPayment = async () => {
    if (!paymentHash) {
      alert(language === 'en' ? "Please paste the transaction hash." : language === 'es' ? "Por favor pegue el hash de la transacción." : "Cole a hash da transação.");
      return;
    }
    setLoading(true);
    try {
      await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: showPaymentModal.price,
          method: 'USDT BEP20',
          hash: paymentHash,
          userId: currentUser?.id
        })
      });
      alert(language === 'en' ? "Payment submitted for verification. As soon as the administrator approves, your license will be activated!" : language === 'es' ? "¡Pago enviado para verificación. Tan pronto como el administrador apruebe, su licencia será activada!" : "Pagamento enviado para verificação. Assim que o administrador aprovar, sua licença será ativada!");
      setShowPaymentModal(null);
      setPaymentHash('');
      fetchAdminData();
      fetchStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        alert(language === 'en' ? "Server is starting up or temporarily unavailable. Please try again." : language === 'es' ? "El servidor se está iniciando o no está disponible temporalmente. Inténtalo de nuevo." : "O servidor está iniciando ou temporariamente indisponível. Tente novamente.");
        return;
      }
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        setIsLoggedIn(true);
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      console.error(e);
      alert(language === 'en' ? "Connection error. Please try again." : language === 'es' ? "Error de conexión. Inténtalo de nuevo." : "Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!registerName || !loginEmail || !loginPassword) {
      alert("Please fill all fields");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registerName,
          email: loginEmail,
          password: loginPassword,
          referredBy: referredByCode
        })
      });
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        alert(language === 'en' ? "Server is starting up or temporarily unavailable. Please try again." : language === 'es' ? "El servidor se está iniciando o no está disponible temporalmente. Inténtalo de nuevo." : "O servidor está iniciando ou temporariamente indisponível. Tente novamente.");
        return;
      }
      const data = await res.json();
      if (data.success) {
        alert(language === 'en' ? "Account created! Please login." : language === 'es' ? "¡Cuenta creada! Inicie sesión." : "Conta criada com sucesso! Por favor, faça login.");
        setIsSignUp(false);
        setReferredByCode('');
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      console.error(e);
      alert(language === 'en' ? "Connection error. Please try again." : language === 'es' ? "Error de conexión. Inténtalo de nuevo." : "Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const toggleBot = async () => {
    // If system is blocked by daily target, prevent starting the robot
    if (!stats.botRunning && stats.systemBlocked) {
      alert(
        language === 'en'
          ? "System locked! Your Daily Profit Target is already saved and secured on the VPS."
          : language === 'es'
            ? "¡Sistema bloqueado! Su meta de ganancias diarias ya está guardada y protegida en el VPS."
            : "Sistema Bloqueado! Sua meta de lucro diário já foi batida e está totalmente protegida no VPS. O sistema só aceita novos arranques após a virada do cronômetro diário."
      );
      return;
    }

    // Strict requirement: must have active license to start
    if (!stats.botRunning && !hasActiveLicense) {
      setActiveTab('plans');
      return;
    }

    setLoading(true);
    try {
      // Auto-sync removed as per requirements - sync is now fully manual

      const res = await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: stats.botRunning ? 'stop' : 'start',
          userId: currentUser?.id
        })
      });
      const data = await res.json();
      if (data.success) {
        setStats(prev => ({ ...prev, botRunning: data.botRunning }));
        fetchStatus();
      } else if (data.error === 'ACTIVE_LICENSE_REQUIRED') {
        setActiveTab('plans');
      } else {
        alert(data.error || "Failed to control bot");
      }
    } catch (e) {
      console.error("Failed to toggle bot", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) return;

    fetchStatus();
    fetchConfig();
    fetchReferrals();
    if (currentUser?.role === 'ADMIN') {
      fetchAdminData();
    }

    const interval = setInterval(() => {
      fetchStatus();
      fetchReferrals();
      if (currentUser?.role === 'ADMIN') {
        fetchAdminData();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isLoggedIn, currentUser?.role]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center lg:flex-row lg:justify-end lg:items-center lg:pr-20 xl:pr-32 p-4 sm:p-6 md:p-8 font-sans relative overflow-y-auto">
        {/* Floating Language Switcher for Login Screen */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-1 bg-[#050508]/75 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
          <button
            onClick={() => setLanguage('en')}
            title="English"
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all text-xs font-bold ${language === 'en'
              ? 'bg-[#ffbe1a] text-black shadow-md scale-110'
              : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
          >
            🇺🇸
          </button>
          <button
            onClick={() => setLanguage('pt')}
            title="Português"
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all text-xs font-bold ${language === 'pt'
              ? 'bg-[#ffbe1a] text-black shadow-md scale-110'
              : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
          >
            🇧🇷
          </button>
          <button
            onClick={() => setLanguage('es')}
            title="Español"
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all text-xs font-bold ${language === 'es'
              ? 'bg-[#ffbe1a] text-black shadow-md scale-110'
              : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
          >
            🇪🇸
          </button>
        </div>

        {/* Background Image with Full Realism and Visibility */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src={fybotLoginBg}
            alt="Futuristic Robot Background"
            className="w-full h-full object-cover object-top select-none pointer-events-none transition-all duration-1000 ease-out opacity-100"
            referrerPolicy="no-referrer"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-black/40 backdrop-blur-md border border-white/5 rounded-3xl p-5 sm:p-8 md:p-10 space-y-5 md:space-y-6 relative z-10 shadow-2xl my-6 md:my-0 mx-2 sm:mx-0"
        >
          <div className="text-center space-y-2 pb-1">
            <p className="text-white text-base font-extrabold tracking-wide [text-shadow:_0_2px_6px_rgba(0,0,0,1)]">{isSignUp ? (language === 'en' ? 'Create your professional account' : language === 'pt' ? 'Crie sua conta profissional' : 'Crea tu cuenta profesional') : t.login.subTitle}</p>
          </div>

          <div className="space-y-4">
            {isSignUp && (
              <>
                <div className="space-y-2">
                  <label className="text-[11px] uppercase font-black text-white tracking-widest pl-1 [text-shadow:_0_2px_4px_rgba(0,0,0,1)]">{t.login.name}</label>
                  <input
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full bg-[#ffbe1a] text-black border border-yellow-600 rounded-xl px-4 py-2.5 sm:py-3 text-sm font-bold focus:border-yellow-700 focus:ring-1 focus:ring-yellow-700 outline-none transition-all placeholder-black/50"
                  />
                </div>
                <div className="space-y-2 animate-fadeIn">
                  <label className="text-[11px] uppercase font-black text-white tracking-widest pl-1 [text-shadow:_0_2px_4px_rgba(0,0,0,1)]">
                    {language === 'en' ? 'Referral Code (Optional)' : language === 'es' ? 'Código de Referido (Opcional)' : 'Código de Indicação (Opcional)'}
                  </label>
                  <input
                    type="text"
                    value={referredByCode}
                    onChange={(e) => setReferredByCode(e.target.value)}
                    placeholder="Ex: CARLOS296"
                    className="w-full bg-[#ffbe1a] text-black border border-yellow-600 rounded-xl px-4 py-2.5 sm:py-3 text-sm font-bold focus:border-yellow-700 focus:ring-1 focus:ring-yellow-700 outline-none transition-all placeholder-black/40 uppercase font-mono"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <label className="text-[11px] uppercase font-black text-white tracking-widest pl-1 [text-shadow:_0_2px_4px_rgba(0,0,0,1)]">{t.login.email}</label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full bg-[#ffbe1a] text-black border border-yellow-600 rounded-xl px-4 py-2.5 sm:py-3 text-sm font-bold focus:border-yellow-700 focus:ring-1 focus:ring-yellow-700 outline-none transition-all placeholder-black/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] uppercase font-black text-white tracking-widest pl-1 [text-shadow:_0_2px_4px_rgba(0,0,0,1)]">{t.login.password}</label>
              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-[#ffbe1a] text-black border border-yellow-600 rounded-xl px-4 py-2.5 sm:py-3 text-sm font-bold focus:border-yellow-700 focus:ring-1 focus:ring-yellow-700 outline-none transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-black/60 hover:text-black transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={isSignUp ? handleRegister : handleLogin}
            disabled={loading}
            className="w-full py-3 sm:py-4 bg-[#ffbe1a] text-black hover:bg-yellow-400 rounded-2xl font-black text-sm transition-all shadow-xl shadow-yellow-500/20 active:scale-95 disabled:opacity-50 tracking-wider uppercase"
          >
            {loading ? <RefreshCw className="animate-spin mx-auto" size={20} /> : (isSignUp ? t.login.registerButton : t.login.button)}
          </button>

          <div className="text-center space-y-3 sm:space-y-4 pt-1">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full py-2.5 px-4 bg-[#ffbe1a] text-black hover:bg-yellow-400 font-black text-[11px] rounded-xl transition-all shadow-md tracking-wider uppercase inline-block text-center"
            >
              {isSignUp ? t.login.haveAccount : t.login.noAccount}{' '}
              <span className="underline font-black">{isSignUp ? t.login.login : t.login.signUp}</span>
            </button>
            <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold [text-shadow:_0_1px_4px_rgba(0,0,0,1)]">
              {t.login.authorized}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white font-sans selection:bg-blue-500/30">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-64 bg-[#0f0f12] border-r border-white/5 flex flex-col items-stretch z-50 transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="py-6 flex items-center justify-center gap-3 border-b border-white/5">
          {/* Expanded (Desktop): Brand Logo */}
          <div className="hidden md:flex items-center justify-center select-none">
            <img src="/fybot-logo.png.png" alt="Fybot Logo" className="h-28 object-contain scale-110" />
          </div>
          {/* Collapsed (Mobile/Tablet): Brand Logo */}
          <div className="md:hidden flex items-center justify-center select-none">
            <img src="/fybot-logo.png.png" alt="Fybot Logo" className="h-20 object-contain scale-110" />
          </div>
        </div>

        <nav className="flex-1 mt-6 px-4 space-y-2 overflow-y-auto scrollbar-hide">
          <div className="mb-4 px-4 py-2 border-b border-white/5 pb-4">
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-3">Language</p>
            <div className="flex gap-2">
              <button onClick={() => setLanguage('en')} title="English" className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${language === 'en' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20 scale-110 font-bold' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}>🇺🇸</button>
              <button onClick={() => setLanguage('pt')} title="Português" className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${language === 'pt' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20 scale-110 font-bold' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}>🇧🇷</button>
              <button onClick={() => setLanguage('es')} title="Español" className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${language === 'es' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20 scale-110 font-bold' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}>🇪🇸</button>
            </div>
          </div>

          <NavItem icon={<LayoutDashboard size={20} />} label={t.sidebar.dashboard} active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} />
          {currentUser?.role === 'ADMIN' && (
            <>
              <NavItem icon={<Activity size={20} />} label={t.sidebar.strategies} active={activeTab === 'strategies'} onClick={() => { setActiveTab('strategies'); setIsMobileMenuOpen(false); }} />
              <NavItem icon={<BarChart3 size={20} />} label={t.sidebar.analytics} active={activeTab === 'analytics'} onClick={() => { setActiveTab('analytics'); setIsMobileMenuOpen(false); }} />
            </>
          )}
          {/* History menu item removed by request */}
          <NavItem icon={<CreditCard size={20} />} label={t.sidebar.licenses} active={activeTab === 'plans'} onClick={() => { setActiveTab('plans'); setIsMobileMenuOpen(false); }} />
          <NavItem icon={<Share2 size={20} />} label={t.sidebar.affiliates} active={activeTab === 'affiliates'} onClick={() => { setActiveTab('affiliates'); setIsMobileMenuOpen(false); }} />
          {currentUser?.role === 'ADMIN' && (
            <NavItem icon={<UserCog size={20} />} label={t.sidebar.admin} active={activeTab === 'admin'} onClick={() => { setActiveTab('admin'); fetchAdminData(); setIsMobileMenuOpen(false); }} />
          )}
          <NavItem icon={<Settings size={20} />} label={t.sidebar.settings} active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }} />
          <div className="pt-4 mt-4 border-t border-white/5">
            <NavItem icon={<LogOut size={20} />} label={t.sidebar.logout} onClick={() => { setIsLoggedIn(false); setCurrentUser(null); setIsMobileMenuOpen(false); }} />
          </div>

        </nav>

        <div className="p-4 md:p-6 pb-10">
          <div className="mb-6 flex flex-col items-center gap-4">
            <a href="https://t.me/fybotpro_bot"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: '#0088cc',
                color: '#fff',
                padding: '18px 35px',
                textDecoration: 'none',
                borderRadius: '12px',
                fontWeight: 'bold',
                fontSize: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                textAlign: 'center'
              }}>
              <img src="/logo telegram.png" alt="Telegram" className="w-14 h-14 object-contain drop-shadow-md" />
              <span className="whitespace-nowrap">Fybot pro Telegram</span>
            </a>

            <a href="https://wa.me/5577999359309?text=Olá,%20sou%20membro%20do%20FYBOT%20PRO%20e%20preciso%20de%20ajuda."
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: '#25D366',
                color: '#fff',
                padding: '18px 35px',
                textDecoration: 'none',
                borderRadius: '12px',
                fontWeight: 'bold',
                fontSize: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                textAlign: 'center'
              }}>
              <img src="/logo zap.webp" alt="WhatsApp" className="w-14 h-14 object-contain drop-shadow-md" />
              <span className="whitespace-nowrap">Grupo Fybot WhatsApp</span>
            </a>
          </div>

          <div className="md:bg-white/5 rounded-2xl p-4 flex items-center gap-3 border border-white/5 hover:border-yellow-500/20 transition-all">
            <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 font-bold text-xs uppercase border border-yellow-500/20">
              {currentUser?.name?.split(' ').map(n => n[0]).join('') || 'U'}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-white/90">{currentUser?.name || 'User'}</p>
              <p className="text-[10px] text-yellow-500/70 font-semibold">{currentUser?.role === 'ADMIN' ? 'Administrator' : t.common.proAccount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="pl-0 md:pl-64 min-h-screen w-full overflow-x-hidden">
        {/* Modal: Activate License */}
        <AnimatePresence>
          {showLicenseModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowLicenseModal(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-[#16161a] border border-white/10 rounded-3xl p-8 shadow-2xl"
              >
                <button
                  onClick={() => setShowLicenseModal(false)}
                  className="absolute top-4 right-4 p-2 text-white/20 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center mb-8">
                  <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 mb-4">
                    <Key size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{t.dashboard.activateLicense}</h3>
                  <p className="text-sm text-white/40">{t.dashboard.enterKey}</p>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={t.dashboard.keyPlaceholder}
                      value={licenseKeyField}
                      onChange={(e) => setLicenseKeyField(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-white font-mono text-center tracking-widest focus:border-blue-500/50 outline-none transition-all"
                    />
                  </div>

                  {licenseActivationError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-xl text-sm font-medium border ${licenseActivationError.includes('✅')
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                        }`}
                    >
                      {licenseActivationError}
                    </motion.div>
                  )}


                  <button
                    onClick={submitActivateLicense}
                    disabled={loading || !licenseKeyField}
                    className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold uppercase tracking-widest shadow-lg shadow-blue-900/20 hover:bg-blue-500 transition-all disabled:opacity-50 active:scale-[0.98]"
                  >
                    {loading ? <RefreshCw className="animate-spin mx-auto" size={20} /> : t.dashboard.activate}
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {deleteConfirmModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDeleteConfirmModal(null)}
                className="absolute inset-0 bg-black/85 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-[#16161a] border border-red-500/15 rounded-3xl p-8 shadow-2xl shadow-red-950/20"
              >
                <button
                  onClick={() => setDeleteConfirmModal(null)}
                  className="absolute top-4 right-4 p-2 text-white/20 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mb-4 animate-pulse">
                    <Trash2 size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {deleteConfirmModal.type === 'user'
                      ? (language === 'en' ? 'Delete User' : language === 'es' ? 'Eliminar Usuario' : 'Excluir Usuário')
                      : (language === 'en' ? 'Delete License' : language === 'es' ? 'Eliminar Licencia' : 'Excluir Licença')
                    }
                  </h3>
                  <p className="text-sm text-white/60 leading-relaxed px-2">
                    {deleteConfirmModal.type === 'user'
                      ? (language === 'en'
                        ? `Are you sure you want to permanently delete the user "${deleteConfirmModal.displayLabel}"? This action cannot be undone.`
                        : language === 'es'
                          ? `¿Está seguro de que desea eliminar permanentemente al usuario "${deleteConfirmModal.displayLabel}"? Esta acción no se puede deshacer.`
                          : `Tem certeza que deseja excluir permanentemente o usuário "${deleteConfirmModal.displayLabel}"? Esta ação não pode ser desfeita.`)
                      : (language === 'en'
                        ? `Are you sure you want to permanently delete the license "${deleteConfirmModal.displayLabel}"? This action cannot be undone.`
                        : language === 'es'
                          ? `¿Está seguro de que desea eliminar permanentemente la licencia "${deleteConfirmModal.displayLabel}"? Esta acción no se puede deshacer.`
                          : `Tem certeza que deseja excluir permanentemente a licença "${deleteConfirmModal.displayLabel}"? Esta ação não pode ser desfeita.`)
                    }
                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setDeleteConfirmModal(null)}
                    className="flex-1 py-3.5 bg-white/5 text-white/80 rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-white/10 transition-colors"
                  >
                    {language === 'en' ? 'Cancel' : language === 'es' ? 'Cancelar' : 'Cancelar'}
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="flex-1 py-3.5 bg-red-600 text-white rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg shadow-red-900/40 hover:bg-red-500 transition-colors active:scale-[0.98]"
                  >
                    {language === 'en' ? 'Yes, Delete' : language === 'es' ? 'Sí, Eliminar' : 'Sim, Excluir'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {/* Header */}
        <header className="h-20 border-b border-white/5 px-4 md:px-8 flex items-center justify-between backdrop-blur-md bg-[#0a0a0c]/80 sticky top-0 z-40">
          <div className="flex items-center gap-3 md:gap-4">
            <button
              className="md:hidden p-2 text-white/70 hover:text-white"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <div className={`w-2 h-2 rounded-full ${stats.botRunning ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-xs font-medium text-white/70 uppercase tracking-widest">{stats.botRunning ? t.header.active : t.header.idle}</span>
            </div>
            <span className="hidden md:block text-white/20">|</span>
            <div className="hidden md:flex items-center gap-2">
              <ShieldCheck size={16} className="text-blue-400/60" />
              <span className="text-xs font-medium text-white/40">{t.header.broker}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex flex-col items-end mr-2">
              <span className="text-[10px] uppercase tracking-tighter text-white/30">{t.header.equity}</span>
              <span className="text-lg font-mono font-bold text-white">${stats.equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>

            <button
              onClick={async () => {
                setLoading(true);
                try {
                  const res = await fetch('/api/balance/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: currentUser?.id })
                  });
                  const data = await res.json();
                  if (data.success) {
                    fetchStatus();
                    alert(language === 'en' ? "Balance synced successfully with Exness (MT5)!" : "Saldo sincronizado com sucesso via MT5 (Exness)!");
                  } else {
                    alert("Sync error: " + (data.error || "Unknown"));
                  }
                } catch (e) { console.error(e); }
                finally { setLoading(false); }
              }}
              disabled={loading}
              className="hidden md:flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 text-blue-500 font-bold text-sm border border-blue-500/20 hover:bg-blue-500/20 transition-all shadow-xl shadow-blue-900/5 mr-2 disabled:opacity-50"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              <span className="hidden sm:inline">SYNC MT5</span>
            </button>
            <button
              onClick={toggleBot}
              disabled={loading || stats.systemBlocked}
              className={`flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 rounded-xl transition-all duration-300 font-bold text-sm shadow-xl ${stats.systemBlocked
                ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 cursor-not-allowed opacity-80 shadow-[0_0_15px_rgba(234,179,8,0.05)]'
                : stats.botRunning
                  ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 shadow-red-900/5'
                  : 'bg-white text-black hover:bg-white/90 shadow-white/5'
                }`}
            >
              {loading ? (
                <RefreshCw className="animate-spin" size={18} />
              ) : stats.systemBlocked ? (
                <>
                  <Lock size={18} className="text-yellow-500 animate-pulse" />
                  <span className="hidden sm:inline">{t.header.locked}</span>
                </>
              ) : stats.botRunning ? (
                <><Pause size={18} fill="currentColor" /> <span className="hidden sm:inline">{t.header.stop}</span></>
              ) : (
                <><Play size={18} fill="currentColor" /> <span className="hidden sm:inline">{t.header.start}</span></>
              )}
            </button>
          </div>
        </header>

        <div className="p-8 space-y-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {stats.systemBlocked && stats.blockedUntil && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-[#0f0f12] border border-yellow-500/20 rounded-3xl p-8 text-center text-yellow-500 mb-8 relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-50"></div>
                    <Lock size={40} className="mx-auto mb-4 animate-pulse opacity-80" />
                    <h2 className="text-2xl font-bold mb-2">META DIÁRIA ATINGIDA</h2>
                    <p className="text-sm opacity-60 mb-6 max-w-lg mx-auto">O robô atingiu a sua meta configurada e está protegendo o seu capital. As operações automáticas retornarão na próxima janela institucional.</p>

                    <div className="inline-flex flex-col items-center bg-black/40 border border-yellow-500/10 rounded-2xl px-10 py-6">
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-2">PRÓXIMA SESSÃO EM</span>
                      <div className="text-5xl font-black font-mono tracking-wider tabular-nums text-white">
                        {timeLeft || '00:00:00'}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Top Grid — Enhanced StatCards with sparklines */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard
                    label={`${t.dashboard.balance.replace(' (REAL / DEMO)', '').replace(' (CONTA REAL / DEMO)', '')} - ${stats.accountType === 'REAL' ? 'CONTA REAL' : stats.accountType === 'DEMO' ? 'CONTA DEMO' : 'OFFLINE'}`}
                    value={`$${stats.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    delta={language === "en" ? "Progressive" : language === "es" ? "Progresivo" : "Progressiva"}
                    icon={<Wallet className="text-blue-400" />}
                    trendPositive={true}
                    trend={stats.pnlHistory?.slice(-12).map((p: any) => p.balance) || [10000, 10100, 10080, 10250, 10400, 10350, 10580, 10720, 10690, 10850, 11000, 11200]}
                  />
                  <StatCard
                    label={t.dashboard.dailyTargetLabel}
                    value={`$${(stats.dailyProfitTarget || (stats.balance * 0.02)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    delta="2.0%"
                    icon={<Target className="text-yellow-400" />}
                    trendPositive={true}
                    trend={[10, 12, 11, 14, 13, 15, 16, 14, 17, 18, 20, 19]}
                  />
                  {(() => {
                    const realTimeProfit = stats.dailyProfit || 0;
                    return (
                      <StatCard
                        label={t.dashboard.dailyProfitLabel}
                        value={`${realTimeProfit >= 0 ? '+' : '-'}$${Math.abs(realTimeProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        delta={realTimeProfit && realTimeProfit >= (stats.dailyProfitTarget || (stats.balance * 0.02)) ? "100%" : `${Math.round((realTimeProfit / (stats.dailyProfitTarget || (stats.balance * 0.02) || 200)) * 100)}%`}
                        icon={<TrendingUp className="text-emerald-400" />}
                        valueClassName={realTimeProfit >= 0 ? "text-emerald-400" : "text-red-400"}
                        trendPositive={realTimeProfit >= 0}
                      />
                    );
                  })()}
                  {stats.activeLicense?.expiryDate ? (
                    <LicenseCountdown expiryDate={stats.activeLicense.expiryDate} t={t} licenseKey={stats.activeLicense.key} />
                  ) : stats.pendingPayment ? (
                    <div
                      onClick={() => setActiveTab('plans')}
                      className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 cursor-pointer hover:bg-amber-500/20 transition-all group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Clock size={48} className="text-amber-400" />
                      </div>
                      <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">{t.admin.pendingVerification}</p>
                      <p className="text-lg font-bold text-white mb-2">
                        {language === 'en' ? 'Awaiting Verification' : language === 'es' ? 'Verificación Pendiente' : 'Aguardando Verificação'}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] text-amber-300 font-bold uppercase">
                        {language === 'en' ? 'Check Plans & Status' : language === 'es' ? 'Ver Planes y Estado' : 'Ver Planos e Status'} <ArrowRight size={10} />
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => setActiveTab('plans')}
                      className="bg-red-500/10 border border-red-500/20 rounded-3xl p-6 cursor-pointer hover:bg-red-500/20 transition-all group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <CreditCard size={48} className="text-red-400" />
                      </div>
                      <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">
                        {language === 'en' ? 'License Required' : language === 'es' ? 'Licencia Requerida' : 'Licença Requerida'}
                      </p>
                      <p className="text-lg font-bold text-white mb-2">
                        {language === 'en' ? 'No Active License' : language === 'es' ? 'Sin Licencia Activa' : 'Sem Licença Ativa'}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] text-red-300 font-bold uppercase">
                        {language === 'en' ? 'Acquire License' : language === 'es' ? 'Adquirir Licencia' : 'Adquirir Licença'} <ArrowRight size={10} />
                      </div>
                    </div>
                  )}
                </div>

                <DailyTargetSystem stats={stats} language={language} fetchStatus={fetchStatus} isAdmin={currentUser?.role === 'ADMIN'} userId={currentUser?.id} />

                {/* Signal Intel + Live Console */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                  {/* Market Stream — enhanced chart */}
                  <div className="lg:col-span-2 flex flex-col">
                    <div className="bg-[#0f0f12] border border-white/5 rounded-3xl overflow-hidden p-6 h-full flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-lg font-bold">{t.dashboard.signalIntel}</h2>
                          <p className="text-xs text-white/40">{t.dashboard.signalDesc}</p>
                        </div>
                        <div className="flex gap-2">
                          {['1M', '5M', '1H'].map((interval) => (
                            <button
                              key={interval}
                              onClick={() => setSelectedInterval(interval)}
                              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${selectedInterval === interval
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.15)]'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                                }`}
                            >
                              {interval}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Live price tickers */}
                      <div className="flex gap-3 mb-4">
                        {[
                          { sym: 'XAUUSD', base: 2335.40, color: '#f59e0b' }
                        ].map(({ sym, base, color }, i) => {
                          const tickDelta = ((tick + i * 3) % 20) * 0.0001 - 0.001;
                          const price = (base + tickDelta).toFixed(sym === 'XAUUSD' ? 2 : 5);
                          const isUp = tickDelta >= 0;
                          return (
                            <motion.div
                              key={sym}
                              className="flex-1 bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3 relative overflow-hidden"
                              animate={{ borderColor: isUp ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }}
                              transition={{ duration: 0.5 }}
                            >
                              <div className="absolute inset-x-0 bottom-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}40, transparent)` }} />
                              <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color }}>{sym}</p>
                              <p className="text-sm font-mono font-black text-white">{price}</p>
                              <p className={`text-[10px] font-mono font-bold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                                {isUp ? '+' : ''}{tickDelta.toFixed(5)}
                              </p>
                            </motion.div>
                          );
                        })}
                      </div>

                      {/* Main chart area */}
                      <div className="flex-1 min-h-[200px] relative bg-[#07070a] rounded-2xl border border-white/5 overflow-hidden">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={stats.pnlHistory.length > 1 ? stats.pnlHistory : [
                            { time: '', balance: stats.balance * 0.95 },
                            { time: '', balance: stats.balance * 0.97 },
                            { time: '', balance: stats.balance * 0.96 },
                            { time: '', balance: stats.balance * 0.98 },
                            { time: '', balance: stats.balance * 0.99 },
                            { time: '', balance: stats.balance },
                          ]} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                            <defs>
                              <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#0f0f12', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px', padding: '8px 12px' }}
                              itemStyle={{ color: '#60a5fa' }}
                              labelStyle={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}
                              formatter={(v: any) => [`$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Balance']}
                            />
                            <Area
                              type="monotone"
                              dataKey="balance"
                              stroke="#3b82f6"
                              fillOpacity={1}
                              fill="url(#colorPnL)"
                              strokeWidth={2}
                              dot={false}
                            />
                          </AreaChart>
                        </ResponsiveContainer>

                        {/* Volume bars overlay at bottom */}
                        <div className="absolute bottom-0 left-0 right-0 h-8 flex items-end gap-px px-2 opacity-30 pointer-events-none">
                          {Array.from({ length: 40 }, (_, i) => (
                            <div
                              key={i}
                              className="flex-1 rounded-t-sm"
                              style={{
                                height: `${15 + Math.abs(Math.sin(i * 0.8 + tick * 0.05)) * 85}%`,
                                backgroundColor: i % 3 === 0 ? '#ef4444' : '#10b981',
                                opacity: 0.5 + Math.abs(Math.sin(i * 0.4)) * 0.5
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Strategy Gauges — circular */}
                      <div className="mt-6 grid grid-cols-3 gap-4">
                        <StrategyGauge label={t.dashboard.smc} percentage={stats.liveSignals?.smc || 80} color="#3b82f6" />
                        <StrategyGauge label={t.dashboard.momentum} percentage={stats.liveSignals?.momentum || 70} color="#10b981" />
                        <StrategyGauge label={t.dashboard.aiBias} percentage={stats.liveSignals?.ai || 90} color="#8b5cf6" />
                      </div>
                    </div>
                  </div>

                  {/* Sidebar — Enhanced Live Console */}
                  <div className="flex flex-col">
                    <div className="bg-[#0f0f12] border border-white/5 rounded-3xl overflow-hidden flex flex-col flex-1 min-h-[450px] lg:min-h-0">
                      {/* Terminal header */}
                      <div className="bg-[#0a0a0d] px-5 py-3.5 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60 animate-pulse" />
                          </div>
                          <Terminal size={13} className="text-emerald-500/60" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">FYBOT Live Console</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            <span className="text-[9px] font-mono text-emerald-500/70 font-bold">{logs.length} LOGS</span>
                          </div>
                          {logs.length > 0 && (
                            <button
                              onClick={() => setLogs([])}
                              title={language === 'en' ? 'Clear logs' : language === 'es' ? 'Limpiar logs' : 'Limpar logs'}
                              className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/5 text-white/30 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 transition-all group"
                            >
                              <Trash2 size={10} className="group-hover:scale-110 transition-transform" />
                              <span className="text-[8px] font-bold uppercase tracking-wider hidden sm:inline">
                                {language === 'en' ? 'Clear' : language === 'es' ? 'Limpiar' : 'Limpar'}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>


                      {/* Log entries with categories */}
                      <div
                        ref={logContainerRef}
                        className="flex-1 p-4 font-mono text-[10.5px] leading-relaxed space-y-1 overflow-y-auto scrollbar-hide"
                        style={{ background: 'linear-gradient(180deg, #080810 0%, #0a0a0f 100%)' }}
                      >
                        {logs.length === 0 && (
                          <div className="flex items-center gap-2 text-white/20 py-4">
                            <span className="text-emerald-500/40">$</span>
                            <span className="animate-pulse">Aguardando eventos do sistema...</span>
                          </div>
                        )}
                        {logs.map((log, i) => {
                          const isGain = log.includes('✅') || log.includes('CLOSED') || log.includes('META') || log.includes('COMISSÃO');
                          const isLoss = log.includes('❌') || log.includes('PERDA') || log.includes('LIMITE');
                          const isSystem = log.includes('⚙️') || log.includes('CONFIG') || log.includes('STARTED') || log.includes('STOPPED');
                          const isLock = log.includes('🔒') || log.includes('BLOQUEADO') || log.includes('BLOCKED');
                          const isSignal = log.includes('SIGNAL') || log.includes('INDICADO');
                          const isLatest = i === logs.length - 1;

                          let iconEl = <span className="text-white/20 shrink-0">›</span>;
                          let textColor = 'text-white/40';

                          if (isGain) { iconEl = <span className="shrink-0">✅</span>; textColor = 'text-emerald-400'; }
                          else if (isLoss) { iconEl = <span className="shrink-0">❌</span>; textColor = 'text-red-400'; }
                          else if (isLock) { iconEl = <span className="shrink-0">🔒</span>; textColor = 'text-yellow-400'; }
                          else if (isSystem) { iconEl = <span className="shrink-0">⚙️</span>; textColor = 'text-blue-400'; }
                          else if (isSignal) { iconEl = <span className="shrink-0">📡</span>; textColor = 'text-indigo-400'; }

                          return (
                            <motion.div
                              key={`${i}-${log.slice(0, 10)}`}
                              initial={isLatest ? { opacity: 0, x: -8 } : { opacity: 1 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.25 }}
                              className={`flex gap-2 py-0.5 ${isLatest ? 'bg-white/[0.025] -mx-1 px-1 rounded' : ''}`}
                            >
                              <span className="text-white/15 shrink-0 font-mono text-[9px] pt-px">[{String(i).padStart(2, '0')}]</span>
                              {iconEl}
                              <span className={`flex-1 break-words ${textColor} ${isLatest ? 'font-medium' : ''}`}>{log}</span>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Intelligence Status — Enhanced with connection nodes */}
                <div className="bg-gradient-to-br from-indigo-950/60 via-blue-950/40 to-[#0f0f12] border border-indigo-500/10 rounded-3xl p-8 relative overflow-hidden group w-full">
                  {/* Animated grid bg */}
                  <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 blur-3xl rounded-full pointer-events-none -mr-16 -mt-16" />

                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                            <Zap size={12} className="text-blue-400" />
                          </div>
                          <h3 className="text-sm font-bold text-white">{t.dashboard.intelStatus}</h3>
                        </div>
                        <p className="text-xs text-white/40 leading-relaxed max-w-lg">{t.dashboard.intelDesc}</p>
                      </div>

                      {/* Animated connection nodes */}
                      <div className="hidden lg:flex items-center gap-2">
                        {['VPS-1', 'MT5', 'API'].map((node, ni) => (
                          <div key={node} className="flex items-center gap-2">
                            <div className="flex flex-col items-center gap-2">
                              <motion.div
                                animate={{ opacity: [0.6, 1, 0.6], scale: [0.95, 1.05, 0.95] }}
                                transition={{ duration: 2, repeat: Infinity, delay: ni * 0.6 }}
                                className="w-16 h-16 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                              >
                                <Network size={28} className="text-emerald-400" />
                              </motion.div>
                              <span className="text-[10px] font-mono font-black text-emerald-400">{node}</span>
                            </div>
                            {ni < 2 && (
                              <div className="flex gap-1.5 mx-2">
                                {[0, 1, 2].map(dot => (
                                  <motion.div
                                    key={dot}
                                    animate={{ opacity: [0.1, 1, 0.1] }}
                                    transition={{ duration: 1.2, repeat: Infinity, delay: ni * 0.4 + dot * 0.15 }}
                                    className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Metrics strip */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                      {[
                        { label: language === 'en' ? 'VPS Latency' : 'Latência VPS', value: `${(0.8 + (tick % 10) * 0.04).toFixed(1)}ms`, color: 'text-emerald-400', good: true },
                        { label: language === 'en' ? 'Signals Analyzed' : 'Sinais Analisados', value: `${1240 + (tick % 30) * 3}`, color: 'text-blue-400', good: true },
                        { label: language === 'en' ? 'Consensus Score' : 'Score Consenso', value: '87%', color: 'text-purple-400', good: true },
                        { label: language === 'en' ? 'Uptime' : 'Uptime VPS', value: '99.9%', color: 'text-yellow-400', good: true },
                      ].map(({ label, value, color, good }) => (
                        <div key={label} className="bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2.5 flex flex-col gap-0.5">
                          <span className="text-[9px] text-white/30 font-bold uppercase tracking-wider">{label}</span>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-base font-mono font-black ${color}`}>{value}</span>
                            {good && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                          </div>
                        </div>
                      ))}
                    </div>

                    {currentUser?.role === 'ADMIN' && (
                      <button
                        onClick={() => setActiveTab('settings')}
                        className="w-full py-3 bg-white/5 hover:bg-indigo-500/10 border border-white/5 hover:border-indigo-500/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 text-white/60 hover:text-white"
                      >
                        <Settings size={14} />
                        {t.dashboard.adjustWeights}
                      </button>
                    )}
                  </div>
                </div>

                {/* Order Execution Table — Enhanced with filter + highlight */}
                <div className="bg-[#0f0f12] border border-white/5 rounded-3xl p-6 w-full flex flex-col">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-bold flex items-center gap-2 uppercase tracking-widest text-base text-white/60">
                      <History size={16} /> {t.dashboard.recentExecutions}
                    </h3>
                    <div className="flex items-center gap-3">
                      {/* Filter tabs */}
                      <div className="flex bg-white/5 rounded-xl p-0.5 border border-white/5">
                        {(['ALL', 'OPEN', 'CLOSED'] as const).map(f => (
                          <button
                            key={f}
                            onClick={() => setTradeFilter(f)}
                            className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${tradeFilter === f
                              ? f === 'OPEN' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                : f === 'CLOSED' ? 'bg-white/10 text-white'
                                  : 'bg-white/10 text-white'
                              : 'text-white/30 hover:text-white/60'
                              }`}
                          >
                            {f === 'ALL' ? (language === 'en' ? 'All' : 'Todos')
                              : f === 'OPEN' ? (language === 'en' ? 'Open' : 'Abertas')
                                : (language === 'en' ? 'Closed' : 'Fechadas')}
                          </button>
                        ))}
                      </div>
                      {/* "VER HISTÓRICO COMPLETO" button removed by request */}
                    </div>
                  </div>

                  <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="border-b border-white/5 text-sm uppercase tracking-wider text-emerald-400 font-bold">
                          <th className="pb-3 font-bold">{language === 'en' ? 'Exec ID' : 'ID Exec.'}</th>
                          <th className="pb-3 font-bold">{language === 'en' ? 'Asset' : 'Ativo'}</th>
                          <th className="pb-3 font-bold">{language === 'en' ? 'Type' : 'Tipo'}</th>
                          <th className="pb-3 font-bold">Lot</th>
                          <th className="pb-3 font-bold">{language === 'en' ? 'Price' : 'Preço'}</th>
                          <th className="pb-3 font-bold text-emerald-400">{language === 'en' ? 'Time' : 'Hora'}</th>
                          <th className="pb-3 font-bold">{language === 'en' ? 'Status' : 'Status'}</th>
                          <th className="pb-3 font-bold text-right">P&L</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03]">
                        {(() => {
                          const filtered = trades.filter(tr =>
                            tradeFilter === 'ALL' ? true : tr.status === tradeFilter
                          );
                          if (filtered.length === 0) return (
                            <tr>
                              <td colSpan={8} className="py-10 text-center text-sm text-white/20 italic">
                                {t.dashboard.noTrades}
                              </td>
                            </tr>
                          );
                          const maxAbsProfit = Math.max(...filtered.filter(t => t.profit).map(t => Math.abs(t.profit!)), 1);
                          return filtered.slice(0, 15).map((trade, idx) => {
                            const isLatestTrade = idx === 0;
                            const profitPct = trade.profit ? (Math.abs(trade.profit) / maxAbsProfit) * 100 : 0;
                            const isProfit = (trade.profit ?? 0) >= 0;
                            return (
                              <motion.tr
                                key={trade.id}
                                initial={isLatestTrade ? { backgroundColor: 'rgba(59,130,246,0.05)' } : {}}
                                animate={{ backgroundColor: 'rgba(255,255,255,0)' }}
                                transition={{ duration: 2 }}
                                className="text-sm text-white/80 hover:bg-white/[0.02] transition-colors group"
                              >
                                <td className="py-3.5 font-mono text-white/30">
                                  {isLatestTrade && (
                                    <span className="inline-block w-1 h-1 rounded-full bg-blue-400 mr-1.5 animate-pulse" />
                                  )}
                                  {trade.id}
                                </td>
                                <td className="py-3.5 font-black text-white">{trade.symbol}</td>
                                <td className="py-3.5">
                                  <span className={`px-2 py-0.5 rounded-md text-sm font-black ${trade.type === 'BUY'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                    }`}>
                                    {trade.type}
                                  </span>
                                </td>
                                <td className="py-3.5 font-mono text-white/50">{trade.lot}</td>
                                <td className="py-3.5 font-mono text-white/70">{trade.openPrice.toFixed(5)}</td>
                                <td className="py-3.5 text-emerald-400 text-sm font-bold font-mono">
                                  {new Date(trade.time).toLocaleString(language === 'pt' ? 'pt-BR' : language === 'es' ? 'es-ES' : 'en-US', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="py-3.5">
                                  {trade.status === 'CLOSED' ? (
                                    <span className="text-white/30 text-sm uppercase font-bold tracking-wider">● Closed</span>
                                  ) : (
                                    <span className="flex items-center gap-1.5 text-emerald-400 text-sm uppercase font-black tracking-wider">
                                      <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                      </span>
                                      Live
                                    </span>
                                  )}
                                </td>
                                <td className="py-3.5 text-right">
                                  {trade.profit != null ? (
                                    <div className="flex flex-col items-end gap-1">
                                      <span className={`font-mono font-black text-sm ${isProfit ? 'text-emerald-400' : 'text-red-400'
                                        }`}>
                                        {isProfit ? '+' : ''}${trade.profit.toFixed(2)}
                                      </span>
                                      {/* Mini P&L bar */}
                                      <div className="w-16 h-0.5 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                          initial={{ width: 0 }}
                                          animate={{ width: `${profitPct}%` }}
                                          transition={{ duration: 0.8, ease: 'easeOut' }}
                                          className={`h-full rounded-full ${isProfit ? 'bg-emerald-500' : 'bg-red-500'}`}
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-white/20 font-mono">—</span>
                                  )}
                                </td>
                              </motion.tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>


              </motion.div>
            )}

            {activeTab === 'strategies' && currentUser?.role === 'ADMIN' && (
              <motion.div
                key="strategies"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* SMC Strategy Card */}
                  <div className="bg-[#0f0f12] border border-white/5 rounded-3xl p-8 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <Target size={24} />
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md tracking-widest uppercase">{t.strategies.highAccuracy}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{t.strategies.smcTitle}</h3>
                      <p className="text-sm text-white/40 mt-1">{t.strategies.smcDesc}</p>
                    </div>
                    <div className="space-y-4 pt-4 border-t border-white/5">
                      <StrategyMetric label={language === 'en' ? "Order Block Strength" : language === 'es' ? "Fuerza del Bloque de Órdenes" : "Força do Bloco de Ordem"} value={language === 'en' ? "Significant" : language === 'es' ? "Significativo" : "Significativo"} color="text-blue-400" />
                      <StrategyMetric label={language === 'en' ? "Fair Value Gaps" : language === 'es' ? "Brechas de Valor Justo" : "Gaps de Valor Justo"} value="Detected (M15)" color="text-emerald-400" />
                      <StrategyMetric label={language === 'en' ? "Market Structure" : language === 'es' ? "Estructura del Mercado" : "Estrutura de Mercado"} value={language === 'en' ? "Bullish Breakout" : language === 'es' ? "Ruptura Alcista" : "Rompimento de Alta"} color="text-emerald-400" />
                      <StrategyMetric label={language === 'en' ? "Liquidity Zones" : language === 'es' ? "Zonas de Liquidez" : "Zonas de Liquidez"} value="Cleared @ 1.0820" color="text-white/60" />
                    </div>
                  </div>

                  {/* Momentum Strategy Card */}
                  <div className="bg-[#0f0f12] border border-white/5 rounded-3xl p-8 space-y-6 text-indigo-400">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                        <TrendingUp size={24} />
                      </div>
                      <span className="text-[10px] font-bold text-indigo-400 bg-indigo-400/10 px-2 py-1 rounded-md tracking-widest uppercase">{t.strategies.trendFollowing}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{t.strategies.momTitle}</h3>
                      <p className="text-sm text-white/40 mt-1">{t.strategies.momDesc}</p>
                    </div>
                    <div className="space-y-4 pt-4 border-t border-white/5">
                      <StrategyMetric label="RSI Vector" value="68.4 (Strong)" color="text-indigo-400" />
                      <StrategyMetric label="MACD Cross" value="Confirmed" color="text-emerald-400" />
                      <StrategyMetric label={language === 'en' ? "Volatility (ATR)" : language === 'es' ? "Volatilidad (ATR)" : "Volatilidade (ATR)"} value="12.4 Pips" color="text-white/60" />
                      <StrategyMetric label="ADX Strength" value="Very High" color="text-emerald-400" />
                    </div>
                  </div>

                  {/* AI Bias Card */}
                  <div className="bg-[#0f0f12] border border-white/5 rounded-3xl p-8 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <Zap size={24} />
                      </div>
                      <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md tracking-widest uppercase">{t.strategies.neuralInference}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{t.strategies.aiTitle}</h3>
                      <p className="text-sm text-white/40 mt-1">{t.strategies.aiDesc}</p>
                    </div>
                    <div className="space-y-4 pt-4 border-t border-white/5">
                      <StrategyMetric label={language === 'en' ? "Consensus" : language === 'es' ? "Consenso" : "Consenso"} value="Strong Bullish" color="text-emerald-400" />
                      <StrategyMetric label={language === 'en' ? "Volume Profile" : language === 'es' ? "Perfil de Volumen" : "Perfil de Volume"} value="High Rel (POC)" color="text-amber-400" />
                      <StrategyMetric label={language === 'en' ? "Session Bias" : language === 'es' ? "Sesgo de Sesión" : "Viés da Sessão"} value="NY Expansion" color="text-white/60" />
                      <StrategyMetric label={language === 'en' ? "News Filter" : language === 'es' ? "Filtro de Noticias" : "Filtro de Notícias"} value={language === 'en' ? "Clean / No Impact" : language === 'es' ? "Limpio / Sin Impacto" : "Limpo / Sem Impacto"} color="text-emerald-400" />
                    </div>
                  </div>
                </div>

                {/* Consensus Rules */}
                <div className="bg-[#0f0f12] border border-white/5 rounded-3xl p-8">
                  <h3 className="text-lg font-bold mb-6">{t.strategies.consensusMap}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 text-xs font-bold">1</div>
                        <div>
                          <p className="font-bold text-sm">{t.strategies.structureAlign}</p>
                          <p className="text-xs text-white/40 mt-1 leading-relaxed">{t.strategies.structureDesc}</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 text-xs font-bold">2</div>
                        <div>
                          <p className="font-bold text-sm">{t.strategies.momentumThreshold}</p>
                          <p className="text-xs text-white/40 mt-1 leading-relaxed">{t.strategies.momentumDesc}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 text-xs font-bold">3</div>
                        <div>
                          <p className="font-bold text-sm">{t.strategies.neuralConfidence}</p>
                          <p className="text-xs text-white/40 mt-1 leading-relaxed">{t.strategies.neuralDesc}</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 w-full">
                          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">{t.strategies.executionStatus}</p>
                          <p className="text-xs text-emerald-100/60">{t.strategies.scanningMsg}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'analytics' && currentUser?.role === 'ADMIN' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Header Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-[#0f0f12] border border-white/5 p-6 rounded-3xl">
                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1">{t.analytics.winRate}</p>
                    <p className="text-2xl font-black text-emerald-400">74.2%</p>
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-400/60">
                      <TrendingUp size={12} /> +2.4% {t.analytics.vsLastWeek}
                    </div>
                  </div>
                  <div className="bg-[#0f0f12] border border-white/5 p-6 rounded-3xl">
                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1">{t.analytics.profitFactor}</p>
                    <p className="text-2xl font-black text-blue-400">2.84</p>
                    <p className="mt-2 text-[10px] text-white/20">Optimal: {'>'} 1.50</p>
                  </div>
                  <div className="bg-[#0f0f12] border border-white/5 p-6 rounded-3xl">
                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1">{t.analytics.maxDrawdown}</p>
                    <p className="text-2xl font-black text-red-400">4.12%</p>
                    <p className="mt-2 text-[10px] text-white/20">Risk Profile: Aggressive</p>
                  </div>
                  <div className="bg-[#0f0f12] border border-white/5 p-6 rounded-3xl">
                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1">{t.analytics.avgTradeTime}</p>
                    <p className="text-2xl font-black text-purple-400">42m</p>
                    <p className="mt-2 text-[10px] text-white/20">Style: Scalping</p>
                  </div>
                </div>

                {/* Main Profit Chart */}
                <div className="bg-[#0f0f12] border border-white/5 rounded-[40px] p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-bold">{t.analytics.equityCurve}</h3>
                      <p className="text-xs text-white/40">{t.analytics.performanceTrack}</p>
                    </div>
                    <div className="flex gap-2">
                      {['7D', '30D', '90D', 'ALL'].map(p => (
                        <button
                          key={p}
                          onClick={() => setAnalyticsPeriod(p as any)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${analyticsPeriod === p ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartDataMap[analyticsPeriod]}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                          tickFormatter={(v) => `$${v}`}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#141418', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Advanced Ratios */}
                  <div className="bg-[#0f0f12] border border-white/5 rounded-3xl p-8">
                    <h3 className="text-lg font-bold mb-6">{t.analytics.advancedMetrics}</h3>
                    <div className="grid grid-cols-2 gap-y-6 gap-x-12">
                      <div className="space-y-1">
                        <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest">Sharpe Ratio</p>
                        <p className="text-xl font-bold">1.92</p>
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 w-[60%]" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest">Expectancy</p>
                        <p className="text-xl font-bold">+$12.40</p>
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 w-[80%]" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest">Recovery Factor</p>
                        <p className="text-xl font-bold">14.2</p>
                        <p className="text-[10px] text-white/20">Excellent stability</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest">SQN Score</p>
                        <p className="text-xl font-bold">5.8</p>
                        <p className="text-[10px] text-emerald-400 font-bold tracking-tighter">Holy Grail territory</p>
                      </div>
                    </div>
                  </div>

                  {/* AI Performance Card */}
                  <div className="relative bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-white/10 rounded-3xl p-8 overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 transition-transform">
                      <Zap size={120} className="text-white" />
                    </div>
                    <div className="relative z-10">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 mb-6">
                        <Activity size={12} className="text-white" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-widest">AI Sensing Enabled</span>
                      </div>
                      <h3 className="text-2xl font-bold mb-4">{t.analytics.aiInsight}</h3>
                      <p className="text-white/70 text-sm leading-relaxed mb-6">
                        "{t.analytics.insightText}"
                      </p>
                      <button className="flex items-center gap-2 text-xs font-bold text-white hover:gap-4 transition-all">
                        {t.analytics.viewFullAnalysis} <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'plans' && (
              <motion.div
                key="plans"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                {stats.pendingPayment && (
                  <div className="max-w-4xl mx-auto bg-amber-500/10 border border-amber-500/25 rounded-[32px] p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5">
                      <Clock size={120} className="text-amber-400" />
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                      <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-400 text-xs font-bold uppercase tracking-wider">
                          <Clock size={14} className="animate-spin" /> {t.admin.pendingVerification}
                        </div>
                        <h3 className="text-xl font-bold text-white">
                          {language === 'en' ? 'USDT Transfer Under Review' : language === 'es' ? 'Transferencia USDT en Revisión' : 'Transferência USDT em Análise'}
                        </h3>
                        <p className="text-sm text-white/60 max-w-xl">
                          {language === 'en'
                            ? 'Your payment hash is currently being verified on the blockchain explorer. The license will be activated automatically once the balance is confirmed.'
                            : language === 'es'
                              ? 'El hash de su pago se está verificando en el explorador de blockchain. La licencia se activará automáticamente una vez confirmado el saldo.'
                              : 'A hash do seu pagamento está sendo verificada no explorador da blockchain. A licença será liberada e ativada automaticamente assim que o saldo for confirmado.'}
                        </p>
                        <div className="pt-2 text-xs font-mono text-white/40 space-y-1">
                          <p><span className="text-white/60 font-medium">HASH:</span> <span className="break-all select-all text-amber-300">{stats.pendingPayment.hash}</span></p>
                          <p><span className="text-white/60 font-medium uppercase">STATUS:</span> <span className="text-amber-400 font-bold">{t.admin.pendingVerification}</span></p>
                          <p><span className="text-white/60 font-medium">VALUE:</span> ${stats.pendingPayment.amount} USDT ({stats.pendingPayment.method})</p>
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col items-center justify-center text-center min-w-[180px]">
                        <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1">
                          {language === 'en' ? 'Average Time' : language === 'es' ? 'Tiempo Promedio' : 'Tempo Médio'}
                        </p>
                        <p className="text-2xl font-bold text-white">5 - 15 min</p>
                        <p className="text-[9px] text-amber-400 font-semibold mt-1">Automatic Webhook</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
                  <PricingCard
                    title={t.plans.card1Title}
                    price={10}
                    desc={t.plans.card1Desc}
                    features={t.plans.card1Features}
                    language={language}
                    image="/fybot-logo.png.png"
                    onBuy={() => setShowPaymentModal({ title: t.plans.card1Title, price: 10 })}
                  />
                  <PricingCard
                    title={t.plans.card2Title}
                    price={20}
                    recommended
                    desc={t.plans.card2Desc}
                    features={t.plans.card2Features}
                    language={language}
                    image="/fybot-logo.png.png"
                    onBuy={() => setShowPaymentModal({ title: t.plans.card2Title, price: 20 })}
                  />
                  <PricingCard
                    title={t.plans.card3Title}
                    price={50}
                    desc={t.plans.card3Desc}
                    features={t.plans.card3Features}
                    language={language}
                    image="/fybot-logo.png.png"
                    onBuy={() => setShowPaymentModal({ title: t.plans.card3Title, price: 50 })}
                  />
                  <PricingCard
                    title={t.plans.card4Title}
                    price={100}
                    customPriceText={language === 'en' ? 'Lifetime Access' : language === 'es' ? 'Acceso Vitalicio' : 'Acesso Vitalício'}
                    desc={t.plans.card4Desc}
                    features={t.plans.card4Features}
                    language={language}
                    image="/bot_trading.png"
                    hideButton={true}
                    largeFeatures={true}
                    titleColor="text-emerald-400"
                    descColor="text-emerald-400"
                  />
                </div>


              </motion.div>
            )}

            {activeTab === 'affiliates' && (
              <motion.div
                key="affiliates"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                {/* Hero Affiliate */}
                <div className="relative bg-[#0f0f12] border border-white/5 rounded-[40px] p-8 md:p-16 overflow-hidden">
                  <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                  <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] -mr-48 -mt-48 transition-all" />
                  <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-600/10 blur-[100px] -ml-24 -mb-24 transition-all" />

                  {/* Subtle Chart SVG */}
                  <div className="absolute bottom-0 right-0 w-full h-1/2 opacity-5 pointer-events-none">
                    <svg viewBox="0 0 1000 200" className="w-full h-full preserve-3d">
                      <path d="M0 150 Q100 100 200 130 T400 80 T600 120 T800 60 T1000 100" stroke="white" strokeWidth="2" fill="none" />
                      <path d="M0 120 Q50 150 150 100 T350 130 T550 70 T750 110 T1000 50" stroke="rgba(59,130,246,0.5)" strokeWidth="1" fill="none" />
                    </svg>
                  </div>

                  <div className="relative z-10 max-w-2xl">
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 text-white">
                      {language === 'en' ? 'Referral Program' : language === 'es' ? 'Programa de Referidos' : 'Programa de Indicação'}
                    </h1>
                    <p className="text-lg text-white/50 leading-relaxed max-w-lg mb-10">
                      {language === 'en' ? 'Earn recurring commissions up to 5 levels of your network. Turn your influence into a steady capital stream.' : language === 'es' ? 'Gane comisiones recurrentes en hasta 5 niveles de su red. Transforme su influencia en un flujo constante de capital.' : 'Ganhe comissões recorrentes em até 5 níveis da sua rede. Transforme sua influência em um fluxo constante de capital.'}
                    </p>

                  </div>

                  {/* Decorative Tree Element */}
                  <div className="hidden lg:block absolute right-16 top-1/2 -translate-y-1/2 w-80 h-80 opacity-20">
                    <svg viewBox="0 0 100 100" className="w-full h-full stroke-blue-500 fill-none">
                      <circle cx="50" cy="20" r="5" />
                      <path d="M50 25 L30 50 M50 25 L70 50 M30 55 L20 80 M30 55 L40 80 M70 55 L60 80 M70 55 L80 80" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="30" cy="50" r="4" />
                      <circle cx="70" cy="50" r="4" />
                      <circle cx="20" cy="80" r="3" />
                      <circle cx="40" cy="80" r="3" />
                      <circle cx="60" cy="80" r="3" />
                      <circle cx="80" cy="80" r="3" />
                    </svg>
                  </div>
                </div>

                {/* Referral History / Ganhos com Indicação */}
                <div id="referral-earnings-history" className="bg-[#0f0f12] border border-white/5 rounded-[40px] p-8 md:p-10 space-y-8 shadow-xl shadow-black/20">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <Share2 size={24} className="text-emerald-400" />
                        {language === 'en' ? 'Network Matrix Hub' : language === 'es' ? 'Socio de Matriz de Red' : 'Central da Rede de Indicados'}
                      </h2>
                      <p className="text-white/40 text-sm">
                        {language === 'en' ? 'View all registered users across your multi-level marketing matrix.' : language === 'es' ? 'Vea el listado completo de afiliados en su matriz multinivel.' : 'Veja a listagem completa dos membros da sua rede de afiliados.'}
                      </p>
                    </div>

                    {/* Stats Summary Bubble */}
                    <div className="flex flex-wrap gap-4">
                      <div className="bg-black/30 border border-white/5 rounded-2xl p-3.5 flex items-center gap-4">
                        <div>
                          <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider block mb-0.5">
                            {language === 'en' ? 'REVENUE CODE' : language === 'es' ? 'CÓDIGO DE INGRESOS' : 'CÓDIGO DE ENTRADA'}
                          </span>
                          <code className="text-sm font-mono font-black text-amber-400 tracking-wider">
                            {currentUser?.referralCode || 'CARLOS296'}
                          </code>
                        </div>
                        <button
                          onClick={() => {
                            const code = currentUser?.referralCode || 'CARLOS296';
                            navigator.clipboard.writeText(code);
                            alert(language === 'en' ? `Referral code "${code}" copied!` : language === 'es' ? `¡Código de referencia "${code}" copiado!` : `Código de indicação "${code}" copiado!`);
                          }}
                          className="px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95"
                        >
                          <Copy size={12} className="text-white/60" />
                          <span className="hidden sm:inline">{language === 'en' ? 'Copy' : language === 'es' ? 'Copiar' : 'Copiar'}</span>
                        </button>
                      </div>

                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl px-5 py-3.5 flex flex-col justify-center min-w-[125px]">
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider block mb-1">
                          {language === 'en' ? 'NETWORK COMMISSIONS' : language === 'es' ? 'COMISIONES DE RED' : 'COMISSÕES DE REDE'}
                        </span>
                        <span className="text-xl font-bold text-emerald-400 font-mono">
                          ${referralHistory.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl px-5 py-3.5 flex flex-col justify-center min-w-[120px]">
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider block mb-1">
                          {language === 'en' ? 'ACTIVE / TOTAL' : language === 'es' ? 'ACTIVOS / TOTAL' : 'ATIVOS / TOTAL'}
                        </span>
                        <div className="flex items-baseline gap-1 font-mono">
                          <span className="text-xl font-bold text-blue-400">
                            {referralNetwork.filter(item => item.hasActiveLicense).length}
                          </span>
                          <span className="text-xs text-white/40 font-medium">
                            / {referralNetwork.length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {referralSubTab === 'network' ? (
                    referralNetwork.length === 0 ? (
                      <div className="bg-black/20 border border-white/5 rounded-2xl p-10 text-center flex flex-col items-center justify-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/40">
                          <Users size={20} />
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-sm text-white/80">
                            {language === 'en' ? 'No registered network members yet' : language === 'es' ? 'Aún no hay miembros registrados' : 'Nenhum membro cadastrado na rede ainda'}
                          </p>
                          <p className="text-xs text-white/40 max-w-xs">
                            {language === 'en' ? 'Share your referral code to start populating your multi-level affiliate network.' : language === 'es' ? 'Comparta su código de referidos para comenzar a registrar membros en su red.' : 'Divulgue seu código de indicação para as pessoas se cadasrarem na sua matriz multinível.'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {/* Seção de Retiradas de Comissões (USDT BEP-20) */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white/[0.01] border border-white/5 rounded-[30px] p-6 shadow-2xl shadow-black/40">
                          {/* Coluna do Formulário de Saque (7 cols) */}
                          <div className="lg:col-span-7 space-y-6">
                            <div>
                              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Wallet size={20} className="text-amber-400" />
                                {language === 'en' ? 'Commission Payout (USDT BEP-20)' : language === 'es' ? 'Retirada de Comisión (USDT BEP-20)' : 'Retirada de Ganhos com Comissão (USDT BEP-20)'}
                              </h3>
                              <p className="text-xs text-white/40 mt-1">
                                {language === 'en' ? 'Set your wallet address on BNB Chain and withdraw your network commissions instantly.' : language === 'es' ? 'Configure su dirección BEP-20 y retire sus comisiones de red inmediatamente.' : 'Configure seu endereço de carteira na BNB Chain (BEP-20) e realize o saque de suas comissões de rede.'}
                              </p>
                            </div>

                            {/* Detalhes de Balanço */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
                                <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider block mb-1">
                                  {language === 'en' ? 'TOTAL EARNED' : language === 'es' ? 'TOTAL GANADO' : 'TOTAL RECEBIDO'}
                                </span>
                                <span className="text-2xl font-black text-emerald-400 font-mono">
                                  ${referralHistory.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
                                </span>
                              </div>
                              <div className="bg-white/[0.02] border border-emerald-500/10 rounded-2xl p-4 flex flex-col justify-between">
                                <span className="text-[10px] font-bold text-emerald-450 uppercase tracking-wider block mb-1 text-emerald-400">
                                  {language === 'en' ? 'WITHDRAWABLE BALANCE' : language === 'es' ? 'SALDO DISPONIBLE' : 'SALDO DISPONÍVEL'}
                                </span>
                                <span className="text-2xl font-black text-emerald-400 font-mono">
                                  ${(
                                    referralHistory.reduce((sum, item) => sum + item.amount, 0) -
                                    withdrawals.filter(w => w.userId === currentUser?.id && w.status !== 'REJECTED').reduce((sum, item) => sum + item.amount, 0)
                                  ).toFixed(2)}
                                </span>
                              </div>
                            </div>

                            <form onSubmit={handleRequestWithdrawal} className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest pl-1">
                                  {language === 'en' ? 'USDT BEP-20 Wallet Address' : language === 'es' ? 'Billetera USDT BEP-20' : 'Endereço de Carteira USDT BEP-20'}
                                </label>
                                <div className="relative">
                                  <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                                  <input
                                    type="text"
                                    required
                                    value={withdrawWallet}
                                    onChange={(e) => setWithdrawWallet(e.target.value)}
                                    placeholder="0x..."
                                    className="w-full bg-white/[0.02] border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-white text-sm outline-none focus:border-amber-500/50 focus:bg-white/[0.04] transition-all font-mono"
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <label className="text-[15px] uppercase font-bold text-emerald-500 tracking-widest pl-1">
                                  {language === 'en' ? 'Withdrawal Amount (Min $30)' : language === 'es' ? 'Monto a Retirar (Mín $30)' : 'Valor para Saque (Mín $30)'}
                                </label>
                                <div className="relative">
                                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono font-bold text-white/30">$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="30"
                                    required
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-white/[0.02] border border-white/5 rounded-2xl py-3.5 pl-10 pr-4 text-white text-sm outline-none focus:border-amber-500/50 focus:bg-white/[0.04] transition-all font-mono font-bold"
                                  />
                                </div>
                              </div>

                              {withdrawalMessage && (
                                <div className={`p-4 rounded-2xl border text-xs font-semibold ${withdrawalMessage.isError
                                  ? 'bg-red-500/10 border-red-500/10 text-red-400'
                                  : 'bg-emerald-500/10 border-emerald-500/10 text-emerald-400'
                                  }`}>
                                  {withdrawalMessage.text}
                                </div>
                              )}

                              <button
                                type="submit"
                                disabled={withdrawalLoading}
                                className={`w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-2xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2`}
                              >
                                {withdrawalLoading ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                    {language === 'en' ? 'PROCESSING...' : language === 'es' ? 'PROCESANDO...' : 'PROCESSANDO...'}
                                  </>
                                ) : (
                                  <>
                                    <Send size={14} />
                                    {language === 'en' ? 'Request Payout' : language === 'es' ? 'Solicitar Retiro' : 'Solicitar Saque de Comissão'}
                                  </>
                                )}
                              </button>
                            </form>
                          </div>

                          {/* Coluna do Histórico de Saques (5 cols) */}
                          <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-white/5 pt-6 lg:pt-0 lg:pl-6 flex flex-col h-full justify-between">
                            <div className="space-y-4">
                              <div>
                                <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                  <History size={16} className="text-white/40" />
                                  {language === 'en' ? 'Withdrawal Requests' : language === 'es' ? 'Historial de Retiros' : 'Minhas Retiradas'}
                                </h4>
                                <p className="text-[10px] text-white/30 tracking-tight">
                                  {language === 'en' ? 'Track your commission payouts and status.' : language === 'es' ? 'Siga sus retiros de comisión.' : 'Acompanhe o andamento dos seus pedidos de pagamento.'}
                                </p>
                              </div>

                              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                                {withdrawals.filter(w => w.userId === currentUser?.id).length === 0 ? (
                                  <div className="py-12 text-center text-white/20 italic text-xs border border-dashed border-white/5 rounded-2xl">
                                    {language === 'en' ? 'No withdrawal requests yet.' : language === 'es' ? 'No hay retiros registrados.' : 'Nenhuma solicitação de saque feita ainda.'}
                                  </div>
                                ) : (
                                  withdrawals
                                    .filter(w => w.userId === currentUser?.id)
                                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                                    .map((w) => (
                                      <div key={w.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col space-y-2 text-xs">
                                        <div className="flex justify-between items-center">
                                          <div className="flex items-center gap-1.5 font-mono">
                                            <span className="text-white/60 font-bold">${parseFloat(w.amount).toFixed(2)}</span>
                                            <span className="text-white/30 text-[10px]">• ID: {w.id}</span>
                                          </div>
                                          <span className={`px-2 py-0.5 rounded-md font-bold text-[9px] uppercase ${w.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' :
                                            w.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' :
                                              'bg-amber-500/10 text-amber-500'
                                            }`}>
                                            {w.status === 'APPROVED' ? (language === 'en' ? 'Approved' : language === 'es' ? 'Aprobado' : 'Aprovado') :
                                              w.status === 'REJECTED' ? (language === 'en' ? 'Rejected' : language === 'es' ? 'Rechazado' : 'Rejeitado') :
                                                (language === 'en' ? 'Pending' : language === 'es' ? 'Pendiente' : 'Pendente')}
                                          </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                          <span className="text-[9px] font-mono text-white/20 break-all truncate max-w-[160px]">{w.wallet}</span>
                                          <span className="text-[9px] text-white/30 font-mono">
                                            {new Date(w.timestamp).toLocaleDateString([], { day: '2-digit', month: '2-digit' })} • {new Date(w.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                          </span>
                                        </div>
                                      </div>
                                    ))
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 5-Level Affiliates Summary Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          {[1, 2, 3, 4, 5].map((lvl) => {
                            const levelActives = referralNetwork.filter(item => item.level === lvl && item.hasActiveLicense).length;
                            const levelTotals = referralNetwork.filter(item => item.level === lvl).length;
                            const levelEarnings = referralHistory
                              .filter(item => item.level === lvl)
                              .reduce((sum, item) => sum + item.amount, 0);

                            const colors = [
                              'border-blue-500/10 text-blue-400 bg-blue-500/5',
                              'border-cyan-500/10 text-cyan-400 bg-cyan-500/5',
                              'border-emerald-500/10 text-emerald-400 bg-emerald-500/5',
                              'border-purple-500/10 text-purple-400 bg-purple-500/5',
                              'border-amber-500/10 text-amber-400 bg-amber-500/5'
                            ];

                            return (
                              <div key={lvl} className={`border rounded-[20px] p-6 flex flex-col justify-between ${colors[lvl - 1]} hover:scale-[1.02] transition-transform duration-200`}>
                                <div>
                                  <span className="text-[22px] font-black uppercase tracking-widest opacity-85 block mb-1">
                                    {language === 'en' ? `Level ${lvl}` : language === 'es' ? `Nivel ${lvl}` : `Nível ${lvl}`}
                                  </span>
                                  <div className="flex flex-col gap-0.5 mt-2">
                                    <div className="flex items-baseline gap-1.5 flex-wrap">
                                      <span className="text-[45px] font-black font-mono leading-none">{levelActives}</span>
                                      <span className="text-[14px] opacity-75 font-semibold text-white uppercase tracking-wider">
                                        {language === 'en' ? 'Active' : language === 'es' ? 'Ativos' : 'Ativos'}
                                      </span>
                                    </div>
                                    <div className="text-[13px] opacity-50 mt-1 flex items-center justify-between font-semibold">
                                      <span>{language === 'en' ? 'Registered:' : language === 'es' ? 'Registrados:' : 'Cadastrados:'}</span>
                                      <span className="font-bold font-mono text-[14px]">{levelTotals}</span>
                                    </div>
                                  </div>
                                  <div className="mt-4 pt-3 border-t border-white/5 text-[15px] font-bold text-emerald-400 font-mono flex items-center justify-between">
                                    <span className="opacity-75 text-[12px] uppercase font-bold tracking-wider">
                                      {language === 'en' ? 'Gains' : language === 'es' ? 'Gains' : 'Ganhos'}
                                    </span>
                                    <span>${levelEarnings.toFixed(2)}</span>
                                  </div>
                                </div>
                                <div className="w-full bg-white/5 rounded-full h-1 mt-4 overflow-hidden">
                                  <div
                                    className="bg-current h-full rounded-full transition-all duration-300"
                                    style={{ width: `${levelTotals > 0 ? (levelActives / levelTotals) * 100 : 0}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* List/Table controls with active toggle filter */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/[0.02] border border-white/5 rounded-[20px] p-4">
                          <p className="text-xs font-semibold text-white/50">
                            {language === 'en' ? 'Review registered partner users list:' : language === 'es' ? 'Revise la lista de usuarios registrados:' : 'Lista de usuários parceiros cadastrados:'}
                          </p>
                          <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 shrink-0">
                            <button
                              onClick={() => setFilterActiveNetworkOnly(false)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${!filterActiveNetworkOnly
                                ? 'bg-white/10 text-white'
                                : 'text-white/40 hover:text-white'
                                }`}
                            >
                              {language === 'en' ? 'All Members' : language === 'es' ? 'Todos los Miembros' : 'Todos os Membros'}
                            </button>
                            <button
                              onClick={() => setFilterActiveNetworkOnly(true)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${filterActiveNetworkOnly
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/10'
                                : 'text-white/40 hover:text-white'
                                }`}
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              {language === 'en' ? 'Active License Only' : language === 'es' ? 'Solo Activos' : 'Apenas Ativos (Licença Ativa)'}
                            </button>
                          </div>
                        </div>

                        {/* Network List Table */}
                        <div className="overflow-x-auto rounded-[20px] bg-black/20 border border-white/5">
                          <table className="w-full text-left border-collapse min-w-[600px]">
                            <thead>
                              <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-white/40 font-mono">
                                <th className="px-6 py-4">{language === 'en' ? 'USER / CONTACT' : language === 'es' ? 'USUARIO O MIEMBRO' : 'NOME / E-MAIL'}</th>
                                <th className="px-6 py-4">{language === 'en' ? 'NETWORK LEVEL' : language === 'es' ? 'NIVEL EN RED' : 'NÍVEL DA INDICAÇÃO'}</th>
                                <th className="px-6 py-4">{language === 'en' ? 'REGISTRATION DATE' : language === 'es' ? 'FECHA DE REGISTRO' : 'CADASTROU-SE EM'}</th>
                                <th className="px-6 py-4">{language === 'en' ? 'ACCOUNT STATUS' : language === 'es' ? 'ESTADO' : 'STATUS DO SISTEMA'}</th>
                                <th className="px-6 py-4 text-right">{language === 'en' ? 'BOT LICENSING' : language === 'es' ? 'LICENCIA DE TRADING' : 'LICENÇA ATIVA'}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {referralNetwork
                                .filter(item => !filterActiveNetworkOnly || item.hasActiveLicense)
                                .map((item, idx) => {
                                  const initials = item.name ? item.name.charAt(0).toUpperCase() : '?';
                                  const colors = [
                                    'bg-blue-500/10 text-blue-400 border border-blue-500/20',
                                    'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
                                    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
                                    'bg-purple-500/10 text-purple-400 border border-purple-500/20',
                                    'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  ];
                                  const avatarColor = colors[(item.level - 1) % colors.length];

                                  return (
                                    <motion.tr
                                      key={item.id}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: idx * 0.05 }}
                                      className="hover:bg-white/[0.01] transition-colors"
                                    >
                                      <td className="px-6 py-4">
                                        <div className="flex items-center gap-3 w-full">
                                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${avatarColor}`}>
                                            {initials}
                                          </div>
                                          <div className="truncate max-w-[180px]">
                                            <p className="font-bold text-white text-sm truncate">{item.name}</p>
                                            <p className="text-[10px] text-white/40 truncate">{item.email}</p>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${item.level === 1
                                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                          : item.level === 2
                                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                            : item.level === 3
                                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                              : item.level === 4
                                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                          }`}>
                                          {language === 'en' ? `Level ${item.level}` : language === 'es' ? `Nivel ${item.level}` : `Nível ${item.level}`}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 text-[11px] text-white/60 font-medium whitespace-nowrap">
                                        {new Date(item.createdAt).toLocaleDateString(undefined, {
                                          day: '2-digit',
                                          month: '2-digit',
                                          year: 'numeric'
                                        })} &nbsp;
                                        <span className="text-white/20">
                                          {new Date(item.createdAt).toLocaleTimeString(undefined, {
                                            hour: 'numeric',
                                            minute: '2-digit',
                                            hour12: false
                                          })}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black tracking-wider uppercase ${item.status === 'ACTIVE'
                                          ? 'bg-emerald-500/10 text-emerald-400'
                                          : 'bg-red-500/10 text-red-400'
                                          }`}>
                                          ● {item.status === 'ACTIVE'
                                            ? (language === 'en' ? 'ONLINE' : language === 'es' ? 'ACTIVO' : 'ATIVO')
                                            : (language === 'en' ? 'OFFLINE' : language === 'es' ? 'INACTIVO' : 'INATIVO')}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                        {item.hasActiveLicense ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                            ✓ {language === 'en' ? 'Active License' : language === 'es' ? 'Licencia Activa' : 'Licença Ativa'}
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-[10px] font-semibold bg-white/5 text-white/40 border border-white/5">
                                            {language === 'en' ? 'No License' : language === 'es' ? 'Sin Licencia' : 'Sem Licença'}
                                          </span>
                                        )}
                                      </td>
                                    </motion.tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  ) : (
                    referralHistory.length === 0 ? (
                      <div className="bg-black/20 border border-white/5 rounded-2xl p-10 text-center flex flex-col items-center justify-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/40">
                          <Users size={20} />
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-sm text-white/80">
                            {language === 'en' ? 'No earning records yet' : language === 'es' ? 'Aún no hay registros de ganancias' : 'Nenhum ganho registrado ainda'}
                          </p>
                          <p className="text-xs text-white/40 max-w-xs">
                            {language === 'en' ? 'Share your revenue code to start receiving 5-level recursive matrix commissions.' : language === 'es' ? 'Comparta su código de referidos para comenzar a recibir comisiones.' : 'Compartilhe seu código de indicação para receber comissões automáticas em até 5 níveis.'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-[20px] bg-black/20 border border-white/5">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                          <thead>
                            <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-white/40">
                              <th className="px-6 py-4">{language === 'en' ? 'REFERRED MEMBER' : language === 'es' ? 'MIEMBRO REFERIDO' : 'MEMBRO INDICADO'}</th>
                              <th className="px-6 py-4">{language === 'en' ? 'TIER LEVEL' : language === 'es' ? 'NIVEL DE COMBINACIÓN' : 'NÍVEL DA REDE'}</th>
                              <th className="px-6 py-4">{language === 'en' ? 'TRANSACTION TYPE' : language === 'es' ? 'TIPO DE TRANSACCIÓN' : 'TIPO DE OPERAÇÃO'}</th>
                              <th className="px-6 py-4 text-right">{language === 'en' ? 'AMOUNT EARNED' : language === 'es' ? 'MONTO GANADO' : 'VALOR RECEBIDO'}</th>
                              <th className="px-6 py-4 text-right">{language === 'en' ? 'DATE' : language === 'es' ? 'FECHA' : 'DATA'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {referralHistory.map((item, idx) => {
                              const initials = item.referredName ? item.referredName.charAt(0).toUpperCase() : '?';
                              const colors = [
                                'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
                                'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
                                'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
                                'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                                'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              ];
                              const avatarColor = colors[idx % colors.length];

                              return (
                                <motion.tr
                                  key={item.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.05 }}
                                  className="hover:bg-white/[0.01] transition-colors"
                                >
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3 w-full">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${avatarColor}`}>
                                        {initials}
                                      </div>
                                      <div className="truncate max-w-[150px]">
                                        <p className="font-bold text-white text-sm truncate">{item.referredName}</p>
                                        <p className="text-[10px] text-white/40 truncate">{item.referredEmail}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${item.level === 1
                                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                      : item.level === 2
                                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                        : item.level === 3
                                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                          : item.level === 4
                                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                      }`}>
                                      {language === 'en' ? `Level ${item.level}` : language === 'es' ? `Nivel ${item.level}` : `Nível ${item.level}`}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-xs font-medium text-white/75">
                                    {item.type}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <span className="font-mono font-bold text-emerald-400">
                                      +${item.amount.toFixed(2)}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right text-[10px] text-white/45 font-medium whitespace-nowrap">
                                    {new Date(item.timestamp).toLocaleDateString(undefined, {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric'
                                    })} &nbsp;
                                    <span className="text-white/20">
                                      {new Date(item.timestamp).toLocaleTimeString(undefined, {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: false
                                      })}
                                    </span>
                                  </td>
                                </motion.tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )
                  )}
                </div>

                {/* Earnings Structure */}
                <div id="network-commission-structure" className="bg-[#0f0f12] border border-white/5 rounded-[40px] p-8 md:p-10 space-y-6 shadow-xl shadow-black/20 bg-gradient-to-tr from-blue-500/[0.02] to-transparent">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">PROPAGAÇÃO MULTINÍVEL</span>
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">{language === 'en' ? 'Network Commission Structure (5 Levels)' : language === 'es' ? 'Estructura de Comisión de Red (5 Niveles)' : 'Estrutura de Comissão de Rede (5 Níveis)'}</h2>
                    <p className="text-white/40 text-sm">{language === 'en' ? 'Our 5-level matrix distributes automatic rewards up to 5 tiers of your active network.' : language === 'es' ? 'Nuestra matriz de 5 niveles distribuye recompensas automáticas en su red activa.' : 'Nossa matriz de 5 níveis distribui comissões automáticas em até 5 gerações de sua rede ativa.'}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-2">
                    <AffiliateLevel level={1} percentage={20} label={language === 'en' ? 'Direct Referrals' : language === 'es' ? 'Directos' : 'Indicações Diretas'} color="bg-blue-500" language={language} />
                    <AffiliateLevel level={2} percentage={15} label={language === 'en' ? 'Tier 2' : language === 'es' ? 'Nivel 2' : 'Nível 2'} color="bg-blue-400" language={language} />
                    <AffiliateLevel level={3} percentage={10} label={language === 'en' ? 'Tier 3' : language === 'es' ? 'Nivel 3' : 'Nível 3'} color="bg-purple-500" language={language} />
                    <AffiliateLevel level={4} percentage={3} label={language === 'en' ? 'Tier 4' : language === 'es' ? 'Nivel 4' : 'Nível 4'} color="bg-purple-400" language={language} />
                    <AffiliateLevel level={5} percentage={2} label={language === 'en' ? 'Tier 5' : language === 'es' ? 'Nivel 5' : 'Nível 5'} color="bg-white/20" language={language} />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'admin' && currentUser?.role === 'ADMIN' && (
              <motion.div
                key="admin"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Users Management */}
                <div className="bg-[#0f0f12] border border-white/5 rounded-3xl p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-xl font-bold">{t.admin.userManagement}</h2>
                      <p className="text-sm text-white/40">{t.admin.userManagementDesc}</p>
                    </div>
                  </div>
                  <div className="grid gap-4">
                    {users.map(u => (
                      <div key={u.id} className="bg-white/5 p-4 rounded-2xl flex items-center justify-between border border-white/5 hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs uppercase">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{u.name}</p>
                            <p className="text-xs text-white/40">{u.email}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                            {u.status}
                          </span>
                        </div>
                        <div className="flex gap-2 items-center flex-wrap">
                          <button
                            onClick={() => grantAccess(u.id)}
                            title={t.dashboard.grantAccess}
                            className="p-2 px-3 bg-emerald-500/10 rounded-lg hover:bg-emerald-500/20 text-emerald-500 transition-colors flex items-center gap-1.5"
                          >
                            <Key size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-tight">{language === 'en' ? 'Grant Access' : language === 'es' ? 'Dar Acceso' : 'Liberar Acesso'}</span>
                          </button>
                          <button
                            onClick={() => grantLifetimeAccess(u.id)}
                            title={language === 'en' ? 'Lifetime Access' : language === 'es' ? 'Acceso Vitalicio' : 'Acesso Vitalício'}
                            className="p-2 px-3 bg-amber-500/10 rounded-lg hover:bg-amber-500/20 text-amber-500 transition-colors flex items-center gap-1.5"
                          >
                            <Crown size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-tight">{language === 'en' ? 'Lifetime' : language === 'es' ? 'Vitalicio' : 'Vitalício'}</span>
                          </button>
                          <button
                            onClick={() => toggleUser(u.id)}
                            title={u.status === 'ACTIVE' ? 'Lock User' : 'Activate User'}
                            className="p-2 px-3 bg-white/5 rounded-lg hover:bg-white/10 text-white/60 transition-colors flex items-center gap-1.5"
                          >
                            {u.status === 'ACTIVE' ? <Lock size={14} /> : <UserCheck size={14} />}
                            <span className="text-[10px] font-bold uppercase tracking-tight">{u.status === 'ACTIVE' ? (language === 'en' ? 'Lock' : language === 'es' ? 'Bloquear' : 'Bloquear') : (language === 'en' ? 'Unlock' : language === 'es' ? 'Desbloquear' : 'Desbloquear')}</span>
                          </button>
                          <button
                            onClick={() => deleteUser(u.id, u.name)}
                            className="p-2 px-3 bg-red-400/10 rounded-lg hover:bg-red-400/20 text-red-400 transition-colors flex items-center gap-1.5 border border-red-500/10"
                          >
                            <Trash2 size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-tight">{language === 'en' ? 'Delete User' : language === 'es' ? 'Eliminar Usuario' : 'Excluir Usuário'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Licenses */}
                  <div className="bg-[#0f0f12] border border-white/5 rounded-3xl p-8">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                      <CreditCard size={18} className="text-blue-400" /> {t.admin.licenseRegistry}
                    </h3>
                    <div className="space-y-4">
                      {licenses.map(l => (
                        <div key={l.id} className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-mono font-bold tracking-widest">{l.key}</p>
                              <div className="flex gap-3 items-center mt-1 flex-wrap">
                                <span className="text-[10px] text-white/40 uppercase font-bold">{l.type}</span>
                                <span className={`text-[10px] font-bold ${l.status === 'ACTIVE' ? 'text-emerald-400' : 'text-red-400'}`}>{l.status}</span>
                                {l.expiryDate && (
                                  <span className="text-[10px] text-white/40 font-mono">
                                    • {language === 'en' ? 'Expires' : language === 'es' ? 'Expira' : 'Expira'}: {new Date(l.expiryDate).toLocaleDateString(language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'pt-BR')}  {new Date(l.expiryDate).toLocaleTimeString(language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 items-center flex-wrap">
                              <button
                                onClick={() => toggleLicense(l.id)}
                                className="p-2 px-3 bg-white/5 rounded-lg hover:bg-white/10 text-white/60 transition-colors flex items-center gap-1.5"
                              >
                                {l.status === 'ACTIVE' ? <Lock size={14} /> : <CheckCircle2 size={14} />}
                                <span className="text-[10px] font-bold uppercase tracking-tight">
                                  {l.status === 'ACTIVE' ? (language === 'en' ? 'Disable' : language === 'es' ? 'Desactivar' : 'Desativar') : (language === 'en' ? 'Enable' : language === 'es' ? 'Activar' : 'Ativar')}
                                </span>
                              </button>
                              <button
                                onClick={() => deleteLicense(l.id, l.key)}
                                className="p-2 px-3 bg-red-400/10 rounded-lg hover:bg-red-400/20 text-red-400 transition-colors flex items-center gap-1.5 border border-red-500/10"
                              >
                                <Trash2 size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-tight">{language === 'en' ? 'Delete License' : language === 'es' ? 'Eliminar Licencia' : 'Excluir Licença'}</span>
                              </button>
                            </div>
                          </div>
                          {l.hwid && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/30 rounded-lg border border-white/5">
                              <Fingerprint size={12} className="text-white/20" />
                              <span className="text-[10px] font-mono text-white/30 uppercase tracking-tighter">HWID: {l.hwid}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payments Pending */}
                  <div className="bg-[#0f0f12] border border-white/5 rounded-3xl p-8">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                      <Wallet size={18} className="text-amber-400" /> {t.admin.pendingVerification}
                    </h3>
                    <div className="space-y-4">
                      {payments.filter(p => p.status === 'PENDING').map(p => (
                        <div key={p.id} className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/10 space-y-3">
                          <div className="flex justify-between items-center">
                            <p className="text-sm font-bold">${p.amount} • {p.method}</p>
                            <div className="flex gap-2">
                              <a
                                href={p.hash && p.hash.trim().startsWith('0x') ? `https://bscscan.com/tx/${p.hash.trim()}` : `https://bscscan.com/search?q=${p.hash ? p.hash.trim() : ''}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/20 hover:text-blue-300 transition-colors flex items-center justify-center gap-1.5 text-xs font-bold"
                                title={language === 'en' ? 'Check BSC' : language === 'es' ? 'Verificar BSC' : 'Verificar no BSC'}
                              >
                                <Globe size={14} />
                                <span className="text-[10px] uppercase font-bold tracking-wider">{language === 'en' ? 'Check BSC' : 'Verificar BSC'}</span>
                              </a>
                              <button onClick={() => approvePayment(p.id)} className="p-2 bg-emerald-500 text-black rounded-lg hover:bg-emerald-400 transition-colors cursor-pointer">
                                <CheckCircle2 size={16} />
                              </button>
                              <button onClick={() => rejectPayment(p.id)} className="p-2 bg-white/5 text-white/70 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                                <XCircle size={16} />
                              </button>
                            </div>
                          </div>
                          <p className="text-[10px] font-mono text-white/40 break-all">{p.hash}</p>
                        </div>
                      ))}
                      {payments.filter(p => p.status === 'PENDING').length === 0 && (
                        <div className="py-10 text-center text-white/20 italic text-sm">{t.admin.noPendingPayments}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Saques de Comissões Pendentes (Admin view) */}
                <div className="bg-[#0f0f12] border border-white/5 rounded-3xl p-8">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <Wallet size={18} className="text-amber-400" />
                    {language === 'en' ? 'Commission Payout Requests' : language === 'es' ? 'Solicitudes de Retiro de Comisión' : 'Saques de Comissões Pendentes'}
                  </h3>
                  <div className="space-y-4">
                    {withdrawals.filter(w => w.status === 'PENDING').length === 0 ? (
                      <div className="py-10 text-center text-white/20 italic text-sm">
                        {language === 'en' ? 'No pending withdrawal requests.' : language === 'es' ? 'No hay solicitudes de retiro pendientes.' : 'Nenhum saque de comissão pendente no momento.'}
                      </div>
                    ) : (
                      withdrawals.filter(w => w.status === 'PENDING').map(w => (
                        <div key={w.id} className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white font-mono">${parseFloat(w.amount).toFixed(2)}</span>
                              <span className="text-white/20 text-xs font-mono">• ID: {w.id}</span>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-500 uppercase tracking-wider">{language === 'en' ? 'PENDING' : 'PENDENTE'}</span>
                            </div>
                            <p className="text-xs text-white/70">
                              <strong>{language === 'en' ? 'User:' : 'Usuário:'}</strong> {w.userName || 'Unknown'} ({w.userEmail || 'N/A'})
                            </p>
                            <p className="text-xs font-mono text-white/40 break-all select-all">
                              <strong>{language === 'en' ? 'Wallet BEP-20:' : 'Carteira BEP-20:'}</strong> {w.wallet}
                            </p>
                          </div>
                          <div className="flex gap-2 self-end md:self-center">
                            <button
                              onClick={() => approveWithdrawal(w.id)}
                              title={language === 'en' ? 'Approve' : 'Aprovar'}
                              className="p-2.5 bg-emerald-500 text-black rounded-lg hover:bg-emerald-400 transition-colors flex items-center gap-1 text-xs font-bold font-mono cursor-pointer"
                            >
                              <CheckCircle2 size={16} />
                              {language === 'en' ? 'Approve' : 'Aprovar'}
                            </button>
                            <button
                              onClick={() => rejectWithdrawal(w.id)}
                              title={language === 'en' ? 'Reject' : 'Rejeitar'}
                              className="p-2.5 bg-white/5 text-white/70 rounded-lg hover:bg-white/10 hover:text-white transition-colors flex items-center gap-1 text-xs font-bold font-mono cursor-pointer"
                            >
                              <XCircle size={16} />
                              {language === 'en' ? 'Reject' : 'Rejeitar'}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Histórico Geral de Saques (Admin view) */}
                {withdrawals.length > 0 && (
                  <div className="bg-[#0f0f12] border border-white/5 rounded-3xl p-8">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                      <History size={18} className="text-zinc-400" />
                      {language === 'en' ? 'Global Withdrawal Ledger' : language === 'es' ? 'Historial Global de Retiros' : 'Livro de Saques Global'}
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-[10px] uppercase tracking-widest text-white/30 border-b border-white/5">
                            <th className="pb-4 font-bold">ID</th>
                            <th className="pb-4 font-bold">{language === 'en' ? 'USER' : 'USUÁRIO'}</th>
                            <th className="pb-4 font-bold">{language === 'en' ? 'AMOUNT' : 'VALOR'}</th>
                            <th className="pb-4 font-bold">{language === 'en' ? 'WALLET BEP20' : 'CARTEIRA BEP20'}</th>
                            <th className="pb-4 font-bold">STATUS</th>
                            <th className="pb-4 pr-4 text-right">{language === 'en' ? 'DATE' : 'DATA'}</th>
                            <th className="pb-4 pr-4 text-right">{language === 'en' ? 'ACTIONS' : 'AÇÕES'}</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs">
                          {withdrawals.map(w => (
                            <tr key={w.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="py-4 font-mono text-white/40">{w.id}</td>
                              <td className="py-4">
                                <p className="font-bold text-white">{w.userName || "Unknown User"}</p>
                                <p className="text-[10px] text-white/40 font-mono">{w.userEmail || "No Email"}</p>
                              </td>
                              <td className="py-4 font-mono font-bold text-emerald-400">${parseFloat(w.amount).toFixed(2)}</td>
                              <td className="py-4 font-mono text-[11px] text-white/65 select-all">{w.wallet}</td>
                              <td className="py-4">
                                <span className={`px-2 py-1 rounded-md font-bold text-[10px] ${w.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' :
                                  w.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' :
                                    'bg-amber-500/10 text-amber-500'
                                  }`}>
                                  {w.status}
                                </span>
                              </td>
                              <td className="py-4 text-white/50 text-right pr-4 font-mono">
                                {new Date(w.timestamp).toLocaleDateString()}
                              </td>
                              <td className="py-4 text-right pr-4">
                                {w.status === 'PENDING' && (
                                  <div className="flex justify-end gap-2">
                                    <button onClick={() => approveWithdrawal(w.id)} className="p-2 bg-emerald-500 text-black rounded-lg hover:bg-emerald-400 transition-colors cursor-pointer" title={language === 'en' ? 'Approve' : 'Aprovar'}>
                                      <CheckCircle2 size={16} />
                                    </button>
                                    <button onClick={() => rejectWithdrawal(w.id)} className="p-2 bg-white/5 text-white/70 rounded-lg hover:bg-white/10 transition-colors cursor-pointer" title={language === 'en' ? 'Reject' : 'Rejeitar'}>
                                      <XCircle size={16} />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Payment History Ledger */}
                <div className="bg-[#0f0f12] border border-white/5 rounded-3xl p-8">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <History size={18} className="text-indigo-400" /> {t.admin.paymentHistoryLedger}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-widest text-white/30 border-b border-white/5">
                          <th className="pb-4 font-bold">{t.admin.transactionId}</th>
                          <th className="pb-4 font-bold">{t.admin.user}</th>
                          <th className="pb-4 font-bold">{t.admin.amount}</th>
                          <th className="pb-4 font-bold">{t.admin.method}</th>
                          <th className="pb-4 font-bold">{t.admin.status}</th>
                          <th className="pb-4 font-bold">{t.admin.hash}</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs">
                        {payments.map(p => {
                          const user = users.find(u => u.id === p.userId);
                          return (
                            <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="py-4 font-mono text-white/40">{p.id}</td>
                              <td className="py-4">
                                <p className="font-bold text-white">{user?.name || "Unknown User"}</p>
                                <p className="text-[10px] text-white/40 uppercase font-mono">{user?.email || `ID: ${p.userId}`}</p>
                              </td>
                              <td className="py-4 font-mono font-bold text-emerald-400">${p.amount}</td>
                              <td className="py-4 text-white/60">{p.method}</td>
                              <td className="py-4">
                                <span className={`px-2 py-1 rounded-md font-bold text-[10px] ${p.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' :
                                  p.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' :
                                    'bg-amber-500/10 text-amber-500'
                                  }`}>
                                  {p.status}
                                </span>
                              </td>
                              <td className="py-4 font-mono text-[10px] text-white/20 uppercase">{p.hash.substring(0, 10)}...</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-[#0f0f12] border border-white/5 rounded-3xl p-8"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-xl font-bold">{language === 'en' ? 'Transaction History' : language === 'es' ? 'Historial de Transacciones' : 'Histórico de Transações'}</h2>
                    <p className="text-sm text-white/40">{language === 'en' ? 'Complete ledger of all algorithmic executions' : language === 'es' ? 'Libro mayor completo de todas las ejecuciones algorítmicas' : 'Registro completo de todas as execuções algorítmicas'}</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                      <p className="text-[10px] text-white/40 uppercase font-bold tracking-tighter">{language === 'en' ? 'Total Trades' : language === 'es' ? 'Operaciones Totales' : 'Total de Trades'}</p>
                      <p className="text-lg font-mono font-bold leading-none">{trades.length}</p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-widest text-white/30 border-b border-white/5">
                        <th className="pb-4 font-bold">{language === 'en' ? 'Execution ID' : language === 'es' ? 'ID de Ejecución' : 'ID de Execução'}</th>
                        <th className="pb-4 font-bold">{language === 'en' ? 'Asset' : language === 'es' ? 'Activo' : 'Ativo'}</th>
                        <th className="pb-4 font-bold">{language === 'en' ? 'Type' : language === 'es' ? 'Tipo' : 'Tipo'}</th>
                        <th className="pb-4 font-bold">{language === 'en' ? 'Lot' : language === 'es' ? 'Lote' : 'Lote'}</th>
                        <th className="pb-4 font-bold">{language === 'en' ? 'Price' : language === 'es' ? 'Precio' : 'Preço'}</th>
                        <th className="pb-4 font-bold">{language === 'en' ? 'Time' : language === 'es' ? 'Hora' : 'Hora'}</th>
                        <th className="pb-4 font-bold">{language === 'en' ? 'Outcome' : language === 'es' ? 'Resultado' : 'Resultado'}</th>
                        <th className="pb-4 font-bold text-right">{language === 'en' ? 'Profit/Loss' : language === 'es' ? 'Ganancia/Pérdida' : 'Lucro/Prejuízo'}</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm font-medium">
                      {trades.map((trade) => (
                        <tr key={trade.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                          <td className="py-4 text-white/40 font-mono text-xs">{trade.id}</td>
                          <td className="py-4 font-bold">{trade.symbol}</td>
                          <td className="py-4">
                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${trade.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                              {trade.type}
                            </span>
                          </td>
                          <td className="py-4 font-mono">{trade.lot}</td>
                          <td className="py-4 font-mono text-white/60">{trade.openPrice.toFixed(5)}</td>
                          <td className="py-4 text-white/40 text-xs">{new Date(trade.time).toLocaleString()}</td>
                          <td className="py-4">
                            <span className={`text-[10px] font-bold ${trade.status === 'CLOSED' ? 'text-white/60' : 'text-emerald-400 animate-pulse'}`}>
                              {trade.status}
                            </span>
                          </td>
                          <td className={`py-4 text-right font-mono font-bold ${trade.profit && trade.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {trade.profit ? `${trade.profit >= 0 ? '+' : ''}$${trade.profit.toFixed(2)}` : '---'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {trades.length === 0 && (
                    <div className="py-20 text-center text-white/20 italic">
                      No transaction history available for current node.
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && config && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`grid grid-cols-1 ${currentUser?.role === 'ADMIN' ? 'lg:grid-cols-2' : 'max-w-2xl mx-auto w-full'} gap-8`}
              >
                <div className="bg-[#0f0f12] border border-white/5 rounded-3xl p-8 space-y-8">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2 mt-2">
                      {t.settings.accountFinance}
                    </h2>
                    <p className="text-sm text-white/40 mt-1">{t.settings.accountFinanceDesc}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest pl-1">{t.settings.fullName}</label>
                        <input
                          type="text"
                          value={profileForm.name}
                          onChange={(e) => setProfileForm(f => ({ ...f, name: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest pl-1">{t.settings.emailAddress}</label>
                        <input
                          type="email"
                          value={profileForm.email}
                          onChange={(e) => setProfileForm(f => ({ ...f, email: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest pl-1">{t.settings.updatePassword}</label>
                      <input
                        type="password"
                        value={profileForm.password}
                        onChange={(e) => setProfileForm(f => ({ ...f, password: e.target.value }))}
                        placeholder={t.settings.passwordPlaceholder}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest pl-1">{t.settings.usdtWallet}</label>
                      <div className="relative">
                        <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                        <input
                          type="text"
                          value={profileForm.wallet}
                          onChange={(e) => setProfileForm(f => ({ ...f, wallet: e.target.value }))}
                          placeholder={t.settings.walletPlaceholder}
                          className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm focus:border-blue-500 outline-none font-mono"
                        />
                      </div>
                    </div>

                    {/* MT5 Configs */}
                    <div className="pt-4 border-t border-white/5 mt-4">
                      <h3 className="text-sm font-bold text-white/80 mb-4 uppercase tracking-widest">Credenciais MT5</h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest pl-1">MT5 Login</label>
                          <input
                            type="text"
                            value={profileForm.mt5Login}
                            onChange={(e) => setProfileForm(f => ({ ...f, mt5Login: e.target.value }))}
                            placeholder="Ex: 12345678"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none font-mono"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest pl-1">MT5 Senha</label>
                          <input
                            type="password"
                            value={profileForm.mt5Password}
                            onChange={(e) => setProfileForm(f => ({ ...f, mt5Password: e.target.value }))}
                            placeholder="Sua senha do MT5"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest pl-1">MT5 Servidor</label>
                          <input
                            type="text"
                            value={profileForm.mt5Server}
                            onChange={(e) => setProfileForm(f => ({ ...f, mt5Server: e.target.value }))}
                            placeholder="Ex: Exness-MT5Trial6"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-4">
                    <button
                      onClick={updateProfile}
                      disabled={loading}
                      className="flex-1 py-4 bg-white text-black rounded-2xl font-bold text-sm hover:bg-white/90 transition-all flex items-center justify-center gap-2 shadow-xl shadow-white/5"
                    >
                      {loading ? <RefreshCw className="animate-spin" size={18} /> : <><Save size={18} /> {t.settings.updateProfileBtn}</>}
                    </button>
                  </div>
                </div>

                {/* Manual balance adjustment UI removed by request */}

                {currentUser?.role === 'ADMIN' && (
                  <>
                    <div className="bg-[#0f0f12] border border-white/5 rounded-3xl p-8 space-y-8">
                      <div>
                        <h2 className="text-xl font-bold flex items-center gap-2 mt-2">
                          {t.settings.engineConfig}
                        </h2>
                        <p className="text-sm text-white/40 mt-1">{t.settings.engineConfigDesc}</p>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-3">
                          <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">{t.settings.riskProfile}</label>
                          <div className="grid grid-cols-3 gap-3">
                            {['CONSERVATIVE', 'MEDIUM', 'AGGRESSIVE'].map((level) => (
                              <button
                                key={level}
                                onClick={() => setConfig({ ...config, riskLevel: level })}
                                className={`py-3 rounded-xl text-[10px] font-bold border transition-all ${config.riskLevel === level
                                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40'
                                  : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                                  }`}
                              >
                                {level}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">{t.settings.lotMultiplier}</label>
                            <span className="text-xs font-mono text-blue-400">{config.lotMultiplier.toFixed(4)}</span>
                          </div>
                          <input
                            type="range"
                            min="0.0001"
                            max="0.0020"
                            step="0.0001"
                            value={config.lotMultiplier}
                            onChange={(e) => setConfig({ ...config, lotMultiplier: parseFloat(e.target.value) })}
                            className="w-full accent-blue-500 h-1.5 bg-white/10 rounded-full"
                          />
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">{t.settings.minConsensus}</label>
                            <span className="text-xs font-mono text-blue-400">{config.minScore}%</span>
                          </div>
                          <input
                            type="range"
                            min="40"
                            max="90"
                            step="1"
                            value={config.minScore}
                            onChange={(e) => setConfig({ ...config, minScore: parseInt(e.target.value) })}
                            className="w-full accent-blue-500 h-1.5 bg-white/10 rounded-full"
                          />
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest pl-1">{language === 'en' ? 'Trading Direction' : language === 'es' ? 'Dirección de Operación' : 'Direção de Operação'}</label>
                          </div>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={config.allowBuy !== false}
                                onChange={(e) => setConfig({ ...config, allowBuy: e.target.checked })}
                                className="accent-blue-500 w-4 h-4"
                              />
                              {language === 'en' ? 'Allow BUY' : language === 'es' ? 'Permitir COMPRA' : 'Permitir COMPRA'}
                            </label>
                            <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={config.allowSell !== false}
                                onChange={(e) => setConfig({ ...config, allowSell: e.target.checked })}
                                className="accent-blue-500 w-4 h-4"
                              />
                              {language === 'en' ? 'Allow SELL' : language === 'es' ? 'Permitir VENDA' : 'Permitir VENDA'}
                            </label>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest pl-1">{language === 'en' ? 'Active Assets (Comma separated)' : language === 'es' ? 'Activos Activos (Separados por coma)' : 'Ativos Ativos (Separados por vírgula)'}</label>
                          </div>
                          <input
                            type="text"
                            value={Array.isArray(config.symbols) ? config.symbols.join(',') : (config.symbols || '')}
                            onChange={(e) => setConfig({ ...config, symbols: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                            placeholder="XAUUSD"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-blue-500 outline-none font-mono text-white"
                          />
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest pl-1">{t.settings.usdtReceiver}</label>
                          </div>
                          <input
                            type="text"
                            value={config.paymentWallet || ''}
                            onChange={(e) => setConfig({ ...config, paymentWallet: e.target.value })}
                            placeholder="0x..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-blue-500 outline-none font-mono text-white"
                          />
                        </div>
                      </div>

                      <div className="pt-4 flex gap-4">
                        <button
                          onClick={saveConfig}
                          disabled={loading}
                          className="flex-1 py-4 bg-white text-black rounded-2xl font-bold text-sm hover:bg-white/90 transition-all flex items-center justify-center gap-2 shadow-xl shadow-white/5"
                        >
                          {loading ? <RefreshCw className="animate-spin" size={18} /> : <><Save size={18} /> {t.settings.saveConfigBtn}</>}
                        </button>
                        <button className="px-6 py-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl flex items-center justify-center hover:bg-red-500/20 transition-all">
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>

                    <div className="bg-[#0f0f12] border border-white/5 rounded-3xl p-8">
                      <h3 className="text-lg font-bold mb-6">{t.settings.strategyWeights}</h3>
                      <div className="space-y-10">
                        <WeightControl label={t.dashboard.smc} value={config.strategyWeights.smc * 100} color="#3b82f6" />
                        <WeightControl label={t.dashboard.momentum} value={config.strategyWeights.momentum * 100} color="#10b981" />
                        <WeightControl label={t.dashboard.aiBias} value={config.strategyWeights.ai} color="#8b5cf6" max={50} />

                        <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-4">
                          <AlertTriangle className="text-amber-500 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1">{t.settings.warningSMC}</p>
                            <p className="text-[10px] leading-relaxed text-amber-200/60">
                              {t.settings.warningSMCDesc}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Payment Modal */}
        <AnimatePresence>
          {showPaymentModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPaymentModal(null)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg bg-[#0f0f12] border border-white/10 rounded-[32px] p-8 md:p-12 shadow-2xl space-y-8"
              >
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold">{language === 'en' ? 'Checkout' : language === 'es' ? 'Pago' : 'Pagamento'}</h2>
                  <p className="text-white/40">{showPaymentModal.title} — ${showPaymentModal.price} USDT</p>
                </div>

                <div className="space-y-6">
                  <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-6 space-y-4">
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{language === 'en' ? 'Wallet Address (USDT BEP20)' : language === 'es' ? 'Dirección de Billetera (USDT BEP20)' : 'Carteira de Pagamento (USDT BEP20)'}</p>
                    <div className="flex items-center gap-3">
                      <code className="flex-1 bg-black/40 p-3 rounded-xl border border-white/5 text-[11px] font-mono break-all leading-relaxed text-white">
                        {targetPaymentWallet || config?.paymentWallet || '0x883a831511a1b71b4920cd32d3694ecef432b585'}
                      </code>
                      <button
                        onClick={() => {
                          const addr = targetPaymentWallet || config?.paymentWallet || '0x883a831511a1b71b4920cd32d3694ecef432b585';
                          navigator.clipboard.writeText(addr);
                          alert(language === 'en' ? 'Wallet copied!' : 'Carteira copiada!');
                        }}
                        className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all flex items-center justify-center shrink-0 cursor-pointer"
                        title={language === 'en' ? 'Copy Wallet' : 'Copiar Carteira'}
                      >
                        <Copy size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Network Fee/Commission info section */}
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
                    <p className="text-[11px] text-white/60 leading-relaxed">
                      {language === 'en'
                        ? `To activate instantly, send exactly ${showPaymentModal.price} USDT. Remember to add the network transfer commission (normally $0.10 - $0.30 USDT on BEP20) so the net received value is correct.`
                        : language === 'es'
                          ? `Para activar al instante, envíe exactamente ${showPaymentModal.price} USDT. Recuerde agregar la comisión de envío de la red (normalmente $0.10 - $0.30 USDT en BEP20) para que el monto neto sea exacto.`
                          : `Para ativação imediata, envie exatamente $${showPaymentModal.price} USDT. BEP20 para que o valor líquido recebido seja exato.`
                      }
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest pl-1">{language === 'en' ? 'Transaction Hash' : language === 'es' ? 'Hash de la Transacción' : 'Hash do Pagamento'}</label>
                    <input
                      type="text"
                      value={paymentHash}
                      onChange={(e) => setPaymentHash(e.target.value)}
                      placeholder="0x..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-blue-500 outline-none font-mono"
                    />
                    <p className="text-[10px] text-white/20 italic">{language === 'en' ? 'Paste the hash after completing the transfer.' : language === 'es' ? 'Pegue el hash después de completar la transferencia.' : 'Cole a hash após completar a transferência.'}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setShowPaymentModal(null)}
                    className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-sm hover:bg-white/10 transition-all"
                  >
                    {language === 'en' ? 'Cancel' : language === 'es' ? 'Cancelar' : 'Cancelar'}
                  </button>
                  <button
                    onClick={submitPayment}
                    disabled={loading}
                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20"
                  >
                    {loading ? <RefreshCw className="animate-spin mx-auto" size={20} /> : (language === 'en' ? 'SUBMIT HASH' : language === 'es' ? 'ENVIAR HASH' : 'ENVIAR HASH')}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

    </div>
  );
}

/*
function NavItem({ icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
        active 
          ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/10 font-bold' 
          : 'text-white/40 hover:bg-white/5 hover:text-yellow-500 active:text-yellow-500'
      }`}
    >
      <span className={`${active ? 'text-black' : 'group-hover:scale-110 group-hover:text-yellow-500'} transition-transform duration-200`}>
        {icon}
      </span>
      <span className="hidden md:block text-sm">{label}</span>
    </button>
  );
}

function StatCard({ label, value, delta, icon, valueClassName }: { label: string, value: string | number, delta: string, icon: any, valueClassName?: string }) {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-[#0f0f12] border border-white/5 rounded-3xl p-6 transition-all border-hover:border-white/10 shadow-2xl"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
          {icon}
        </div>
        <div className="px-2 py-1 bg-white/10 border border-white/20 rounded-md">
          <span className="text-[10px] font-black text-white uppercase tracking-tighter">{delta}</span>
        </div>
      </div>
      <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-1">{label}</p>
      <h3 className={`text-2xl font-mono font-black tracking-tight ${valueClassName || 'text-white'}`}>{value}</h3>
    </motion.div>
  );
}

function StrategyGauge({ label, percentage, color }: { label: string, percentage: number, color: string }) {
  return (
    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 min-w-0">
      <div className="flex items-center justify-between mb-3 gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 truncate" title={label}>{label}</span>
        <span className="text-xs font-mono font-bold shrink-0" style={{ color }}>{percentage}%</span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function AffiliateLevel({ level, percentage, label, color, language }: { level: number, percentage: number, label: string, color: string, language: Language }) {
  const glowClass = level === 1 ? "shadow-[0_0_25px_rgba(59,130,246,0.5)]" : level === 2 ? "shadow-[0_0_20px_rgba(96,165,250,0.4)]" : "shadow-[0_0_15px_rgba(168,85,247,0.3)]";
  
  return (
    <div className="group bg-white/5 border border-white/5 p-6 rounded-3xl flex items-center justify-between hover:border-white/10 transition-all">
      <div className="flex items-center gap-6">
        <div className={`w-12 h-12 rounded-2xl ${color} ${glowClass} flex items-center justify-center text-black font-black text-lg`}>
          {level}
        </div>
        <div>
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest">{label}</p>
          <p className="text-xl font-bold">{language === 'en' ? `Level ${level}` : language === 'es' ? `Nivel ${level}` : `Nível ${level}`}</p>
        </div>
      </div>
      <div className="text-right">
        <span className="text-3xl font-black bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">{percentage}%</span>
      </div>
    </div>
  );
}

function Step({ number, title, desc }: { number: string, title: string, desc: string }) {
  return (
    <div className="flex gap-4">
      <span className="text-blue-500 font-mono font-bold">{number}</span>
      <div>
        <p className="font-bold text-sm">{title}</p>
        <p className="text-xs text-white/40 leading-relaxed mt-1">{desc}</p>
      </div>
    </div>
  );
}

function BenefitCard({ title, desc, icon }: { title: string, desc: string, icon: any }) {
  return (
    <div className="bg-[#0f0f12] border border-white/5 p-8 rounded-[32px] hover:bg-[#141418] transition-colors border-hover:border-white/10">
      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="font-bold mb-2">{title}</h3>
      <p className="text-xs text-white/40 leading-relaxed">{desc}</p>
    </div>
  );




function WeightControl({ label, value, color, max = 100 }: { label: string, value: number, color: string, max?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest pl-1">
        <span className="text-white/40">{label}</span>
        <span style={{ color }}>{value}%</span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${(value / max) * 100}%` }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function StrategyMetric({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-white/40">{label}</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </div>
  );
}

function BenefitItem({ title, desc, icon }: { title: string, desc: string, icon: any }) {
  return (
    <div className="flex gap-4">
      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="font-bold text-sm">{title}</p>
        <p className="text-[11px] text-white/40 leading-relaxed mt-1">{desc}</p>
      </div>
    </div>
  );
}
*/
