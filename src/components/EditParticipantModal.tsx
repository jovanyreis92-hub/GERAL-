import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Hash,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Save,
  AlertCircle,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { Participant, EventItem } from '../types';
import { updateParticipant } from '../lib/api';
import { generateQRDataUrl, buildQRPayload } from '../lib/qr';

interface EditParticipantModalProps {
  participant: Participant;
  events: EventItem[];
  onSaveSuccess: (updated: Participant) => void;
  onClose: () => void;
}

export const EditParticipantModal: React.FC<EditParticipantModalProps> = ({
  participant,
  events,
  onSaveSuccess,
  onClose,
}) => {
  const [name, setName] = useState(participant.name);
  const [matricula, setMatricula] = useState(participant.matricula);
  const [company, setCompany] = useState(participant.company);
  const [eventId, setEventId] = useState(participant.eventId || (events[0]?.id || ''));
  const [checkedIn, setCheckedIn] = useState(participant.checkedIn);

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previewQr, setPreviewQr] = useState<string>('');

  // Update preview QR whenever data changes
  useEffect(() => {
    const targetEvent = events.find((e) => e.id === eventId);
    const mockP: Participant = {
      ...participant,
      name: name.trim() || participant.name,
      matricula: matricula.trim() || participant.matricula,
      company: company.trim() || participant.company,
      eventId: targetEvent ? targetEvent.id : participant.eventId,
      eventName: targetEvent ? targetEvent.name : participant.eventName,
      eventDate: targetEvent ? targetEvent.date : participant.eventDate,
      checkedIn,
    };
    const payload = buildQRPayload(mockP);
    generateQRDataUrl(payload).then(setPreviewQr).catch(console.error);
  }, [name, matricula, company, eventId, checkedIn, events, participant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedName = name.trim();
    const trimmedMatricula = matricula.trim();
    const trimmedCompany = company.trim();

    if (!trimmedName) {
      setErrorMessage('O nome do participante é obrigatório.');
      return;
    }
    if (!trimmedMatricula) {
      setErrorMessage('A matrícula ou registro funcional é obrigatório.');
      return;
    }
    if (!trimmedCompany) {
      setErrorMessage('O nome da empresa ou instituição é obrigatório.');
      return;
    }

    try {
      setSaving(true);
      const updated = await updateParticipant(participant.id, {
        name: trimmedName,
        matricula: trimmedMatricula,
        company: trimmedCompany,
        eventId,
        checkedIn,
      });

      setSuccessMessage('Cadastro do participante atualizado com sucesso!');
      setTimeout(() => {
        onSaveSuccess(updated);
        onClose();
      }, 600);
    } catch (err: any) {
      console.error('Erro ao atualizar participante:', err);
      setErrorMessage(err.message || 'Não foi possível salvar as alterações.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                Editar Cadastro de Participante
              </h3>
              <p className="text-xs text-slate-400">
                Altere os dados cadastrais, evento vinculado ou status de presença
              </p>
            </div>
          </div>
          <button
            id="btn-close-edit-modal"
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Nome Completo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nome Completo do Participante <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="edit-input-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Ana Clara Silva"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-600 focus:bg-white"
              />
            </div>
          </div>

          {/* Grid: Matrícula & Empresa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Matrícula */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Matrícula / ID <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Hash className="w-4 h-4" />
                </div>
                <input
                  id="edit-input-matricula"
                  type="text"
                  required
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                  placeholder="Ex: MAT-8890"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-600 focus:bg-white"
                />
              </div>
            </div>

            {/* Empresa */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Empresa / Instituição <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <input
                  id="edit-input-company"
                  type="text"
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Ex: Petrobras S.A."
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-600 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Evento & Data */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Evento & Data de Realização <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Calendar className="w-4 h-4 text-sky-600" />
              </div>
              <select
                id="edit-select-event"
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-600 focus:bg-white cursor-pointer"
              >
                {events.map((evt) => {
                  const formattedDate = new Date(evt.date + 'T00:00:00').toLocaleDateString('pt-BR');
                  return (
                    <option key={evt.id} value={evt.id}>
                      {evt.name} — {formattedDate} {evt.location ? `(${evt.location})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Ao transferir o participante para outro evento, a credencial e o QR code se adaptam automaticamente.
            </p>
          </div>

          {/* Status de Presença */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Status de Presença no Evento
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setCheckedIn(true)}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  checkedIn
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-xs ring-2 ring-emerald-400/30'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 ${checkedIn ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>Presente (Confirmado)</span>
              </button>

              <button
                type="button"
                onClick={() => setCheckedIn(false)}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  !checkedIn
                    ? 'bg-amber-50 border-amber-400 text-amber-800 shadow-xs ring-2 ring-amber-400/30'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Clock className={`w-4 h-4 ${!checkedIn ? 'text-amber-600' : 'text-slate-400'}`} />
                <span>Pendente (Ausente)</span>
              </button>
            </div>
          </div>

          {/* Mini Preview do QR Code atualizado */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3.5">
            <div className="w-16 h-16 bg-white p-1 rounded-xl border border-slate-200 shrink-0 flex items-center justify-center shadow-2xs">
              {previewQr ? (
                <img src={previewQr} alt="QR Code Preview" className="w-full h-full object-contain" />
              ) : (
                <QrCode className="w-8 h-8 text-slate-400 animate-pulse" />
              )}
            </div>
            <div className="text-xs">
              <div className="flex items-center gap-1 font-bold text-slate-900">
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                <span>QR Code Atualizado Automaticamente</span>
              </div>
              <p className="text-slate-500 mt-0.5 text-[11px] leading-relaxed">
                As credenciais e cartões individuais de acesso refletem imediatamente as novas informações do cadastro.
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              id="btn-save-edit-participant"
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 px-4 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-bold rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {saving ? (
                <span>Salvando alterações...</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
