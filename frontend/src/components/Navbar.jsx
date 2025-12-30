import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Menu, X, LogOut, Calendar, User, Image, Star, ChevronDown, Clock, Repeat, Users, DollarSign, Tag, BarChart3, MessageCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-soft sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-gradient-primary p-2 rounded-lg group-hover:shadow-glow transition-all duration-300">
              <Sparkles className="text-white" size={24} />
            </div>
            <span className="text-xl font-display font-bold text-gradient">
              Estúdio de Unhas
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            {/* Public Links */}
            <Link to="/gallery" className="text-neutral-700 hover:text-primary-600 font-medium transition-colors flex items-center gap-1">
              <Image size={16} />
              Galeria
            </Link>
            <Link to="/reviews" className="text-neutral-700 hover:text-primary-600 font-medium transition-colors flex items-center gap-1">
              <Star size={16} />
              Avaliações
            </Link>

            {!user ? (
              <>
                <Link to="/login" className="text-neutral-700 hover:text-primary-600 font-medium transition-colors">
                  Login
                </Link>
                <Link to="/register" className="btn btn-primary">
                  Cadastre-se
                </Link>
              </>
            ) : user.type === 'admin' ? (
              <>
                {/* Admin Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
                    onBlur={() => setTimeout(() => setAdminDropdownOpen(false), 200)}
                    className="flex items-center gap-1 text-neutral-700 hover:text-primary-600 font-medium transition-colors"
                  >
                    <Calendar size={18} />
                    Admin
                    <ChevronDown size={16} className={`transition-transform ${adminDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {adminDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-neutral-100 py-2 animate-scale-in">
                      <Link to="/admin/dashboard" className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                        <BarChart3 size={16} />
                        Dashboard
                      </Link>
                      <Link to="/admin/gallery" className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                        <Image size={16} />
                        Gerenciar Galeria
                      </Link>
                      <Link to="/admin/professionals" className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                        <Users size={16} />
                        Profissionais
                      </Link>
                      <Link to="/admin/commissions" className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                        <DollarSign size={16} />
                        Comissões
                      </Link>
                      <Link to="/admin/coupons" className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                        <Tag size={16} />
                        Cupons
                      </Link>
                      <Link to="/admin/financial-report" className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                        <BarChart3 size={16} />
                        Relatório Financeiro
                      </Link>
                      <Link to="/admin/chat" className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                        <MessageCircle size={16} />
                        Chat
                      </Link>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-neutral-700 hover:text-red-600 font-medium transition-colors"
                >
                  <LogOut size={18} />
                  Sair
                </button>
              </>
            ) : (
              <>
                {/* Client Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setClientDropdownOpen(!clientDropdownOpen)}
                    onBlur={() => setTimeout(() => setClientDropdownOpen(false), 200)}
                    className="flex items-center gap-1 text-neutral-700 hover:text-primary-600 font-medium transition-colors"
                  >
                    <Calendar size={18} />
                    Minha Conta
                    <ChevronDown size={16} className={`transition-transform ${clientDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {clientDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-neutral-100 py-2 animate-scale-in">
                      <Link to="/client/dashboard" className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                        <Calendar size={16} />
                        Meus Agendamentos
                      </Link>
                      <Link to="/client/waitlist" className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                        <Clock size={16} />
                        Lista de Espera
                      </Link>
                      <Link to="/client/recurring" className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                        <Repeat size={16} />
                        Agendamentos Recorrentes
                      </Link>
                      <Link to="/client/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                        <User size={16} />
                        Meu Perfil
                      </Link>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-neutral-700 hover:text-red-600 font-medium transition-colors"
                >
                  <LogOut size={18} />
                  Sair
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-neutral-100 animate-slide-up">
          <div className="px-4 py-4 space-y-2">
            {/* Public Links */}
            <Link
              to="/gallery"
              className="flex items-center gap-2 px-4 py-2 text-neutral-700 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Image size={18} />
              Galeria
            </Link>
            <Link
              to="/reviews"
              className="flex items-center gap-2 px-4 py-2 text-neutral-700 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Star size={18} />
              Avaliações
            </Link>

            <div className="border-t border-neutral-200 my-2"></div>

            {!user ? (
              <>
                <Link
                  to="/login"
                  className="block px-4 py-2 text-neutral-700 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="block px-4 py-2 bg-gradient-primary text-white rounded-lg text-center font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Cadastre-se
                </Link>
              </>
            ) : user.type === 'admin' ? (
              <>
                <div className="px-4 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Admin
                </div>
                <Link
                  to="/admin/dashboard"
                  className="flex items-center gap-2 px-4 py-2 text-neutral-700 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <BarChart3 size={18} />
                  Dashboard
                </Link>
                <Link
                  to="/admin/gallery"
                  className="flex items-center gap-2 px-4 py-2 text-neutral-700 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Image size={18} />
                  Gerenciar Galeria
                </Link>
                <Link
                  to="/admin/professionals"
                  className="flex items-center gap-2 px-4 py-2 text-neutral-700 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Users size={18} />
                  Profissionais
                </Link>
                <Link
                  to="/admin/commissions"
                  className="flex items-center gap-2 px-4 py-2 text-neutral-700 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <DollarSign size={18} />
                  Comissões
                </Link>
                <Link
                  to="/admin/coupons"
                  className="flex items-center gap-2 px-4 py-2 text-neutral-700 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Tag size={18} />
                  Cupons
                </Link>
                <Link
                  to="/admin/financial-report"
                  className="flex items-center gap-2 px-4 py-2 text-neutral-700 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <BarChart3 size={18} />
                  Relatório Financeiro
                </Link>
                <Link
                  to="/admin/chat"
                  className="flex items-center gap-2 px-4 py-2 text-neutral-700 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <MessageCircle size={18} />
                  Chat
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-neutral-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors mt-2"
                >
                  <LogOut size={18} />
                  Sair
                </button>
              </>
            ) : (
              <>
                <div className="px-4 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Minha Conta
                </div>
                <Link
                  to="/client/dashboard"
                  className="flex items-center gap-2 px-4 py-2 text-neutral-700 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Calendar size={18} />
                  Meus Agendamentos
                </Link>
                <Link
                  to="/client/waitlist"
                  className="flex items-center gap-2 px-4 py-2 text-neutral-700 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Clock size={18} />
                  Lista de Espera
                </Link>
                <Link
                  to="/client/recurring"
                  className="flex items-center gap-2 px-4 py-2 text-neutral-700 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Repeat size={18} />
                  Agendamentos Recorrentes
                </Link>
                <Link
                  to="/client/profile"
                  className="flex items-center gap-2 px-4 py-2 text-neutral-700 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User size={18} />
                  Meu Perfil
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-neutral-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors mt-2"
                >
                  <LogOut size={18} />
                  Sair
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
