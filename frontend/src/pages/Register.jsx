import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import { authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!formData.email) newErrors.email = 'Email é obrigatório';
    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Senha deve ter no mínimo 6 caracteres';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...registerData } = formData;
      const response = await authAPI.clientRegister(registerData);

      const { token, user } = response.data;
      login(user, token);

      toast.success('Conta criada com sucesso!');
      navigate('/client/dashboard');
    } catch (error) {
      console.error('Erro no registro:', error);
      toast.error(error.response?.data?.error || 'Erro ao criar conta');
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
          <h1 className="text-3xl font-display font-bold text-gradient dark:text-gradient mb-2">
            Crie sua Conta
          </h1>
          <p className="text-neutral-600 dark:text-gradient">Comece a agendar seus horários agora</p>
        </div>

        <Card className="animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nome Completo"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Maria Silva"
              icon={User}
              error={errors.name}
              required
            />

            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="maria@email.com"
              icon={Mail}
              error={errors.email}
              required
            />

            <Input
              label="Telefone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="(11) 99999-9999"
              icon={Phone}
              error={errors.phone}
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

            <Input
              label="Confirmar Senha"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              icon={Lock}
              error={errors.confirmPassword}
              required
            />

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
            >
              Criar Conta
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-neutral-500">Ou continue com</span>
            </div>
          </div>

          {/* Google Sign Up Button */}
          <a
            href={`${import.meta.env.VITE_API_URL.replace('/api', '')}/api/auth/google?prompt=select_account`}
            className="btn btn-secondary w-full flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Criar conta com Google
          </a>

          <div className="mt-6 text-center">
            <p className="text-sm text-neutral-600">
              Já tem uma conta?{' '}
              <Link to="/login" className="text-primary-600 font-medium hover:underline">
                Faça login
              </Link>
            </p>
          </div>
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

export default Register;
