import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const userStr = searchParams.get('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));

        // Salva o token e os dados do usuário usando a função login do AuthContext
        login(user, token);

        // Redireciona para o dashboard do cliente (toast será exibido lá)
        navigate('/client/dashboard', { replace: true });
      } catch (error) {
        console.error('Erro ao processar login do Google:', error);
        toast.error('Erro ao processar login. Tente novamente.');
        navigate('/login');
      }
    } else {
      toast.error('Erro na autenticação com Google. Tente novamente.');
      navigate('/login');
    }
  }, [searchParams, navigate, login]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-pink-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mb-4"></div>
        <p className="text-neutral-600">Processando login com Google...</p>
      </div>
    </div>
  );
}
