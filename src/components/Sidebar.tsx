import React from 'react';
import { ViewType, AuthUser } from '../types';
import { LayoutDashboard, FileText, PlusCircle, Users, BarChart3, X, LogOut, Building2 } from 'lucide-react';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: (targetTheme?: 'dark' | 'light') => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  theme = 'dark',
  onToggleTheme,
  isOpenMobile = false,
  onCloseMobile,
  currentUser,
  onLogout,
}) => {
  const navItems = [
    { id: 'dashboard' as ViewType, label: 'Painel', icon: LayoutDashboard },
    { id: 'ordens' as ViewType, label: 'Ordens de serviço', icon: FileText },
    { id: 'os-form' as ViewType, label: 'Nova ordem', icon: PlusCircle },
    { id: 'clientes' as ViewType, label: 'Clientes', icon: Users },
    { id: 'relatorios' as ViewType, label: 'Gráficos & Fluxo', icon: BarChart3 },
  ];

  return (
    <aside
      className={`w-64 shrink-0 bg-[#000000] text-[#FFFFFF] flex flex-col py-5 select-none h-screen sticky top-0 border-r border-[#22252B] z-40 transition-transform duration-200 lg:translate-x-0 ${
        isOpenMobile
          ? 'fixed inset-y-0 left-0 translate-x-0 shadow-2xl'
          : 'fixed inset-y-0 left-0 -translate-x-full lg:sticky'
      }`}
    >
      {/* Brand Header with Official Logo & Mobile Close */}
      <div className="px-5 pb-5 border-b border-[#22252B] mb-3 flex items-start justify-between">
        <div>
          <Logo size="md" />
          <p className="text-[11px] text-[#9CA3AF] mt-2 font-medium">
            Sistema de Gestão &amp; Assistência Técnica
          </p>
        </div>
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-white/10 transition-colors"
            title="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-1">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <li key={item.id}>
                <button
                  id={`nav-${item.id}`}
                  onClick={() => {
                    onNavigate(item.id);
                    onCloseMobile?.();
                  }}
                  className={`w-full text-left py-2.5 px-4 text-[13.5px] flex items-center gap-3 transition-colors rounded-lg border-l-[3px] ${
                    isActive
                      ? 'bg-[#E51D24]/15 border-[#E51D24] text-white font-semibold'
                      : 'border-transparent text-[#9CA3AF] hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#E51D24]' : 'opacity-70'}`} />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Theme Switcher in Sidebar */}
      {onToggleTheme && (
        <div className="px-4 py-3 border-t border-[#22252B] bg-[#0A0D11]/60">
          <div className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-2 px-1">
            <span>Aparência</span>
          </div>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} variant="sidebar" />
        </div>
      )}

      {/* Footer / User Session */}
      {currentUser && (
        <div className="mt-auto px-4 pt-3 pb-3 border-t border-[#22252B]">
          <div className="p-2.5 rounded-lg bg-[#14171C] border border-[#22252B] flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#9CA3AF] truncate">
                <Building2 className="w-3 h-3 text-[#E51D24] shrink-0" />
                <span className="truncate">{currentUser.cnpj}</span>
              </div>
              <div className="text-[11px] font-bold text-white truncate mt-0.5">
                {currentUser.nomeFantasia || 'N! GAMES'}
              </div>
            </div>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 rounded text-[#9CA3AF] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors cursor-pointer shrink-0"
                title="Sair do sistema (Logout)"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
