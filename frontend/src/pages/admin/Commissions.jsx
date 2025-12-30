import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiCheck, FiClock, FiX } from 'react-icons/fi';
import { commissionsAPI, professionalsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const Commissions = () => {
  const [commissions, setCommissions] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    professional_id: 'all',
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    loadProfessionals();
  }, []);

  useEffect(() => {
    loadCommissions();
    loadSummary();
  }, [filters]);

  const loadProfessionals = async () => {
    try {
      const response = await professionalsAPI.getAll();
      setProfessionals(response.data);
    } catch (error) {
      console.error('Erro ao carregar profissionais:', error);
    }
  };

  const loadCommissions = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.professional_id !== 'all') params.professional_id = filters.professional_id;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;

      const response = await commissionsAPI.getAll(params);
      setCommissions(response.data);
    } catch (error) {
      console.error('Erro ao carregar comissões:', error);
      toast.error('Erro ao carregar comissões');
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const params = {};
      if (filters.professional_id !== 'all') params.professional_id = filters.professional_id;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;

      const response = await commissionsAPI.getSummary(params);
      setSummary(response.data);
    } catch (error) {
      console.error('Erro ao carregar resumo:', error);
    }
  };

  const handleMarkAsPaid = async (id) => {
    if (!confirm('Confirmar pagamento desta comissão?')) return;

    try {
      await commissionsAPI.markAsPaid(id);
      toast.success('Comissão marcada como paga!');
      loadCommissions();
      loadSummary();
    } catch (error) {
      console.error('Erro ao marcar comissão como paga:', error);
      toast.error('Erro ao marcar comissão como paga');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { label: 'Pendente', class: 'badge-warning' },
      paid: { label: 'Pago', class: 'badge-success' },
      cancelled: { label: 'Cancelado', class: 'badge-danger' }
    };
    const badge = badges[status] || badges.pending;
    return <span className={`badge ${badge.class}`}>{badge.label}</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-soft py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-neutral-800 dark:text-white">
            Comissões
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Gerencie as comissões dos profissionais
          </p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Pendentes</p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {formatCurrency(summary.pending_amount || 0)}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
                    {summary.pending_count || 0} comissões
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-xl">
                  <FiClock size={28} className="text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Pagas</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(summary.paid_amount || 0)}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
                    {summary.paid_count || 0} comissões
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-xl">
                  <FiCheck size={28} className="text-green-600" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Total</p>
                  <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                    {formatCurrency((summary.pending_amount || 0) + (summary.paid_amount || 0))}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
                    {(summary.pending_count || 0) + (summary.paid_count || 0)} comissões
                  </p>
                </div>
                <div className="p-3 bg-pink-100 dark:bg-pink-900/20 rounded-xl">
                  <FiDollarSign size={28} className="text-pink-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="card mb-8">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-white mb-4">
            Filtros
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="label">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="input"
              >
                <option value="all">Todos</option>
                <option value="pending">Pendentes</option>
                <option value="paid">Pagos</option>
                <option value="cancelled">Cancelados</option>
              </select>
            </div>

            <div>
              <label className="label">Profissional</label>
              <select
                value={filters.professional_id}
                onChange={(e) => setFilters({ ...filters, professional_id: e.target.value })}
                className="input"
              >
                <option value="all">Todos</option>
                {professionals.map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Data Inicial</label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="label">Data Final</label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="spinner"></div>
          </div>
        )}

        {/* Tabela de Comissões */}
        {!loading && commissions.length > 0 && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-neutral-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Profissional
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Serviço
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Valor Serviço
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Taxa
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Comissão
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {commissions.map((commission) => (
                    <tr key={commission.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800 dark:text-neutral-200">
                        {new Date(commission.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-neutral-800 dark:text-white">
                          {commission.professional_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-300">
                        {commission.client_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-300">
                        {commission.service_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-neutral-800 dark:text-neutral-200">
                        {formatCurrency(commission.service_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-neutral-600 dark:text-neutral-300">
                        {commission.commission_rate}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-pink-600 dark:text-pink-400">
                        {formatCurrency(commission.commission_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(commission.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {commission.status === 'pending' && (
                          <button
                            onClick={() => handleMarkAsPaid(commission.id)}
                            className="btn-primary py-1 px-3 text-sm"
                          >
                            Marcar como Pago
                          </button>
                        )}
                        {commission.status === 'paid' && (
                          <span className="text-xs text-green-600 dark:text-green-400">
                            {commission.paid_at && new Date(commission.paid_at).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && commissions.length === 0 && (
          <div className="card text-center py-12">
            <FiDollarSign size={48} className="mx-auto text-neutral-400 mb-4" />
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              Nenhuma comissão encontrada
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-2">
              Ajuste os filtros para ver mais resultados
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Commissions;
