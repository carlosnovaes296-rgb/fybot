/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo } from 'react';
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
  Cpu,
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
} from 'lucide-react';

// OTP helper and config for Deriv authentication
// OTP removed

import {
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
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
// import DailyTargetSystem from './components/DailyTargetSystem';
import { TradingChart } from './components/TradingChart';

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
import { TradingScheduleTimer } from './components/TradingScheduleTimer';
import { NavItem } from './components/NavItem';
import { StatCard } from './components/StatCard';
import { StrategyGauge } from './components/StrategyGauge';
import { WeightControl } from './components/WeightControl';
import { StrategyMetric } from './components/StrategyMetric';
import { AffiliateLevel } from './components/AffiliateLevel';
import { Step } from './components/Step';
import { BenefitCard, BenefitItem } from './components/BenefitCard';
import { PricingCard } from './components/PricingCard';
import { ConnectDeriv } from './components/ConnectDeriv';
import { Trophy, ChevronDown, PlayCircle, LogIn, ChevronLeft, Check, MessageSquare, Plus, Shield, LayoutGrid, AlertCircle, ArrowUpRight, ArrowDownRight, Smartphone, Info } from 'lucide-react';

// --- PKCE Auth Helpers ---
function generateCodeVerifier() {
  const array = new Uint32Array(56 / 2);
  window.crypto.getRandomValues(array);
  return Array.from(array, (dec) => ('0' + dec.toString(16)).slice(-2)).join('');
}

async function handleDerivPKCELogin(clientId: string) {
  try {
    const verifier = generateCodeVerifier();
    localStorage.setItem('deriv_code_verifier', verifier);
    // CORRIGIDO: guarda o client_id/app_id usado aqui, para reaproveitar
    // exatamente o mesmo valor na troca do código por token (client_id tem que
    // bater nos dois passos do fluxo OAuth/PKCE, senão a Deriv rejeita a troca
    // com erro de client inválido). Antes esse valor era perdido e a troca de
    // código usava um client_id diferente, hardcoded, no exchangeCode().
    localStorage.setItem('deriv_oauth_client_id', clientId);

    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    const challenge = btoa(String.fromCharCode(...Array.from(new Uint8Array(digest)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const redirectUri = 'https://fybot.life/';
    // CORRIGIDO: o code_challenge (e o método S256) nunca eram enviados na URL
    // de autorização - o PKCE era calculado à toa, pois sem esses parâmetros a
    // Deriv não tem como validar o code_verifier depois, na troca do código por
    // token. Isso fazia o fluxo PKCE não ter proteção real nenhuma.
    window.location.href = `https://oauth.deriv.com/oauth2/authorize?app_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&l=PT&brand=deriv&code_challenge=${challenge}&code_challenge_method=S256`;
  } catch (e: any) {
    alert("Error generating PKCE: " + e.message);
  }
}
// --------------------

const MT5TradingViewChart = ({ symbol }: { symbol: string }) => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    container.current.innerHTML = '';
    
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    
    let displaySymbol = symbol;
    if (symbol.includes('R_100') || symbol.includes('R_') || symbol.includes('1HZ')) {
      displaySymbol = 'OANDA:XAUUSD';
    } else if (!displaySymbol.includes(':')) {
       displaySymbol = 'OANDA:' + displaySymbol;
    }

    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: displaySymbol,
      interval: "15",
      timezone: "America/Sao_Paulo",
      theme: "dark",
      style: "1",
      locale: "br",
      enable_publishing: false,
      backgroundColor: "rgba(0, 0, 0, 1)",
      gridColor: "rgba(17, 17, 17, 1)",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      studies: [
        "MASimple@tv-basicstudies",
        "MASimple@tv-basicstudies"
      ],
      support_host: "https://www.tradingview.com",
      overrides: {
        "mainSeriesProperties.candleStyle.upColor": "#00FF00",
        "mainSeriesProperties.candleStyle.downColor": "#000000",
        "mainSeriesProperties.candleStyle.borderUpColor": "#00FF00",
        "mainSeriesProperties.candleStyle.borderDownColor": "#00FF00",
        "mainSeriesProperties.candleStyle.wickUpColor": "#00FF00",
        "mainSeriesProperties.candleStyle.wickDownColor": "#00FF00",
        "paneProperties.background": "#000000",
        "paneProperties.vertGridProperties.color": "#111111",
        "paneProperties.horzGridProperties.color": "#111111"
      }
    });

    const currentContainer = container.current;
    currentContainer.appendChild(script);

    return () => {
      try {
        if (currentContainer && script.parentNode === currentContainer) {
          currentContainer.removeChild(script);
        }
      } catch (e) {
        // ignore cleanup errors
      }
    };
  }, [symbol]);

  return (
    <div className="tradingview-widget-container" ref={container} style={{ height: "100%", width: "100%" }}>
    </div>
  );
};

const checkIsWeekend = () => {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const adjustedHour = (utcHour - 3 + 24) % 24;
  const day = now.getUTCDay();

  // Fim de semana (Domingo = 0, Sábado = 6)
  if (day === 0 || day === 6) return true;
  // Fora do horário (06:00 até 16:59:59)
  if (adjustedHour < 6 || adjustedHour >= 17) return true;

  return false;
};

