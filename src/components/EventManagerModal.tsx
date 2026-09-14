import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Trash2,
  Edit2,
  X,
  CheckCircle2,
  AlertCircle,
  Users,
  ChevronRight,
  Sparkles,
  CalendarDays,
  Lock,
  Unlock,
  Send,
  RotateCcw,
} from 'lucide-react';
import { EventItem, Participant } from '../types';
import { createEvent, updateEvent, deleteEvent, closeEvent, reopenEvent } from '../lib/api';

interface EventManagerModalProps {
  events: EventItem[];
  participants: Participant[];
  selectedEventId: string; // 'all' or specific id
  onSelectEvent: (eventId: string) => void;
  onEventsUpdated: () => void;
  onClose: () => void;
}

export const EventManagerModal: React.FC<EventManagerModalProps> = ({
  events,
  participants,
  selectedEventId,
  onSelectEvent,
  onEventsUpdated,
  onClose,
}) => {
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Tab: 'list' or 'create'
  const [activeView, setActiveView] = useState<'list' | 'create'>('list');

  // Filter state for list: 'all' | 'active' | 'closed' | 'upcoming' | 'past'
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'closed' | 'upcoming' | 'past'>('all');
  const [statusActionId, setStatusActionId] = useState<string | null>(null);
  const [actionBanner, setActionBanner] = useState<{
    type: 'success' | 'info' | 'error';
    text: string;
  } | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  const handleStartEdit = (e: EventItem) => {
    setEditingEventId(e.id);
    setName(e.name);
    setDate(e.date);
    setTime(e.time || '');
    setEndDate(e.endDate || '');
    setLocation(e.location || '');
    setDescription(e.description || '');
    setErrorMessage(null);
    setSuccessMessage(null);
    setActiveView('create');
  };

  const handleResetForm = () => {
    setEditingEventId(null);
    setName('');
    setDate(new Date().toISOString().slice(0, 10));
    setTime('09:00');
    setEndDate('');
    setLocation('');
    setDescription('');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleToggleStatus = async (evt: EventItem) => {
    const isClosed = evt.status === 'closed';

    if (!isClosed) {
      const confirmClose = window.confirm(
        `Encerrar o evento "${evt.name}"?\n\nIsso marcará o evento como encerrado e, caso a automação esteja ativa, disparará automaticamente o envio do relatório executivo em PDF/Excel para o administrador.`
      );
      if (!confirmClose) return;
    }

    try {
      setStatusActionId(evt.id);
      setActionBanner(null);

      if (isClosed) {
        const res = await reopenEvent(evt.id);
        setActionBanner({
          type: 'info',
          text: `Evento "${evt.name}" reaberto com sucesso!`,
        });
      } else {
        const res = await closeEvent(evt.id);
        if (res.automationTriggered) {
          setActionBanner({
            type: 'success',
            text: `Evento "${evt.name}" encerrado com sucesso! Relatório automatizado disparado para o administrador.`,
          });
        } else {
          setActionBanner({
            type: 'success',
            text: `Evento "${evt.name}" encerrado com sucesso!`,
          });
        }
      }

      onEventsUpdated();
      setTimeout(() => setActionBanner(null), 6000);
    } catch (err: any) {
      setActionBanner({
        type: 'error',
        text: err?.message || 'Erro ao alterar status do evento.',
      });
    } finally {
      setStatusActionId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedName = name.trim();
    const trimmedDate = date.trim();

    if (!trimmedName || !trimmedDate) {
      setErrorMessage('Nome do evento e data de realização são obrigatórios.');
      return;
    }

    try {
      setLoading(true);
      if (editingEventId) {
        await updateEvent(editingEventId, {
          name: trimmedName,
          date: trimmedDate,
          endDate: endDate ? endDate.trim() : null,
          time: time ? time.trim() : null,
          location: location.trim(),
          description: description.trim(),
        });
        setSuccessMessage('Evento atualizado com sucesso!');
      } else {
        const created = await createEvent({
          name: trimmedName,
          date: trimmedDate,
          endDate: endDate ? endDate.trim() : null,
          time: time ? time.trim() : null,
          location: location.trim(),
          description: description.trim(),
        });
        setSuccessMessage('Novo evento cadastrado com sucesso!');
        onSelectEvent(created.id);
      }

      onEventsUpdated();
      setTimeout(() => {
        handleResetForm();
        setActiveView('list');
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao processar o evento.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, eventName: string) => {
    if (events.length <= 1) {
      alert('Não é possível excluir o único evento cadastrado no sistema.');
      return;
    }

    const count = participants.filter((p) => p.eventId === id).length;
    const confirmMsg = count > 0
      ? `Excluir o evento "${eventName}"? Existem ${count} participantes associados que serão remanejados.`
      : `Deseja realmente excluir o evento "${eventName}"?`;

    if (window.confirm(confirmMsg)) {
      try {
        await deleteEvent(id);
        onEventsUpdated();
        if (selectedEventId === id) {
          onSelectEvent('all');
        }
      } catch (err: any) {
        alert(err.message || 'Erro ao excluir o evento.');
      }
    }
  };

  const filteredEvents = events.filter((e) => {
    if (filterMode === 'active') {
      return e.status !== 'closed';
    }
    if (filterMode === 'closed') {
      return e.status === 'closed';
    }
    if (filterMode === 'upcoming') {
      return e.date >= todayStr;
    }
    if (filterMode === 'past') {
      return e.date < todayStr;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Cadastramento de Eventos por Datas
              </h2>
              <p className="text-xs text-slate-400">
                Cadastre e selecione eventos para credenciamento e emissão de relatórios
              </p>
            </div>
          </div>

          <button
            id="btn-close-event-modal"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-nav Tabs */}
        <div className="px-6 pt-3 pb-0 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              id="tab-event-list"
              onClick={() => {
                setActiveView('list');
                handleResetForm();
              }}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeView === 'list'
                  ? 'border-sky-600 text-sky-700 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Lista de Eventos ({events.length})
            </button>
            <button
              id="tab-event-create"
              onClick={() => {
                setActiveView('create');
                handleResetForm();
              }}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                activeView === 'create'
                  ? 'border-sky-600 text-sky-700 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-sky-600" />
              <span>{editingEventId ? 'Editar Evento' : 'Cadastrar Novo Evento'}</span>
            </button>
          </div>

          {activeView === 'list' && (
            <div className="flex items-center gap-1 pb-2 flex-wrap">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${
                  filterMode === 'all' ? 'bg-slate-200 text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Todos ({events.length})
              </button>
              <button
                onClick={() => setFilterMode('active')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${
                  filterMode === 'active' ? 'bg-emerald-100 text-emerald-900 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Ativos ({events.filter((e) => e.status !== 'closed').length})
              </button>
              <button
                onClick={() => setFilterMode('closed')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${
                  filterMode === 'closed' ? 'bg-purple-100 text-purple-900 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Encerrados ({events.filter((e) => e.status === 'closed').length})
              </button>
              <button
                onClick={() => setFilterMode('upcoming')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${
                  filterMode === 'upcoming' ? 'bg-sky-100 text-sky-800 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Próximos / Hoje
              </button>
              <button
                onClick={() => setFilterMode('past')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${
                  filterMode === 'past' ? 'bg-slate-200 text-slate-800 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Passados
              </button>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {actionBanner && (
            <div
              className={`mb-4 p-3 rounded-xl border text-xs flex items-center justify-between gap-2 animate-in fade-in ${
                actionBanner.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : actionBanner.type === 'info'
                  ? 'bg-sky-50 border-sky-200 text-sky-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {actionBanner.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-sky-600 shrink-0" />
                )}
                <span className="font-semibold">{actionBanner.text}</span>
              </div>
              <button
                onClick={() => setActionBanner(null)}
                className="p-1 hover:bg-black/5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {activeView === 'list' ? (
            <div className="space-y-3">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 p-6">
                  <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">Nenhum evento encontrado</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    Cadastre o primeiro evento com data e horário para começar.
                  </p>
                  <button
                    onClick={() => {
                      setActiveView('create');
                      handleResetForm();
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 text-white text-xs font-bold rounded-lg hover:bg-sky-700 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Cadastrar Evento</span>
                  </button>
                </div>
              ) : (
                filteredEvents.map((evt) => {
                  const isSelected = selectedEventId === evt.id;
                  const isToday = evt.date === todayStr;
                  const isPast = evt.date < todayStr;
                  const isClosed = evt.status === 'closed';
                  const eventParts = participants.filter((p) => p.eventId === evt.id);
                  const checkedCount = eventParts.filter((p) => p.checkedIn).length;

                  // Format date display
                  const dateObj = new Date(evt.date + 'T00:00:00');
                  const day = dateObj.toLocaleDateString('pt-BR', { day: '2-digit' });
                  const month = dateObj.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase();
                  const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });

                  return (
                    <div
                      key={evt.id}
                      className={`p-4 bg-white rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isClosed
                          ? 'border-slate-200 bg-slate-50/40 opacity-90'
                          : isSelected
                          ? 'border-sky-500 ring-2 ring-sky-500/20 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        {/* Date badge */}
                        <div
                          className={`w-14 h-16 rounded-xl flex flex-col items-center justify-center shrink-0 border ${
                            isClosed
                              ? 'bg-slate-100 text-slate-500 border-slate-200'
                              : isToday
                              ? 'bg-sky-500 text-white border-sky-600 shadow-xs'
                              : isPast
                              ? 'bg-slate-100 text-slate-600 border-slate-200'
                              : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          }`}
                        >
                          <span className="text-xs font-bold uppercase tracking-wider opacity-80 leading-none">
                            {month}
                          </span>
                          <span className="text-xl font-extrabold leading-none my-0.5">{day}</span>
                          <span className="text-[10px] font-semibold opacity-70 leading-none capitalize">
                            {weekday}
                          </span>
                        </div>

                        {/* Info */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-bold text-slate-900">{evt.name}</h3>

                            {/* Status badge: Ativo vs Encerrado */}
                            {isClosed ? (
                              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 rounded-md border border-purple-200 flex items-center gap-1">
                                <Lock className="w-3 h-3 text-purple-600" />
                                Encerrado
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded-md border border-emerald-200 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Ativo
                              </span>
                            )}

                            {isToday && !isClosed && (
                              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 rounded-md border border-amber-200">
                                Hoje
                              </span>
                            )}
                            {isSelected && (
                              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-800 rounded-md border border-sky-200">
                                Selecionado
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                            {evt.time && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>{evt.time}</span>
                              </div>
                            )}
                            {evt.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                <span className="line-clamp-1">{evt.location}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-slate-600 font-medium">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              <span>
                                {eventParts.length} inscritos ({checkedCount} presentes)
                              </span>
                            </div>
                          </div>

                          {evt.description && (
                            <p className="text-xs text-slate-500 line-clamp-1 italic">
                              {evt.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0 flex-wrap">
                        {/* Close / Reopen Button */}
                        <button
                          onClick={() => handleToggleStatus(evt)}
                          disabled={statusActionId === evt.id}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                            isClosed
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                              : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
                          }`}
                          title={
                            isClosed
                              ? 'Reabrir este evento para novos check-ins'
                              : 'Encerrar evento e disparar relatório automatizado em PDF/Excel'
                          }
                        >
                          {statusActionId === evt.id ? (
                            <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                          ) : isClosed ? (
                            <Unlock className="w-3.5 h-3.5 text-slate-600" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-purple-600" />
                          )}
                          <span>{isClosed ? 'Reabrir' : 'Encerrar'}</span>
                        </button>

                        <button
                          onClick={() => {
                            onSelectEvent(evt.id);
                            onClose();
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            isSelected
                              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              : 'bg-sky-600 text-white hover:bg-sky-700 shadow-xs'
                          }`}
                        >
                          {isSelected ? 'Em Uso' : 'Selecionar'}
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleStartEdit(evt)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Editar evento"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(evt.id, evt.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Excluir evento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* Create / Edit Form */
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-sky-600" />
                  <span>{editingEventId ? 'Editar Dados do Evento' : 'Cadastrar Novo Evento por Data'}</span>
                </h3>
                {editingEventId && (
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="text-xs text-slate-500 hover:text-slate-800 underline"
                  >
                    Cancelar edição
                  </button>
                )}
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Nome do Evento */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nome do Evento *
                </label>
                <input
                  id="input-event-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Seminário de Segurança e Tecnologia 2026"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:bg-white transition-all"
                />
              </div>

              {/* Data e Horário */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Data do Evento *
                  </label>
                  <div className="relative">
                    <input
                      id="input-event-date"
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setDate(new Date().toISOString().slice(0, 10))}
                      className="text-[11px] text-sky-600 hover:underline"
                    >
                      Hoje
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDate(new Date(Date.now() + 86400000).toISOString().slice(0, 10))
                      }
                      className="text-[11px] text-sky-600 hover:underline"
                    >
                      Amanhã
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDate(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10))
                      }
                      className="text-[11px] text-sky-600 hover:underline"
                    >
                      Em 7 dias
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Horário de Início
                  </label>
                  <input
                    id="input-event-time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Local */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Local / Sala / Endereço
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    id="input-event-location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ex: Auditório Principal - Bloco B"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Descrição / Informações Adicionais
                </label>
                <textarea
                  id="input-event-desc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Informações sobre pauta, palestrantes ou avisos gerais..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:bg-white transition-all"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('list');
                    handleResetForm();
                  }}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Voltar para Lista
                </button>
                <button
                  id="btn-submit-event"
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>{loading ? 'Salvando...' : editingEventId ? 'Atualizar Evento' : 'Salvar Novo Evento'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Evento ativo no filtro:</span>
            <strong className="text-slate-800">
              {selectedEventId === 'all'
                ? 'Todos os Eventos'
                : events.find((e) => e.id === selectedEventId)?.name || 'Evento Selecionado'}
            </strong>
          </div>
          {selectedEventId !== 'all' && (
            <button
              onClick={() => onSelectEvent('all')}
              className="text-sky-600 hover:text-sky-800 font-semibold cursor-pointer underline"
            >
              Ver Todos os Eventos
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
