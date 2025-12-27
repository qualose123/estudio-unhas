import React, { useState, useEffect } from 'react';
import { Calendar, Users, Sparkles, Settings, Lock, Package, Clock, Key } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Loading from '../../components/Loading';
import { appointmentsAPI, servicesAPI, timeBlocksAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import ServiceManagementModal from './ServiceManagementModal';
import TimeBlockModal from './TimeBlockModal';
import ChangePasswordModal from '../../components/ChangePasswordModal';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('appointments'); // 'appointments', 'services', 'blocks'
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [filter, setFilter] = useState('all');

  // Mostrar mensagem de boas-vindas apenas uma vez após login
  useEffect(() => {
    const hasShownWelcome = sessionStorage.getItem('welcomeShown');
    if (!hasShownWelcome && user) {
      toast.success(`Bem-vindo(a), ${user.name}!`, {
        duration: 3000,
        position: 'top-center'
      });
      sessionStorage.setItem('welcomeShown', 'true');
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [appointmentsRes, servicesRes] = await Promise.all([
        appointmentsAPI.getAll(),
        servicesAPI.getAll()
      ]);
      setAppointments(appointmentsRes.data);
      setServices(servicesRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAppointment = async (id, status) => {
    try {
      await appointmentsAPI.update(id, { status });
      toast.success('Agendamento atualizado!');
      fetchData();
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error);
      toast.error('Erro ao atualizar agendamento');
    }
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar este serviço?')) return;

    try {
      await servicesAPI.delete(id);
      toast.success('Serviço deletado!');
      fetchData();
    } catch (error) {
      console.error('Erro ao deletar serviço:', error);
      toast.error(error.response?.data?.error || 'Erro ao deletar serviço');
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
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const filteredAppointments = appointments.filter(apt => {
    if (filter === 'all') return true;
    return apt.status === filter;
  });

  const stats = {
    total: appointments.length,
    pending: appointments.filter(a => a.status === 'pending').length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    today: appointments.filter(a => {
      const today = new Date().toISOString().split('T')[0];
      return a.appointment_date === today && a.status !== 'cancelled';
    }).length
  };

  if (loading) {
    return <Loading message="Carregando painel..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-soft py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-gradient mb-2">
                Painel Administrativo
              </h1>
              <p className="text-neutral-600">Gerencie agendamentos, serviços e horários</p>
            </div>
            <Button
              variant="secondary"
              icon={Key}
              onClick={() => setShowChangePasswordModal(true)}
            >
              Trocar Senha
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="animate-slide-up">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <Calendar className="text-primary-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-neutral-600">Total</p>
                <p className="text-2xl font-bold text-gradient">{stats.total}</p>
              </div>
            </div>
          </Card>

          <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Clock className="text-yellow-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-neutral-600">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
            </div>
          </Card>

          <Card className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Users className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-neutral-600">Confirmados</p>
                <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
              </div>
            </div>
          </Card>

          <Card className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Sparkles className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-neutral-600">Hoje</p>
                <p className="text-2xl font-bold text-blue-600">{stats.today}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Card className="mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('appointments')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'appointments'
                  ? 'bg-gradient-primary text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <Calendar size={18} />
              Agendamentos
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'services'
                  ? 'bg-gradient-primary text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <Package size={18} />
              Serviços
            </button>
            <button
              onClick={() => setActiveTab('blocks')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'blocks'
                  ? 'bg-gradient-primary text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <Lock size={18} />
              Bloqueios
            </button>
          </div>
        </Card>

        {/* Appointments Tab */}
        {activeTab === 'appointments' && (
          <>
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

            <div className="space-y-4">
              {filteredAppointments.map((apt, index) => (
                <Card key={apt.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-display font-semibold">{apt.service_name}</h3>
                        {getStatusBadge(apt.status)}
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2 text-sm text-neutral-600">
                        <p><strong>Cliente:</strong> {apt.client_name}</p>
                        <p><strong>Tel:</strong> {apt.client_phone || 'Não informado'}</p>
                        <p><strong>Data:</strong> {formatDate(apt.appointment_date)}</p>
                        <p><strong>Horário:</strong> {apt.appointment_time}</p>
                        <p><strong>Duração:</strong> {apt.service_duration} min</p>
                        <p><strong>Valor:</strong> R$ {apt.service_price.toFixed(2)}</p>
                      </div>
                      {apt.notes && (
                        <p className="mt-2 text-sm text-neutral-500 italic">Obs: {apt.notes}</p>
                      )}
                    </div>

                    {apt.status === 'pending' && (
                      <div className="flex flex-col gap-2 lg:w-40">
                        <Button
                          variant="primary"
                          onClick={() => handleUpdateAppointment(apt.id, 'confirmed')}
                          fullWidth
                        >
                          Confirmar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleUpdateAppointment(apt.id, 'cancelled')}
                          className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                          fullWidth
                        >
                          Cancelar
                        </Button>
                      </div>
                    )}

                    {apt.status === 'confirmed' && (
                      <Button
                        variant="primary"
                        onClick={() => handleUpdateAppointment(apt.id, 'completed')}
                      >
                        Marcar Concluído
                      </Button>
                    )}
                  </div>
                </Card>
              ))}

              {filteredAppointments.length === 0 && (
                <Card className="text-center py-12">
                  <Calendar className="mx-auto text-neutral-300 mb-4" size={64} />
                  <p className="text-neutral-600">Nenhum agendamento encontrado</p>
                </Card>
              )}
            </div>
          </>
        )}

        {/* Services Tab */}
        {activeTab === 'services' && (
          <>
            <div className="mb-6">
              <Button
                variant="primary"
                icon={Sparkles}
                onClick={() => {
                  setEditingService(null);
                  setShowServiceModal(true);
                }}
              >
                Novo Serviço
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {services.map((service, index) => (
                <Card key={service.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-display font-semibold">{service.name}</h3>
                        <Badge variant={service.active ? 'success' : 'danger'}>
                          {service.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      <p className="text-neutral-600 text-sm mb-2">{service.description}</p>
                      <div className="flex gap-4 text-sm">
                        <span className="text-neutral-600">⏱️ {service.duration} min</span>
                        <span className="font-semibold text-primary-600">R$ {service.price.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setEditingService(service);
                          setShowServiceModal(true);
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleDeleteService(service.id)}
                        className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                      >
                        Deletar
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Time Blocks Tab */}
        {activeTab === 'blocks' && (
          <div>
            <div className="mb-6">
              <Button
                variant="primary"
                icon={Lock}
                onClick={() => setShowBlockModal(true)}
              >
                Novo Bloqueio
              </Button>
            </div>
            <Card className="text-center py-12">
              <Lock className="mx-auto text-neutral-300 mb-4" size={64} />
              <p className="text-neutral-600">Funcionalidade de bloqueios em desenvolvimento</p>
            </Card>
          </div>
        )}
      </div>

      {/* Modals */}
      {showServiceModal && (
        <ServiceManagementModal
          service={editingService}
          onClose={() => {
            setShowServiceModal(false);
            setEditingService(null);
          }}
          onSuccess={() => {
            setShowServiceModal(false);
            setEditingService(null);
            fetchData();
          }}
        />
      )}

      {showBlockModal && (
        <TimeBlockModal
          onClose={() => setShowBlockModal(false)}
          onSuccess={() => {
            setShowBlockModal(false);
            fetchData();
          }}
        />
      )}

      {showChangePasswordModal && (
        <ChangePasswordModal
          onClose={() => setShowChangePasswordModal(false)}
          onSuccess={() => setShowChangePasswordModal(false)}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
