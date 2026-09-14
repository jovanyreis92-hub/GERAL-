import QRCode from 'qrcode';
import { Participant, QRPayload } from '../types';

/**
 * Creates the standardized payload string stored inside the participant's QR code.
 */
export function buildQRPayload(p: Participant): string {
  const payload: QRPayload = {
    v: 1,
    id: p.id,
    m: p.matricula,
    n: p.name,
    c: p.company,
    e: p.eventName,
    ed: p.eventDate,
  };
  return JSON.stringify(payload);
}

/**
 * Generates a QR Code as a Data URL for instant rendering.
 */
export async function generateQRDataUrl(text: string): Promise<string> {
  return await QRCode.toDataURL(text, {
    width: 320,
    margin: 2,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });
}

/**
 * Creates and downloads a high-resolution, beautifully formatted Credential Badge image
 * containing the participant's Full Name, Matrícula, Company, and QR Code.
 */
export async function downloadParticipantBadge(p: Participant): Promise<void> {
  const canvas = document.createElement('canvas');
  const width = 600;
  const height = 800;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0f172a'); // slate-900
  bgGrad.addColorStop(0.35, '#1e293b'); // slate-800
  bgGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Top header accent line
  const accentGrad = ctx.createLinearGradient(0, 0, width, 0);
  accentGrad.addColorStop(0, '#0284c7'); // sky-600
  accentGrad.addColorStop(0.5, '#06b6d4'); // cyan-500
  accentGrad.addColorStop(1, '#3b82f6'); // blue-500
  ctx.fillStyle = accentGrad;
  ctx.fillRect(0, 0, width, 10);

  // Card inner badge area
  const cardX = 40;
  const cardY = 45;
  const cardW = 520;
  const cardH = 710;
  const radius = 24;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, radius);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 12;
  ctx.fill();
  ctx.restore();

  // Top header inside badge
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, 110, [radius, radius, 0, 0]);
  ctx.fill();

  // Header Title
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CREDENCIAL DO PARTICIPANTE', width / 2, cardY + 44);

  // Event & Date subtitle
  ctx.fillStyle = '#0284c7';
  ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
  const eventSubtitle = p.eventName
    ? `${p.eventName.slice(0, 38)}${p.eventDate ? ` • ${new Date(p.eventDate + 'T00:00:00').toLocaleDateString('pt-BR')}` : ''}`
    : 'CONFIRMAÇÃO DE PRESENÇA VIA QR CODE';
  ctx.fillText(eventSubtitle, width / 2, cardY + 68);

  ctx.fillStyle = '#64748b';
  ctx.font = '500 11px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('CONFIRMAÇÃO DE PRESENÇA VIA QR CODE', width / 2, cardY + 88);

  // Thin separator
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 24, cardY + 104);
  ctx.lineTo(cardX + cardW - 24, cardY + 104);
  ctx.stroke();

  // Participant Name
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';

  // Handle long names
  let displayName = p.name;
  if (displayName.length > 28) {
    displayName = displayName.substring(0, 26) + '...';
  }
  ctx.fillText(displayName, width / 2, cardY + 160);

  // Participant Company
  ctx.fillStyle = '#0284c7';
  ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
  let displayCompany = p.company;
  if (displayCompany.length > 32) {
    displayCompany = displayCompany.substring(0, 30) + '...';
  }
  ctx.fillText(displayCompany, width / 2, cardY + 190);

  // Matricula Pill
  const pillW = 220;
  const pillH = 34;
  const pillX = (width - pillW) / 2;
  const pillY = cardY + 215;

  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, 17);
  ctx.fillStyle = '#f1f5f9';
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#334155';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`MATRÍCULA: ${p.matricula}`, width / 2, pillY + 22);

  // Generate QR image
  const payload = buildQRPayload(p);
  const qrDataUrl = await QRCode.toDataURL(payload, {
    width: 280,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });

  const qrImg = new Image();
  await new Promise((resolve, reject) => {
    qrImg.onload = resolve;
    qrImg.onerror = reject;
    qrImg.src = qrDataUrl;
  });

  // Draw QR code container border
  const qrBoxSize = 290;
  const qrBoxX = (width - qrBoxSize) / 2;
  const qrBoxY = cardY + 270;

  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 16);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.drawImage(qrImg, qrBoxX + 5, qrBoxY + 5, qrBoxSize - 10, qrBoxSize - 10);

  // Footer instructions
  ctx.fillStyle = '#64748b';
  ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Apresente este código na entrada do evento para validar a presença.', width / 2, cardY + 595);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 11px monospace';
  ctx.fillText(`ID: ${p.id}`, width / 2, cardY + 625);

  // Bottom brand note
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('SISTEMA DE CREDENCIAMENTO DIGITAL', width / 2, height - 18);

  // Trigger Download
  const cleanMatricula = p.matricula.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanName = p.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 15);
  const link = document.createElement('a');
  link.download = `QRCode_${cleanMatricula}_${cleanName}.png`;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Direct QR only download (transparent / clean square)
 */
export async function downloadQRCodeOnly(p: Participant): Promise<void> {
  const payload = buildQRPayload(p);
  const qrDataUrl = await QRCode.toDataURL(payload, {
    width: 600,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  const cleanMatricula = p.matricula.replace(/[^a-zA-Z0-9_-]/g, '_');
  const link = document.createElement('a');
  link.download = `QR_Codigo_${cleanMatricula}.png`;
  link.href = qrDataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Plays a pleasant success chime when attendance is confirmed
 */
export function playSuccessSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch {
    // Audio might be blocked by browser policy before user interaction
  }
}