export default function App() {
  const isWeekend = checkIsWeekend();
  const [language, setLanguage] = useState<Language>('pt');
  const t = translations[language];

  const [userCountry, setUserCountry] = useState<string>('BR');

  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        if (data && data.country_code) {
          setUserCountry(data.country_code);
        }
      })
      .catch(e => console.error('Failed to fetch country:', e));
  }, []);

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try {
      return localStorage.getItem('isLoggedIn') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showProfilePassword, setShowProfilePassword] = useState(false);
  const [showDerivModal, setShowDerivModal] = useState(false);
  const [showLicenseRequiredModal, setShowLicenseRequiredModal] = useState(false);
  const [stats, setStats] = useState<Stats>({
    botRunning: false,
    balance: 0,
    equity: 0,
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
  const [showReferralHistoryModal, setShowReferralHistoryModal] = useState(false);
  const [adminWithdrawals, setAdminWithdrawals] = useState<any[]>([]);
  const [adminCommissions, setAdminCommissions] = useState<any[]>([]);


  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawWallet, setWithdrawWallet] = useState('');
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [withdrawalMessage, setWithdrawalMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [filterActiveNetworkOnly, setFilterActiveNetworkOnly] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [licenseCopied, setLicenseCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<any>(null);
  const [pixData, setPixData] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'USDT' | 'PIX'>('USDT');
  const [leaderQuery, setLeaderQuery] = useState('MARCELO BONANI DA SILVA');
  const [leaderStats, setLeaderStats] = useState<any>(null);
  const [loadingLeader, setLoadingLeader] = useState(false);
  const [usdtTxHash, setUsdtTxHash] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('currentUser');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });
  const isAdminUser = currentUser?.email === 'fybotoficial22@gmail.com' || currentUser?.email === 'carlosnovaes296@gmail.com' || currentUser?.email === 'carlosnovaes600@gmail.com' || currentUser?.email === 'jfcn2020@gmail.com' || currentUser?.id === '1' || currentUser?.id === '1jsleiedp' || currentUser?.role === 'ADMIN' || (currentUser?.name && currentUser.name.toLowerCase().includes('jcneto')) || (currentUser?.email && currentUser.email.toLowerCase().includes('jcneto'));
  const baseEarned = referralHistory.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const withdrawnSum = withdrawals.filter(w => w.userId === currentUser?.id && w.status !== 'REJECTED').reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const actualEarned = baseEarned;
  const availableBalance = Math.max(0, actualEarned - withdrawnSum);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [referredByCode, setReferredByCode] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('ref') || '';
    }
    return '';
  });
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [licenseKeyField, setLicenseKeyField] = useState('');
  const [licenseActivationError, setLicenseActivationError] = useState<string | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ type: 'user' | 'license'; id: string; displayLabel: string } | null>(null);
  const [selectedInterval, setSelectedInterval] = useState('30M');
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'7D' | '30D' | '90D' | 'ALL'>('30D');
  const [tradeFilter, setTradeFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [manualBalanceInput, setManualBalanceInput] = useState('');
  const [manualAccountType, setManualAccountType] = useState('REAL');

  const [tradeSettings, setTradeSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('fybotTradeSettings');
      const parsed = saved ? JSON.parse(saved) : {};
      return { amount: parsed.amount ?? 10, takeProfit: parsed.takeProfit ?? 1, stopLoss: parsed.stopLoss ?? 2 };
    } catch {
      return { amount: 10, takeProfit: 1, stopLoss: 2 };
    }
  });

  const updateTradeSettings = (key: string, value: number) => {
    const updated = { ...tradeSettings, [key]: value };
    setTradeSettings(updated);
    localStorage.setItem('fybotTradeSettings', JSON.stringify(updated));
  };

  // CORRIGIDO: hasActiveLicense agora usa useMemo para não recalcular a cada
  // render (o polling de status roda a cada 1s, então recalcular licenses.some()
  // em toda renderização era desnecessário).
  const hasActiveLicense = useMemo(() => {
    return (
      isAdminUser ||
      licenses.some(l => l.userId === currentUser?.id && l.status === 'ACTIVE') ||
      (stats.activeLicense != null && stats.activeLicense.status === 'ACTIVE')
    );
  }, [isAdminUser, currentUser?.id, licenses, stats.activeLicense]);

  const [profileForm, setProfileForm] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    password: '',
    wallet: currentUser?.wallet || '',
    paymentWallet: '',

    derivToken: currentUser?.derivToken || '',
    derivTokenDemo: currentUser?.derivTokenDemo || '',
    derivTokenReal: currentUser?.derivTokenReal || '',
    activeAccountType: currentUser?.activeAccountType || 'DEMO'
  });

  const [targetPaymentWallet, setTargetPaymentWallet] = useState<string>('');

  const fetchPaymentDestination = async () => {
    if (!currentUser) return;
    try {
      const data = await safeFetch(`/api/payment-destination?userId=${currentUser.id}&t=${Date.now()}`);
      if (data && data.wallet) {
        setTargetPaymentWallet(data.wallet);
      } else {
        setTargetPaymentWallet(config?.paymentWallet || '0x8c46C0Df64C0C0070562e2007F6d9c0Aa7C5966b');
      }
    } catch (e) {
      console.error(e);
      setTargetPaymentWallet(config?.paymentWallet || '0x8c46C0Df64C0C0070562e2007F6d9c0Aa7C5966b');
    }
  };

  const logContainerRef = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0);
  const [livePrice, setLivePrice] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setIsLoggedIn(false);
      setCurrentUser(null);
      localStorage.removeItem('currentUser');
      localStorage.removeItem('isLoggedIn');
      setIsSignUp(true);
      setReferredByCode(ref);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const search = window.location.search || window.location.hash;

    // Novo Fluxo PKCE (Authorization Code)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const errorParam = urlParams.get('error');
    const errorDesc = urlParams.get('error_description');

    if (errorParam) {
      alert("A Deriv negou o acesso: " + errorParam + " - " + (errorDesc || ""));
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code) {
      const exchangeCode = async () => {
        const codeVerifier = localStorage.getItem('deriv_code_verifier');
        if (!codeVerifier) {
          alert("Erro: Código Verificador PKCE não encontrado no navegador.");
          return;
        }
        // CORRIGIDO: antes o client_id aqui era um valor hardcoded
        // ('33SRHHormRjw8l1LxKtKl') diferente do app_id realmente usado para pedir
        // a autorização em handleDerivPKCELogin (ex: '34bOZbDxJP7IkYh3EO6X0'). Num
        // fluxo OAuth/PKCE o client_id TEM que ser o mesmo nos dois passos -
        // senão a Deriv rejeita a troca do código por token. Agora recuperamos o
        // client_id que foi de fato usado, salvo no login.
        const oauthClientId = localStorage.getItem('deriv_oauth_client_id') || '34bOZbDxJP7IkYh3EO6X0';

        try {
          // Usando o endpoint oficial auth.deriv.com
          const response = await fetch('https://auth.deriv.com/oauth2/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              code: code,
              client_id: oauthClientId,
              redirect_uri: 'https://fybot.life/',
              code_verifier: codeVerifier
            })
          });
          const data = await response.json();

          if (data.access_token) {
            // Limpa os dados temporários do PKCE agora que a troca foi concluída
            localStorage.removeItem('deriv_code_verifier');
            localStorage.removeItem('deriv_oauth_client_id');

            // Salva temporariamente como Real e Demo para testar a conexão
            let derivTokenReal = data.access_token;
            let derivTokenDemo = data.access_token;
            let defaultToken = data.access_token;

            window.history.replaceState({}, document.title, window.location.pathname);
            const savedUserStr = localStorage.getItem('currentUser');
            if (savedUserStr) {
              const savedUser = JSON.parse(savedUserStr);
              fetch('/api/user/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: savedUser.id,
                  derivTokenDemo: derivTokenDemo,
                  derivTokenReal: derivTokenReal,
                  derivToken: defaultToken
                })
              })
                .then(res => res.json())
                .then(apiData => {
                  if (apiData.success) {
                    setCurrentUser(apiData.user);
                    localStorage.setItem('currentUser', JSON.stringify(apiData.user));
                    window.location.reload();
                  }
                });
            }
          } else {
            alert("Falha na Deriv: " + JSON.stringify(data));
          }
        } catch (e: any) {
          alert("Erro de comunicação com a Deriv: " + e.message);
        }
      };

      exchangeCode();
      return;
    }

    // Fluxo Antigo (Implicit) - Mantido por segurança
    if (search.includes('token1=')) {
      const params = new URLSearchParams(search.replace('#', '?'));

      // Inicialização dos tokens (Corrigido)
      let derivTokenDemo = '';
      let derivTokenReal = '';
      let defaultToken = '';

      for (let i = 1; i <= 10; i++) {
        const acct = params.get(`acct${i}`);
        const token = params.get(`token${i}`);
        if (acct && token) {
          if (!defaultToken) defaultToken = token;
          if (acct.startsWith('VRTC') || acct.startsWith('DOT')) {
            derivTokenDemo = token;
          } else {
            derivTokenReal = token;
          }
        }
      }

      if (!derivTokenDemo && !derivTokenReal) {
        defaultToken = params.get('token1') || '';
      }

      if (defaultToken) {
        window.history.replaceState({}, document.title, window.location.pathname);
        const savedUserStr = localStorage.getItem('currentUser');
        if (savedUserStr) {
          try {
            const savedUser = JSON.parse(savedUserStr);
            fetch('/api/user/profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: savedUser.id,
                derivTokenDemo: derivTokenDemo || savedUser.derivTokenDemo,
                derivTokenReal: derivTokenReal || savedUser.derivTokenReal,
                derivToken: defaultToken
              })
            })
              .then(res => res.json())
              .then(data => {
                if (data.success) {
                  setCurrentUser(data.user);
                  localStorage.setItem('currentUser', JSON.stringify(data.user));
                  alert(language === 'en' ? 'Deriv accounts successfully connected!' : 'Contas Deriv (Real e Demo) conectadas com sucesso! O painel será atualizado.');
                  window.location.reload();
                } else {
                  alert('Erro ao salvar tokens na conta: ' + data.error);
                }
              })
              .catch(err => alert('Erro na comunicação com o servidor: ' + err.message));
          } catch (e: any) {
            alert('Erro ao processar dados locais: ' + e.message);
          }
        } else {
          alert('ATENÇÃO: Você não está logado no Fybot neste navegador! O token da Deriv foi recebido, mas não há conta para salvá-lo. Faça o login primeiro.');
        }
      }
    }
  }, [language]);

  // WebSocket
  useEffect(() => {
    // Trata o retorno do OAuth da Deriv
    const params = new URLSearchParams(window.location.search);
    const token1 = params.get('token1');
    const acct1 = params.get('acct1');
    const token2 = params.get('token2');
    const acct2 = params.get('acct2');

    if (token1 && currentUser) {
      console.log('Tokens recebidos via OAuth:', acct1, acct2);

      let derivTokenReal = currentUser.derivTokenReal;
      let derivTokenDemo = currentUser.derivTokenDemo;

      // Descobre qual é a Demo (VRTC) e qual é a Real (CR)
      if (acct1 && (acct1.startsWith('VRTC') || acct1.startsWith('DOT'))) derivTokenDemo = token1;
      else if (acct1 && acct1.startsWith('CR')) derivTokenReal = token1;

      if (acct2 && (acct2.startsWith('VRTC') || acct2.startsWith('DOT'))) derivTokenDemo = token2;
      else if (acct2 && acct2.startsWith('CR')) derivTokenReal = token2;

      // Atualiza o banco de dados
      fetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          updates: { derivTokenReal, derivTokenDemo }
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setCurrentUser(data.user);
            alert('Conexão com a Deriv realizada com sucesso através de Autenticação Segura!');
            // Limpa a URL para não vazar o token
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        })
        .catch(err => console.error('Erro ao salvar token OAuth:', err));
    }
  }, [currentUser]);

  // Efeito para conectar à Deriv e mostrar o saldo na dashboard
  // CORRIGIDO: este efeito não fazia mais nada (WS local removido, comentário já
  // avisava isso), mas continuava declarando variáveis (`ws`, `pingInterval`)
  // sem uso e sem nenhuma função de limpeza. Como o fetchStatus() (polling REST)
  // já cobre a atualização de saldo, o efeito foi removido por completo.

  // Lógica Principal de Operação do Bot (Motor de Trade Contínuo)
  // O MOTOR REAL AGORA RODA NO SERVIDOR (server.ts)!
  // O frontend não envia mais sinais ou ordens aleatórias, ele apenas reflete o estado do WebSocket real.
  useEffect(() => {
    // Simulador removido.
  }, [stats.botRunning, currentUser?.activeAccountType]);

  useEffect(() => {
    if (currentUser) {
      setProfileForm({
        name: currentUser.name || '',
        email: currentUser.email || '',
        password: currentUser.password || '',
        wallet: currentUser.wallet || '',
        paymentWallet: currentUser.paymentWallet || '',

        derivToken: currentUser.derivToken || '',
        derivTokenDemo: currentUser.derivTokenDemo || '',
        derivTokenReal: currentUser.derivTokenReal || '',
        activeAccountType: currentUser.activeAccountType || 'DEMO'
      });
      setWithdrawWallet(currentUser.wallet || '');
      fetchPaymentDestination();
    }
  }, [currentUser]);


  const verifyUsdtPayment = async () => {
    if (!usdtTxHash) {
      alert("Por favor, insira a Hash da Transação (TxHash).");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/payment/usdt/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash: usdtTxHash.trim(),
          userId: currentUser?.id,
          amount: showPaymentModal.price,
          planType: showPaymentModal.title,
          email: currentUser?.email
        })
      });

      const data = await response.json();

      if (data.success) {
        alert("✅ " + data.message);
        setShowPaymentModal(null);
        window.location.reload();
      } else {
        alert("❌ Erro: " + (data.error || 'Não foi possível verificar.'));
      }
    } catch (e) {
      alert("Erro ao conectar com o servidor para verificação.");
    } finally {
      setLoading(false);
    }
  };

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
    if (!isLoggedIn || !isAdminUser) return;
    const t = Date.now();
    const headers = { 'x-admin-userid': currentUser?.id || '' };
    const adminId = currentUser?.id || '';
    const [uData, lData, pData, wData, cData] = await Promise.all([
      safeFetch(`/api/admin/users?t=${t}&adminId=${adminId}`, { headers }),
      safeFetch(`/api/admin/licenses?t=${t}&adminId=${adminId}`, { headers }),
      safeFetch(`/api/admin/payments?t=${t}&adminId=${adminId}`, { headers }),
      safeFetch(`/api/withdrawals?t=${t}`),
      safeFetch(`/api/admin/commissions?t=${t}&adminId=${adminId}`, { headers })
    ]);
    if (uData) setUsers(uData);
    if (lData) setLicenses(lData);
    if (pData) setPayments(pData);
    if (wData) setAdminWithdrawals(wData);
    if (cData) setAdminCommissions(cData);
  };

  const fetchLeaderStats = async () => {
    if (!leaderQuery) return;
    setLoadingLeader(true);
    const data = await safeFetch(`/api/admin/leader-network-stats?leaderQuery=${encodeURIComponent(leaderQuery)}&t=${Date.now()}`, {
      headers: { 'x-admin-userid': currentUser?.id || '' }
    });
    if (data && !data.error) {
      setLeaderStats(data);
    } else {
      setLeaderStats(null);
      alert(data?.error || 'Líder não encontrado');
    }
    setLoadingLeader(false);
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

  const resetDailyTarget = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja zerar a meta diária (desbloquear robô) para este usuário?')) return;
    try {
      const res = await fetch('/api/daily-target/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id })
      });
      const data = await res.json();
      if (data.success) {
        alert('Meta zerada e robô desbloqueado com sucesso!');
        fetchAdminData();
      } else {
        alert('Erro ao zerar meta: ' + data.error);
      }
    } catch(e) {
      console.error(e);
      alert('Erro de conexão');
    }
  };

  const saveAdminEdit = async () => {
    if (!editingUser) return;
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-userid': currentUser?.id || '' 
        },
        body: JSON.stringify(editingUser)
      });
      if (res.ok) {
        setShowEditUserModal(false);
        setEditingUser(null);
        fetchAdminData();
      } else {
        alert('Erro ao salvar as edições');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar as edições');
    }
  };

  const deleteUser = async (id: string, name?: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o usuário ${name || id}?`)) return;
    try {
      await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-userid': currentUser?.id || '' }
      });
      fetchAdminData();
    } catch (e) {
      console.error(e);
    }
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
      headers: {
        'Content-Type': 'application/json',
        'x-admin-userid': currentUser?.id || ''
      }
    });
    fetchAdminData();
  };

  const deletePayment = async (id: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o pagamento ${id}?`)) return;
    try {
      await fetch(`/api/admin/payments/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-userid': currentUser?.id || '' }
      });
      fetchAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteWithdrawal = async (id: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o saque ${id}?`)) return;
    try {
      await fetch(`/api/admin/withdrawals/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-userid': currentUser?.id || '' }
      });
      fetchAdminData();
    } catch (e) {
      console.error(e);
    }
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
      headers: {
        'Content-Type': 'application/json',
        'x-admin-userid': currentUser?.id || ''
      }
    });
    fetchAdminData();
  };

  const approveWithdrawal = async (id: string) => {
    await fetch(`/api/admin/withdrawals/${id}/approve`, {
      method: 'POST',
      headers: { 'x-admin-userid': currentUser?.id || '' }
    });
    fetchAdminData();
    fetchWithdrawals();
  };

  const rejectWithdrawal = async (id: string) => {
    await fetch(`/api/admin/withdrawals/${id}/reject`, {
      method: 'POST',
      headers: { 'x-admin-userid': currentUser?.id || '' }
    });
    fetchAdminData();
    fetchWithdrawals();
  };

  const handleRequestWithdrawal = async (e: any) => {
    e.preventDefault();
    if (!currentUser) return;
    setWithdrawalLoading(true);
    setWithdrawalMessage(null);

    // CORRIGIDO: parseFloat('') retorna NaN, e "NaN < 50" é falso, então um
    // campo vazio ou não numérico passava direto por esta validação. Agora
    // tratamos explicitamente o caso de valor inválido/ausente.
    const parsedAmount = parseFloat(withdrawAmount);
    if (!withdrawAmount || isNaN(parsedAmount) || parsedAmount < 50) {
      setWithdrawalMessage({
        text: language === 'en' ? 'Minimum withdrawal is $50.00 USD.' : language === 'es' ? 'El retiro mínimo es de $50.00 USD.' : 'O saque mínimo permitido é de $50.00 USD.',
        isError: true
      });
      setWithdrawalLoading(false);
      return;
    }

    if (availableBalance < 50) {
      setWithdrawalMessage({
        text: language === 'en' ? `Insufficient available balance ($${availableBalance.toFixed(2)}). Minimum withdrawal is $50.` : language === 'es' ? `Saldo disponible insuficiente ($${availableBalance.toFixed(2)}). El retiro mínimo es $50.` : `Saldo disponível insuficiente ($${availableBalance.toFixed(2)}). O saque mínimo é de $50.`,
        isError: true
      });
      setWithdrawalLoading(false);
      return;
    }

    if (parsedAmount > availableBalance) {
      setWithdrawalMessage({
        text: language === 'en' ? 'Insufficient balance for this amount.' : language === 'es' ? 'Saldo insuficiente para este monto.' : 'Saldo insuficiente para o valor solicitado.',
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
          userName: currentUser.name,
          userEmail: currentUser.email,
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
        setStats(prev => ({ ...prev, balance: data.balance, equity: data.equity }));
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
      if (profileForm.derivToken) profileForm.derivToken = profileForm.derivToken.replace(/\s+/g, '');
      if (profileForm.derivTokenDemo) profileForm.derivTokenDemo = profileForm.derivTokenDemo.replace(/\s+/g, '');
      if (profileForm.derivTokenReal) profileForm.derivTokenReal = profileForm.derivTokenReal.replace(/\s+/g, '');

      // VERIFICAÇÃO E AUTORIZAÇÃO DE TOKENS DEMO/REAL
      const verifyToken = async (token: string, type: 'DEMO' | 'REAL'): Promise<{ isValid: boolean, message: string }> => {
        if (!token) return { isValid: true, message: '' }; // Permite limpar o token
        // Bypass total de validação para evitar bloqueios na UI
        return { isValid: true, message: 'OK' };
      };

      if (profileForm.derivTokenDemo !== currentUser.derivTokenDemo) {
        const demoCheck = await verifyToken(profileForm.derivTokenDemo, 'DEMO');
        if (!demoCheck.isValid) {
          alert(demoCheck.message);
          setLoading(false);
          return;
        }
      }

      if (profileForm.derivTokenReal !== currentUser.derivTokenReal) {
        const realCheck = await verifyToken(profileForm.derivTokenReal, 'REAL');
        if (!realCheck.isValid) {
          alert(realCheck.message);
          setLoading(false);
          return;
        }
      }

      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profileForm, id: currentUser.id })
      });

      let data;
      try {
        data = await res.json();
      } catch (err) {
        alert("Erro Crítico: O servidor não encontrou a rota de salvar perfil. VOCÊ PRECISA REINICIAR O SERVIDOR (node server.cjs) PARA APLICAR A CORREÇÃO QUE EU FIZ!");
        setLoading(false);
        return;
      }

      console.log("Received profile response:", data);
      if (data.success) {
        let updatedUser = { ...currentUser, ...data.user };

        // Atualiza com os tokens
        updatedUser.derivTokenDemo = profileForm.derivTokenDemo;
        updatedUser.derivTokenReal = profileForm.derivTokenReal;

        // Fazer uma chamada extra para salvar os tokens no backend
        try {
          await fetch('/api/user/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: updatedUser.id,
              derivTokenDemo: updatedUser.derivTokenDemo,
              derivTokenReal: updatedUser.derivTokenReal,
              derivToken: updatedUser.activeAccountType === 'REAL' ? updatedUser.derivTokenReal : updatedUser.derivTokenDemo
            })
          });
        } catch (err) { }

        setCurrentUser(updatedUser);
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
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
      const isDemo = currentUser?.activeAccountType === 'DEMO';
      setStats(prev => {
        // [FIX] Comparar data.trades em vez de data.openTrades para detectar mudanças no lucro flutuante
        const hasTradeChanged = JSON.stringify(prev.trades) !== JSON.stringify(data.trades) || prev.balance !== data.balance;
        const hasLicenseChanged = JSON.stringify(prev.activeLicense) !== JSON.stringify(data.activeLicense) || prev.systemBlocked !== data.systemBlocked;
        if (!hasTradeChanged && prev.botRunning === data.botRunning && prev.dailyProfit === data.dailyProfit && !hasLicenseChanged) return prev;
        
        return {
          ...prev,
          ...data,
          // Não sobreescreve o saldo com 0 caso o frontend já tenha puxado via REST
          balance: (data.balance != null && data.balance > 0) ? data.balance : prev.balance,
          equity: (data.equity != null && data.equity > 0) ? data.equity : prev.equity,
          accountType: isDemo ? 'DEMO' : (currentUser?.activeAccountType || 'DEMO')
        };
      });
      if (data.logs) {
        const cleanLogs = data.logs.filter((l: string) => !l.includes('ERRO DE TOKEN DERIV') && !l.includes('Invalid token format') && !l.includes('sem o prefixo Bearer') && !l.includes('Symbol frxXAUUSD is invalid'));
        setLogs(cleanLogs);
      }
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

  // submitPayment logic replaced with PIX integration

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
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('isLoggedIn', 'true');
        window.location.reload();
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
    if (!registerName || !loginEmail || !loginPassword || !registerPhone) {
      alert("Please fill all fields including phone");
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
          phone: registerPhone,
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
    const isUserAdmin = currentUser?.role === 'ADMIN' || currentUser?.email === 'jfcn2020@gmail.com' || currentUser?.email === 'fybotoficial22@gmail.com' || currentUser?.email === 'jfcn600@gmail.com' || currentUser?.email === 'carlosnovaes600@gmail.com';

    // If system is blocked, it's because it's outside trading hours
    // (Removido a pedido - liberar botão iniciar para todos)
    // if (!stats.botRunning && stats.systemBlocked) {
    //   alert(
    //     language === 'en'
    //       ? "Market Closed! The robot only operates from 06:00 to 17:00 (Mon-Fri)."
    //       : language === 'es'
    //         ? "¡Mercado Cerrado! El robot solo opera de 06:00 a 17:00 (Lun-Vie)."
    //         : "Mercado Fechado! O sistema só permite operações de Segunda a Sexta, das 06:00 às 17:00."
    //   );
    //   return;
    // }

    // License check (Removido a pedido)
    // if (!stats.botRunning && !stats.activeLicense && !isUserAdmin) {
    //   alert(
    //     language === 'en'
    //       ? "You need an active license to start the robot. Please request a license in the plans menu."
    //       : language === 'es'
    //         ? "Necesita una licencia activa para iniciar el robot. Por favor solicite una licencia en el menú de planes."
    //         : "Você precisa de uma licença ativa para iniciar o robô. Por favor, adquira uma licença no menu inferior."
    //   );
    //   setActiveTab('plans');
    //   return;
    // }

    // Market Closed Check (Mon-Fri 06:00 - 17:00 BRT)
    // REMOVIDO A PEDIDO DO USUÁRIO - OPERAÇÃO 24H LIBERADA
    if (!stats.botRunning && !isUserAdmin) {
      // Operação liberada 24h
    }

    // Strict requirement: must have active license to start (bypassed for ADMIN)
    if (!stats.botRunning && !hasActiveLicense && !isUserAdmin) {
      setShowLicenseRequiredModal(true);
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
          userId: currentUser?.id,
          tradeSettings: tradeSettings
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

  const closeManualTrade = async (contractId: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/control/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          contractId: contractId
        })
      });
      const data = await res.json();
      if (!data.success) {
        alert("Failed to close trade: " + (data.error || "Unknown error"));
      } else {
        fetchStatus();
      }
    } catch (e) {
      console.error("Error closing manual trade", e);
    }
  };

  const autoSaveTokens = async () => {
    if (!currentUser) return;
    try {
      let tDemo = profileForm.derivTokenDemo ? profileForm.derivTokenDemo.replace(/\s+/g, '') : '';
      let tReal = profileForm.derivTokenReal ? profileForm.derivTokenReal.replace(/\s+/g, '') : '';
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentUser.id, derivTokenDemo: tDemo, derivTokenReal: tReal })
      });
      const data = await res.json();
      if (data.success) {
        let updatedUser = { ...currentUser, ...data.user, derivTokenDemo: tDemo, derivTokenReal: tReal };
        setCurrentUser(updatedUser);
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleAccountType = async () => {
    if (!currentUser) return;
    const newType = currentUser.activeAccountType === 'REAL' ? 'DEMO' : 'REAL';
    // O Token não é mais obrigatório no MT5!
    const newToken = newType === 'REAL' ? (currentUser.derivTokenReal || 'MT5_REAL') : (currentUser.derivTokenDemo || 'MT5_DEMO');

    setLoading(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentUser.id,
          activeAccountType: newType,
          derivToken: newToken,
          derivTokenDemo: profileForm.derivTokenDemo || currentUser.derivTokenDemo,
          derivTokenReal: profileForm.derivTokenReal || currentUser.derivTokenReal
        })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        // Reload to reconnect websocket with new token
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) return;

    fetchStatus();
    fetchConfig();
    fetchReferrals();
    if (isAdminUser) {
      fetchAdminData();
    }

    const interval = setInterval(() => {
      fetchStatus();
      fetchReferrals();
      if (isAdminUser) {
        fetchAdminData();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isLoggedIn, currentUser?.role]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0f1522] flex flex-col items-center justify-center lg:items-start lg:pl-24 xl:pl-40 p-4 font-sans relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/fybot_neon_small.png"
            alt="Fybot Dubai Background"
            className="w-full h-full object-cover object-center pointer-events-none"
          />
        </div>

        <div className="absolute top-4 right-4 z-50 flex items-center gap-1 bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
          <button
            onClick={() => setLanguage('en')}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all text-xs font-bold ${language === 'en' ? 'bg-[#2563eb] text-white shadow-md' : 'text-white/60 hover:text-white'}`}
          >
            🇺🇸
          </button>
          <button
            onClick={() => setLanguage('pt')}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all text-xs font-bold ${language === 'pt' ? 'bg-[#2563eb] text-white shadow-md' : 'text-white/60 hover:text-white'}`}
          >
            🇧🇷
          </button>
          <button
            onClick={() => setLanguage('es')}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all text-xs font-bold ${language === 'es' ? 'bg-[#2563eb] text-white shadow-md' : 'text-white/60 hover:text-white'}`}
          >
            🇪🇸
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[550px] bg-[#181f2f] border border-white/5 rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10"
        >
          <div className="space-y-1 pb-6">
            {isSignUp && (
              <h1 className="text-[22px] font-bold text-white">
                {language === 'en' ? 'Create Account' : language === 'es' ? 'Crear Cuenta' : 'Criar Conta'}
              </h1>
            )}
            <div className="inline-block px-2 py-0.5 mt-1">
              <p className="text-[20px] font-medium text-[#FCD535]">
                {isSignUp ? (language === 'en' ? 'Fill the details below' : 'Preencha os dados abaixo') : (language === 'en' ? 'Access your account' : 'Acesse sua conta')}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {isSignUp && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                    {language === 'en' ? 'Name' : 'Nome'}
                  </label>
                  <input
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full bg-[#1e2536] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-[#FCD535] focus:ring-1 focus:ring-[#FCD535] outline-none transition-all placeholder-white/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                    {language === 'en' ? 'Referral Code' : 'Código de Indicação'}
                  </label>
                  <input
                    type="text"
                    value={referredByCode}
                    onChange={(e) => setReferredByCode(e.target.value)}
                    placeholder="Ex: CARLOS296"
                    className="w-full bg-[#1e2536] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-[#FCD535] focus:ring-1 focus:ring-[#FCD535] outline-none transition-all placeholder-white/20 uppercase"
                  />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                {language === 'en' ? 'E-mail' : 'E-mail'}
              </label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full bg-[#1e2536] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-[#FCD535] focus:ring-1 focus:ring-[#FCD535] outline-none transition-all placeholder-white/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                {language === 'en' ? 'Password' : 'Senha'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#1e2536] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-[#FCD535] focus:ring-1 focus:ring-[#FCD535] outline-none transition-all pr-12 placeholder-white/20 tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {isSignUp && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                  {language === 'en' ? 'Phone' : 'Telefone'}
                </label>
                <input
                  type="tel"
                  placeholder="+55 (11) 99999-9999"
                  value={registerPhone}
                  onChange={(e) => setRegisterPhone(e.target.value)}
                  className="w-full bg-[#1e2536] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-[#FCD535] focus:ring-1 focus:ring-[#FCD535] outline-none transition-all placeholder-white/20"
                />
              </div>
            )}
          </div>

          <button
            onClick={isSignUp ? handleRegister : handleLogin}
            disabled={loading}
            className="w-full mt-6 py-3 bg-[#FCD535] text-black hover:bg-[#F3BA2F] rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20"
          >
            {loading ? <RefreshCw className="animate-spin" size={18} /> : (isSignUp ? (language === 'en' ? 'Create Account' : 'Criar Conta') : (language === 'en' ? 'Log in' : 'Entrar'))}
            {!loading && <ArrowRight size={16} />}
          </button>

          {!isSignUp && (
            <>
              <div className="flex items-center gap-3 my-6">
                <div className="h-px bg-white/5 flex-1" />
                <span className="text-[11px] text-white/30">{language === 'en' ? 'or continue with' : 'ou continue com'}</span>
                <div className="h-px bg-white/5 flex-1" />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => window.open('https://t.deriv.link?t=SX2VHLYCZXYD', '_blank')}
                  className="flex-1 py-3 bg-transparent border border-white/10 rounded-xl text-[#FCD535] hover:bg-[#FCD535]/10 transition-all text-[16px] font-bold flex items-center justify-center gap-2"
                >
                  <Users size={20} />
                  {language === 'en' ? 'Create Deriv' : 'Criar conta Deriv'}
                </button>
                <button
                  onClick={() => handleDerivPKCELogin('34bOZbDxJP7IkYh3EO6X0')}
                  className="flex-1 py-3 bg-[#ff444f] border border-[#ff444f] rounded-xl text-white hover:bg-[#ff444f]/80 transition-all text-[16px] font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#ff444f]/20"
                >
                  <Globe size={20} />
                  {language === 'en' ? 'Connect Deriv' : 'Conectar Deriv'}
                </button>
              </div>
            </>
          )}

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-[18px] font-bold text-[#FCD535] hover:text-[#F3BA2F] transition-colors"
            >
              {isSignUp ? (language === 'en' ? 'Log in' : 'Entrar') : (language === 'en' ? 'Create account' : 'Criar conta')}
            </button>
            {!isSignUp && (
              <button
                onClick={() => alert(language === 'en' ? 'Contact support to reset your password.' : 'Entre em contato com o suporte para redefinir sua senha.')}
                className="text-[18px] font-bold text-[#FCD535] hover:text-[#F3BA2F] transition-colors"
              >
                {language === 'en' ? 'Forgot password' : 'Esqueci minha senha'}
              </button>
            )}
          </div>

          <div className="mt-6 text-center">
            <p className="text-[20px] text-white/50 font-medium">
              Fybot © 2026
            </p>
          </div>
        </motion.div>

        {/* Risk Warning Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-[550px] mt-6 bg-black/70 backdrop-blur-md border border-white/10 rounded-xl p-5 shadow-2xl relative z-10 hidden lg:block"
        >
          <h3 className="text-red-500 font-bold text-[18px] uppercase tracking-widest mb-2 flex items-center gap-2">
            <AlertTriangle size={18} /> Aviso de Risco
          </h3>
          <p className="text-[15px] text-white/60 leading-relaxed text-justify mb-3">
            A Deriv oferece derivativos complexos, como opções e contratos por diferença (“CFDs”). Esses produtos podem não ser adequados para todos os clientes, e negociá-los implica riscos. Antes de negociar, entenda que: (a) você pode perder parte ou todo o dinheiro investido; (b) se houver conversão de moeda, as taxas de câmbio afetarão seu resultado. Nunca negocie com dinheiro emprestado ou que não pode perder.
          </p>
          <p className="text-[15px] text-white/60 leading-relaxed text-justify">
            Ao operar pela plataforma, você declara estar ciente e de acordo com estes termos. A plataforma não se responsabiliza por perdas decorrentes das operações realizadas.
          </p>
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

      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-72 bg-[#0f0f12] border-r border-white/5 flex flex-col items-stretch z-50 transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
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

          {/* History menu item removed by request */}
          <NavItem icon={<CreditCard size={20} />} label={t.sidebar.licenses} active={activeTab === 'plans'} onClick={() => { setActiveTab('plans'); setIsMobileMenuOpen(false); }} />
          <NavItem icon={<Share2 size={20} />} label={t.sidebar.affiliates} active={activeTab === 'affiliates'} onClick={() => { setActiveTab('affiliates'); setIsMobileMenuOpen(false); }} />
          {isAdminUser && (
            <>
              <NavItem icon={<UserCog size={20} />} label={t.sidebar.admin} active={activeTab === 'admin'} onClick={() => { setActiveTab('admin'); fetchAdminData(); setIsMobileMenuOpen(false); }} />

            </>
          )}
          <NavItem icon={<Settings size={20} />} label={t.sidebar.settings} active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }} />
          <a
            href="https://chat.whatsapp.com/BmAIP0oegZ3KPbFYeDcVPJ"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-yellow-500 hover:bg-white/5 hover:text-yellow-400"
          >
            <span className="group-hover:scale-110 transition-transform duration-200 text-yellow-500">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.725 1.451 5.486 0 9.95-4.46 9.953-9.952.002-2.661-1.029-5.163-2.902-7.038C16.543 1.743 14.041.712 11.382.712 5.89.712 1.425 5.179 1.422 10.672c-.001 1.636.425 3.234 1.233 4.634L1.656 21.82l6.23-1.63c-1.44.878-2.613 1.41-3.791 1.7-.223-.574-.63-1.624-.63-1.624zm12.355-6.732c-.3-.15-1.77-.872-2.045-.972-.275-.1-.475-.15-.675.15-.2.3-.775.972-.95 1.172-.175.2-.35.225-.65.075-.3-.15-1.265-.467-2.41-1.485-.89-.79-1.49-1.77-1.665-2.07-.175-.3-.02-.46.13-.61.135-.135.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.675-1.625-.925-2.225-.244-.589-.49-.51-.675-.52-.175-.01-.375-.01-.575-.01-.2 0-.525.075-.8.375-.275.3-1.05 1.025-1.05 2.5 0 1.475 1.075 2.9 1.225 3.1.15.2 2.11 3.22 5.11 4.52.714.31 1.27.496 1.7.635.717.227 1.37.195 1.885.118.575-.085 1.77-.724 2.02-1.388.25-.664.25-1.234.175-1.35-.075-.118-.275-.218-.575-.368z"/>
              </svg>
            </span>
            <span className="text-xl">{language === 'en' ? 'WhatsApp Group' : language === 'es' ? 'Grupo de WhatsApp' : 'Grupo do WhatsApp'}</span>
          </a>



        </nav>

          { (userCountry !== 'BR' || isAdminUser) && (
            <div className="px-4 pb-4">
              <a
                href="/FYBOT_API_Logic.mq5"
                download="FYBOT_API_Logic.mq5"
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group bg-[#00FF00]/10 text-[#00FF00] hover:bg-[#00FF00]/20 border border-[#00FF00]/30 shadow-[0_0_15px_rgba(0,255,0,0.1)] font-bold uppercase tracking-widest text-sm"
              >
                <Download size={20} className="group-hover:scale-110 transition-transform" />
                BAIXAR BOT MT5
              </a>
            </div>
          )}

        <div className="p-4 md:p-6 pb-10">


          <div className="md:bg-white/5 rounded-2xl p-4 flex items-center gap-3 border border-white/5 hover:border-yellow-500/20 transition-all">
            <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 font-bold text-xs uppercase border border-yellow-500/20">
              {currentUser?.name?.split(' ').map(n => n[0]).join('') || 'U'}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-white/90">{currentUser?.name || 'User'}</p>
            </div>
          </div>

          <button
            onClick={() => { setIsLoggedIn(false); setCurrentUser(null); setIsMobileMenuOpen(false); localStorage.removeItem('isLoggedIn'); localStorage.removeItem('currentUser'); }}
            className="mt-6 w-full flex items-center justify-start gap-4 px-4 py-3 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all"
          >
            <LogOut size={26} />
            <span className="font-bold text-xl uppercase tracking-wider">{t.sidebar.logout}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="pl-0 md:pl-72 min-h-screen w-full overflow-x-hidden">
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
                className="relative w-full max-w-md bg-[#16161a] border border-white/10 rounded-3xl p-5 sm:p-8 shadow-2xl"
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

          {showLicenseRequiredModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowLicenseRequiredModal(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-[#16161a] border border-red-500/20 rounded-3xl p-5 sm:p-8 shadow-2xl"
              >
                <button
                  onClick={() => setShowLicenseRequiredModal(false)}
                  className="absolute top-4 right-4 p-2 text-white/20 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center mb-8">
                  <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mb-4 animate-pulse">
                    <Lock size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Licença Necessária</h3>
                  <p className="text-sm text-white/60">Você precisa de uma licença ativa para iniciar o Fybot Pro.</p>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setShowLicenseRequiredModal(false);
                      setActiveTab('plans');
                    }}
                    className="w-full py-4 bg-red-600 text-white rounded-xl font-bold uppercase tracking-widest shadow-lg shadow-red-900/40 hover:bg-red-500 transition-all active:scale-[0.98]"
                  >
                    Comprar Agora
                  </button>
                  <button
                    onClick={() => {
                      setShowLicenseRequiredModal(false);
                      setShowLicenseModal(true);
                    }}
                    className="w-full py-4 bg-white/5 text-white/80 rounded-xl font-bold uppercase tracking-widest hover:bg-white/10 transition-all active:scale-[0.98]"
                  >
                    Já tenho uma licença
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
                className="relative w-full max-w-md bg-[#16161a] border border-red-500/15 rounded-3xl p-5 sm:p-8 shadow-2xl shadow-red-950/20"
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
            <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 shadow-lg shadow-black/20">
              <div className={`w-2.5 h-2.5 rounded-full ${stats.botRunning ? 'bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
              <span className="text-xs font-black text-white uppercase tracking-widest">{stats.botRunning ? t.header.active : t.header.idle}</span>
            </div>

            <div className="hidden md:flex items-center bg-[#0a0a0c] border border-white/10 rounded-full p-1 ml-4 overflow-hidden shadow-inner">
              {(currentUser?.role === 'ADMIN' || currentUser?.name?.toLowerCase().includes('alaides')) && (
                <button
                  onClick={toggleAccountType}
                  disabled={loading || currentUser?.activeAccountType === 'DEMO'}
                  className={`px-6 py-2 text-xs uppercase tracking-widest font-black rounded-full transition-all ${currentUser?.activeAccountType === 'DEMO' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/30' : 'bg-yellow-500/10 text-yellow-500/70 hover:bg-yellow-500/30'}`}
                >
                  CONTA DEMO
                </button>
              )}
              <button
                onClick={toggleAccountType}
                disabled={loading || currentUser?.activeAccountType === 'REAL'}
                className={`px-6 py-2 text-xs uppercase tracking-widest font-black rounded-full transition-all ${currentUser?.activeAccountType === 'REAL' ? 'bg-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.6)]' : 'bg-green-500/10 text-green-500/70 hover:bg-green-500/30'}`}
              >
                CONTA REAL
              </button>
            </div>

          </div>



          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex flex-col items-end mr-1 md:mr-2">
              <span className="hidden sm:inline text-[10px] uppercase tracking-tighter text-white/30">{t.header.equity}</span>
              <span className="text-sm md:text-lg font-mono font-bold text-white">${stats.equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            {(() => {
              // const isWeekendBlock = isWeekend && !isAdminUser; // Removido a pedido
              return (
                <button
                  onClick={toggleBot}
                  disabled={loading}
                  className={`flex items-center justify-center gap-2 px-3 py-2 md:px-6 md:py-2.5 rounded-xl transition-all duration-300 font-bold text-xs md:text-sm shadow-xl ${
                    stats.botRunning
                      ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 shadow-red-900/5'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'

                    }`}
                >
                  {loading ? (
                    <RefreshCw className="animate-spin" size={16} />
                  ) : stats.botRunning ? (
                    <><Pause size={16} fill="currentColor" /> <span className="hidden sm:inline">{t.header.stop}</span></>
                  ) : (
                    <><Play size={16} fill="currentColor" /> <span className="hidden sm:inline">{t.header.start}</span></>
                  )}
                </button>
              );
            })()}
          </div>
        </header>

        {/* Mobile Sub-header for Controls */}
        <div className="md:hidden flex items-center justify-between px-3 py-2 border-b border-white/5 bg-[#0a0a0c]/90 sticky top-20 z-30 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 shadow-lg shadow-black/20">
            <div className={`w-2.5 h-2.5 rounded-full ${stats.botRunning ? 'bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">{stats.botRunning ? t.header.active : t.header.idle}</span>
          </div>
          <div className="flex items-center bg-[#0a0a0c] border border-white/10 rounded-full p-1 overflow-hidden shadow-inner">
            {(isAdminUser) && (
              <button
                onClick={toggleAccountType}
                disabled={loading || currentUser?.activeAccountType === 'DEMO'}
                className={`px-4 py-1.5 text-[10px] uppercase tracking-widest font-black rounded-full transition-all ${currentUser?.activeAccountType === 'DEMO' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/30' : 'bg-yellow-500/10 text-yellow-500/70 hover:bg-yellow-500/30'}`}
              >
                DEMO
              </button>
            )}
            <button
              onClick={toggleAccountType}
              disabled={loading || currentUser?.activeAccountType === 'REAL'}
              className={`px-4 py-1.5 text-[10px] uppercase tracking-widest font-black rounded-full transition-all ${currentUser?.activeAccountType === 'REAL' ? 'bg-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.6)]' : 'bg-green-500/10 text-green-500/70 hover:bg-green-500/30'}`}
            >
              REAL
            </button>
          </div>
        </div>

        <div className="p-4 md:p-8 space-y-6 md:space-y-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-2"
              >


                {/* Top Grid — Enhanced StatCards with sparklines */}
                {(() => {
                  // Mostra o saldo mesmo se for zero, desde que stats.balance seja um número.
                  const isConnected = typeof stats.balance === 'number';
                  const displayBalance = isConnected ? stats.balance : 0;
                  return (
                    <div className="flex flex-col gap-2">
                      {/* TradingScheduleTimer foi removido a pedido do admin (trava diaria livre) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard
                          label=""
                          subLabel={`${t.dashboard.balance.replace(' (REAL / DEMO)', '').replace(' (CONTA REAL / DEMO)', '')} - ${stats.accountType === 'REAL' ? 'CONTA REAL' : stats.accountType === 'DEMO' ? 'CONTA DEMO' : 'OFFLINE'}`}
                          value={isConnected ? `$${displayBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Conectando...'}
                          delta={language === "en" ? "Progressive" : language === "es" ? "Progresivo" : "Progressiva"}
                          icon={<Wallet className="text-amber-500" />}
                          trendPositive={true}
                          labelClassName="text-amber-500"
                          valueClassName="text-amber-500"
                          trend={stats.pnlHistory?.slice(-12).map((p: any) => p.balance) || [10000, 10100, 10080, 10250, 10400, 10350, 10580, 10720, 10690, 10850, 11000, 11200]}
                        />
                        <StatCard
                          label=""
                          value={isConnected ? `$${(displayBalance * 0.02).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Conectando...'}
                          delta="2%"
                          icon={<Target className="text-amber-500" />}
                          trendPositive={true}
                          labelClassName="text-amber-500"
                          valueClassName="text-amber-500"
                          trend={[10, 12, 11, 14, 13, 15, 16, 14, 17, 18, 20, 19]}
                          subLabel="Projeção de ganho diário 2%"
                        />
                        {(() => {
                          // Só mostra lucro se estiver conectado com saldo real/demo validado
                          const realTimeProfit = isConnected ? (stats.dailyProfit || 0) : 0;
                          const liveTarget = displayBalance * 0.025;
                          return (
                            <StatCard
                              label=""
                              subLabel={t.dashboard.dailyProfitLabel}
                              value={isConnected ? `${realTimeProfit >= 0 ? '+' : '-'}$${Math.abs(realTimeProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Conectando...'}
                              delta={realTimeProfit && realTimeProfit >= liveTarget ? "100%" : `${liveTarget > 0 ? Math.round((realTimeProfit / liveTarget) * 100) : 0}%`}
                              icon={<TrendingUp className="text-amber-500" />}
                              valueClassName={realTimeProfit >= 0 ? "text-amber-500" : "text-red-400"}
                              labelClassName={realTimeProfit >= 0 ? "text-amber-500" : "text-red-400"}
                              trendPositive={realTimeProfit >= 0}
                            />
                          );
                        })()}

                        {stats.activeLicense?.expiryDate || hasActiveLicense ? (
                          <LicenseCountdown expiryDate={stats.activeLicense?.expiryDate || '2099-12-31T23:59:59.000Z'} t={t} licenseKey={stats.activeLicense?.key || currentUser?.id || 'LIFETIME'} />
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
                    </div>
                  );
                })()}
                {/* V8 SAFETY SHIELD - FULL WIDTH BANNER */}
                <div className="w-full bg-[#0f0f12] border border-white/5 rounded-3xl px-8 py-6 mb-8 relative overflow-hidden flex flex-col justify-center">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-yellow-500/[0.03] via-transparent to-transparent pointer-events-none" />

                  {(() => {
                    const safeTarget = (stats.balance || 0) * 0.035;
                    const progressPct = safeTarget > 0
                      ? Math.min(100, Math.max(0, ((stats.dailyProfit || 0) / safeTarget) * 100))
                      : 0;
                    return (
                      <>
                        <div className="flex items-center justify-between mb-3 relative z-10">
                          <div className="flex items-center gap-2">
                            <Cpu size={16} className="text-yellow-500 animate-pulse" />
                            <span className="text-[12px] font-bold text-white uppercase tracking-widest">V8 SAFETY SHIELD</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-mono text-white/40 uppercase font-bold">
                              {progressPct.toFixed(0)}% PROG.
                            </span>
                            <span className="text-[11px] text-yellow-500 font-black uppercase tracking-widest bg-yellow-500/10 px-2 py-1 rounded">
                              {stats.systemBlocked ? 'SISTEMA BLOQUEADO' : 'FASE PROTETIVA'}
                            </span>
                          </div>
                        </div>

                        <div className="w-full h-2 bg-white/5 border border-white/10 rounded-full overflow-hidden relative z-10">
                          <div
                            className={`h-full relative rounded-full ${stats.systemBlocked ? (stats.dailyProfit < 0 ? 'bg-red-500' : 'bg-green-500') : 'bg-gradient-to-r from-yellow-500 to-emerald-400'}`}
                            style={{ width: `${progressPct}%` }}
                          >
                            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_50%,rgba(255,255,255,0.4)_50%)] bg-[length:8px_100%] opacity-10 animate-pulse" />
                          </div>
                        </div>
                      </>
                    );
                  })()}


                </div>



                {/* Bottom Section: Execution Table & Live Console */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                  {/* Left: Execution Table (takes 2 columns if admin, else 3) */}
                  <div className={isAdminUser ? 'lg:col-span-2' : 'lg:col-span-3'}>
                    <div className="bg-[#0f0f12] border border-white/5 rounded-3xl p-6 w-full flex flex-col shadow-xl">
                      <div className="flex items-center justify-between mb-5">
                        <h3 className="font-bold flex items-center gap-2 uppercase tracking-widest text-base text-white/60">
                          <History size={16} /> {t.dashboard.recentExecutions}
                        </h3>
                        <div className="flex items-center gap-3">
                          <div className="flex bg-white/5 rounded-xl p-0.5 border border-white/5">
                            {(['ALL', 'OPEN', 'CLOSED'] as const).map(f => (
                              <button
                                key={f}
                                onClick={() => setTradeFilter(f)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${tradeFilter === f
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
                        </div>
                      </div>

                      <div className="overflow-x-auto scrollbar-hide">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                          <thead>
                            <tr className="border-b border-white/5 text-sm uppercase tracking-wider text-emerald-400 font-bold">
                              <th className="pb-4 font-bold">{language === 'en' ? 'Exec ID' : 'ID Exec.'}</th>
                              <th className="pb-4 font-bold">{language === 'en' ? 'Asset' : 'Ativo'}</th>
                              <th className="pb-4 font-bold">{language === 'en' ? 'Type' : 'Tipo'}</th>
                              <th className="pb-4 font-bold">Lot</th>
                              <th className="pb-4 font-bold">{language === 'en' ? 'Price' : 'Preço'}</th>
                              <th className="pb-4 font-bold text-emerald-400">{language === 'en' ? 'Time' : 'Hora'}</th>
                              <th className="pb-4 font-bold">{language === 'en' ? 'Status' : 'Status'}</th>
                              <th className="pb-4 font-bold text-right">P&L</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.03]">
                            {(() => {
                              const filtered = (stats.trades || []).filter((tr: any) => {
                                return tradeFilter === 'ALL' ? true : tr.status === tradeFilter;
                              }).sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime());
                              if (filtered.length === 0) return (
                                <tr>
                                  <td colSpan={8} className="py-12 text-center text-sm text-white/20 italic">
                                    {t.dashboard.noTrades}
                                  </td>
                                </tr>
                              );
                              const maxAbsProfit = Math.max(...filtered.filter((t: any) => t.profit).map((t: any) => Math.abs(Number(t.profit))), 1);
                              return filtered.slice(0, 20).map((trade: any, idx: number) => {
                                const isLatestTrade = idx === 0;
                                const profitVal = Number(trade.profit || 0);
                                const profitPct = profitVal ? (Math.abs(profitVal) / maxAbsProfit) * 100 : 0;
                                const isProfit = profitVal >= 0;
                                return (
                                  <motion.tr
                                    key={trade.id}
                                    initial={isLatestTrade ? { backgroundColor: 'rgba(59,130,246,0.05)' } : {}}
                                    animate={{ backgroundColor: 'rgba(255,255,255,0)' }}
                                    transition={{ duration: 2 }}
                                    className="text-sm text-white/80 hover:bg-white/[0.02] transition-colors group"
                                  >
                                    <td className="py-4 font-mono text-white/30">
                                      {isLatestTrade && (
                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 mr-2 animate-pulse" />
                                      )}
                                      {trade.id}
                                    </td>
                                    <td className="py-4 font-black text-white">
                                      {(trade.symbol || '').replace(/frx/i, '').replace(/FRX/i, '').replace('UNKNOWN', 'XAUUSD') || 'XAUUSD'}
                                    </td>
                                    <td className="py-4">
                                      {(() => {
                                        const rawType = String(trade.type);
                                        const isBuy = rawType === 'BUY' || rawType === 'MULTUP' || rawType === 'CALL';
                                        const isSell = rawType === 'MULTDOWN' || rawType === 'PUT';
                                        const displayType = (rawType === 'MULTUP' || rawType === 'CALL') ? 'BUY' : isSell ? 'SELL' : rawType;
                                        return (
                                          <span className={`px-2.5 py-1 rounded-md text-[11px] font-black ${isBuy
                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                            }`}>
                                            {displayType}
                                          </span>
                                        );
                                      })()}
                                    </td>
                                    <td className="py-4 font-mono text-white/50">{trade.amount || trade.lot}</td>
                                    <td className="py-4 font-mono text-white/70">{Number(trade.entryPrice || trade.openPrice || trade.price || trade.open_price || trade.entry_price || 0).toFixed(5)}</td>
                                    <td className="py-4 text-emerald-400 text-[13px] font-bold font-mono">
                                      {new Date(trade.openTime || trade.time || Date.now()).toLocaleString(language === 'pt' ? 'pt-BR' : language === 'es' ? 'es-ES' : 'en-US', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="py-4">
                                      {trade.status === 'CLOSED' ? (
                                        <span className="text-white/30 text-xs uppercase font-bold tracking-wider">● Closed</span>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <span className="flex items-center gap-1.5 text-emerald-400 text-xs uppercase font-black tracking-wider">
                                            <span className="relative flex h-2 w-2">
                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                            </span>
                                            Live
                                          </span>
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-4 text-right">
                                      {trade.profit != null ? (
                                        <div className="flex flex-col items-end gap-1.5">
                                          <span className={`font-mono font-black text-[15px] ${isProfit ? 'text-emerald-400' : 'text-red-400'
                                            }`}>
                                            {isProfit ? '+' : ''}${profitVal.toFixed(2)}
                                          </span>
                                          <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
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
                  </div>

                  {/* Right: Live Console (takes 1 column) */}
                  {isAdminUser && (
                    <div className="lg:col-span-1 h-full">
                      {/* <DailyTargetSystem stats={stats} language={language} fetchStatus={fetchStatus} isAdmin={currentUser?.role === 'ADMIN'} userId={currentUser?.id} /> */}

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
                                onClick={() => {
                                  setLogs([]);
                                  safeFetch('/api/user/clear-logs', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ userId: currentUser?.id })
                                  });
                                }}
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
                            const isGain = log.includes('✅') || log.includes('CLOSED') || log.includes('META') || log.includes('COMISSÃO') || log.includes('LUCRO');
                            const isLoss = log.includes('❌') || log.includes('PERDA') || log.includes('LIMITE') || log.includes('PREJUÍZO');
                            const isSystem = log.includes('⚙️') || log.includes('CONFIG') || log.includes('STARTED') || log.includes('STOPPED');
                            const isLock = log.includes('🔒') || log.includes('BLOQUEADO') || log.includes('BLOCKED');
                            const isSignal = log.includes('SIGNAL') || log.includes('INDICADO') || log.includes('🚀');
                            const isLatest = i === logs.length - 1;

                            let iconEl = <span className="text-white/20 shrink-0">›</span>;
                            let textColor = 'text-white/40';

                            if (isGain) { iconEl = <span className="shrink-0">✅</span>; textColor = 'text-emerald-400'; }
                            else if (isLoss) { iconEl = <span className="shrink-0">❌</span>; textColor = 'text-red-400'; }
                            else if (isLock) { iconEl = <span className="shrink-0">🔒</span>; textColor = 'text-yellow-400'; }
                            else if (isSystem) { iconEl = <span className="shrink-0">⚙️</span>; textColor = 'text-blue-400'; }
                            else if (isSignal) { iconEl = <span className="shrink-0">🚀</span>; textColor = 'text-indigo-400'; }

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
                  )}
                </div>


              </motion.div>
            )}

            {false && activeTab === 'strategies' && currentUser?.role === 'ADMIN' && (
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

            {false && activeTab === 'analytics' && currentUser?.role === 'ADMIN' && (
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

                {/* ===== LANÇAMENTO AUTOMÁTICO 09/SET/2026 00:00 BRT =====
                    Antes: só Licença Básica $10 com botão, outros são vitrine
                    A partir de 09/09/2026 meia-noite: TODOS os botões liberados
                    ======================================================= */}
                {(() => {
                  const isLaunched = true;
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-[1600px] mx-auto">
                      {(userCountry === 'BR' || isAdminUser) && (
                        <PricingCard
                          title={t.plans.card1Title}
                          price={10}
                          features={t.plans.card1Features}
                          language={language}
                          image="/fybot-logo.png.png"
                          onBuy={() => setShowPaymentModal({ title: t.plans.card1Title, price: 10 })}
                        />
                      )}
                      {(userCountry === 'BR' || isAdminUser) && (
                        <PricingCard
                        title={t.plans.card2Title}
                        price={20}
                        recommended
                        features={t.plans.card2Features}
                        language={language}
                        image="/fybot-logo.png.png"
                          onBuy={() => setShowPaymentModal({ title: t.plans.card2Title, price: 20 })}
                        />
                      )}
                      <PricingCard
                        title={t.plans.card3Title}
                        price={50}
                        features={t.plans.card3Features}
                        language={language}
                        image="/fybot-logo.png.png"
                        hideButton={!isLaunched}
                        onBuy={isLaunched ? () => setShowPaymentModal({ title: t.plans.card3Title, price: 50 }) : undefined}
                      />
                      <PricingCard
                        title={t.plans.card6Title || "Licença Sniper"}
                        price={100}
                        desc="120 Dias de Acesso Completo"
                        features={t.plans.card6Features || ["Duração 120 dias"]}
                        language={language}
                        image="/snaper1x1.png.png"
                        isVip={true}
                        titleColor="text-[#f59e0b] drop-shadow-[0_0_10px_rgba(245,158,11,0.6)]"
                        onBuy={() => setShowPaymentModal({ title: t.plans.card6Title || "Licença Sniper", price: 100, planType: "SNIPER" })}
                      />
                    </div>
                  );
                })()}


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
                {/* Hero Affiliate ocultado a pedido do usuário */}

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
                            const code = currentUser?.referralCode || 'Admin';
                            const referralUrl = `${window.location.origin}/?ref=${code}`;

                            // Função robusta para copiar (funciona em HTTP e HTTPS)
                            if (navigator.clipboard && window.isSecureContext) {
                              navigator.clipboard.writeText(referralUrl).then(() => {
                                alert(language === 'en' ? `Referral link copied!` : language === 'es' ? `¡Enlace de referencia copiado!` : `Link de indicação copiado!`);
                              });
                            } else {
                              // Fallback para HTTP (como http://209.97.163.75)
                              const textArea = document.createElement("textarea");
                              textArea.value = referralUrl;
                              textArea.style.position = "fixed";
                              textArea.style.left = "-999999px";
                              textArea.style.top = "-999999px";
                              document.body.appendChild(textArea);
                              textArea.focus();
                              textArea.select();
                              try {
                                document.execCommand('copy');
                                alert(language === 'en' ? `Referral link copied!` : language === 'es' ? `¡Enlace de referencia copiado!` : `Link de indicação copiado!`);
                              } catch (err) {
                                console.error('Fallback: Oops, unable to copy', err);
                                alert("Erro ao copiar o código. Por favor copie manualmente.");
                              }
                              document.body.removeChild(textArea);
                            }
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
                          ${referralHistory.reduce((sum, item) => sum + Number(item.amount), 0).toFixed(2)}
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
                                  {language === 'en' ? 'AVAILABLE' : language === 'es' ? 'DISPONIBLE' : 'SALDO DISPONÍVEL'}
                                </span>
                                <span className="text-2xl font-black text-amber-400 font-mono">
                                  ${availableBalance.toFixed(2)}
                                </span>
                              </div>
                              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
                                <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider block mb-1">
                                  {language === 'en' ? 'TOTAL EARNED' : language === 'es' ? 'TOTAL GANADO' : 'TOTAL RECEBIDO'}
                                </span>
                                <span className="text-2xl font-black text-emerald-400 font-mono">
                                  ${actualEarned.toFixed(2)}
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
                                  {language === 'en' ? 'Withdrawal Amount (Min $50)' : language === 'es' ? 'Monto a Retirar (Mín $50)' : 'Valor para Saque (Mín $50)'}
                                </label>
                                <div className="relative">
                                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono font-bold text-white/30">$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="50"
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
                                disabled={withdrawalLoading || !withdrawAmount || !withdrawWallet}
                                className="w-full bg-amber-500 text-black font-bold py-4 rounded-2xl hover:bg-amber-400 transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
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
                                    .sort((a, b) => {
                                      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
                                      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
                                      return timeB - timeA;
                                    })
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
                                            {w.createdAt
                                              ? new Date(w.createdAt).toLocaleDateString([], { day: '2-digit', month: '2-digit' }) + ' • ' + new Date(w.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                              : (w.timestamp
                                                ? new Date(w.timestamp).toLocaleDateString([], { day: '2-digit', month: '2-digit' }) + ' • ' + new Date(w.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                : 'N/A')}
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
                              .reduce((sum, item) => sum + Number(item.amount), 0);

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
                                            {item.phone && (
                                              <p className="text-[10px] text-white/40 truncate">{item.phone}</p>
                                            )}
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
                                      +${Number(item.amount).toFixed(2)}
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

            {activeTab === 'admin' && isAdminUser && (
              <motion.div
                key="admin"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Admin Overview Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Card: Total de Comissões dos Usuários */}
                  <div className="bg-[#0f0f12] border border-emerald-500/30 rounded-3xl p-6 relative overflow-hidden shadow-2xl shadow-emerald-950/20 group hover:border-emerald-500/50 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-emerald-400">
                      <Share2 size={64} />
                    </div>
                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5">
                      <Share2 size={14} className="text-emerald-400" />
                      {language === 'en' ? 'TOTAL USER COMMISSIONS' : language === 'es' ? 'COMISIONES TOTALES DE USUARIOS' : 'SOMA TOTAL DAS COMISSÕES'}
                    </p>
                    <p className="text-3xl font-black font-mono text-emerald-400 mt-2">
                      ${adminCommissions.reduce((sum, c) => sum + (Number(c.amount) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[11px] text-white/40 mt-2 font-medium">
                      {language === 'en' ? 'Total commissions generated across all users' : 'Soma de todas as comissões pagas aos afiliados'}
                    </p>
                  </div>

                  {/* Card: Total de Usuários */}
                  <div className="bg-[#0f0f12] border border-blue-500/20 rounded-3xl p-6 relative overflow-hidden shadow-xl shadow-black/20 group hover:border-blue-500/40 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-blue-400">
                      <Users size={64} />
                    </div>
                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1 flex items-center gap-1.5">
                      <Users size={14} className="text-blue-400" />
                      {language === 'en' ? 'TOTAL USERS' : language === 'es' ? 'TOTAL DE USUARIOS' : 'TOTAL DE USUÁRIOS'}
                    </p>
                    <p className="text-3xl font-black font-mono text-white mt-2">
                      {users.length}
                    </p>
                    <p className="text-[11px] text-white/40 mt-2 font-medium">
                      Usuários cadastrados na plataforma
                    </p>
                  </div>

                  {/* Card: Licenças Ativas */}
                  <div className="bg-[#0f0f12] border border-purple-500/20 rounded-3xl p-6 relative overflow-hidden shadow-xl shadow-black/20 group hover:border-purple-500/40 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-purple-400">
                      <Key size={64} />
                    </div>
                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1 flex items-center gap-1.5">
                      <Key size={14} className="text-purple-400" />
                      {language === 'en' ? 'ACTIVE LICENSES' : language === 'es' ? 'LICENCIAS ACTIVAS' : 'LICENÇAS ATIVAS'}
                    </p>
                    <p className="text-3xl font-black font-mono text-purple-400 mt-2">
                      {licenses.filter(l => l.status === 'ACTIVE').length}
                    </p>
                    <p className="text-[11px] text-white/40 mt-2 font-medium">
                      Licenças em operação no momento
                    </p>
                  </div>

                  {/* Card: Total de Saques */}
                  <div className="bg-[#0f0f12] border border-amber-500/20 rounded-3xl p-6 relative overflow-hidden shadow-xl shadow-black/20 group hover:border-amber-500/40 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-amber-400">
                      <Wallet size={64} />
                    </div>
                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1 flex items-center gap-1.5">
                      <Wallet size={14} className="text-amber-400" />
                      {language === 'en' ? 'TOTAL WITHDRAWALS' : language === 'es' ? 'RETIROS TOTALES' : 'TOTAL DE SAQUES'}
                    </p>
                    <p className="text-3xl font-black font-mono text-amber-400 mt-2">
                      ${adminWithdrawals.reduce((sum, w) => sum + (Number(w.amount) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[11px] text-white/40 mt-2 font-medium">
                      Solicitações de saques de comissão
                    </p>
                  </div>
                </div>

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
                            <p className="text-xs text-white/40 mb-1">{u.email}</p>
                            {(u as any).phone && (
                              <p className="text-xs text-white/40 mb-1">{(u as any).phone}</p>
                            )}
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                {u.status}
                              </span>
                              {typeof (u as any).botBalance !== 'undefined' && (
                                <>
                                  <span className="text-[10px] font-bold text-white/60 bg-white/5 px-2 py-0.5 rounded-full">
                                    Banca: <span className="text-white">${Number((u as any).botBalance).toFixed(2)}</span>
                                  </span>
                                  <span className="text-[10px] font-bold text-white/60 bg-white/5 px-2 py-0.5 rounded-full">
                                    Lucro: <span className={(u as any).botDailyProfit >= 0 ? "text-emerald-400" : "text-red-400"}>${Number((u as any).botDailyProfit || 0).toFixed(2)}</span>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 items-center flex-wrap">
                          <button
                            onClick={() => { setEditingUser({...u}); setShowEditUserModal(true); }}
                            title="Editar"
                            className="p-2 px-3 bg-purple-500/10 rounded-lg hover:bg-purple-500/20 text-purple-500 transition-colors flex items-center gap-1.5"
                          >
                            <Settings size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-tight">Editar</span>
                          </button>
                          <button
                            onClick={() => grantAccess(u.id)}
                            title={t.dashboard.grantAccess}
                            className="p-2 px-3 bg-emerald-500/10 rounded-lg hover:bg-emerald-500/20 text-emerald-500 transition-colors flex items-center gap-1.5"
                          >
                            <Key size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-tight">{language === 'en' ? 'Grant Access' : language === 'es' ? 'Dar Acceso' : 'Liberar Acesso'}</span>
                          </button>

                          <button
                            onClick={() => toggleUser(u.id)}
                            title={u.status === 'ACTIVE' ? 'Lock User' : 'Activate User'}
                            className="p-2 px-3 bg-white/5 rounded-lg hover:bg-white/10 text-white/60 transition-colors flex items-center gap-1.5"
                          >
                            {u.status === 'BLOCKED' ? <UserCheck size={14} /> : <Lock size={14} />}
                            <span className="text-[10px] font-bold uppercase tracking-tight">{u.status === 'BLOCKED' ? (language === 'en' ? 'Unlock' : language === 'es' ? 'Desbloquear' : 'Desbloquear') : (language === 'en' ? 'Lock' : language === 'es' ? 'Bloquear' : 'Bloquear')}</span>
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
                                {(l as any).userName && (
                                  <span className="text-[10px] text-white/40 font-mono">
                                    • {language === 'en' ? 'User' : language === 'es' ? 'Usuario' : 'Usuário'}: {(l as any).userName}
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
                    {adminWithdrawals.filter(w => w.status === 'PENDING').length === 0 ? (
                      <div className="py-10 text-center text-white/20 italic text-sm">
                        {language === 'en' ? 'No pending withdrawal requests.' : language === 'es' ? 'No hay solicitudes de retiro pendientes.' : 'Nenhum saque de comissão pendente no momento.'}
                      </div>
                    ) : (
                      adminWithdrawals.filter(w => w.status === 'PENDING').map(w => (
                        <div key={w.id} className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white font-mono">${parseFloat(w.amount).toFixed(2)}</span>
                              <span className="text-white/20 text-xs font-mono">• ID: {w.id}</span>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-500 uppercase tracking-wider">{language === 'en' ? 'PENDING' : 'PENDENTE'}</span>
                            </div>
                            <p className="text-xs text-white/70">
                              <strong>{language === 'en' ? 'User:' : 'Usuário:'}</strong> {w.userName || users.find(u => u.id === w.userId)?.name || 'Unknown'} ({w.userEmail || users.find(u => u.id === w.userId)?.email || 'N/A'})
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
                {adminWithdrawals.length > 0 && (
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
                          {adminWithdrawals.map(w => (
                            <tr key={w.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="py-4 font-mono text-white/40">{w.id}</td>
                              <td className="py-4">
                                <p className="font-bold text-white">{w.userName || users.find(u => u.id === w.userId)?.name || "Unknown User"}</p>
                                <p className="text-[10px] text-white/40 font-mono">{w.userEmail || users.find(u => u.id === w.userId)?.email || "No Email"}</p>
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
                                {w.createdAt ? new Date(w.createdAt).toLocaleDateString() : (w.timestamp ? new Date(w.timestamp).toLocaleDateString() : 'N/A')}
                              </td>
                              <td className="py-4 text-right pr-4">
                                <div className="flex justify-end gap-2">
                                  {w.status === 'PENDING' && (
                                    <>
                                      <button onClick={() => approveWithdrawal(w.id)} className="p-2 bg-emerald-500 text-black rounded-lg hover:bg-emerald-400 transition-colors cursor-pointer" title={language === 'en' ? 'Approve' : 'Aprovar'}>
                                        <CheckCircle2 size={16} />
                                      </button>
                                      <button onClick={() => rejectWithdrawal(w.id)} className="p-2 bg-white/5 text-white/70 rounded-lg hover:bg-white/10 transition-colors cursor-pointer" title={language === 'en' ? 'Reject' : 'Rejeitar'}>
                                        <XCircle size={16} />
                                      </button>
                                    </>
                                  )}
                                  <button
                                    onClick={() => deleteWithdrawal(w.id)}
                                    className="p-2 bg-red-400/10 rounded-lg hover:bg-red-400/20 text-red-400 transition-colors cursor-pointer border border-red-500/10"
                                    title={language === 'en' ? 'Delete' : 'Excluir'}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Global Commission Ledger (Admin view) */}
                {adminCommissions.length > 0 && (
                  <div className="bg-[#0f0f12] border border-white/5 rounded-3xl p-8">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                      <Network size={18} className="text-emerald-400" />
                      {language === 'en' ? 'Global Commission Ledger' : language === 'es' ? 'Libro Global de Comisiones' : 'Livro de Comissões Global'}
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-[10px] uppercase tracking-widest text-white/30 border-b border-white/5">
                            <th className="pb-4 font-bold">{language === 'en' ? 'REFERRER' : 'INDICADOR (QUEM GANHOU)'}</th>
                            <th className="pb-4 font-bold">{language === 'en' ? 'BUYER' : 'QUEM COMPROU'}</th>
                            <th className="pb-4 font-bold">{language === 'en' ? 'AMOUNT' : 'VALOR DA COMISSÃO'}</th>
                            <th className="pb-4 font-bold">{language === 'en' ? 'LEVEL' : 'NÍVEL'}</th>
                            <th className="pb-4 pr-4 text-right">{language === 'en' ? 'DATE' : 'DATA'}</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs">
                          {adminCommissions.map(c => (
                            <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="py-4">
                                <p className="font-bold text-white">{c.referrerName}</p>
                                <p className="text-[10px] text-white/40 font-mono">{c.referrerEmail}</p>
                              </td>
                              <td className="py-4">
                                <p className="font-bold text-white">{c.referredName}</p>
                                <p className="text-[10px] text-white/40 font-mono">{c.referredEmail}</p>
                              </td>
                              <td className="py-4 font-mono font-bold text-emerald-400">+${parseFloat(c.amount).toFixed(2)}</td>
                              <td className="py-4">
                                <span className="px-2 py-1 rounded-md font-bold text-[10px] bg-amber-500/10 text-amber-500">
                                  {language === 'en' ? 'Level' : 'Nível'} {c.level}
                                </span>
                              </td>
                              <td className="py-4 text-white/50 text-right pr-4 font-mono">
                                {new Date(c.timestamp).toLocaleString(language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
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
                          <th className="pb-4 font-bold text-right">{language === 'en' ? 'ACTIONS' : 'AÇÕES'}</th>
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
                              <td className="py-4 text-right">
                                <button
                                  onClick={() => deletePayment(p.id)}
                                  className="p-2 bg-red-400/10 rounded-lg hover:bg-red-400/20 text-red-400 transition-colors inline-flex items-center gap-1.5 border border-red-500/10"
                                  title={language === 'en' ? 'Delete Payment' : language === 'es' ? 'Eliminar Pago' : 'Excluir Pagamento'}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
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
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold ${trade.status === 'CLOSED' ? 'text-white/60' : 'text-emerald-400 animate-pulse'}`}>
                                {trade.status === 'OPEN' ? '• LIVE' : trade.status}
                              </span>
                            </div>
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

            {activeTab === 'leaderNetwork' && isAdminUser && (
              <motion.div
                key="leaderNetwork"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="bg-[#0f0f12] border border-white/5 rounded-3xl p-8 space-y-8 shadow-xl">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Painel da Rede de Líderes</h2>
                    <p className="text-white/40 text-sm">Pesquise por nome ou e-mail de um líder para visualizar todas as estatísticas da sua rede de afiliados e comissões ganhas.</p>
                  </div>
                  
                  <div className="flex flex-col md:flex-row gap-4">
                    <input 
                      type="text"
                      value={leaderQuery}
                      onChange={(e) => setLeaderQuery(e.target.value)}
                      placeholder="Nome ou Email do líder (ex: MARCELO BONANI)"
                      className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
                    />
                    <button 
                      onClick={fetchLeaderStats}
                      disabled={loadingLeader}
                      className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold px-8 py-3 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {loadingLeader ? 'Buscando...' : 'Buscar Líder'}
                    </button>
                  </div>

                  {leaderStats && leaderStats.leader && (
                    <div className="space-y-8 animate-fade-in">
                      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20">
                        <h3 className="text-lg font-bold text-white">Líder: <span className="text-emerald-400">{leaderStats.leader.name}</span></h3>
                        <p className="text-sm text-white/50">{leaderStats.leader.email}</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-black/40 border border-white/5 rounded-2xl p-6">
                          <p className="text-xs text-white/40 uppercase font-bold tracking-wider mb-2">Afiliados Diretos/Rede</p>
                          <p className="text-2xl font-black text-white">{leaderStats.stats.totalAffiliates}</p>
                          <div className="flex gap-2 mt-2 text-xs">
                            <span className="text-emerald-400">{leaderStats.stats.activeAffiliates} Ativos</span>
                            <span className="text-white/20">|</span>
                            <span className="text-red-400">{leaderStats.stats.inactiveAffiliates} Inativos</span>
                          </div>
                        </div>
                        
                        <div className="bg-black/40 border border-white/5 rounded-2xl p-6">
                          <p className="text-xs text-white/40 uppercase font-bold tracking-wider mb-2">Banca Total da Rede</p>
                          <p className="text-2xl font-black text-yellow-400">${leaderStats.stats.totalNetworkBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          <p className="text-xs text-white/40 mt-2">Soma do saldo de todos afiliados</p>
                        </div>
                        
                        <div className="bg-black/40 border border-white/5 rounded-2xl p-6 lg:col-span-2">
                          <p className="text-xs text-white/40 uppercase font-bold tracking-wider mb-2">Comissões Históricas (Total Recebido)</p>
                          <p className="text-2xl font-black text-emerald-400">${leaderStats.stats.totalCommissions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          <p className="text-xs text-white/40 mt-2">Soma de todas as comissões pagas para este líder</p>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold mb-4">Membros da Rede ({leaderStats.network.length})</h3>
                        <div className="overflow-x-auto rounded-xl border border-white/5">
                          <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-white/5 text-xs uppercase tracking-wider text-white/40">
                              <tr>
                                <th className="px-6 py-4">Nível</th>
                                <th className="px-6 py-4">Nome / Email</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Banca atual</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {leaderStats.network.map((item: any) => (
                                <tr key={item.id} className="hover:bg-white/[0.02]">
                                  <td className="px-6 py-4">
                                    <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-xs font-bold">Lvl {item.level}</span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <p className="font-bold">{item.name}</p>
                                    <p className="text-xs text-white/40">{item.email}</p>
                                    {item.phone && (
                                      <p className="text-xs text-white/40">{item.phone}</p>
                                    )}
                                  </td>
                                  <td className="px-6 py-4">
                                    {item.hasActiveLicense ? (
                                      <span className="text-emerald-400 text-xs font-bold px-2 py-1 rounded bg-emerald-400/10">ATIVO</span>
                                    ) : (
                                      <span className="text-red-400 text-xs font-bold px-2 py-1 rounded bg-red-400/10">INATIVO</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-right font-mono text-yellow-400">
                                    ${Number(item.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              ))}
                              {leaderStats.network.length === 0 && (
                                <tr>
                                  <td colSpan={4} className="px-6 py-8 text-center text-white/40 italic">Nenhum afiliado encontrado.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
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
                className={`grid grid-cols-1 ${isAdminUser ? 'lg:grid-cols-2' : 'max-w-2xl mx-auto w-full'} gap-8`}
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
                      <div className="relative">
                        <input
                          type={showProfilePassword ? "text" : "password"}
                          value={profileForm.password}
                          onChange={(e) => setProfileForm(f => ({ ...f, password: e.target.value }))}
                          placeholder={t.settings.passwordPlaceholder}
                          className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm focus:border-blue-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowProfilePassword(prev => !prev)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                        >
                          {showProfilePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* Deriv Connection Token */}
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-emerald-400 tracking-widest pl-1">Token Deriv (Conta Real)</label>
                      <input
                        type="text"
                        value={profileForm.derivTokenReal}
                        onChange={(e) => setProfileForm(f => ({ ...f, derivTokenReal: e.target.value }))}
                        placeholder="pat_..."
                        className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none text-emerald-100 placeholder-emerald-900/50"
                      />
                    </div>
                    {isAdminUser && (
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-amber-400 tracking-widest pl-1">Token Deriv (Conta Demo)</label>
                        <input
                          type="text"
                          value={profileForm.derivTokenDemo}
                          onChange={(e) => setProfileForm(f => ({ ...f, derivTokenDemo: e.target.value }))}
                          placeholder="pat_..."
                          className="w-full bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-sm focus:border-amber-500 outline-none text-amber-100 placeholder-amber-900/50"
                        />
                      </div>
                    )}
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
                onClick={() => {
                  setShowPaymentModal(null);
                  setPaymentMethod('USDT');
                  setUsdtTxHash('');
                }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg bg-[#0f0f12] border border-white/10 rounded-[32px] p-8 md:p-12 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
              >
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold">{language === 'en' ? 'Checkout' : language === 'es' ? 'Pago' : 'Pagamento'}</h2>
                  <p className="text-white/40">{showPaymentModal.title} — ${showPaymentModal.price}.00</p>
                </div>

                <div className="space-y-6">
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-6 text-center space-y-4">
                    <p className="text-sm text-emerald-400/80 mb-2">Envie exatamente <strong>${showPaymentModal.price} USDT</strong> (Rede BEP-20) para a carteira abaixo:</p>

                    <div className="bg-black/40 p-4 rounded-xl border border-white/5 break-all text-xs font-mono text-white font-bold select-all">
                      {targetPaymentWallet}
                    </div>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(targetPaymentWallet);
                        alert("Carteira copiada!");
                      }}
                      className="mx-auto w-fit px-4 py-2 bg-emerald-600/20 text-emerald-400 rounded-full text-xs font-bold hover:bg-emerald-600/30 transition-all flex items-center gap-2"
                    >
                      <Copy size={14} /> Copiar Carteira
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/60">Já pagou? Cole aqui o TX HASH (Hash da Transação):</label>
                    <input
                      type="text"
                      value={usdtTxHash}
                      onChange={(e) => setUsdtTxHash(e.target.value)}
                      placeholder="Ex: 0x123abc..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-emerald-500 outline-none font-mono text-white"
                    />
                  </div>

                  <button
                    onClick={verifyUsdtPayment}
                    disabled={loading || usdtTxHash.length < 10}
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/20 disabled:opacity-50 flex justify-center"
                  >
                    {loading ? <RefreshCw className="animate-spin" size={20} /> : "Verificar e Ativar Licença"}
                  </button>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setShowPaymentModal(null);
                      setPaymentMethod('USDT');
                      setUsdtTxHash('');
                    }}
                    className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-sm hover:bg-white/10 transition-all"
                  >
                    {language === 'en' ? 'Cancel' : language === 'es' ? 'Cancelar' : 'Cancelar'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Referral History Modal */}
        <AnimatePresence>
          {showReferralHistoryModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowReferralHistoryModal(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-[#0f0f12] border border-white/10 rounded-[32px] p-6 md:p-8 shadow-2xl flex flex-col max-h-[80vh]"
              >
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <History className="text-amber-500" size={24} />
                      {language === 'en' ? 'Earnings History' : language === 'es' ? 'Historial de Ganancias' : 'Histórico de Ganhos'}
                    </h2>
                    <p className="text-xs text-white/40 mt-1">
                      {language === 'en' ? 'Detailed list of all your received commissions' : language === 'es' ? 'Lista detallada de todas sus comisiones recibidas' : 'Lista detalhada de todas as suas comissões recebidas'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowReferralHistoryModal(false)}
                    className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors shrink-0"
                  >
                    <X size={20} className="text-white/60" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                  {referralHistory.length === 0 ? (
                    <div className="py-12 text-center text-white/20 italic text-sm border border-dashed border-white/5 rounded-2xl">
                      {language === 'en' ? 'No earnings recorded yet.' : language === 'es' ? 'No hay ganancias registradas todavía.' : 'Nenhum ganho registrado ainda.'}
                    </div>
                  ) : (
                    [...referralHistory]
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map((earning, i) => (
                        <div key={i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-emerald-400 font-bold font-mono text-lg">${Number(earning.amount).toFixed(2)}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 uppercase tracking-widest">
                                Nível {earning.level}
                              </span>
                            </div>
                            <div className="text-xs text-white/60">
                              <span className="text-white/40">{language === 'en' ? 'From:' : language === 'es' ? 'De:' : 'De:'}</span> {earning.referredName} <span className="text-white/20">({earning.referredEmail})</span>
                            </div>
                          </div>
                          <div className="text-[10px] text-white/30 text-right">
                            {new Date(earning.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {showEditUserModal && editingUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1a1c23] border border-white/10 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                    <Settings size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Editar Usuário e Licença</h3>
                    <p className="text-sm text-white/60">Altere os dados de {editingUser.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowEditUserModal(false); setEditingUser(null); }}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white/60 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-white/60 mb-2 uppercase">Nome</label>
                    <input
                      type="text"
                      value={editingUser.name || ''}
                      onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/60 mb-2 uppercase">Email</label>
                    <input
                      type="email"
                      value={editingUser.email || ''}
                      onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-white/60 mb-2 uppercase">Nova Senha</label>
                    <input
                      type="text"
                      placeholder="Deixe em branco para não alterar"
                      onChange={e => setEditingUser({ ...editingUser, password: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/60 mb-2 uppercase">Carteira USDT</label>
                    <input
                      type="text"
                      value={editingUser.wallet || ''}
                      onChange={e => setEditingUser({ ...editingUser, wallet: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-white/60 mb-2 uppercase">Token Deriv Real</label>
                    <input
                      type="text"
                      value={editingUser.derivTokenReal || ''}
                      onChange={e => setEditingUser({ ...editingUser, derivTokenReal: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/10 pt-4 mt-4">
                  <div>
                    <label className="block text-xs font-bold text-white/60 mb-2 uppercase">Tipo de Conta Ativa</label>
                    <select
                      value={editingUser.activeAccountType || 'DEMO'}
                      onChange={e => setEditingUser({ ...editingUser, activeAccountType: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                    >
                      <option value="DEMO">Demo</option>
                      <option value="REAL">Real</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/60 mb-2 uppercase">Licença</label>
                    <select
                      value={editingUser.licenseType || (licenses.some(l => l.userId === editingUser.id && l.status === 'ACTIVE' && l.type === 'VITALICIO') ? 'VITALICIO' : licenses.some(l => l.userId === editingUser.id && l.status === 'ACTIVE') ? 'PRO' : 'NONE')}
                      onChange={e => setEditingUser({ ...editingUser, licenseType: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                    >
                      <option value="NONE">Sem Licença Ativa</option>
                      <option value="PRO">PRO (60 Dias)</option>
                      <option value="VITALICIO">Vitalícia (Demo Ilimitada)</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={saveAdminEdit}
                  className="w-full py-4 mt-6 bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-xl font-bold text-white shadow-lg hover:shadow-purple-500/25 transition-all active:scale-95"
                >
                  Salvar Alterações
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
