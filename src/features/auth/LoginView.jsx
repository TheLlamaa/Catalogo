import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, AlertCircle, ChevronLeft } from 'lucide-react';
import { signIn } from '../../services/auth';

export default function LoginView({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    const { error: signInError } = await signIn(email, password);
    if (signInError) { setError(signInError.message); setLoading(false); } 
    else onLoginSuccess();
  };

  return (
    <div className="max-w-md mx-auto mt-12 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="px-6 py-8">
        <button 
          onClick={() => navigate('/')} 
          className="mb-6 text-sm font-medium text-gray-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Voltar para Loja
        </button>

        <div className="flex justify-center mb-6"><div className="p-4 bg-blue-50 text-blue-600 rounded-full"><Settings className="w-8 h-8" /></div></div>
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Acesso Restrito</h2>
        <p className="text-sm text-center text-gray-500 mb-8">Digite suas credenciais de acesso para entrar no painel.</p>
        
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-100 flex items-start gap-2"><AlertCircle className="w-5 h-5 flex-shrink-0" /><span>{error}</span></div>}
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input id="login-email" autoComplete="username" required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <div>
            <label htmlFor="login-senha" className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input id="login-senha" autoComplete="current-password" required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-md hover:bg-blue-700 disabled:opacity-50 mt-2">
            {loading ? 'Entrando...' : 'Entrar no Painel'}
          </button>
        </form>
      </div>
    </div>
  );
}
