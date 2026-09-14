import React, { useEffect, useState } from 'react';
import { X, Download, QrCode, CheckCircle2, Building, Hash, User, Printer, Calendar, Building2, Pencil } from 'lucide-react';
import { Participant } from '../types';
import { generateQRDataUrl, downloadParticipantBadge, downloadQRCodeOnly, buildQRPayload } from '../lib/qr';

interface QRCardModalProps {
  participant: Participant | null;
  onClose: () => void;
  onEdit?: (participant: Participant) => void;
}

export const QRCardModal: React.FC<QRCardModalProps> = ({ participant, onClose, onEdit }) => {
  const [qrSrc, setQrSrc] = useState<string>('');
  const [downloading, setDownloading] = useState<boolean>(false);

  useEffect(() => {
    if (!participant) return;
    const payload = buildQRPayload(participant);
    generateQRDataUrl(payload).then(setQrSrc).catch(console.error);
  }, [participant]);

  if (!participant) return null;

  const handleDownloadQR = async () => {
    try {
      setDownloading(true);
      await downloadQRCodeOnly(participant);
    } catch (err) {
      console.error('Erro ao baixar QR code:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadBadge = async () => {
    try {
      setDownloading(true);
      await downloadParticipantBadge(participant);
    } catch (err) {
      console.error('Erro ao baixar crachá:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between relative">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Credencial do Participante
              </h3>
              <p className="text-xs text-slate-400">
                Código de acesso individual
              </p>
            </div>
          </div>
          <button
            id="btn-close-qr-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center">
          {/* Status & Event Badges */}
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
            {participant.checkedIn ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Presença Confirmada
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                Presença Pendente
              </span>
            )}

            {participant.eventName && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                <Calendar className="w-3 h-3 text-sky-600" />
                <span>{participant.eventName}</span>
                {participant.eventDate && (
                  <span className="text-sky-600 font-mono">
                    ({new Date(participant.eventDate + 'T00:00:00').toLocaleDateString('pt-BR')})
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Participant Details */}
          <div className="text-center mb-4 w-full">
            <h4 className="text-xl font-bold text-slate-900 tracking-tight">{participant.name}</h4>
            <div className="flex items-center justify-center gap-1.5 text-sm text-sky-700 font-medium mt-1">
              <Building className="w-4 h-4 text-sky-600 shrink-0" />
              <span>{participant.company}</span>
            </div>
            <div className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 bg-slate-100 rounded-md text-xs font-mono text-slate-700 font-semibold">
              <Hash className="w-3 h-3 text-slate-500" />
              <span>Matrícula: {participant.matricula}</span>
            </div>
          </div>

          {/* QR Code Frame */}
          <div className="p-3 bg-white border-2 border-dashed border-slate-200 rounded-2xl shadow-inner my-2 flex items-center justify-center">
            {qrSrc ? (
              <img
                src={qrSrc}
                alt={`QR Code de ${participant.name}`}
                className="w-56 h-56 object-contain rounded-lg"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400 text-xs animate-pulse">
                Gerando código QR...
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 text-center mt-2 max-w-xs">
            Apresente este código no leitor de celular para confirmar sua presença no evento.
          </p>

          {/* Action Buttons */}
          <div className="w-full mt-6 space-y-2.5">
            {/* Download QR Code button (Primary requested requirement) */}
            <button
              id="btn-modal-download-qr-only"
              onClick={handleDownloadQR}
              disabled={downloading || !qrSrc}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Código QR (PNG)</span>
            </button>

            {/* Extended Badge Download */}
            <button
              id="btn-modal-download-badge"
              onClick={handleDownloadBadge}
              disabled={downloading || !qrSrc}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 font-medium rounded-xl transition-colors text-sm cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-slate-600" />
              <span>Baixar Crachá Completo com Dados</span>
            </button>

            {/* Edit Participant Button */}
            {onEdit && (
              <button
                id="btn-modal-edit-participant"
                onClick={() => {
                  onEdit(participant);
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl border border-slate-200 transition-colors text-xs cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 text-sky-600" />
                <span>Editar Dados do Participante</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
