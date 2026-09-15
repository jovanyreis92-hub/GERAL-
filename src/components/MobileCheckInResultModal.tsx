import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  QrCode,
  Building,
  User,
  Hash,
  Calendar,
  Clock,
  ShieldCheck,
  Download,
  Camera,
  X,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { Participant } from '../types';
import { downloadParticipantBadge, downloadQRCodeOnly } from '../lib/qr';

interface MobileCheckInResultModalProps {
  result: {
    participant: Participant;
    alreadyCheckedIn: boolean;
    message: string;
  } | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onOpenScanner: () => void;
}

export const MobileCheckInResultModal: React.FC<MobileCheckInResultModalProps> = ({
  result,
  loading,
  error,
  onClose,
  onOpenScanner,
}) => {
  if (!result && !loading && !error) return null;

  const handleDownloadBadge = async () => {
    if (!result?.participant) return;
    await downloadParticipantBadge(result.participant);
  };

  const handleDownloadQR = async () => {
    if (!result?.participant) return;
    await downloadQRCodeOnly(result.participant);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto">
        {/* Top Header Badge */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Leitura Móvel Concluída</h3>
              <p className="text-xs text-slate-400">Validação via qualquer celular em rede móvel ou Wi-Fi</p>
            </div>
          </div>
          <button
            id="btn-close-mobile-checkin-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar comprovante"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {loading ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-lg">Validando Código QR...</h4>
                <p className="text-xs text-slate-500">Conectando ao sistema para confirmar presença em tempo real</p>
              </div>
            </div>
          ) : error ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-lg">Código Não Encontrado</h4>
                <p className="text-xs text-rose-600 font-medium px-4">{error}</p>
                <p className="text-xs text-slate-400 pt-2">
                  Verifique se o código QR foi escaneado corretamente ou procure o suporte na recepção do evento.
                </p>
              </div>
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Voltar ao Início
              </button>
            </div>
          ) : result ? (
            <div className="space-y-5">
              {/* Big Status Banner */}
              <div
                className={`p-4 rounded-2xl border text-center flex flex-col items-center gap-2 ${
                  result.alreadyCheckedIn
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-sm'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    result.alreadyCheckedIn ? 'bg-amber-100 text-amber-700' : 'bg-emerald-500 text-white shadow-md'
                  }`}
                >
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base tracking-tight uppercase">
                    {result.alreadyCheckedIn ? 'Presença Já Confirmada Anteriormente' : 'Presença Confirmada com Sucesso!'}
                  </h4>
                  <p className="text-xs mt-0.5 opacity-90 font-medium">{result.message}</p>
                </div>
              </div>

              {/* Participant Details Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3.5">
                {/* Nome */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Participante</span>
                    <p className="text-base font-bold text-slate-900 break-words leading-tight">{result.participant.name}</p>
                  </div>
                </div>

                {/* Matrícula & Empresa */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200/60">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                      <Hash className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Matrícula</span>
                      <p className="text-xs font-mono font-bold text-slate-800">{result.participant.matricula}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                      <Building className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Empresa</span>
                      <p className="text-xs font-semibold text-slate-800 truncate">{result.participant.company}</p>
                    </div>
                  </div>
                </div>

                {/* Evento & Data */}
                {(result.participant.eventName || result.participant.eventDate) && (
                  <div className="pt-2 border-t border-slate-200/60 flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Evento</span>
                      <p className="text-xs font-bold text-slate-900">
                        {result.participant.eventName || 'Evento Cadastrado'}
                        {result.participant.eventDate && (
                          <span className="text-sky-700 font-normal ml-1">
                            • {new Date(result.participant.eventDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Horário de Check-in */}
                {result.participant.checkInTime && (
                  <div className="pt-2 border-t border-slate-200/60 flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Validação do Check-in</span>
                      <p className="text-xs font-semibold text-emerald-800">
                        {new Date(result.participant.checkInTime).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Digital Authentication Seal */}
              <div className="flex items-center justify-between p-3 bg-slate-900 text-white rounded-xl text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold text-[11px]">Comprovante Digital Autenticado</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 truncate max-w-[140px]">
                  ID: {result.participant.id}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="btn-mobile-download-badge"
                    onClick={handleDownloadBadge}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar Crachá</span>
                  </button>

                  <button
                    id="btn-mobile-download-qr"
                    onClick={handleDownloadQR}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all border border-slate-200 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5 text-slate-600" />
                    <span>Baixar QR Code</span>
                  </button>
                </div>

                <button
                  id="btn-mobile-open-scanner"
                  onClick={() => {
                    onClose();
                    onOpenScanner();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Escanear Outro Participante com Câmera</span>
                </button>

                <button
                  id="btn-mobile-close"
                  onClick={onClose}
                  className="w-full py-2 text-center text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer transition-colors"
                >
                  Concluir e Voltar ao Início
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
