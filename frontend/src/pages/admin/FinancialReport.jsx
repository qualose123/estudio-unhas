import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiTrendingUp, FiCalendar, FiDownload } from 'react-icons/fi';
import { dashboardAPI } from '../../services/api';
import toast from 'react-hot-toast';

const FinancialReport = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    group_by: 'day'
  });

  useEffect(() => {
    // Definir datas padrão (últimos 30 dias)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    setFilters({
      ...filters,
      start_date: thirtyDaysAgo.toISOString().split('T')[0],
      end_date: today.toISOString().split('T')[0]
    });
  }, []);

  useEffect(() => {
    if (filters.start_date && filters.end_date) {
      loadReport();
    }
  }, [filters]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const response = await dashboardAPI.getFinancialReport(filters);
      setReport(response.data);
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
      toast.error('Erro ao carregar relatório financeiro');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPeriod = (period, groupBy) => {
    if (groupBy === 'day') {
      return new Date(period).toLocaleDateString('pt-BR');
    } else if (groupBy === 'month') {
      const [year, month] = period.split('-');
      return new Date(year, month - 1).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' });
    } else if (groupBy === 'week') {
      return period;
    }
    return period;
  };

  const exportReport = () => {
    if (!report) return;

    const csv = [
      ['Período', 'Agendamentos', 'Receita', 'Ticket Médio'],
      ...report.data.map(row => [
        formatPeriod(row.period, filters.group_by),
        row.total_appointments,
        row.revenue,
        row.average_ticket
      ]),
      [],
      ['TOTAIS', report.totals.total_appointments, report.totals.total_revenue, report.totals.average_ticket]
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_financeiro_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast.success('Relatório exportado com sucesso!');
  };

  return (
    <div className="min-h-screen bg-gradient-soft py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-neutral-800 dark:text-white">
              Relatório Financeiro
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 mt-1">
              Análise detalhada de receitas e agendamentos
            </p>
          </div>

          <button
            onClick={exportReport}
            disabled={!report}
            className="btn-primary flex items-center gap-2 w-full md:w-auto"
          >
            <FiDownload size={20} />
            Exportar CSV
          </button>
        </div>

        {/* Filtros */}
        <div className="card mb-8">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-white mb-4">
            Filtros
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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

            <div>
              <label className="label">Agrupar por</label>
              <select
                value={filters.group_by}
                onChange={(e) => setFilters({ ...filters, group_by: e.target.value })}
                className="input"
              >
                <option value="day">Dia</option>
                <option value="week">Semana</option>
                <option value="month">Mês</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="spinner"></div>
          </div>
        )}

        {/* Totais */}
        {!loading && report && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fade-in">
              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Receita Total</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(report.totals.total_revenue)}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-xl">
                    <FiDollarSign size={32} className="text-green-600" />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Total de Agendamentos</p>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {report.totals.total_appointments}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-xl">
                    <FiCalendar size={32} className="text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Ticket Médio</p>
                    <p className="text-3xl font-bold text-pink-600 dark:text-pink-400">
                      {formatCurrency(report.totals.average_ticket)}
                    </p>
                  </div>
                  <div className="p-3 bg-pink-100 dark:bg-pink-900/20 rounded-xl">
                    <FiTrendingUp size={32} className="text-pink-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Tabela de Dados - Desktop/Tablet */}
            <div className="hidden sm:block card overflow-hidden">
              <h2 className="text-lg font-semibold text-neutral-800 dark:text-white mb-4">
                Detalhamento por Período
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-neutral-50 dark:bg-neutral-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Período
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Agendamentos
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Receita
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Ticket Médio
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                    {report.data.map((row, index) => (
                      <tr key={index} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800 dark:text-neutral-200">
                          {formatPeriod(row.period, filters.group_by)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-neutral-800 dark:text-neutral-200">
                          {row.total_appointments}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600 dark:text-green-400">
                          {formatCurrency(row.revenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-neutral-800 dark:text-neutral-200">
                          {formatCurrency(row.average_ticket)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-neutral-100 dark:bg-neutral-700/50 font-semibold">
                    <tr>
                      <td className="px-6 py-4 text-sm text-neutral-800 dark:text-white">
                        TOTAL
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-neutral-800 dark:text-white">
                        {report.totals.total_appointments}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-green-600 dark:text-green-400">
                        {formatCurrency(report.totals.total_revenue)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-neutral-800 dark:text-white">
                        {formatCurrency(report.totals.average_ticket)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Mobile: Cards */}
            <div className="sm:hidden space-y-4">
              <h2 className="text-lg font-semibold text-neutral-800 dark:text-white mb-4">
                Detalhamento por Período
              </h2>

              {report.data.map((row, index) => (
                <div key={index} className="card">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-3 border-b border-neutral-200 dark:border-neutral-700">
                      <span className="font-semibold text-neutral-800 dark:text-white">
                        {formatPeriod(row.period, filters.group_by)}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-400">Agendamentos:</span>
                        <span className="font-medium text-neutral-800 dark:text-white">
                          {row.total_appointments}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-400">Receita:</span>
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          {formatCurrency(row.revenue)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-400">Ticket Médio:</span>
                        <span className="font-medium text-neutral-800 dark:text-white">
                          {formatCurrency(row.average_ticket)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Total Card Mobile */}
              <div className="card bg-neutral-100 dark:bg-neutral-700/50">
                <div className="space-y-3">
                  <div className="pb-3 border-b border-neutral-200 dark:border-neutral-700">
                    <span className="font-bold text-lg text-neutral-800 dark:text-white">
                      TOTAL
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-neutral-600 dark:text-neutral-400">Agendamentos:</span>
                      <span className="font-bold text-neutral-800 dark:text-white">
                        {report.totals.total_appointments}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-neutral-600 dark:text-neutral-400">Receita:</span>
                      <span className="font-bold text-lg text-green-600 dark:text-green-400">
                        {formatCurrency(report.totals.total_revenue)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-neutral-600 dark:text-neutral-400">Ticket Médio:</span>
                      <span className="font-bold text-neutral-800 dark:text-white">
                        {formatCurrency(report.totals.average_ticket)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {!loading && report && report.data.length === 0 && (
          <div className="card text-center py-12">
            <FiDollarSign size={48} className="mx-auto text-neutral-400 mb-4" />
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              Nenhum dado encontrado para o período selecionado
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialReport;
