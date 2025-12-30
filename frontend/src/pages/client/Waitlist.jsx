import React, { useState, useEffect } from 'react';
import { FiClock, FiX, FiPlus } from 'react-icons/fi';
import { waitlistAPI, servicesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

const Waitlist = () => {
  const { user } = useAuth();
  const [waitlistEntries, setWaitlistEntries] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    service_id: '',
    desired_date: '',
    desired_time: ''
  });

  useEffect(() => {
    loadWaitlist();
    loadServices();
  }, []);

  const loadWaitlist = async () => {
    try {
      setLoading(true);
      const response = await waitlistAPI.getAll({ client_id: user.clientId });
      setWaitlistEntries(response.data);
    } catch (error) {
      console.error('Erro ao carregar lista de espera:', error);
      toast.error('Erro ao carregar lista de espera');
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      const response = await servicesAPI.getAll({ active: 1 });
      setServices(response.data);
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await waitlistAPI.create({
        ...formData,
        client_id: user.clientId
      });
      toast.success('Adicionado à lista de espera! Você será notificado quando houver disponibilidade.');
      setShowModal(false);
      setFormData({ service_id: '', desired_date: '', desired_time: '' });
      loadWaitlist();
    } catch (error) {
      console.error('Erro ao adicionar à lista de espera:', error);
      toast.error(error.response?.data?.error || 'Erro ao adicionar à lista de espera');
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Deseja remover este item da lista de espera?')) return;

    try {
      await waitlistAPI.cancel(id);
      toast.success('Removido da lista de espera');
      loadWaitlist();
    } catch (error) {
      console.error('Erro ao cancelar:', error);
      toast.error('Erro ao remover da lista de espera');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      waiting: { label: 'Aguardando', class: 'badge-warning' },
      notified: { label: 'Notificado', class: 'badge-info' },
      expired: { label: 'Expirado', class: 'badge-danger' },
      converted: { label: 'Agendado', class: 'badge-success' }
    };
    const badge = badges[status] || badges.waiting;
    return <span className={`badge ${badge.class}`}>{badge.label}</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-soft py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-neutral-800 dark:text-white">
              Lista de Espera
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 mt-1">
              Seja notificado quando houver disponibilidade
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center justify-center gap-2 md:w-auto"
          >
            <FiPlus size={20} />
            Adicionar à Lista
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="spinner"></div>
          </div>
        )}

        {/* Lista de Espera */}
        {!loading && waitlistEntries.length > 0 && (
          <div className="space-y-4 animate-fade-in">
            {waitlistEntries.map((entry) => (
              <div key={entry.id} className="card">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg text-neutral-800 dark:text-white">
                        {entry.service_name}
                      </h3>
                      {getStatusBadge(entry.status)}
                    </div>

                    <div className="space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
                      <p>
                        <span className="font-medium">Data desejada:</span>{' '}
                        {new Date(entry.desired_date).toLocaleDateString('pt-BR')}
                      </p>
                      <p>
                        <span className="font-medium">Horário desejado:</span> {entry.desired_time}
                      </p>
                      <p>
                        <span className="font-medium">Adicionado em:</span>{' '}
                        {new Date(entry.created_at).toLocaleDateString('pt-BR')}
                      </p>
                      {entry.notified_at && (
                        <p className="text-blue-600 dark:text-blue-400">
                          <span className="font-medium">Notificado em:</span>{' '}
                          {new Date(entry.notified_at).toLocaleDateString('pt-BR')} às{' '}
                          {new Date(entry.notified_at).toLocaleTimeString('pt-BR')}
                        </p>
                      )}
                      {entry.expires_at && entry.status === 'notified' && (
                        <p className="text-orange-600 dark:text-orange-400">
                          <span className="font-medium">Expira em:</span>{' '}
                          {new Date(entry.expires_at).toLocaleDateString('pt-BR')} às{' '}
                          {new Date(entry.expires_at).toLocaleTimeString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>

                  {entry.status === 'waiting' && (
                    <button
                      onClick={() => handleCancel(entry.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors sm:self-start"
                      title="Remover da lista"
                    >
                      <FiX size={20} />
                    </button>
                  )}
                </div>

                {entry.status === 'notified' && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      ⏰ <strong>Vaga disponível!</strong> Acesse a página de agendamentos para confirmar sua vaga.
                      Esta notificação expira em 24 horas.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && waitlistEntries.length === 0 && (
          <div className="card text-center py-12">
            <FiClock size={48} className="mx-auto text-neutral-400 mb-4" />
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              Você não está em nenhuma lista de espera
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-2">
              Adicione-se à lista quando não houver horários disponíveis
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary mt-6"
            >
              Adicionar à Lista de Espera
            </button>
          </div>
        )}

        {/* Modal de Adicionar */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl max-w-md w-full p-6 animate-scale-in">
              <h2 className="text-2xl font-bold text-neutral-800 dark:text-white mb-6">
                Adicionar à Lista de Espera
              </h2>

              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="label">Serviço *</label>
                    <select
                      value={formData.service_id}
                      onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
                      className="input"
                      required
                    >
                      <option value="">Selecione um serviço</option>
                      {services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name} - R$ {service.price.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">Data Desejada *</label>
                    <input
                      type="date"
                      value={formData.desired_date}
                      onChange={(e) => setFormData({ ...formData, desired_date: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Horário Desejado *</label>
                    <input
                      type="time"
                      value={formData.desired_time}
                      onChange={(e) => setFormData({ ...formData, desired_time: e.target.value })}
                      className="input"
                      required
                    />
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      ℹ️ Você receberá uma notificação por email e/ou WhatsApp quando houver disponibilidade
                      para este horário. A vaga ficará reservada por 24 horas.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setFormData({ service_id: '', desired_date: '', desired_time: '' });
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary flex-1">
                    Adicionar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Waitlist;
