import React, { useState, useEffect } from 'react';
import { FiUpload, FiTrash2, FiEdit2, FiEye, FiHeart } from 'react-icons/fi';
import { galleryAPI } from '../../services/api';
import toast from 'react-hot-toast';

const GalleryManagement = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingImage, setEditingImage] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'manicure',
    image: null
  });

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      setLoading(true);
      const response = await galleryAPI.getAll();
      setImages(response.data);
    } catch (error) {
      console.error('Erro ao carregar imagens:', error);
      toast.error('Erro ao carregar galeria');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 5MB');
        return;
      }
      setFormData({ ...formData, image: file });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('category', formData.category);

      if (editingImage) {
        // Update
        await galleryAPI.update(editingImage.id, {
          title: formData.title,
          description: formData.description,
          category: formData.category
        });
        toast.success('Imagem atualizada com sucesso!');
      } else {
        // Create
        if (!formData.image) {
          toast.error('Selecione uma imagem');
          return;
        }
        data.append('image', formData.image);
        await galleryAPI.create(data);
        toast.success('Imagem adicionada com sucesso!');
      }

      setShowModal(false);
      setEditingImage(null);
      setFormData({ title: '', description: '', category: 'manicure', image: null });
      loadImages();
    } catch (error) {
      console.error('Erro ao salvar imagem:', error);
      toast.error('Erro ao salvar imagem');
    }
  };

  const handleEdit = (image) => {
    setEditingImage(image);
    setFormData({
      title: image.title,
      description: image.description || '',
      category: image.category,
      image: null
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir esta imagem?')) return;

    try {
      await galleryAPI.delete(id);
      toast.success('Imagem excluída com sucesso!');
      loadImages();
    } catch (error) {
      console.error('Erro ao excluir imagem:', error);
      toast.error('Erro ao excluir imagem');
    }
  };

  const categories = [
    { value: 'manicure', label: 'Manicure' },
    { value: 'pedicure', label: 'Pedicure' },
    { value: 'nail_art', label: 'Nail Art' },
    { value: 'gel', label: 'Unhas em Gel' },
    { value: 'spa', label: 'Spa dos Pés' }
  ];

  return (
    <div className="min-h-screen bg-gradient-soft py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-gradient dark:text-gradient">
              Gestão de Galeria
            </h1>
            <p className="text-neutral-600 dark:text-gradient mt-1">
              Gerencie as imagens da galeria pública
            </p>
          </div>

          <button
            onClick={() => {
              setEditingImage(null);
              setFormData({ title: '', description: '', category: 'manicure', image: null });
              setShowModal(true);
            }}
            className="btn-primary flex items-center gap-2 rounded-2xl"
          >
            <FiUpload size={20} />
            Adicionar Imagem
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Total de Imagens</p>
                <p className="text-2xl font-bold text-neutral-800 dark:text-white">{images.length}</p>
              </div>
              <div className="p-3 bg-pink-100 dark:bg-pink-900/20 rounded-xl">
                <FiUpload size={24} className="text-pink-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Total de Visualizações</p>
                <p className="text-2xl font-bold text-neutral-800 dark:text-white">
                  {images.reduce((sum, img) => sum + (img.views || 0), 0)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-xl">
                <FiEye size={24} className="text-blue-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Total de Curtidas</p>
                <p className="text-2xl font-bold text-neutral-800 dark:text-white">
                  {images.reduce((sum, img) => sum + (img.likes || 0), 0)}
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-xl">
                <FiHeart size={24} className="text-red-600" />
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

        {/* Grid de Imagens */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {images.map((image) => (
              <div key={image.id} className="card group">
                <div className="relative aspect-square overflow-hidden rounded-lg mb-4">
                  <img
                    src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${image.image_path}`}
                    alt={image.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />

                  {/* Overlay com ações */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleEdit(image)}
                      className="p-2 bg-white rounded-full hover:bg-neutral-100 transition-colors"
                      title="Editar"
                    >
                      <FiEdit2 size={18} className="text-neutral-800" />
                    </button>
                    <button
                      onClick={() => handleDelete(image.id)}
                      className="p-2 bg-white rounded-full hover:bg-red-50 transition-colors"
                      title="Excluir"
                    >
                      <FiTrash2 size={18} className="text-red-600" />
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold text-neutral-800 dark:text-white mb-2 line-clamp-1">
                  {image.title}
                </h3>

                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3 line-clamp-2">
                  {image.description || 'Sem descrição'}
                </p>

                <div className="flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-400">
                  <span className="badge badge-primary">{categories.find(c => c.value === image.category)?.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <FiEye size={14} />
                      {image.views || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <FiHeart size={14} />
                      {image.likes || 0}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && images.length === 0 && (
          <div className="card text-center py-12">
            <FiUpload size={48} className="mx-auto text-neutral-400 mb-4" />
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              Nenhuma imagem na galeria
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-2">
              Comece adicionando sua primeira imagem
            </p>
          </div>
        )}

        {/* Modal de Adicionar/Editar */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl max-w-md w-full p-6 animate-scale-in">
              <h2 className="text-2xl font-bold text-neutral-800 dark:text-white mb-6">
                {editingImage ? 'Editar Imagem' : 'Adicionar Imagem'}
              </h2>

              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  {!editingImage && (
                    <div>
                      <label className="label">Imagem *</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="input"
                        required
                      />
                      <p className="text-xs text-neutral-500 mt-1">
                        Tamanho máximo: 5MB
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="label">Título *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Descrição</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="input"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="label">Categoria *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="input"
                      required
                    >
                      {categories.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingImage(null);
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary flex-1">
                    {editingImage ? 'Atualizar' : 'Adicionar'}
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

export default GalleryManagement;
