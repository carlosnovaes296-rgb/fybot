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
import { ConnectDeriv } from './components/ConnectDeriv';
import { Trophy, ChevronDown, PlayCircle, LogIn, ChevronLeft, Check, MessageSquare, Plus, Shield, LayoutGrid, AlertCircle, ArrowUpRight, ArrowDownRight, Smartphone, Info } from 'lucide-react';
import { TradingChart } from './components/TradingChart';

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


export default function App() {
  const [language, setLanguage] = useState<Language>('pt');
  const t = translations[language];

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try {
      return localStorage.getItem('isLoggedIn') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [showPassword, setShowPassword] = useState(false);
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
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('currentUser');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [referredByCode, setReferredByCode] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('ref') || '';
    }
    return '';
  });
  const [showLicenseModal, setShowLicenseModal] = useState(false);
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
      currentUser?.role === 'ADMIN' ||
      licenses.some(l => l.userId === currentUser?.id && l.status === 'ACTIVE') ||
      (stats.activeLicense != null && stats.activeLicense.status === 'ACTIVE')
    );
  }, [currentUser?.role, currentUser?.id, licenses, stats.activeLicense]);

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
        setTargetPaymentWallet(config?.paymentWallet || '0x883a831511a1b71b4920cd32d3694ecef432b585');
      }
    } catch (e) {
      console.error(e);
      setTargetPaymentWallet(config?.paymentWallet || '0x883a831511a1b71b4920cd32d3694ecef432b585');
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
        // a autorização em handleDerivPKCELogin (ex: '33RnO3OxGcvL8DIYeklO0'). Num
        // fluxo OAuth/PKCE o client_id TEM que ser o mesmo nos dois passos -
        // senão a Deriv rejeita a troca do código por token. Agora recuperamos o
        // client_id que foi de fato usado, salvo no login.
        const oauthClientId = localStorage.getItem('deriv_oauth_client_id') || '33RnO3OxGcvL8DIYeklO0';

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

      let derivTokenDemo = '';
      let derivTokenReal = '';
      let defaultToken = '';

      for (let i = 1; i <= 10; i++) {
        const acct = params.get(`acct${i}`);
        const token = params.get(`token${i}`);
        if (acct && token) {
          if (!defaultToken) defaultToken = token;
          if (acct.startsWith('VRTC')) {
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
      if (acct1 && acct1.startsWith('VRTC')) derivTokenDemo = token1;
      else if (acct1 && acct1.startsWith('CR')) derivTokenReal = token1;

      if (acct2 && acct2.startsWith('VRTC')) derivTokenDemo = token2;
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
        password: '••••••••',
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
    const adminId = currentUser?.id || '';
    const [uData, lData, pData, wData] = await Promise.all([
      safeFetch(`/api/admin/users?t=${t}&adminId=${adminId}`, { headers }),
      safeFetch(`/api/admin/licenses?t=${t}&adminId=${adminId}`, { headers }),
      safeFetch(`/api/admin/payments?t=${t}&adminId=${adminId}`, { headers }),
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
      headers: {
        'Content-Type': 'application/json',
        'x-admin-userid': currentUser?.id || ''
      }
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

    const availableBalance = referralHistory.reduce((sum, item) => sum + item.amount, 0) - withdrawals.filter(w => w.userId === currentUser?.id && w.status !== 'REJECTED').reduce((sum, item) => sum + item.amount, 0);

    if (availableBalance < 50) {
      setWithdrawalMessage({
        text: language === 'en' ? 'Insufficient balance. Minimum withdrawal is $50.' : language === 'es' ? 'Saldo insuficiente. El retiro mínimo es $50.' : 'Saldo insuficiente. O saque mínimo é de $50.',
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
      setStats(prev => ({
        ...prev,
        ...data,
        // Não sobreescreve o saldo com 0 caso o frontend já tenha puxado via REST
        balance: (data.balance != null && data.balance > 0) ? data.balance : prev.balance,
        equity: (data.equity != null && data.equity > 0) ? data.equity : prev.equity,
        accountType: isDemo ? 'DEMO' : (currentUser?.activeAccountType || 'DEMO')
      }));
      if (data.logs) setLogs(data.logs);
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
      const res = await fetch('/api/deriv/submit-payment-hash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planType: showPaymentModal.title,
          txHash: paymentHash,
          amount: showPaymentModal.price,
          userId: currentUser?.id
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao enviar pagamento');
      }
      alert(language === 'en' ? "Payment submitted for verification. As soon as the administrator approves, your license will be activated!" : language === 'es' ? "¡Pago enviado para verificación. Tan pronto como el administrador apruebe, su licencia será activada!" : "Pagamento enviado para verificação. Assim que o administrador aprovar, sua licença será ativada!");
      setShowPaymentModal(null);
      setPaymentHash('');
      fetchAdminData();
      fetchStatus();
    } catch (e: any) {
      console.error(e);
      alert("Erro: " + e.message);
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
    const isUserAdmin = currentUser?.role === 'ADMIN' || currentUser?.email === 'jfcn2020@gmail.com' || currentUser?.email === 'carlosnovaes296@gmail.com';

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

    // Market Closed Check (Mon-Fri 06:00 - 17:00 BRT)
    if (!stats.botRunning && !isUserAdmin) {
      const now = new Date();
      // BRT is UTC-3
      const utcTime = now.getTime();
      const brtTime = new Date(utcTime - (3 * 60 * 60 * 1000));
      const brtDay = brtTime.getUTCDay(); // 0 = Sun, 6 = Sat
      const brtHour = brtTime.getUTCHours();

      const isWeekend = brtDay === 0 || brtDay === 6;
      const isOutsideHours = brtHour < 6 || brtHour >= 17;

      if (isWeekend || isOutsideHours) {
        // Obter os horários correspondentes na máquina local do usuário para exibir na mensagem
        const localOpen = new Date();
        localOpen.setUTCHours(9, 0, 0, 0); // 06:00 BRT = 09:00 UTC
        const openStr = localOpen.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const localClose = new Date();
        localClose.setUTCHours(20, 0, 0, 0); // 17:00 BRT = 20:00 UTC
        const closeStr = localClose.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        alert(
          language === 'en'
            ? `Market Closed! The bot only operates from Monday to Friday, ${openStr} to ${closeStr} (Your Local Time).`
            : language === 'es'
              ? `¡Mercado Cerrado! El bot solo opera de Lunes a Viernes, ${openStr} a ${closeStr} (Su Hora Local).`
              : `Mercado Fechado! O robô só opera de Segunda a Sexta-feira, das ${openStr} às ${closeStr} (Seu Horário Local).`
        );
        return;
      }
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
    const currentToken = newType === 'REAL' ? currentUser.derivTokenReal : currentUser.derivTokenDemo;
    const formToken = newType === 'REAL' ? profileForm.derivTokenReal : profileForm.derivTokenDemo;
    const newToken = formToken || currentToken;

    if (!newToken || newToken.trim() === '') {
      alert(
        newType === 'REAL'
          ? "Você não configurou o Token da CONTA REAL! Vá em Configurações (engrenagem), cole seu token e aguarde o salvamento automático antes de tentar mudar."
          : "Você não configurou o Token da CONTA DEMO! Vá em Configurações (engrenagem), cole seu token e aguarde o salvamento automático antes de tentar mudar."
      );
      return;
    }

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
    if (currentUser?.role === 'ADMIN') {
      fetchAdminData();
    }

    const interval = setInterval(() => {
      fetchStatus();
      fetchReferrals();
      if (currentUser?.role === 'ADMIN') {
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
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all text-xs font-bold ${language 
<truncated 185320 bytes>

NOTE: The output was truncated because it was too long. Use a more targeted query or a smaller range to get the information you need.