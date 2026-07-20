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
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao conectar. Tente novamente.');
      setLoading(false);
    }
  };

  const handleOAuthConnect = () => {
    const appId = '33SRHHormRjw8l1LxKtKl';
    window.location.href = `https://oauth.deriv.com/oauth2/authorize?app_id=${appId}&l=PT`;
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
            <button
              onClick={handleOAuthConnect}
              className="w-full bg-[#10b981] hover:bg-[#059669] text-white font-bold py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Globe size={20} />
              CONECTAR AUTOMATICAMENTE (RECOMENDADO)
            </button>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink-0 mx-4 text-gray-500 text-sm">OU CONECTAR MANUALMENTE</span>
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
          </div>
        </div>
      </motion.div>
    </div>
  );
};
