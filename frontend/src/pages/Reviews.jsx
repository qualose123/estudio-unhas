import React, { useState, useEffect } from 'react';
import { FiStar } from 'react-icons/fi';
import { reviewsAPI } from '../services/api';
import toast from 'react-hot-toast';

const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviews();
    loadStats();
  }, []);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const response = await reviewsAPI.getAll({ active: 1 });
      setReviews(response.data);
    } catch (error) {
      console.error('Erro ao carregar avaliações:', error);
      toast.error('Erro ao carregar avaliações');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await reviewsAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <FiStar
            key={star}
            size={20}
            className={star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-soft py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-gradient dark:text-gradient mb-4">
            Avaliações dos Clientes
          </h1>
          <p className="text-lg text-neutral-600 dark:text-gradient">
            Veja o que nossos clientes dizem sobre nossos serviços
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="card mb-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              {renderStars(Math.round(stats.average_rating))}
            </div>
            <p className="text-3xl font-bold text-neutral-800 dark:text-white">
              {stats.average_rating.toFixed(1)}
            </p>
            <p className="text-neutral-600 dark:text-neutral-400">
              Baseado em {stats.total_reviews} avaliações
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="spinner"></div>
          </div>
        )}

        {/* Reviews List */}
        {!loading && reviews.length > 0 && (
          <div className="space-y-6 animate-fade-in">
            {reviews.map((review) => (
              <div key={review.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-neutral-800 dark:text-white">
                      {review.client_name}
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {review.service_name}
                      {review.professional_name && ` • ${review.professional_name}`}
                    </p>
                  </div>
                  <div className="text-right">
                    {renderStars(review.rating)}
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      {new Date(review.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>

                {review.comment && (
                  <p className="text-neutral-700 dark:text-neutral-300 mb-4">
                    {review.comment}
                  </p>
                )}

                {/* Resposta do Admin */}
                {review.response && (
                  <div className="mt-4 p-4 bg-pink-50 dark:bg-pink-900/10 rounded-lg border-l-4 border-pink-500">
                    <p className="text-sm font-semibold text-pink-700 dark:text-pink-400 mb-2">
                      Resposta do Estúdio de Unhas:
                    </p>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">
                      {review.response}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                      {new Date(review.response_date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && reviews.length === 0 && (
          <div className="card text-center py-12">
            <FiStar size={48} className="mx-auto text-neutral-400 mb-4" />
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              Ainda não há avaliações
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-2">
              Seja o primeiro a avaliar nossos serviços!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reviews;
