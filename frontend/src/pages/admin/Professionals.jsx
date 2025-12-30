import React, { useState, useEffect } from 'react';
import { FiUserPlus, FiEdit2, FiTrash2, FiDollarSign } from 'react-icons/fi';
import { professionalsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const Professionals = () => {
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    commission_rate: 50.0,
    active: true
  });

  useEffect(() => {
    loadProfessionals();
  }, []);

  const loadProfessionals = async () => {
    try {
      setLoading(true);
      const response = await professionalsAPI.getAll();
      setProfessionals(response.data);
    } catch (error) {
      console.error('Erro ao carregar profissionais:', error);
      toast.error('Erro ao carregar profissionais');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingProfessional) {
        await professionalsAPI.update(editingProfessional.id, formData);
        toast.success('Profissional atualizado com sucesso!');
      } else {
        await professionalsAPI.create(formData);
        toast.success('Profissional cadastrado com sucesso!');
      }

      setShowModal(false);
      setEditingProfessional(null);
      setFormData({ name: '', email: '', phone: '', commission_rate: 50.0, active: true });
      loadProfessionals();
    } catch (error) {
      console.error('Erro ao salvar profissional:', error);
      toast.error(error.response?.data?.error || 'Erro ao salvar profissional');
    }
  };

  const handleEdit = (professional) => {
    setEditingProfessional(professional);
    setFormData({
      name: professional.name,
      email: professional.email || '',
      phone: professional.phone || '',
      commission_rate: professional.commission_rate,
      active: professional.active === 1
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este profissional?')) return;

    try {
      await professionalsAPI.delete(id);
      toast.success('Profissional excluído com sucesso!');
      loadProfessionals();
    } catch (error) {
      console.error('Erro ao excluir profissional:', error);
      toast.error('Erro ao excluir profissional');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-neutral-800 dark:text-white">
              Profissionais
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 mt-1">
              Gerencie os profissionais e manicures
            </p>
          </div>

          <button
            onClick={() => {
              setEditingProfessional(null);
              setFormData({ name: '', email: '', phone: '', commission_rate: 50.0, active: true });
              setShowModal(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <FiUserPlus size={20} />
            Adicionar Profissional
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Total de Profissionais</p>
                <p className="text-2xl font-bold text-neutral-800 dark:text-white">
                  {professionals.length}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-xl">
                <FiUserPlus size={24} className="text-blue-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Ativos</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {professionals.filter(p => p.active).length}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-xl">
                <FiUserPlus size={24} className="text-green-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Taxa Média de Comissão</p>
                <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                  {professionals.length > 0
                    ? (professionals.reduce((sum, p) => sum + p.commission_rate, 0) / professionals.length).toFixed(1)
                    : 0}%
                </p>
              </div>
              <div className="p-3 bg-pink-100 dark:bg-pink-900/20 rounded-xl">
                <FiDollarSign size={24} className="text-pink-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="spinner"></div>
          </div>
        )}

        {/* Tabela de Profissionais */}
        {!loading && professionals.length > 0 && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-neutral-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Contato
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Taxa de Comissão
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
                  {professionals.map((professional) => (
                    <tr key={professional.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-neutral-800 dark:text-white">
                          {professional.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-neutral-600 dark:text-neutral-300">
                          {professional.email && <div>{professional.email}</div>}
                          {professional.phone && <div>{professional.phone}</div>}
                          {!professional.email && !professional.phone && '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm font-semibold text-pink-600 dark:text-pink-400">
                          {professional.commission_rate}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`badge ${professional.active ? 'badge-success' : 'badge-danger'}`}>
                          {professional.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(professional)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <FiEdit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(professional.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <FiTrash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && professionals.length === 0 && (
          <div className="card text-center py-12">
            <FiUserPlus size={48} className="mx-auto text-neutral-400 mb-4" />
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              Nenhum profissional cadastrado
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-2">
              Comece adicionando seu primeiro profissional
            </p>
          </div>
        )}

        {/* Modal de Adicionar/Editar */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl max-w-md w-full p-6 animate-scale-in">
              <h2 className="text-2xl font-bold text-neutral-800 dark:text-white mb-6">
                {editingProfessional ? 'Editar Profissional' : 'Adicionar Profissional'}
              </h2>

              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="label">Nome *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="label">Telefone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="input"
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  <div>
                    <label className="label">Taxa de Comissão (%) *</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.commission_rate}
                      onChange={(e) => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) })}
                      className="input"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="active"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="w-4 h-4 text-pink-600 rounded"
                    />
                    <label htmlFor="active" className="text-sm text-neutral-700 dark:text-neutral-300">
                      Profissional ativo
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingProfessional(null);
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary flex-1">
                    {editingProfessional ? 'Atualizar' : 'Adicionar'}
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

export default Professionals;
