import React, { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { servicesAPI } from '../../services/api';

const ServiceManagementModal = ({ service, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: '',
    price: '',
    active: true
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name,
        description: service.description || '',
        duration: service.duration,
        price: service.price,
        active: service.active
      });
    }
  }, [service]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!formData.duration || formData.duration <= 0) newErrors.duration = 'Duração inválida';
    if (!formData.price || formData.price <= 0) newErrors.price = 'Preço inválido';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const data = {
        ...formData,
        duration: parseInt(formData.duration),
        price: parseFloat(formData.price)
      };

      if (service) {
        await servicesAPI.update(service.id, data);
        toast.success('Serviço atualizado com sucesso!');
      } else {
        await servicesAPI.create(data);
        toast.success('Serviço criado com sucesso!');
      }

      onSuccess();
    } catch (error) {
      console.error('Erro ao salvar serviço:', error);
      toast.error(error.response?.data?.error || 'Erro ao salvar serviço');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-primary text-white p-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles size={28} />
            <h2 className="text-2xl font-display font-bold">
              {service ? 'Editar Serviço' : 'Novo Serviço'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            label="Nome do Serviço"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Ex: Manicure"
            error={errors.name}
            required
          />

          <div>
            <label className="label">Descrição</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Descreva o serviço..."
              className="input resize-none"
              rows="3"
            />
          </div>

          <Input
            label="Duração (minutos)"
            type="number"
            name="duration"
            value={formData.duration}
            onChange={handleChange}
            placeholder="60"
            error={errors.duration}
            required
          />

          <Input
            label="Preço (R$)"
            type="number"
            step="0.01"
            name="price"
            value={formData.price}
            onChange={handleChange}
            placeholder="35.00"
            error={errors.price}
            required
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              name="active"
              checked={formData.active}
              onChange={handleChange}
              className="w-5 h-5 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="active" className="text-sm font-medium text-neutral-700 cursor-pointer">
              Serviço ativo
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              fullWidth
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              fullWidth
            >
              {service ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServiceManagementModal;
