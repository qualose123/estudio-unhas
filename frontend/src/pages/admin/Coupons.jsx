import React, { useState, useEffect } from 'react';
import { FiTag, FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi';
import { couponsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const Coupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: 10,
    max_uses: null,
    expires_at: '',
    active: true
  });

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const response = await couponsAPI.getAll();
      setCoupons(response.data);
    } catch (error) {
      console.error('Erro ao carregar cupons:', error);
      toast.error('Erro ao carregar cupons');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const data = {
        ...formData,
        max_uses: formData.max_uses || null,
        expires_at: formData.expires_at || null
      };

      if (editingCoupon) {
        await couponsAPI.update(editingCoupon.id, data);
        toast.success('Cupom atualizado com sucesso!');
      } else {
        await couponsAPI.create(data);
        toast.success('Cupom criado com sucesso!');
      }

      setShowModal(false);
      setEditingCoupon(null);
      setFormData({ code: '', discount_type: 'percentage', discount_value: 10, max_uses: null, expires_at: '', active: true });
      loadCoupons();
    } catch (error) {
      console.error('Erro ao salvar cupom:', error);
      toast.error(error.response?.data?.error || 'Erro ao salvar cupom');
    }
  };

  const handleEdit = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      max_uses: coupon.max_uses,
      expires_at: coupon.expires_at ? coupon.expires_at.split('T')[0] : '',
      active: coupon.active === 1
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este cupom?')) return;

    try {
      await couponsAPI.delete(id);
      toast.success('Cupom excluído com sucesso!');
      loadCoupons();
    } catch (error) {
      console.error('Erro ao excluir cupom:', error);
      toast.error('Erro ao excluir cupom');
    }
  };

  const formatDiscount = (coupon) => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}%`;
    } else {
      return `R$ ${coupon.discount_value.toFixed(2)}`;
    }
  };

  const isExpired = (expiresAt) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="min-h-screen bg-gradient-soft py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-neutral-800 dark:text-white">
              Cupons de Desconto
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 mt-1">
              Gerencie cupons de desconto para clientes
            </p>
          </div>

          <button
            onClick={() => {
              setEditingCoupon(null);
              setFormData({ code: '', discount_type: 'percentage', discount_value: 10, max_uses: null, expires_at: '', active: true });
              setShowModal(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <FiPlus size={20} />
            Criar Cupom
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Total de Cupons</p>
            <p className="text-2xl font-bold text-neutral-800 dark:text-white">{coupons.length}</p>
          </div>

          <div className="card">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Ativos</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {coupons.filter(c => c.active && !isExpired(c.expires_at)).length}
            </p>
          </div>

          <div className="card">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Total Usado</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {coupons.reduce((sum, c) => sum + (c.used_count || 0), 0)}
            </p>
          </div>

          <div className="card">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Expirados</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {coupons.filter(c => isExpired(c.expires_at)).length}
            </p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="spinner"></div>
          </div>
        )}

        {/* Tabela de Cupons */}
        {!loading && coupons.length > 0 && (
          <>
            {/* Desktop/Tablet: Tabela com scroll */}
            <div className="hidden md:block card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-neutral-50 dark:bg-neutral-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Código
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Desconto
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Usos
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Validade
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
                    {coupons.map((coupon) => (
                      <tr key={coupon.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <FiTag className="text-pink-500" />
                            <span className="font-mono font-semibold text-neutral-800 dark:text-white">
                              {coupon.code}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="font-semibold text-pink-600 dark:text-pink-400">
                            {formatDiscount(coupon)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-neutral-600 dark:text-neutral-300">
                          {coupon.used_count || 0}
                          {coupon.max_uses && ` / ${coupon.max_uses}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-neutral-600 dark:text-neutral-300">
                          {coupon.expires_at
                            ? new Date(coupon.expires_at).toLocaleDateString('pt-BR')
                            : 'Sem limite'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {isExpired(coupon.expires_at) ? (
                            <span className="badge badge-danger">Expirado</span>
                          ) : coupon.active ? (
                            <span className="badge badge-success">Ativo</span>
                          ) : (
                            <span className="badge badge-warning">Inativo</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEdit(coupon)}
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <FiEdit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(coupon.id)}
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

            {/* Mobile: Cards */}
            <div className="md:hidden space-y-4">
              {coupons.map((coupon) => (
                <div key={coupon.id} className="card">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <FiTag className="text-pink-500" />
                      <span className="font-mono font-semibold text-lg text-neutral-800 dark:text-white">
                        {coupon.code}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(coupon)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <FiEdit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(coupon.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-600 dark:text-neutral-400">Tipo:</span>
                      <span className="font-medium text-neutral-800 dark:text-white">
                        {coupon.discount_type === 'percentage' ? 'Porcentagem' : 'Valor Fixo'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600 dark:text-neutral-400">Desconto:</span>
                      <span className="font-semibold text-pink-600 dark:text-pink-400">
                        {formatDiscount(coupon)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600 dark:text-neutral-400">Uso/Limite:</span>
                      <span className="font-medium text-neutral-800 dark:text-white">
                        {coupon.used_count || 0}
                        {coupon.max_uses ? ` / ${coupon.max_uses}` : ' / Ilimitado'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600 dark:text-neutral-400">Validade:</span>
                      <span className="font-medium text-neutral-800 dark:text-white">
                        {coupon.expires_at
                          ? new Date(coupon.expires_at).toLocaleDateString('pt-BR')
                          : 'Sem limite'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-neutral-200 dark:border-neutral-700">
                      <span className="text-neutral-600 dark:text-neutral-400">Status:</span>
                      {isExpired(coupon.expires_at) ? (
                        <span className="badge badge-danger">Expirado</span>
                      ) : coupon.active ? (
                        <span className="badge badge-success">Ativo</span>
                      ) : (
                        <span className="badge badge-warning">Inativo</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Empty State */}
        {!loading && coupons.length === 0 && (
          <div className="card text-center py-12">
            <FiTag size={48} className="mx-auto text-neutral-400 mb-4" />
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              Nenhum cupom cadastrado
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-2">
              Crie cupons de desconto para seus clientes
            </p>
          </div>
        )}

        {/* Modal de Adicionar/Editar */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl max-w-md w-full p-6 animate-scale-in">
              <h2 className="text-2xl font-bold text-neutral-800 dark:text-white mb-6">
                {editingCoupon ? 'Editar Cupom' : 'Criar Cupom'}
              </h2>

              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="label">Código do Cupom *</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="input font-mono"
                      placeholder="DESCONTO10"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Tipo de Desconto *</label>
                    <select
                      value={formData.discount_type}
                      onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                      className="input"
                      required
                    >
                      <option value="percentage">Porcentagem (%)</option>
                      <option value="fixed">Valor Fixo (R$)</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">
                      Valor do Desconto * {formData.discount_type === 'percentage' ? '(%)' : '(R$)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) })}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Número Máximo de Usos (opcional)</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.max_uses || ''}
                      onChange={(e) => setFormData({ ...formData, max_uses: e.target.value ? parseInt(e.target.value) : null })}
                      className="input"
                      placeholder="Ilimitado"
                    />
                  </div>

                  <div>
                    <label className="label">Data de Expiração (opcional)</label>
                    <input
                      type="date"
                      value={formData.expires_at}
                      onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                      className="input"
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
                      Cupom ativo
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingCoupon(null);
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary flex-1">
                    {editingCoupon ? 'Atualizar' : 'Criar'}
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

export default Coupons;
