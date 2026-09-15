import React, { useState, useEffect } from 'react';
import {
  User,
  Hash,
  Building2,
  QrCode,
  Download,
  CheckCircle,
  ArrowRight,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Calendar,
  Plus,
  Pencil,
  Copy,
  Check,
  Smartphone,
} from 'lucide-react';
import { Participant, EventItem } from '../types';
import { registerParticipant } from '../lib/api';
import {
  generateQRDataUrl,
  downloadQRCodeOnly,
  downloadParticipantBadge,
  buildQRPayload,
  getParticipantDirectUrl,
} from '../lib/qr';
import { EditParticipantModal } from './EditParticipantModal';

interface RegistrationViewProps {
  events: EventItem[];
  selectedEventId: string;
  onParticipantAdded: (participant: Participant) => void;
  onOpenScanner: () => void;
  onOpenEventManager: () => void;
}

export const RegistrationView: React.FC<RegistrationViewProps> = ({
  events,
  selectedEventId,
  onParticipantAdded,
  onOpenScanner,
  onOpenEventManager,
}) => {
  const [name, setName] = useState('');
  const [matricula, setMatricula] = useState('');
  const [company, setCompany] = useState('');
  const [targetEventId, setTargetEventId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (selectedEventId && selectedEventId !== 'all') {
      setTargetEventId(selectedEventId);
    } else if (events.length > 0 && !targetEventId) {
      setTargetEventId(events[0].id);
    }
  }, [selectedEventId, events]);

  // Success state holding the newly registered participant
  const [registeredUser, setRegisteredUser] = useState<Participant | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string>('');
  const [downloading, setDownloading] = useState(false);
  const [isEditingJustRegistered, setIsEditingJustRegistered] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    const trimmedMatricula = matricula.trim();
    const trimmedCompany = company.trim();

    if (!trimmedName || !trimmedMatricula || !trimmedCompany) {
      setErrorMessage('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    try {
      setLoading(true);
      const participant = await registerParticipant({
        name: trimmedName,
        matricula: trimmedMatricula,
        company: trimmedCompany,
        eventId: targetEventId || (events[0] ? events[0].id : undefined),
      });

      // Generate the QR code data URL immediately
      const payload = buildQRPayload(participant);
      const qrUrl = await generateQRDataUrl(payload);

      setRegisteredUser(participant);
      setQrImageUrl(qrUrl);
      onParticipantAdded(participant);
    } catch (err: any) {
      console.error('Erro ao cadastrar:', err);
      setErrorMessage(err.message || 'Erro ao registrar participante. Verifique se a matrícula já não existe.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!registeredUser) return;
    try {
      const url = getParticipantDirectUrl(registeredUser);
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleDownloadQR = async () => {
    if (!registeredUser) return;
    try {
      setDownloading(true);
      await downloadQRCodeOnly(registeredUser);
    } catch (err) {
      console.error('Erro no download:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadBadge = async () => {
    if (!registeredUser) return;
    try {
      setDownloading(true);
      await downloadParticipantBadge(registeredUser);
    } catch (err) {
      console.error('Erro no download do crachá:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleResetForm = () => {
    setName('');
    setMatricula('');
    setCompany('');
    setRegisteredUser(null);
    setQrImageUrl('');
    setErrorMessage(null);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Registration Success Screen */}
      {registeredUser && qrImageUrl ? (
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          {/* Top banner */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white p-6 sm:p-8 text-center relative overflow-hidden">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 backdrop-blur text-white mb-3 shadow-sm">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Cadastro Concluído com Sucesso!</h2>
            <p className="text-emerald-100 text-sm mt-1">
              O código QR individual do participante foi gerado e já está pronto para uso.
            </p>
          </div>

          <div className="p-6 sm:p-8 flex flex-col items-center">
            {/* Participant Card Preview */}
            <div className="w-full max-w-sm bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col items-center text-center">
              <div className="w-full flex items-center justify-between pb-3 border-b border-slate-200 text-xs text-slate-500">
                <span className="font-semibold text-sky-700">CREDENCIAL INDIVIDUAL</span>
                <span className="font-mono text-slate-400">ID: {registeredUser.id.substring(0, 10)}</span>
              </div>

              {/* Event and Date Tag */}
              {registeredUser.eventName && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-sky-100 border border-sky-200 rounded-full text-xs font-semibold text-sky-800">
                  <Calendar className="w-3.5 h-3.5 text-sky-600" />
                  <span>{registeredUser.eventName}</span>
                  {registeredUser.eventDate && (
                    <span className="text-sky-600 font-mono">
                      • {new Date(registeredUser.eventDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
              )}

              {/* QR Code Container */}
              <div className="my-4 p-3 bg-white rounded-xl shadow-xs border border-slate-200 flex items-center justify-center">
                <img
                  src={qrImageUrl}
                  alt={`QR Code de ${registeredUser.name}`}
                  className="w-52 h-52 object-contain"
                />
              </div>

              <h3 className="text-xl font-bold text-slate-900 leading-snug">{registeredUser.name}</h3>
              <p className="text-sm font-semibold text-sky-600 mt-0.5">{registeredUser.company}</p>
              <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-mono text-slate-700 font-medium">
                <span>Matrícula:</span>
                <strong>{registeredUser.matricula}</strong>
              </div>

              {/* Mobile reading badge */}
              <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200/80 rounded-xl text-center w-full">
                <div className="flex items-center justify-center gap-1.5 text-emerald-800 text-xs font-bold">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Leitura Ativa em Qualquer Celular (4G/5G/Wi-Fi)</span>
                </div>
                <p className="text-[10px] text-emerald-700 mt-0.5 leading-snug">
                  Qualquer smartphone pode escanear com a própria câmera para registrar a presença.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full max-w-sm mt-6 space-y-2.5">
              {/* Copy link to WhatsApp */}
              <button
                id="btn-copy-mobile-link"
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Link Copiado para a Área de Transferência!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Link para Enviar pelo WhatsApp</span>
                  </>
                )}
              </button>

              {/* Tecla para baixar o código qr (Explicit User Requirement) */}
              <button
                id="btn-download-qr-code"
                onClick={handleDownloadQR}
                disabled={downloading}
                className="w-full flex items-center justify-center gap-2.5 px-5 py-3 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer text-sm"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Código QR (PNG)</span>
              </button>

              {/* Extended Badge Download */}
              <button
                id="btn-download-full-badge"
                onClick={handleDownloadBadge}
                disabled={downloading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-slate-500" />
                <span>Baixar Crachá Completo do Evento</span>
              </button>

              {/* Editar Cadastro Atual */}
              <button
                id="btn-edit-just-registered"
                onClick={() => setIsEditingJustRegistered(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl border border-slate-200 transition-colors text-xs cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 text-sky-600" />
                <span>Editar Dados deste Cadastro</span>
              </button>

              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row gap-2.5">
                <button
                  id="btn-register-another"
                  onClick={handleResetForm}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-xl transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Cadastrar Outro</span>
                </button>

                <button
                  id="btn-goto-scanner"
                  onClick={onOpenScanner}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors shadow-xs"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Testar no Leitor</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Registration Form */
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="border-b border-slate-100 p-6 sm:p-8 bg-gradient-to-br from-slate-50 to-sky-50/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Formulário de Cadastro
                </h2>
                <p className="text-sm text-slate-600 mt-0.5">
                  Informe os dados para gerar o código QR de credenciamento
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            {errorMessage && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3 animate-in fade-in">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Field: Evento & Data de Realização */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="select-event" className="block text-sm font-semibold text-slate-800">
                  Evento / Data de Realização <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={onOpenEventManager}
                  className="text-xs text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1 cursor-pointer hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cadastrar Novo Evento</span>
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="w-5 h-5 text-sky-600" />
                </div>
                <select
                  id="select-event"
                  value={targetEventId}
                  onChange={(e) => setTargetEventId(e.target.value)}
                  className="w-full pl-11 pr-10 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all cursor-pointer"
                >
                  {events.map((evt) => {
                    const formattedDate = new Date(evt.date + 'T00:00:00').toLocaleDateString('pt-BR');
                    return (
                      <option key={evt.id} value={evt.id}>
                        {evt.name} — {formattedDate} {evt.time ? `às ${evt.time}` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Field: Nome Completo */}
            <div className="space-y-2">
              <label htmlFor="input-fullname" className="block text-sm font-semibold text-slate-800">
                Nome Completo <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-5 h-5" />
                </div>
                <input
                  id="input-fullname"
                  type="text"
                  required
                  placeholder="Ex: Carlos Alberto de Souza"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm transition-all"
                />
              </div>
            </div>

            {/* Field: Número de Matrícula */}
            <div className="space-y-2">
              <label htmlFor="input-matricula" className="block text-sm font-semibold text-slate-800">
                Número de Matrícula <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Hash className="w-5 h-5" />
                </div>
                <input
                  id="input-matricula"
                  type="text"
                  required
                  placeholder="Ex: 2024-5890 ou 98231"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm font-mono transition-all"
                />
              </div>
              <p className="text-xs text-slate-500">
                Identificador único que será codificado dentro do código QR.
              </p>
            </div>

            {/* Field: Empresa */}
            <div className="space-y-2">
              <label htmlFor="input-company" className="block text-sm font-semibold text-slate-800">
                Empresa / Organização <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <input
                  id="input-company"
                  type="text"
                  required
                  placeholder="Ex: Tech Corp Solutions, Inovare Ltda..."
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm transition-all"
                />
              </div>
            </div>

            {/* Submit button */}
            <div className="pt-2">
              <button
                id="btn-submit-registration"
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:opacity-60 text-white font-bold rounded-xl shadow-md transition-all text-base cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Processando e gerando QR Code...</span>
                  </>
                ) : (
                  <>
                    <QrCode className="w-5 h-5" />
                    <span>Cadastrar e Gerar Código QR</span>
                  </>
                )}
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/80 text-xs text-slate-600 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <span>
                Ao concluir o cadastro, o participante recebe imediatamente o código QR pronto para download e apresentação pelo celular no dia do evento.
              </span>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Edição de Participante Recém-Cadastrado */}
      {isEditingJustRegistered && registeredUser && (
        <EditParticipantModal
          participant={registeredUser}
          events={events}
          onSaveSuccess={async (updated) => {
            setRegisteredUser(updated);
            const payload = buildQRPayload(updated);
            const qrUrl = await generateQRDataUrl(payload);
            setQrImageUrl(qrUrl);
            onParticipantAdded(updated);
            setIsEditingJustRegistered(false);
          }}
          onClose={() => setIsEditingJustRegistered(false)}
        />
      )}
    </div>
  );
};
