import React, { useState, useEffect } from 'react';
import { FiHeart, FiEye, FiX } from 'react-icons/fi';
import { galleryAPI } from '../services/api';
import toast from 'react-hot-toast';

const Gallery = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadGallery();
  }, [filter]);

  const loadGallery = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { category: filter } : {};
      const response = await galleryAPI.getAll(params);
      setImages(response.data);
    } catch (error) {
      console.error('Erro ao carregar galeria:', error);
      toast.error('Erro ao carregar galeria');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (id) => {
    try {
      await galleryAPI.like(id);
      setImages(images.map(img =>
        img.id === id ? { ...img, likes: img.likes + 1 } : img
      ));
      toast.success('Curtiu!');
    } catch (error) {
      console.error('Erro ao curtir:', error);
      toast.error('Erro ao curtir imagem');
    }
  };

  const handleImageClick = async (image) => {
    setSelectedImage(image);
    try {
      await galleryAPI.incrementViews(image.id);
      setImages(images.map(img =>
        img.id === image.id ? { ...img, views: img.views + 1 } : img
      ));
    } catch (error) {
      console.error('Erro ao incrementar visualização:', error);
    }
  };

  const categories = [
    { value: 'all', label: 'Todos' },
    { value: 'manicure', label: 'Manicure' },
    { value: 'pedicure', label: 'Pedicure' },
    { value: 'nail_art', label: 'Nail Art' },
    { value: 'gel', label: 'Unhas em Gel' },
    { value: 'spa', label: 'Spa dos Pés' }
  ];

  return (
    <div className="min-h-screen bg-gradient-soft py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-gradient mb-4">
            Nossa Galeria
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400">
            Confira nossos trabalhos mais recentes
          </p>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {categories.map((category) => (
            <button
              key={category.value}
              onClick={() => setFilter(category.value)}
              className={`px-6 py-2 rounded-full font-medium transition-all duration-300 ${
                filter === category.value
                  ? 'bg-gradient-primary text-white shadow-glow'
                  : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:shadow-md'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="spinner"></div>
          </div>
        )}

        {/* Grid de Imagens */}
        {!loading && images.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
            {images.map((image) => (
              <div
                key={image.id}
                className="group relative bg-white dark:bg-neutral-800 rounded-2xl overflow-hidden shadow-soft hover:shadow-lg transition-all duration-300 cursor-pointer"
                onClick={() => handleImageClick(image)}
              >
                {/* Imagem */}
                <div className="relative aspect-square overflow-hidden">
                  <img
                    src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${image.image_path}`}
                    alt={image.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />

                  {/* Overlay com informações */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      <h3 className="font-semibold text-lg mb-2">{image.title}</h3>
                      {image.description && (
                        <p className="text-sm text-white/90 line-clamp-2">{image.description}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer com stats */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
                    <span className="flex items-center gap-1">
                      <FiEye size={16} />
                      {image.views || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <FiHeart size={16} />
                      {image.likes || 0}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike(image.id);
                    }}
                    className="p-2 rounded-full hover:bg-pink-50 dark:hover:bg-pink-900/20 text-pink-500 transition-colors"
                  >
                    <FiHeart size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && images.length === 0 && (
          <div className="text-center py-20">
            <p className="text-xl text-neutral-500 dark:text-neutral-400">
              Nenhuma imagem encontrada nesta categoria
            </p>
          </div>
        )}

        {/* Modal de Visualização */}
        {selectedImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-fade-in"
            onClick={() => setSelectedImage(null)}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <FiX size={24} />
            </button>

            <div
              className="relative max-w-5xl w-full bg-white dark:bg-neutral-800 rounded-2xl overflow-hidden shadow-2xl animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <img
                  src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${selectedImage.image_path}`}
                  alt={selectedImage.title}
                  className="w-full max-h-[70vh] object-contain"
                />
              </div>

              <div className="p-6">
                <h2 className="text-2xl font-bold text-neutral-800 dark:text-white mb-2">
                  {selectedImage.title}
                </h2>
                {selectedImage.description && (
                  <p className="text-neutral-600 dark:text-neutral-300 mb-4">
                    {selectedImage.description}
                  </p>
                )}

                <div className="flex items-center gap-6 text-neutral-600 dark:text-neutral-400">
                  <span className="flex items-center gap-2">
                    <FiEye size={20} />
                    {selectedImage.views || 0} visualizações
                  </span>
                  <span className="flex items-center gap-2">
                    <FiHeart size={20} />
                    {selectedImage.likes || 0} curtidas
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Gallery;
