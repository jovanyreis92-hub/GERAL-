import React from 'react';
import {
  UserPlus,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Users,
  CalendarDays,
} from 'lucide-react';
import { ActiveTab } from '../types';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  totalCount: number;
  checkedInCount: number;
  isAdminUnlocked: boolean;
  eventsCount?: number;
  onOpenEventManager?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  totalCount,
  checkedInCount,
  isAdminUnlocked,
  eventsCount = 0,
  onOpenEventManager,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-500 text-white flex items-center justify-center shadow-sm shrink-0"
              >
                <QrCode className="w-6 h-6" />
              </div>

              <div>
                <h1 className="text-lg font-bold text-slate-900 leading-tight">
                  CheckIn QR
                </h1>
                <p className="text-xs text-slate-500">
                  Registro & Presença de Participantes
                </p>
              </div>
            </div>

            {/* Quick Stats on Mobile */}
            <div className="flex items-center gap-2 sm:hidden text-xs bg-slate-100 px-2.5 py-1 rounded-full text-slate-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {checkedInCount}/{totalCount}
              </span>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0">
            {/* Tab: Cadastro */}
            <button
              id="nav-tab-register"
              onClick={() => setActiveTab('register')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === 'register'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Novo Cadastro</span>
            </button>

            {/* Tab: Leitor QR */}
            <button
              id="nav-tab-scanner"
              onClick={() => setActiveTab('scanner')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap relative ${
                activeTab === 'scanner'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Leitor QR (Celular)</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse hidden sm:inline-block" />
            </button>

            {/* Tab: Painel Admin - SENHA OCULTA CONFORME SOLICITADO */}
            <button
              id="nav-tab-admin"
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === 'admin'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <ShieldCheck
                className={`w-4 h-4 ${isAdminUnlocked ? 'text-emerald-500' : 'text-amber-500'}`}
              />
              <span>Painel Admin</span>
              {isAdminUnlocked && (
                <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold bg-emerald-100 text-emerald-800 rounded">
                  Ativo
                </span>
              )}
            </button>

            {/* Button: Eventos por Datas */}
            {onOpenEventManager && (
              <button
                id="nav-btn-events"
                onClick={onOpenEventManager}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 cursor-pointer"
                title="Cadastramento e visualização de eventos por datas"
              >
                <CalendarDays className="w-4 h-4 text-sky-600" />
                <span>Eventos</span>
                {eventsCount > 0 && (
                  <span className="px-1.5 py-0.2 text-[11px] font-bold bg-sky-200 text-sky-800 rounded-full font-mono">
                    {eventsCount}
                  </span>
                )}
              </button>
            )}

            {/* Attendance Counter Pill (Desktop) */}
            <div className="hidden lg:flex items-center gap-2 pl-3 ml-2 border-l border-slate-200 text-xs text-slate-600">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>Total: <strong>{totalCount}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Presentes: <strong>{checkedInCount}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
