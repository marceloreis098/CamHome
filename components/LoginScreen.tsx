import React, { useState } from 'react';
import { CameraIcon, LockIcon, SmartphoneIcon } from './Icons';

interface LoginScreenProps {
  onLogin: (password: string, mfaToken?: string) => boolean;
  appName: string;
  mfaEnabled: boolean;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, appName, mfaEnabled }) => {
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [error, setError] = useState(false);
  const [step, setStep] = useState<1 | 2>(1); // 1 = Password, 2 = MFA

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaEnabled && step === 1) {
      // Validate password first in a real app, here we assume it's right and move to step 2 if not empty
      if(password) {
        setStep(2);
        setError(false);
      } else {
        setError(true);
      }
      return;
    }

    const success = onLogin(password, mfaToken);
    if (!success) {
      setError(true);
      if(!mfaEnabled) setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-orange-600 p-3 rounded-xl shadow-lg shadow-orange-600/20 mb-4">
            <CameraIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{appName}</h1>
          <p className="text-sm text-gray-400 mt-1">Login do Sistema</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Senha de Acesso</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockIcon className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="password"
                  className="block w-full pl-10 bg-gray-900 border border-gray-600 rounded-lg py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="Digite a senha de admin"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(false);
                  }}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <label className="block text-sm font-medium text-gray-300 mb-1">Código de Autenticação (2FA)</label>
              <div className="relative">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <SmartphoneIcon className="h-5 w-5 text-indigo-500" />
                </div>
                <input 
                  type="text" 
                  maxLength={6}
                  className="block w-full pl-10 bg-gray-900 border border-indigo-500 rounded-lg py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono tracking-widest text-center text-xl"
                  placeholder="000000"
                  value={mfaToken}
                  onChange={(e) => setMfaToken(e.target.value)}
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">Abra seu app autenticador</p>
            </div>
          )}

          {error && <p className="text-red-500 text-xs mt-2 animate-pulse text-center">
            {step === 2 ? 'Código MFA incorreto.' : 'Senha incorreta. Tente novamente.'}
          </p>}

          <button
            type="submit"
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transform active:scale-[0.98] transition-all"
          >
            {step === 1 && mfaEnabled ? 'Próximo' : 'Acessar Painel'}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-gray-600">
          Acesso Seguro • Orange Pi Surveillance
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;