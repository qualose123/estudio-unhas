import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Sparkles, ArrowLeft, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import { passwordResetAPI } from '../services/api';

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1 = email, 2 = código + nova senha
  const [userType, setUserType] = useState('client');
  const [formData, setFormData] = useState({
    email: '',
    code: '',
    newPassword: '',
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

  const handleRequestCode = async (e) => {
    e.preventDefault();

    if (!formData.email) {
      setErrors({ email: 'Email é obrigatório' });
      return;
    }

    setLoading(true);

    try {
      await passwordResetAPI.request({
        email: formData.email,
        userType
      });

      toast.success('Código enviado para seu email!');
      setStep(2);
    } catch (error) {
      console.error('Erro ao solicitar código:', error);
      toast.error(error.response?.data?.error || 'Erro ao enviar código');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!formData.code) newErrors.code = 'Código é obrigatório';
    if (!formData.newPassword) newErrors.newPassword = 'Nova senha é obrigatória';
    if (formData.newPassword.length < 6) newErrors.newPassword = 'Senha deve ter no mínimo 6 caracteres';
    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      await passwordResetAPI.confirm({
        email: formData.email,
        code: formData.code,
        newPassword: formData.newPassword,
        userType
      });

      toast.success('Senha alterada com sucesso!');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      toast.error(error.response?.data?.error || 'Erro ao redefinir senha');
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
            Recuperar Senha
          </h1>
          <p className="text-neutral-600">
            {step === 1
              ? 'Enviaremos um código para seu email'
              : 'Digite o código e sua nova senha'}
          </p>
        </div>

        <Card className="animate-slide-up">
          {step === 1 ? (
            <>
              {/* Tipo de Usuário */}
              <div className="flex gap-2 mb-6">
                <button
                  type="button"
                  onClick={() => setUserType('client')}
                  className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                    userType === 'client'
                      ? 'bg-gradient-primary text-white'
                      : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  Cliente
                </button>
                <button
                  type="button"
                  onClick={() => setUserType('admin')}
                  className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                    userType === 'admin'
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white'
                      : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  Admin
                </button>
              </div>

              <form onSubmit={handleRequestCode} className="space-y-4">
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

                <Button type="submit" variant="primary" fullWidth loading={loading}>
                  Enviar Código
                </Button>
              </form>
            </>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                Código enviado para: <strong>{formData.email}</strong>
              </div>

              <Input
                label="Código de Verificação"
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="123456"
                error={errors.code}
                required
              />

              <Input
                label="Nova Senha"
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="••••••••"
                icon={Lock}
                error={errors.newPassword}
                required
              />

              <Input
                label="Confirmar Nova Senha"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                icon={Lock}
                error={errors.confirmPassword}
                required
              />

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStep(1)}
                  fullWidth
                >
                  Voltar
                </Button>
                <Button type="submit" variant="primary" fullWidth loading={loading}>
                  Redefinir Senha
                </Button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-neutral-600 hover:text-primary-600 inline-flex items-center gap-1">
              <ArrowLeft size={16} />
              Voltar para Login
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
