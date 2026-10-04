import { Component } from 'react';
import { AlertCircle } from 'lucide-react';
import { reportError } from '../services/errors';

// Evita a tela em branco quando algo quebra durante a exibição
export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('Erro de exibição:', error);
    reportError(error, 'react');
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Algo deu errado</h1>
          <p className="text-sm text-gray-600 mb-6">Não foi possível exibir esta página. Recarregue para tentar novamente.</p>
          <button onClick={() => window.location.reload()} className="px-5 py-2.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
            Recarregar página
          </button>
        </div>
      </div>
    );
  }
}
