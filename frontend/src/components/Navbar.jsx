import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Menu, X, LogOut, Calendar, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
            {!user ? (
              <>
                <Link to="/login" className="text-neutral-700 hover:text-primary-600 font-medium transition-colors">
                  Login
                </Link>
                <Link to="/register" className="btn btn-primary">
                  Cadastre-se
                </Link>
              </>
            ) : (
              <>
                <Link
                  to={user.type === 'admin' ? '/admin/dashboard' : '/client/dashboard'}
                  className="flex items-center gap-2 text-neutral-700 hover:text-primary-600 font-medium transition-colors"
                >
                  <Calendar size={18} />
                  Dashboard
                </Link>
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
          <div className="px-4 py-4 space-y-3">
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
            ) : (
              <>
                <Link
                  to={user.type === 'admin' ? '/admin/dashboard' : '/client/dashboard'}
                  className="flex items-center gap-2 px-4 py-2 text-neutral-700 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Calendar size={18} />
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-neutral-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
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
