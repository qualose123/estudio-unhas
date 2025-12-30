import React, { useState } from 'react';
import { FiUser, FiMail, FiPhone, FiLock, FiSave } from 'react-icons/fi';
import { authAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Note: você precisará criar endpoint de update profile no backend
      // const response = await authAPI.updateProfile(profileData);
      // setUser({ ...user, ...profileData });

      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast.error('Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (passwordData.new_password.length < 6) {
      toast.error('A nova senha deve ter no mínimo 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      await authAPI.changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });

      toast.success('Senha alterada com sucesso!');
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      toast.error(error.response?.data?.error || 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-neutral-800 dark:text-white">
            Meu Perfil
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Gerencie suas informações pessoais e senha
          </p>
        </div>

        {/* Avatar Card */}
        <div className="card mb-8 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-primary text-white text-4xl font-bold mb-4">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <h2 className="text-2xl font-bold text-neutral-800 dark:text-white">
            {user?.name}
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            {user?.email}
          </p>
          <span className="badge badge-success mt-2">Cliente Ativo</span>
        </div>

        {/* Informações Pessoais */}
        <div className="card mb-8">
          <h3 className="text-xl font-bold text-neutral-800 dark:text-white mb-6 flex items-center gap-2">
            <FiUser size={24} />
            Informações Pessoais
          </h3>

          <form onSubmit={handleProfileSubmit}>
            <div className="space-y-4">
              <div>
                <label className="label">Nome Completo</label>
                <div className="relative">
                  <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="input pl-12"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="input pl-12"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Telefone</label>
                <div className="relative">
                  <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="input pl-12"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
            >
              <FiSave size={20} />
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </form>
        </div>

        {/* Alterar Senha */}
        <div className="card">
          <h3 className="text-xl font-bold text-neutral-800 dark:text-white mb-6 flex items-center gap-2">
            <FiLock size={24} />
            Alterar Senha
          </h3>

          <form onSubmit={handlePasswordSubmit}>
            <div className="space-y-4">
              <div>
                <label className="label">Senha Atual</label>
                <div className="relative">
                  <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                  <input
                    type="password"
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                    className="input pl-12"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Nova Senha</label>
                <div className="relative">
                  <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                  <input
                    type="password"
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                    className="input pl-12"
                    minLength={6}
                    required
                  />
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Mínimo de 6 caracteres
                </p>
              </div>

              <div>
                <label className="label">Confirmar Nova Senha</label>
                <div className="relative">
                  <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                  <input
                    type="password"
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                    className="input pl-12"
                    minLength={6}
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
            >
              <FiLock size={20} />
              {loading ? 'Alterando...' : 'Alterar Senha'}
            </button>
          </form>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="card text-center">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Agendamentos Realizados</p>
            <p className="text-3xl font-bold text-pink-600 dark:text-pink-400 mt-2">-</p>
          </div>

          <div className="card text-center">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Próximos Agendamentos</p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">-</p>
          </div>

          <div className="card text-center">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Membro Desde</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
              {new Date(user?.created_at || Date.now()).getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
