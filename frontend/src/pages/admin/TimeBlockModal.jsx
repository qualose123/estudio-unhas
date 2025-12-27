import React, { useState } from 'react';
import { X, Lock, Calendar, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { timeBlocksAPI } from '../../services/api';

const TimeBlockModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    block_date: '',
    start_time: '',
    end_time: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.block_date) newErrors.block_date = 'Data é obrigatória';
    if (!formData.start_time) newErrors.start_time = 'Horário inicial é obrigatório';
    if (!formData.end_time) newErrors.end_time = 'Horário final é obrigatório';
    if (formData.start_time && formData.end_time && formData.start_time >= formData.end_time) {
      newErrors.end_time = 'Horário final deve ser maior que o inicial';
    }
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
      await timeBlocksAPI.create(formData);
      toast.success('Bloqueio criado com sucesso!');
      onSuccess();
    } catch (error) {
      console.error('Erro ao criar bloqueio:', error);
      toast.error(error.response?.data?.error || 'Erro ao criar bloqueio');
    } finally {
      setLoading(false);
    }
  };

  const getMinDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-primary text-white p-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lock size={28} />
            <h2 className="text-2xl font-display font-bold">Bloquear Horário</h2>
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
            label="Data"
            type="date"
            name="block_date"
            value={formData.block_date}
            onChange={handleChange}
            min={getMinDate()}
            icon={Calendar}
            error={errors.block_date}
            required
          />

          <Input
            label="Horário Inicial"
            type="time"
            name="start_time"
            value={formData.start_time}
            onChange={handleChange}
            icon={Clock}
            error={errors.start_time}
            required
          />

          <Input
            label="Horário Final"
            type="time"
            name="end_time"
            value={formData.end_time}
            onChange={handleChange}
            icon={Clock}
            error={errors.end_time}
            required
          />

          <div>
            <label className="label">Motivo (opcional)</label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              placeholder="Ex: Almoço, Férias, etc..."
              className="input resize-none"
              rows="3"
            />
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
              Bloquear
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TimeBlockModal;
