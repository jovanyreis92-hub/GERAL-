import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Search,
  Trash2,
  Download,
  QrCode,
  CheckCircle2,
  Clock,
  Building2,
  Hash,
  UserX,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  LogOut,
  RefreshCw,
  KeyRound,
  Filter,
  CheckSquare,
  Square,
  UserCheck,
  User,
  Eye,
  EyeOff,
  Calendar,
  CalendarDays,
  Plus,
  Pencil,
  Send,
} from 'lucide-react';
import { Participant, EventItem } from '../types';
import {
  deleteParticipant,
  deleteParticipantsBulk,
  checkInParticipant,
  authenticateAdmin,
  changeAdminPassword,
} from '../lib/api';
import { downloadQRCodeOnly } from '../lib/qr';
import { exportParticipantsToExcel, exportParticipantsToPDF } from '../lib/exportUtils';
import { EditParticipantModal } from './EditParticipantModal';
import { AutomationModal } from './AutomationModal';

interface AdminPanelProps {
  participants: Participant[];
  events: EventItem[];
  selectedEventId: string;
  onSelectEvent: (eventId: string) => void;
  onOpenEventManager: () => void;
  onRefresh: () => Promise<void>;
  onViewQR: (participant: Participant) => void;
  isAdminUnlocked: boolean;
  setIsAdminUnlocked: (unlocked: boolean) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  participants,
  events,
  selectedEventId,
  onSelectEvent,
  onOpenEventManager,
  onRefresh,
  onViewQR,
  isAdminUnlocked,
  setIsAdminUnlocked,
}) => {
  // Login & Password state
  const [loginInput, setLoginInput] = useState('admin');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Change Password state
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currPassInput, setCurrPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [changePassError, setChangePassError] = useState<string | null>(null);
  const [changePassSuccess, setChangePassSuccess] = useState<string | null>(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Export dropdown / modal state
  const [exportingFormat, setExportingFormat] = useState<'excel' | 'pdf' | null>(null);

  // Automation modal state
  const [showAutomationModal, setShowAutomationModal] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'pending'>('all');

  // Filter participants by selected event first
  const eventFilteredParticipants =
    selectedEventId === 'all'
      ? participants
      : participants.filter((p) => p.eventId === selectedEventId);

  // Filter participants by search and status
  const filteredParticipants = eventFilteredParticipants.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.matricula.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.eventName && p.eventName.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (statusFilter === 'present') return p.checkedIn;
    if (statusFilter === 'pending') return !p.checkedIn;
    return true;
  });

  const totalCount = eventFilteredParticipants.length;
  const presentCount = eventFilteredParticipants.filter((p) => p.checkedIn).length;
  const pendingCount = totalCount - presentCount;
  const presenceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  // Deletion modal state
  const [participantToDelete, setParticipantToDelete] = useState<Participant | null>(null);
  const [participantToEdit, setParticipantToEdit] = useState<Participant | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Bulk selection state (Explicit User Requirement: "botão de selecionar participantes para excluir")
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const selectedParticipants = participants.filter((p) => selectedIds.includes(p.id));
  const allFilteredSelected =
    filteredParticipants.length > 0 &&
    filteredParticipants.every((p) => selectedIds.includes(p.id));
  const someFilteredSelected =
    filteredParticipants.some((p) => selectedIds.includes(p.id));

  // Toggle single selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle select/deselect all filtered participants
  const handleToggleSelectAllFiltered = () => {
    const filteredIds = filteredParticipants.map((p) => p.id);
    if (filteredIds.length === 0) return;
    const allSelected = filteredIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  // Clear selection
  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // Bulk delete action
  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      setBulkDeleting(true);
      await deleteParticipantsBulk(selectedIds);
      setSelectedIds([]);
      setShowBulkDeleteModal(false);
      await onRefresh();
    } catch (err) {
      console.error('Erro ao excluir participantes selecionados:', err);
      alert('Não foi possível excluir os participantes selecionados.');
    } finally {
      setBulkDeleting(false);
    }
  };

  // Authentication handler (login + senha protegida)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const trimmedLogin = loginInput.trim().toLowerCase();
    const trimmedPass = passwordInput.trim();

    if (!trimmedPass) {
      setAuthError('Por favor, informe a senha de acesso.');
      return;
    }

    try {
      setIsLoggingIn(true);
      const auth = await authenticateAdmin(trimmedLogin, trimmedPass);
      if (auth.success) {
        setIsAdminUnlocked(true);
        setPasswordInput('');
        setAuthError(null);
      } else {
        setAuthError('Credenciais inválidas. Verifique os dados digitados.');
      }
    } catch {
      setAuthError('Erro ao validar credenciais.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Change password handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePassError(null);
    setChangePassSuccess(null);

    if (!currPassInput) {
      setChangePassError('Informe a senha atual.');
      return;
    }

    if (!newPassInput || newPassInput.length < 3) {
      setChangePassError('A nova senha deve ter no mínimo 3 caracteres.');
      return;
    }

    if (newPassInput !== confirmPassInput) {
      setChangePassError('A nova senha e a confirmação não coincidem.');
      return;
    }

    try {
      setIsChangingPass(true);
      const res = await changeAdminPassword(currPassInput.trim(), newPassInput.trim());
      if (res.success) {
        setChangePassSuccess('Senha alterada com sucesso!');
        setTimeout(() => {
          setShowChangePasswordModal(false);
          setCurrPassInput('');
          setNewPassInput('');
          setConfirmPassInput('');
          setChangePassSuccess(null);
        }, 1200);
      } else {
        setChangePassError(res.error || 'Não foi possível alterar a senha.');
      }
    } catch {
      setChangePassError('Erro ao alterar senha.');
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleLogout = () => {
    setIsAdminUnlocked(false);
    setPasswordInput('');
    setAuthError(null);
  };

  // Toggle check-in status manually
  const handleToggleCheckIn = async (p: Participant) => {
    try {
      setActionLoadingId(p.id);
      await checkInParticipant(p.id, !p.checkedIn);
      await onRefresh();
    } catch (err) {
      console.error('Erro ao alternar presença:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete participant
  const handleConfirmDelete = async () => {
    if (!participantToDelete) return;
    try {
      setDeleting(true);
      await deleteParticipant(participantToDelete.id);
      setParticipantToDelete(null);
      await onRefresh();
    } catch (err) {
      console.error('Erro ao excluir participante:', err);
      alert('Não foi possível excluir o participante.');
    } finally {
      setDeleting(false);
    }
  };

  // Download individual QR code
  const handleDownloadQR = async (p: Participant) => {
    try {
      await downloadQRCodeOnly(p);
    } catch (err) {
      console.error('Erro ao baixar QR:', err);
    }
  };

  // Export Excel (.xlsx)
  const handleExportExcel = () => {
    if (eventFilteredParticipants.length === 0) return;
    try {
      setExportingFormat('excel');
      const currentEvt = events.find((e) => e.id === selectedEventId);
      exportParticipantsToExcel(
        eventFilteredParticipants,
        currentEvt ? currentEvt.name : undefined,
        currentEvt ? currentEvt.date : undefined
      );
    } catch (err) {
      console.error('Erro ao exportar Excel:', err);
      alert('Erro ao gerar a planilha Excel.');
    } finally {
      setExportingFormat(null);
    }
  };

  // Export PDF (.pdf)
  const handleExportPDF = () => {
    if (eventFilteredParticipants.length === 0) return;
    try {
      setExportingFormat('pdf');
      const currentEvt = events.find((e) => e.id === selectedEventId);
      exportParticipantsToPDF(
        eventFilteredParticipants,
        currentEvt ? currentEvt.name : undefined,
        currentEvt ? currentEvt.date : undefined
      );
    } catch (err) {
      console.error('Erro ao exportar PDF:', err);
      alert('Erro ao gerar o relatório em PDF.');
    } finally {
      setExportingFormat(null);
    }
  };

  // Export CSV (legacy format)
  const handleExportCSV = () => {
    if (participants.length === 0) return;
    const header = ['Nome Completo', 'Matrícula', 'Empresa', 'Data Cadastro', 'Presença Confirmada', 'Horário Presença'];
    const rows = participants.map((p) => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.matricula.replace(/"/g, '""')}"`,
      `"${p.company.replace(/"/g, '""')}"`,
      `"${new Date(p.createdAt).toLocaleString('pt-BR')}"`,
      p.checkedIn ? 'SIM' : 'NÃO',
      p.checkInTime ? `"${new Date(p.checkInTime).toLocaleString('pt-BR')}"` : '---',
    ]);

    const csvContent = '\uFEFF' + [header.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `participantes_evento_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Password Lock Gate Screen
  if (!isAdminUnlocked) {
    return (
      <div className="max-w-md mx-auto py-8">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-4 shadow-md">
            <Lock className="w-7 h-7 text-amber-400" />
          </div>

          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Acesso Administrativo
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Informe seu usuário e senha administrativa para gerenciar participantes e exportar relatórios.
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4 text-left">
            {/* Campo Login */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Usuário / Login
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="input-admin-username"
                  type="text"
                  required
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  placeholder="admin"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Senha de Acesso
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="input-admin-password"
                  type={showPassword ? 'text' : 'password'}
                  maxLength={40}
                  required
                  autoFocus
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-center justify-between mt-1.5 px-0.5 text-[11px] text-slate-500">
                <span>Senha padrão: <strong className="font-mono text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-xs">123456</strong></span>
                <button
                  type="button"
                  onClick={() => setPasswordInput('123456')}
                  className="text-sky-600 hover:text-sky-800 font-semibold cursor-pointer hover:underline"
                >
                  Preencher 123456
                </button>
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
                {authError}
              </div>
            )}

            <button
              id="btn-admin-submit-login"
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>Entrar no Painel</span>
                </>
              )}
            </button>

            <div className="pt-2 text-center text-xs text-slate-400">
              Ambiente protegido. Senha criptografada e restrita à equipe autorizada.
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 2. Unlocked Admin Dashboard View
  return (
    <div className="space-y-6">
      {/* Top Banner & Metrics */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">Painel Administrativo</h2>
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                  Usuário: <strong className="text-slate-900 font-bold">{loginInput || 'admin'}</strong>
                </span>
              </div>
              <p className="text-sm text-slate-500">
                Gerencie todos os inscritos, presença e exporte relatórios em PDF ou Excel
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-admin-refresh"
              onClick={onRefresh}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              title="Atualizar lista de participantes"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Atualizar</span>
            </button>

            {/* Exportar PDF */}
            <button
              id="btn-admin-export-pdf"
              onClick={handleExportPDF}
              disabled={participants.length === 0 || exportingFormat === 'pdf'}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Exportar relatório formatado em PDF (A4 com métricas)"
            >
              <FileText className="w-4 h-4 text-rose-100" />
              <span>{exportingFormat === 'pdf' ? 'Gerando...' : 'Exportar PDF'}</span>
            </button>

            {/* Exportar Excel */}
            <button
              id="btn-admin-export-excel"
              onClick={handleExportExcel}
              disabled={participants.length === 0 || exportingFormat === 'excel'}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Exportar planilha completa em Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
              <span>{exportingFormat === 'excel' ? 'Gerando...' : 'Exportar Excel'}</span>
            </button>

            {/* Botão Automação de Relatórios */}
            <button
              id="btn-admin-automation"
              type="button"
              onClick={() => setShowAutomationModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Automatizar o envio de relatórios em PDF ou Excel para o administrador semanalmente ou por evento encerrado"
            >
              <Send className="w-3.5 h-3.5 text-indigo-100" />
              <span>Automação</span>
            </button>

            {/* Exportar CSV complementar */}
            <button
              id="btn-admin-export-csv"
              onClick={handleExportCSV}
              disabled={participants.length === 0}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              title="Exportar arquivo em formato CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>CSV</span>
            </button>

            {/* Botão Alterar Senha */}
            <button
              id="btn-admin-open-change-password"
              type="button"
              onClick={() => {
                setShowChangePasswordModal(true);
                setChangePassError(null);
                setChangePassSuccess(null);
                setCurrPassInput('');
                setNewPassInput('');
                setConfirmPassInput('');
              }}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              title="Alterar a senha de acesso ao painel"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-500" />
              <span>Alterar Senha</span>
            </button>

            <button
              id="btn-admin-logout"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-transparent hover:border-rose-200"
              title="Sair do painel administrativo"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </div>

        {/* Event Selection & Management Bar */}
        <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Evento / Data Ativa:
                </span>
                {selectedEventId !== 'all' && (
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 bg-sky-100 text-sky-800 rounded-md">
                    {events.find((e) => e.id === selectedEventId)?.date
                      ? new Date(
                          events.find((e) => e.id === selectedEventId)!.date + 'T00:00:00'
                        ).toLocaleDateString('pt-BR')
                      : ''}
                  </span>
                )}
              </div>
              <div className="mt-1">
                <select
                  id="select-admin-event-filter"
                  value={selectedEventId}
                  onChange={(e) => onSelectEvent(e.target.value)}
                  className="w-full sm:w-auto min-w-[280px] text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer shadow-2xs"
                >
                  <option value="all">Todos os Eventos ({participants.length} participantes)</option>
                  {events.map((evt) => {
                    const evtCount = participants.filter((p) => p.eventId === evt.id).length;
                    const formattedDate = new Date(evt.date + 'T00:00:00').toLocaleDateString('pt-BR');
                    return (
                      <option key={evt.id} value={evt.id}>
                        {evt.name} — {formattedDate} ({evtCount} inscritos)
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          <button
            id="btn-admin-manage-events"
            onClick={onOpenEventManager}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-sky-50 border border-sky-300 text-sky-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0"
            title="Cadastrar novos eventos por datas ou editar existentes"
          >
            <Calendar className="w-3.5 h-3.5 text-sky-600" />
            <span>Cadastrar / Gerenciar Eventos</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-participants"
            type="text"
            placeholder="Buscar por nome, matrícula ou empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter('present')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === 'present'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Presentes ({presentCount})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Pendentes ({pendingCount})
          </button>
        </div>
      </div>

      {/* Bulk Selection Action Bar (Explicit User Requirement: "botão de selecionar participantes para excluir") */}
      {selectedIds.length > 0 && (
        <div className="bg-sky-50 border border-sky-200/90 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
              {selectedIds.length}
            </div>
            <div>
              <p className="text-sm font-bold text-sky-950">
                {selectedIds.length === 1
                  ? '1 participante selecionado'
                  : `${selectedIds.length} participantes selecionados`}
              </p>
              <p className="text-xs text-sky-700">
                Selecione participantes para excluir em lote ou desmarque a seleção.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              id="btn-clear-selection"
              onClick={handleClearSelection}
              className="px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Desmarcar todos
            </button>
            <button
              id="btn-delete-selected"
              onClick={() => setShowBulkDeleteModal(true)}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              title="Excluir participantes selecionados"
            >
              <Trash2 className="w-4 h-4" />
              <span>Excluir Selecionados ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Participants List / Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {filteredParticipants.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <UserX className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-700 text-base">Nenhum participante encontrado</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {participants.length === 0
                ? 'Ainda não há nenhum participante cadastrado. Use a aba "Novo Cadastro" para adicionar o primeiro.'
                : 'Nenhum resultado corresponde aos filtros selecionados. Tente ajustar a busca.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3.5 pl-4 sm:pl-6 pr-2 w-12 text-center">
                    <label
                      className="inline-flex items-center cursor-pointer"
                      title={allFilteredSelected ? 'Desmarcar todos os exibidos' : 'Selecionar todos os participantes exibidos'}
                    >
                      <input
                        id="checkbox-select-all"
                        type="checkbox"
                        checked={allFilteredSelected}
                        ref={(el) => {
                          if (el) {
                            el.indeterminate = someFilteredSelected && !allFilteredSelected;
                          }
                        }}
                        onChange={handleToggleSelectAllFiltered}
                        className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer accent-sky-600"
                        aria-label="Selecionar todos os participantes exibidos"
                      />
                    </label>
                  </th>
                  <th className="py-3.5 px-4">Participante</th>
                  <th className="py-3.5 px-4">Matrícula</th>
                  <th className="py-3.5 px-4">Empresa</th>
                  <th className="py-3.5 px-4">Evento / Data</th>
                  <th className="py-3.5 px-4">Status Presença</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredParticipants.map((p) => {
                  const isActionLoading = actionLoadingId === p.id;
                  const isSelected = selectedIds.includes(p.id);
                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-sky-50/70 border-l-4 border-l-sky-500' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      {/* Checkbox column */}
                      <td className="py-4 pl-4 sm:pl-6 pr-2 text-center">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            id={`checkbox-select-${p.id}`}
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(p.id)}
                            className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer accent-sky-600"
                            aria-label={`Selecionar ${p.name}`}
                          />
                        </label>
                      </td>

                      {/* Name & Date */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>Cadastrado em {new Date(p.createdAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </td>

                      {/* Matricula */}
                      <td className="py-4 px-4 font-mono font-semibold text-slate-800 text-xs">
                        <span className="px-2 py-1 bg-slate-100 rounded-md border border-slate-200">
                          {p.matricula}
                        </span>
                      </td>

                      {/* Company */}
                      <td className="py-4 px-4 text-slate-700 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{p.company}</span>
                        </div>
                      </td>

                      {/* Event & Date */}
                      <td className="py-4 px-4 text-slate-700 text-xs">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 line-clamp-1">
                            {p.eventName || 'Evento Geral'}
                          </span>
                          {p.eventDate && (
                            <span className="text-[11px] text-sky-700 font-mono flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3 text-sky-600 shrink-0" />
                              <span>{new Date(p.eventDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {p.checkedIn ? (
                          <div className="inline-flex flex-col">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Presente
                            </span>
                            {p.checkInTime && (
                              <span className="text-[10px] text-slate-400 mt-1 font-mono">
                                às {new Date(p.checkInTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            Aguardando
                          </span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Toggle manual attendance */}
                          <button
                            id={`btn-toggle-presence-${p.id}`}
                            onClick={() => handleToggleCheckIn(p)}
                            disabled={isActionLoading}
                            className={`p-2 rounded-lg text-xs font-medium border transition-colors ${
                              p.checkedIn
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                            title={p.checkedIn ? 'Desmarcar presença' : 'Confirmar presença manualmente'}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>

                          {/* View QR Code */}
                          <button
                            id={`btn-view-qr-${p.id}`}
                            onClick={() => onViewQR(p)}
                            className="p-2 rounded-lg text-slate-600 hover:text-sky-600 hover:bg-sky-50 border border-slate-200 transition-colors"
                            title="Ver Código QR"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>

                          {/* Download QR Code */}
                          <button
                            id={`btn-download-qr-${p.id}`}
                            onClick={() => handleDownloadQR(p)}
                            className="p-2 rounded-lg text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 border border-slate-200 transition-colors"
                            title="Baixar Código QR (PNG)"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* Editar Participante */}
                          <button
                            id={`btn-edit-participant-${p.id}`}
                            onClick={() => setParticipantToEdit(p)}
                            className="p-2 rounded-lg text-slate-600 hover:text-sky-600 hover:bg-sky-50 border border-slate-200 transition-colors cursor-pointer"
                            title="Editar cadastro do participante"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {/* Excluir participante (Explicit User Requirement: "crie também um tecla para excluir participante cadastrado") */}
                          <button
                            id={`btn-delete-participant-${p.id}`}
                            onClick={() => setParticipantToDelete(p)}
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
                            title="Excluir participante"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Deletion */}
      {participantToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 text-center">
              Confirmar Exclusão
            </h3>
            <p className="text-sm text-slate-600 text-center mt-2">
              Deseja realmente excluir o participante{' '}
              <strong className="text-slate-900 font-semibold">{participantToDelete.name}</strong> (Matrícula:{' '}
              <span className="font-mono">{participantToDelete.matricula}</span>)?
            </p>
            <p className="text-xs text-rose-600 text-center mt-1">
              Esta ação removerá o cadastro e invalidará o código QR emitido.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                id="btn-cancel-delete"
                onClick={() => setParticipantToDelete(null)}
                disabled={deleting}
                className="flex-1 py-2.5 px-4 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                id="btn-confirm-delete"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {deleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Excluir</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Bulk Deletion (Explicit User Requirement: "botão de selecionar participantes para excluir") */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 text-center">
              Excluir {selectedIds.length} Participante(s)
            </h3>
            <p className="text-sm text-slate-600 text-center mt-2">
              Deseja realmente excluir em lote os <strong className="text-slate-900 font-semibold">{selectedIds.length}</strong> participantes selecionados?
            </p>
            <p className="text-xs text-rose-600 text-center mt-1 font-medium">
              Esta ação removerá todos os cadastros selecionados e invalidará seus códigos QR.
            </p>

            {/* List preview of items to delete */}
            <div className="max-h-44 overflow-y-auto rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs text-slate-700 divide-y divide-slate-200/60 mt-4">
              {selectedParticipants.slice(0, 8).map((p) => (
                <div key={p.id} className="py-1.5 flex items-center justify-between">
                  <span className="font-semibold text-slate-900 truncate pr-2">{p.name}</span>
                  <span className="font-mono text-slate-500 shrink-0 text-[11px]">{p.matricula}</span>
                </div>
              ))}
              {selectedParticipants.length > 8 && (
                <div className="py-1.5 text-center text-slate-400 font-medium italic">
                  + {selectedParticipants.length - 8} outro(s) participante(s)...
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                id="btn-cancel-bulk-delete"
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={bulkDeleting}
                className="flex-1 py-2.5 px-4 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                id="btn-confirm-bulk-delete"
                onClick={handleConfirmBulkDelete}
                disabled={bulkDeleting}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {bulkDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Excluir Selecionados</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Alterar Senha Administrativa */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    Segurança & Alterar Senha
                  </h3>
                  <p className="text-xs text-slate-500">
                    Defina uma nova senha para o painel administrativo
                  </p>
                </div>
              </div>
              <button
                id="btn-close-change-pass"
                type="button"
                onClick={() => setShowChangePasswordModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* Senha Atual */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Senha Atual
                </label>
                <input
                  id="input-current-password"
                  type="password"
                  required
                  value={currPassInput}
                  onChange={(e) => setCurrPassInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              {/* Nova Senha */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nova Senha
                </label>
                <div className="relative">
                  <input
                    id="input-new-password"
                    type={showNewPass ? 'text' : 'password'}
                    required
                    minLength={3}
                    value={newPassInput}
                    onChange={(e) => setNewPassInput(e.target.value)}
                    placeholder="Mínimo 3 dígitos"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmar Nova Senha */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirmar Nova Senha
                </label>
                <input
                  id="input-confirm-new-password"
                  type={showNewPass ? 'text' : 'password'}
                  required
                  minLength={3}
                  value={confirmPassInput}
                  onChange={(e) => setConfirmPassInput(e.target.value)}
                  placeholder="Digite novamente"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              {changePassError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
                  {changePassError}
                </div>
              )}

              {changePassSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{changePassSuccess}</span>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(false)}
                  className="flex-1 py-2.5 px-4 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="btn-save-new-password"
                  type="submit"
                  disabled={isChangingPass}
                  className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isChangingPass ? (
                    <span>Salvando...</span>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Salvar Nova Senha</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição de Participante */}
      {participantToEdit && (
        <EditParticipantModal
          participant={participantToEdit}
          events={events}
          onSaveSuccess={async () => {
            await onRefresh();
          }}
          onClose={() => setParticipantToEdit(null)}
        />
      )}

      {/* Modal de Automação de Relatórios (PDF / Excel) */}
      {showAutomationModal && (
        <AutomationModal
          events={events}
          onClose={() => setShowAutomationModal(false)}
        />
      )}
    </div>
  );
};
