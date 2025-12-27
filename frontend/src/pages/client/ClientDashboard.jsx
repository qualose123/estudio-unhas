import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, History, User, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Loading from '../../components/Loading';
import { appointmentsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import NewAppointmentModal from './NewAppointmentModal';
import ChangePasswordModal from '../../components/ChangePasswordModal';

const ClientDashboard = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'confirmed', 'completed', 'cancelled'

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await appointmentsAPI.getAll();
      setAppointments(response.data);
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
      toast.error('Erro ao carregar agendamentos');
    } finally {
      setLoading(false);
    }
  };

  const canCancelAppointment = (appointment) => {
    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
    const now = new Date();
    const hoursDifference = (appointmentDateTime - now) / (1000 * 60 * 60);
    return hoursDifference >= 15;
  };

  const handleCancelAppointment = async (id, appointment) => {
    if (!canCancelAppointment(appointment)) {
      toast.error('Não é possível cancelar com menos de 15 horas de antecedência');
      return;
    }

    if (!window.confirm('Tem certeza que deseja cancelar este agendamento?')) {
      return;
    }

    try {
      await appointmentsAPI.update(id, { status: 'cancelled' });
      toast.success('Agendamento cancelado com sucesso');
      fetchAppointments();
    } catch (error) {
      console.error('Erro ao cancelar agendamento:', error);
      toast.error('Erro ao cancelar agendamento');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { variant: 'warning', label: 'Pendente' },
      confirmed: { variant: 'success', label: 'Confirmado' },
      cancelled: { variant: 'danger', label: 'Cancelado' },
      completed: { variant: 'info', label: 'Concluído' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const filteredAppointments = appointments.filter(apt => {
    if (filter === 'all') return true;
    return apt.status === filter;
  });

  const upcomingAppointments = appointments.filter(
    apt => apt.status !== 'cancelled' && apt.status !== 'completed'
  );

  if (loading) {
    return <Loading message="Carregando seus agendamentos..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-soft py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-gradient mb-2">
                Olá, {user?.name}!
              </h1>
              <p className="text-neutral-600">Gerencie seus agendamentos e acompanhe seu histórico</p>
            </div>
            <Button
              variant="secondary"
              icon={Lock}
              onClick={() => setShowChangePasswordModal(true)}
            >
              Trocar Senha
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="animate-slide-up">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <Calendar className="text-primary-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-neutral-600">Próximos</p>
                <p className="text-2xl font-bold text-gradient">{upcomingAppointments.length}</p>
              </div>
            </div>
          </Card>

          <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <History className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-neutral-600">Total</p>
                <p className="text-2xl font-bold text-neutral-800">{appointments.length}</p>
              </div>
            </div>
          </Card>

          <Card className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Button
              variant="primary"
              fullWidth
              icon={Plus}
              onClick={() => setShowNewAppointmentModal(true)}
            >
              Novo Agendamento
            </Button>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'all', label: 'Todos' },
              { value: 'pending', label: 'Pendentes' },
              { value: 'confirmed', label: 'Confirmados' },
              { value: 'completed', label: 'Concluídos' },
              { value: 'cancelled', label: 'Cancelados' }
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === value
                    ? 'bg-gradient-primary text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Card>

        {/* Appointments List */}
        <div className="space-y-4">
          {filteredAppointments.length === 0 ? (
            <Card className="text-center py-12">
              <Calendar className="mx-auto text-neutral-300 mb-4" size={64} />
              <h3 className="text-xl font-semibold text-neutral-600 mb-2">
                Nenhum agendamento encontrado
              </h3>
              <p className="text-neutral-500 mb-6">
                {filter === 'all'
                  ? 'Faça seu primeiro agendamento!'
                  : 'Não há agendamentos com este status'}
              </p>
              {filter === 'all' && (
                <Button variant="primary" onClick={() => setShowNewAppointmentModal(true)}>
                  Fazer Agendamento
                </Button>
              )}
            </Card>
          ) : (
            filteredAppointments.map((appointment, index) => (
              <Card
                key={appointment.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-display font-semibold text-neutral-800">
                        {appointment.service_name}
                      </h3>
                      {getStatusBadge(appointment.status)}
                    </div>

                    <div className="space-y-1 text-neutral-600">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} />
                        <span>{formatDate(appointment.appointment_date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={16} />
                        <span>{appointment.appointment_time} ({appointment.service_duration} min)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-primary-600">
                          R$ {appointment.service_price.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {appointment.notes && (
                      <p className="mt-2 text-sm text-neutral-500 italic">
                        Obs: {appointment.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 md:w-auto">
                    {appointment.status === 'pending' && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => handleCancelAppointment(appointment.id, appointment)}
                          disabled={!canCancelAppointment(appointment)}
                          className={`${canCancelAppointment(appointment)
                            ? 'text-red-600 border-red-600 hover:bg-red-600 hover:text-white'
                            : 'text-neutral-400 border-neutral-300 cursor-not-allowed'}`}
                        >
                          Cancelar
                        </Button>
                        {!canCancelAppointment(appointment) && (
                          <span className="text-xs text-neutral-500 text-center">
                            Cancelamento indisponível
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* New Appointment Modal */}
      {showNewAppointmentModal && (
        <NewAppointmentModal
          onClose={() => setShowNewAppointmentModal(false)}
          onSuccess={() => {
            setShowNewAppointmentModal(false);
            fetchAppointments();
          }}
        />
      )}

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <ChangePasswordModal
          onClose={() => setShowChangePasswordModal(false)}
          onSuccess={() => setShowChangePasswordModal(false)}
        />
      )}
    </div>
  );
};

export default ClientDashboard;
