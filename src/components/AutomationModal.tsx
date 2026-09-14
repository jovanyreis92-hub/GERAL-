import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Send,
  Calendar,
  Clock,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  Settings,
  History,
  Play,
  RotateCcw,
  Check,
  Server,
  Download,
  Trash2,
  Bell,
  ChevronDown,
  ChevronUp,
  FileCheck,
} from 'lucide-react';
import {
  AutomationSettings,
  ReportLogItem,
  ReportFormat,
  WeekDay,
  EventItem,
} from '../types';
import {
  fetchAutomation,
  saveAutomationSettings,
  triggerTestReport,
  clearAutomationLogs,
} from '../lib/api';

interface AutomationModalProps {
  events: EventItem[];
  onClose: () => void;
}

export const AutomationModal: React.FC<AutomationModalProps> = ({
  events,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'logs'>('config');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testResult, setTestResult] = useState<ReportLogItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Settings State
  const [enabled, setEnabled] = useState(true);
  const [adminEmail, setAdminEmail] = useState('jovany.reis32@gmail.com');
  const [adminName, setAdminName] = useState('Administrador');
  const [reportFormat, setReportFormat] = useState<ReportFormat>('both');
  const [sendWeekly, setSendWeekly] = useState(true);
  const [weeklyDay, setWeeklyDay] = useState<WeekDay>('monday');
  const [weeklyTime, setWeeklyTime] = useState('08:00');
  const [sendOnEventClosed, setSendOnEventClosed] = useState(true);
  const [includeAbsenteesList, setIncludeAbsenteesList] = useState(true);

  // SMTP State
  const [showSmtpConfig, setShowSmtpConfig] = useState(false);
  const [smtpEnabled, setSmtpEnabled] = useState(false);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpFromName, setSmtpFromName] = useState('CheckIn QR Eventos');
  const [smtpFromEmail, setSmtpFromEmail] = useState('');

  // Selected event for manual testing
  const [testEventId, setTestEventId] = useState<string>('all');

  // Logs state
  const [logs, setLogs] = useState<ReportLogItem[]>([]);

  useEffect(() => {
    loadAutomationData();
  }, []);

  const loadAutomationData = async () => {
    try {
      setLoading(true);
      const data = await fetchAutomation();
      const s = data.settings;
      setEnabled(s.enabled);
      setAdminEmail(s.adminEmail || 'jovany.reis32@gmail.com');
      setAdminName(s.adminName || 'Administrador');
      setReportFormat(s.reportFormat || 'both');
      setSendWeekly(s.sendWeekly ?? true);
      setWeeklyDay(s.weeklyDay || 'monday');
      setWeeklyTime(s.weeklyTime || '08:00');
      setSendOnEventClosed(s.sendOnEventClosed ?? true);
      setIncludeAbsenteesList(s.includeAbsenteesList ?? true);

      if (s.smtp) {
        setSmtpEnabled(s.smtp.enabled ?? false);
        setSmtpHost(s.smtp.host || '');
        setSmtpPort(s.smtp.port || 587);
        setSmtpUser(s.smtp.user || '');
        setSmtpPass(s.smtp.pass || '');
        setSmtpSecure(s.smtp.secure ?? false);
        setSmtpFromName(s.smtp.fromName || 'CheckIn QR Eventos');
        setSmtpFromEmail(s.smtp.fromEmail || '');
        if (s.smtp.enabled) {
          setShowSmtpConfig(true);
        }
      }

      setLogs(data.logs || []);
    } catch (err: any) {
      console.error('Erro ao carregar automação:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccess(false);

    if (!adminEmail.trim() || !adminEmail.includes('@')) {
      setErrorMessage('Informe um e-mail válido para o administrador.');
      return;
    }

    const payload: AutomationSettings = {
      enabled,
      adminEmail: adminEmail.trim(),
      adminName: adminName.trim(),
      reportFormat,
      sendWeekly,
      weeklyDay,
      weeklyTime,
      sendOnEventClosed,
      includeAbsenteesList,
      smtp: {
        enabled: smtpEnabled,
        host: smtpHost.trim(),
        port: Number(smtpPort) || 587,
        user: smtpUser.trim(),
        pass: smtpPass,
        secure: smtpSecure,
        fromName: smtpFromName.trim() || 'CheckIn QR Eventos',
        fromEmail: smtpFromEmail.trim() || smtpUser.trim(),
      },
    };

    try {
      setSaving(true);
      await saveAutomationSettings(payload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  const handleRunTest = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      setErrorMessage(null);
      const res = await triggerTestReport(testEventId === 'all' ? undefined : testEventId);
      setTestResult(res);
      setLogs((prev) => [res, ...prev]);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao disparar teste de relatório.');
    } finally {
      setTesting(false);
    }
  };

  const handleClearLogs = async () => {
    if (window.confirm('Deseja limpar todo o histórico de relatórios automáticos gerados?')) {
      try {
        await clearAutomationLogs();
        setLogs([]);
      } catch (err) {
        console.error('Erro ao limpar histórico:', err);
      }
    }
  };

  const dayLabels: Record<WeekDay, string> = {
    monday: 'Segunda-feira',
    tuesday: 'Terça-feira',
    wednesday: 'Quarta-feira',
    thursday: 'Quinta-feira',
    friday: 'Sexta-feira',
    saturday: 'Sábado',
    sunday: 'Domingo',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Automação de Relatórios
                {enabled && (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                    Ativo
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Envio automático em PDF ou Excel semanalmente ou por evento encerrado
              </p>
            </div>
          </div>

          <button
            id="btn-close-automation-modal"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              id="tab-automation-config"
              onClick={() => setActiveTab('config')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'config'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Configurações & Regras</span>
            </button>

            <button
              id="tab-automation-logs"
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'logs'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Histórico de Envios ({logs.length})</span>
            </button>
          </div>

          {/* Quick trigger button */}
          <div className="flex items-center gap-2">
            <button
              id="btn-quick-test-report"
              onClick={handleRunTest}
              disabled={testing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              title="Executar um teste manual imediato"
            >
              <Play className="w-3 h-3 text-indigo-600 fill-indigo-600" />
              <span>{testing ? 'Gerando...' : 'Disparar Teste'}</span>
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <RotateCcw className="w-8 h-8 animate-spin mb-2 text-indigo-500" />
              <p className="text-xs">Carregando configurações de automação...</p>
            </div>
          ) : activeTab === 'config' ? (
            <form onSubmit={handleSave} className="space-y-6">
              {/* Feedback messages */}
              {saveSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">
                    Configurações de automação salvas com sucesso! O sistema executará os disparos conforme programado.
                  </span>
                </div>
              )}

              {errorMessage && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Test Result Toast/Banner if ran */}
              {testResult && (
                <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs text-indigo-900 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-indigo-950">
                      <FileCheck className="w-4 h-4 text-indigo-600" />
                      <span>Relatório de Teste Gerado com Sucesso!</span>
                    </div>
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-semibold rounded-md text-[11px]">
                      {testResult.summary.rate} Presença
                    </span>
                  </div>
                  <p className="text-indigo-800">{testResult.details}</p>
                  <div className="flex items-center gap-3 pt-1 text-[11px] text-indigo-700">
                    <span>
                      Total: <strong>{testResult.summary.total}</strong>
                    </span>
                    <span>
                      Presentes: <strong>{testResult.summary.present}</strong>
                    </span>
                    <span>
                      Ausentes: <strong>{testResult.summary.absent}</strong>
                    </span>
                    <a
                      href={`/api/automation/download-report${
                        testResult.eventId ? `?eventId=${testResult.eventId}` : ''
                      }`}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto inline-flex items-center gap-1 font-bold text-indigo-700 hover:text-indigo-900 underline"
                    >
                      <Download className="w-3 h-3" />
                      Baixar Planilha Excel
                    </a>
                  </div>
                </div>
              )}

              {/* Section 1: Ativação Geral */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-indigo-600" />
                    <span>Habilitar Automação no Sistema</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Quando ativado, os relatórios serão gerados e encaminhados de acordo com os gatilhos abaixo.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Section 2: Destinatário do Relatório */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-2xs">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <Mail className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Destinatário do Administrador</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      E-mail do Administrador *
                    </label>
                    <input
                      type="email"
                      required
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="ex: admin@empresa.com"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Endereço que receberá os relatórios gerados e resumos executivos.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nome do Administrador / Responsável
                    </label>
                    <input
                      type="text"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="ex: Jovany Reis"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Identificação usada na saudação do relatório.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 3: Formato do Relatório */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 shadow-2xs">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Formato dos Relatórios Automatizados</span>
                </h3>

                <p className="text-xs text-slate-500">
                  Escolha o formato em que os relatórios devem ser gerados e anexados:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* Option: Ambos */}
                  <div
                    onClick={() => setReportFormat('both')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      reportFormat === 'both'
                        ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <FileText className="w-4 h-4 text-rose-500" />
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">PDF + Excel</span>
                        {reportFormat === 'both' && (
                          <Check className="w-3.5 h-3.5 text-indigo-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Ambos os formatos consolidados (Recomendado).
                      </p>
                    </div>
                  </div>

                  {/* Option: PDF */}
                  <div
                    onClick={() => setReportFormat('pdf')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      reportFormat === 'pdf'
                        ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-rose-600 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">Apenas PDF</span>
                        {reportFormat === 'pdf' && (
                          <Check className="w-3.5 h-3.5 text-indigo-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Documento formatado pronto para impressão e arquivamento.
                      </p>
                    </div>
                  </div>

                  {/* Option: Excel */}
                  <div
                    onClick={() => setReportFormat('excel')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      reportFormat === 'excel'
                        ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">Apenas Excel</span>
                        {reportFormat === 'excel' && (
                          <Check className="w-3.5 h-3.5 text-indigo-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Planilha (.xlsx) com tabelas de dados dinâmicas.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Gatilhos de Envio */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-2xs">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Regras de Disparo Automático</span>
                </h3>

                {/* Trigger 1: Por Evento Encerrado */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-900">
                        Disparar ao Encerrar Evento
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-800 rounded-md">
                        Automático
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Gera e envia o relatório consolidado do evento assim que o administrador finaliza ou encerra o evento no Gestor de Eventos.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={sendOnEventClosed}
                      onChange={(e) => setSendOnEventClosed(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {/* Trigger 2: Envio Semanal */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-bold text-slate-900">
                          Envio Semanal Programado
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Compilação semanal de todos os credenciamentos e taxas de comparecimento enviada periodicamente.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input
                        type="checkbox"
                        checked={sendWeekly}
                        onChange={(e) => setSendWeekly(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {sendWeekly && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/80">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Dia da Semana
                        </label>
                        <select
                          value={weeklyDay}
                          onChange={(e) => setWeeklyDay(e.target.value as WeekDay)}
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {Object.entries(dayLabels).map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Horário do Disparo (24h)
                        </label>
                        <input
                          type="time"
                          value={weeklyTime}
                          onChange={(e) => setWeeklyTime(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Opção adicional: Lista de ausentes */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="chk-absentees"
                    checked={includeAbsenteesList}
                    onChange={(e) => setIncludeAbsenteesList(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="chk-absentees" className="text-xs text-slate-700 cursor-pointer">
                    Destacar nominalmente lista de inscritos ausentes / pendentes de check-in
                  </label>
                </div>
              </div>

              {/* Section 5: Servidor SMTP (Opcional) */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => setShowSmtpConfig(!showSmtpConfig)}
                  className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-indigo-600" />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        Configuração de Servidor de E-mail (SMTP)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {smtpEnabled
                          ? `Ativo (${smtpHost || 'SMTP configurado'})`
                          : 'Opcional — para entrega em caixa postal real'}
                      </span>
                    </div>
                  </div>
                  {showSmtpConfig ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {showSmtpConfig && (
                  <div className="p-5 border-t border-slate-100 space-y-4 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">
                        Habilitar envio por servidor SMTP externo:
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={smtpEnabled}
                          onChange={(e) => setSmtpEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      Você pode usar qualquer servidor como Gmail (smtp.gmail.com), Outlook, Amazon SES ou servidor corporativo. Se desabilitado, os relatórios são gerados e preservados no painel de auditoria para download direto.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Servidor SMTP (Host)
                        </label>
                        <input
                          type="text"
                          value={smtpHost}
                          onChange={(e) => setSmtpHost(e.target.value)}
                          placeholder="smtp.gmail.com"
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Porta
                        </label>
                        <input
                          type="number"
                          value={smtpPort}
                          onChange={(e) => setSmtpPort(Number(e.target.value))}
                          placeholder="587"
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Usuário SMTP / E-mail Remetente
                        </label>
                        <input
                          type="text"
                          value={smtpUser}
                          onChange={(e) => setSmtpUser(e.target.value)}
                          placeholder="usuario@dominio.com"
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Senha / Senha de Aplicativo
                        </label>
                        <input
                          type="password"
                          value={smtpPass}
                          onChange={(e) => setSmtpPass(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Nome de Exibição do Remetente
                        </label>
                        <input
                          type="text"
                          value={smtpFromName}
                          onChange={(e) => setSmtpFromName(e.target.value)}
                          placeholder="CheckIn QR Eventos"
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                        />
                      </div>

                      <div className="flex items-center gap-2 self-end mb-2">
                        <input
                          type="checkbox"
                          id="chk-secure"
                          checked={smtpSecure}
                          onChange={(e) => setSmtpSecure(e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600 border-slate-300"
                        />
                        <label htmlFor="chk-secure" className="text-xs text-slate-700 cursor-pointer">
                          Usar SSL/TLS Seguro (Porta 465)
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <select
                    value={testEventId}
                    onChange={(e) => setTestEventId(e.target.value)}
                    className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 font-medium"
                  >
                    <option value="all">Consolidado (Todos os Eventos)</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.name} ({ev.date})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleRunTest}
                    disabled={testing}
                    className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600" />
                    <span>{testing ? 'Testando...' : 'Testar Disparo Agora'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Salvar Configurações</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* Logs Tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Histórico de Relatórios Automatizados
                  </h3>
                  <p className="text-xs text-slate-500">
                    Registros dos relatórios gerados e enviados pelo sistema
                  </p>
                </div>

                {logs.length > 0 && (
                  <button
                    onClick={handleClearLogs}
                    className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Limpar Histórico</span>
                  </button>
                )}
              </div>

              {logs.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 p-6">
                  <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">
                    Nenhum disparo registrado ainda
                  </p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    Os relatórios enviados semanalmente ou ao encerrar eventos aparecerão aqui.
                  </p>
                  <button
                    onClick={handleRunTest}
                    disabled={testing}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Executar Primeiro Teste</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {logs.map((log) => {
                    const dateFormatted = new Date(log.triggeredAt).toLocaleString('pt-BR');
                    const triggerName =
                      log.triggerType === 'weekly'
                        ? 'Semanal'
                        : log.triggerType === 'event_closed'
                        ? 'Encerramento de Evento'
                        : 'Teste Manual';

                    return (
                      <div
                        key={log.id}
                        className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider ${
                                log.triggerType === 'weekly'
                                  ? 'bg-blue-100 text-blue-800'
                                  : log.triggerType === 'event_closed'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {triggerName}
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              {log.eventName || 'Consolidado Geral'}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {dateFormatted}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 line-clamp-1">{log.details}</p>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                            <span>
                              Destinatário: <strong>{log.recipientEmail}</strong>
                            </span>
                            <span>
                              Formato: <strong className="uppercase">{log.format}</strong>
                            </span>
                            <span className="text-emerald-700 font-semibold">
                              Comparecimento: <strong>{log.summary.rate}</strong> ({log.summary.present}/{log.summary.total})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <a
                            href={`/api/automation/download-report${
                              log.eventId ? `?eventId=${log.eventId}` : ''
                            }`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                            title="Baixar planilha deste relatório"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-500" />
                            <span>Excel</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
