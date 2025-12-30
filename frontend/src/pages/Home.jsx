import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Calendar, Clock, Star, Heart, Shield } from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const features = [
    {
      icon: Calendar,
      title: 'Agendamento Fácil',
      description: 'Reserve seu horário em poucos cliques, de forma rápida e prática'
    },
    {
      icon: Clock,
      title: 'Horários Flexíveis',
      description: 'Escolha o melhor horário para você com nossa grade disponível'
    },
    {
      icon: Star,
      title: 'Serviços Premium',
      description: 'Manicure, pedicure, unhas de gel e muito mais com qualidade'
    }
  ];

  const services = [
    { name: 'Manicure', price: 'A partir de R$ 35', duration: '1h' },
    { name: 'Pedicure', price: 'A partir de R$ 40', duration: '1h' },
    { name: 'Unhas de Gel', price: 'A partir de R$ 80', duration: '1h30' },
    { name: 'Unha Decorada', price: 'A partir de R$ 100', duration: '2h' }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-primary text-white py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6 animate-fade-in">
            <Sparkles size={20} />
            <span className="text-sm font-medium">Seu momento de beleza começa aqui</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-display font-bold mb-6 animate-slide-up">
            Estúdio de Unhas
          </h1>

          <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto animate-slide-up">
            Transforme suas unhas com nossos serviços profissionais. Agende online e garanta seu horário!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-scale-in">
            {user ? (
              <Button
                variant="secondary"
                className="text-lg px-8"
                onClick={() => navigate(user.type === 'admin' ? '/admin/dashboard' : '/client/dashboard')}
              >
                Ir para Dashboard
              </Button>
            ) : (
              <>
                <Link to="/register">
                  <Button variant="secondary" className="text-lg px-8">
                    Agendar Agora
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" className="text-lg px-8 border-white text-white hover:bg-white hover:text-primary-600">
                    Já tenho conta
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-12 text-gradient">
            Por que escolher nosso estúdio?
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-2xl mb-4 shadow-glow">
                  <feature.icon className="text-white" size={32} />
                </div>
                <h3 className="text-xl font-display font-semibold mb-2">{feature.title}</h3>
                <p className="text-neutral-600 dark:text-white">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 px-4 bg-white dark:bg-neutral-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-4 text-gradient">
            Nossos Serviços
          </h2>
          <p className="text-center text-neutral-600 dark:text-white mb-12 max-w-2xl mx-auto">
            Oferecemos uma variedade de serviços para deixar suas unhas impecáveis
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <Card key={index} hover className="text-center animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="text-primary-600" size={24} />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{service.name}</h3>
                <p className="text-primary-600 dark:text-white font-semibold mb-1">{service.price}</p>
                <p className="text-sm text-neutral-500 dark:text-white">{service.duration}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Apenas para usuários não logados */}
      {!user && (
        <section className="py-16 px-4 bg-gradient-soft dark:bg-neutral-800">
          <div className="max-w-4xl mx-auto text-center">
            <Shield className="mx-auto text-primary-600 mb-6" size={48} />
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
              Pronta para começar?
            </h2>
            <p className="text-lg text-neutral-600 dark:text-white mb-8 max-w-2xl mx-auto">
              Crie sua conta gratuitamente e agende seu primeiro horário em minutos
            </p>
            <Link to="/register">
              <Button variant="primary" className="text-lg px-8">
                Criar Conta Grátis
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-neutral-900 text-white py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles size={24} className="text-primary-400" />
            <span className="text-xl font-display font-bold">Estúdio de Unhas</span>
          </div>
          <p className="text-neutral-400 text-sm">
            © {new Date().getFullYear()} Estúdio de Unhas. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
