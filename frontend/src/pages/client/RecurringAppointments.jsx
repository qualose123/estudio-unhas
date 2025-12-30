import React, { useState, useEffect } from 'react';
import { FiRepeat, FiEdit2, FiTrash2, FiPause, FiPlay, FiPlus } from 'react-icons/fi';
import { recurringAPI, servicesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

const RecurringAppointments = () => {
  const { user } = useAuth();
  const [recurring, setRecurring] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState(null);
  const [formData, setFormData] = useState({
    service_id: '',
    recurrence_type: 'weekly',
    start_date: '',
    preferred_time: '',
    preferred_day_of_week: '1'
  });

  useEffect(() => {
    loadRecurring();
    loadServices();
  }, []);

  const loadRecurring = async () => {
    try {
      setLoading(true);
      const response = await recurringAPI.getAll({ client_id: user.clientId });
      setRecurring(response.data);
    } catch (error) {
      console.error('Erro ao carregar agendamentos recorrentes:', error);
      toast.error('Erro ao carregar agendamentos recorrentes');
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
      const data = {
        ...formData,
        client_id: user.clientId,
        preferred_day_of_week: formData.recurrence_type === 'weekly' ? parseInt(formData.preferred_day_of_week) : null
      };

      if (editingRecurring) {
        await recurringAPI.update(editingRecurring.id, data);
        toast.success('Agendamento recorrente atualizado!');
      } else {
        await recurringAPI.create(data);
        toast.success('Agendamento recorrente criado! Os agendamentos serão gerados automaticamente.');
      }

      setShowModal(false);
      setEditingRecurring(null);
      setFormData({ service_id: '', recurrence_type: 'weekly', start_date: '', preferred_time: '', preferred_day_of_week: '1' });
      loadRecurring();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error(error.response?.data?.error || 'Erro ao salvar agendamento recorrente');
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      if (currentStatus) {
        await recurringAPI.deactivate(id);
        toast.success('Agendamento recorrente pausado');
      } else {
        await recurringAPI.activate(id);
        toast.success('Agendamento recorrente ativado');
      }
      loadRecurring();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deseja excluir este agendamento recorrente? Os agendamentos futuros não serão mais gerados.')) return;

    try {
      await recurringAPI.delete(id);
      toast.success('Agendamento recorrente excluído');
      loadRecurring();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir agendamento recorrente');
    }
  };

  const handleEdit = (item) => {
    setEditingRecurring(item);
    setFormData({
      service_id: item.service_id,
      recurrence_type: item.recurrence_type,
      start_date: item.start_date,
      preferred_time: item.preferred_time,
      preferred_day_of_week: item.preferred_day_of_week?.toString() || '1'
    });
    setShowModal(true);
  };

  const getRecurrenceLabel = (type, dayOfWeek) => {
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    if (type === 'weekly' && dayOfWeek !== null) {
      return `Semanal (${days[dayOfWeek]})`;
    } else if (type === 'biweekly') {
      return 'Quinzenal';
    } else if (type === 'monthly') {
      return 'Mensal';
    }
    return type;
  };

  return (
    <div className="min-h-screen bg-gradient-soft py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-neutral-800 dark:text-white">
              Agendamentos Recorrentes
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 mt-1">
              Configure agendamentos automáticos periódicos
            </p>
          </div>

          <button
            onClick={() => {
              setEditingRecurring(null);
              setFormData({ service_id: '', recurrence_type: 'weekly', start_date: '', preferred_time: '', preferred_day_of_week: '1' });
              setShowModal(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <FiPlus size={20} />
            Novo Recorrente
          </button>
        </div>

        {/* Info Card */}
        <div className="card mb-8 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 border-2 border-pink-200 dark:border-pink-800">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-pink-500 rounded-xl text-white">
              <FiRepeat size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-800 dark:text-white mb-2">
                Como funcionam os agendamentos recorrentes?
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                Os agendamentos recorrentes são gerados automaticamente com base na periodicidade escolhida.
                Por exemplo, se você configurar um agendamento semanal às segundas às 14h, o sistema criará
                automaticamente agendamentos todas as segundas neste horário.
              </p>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="spinner"></div>
          </div>
        )}

        {/* Lista de Recorrentes */}
        {!loading && recurring.length > 0 && (
          <div className="space-y-4 animate-fade-in">
            {recurring.map((item) => (
              <div key={item.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg text-neutral-800 dark:text-white">
                        {item.service_name}
                      </h3>
                      <span className={`badge ${item.active ? 'badge-success' : 'badge-warning'}`}>
                        {item.active ? 'Ativo' : 'Pausado'}
                      </span>
                    </div>

                    <div className="space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
                      <p>
                        <span className="font-medium">Recorrência:</span>{' '}
                        {getRecurrenceLabel(item.recurrence_type, item.preferred_day_of_week)}
                      </p>
                      <p>
                        <span className="font-medium">Horário preferido:</span> {item.preferred_time}
                      </p>
                      <p>
                        <span className="font-medium">Início:</span>{' '}
                        {new Date(item.start_date).toLocaleDateString('pt-BR')}
                      </p>
                      {item.end_date && (
                        <p>
                          <span className="font-medium">Término:</span>{' '}
                          {new Date(item.end_date).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                      {item.last_generated_date && (
                        <p className="text-blue-600 dark:text-blue-400">
                          <span className="font-medium">Último agendamento gerado:</span>{' '}
                          {new Date(item.last_generated_date).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(item.id, item.active)}
                      className={`p-2 rounded-lg transition-colors ${
                        item.active
                          ? 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                          : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                      }`}
                      title={item.active ? 'Pausar' : 'Ativar'}
                    >
                      {item.active ? <FiPause size={20} /> : <FiPlay size={20} />}
                    </button>
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <FiEdit2 size={20} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <FiTrash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && recurring.length === 0 && (
          <div className="card text-center py-12">
            <FiRepeat size={48} className="mx-auto text-neutral-400 mb-4" />
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              Você não tem agendamentos recorrentes
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-2">
              Configure agendamentos automáticos para não precisar agendar manualmente toda vez
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary mt-6"
            >
              Criar Agendamento Recorrente
            </button>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl max-w-md w-full p-6 animate-scale-in">
              <h2 className="text-2xl font-bold text-neutral-800 dark:text-white mb-6">
                {editingRecurring ? 'Editar Recorrente' : 'Novo Recorrente'}
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
                    <label className="label">Periodicidade *</label>
                    <select
                      value={formData.recurrence_type}
                      onChange={(e) => setFormData({ ...formData, recurrence_type: e.target.value })}
                      className="input"
                      required
                    >
                      <option value="weekly">Semanal</option>
                      <option value="biweekly">Quinzenal</option>
                      <option value="monthly">Mensal</option>
                    </select>
                  </div>

                  {formData.recurrence_type === 'weekly' && (
                    <div>
                      <label className="label">Dia da Semana *</label>
                      <select
                        value={formData.preferred_day_of_week}
                        onChange={(e) => setFormData({ ...formData, preferred_day_of_week: e.target.value })}
                        className="input"
                        required
                      >
                        <option value="0">Domingo</option>
                        <option value="1">Segunda-feira</option>
                        <option value="2">Terça-feira</option>
                        <option value="3">Quarta-feira</option>
                        <option value="4">Quinta-feira</option>
                        <option value="5">Sexta-feira</option>
                        <option value="6">Sábado</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="label">Data de Início *</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Horário Preferido *</label>
                    <input
                      type="time"
                      value={formData.preferred_time}
                      onChange={(e) => setFormData({ ...formData, preferred_time: e.target.value })}
                      className="input"
                      required
                    />
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      ℹ️ Os agendamentos serão criados automaticamente com base na periodicidade escolhida.
                      Você pode pausar ou cancelar a qualquer momento.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingRecurring(null);
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary flex-1">
                    {editingRecurring ? 'Atualizar' : 'Criar'}
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

export default RecurringAppointments;
