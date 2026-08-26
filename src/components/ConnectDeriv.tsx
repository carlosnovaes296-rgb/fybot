import React from 'react';
import { motion } from 'motion/react';
import { Globe, X, ArrowRight } from 'lucide-react';

interface ConnectDerivProps {
  onClose: () => void;
}

export const ConnectDeriv: React.FC<ConnectDerivProps> = ({ onClose }) => {
  const [token, setToken] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleConnect = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const savedUserStr = localStorage.getItem('currentUser');
      if (savedUserStr) {
        const savedUser = JSON.parse(savedUserStr);
        // Atualiza o perfil com o token inserido manualmente
        await fetch('/api/user/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: savedUser.id, derivToken: token })
        });

        // Simula o recarregamento com o token na URL para o App.tsx processar
        window.location.href = `/?token1=${token}&acct1=Conta_Manual`;
      } else {
        alert('Nenhum usuário logado encontrado. Faça login antes de conectar.');
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao conectar. Tente novamente.');
      setLoading(false);
    }
  };

  const handleOAuthConnect = async () => {
    try {
      const clientId = '33SRHHormRjw8l1LxKtKl';
      const redirectUri = 'https://fybot.life/';

      window.location.href = `https://oauth.deriv.com/oauth2/authorize?app_id=${clientId}&redirect_uri=${redirectUri}&l=PT&brand=deriv`;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      alert('Erro ao iniciar OAuth: ' + message);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative w-full max-w-md bg-[#1a1a24] rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-white/5 relative">
          <button
            onClick={onClose}
            className="absolute right-6 top-6 text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>

          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ff4d4d] to-[#cc0000] flex items-center justify-center">
              <Globe className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Conectar com Deriv</h2>
              <p className="text-sm text-gray-400">Insira seu Token de API para operar</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-white/5 rounded-xl p-4 border border-white/5">
            <h3 className="text-white font-medium mb-2">Como gerar seu Token:</h3>
            <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside">
              <li>Acesse sua conta na Deriv</li>
              <li>Vá em Configurações &gt; Segurança e Privacidade &gt; Tokens de API</li>
              <li>Crie um token com permissões de <strong>Ler</strong> e <strong>Negociar</strong></li>
              <li>Copie o token gerado e cole no campo abaixo</li>
            </ol>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => window.open('https://app.deriv.com/account/api-token', '_blank')}
                className="flex-1 bg-gradient-to-r from-[#ff4d4d] to-[#cc0000] hover:from-[#ff6666] hover:to-[#e60000] text-white font-bold py-3 px-2 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg text-[13px]"
              >
                <Globe size={16} />
                GERAR TOKEN REAL
              </button>
              <button
                onClick={() => window.open('https://app.deriv.com/account/api-token', '_blank')}
                className="flex-1 bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#34d399] hover:to-[#10b981] text-white font-bold py-3 px-2 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg text-[13px]"
              >
                <Globe size={16} />
                GERAR TOKEN DEMO
              </button>
            </div>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink-0 mx-4 text-gray-500 text-sm">2. DEPOIS, COLE O TOKEN ABAIXO</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">Token de API da Deriv (Legado)</label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Cole seu token de 15 caracteres..."
                className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ff4d4d] transition-colors"
              />
            </div>

            <button
              onClick={handleConnect}
              disabled={!token || loading}
              className="w-full bg-gradient-to-r from-[#ff4d4d] to-[#cc0000] hover:from-[#ff6666] hover:to-[#e60000] text-white font-medium py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Conectando...' : 'Conectar Manualmente'}
              {!loading && <ArrowRight size={20} />}
            </button>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink-0 mx-4 text-gray-500 text-sm">OU</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>

            <button
              onClick={handleOAuthConnect}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              Conectar via OAuth Deriv
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
