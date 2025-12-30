import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Button from '../../components/Button';
import Loading from '../../components/Loading';
import { servicesAPI, appointmentsAPI, couponsAPI } from '../../services/api';

const NewAppointmentModal = ({ onClose, onSuccess }) => {
  const [services, setServices] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    service_id: '',
    appointment_date: '',
    appointment_time: '',
    notes: '',
    coupon_code: ''
  });

  const [couponData, setCouponData] = useState({
    code: '',
    valid: false,
    discount_type: '',
    discount_value: 0,
    validating: false
  });

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    if (formData.service_id && formData.appointment_date) {
      fetchAvailableTimes();
    }
  }, [formData.service_id, formData.appointment_date]);

  const fetchServices = async () => {
    try {
      const response = await servicesAPI.getAll({ active: true });
      setServices(response.data);
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
      toast.error('Erro ao carregar serviços');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTimes = async () => {
    setLoadingTimes(true);
    try {
      const response = await appointmentsAPI.getAvailableTimes({
        date: formData.appointment_date,
        service_id: formData.service_id
      });
      setAvailableTimes(response.data.availableTimes);
    } catch (error) {
      console.error('Erro ao buscar horários:', error);
      toast.error('Erro ao carregar horários disponíveis');
    } finally {
      setLoadingTimes(false);
    }
  };

  const validateCoupon = async () => {
    if (!formData.coupon_code.trim()) {
      toast.error('Digite um código de cupom');
      return;
    }

    setCouponData(prev => ({ ...prev, validating: true }));

    try {
      const response = await couponsAPI.validate(formData.coupon_code.trim());

      if (response.data.valid) {
        setCouponData({
          code: formData.coupon_code.trim(),
          valid: true,
          discount_type: response.data.discount_type,
          discount_value: response.data.discount_value,
          validating: false
        });
        toast.success('Cupom aplicado com sucesso!');
      } else {
        setCouponData({
          code: '',
          valid: false,
          discount_type: '',
          discount_value: 0,
          validating: false
        });
        toast.error(response.data.message || 'Cupom inválido');
      }
    } catch (error) {
      console.error('Erro ao validar cupom:', error);
      toast.error(error.response?.data?.error || 'Erro ao validar cupom');
      setCouponData({
        code: '',
        valid: false,
        discount_type: '',
        discount_value: 0,
        validating: false
      });
    }
  };

  const removeCoupon = () => {
    setCouponData({
      code: '',
      valid: false,
      discount_type: '',
      discount_value: 0,
      validating: false
    });
    setFormData(prev => ({ ...prev, coupon_code: '' }));
    toast.success('Cupom removido');
  };

  const calculateFinalPrice = () => {
    if (!selectedService) return 0;

    let finalPrice = selectedService.price;

    if (couponData.valid) {
      if (couponData.discount_type === 'percentage') {
        finalPrice = finalPrice * (1 - couponData.discount_value / 100);
      } else {
        finalPrice = finalPrice - couponData.discount_value;
      }

      if (finalPrice < 0) finalPrice = 0;
    }

    return finalPrice;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.service_id || !formData.appointment_date || !formData.appointment_time) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setSubmitting(true);

    try {
      const dataToSend = {
        ...formData,
        coupon_code: couponData.valid ? couponData.code : undefined
      };

      await appointmentsAPI.create(dataToSend);
      toast.success('Agendamento criado com sucesso!');
      onSuccess();
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      toast.error(error.response?.data?.error || 'Erro ao criar agendamento');
    } finally {
      setSubmitting(false);
    }
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const selectedService = services.find(s => s.id === parseInt(formData.service_id));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-primary text-white p-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles size={28} />
            <h2 className="text-2xl font-display font-bold">Novo Agendamento</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <Loading message="Carregando serviços..." />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Serviço */}
              <div>
                <label className="label">Escolha o Serviço *</label>
                <div className="grid gap-3">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      onClick={() => setFormData(prev => ({ ...prev, service_id: service.id }))}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        formData.service_id === service.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-neutral-200 hover:border-primary-300'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg">{service.name}</h3>
                          <p className="text-sm text-neutral-600 mt-1">{service.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="flex items-center gap-1 text-neutral-600">
                              <Clock size={16} />
                              {service.duration} min
                            </span>
                            <span className="font-semibold text-primary-600">
                              R$ {service.price.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        {formData.service_id === service.id && (
                          <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data */}
              <div>
                <label className="label flex items-center gap-2">
                  <Calendar size={18} />
                  Escolha a Data *
                </label>
                <input
                  type="date"
                  value={formData.appointment_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, appointment_date: e.target.value, appointment_time: '' }))}
                  min={getMinDate()}
                  className="input"
                  required
                />
              </div>

              {/* Horário */}
              {formData.appointment_date && formData.service_id && (
                <div>
                  <label className="label flex items-center gap-2">
                    <Clock size={18} />
                    Escolha o Horário *
                  </label>
                  {loadingTimes ? (
                    <div className="text-center py-8">
                      <div className="spinner mx-auto mb-2"></div>
                      <p className="text-sm text-neutral-600">Carregando horários...</p>
                    </div>
                  ) : availableTimes.length === 0 ? (
                    <div className="text-center py-8 bg-neutral-50 rounded-lg">
                      <p className="text-neutral-600">Nenhum horário disponível para esta data</p>
                      <p className="text-sm text-neutral-500 mt-1">Tente outra data</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {availableTimes.map((time) => (
                        <button
                          key={time}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, appointment_time: time }))}
                          className={`p-3 rounded-lg font-medium transition-all ${
                            formData.appointment_time === time
                              ? 'bg-gradient-primary text-white shadow-glow'
                              : 'bg-neutral-100 text-neutral-700 hover:bg-primary-100'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Observações */}
              <div>
                <label className="label">Observações (opcional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Ex: Preferência de cor, estilo, etc..."
                  className="input resize-none"
                  rows="3"
                />
              </div>

              {/* Cupom de Desconto */}
              <div>
                <label className="label">Cupom de Desconto (opcional)</label>
                {couponData.valid ? (
                  <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-green-700">
                          Cupom "{couponData.code}" aplicado!
                        </p>
                        <p className="text-sm text-green-600">
                          {couponData.discount_type === 'percentage'
                            ? `${couponData.discount_value}% de desconto`
                            : `R$ ${couponData.discount_value.toFixed(2)} de desconto`
                          }
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={removeCoupon}
                        className="text-red-600 hover:text-red-700 font-medium text-sm"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.coupon_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, coupon_code: e.target.value.toUpperCase() }))}
                      placeholder="Digite o código do cupom"
                      className="input flex-1"
                      disabled={couponData.validating}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={validateCoupon}
                      loading={couponData.validating}
                    >
                      Aplicar
                    </Button>
                  </div>
                )}
              </div>

              {/* Summary */}
              {selectedService && formData.appointment_date && formData.appointment_time && (
                <div className="bg-gradient-soft p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Resumo do Agendamento</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-neutral-600">Serviço:</span> <span className="font-medium">{selectedService.name}</span></p>
                    <p><span className="text-neutral-600">Data:</span> <span className="font-medium">{new Date(formData.appointment_date + 'T00:00:00').toLocaleDateString('pt-BR')}</span></p>
                    <p><span className="text-neutral-600">Horário:</span> <span className="font-medium">{formData.appointment_time}</span></p>
                    <p><span className="text-neutral-600">Duração:</span> <span className="font-medium">{selectedService.duration} minutos</span></p>

                    {couponData.valid && (
                      <>
                        <p className="pt-2"><span className="text-neutral-600">Preço original:</span> <span className="font-medium line-through text-neutral-500">R$ {selectedService.price.toFixed(2)}</span></p>
                        <p className="text-green-600">
                          <span className="font-medium">Desconto ({couponData.code}):</span> -
                          {couponData.discount_type === 'percentage'
                            ? `${couponData.discount_value}% (R$ ${(selectedService.price * couponData.discount_value / 100).toFixed(2)})`
                            : `R$ ${couponData.discount_value.toFixed(2)}`
                          }
                        </p>
                      </>
                    )}

                    <p className="text-lg pt-2">
                      <span className="text-neutral-600">Total:</span>
                      <span className={`font-bold ${couponData.valid ? 'text-green-600' : 'text-primary-600'}`}>
                        R$ {calculateFinalPrice().toFixed(2)}
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
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
                  loading={submitting}
                  fullWidth
                >
                  Confirmar Agendamento
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewAppointmentModal;
