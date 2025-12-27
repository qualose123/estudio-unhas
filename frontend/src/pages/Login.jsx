import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Sparkles, UserCircle, Shield } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import { authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [userType, setUserType] = useState('client'); // 'client' ou 'admin'
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Carregar tentativas e bloqueio do localStorage
  const [loginAttempts, setLoginAttempts] = useState(() => {
    const saved = localStorage.getItem('loginAttempts');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [blockedUntil, setBlockedUntil] = useState(() => {
    const saved = localStorage.getItem('blockedUntil');
    return saved ? parseInt(saved, 10) : null;
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Atualizar localStorage quando tentativas ou bloqueio mudarem
  const updateLoginAttempts = (attempts) => {
    setLoginAttempts(attempts);
    localStorage.setItem('loginAttempts', attempts.toString());
  };

  const updateBlockedUntil = (timestamp) => {
    setBlockedUntil(timestamp);
    if (timestamp) {
      localStorage.setItem('blockedUntil', timestamp.toString());
    } else {
      localStorage.removeItem('blockedUntil');
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email é obrigatório';
    if (!formData.password) newErrors.password = 'Senha é obrigatória';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Verificar se está bloqueado
    if (blockedUntil) {
      const now = new Date().getTime();
      if (now < blockedUntil) {
        const remainingMinutes = Math.ceil((blockedUntil - now) / 60000);
        toast.error(`Muitas tentativas. Tente novamente em ${remainingMinutes} minuto(s)`, {
          duration: 5000,
          position: 'top-center'
        });
        return;
      } else {
        // Desbloquear
        updateBlockedUntil(null);
        updateLoginAttempts(0);
      }
    }

    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const loginFunction = userType === 'admin' ? authAPI.adminLogin : authAPI.clientLogin;
      const response = await loginFunction(formData);

      const { token, user } = response.data;
      login(user, token);

      // Resetar tentativas em caso de sucesso
      updateLoginAttempts(0);
      updateBlockedUntil(null);

      // Limpar flag de welcome para mostrar mensagem no dashboard
      sessionStorage.removeItem('welcomeShown');

      // Redirecionar baseado no tipo de usuário (toast será exibido no dashboard)
      if (user.type === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/client/dashboard');
      }
    } catch (error) {
      console.error('Erro no login:', error);

      // Se for erro 429 (Too Many Requests - bloqueio do backend)
      if (error.response?.status === 429) {
        const retryAfter = error.response?.data?.retryAfter || '15 minuto(s)';
        toast.error(`Muitas tentativas de login. Tente novamente em ${retryAfter}`, {
          duration: 6000,
          position: 'top-center'
        });
        setErrors({
          password: 'Bloqueado pelo servidor - proteção de segurança'
        });
        // Sincronizar bloqueio do backend com frontend
        const blockTime = new Date().getTime() + (15 * 60 * 1000);
        updateBlockedUntil(blockTime);
        updateLoginAttempts(5);
      }
      // Se for erro 401 (não autorizado), sempre mostrar mensagem genérica
      else if (error.response?.status === 401) {
        const newAttempts = loginAttempts + 1;
        updateLoginAttempts(newAttempts);

        // Após 5 tentativas, bloquear por 15 minutos
        if (newAttempts >= 5) {
          const blockTime = new Date().getTime() + (15 * 60 * 1000); // 15 minutos
          updateBlockedUntil(blockTime);
          toast.error('Muitas tentativas falhas. Bloqueado por 15 minutos', {
            duration: 6000,
            position: 'top-center'
          });
          setErrors({
            password: 'Conta temporariamente bloqueada'
          });
        } else {
          toast.error(`Email ou senha inválidos (${newAttempts}/5 tentativas)`, {
            duration: 4000,
            position: 'top-center'
          });
          setErrors({
            password: 'Verifique suas credenciais'
          });
        }
      } else {
        toast.error(error.response?.data?.error || 'Erro ao fazer login');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-2xl mb-4 shadow-glow">
            <Sparkles className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-display font-bold text-gradient mb-2">
            Bem-vindo de Volta!
          </h1>
          <p className="text-neutral-600">Entre na sua conta para continuar</p>
        </div>

        <Card className={`animate-slide-up ${userType === 'admin' ? 'ring-2 ring-amber-400 shadow-2xl shadow-amber-500/20' : ''}`}>
          {/* Tipo de Usuário */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setUserType('client')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
                userType === 'client'
                  ? 'bg-gradient-primary text-white shadow-glow'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <UserCircle size={20} />
              Cliente
            </button>
            <button
              type="button"
              onClick={() => setUserType('admin')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
                userType === 'admin'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-lg shadow-amber-500/50'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <Shield size={20} />
              Admin
            </button>
          </div>

          {/* Badge de Admin */}
          {userType === 'admin' && (
            <div className="mb-4 p-3 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800">
                <Shield size={18} className="text-amber-600" />
                <p className="text-sm font-medium">Acesso Administrativo Prioritário</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="seu@email.com"
              icon={Mail}
              error={errors.email}
              required
            />

            <Input
              label="Senha"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              icon={Lock}
              error={errors.password}
              required
            />

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
            >
              Entrar
            </Button>
          </form>

          {/* Apenas para clientes - Google OAuth */}
          {userType === 'client' && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-neutral-500">Ou continue com</span>
                </div>
              </div>

              <a
                href="http://localhost:5000/api/auth/google"
                className="btn btn-secondary w-full flex items-center justify-center gap-3"
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </a>
            </>
          )}

          {userType === 'client' && (
            <div className="mt-6 text-center space-y-3">
              <p className="text-sm text-neutral-600">
                Não tem uma conta?{' '}
                <Link to="/register" className="text-primary-600 font-medium hover:underline">
                  Cadastre-se
                </Link>
              </p>
              <Link to="/forgot-password" className="text-sm text-neutral-500 hover:text-primary-600 block">
                Esqueceu sua senha?
              </Link>
            </div>
          )}
        </Card>

        {/* Voltar para home */}
        <div className="text-center mt-6">
          <Link to="/" className="text-neutral-600 hover:text-primary-600 text-sm">
            ← Voltar para página inicial
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
