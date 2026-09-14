import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Participant } from '../types';

/**
 * Exports participants list to an authentic, formatted Excel (.xlsx) workbook
 */
export function exportParticipantsToExcel(
  participants: Participant[],
  eventFilterName?: string,
  eventFilterDate?: string
) {
  if (!participants || participants.length === 0) return;

  const total = participants.length;
  const present = participants.filter((p) => p.checkedIn).length;
  const absent = total - present;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;

  // 1. Data rows formatting
  const rows = participants.map((p, index) => {
    const formattedEventDate = p.eventDate
      ? new Date(p.eventDate + 'T00:00:00').toLocaleDateString('pt-BR')
      : '---';

    return {
      '#': index + 1,
      'Nome Completo': p.name,
      'Matrícula': p.matricula,
      'Empresa / Instituição': p.company,
      'Evento': p.eventName || 'Evento Geral',
      'Data do Evento': formattedEventDate,
      'Data de Cadastro': new Date(p.createdAt).toLocaleString('pt-BR'),
      'Presença': p.checkedIn ? 'PRESENTE' : 'AUSENTE',
      'Horário Check-in': p.checkInTime ? new Date(p.checkInTime).toLocaleString('pt-BR') : '---',
    };
  });

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },  // #
    { wch: 30 }, // Nome
    { wch: 16 }, // Matrícula
    { wch: 25 }, // Empresa
    { wch: 28 }, // Evento
    { wch: 16 }, // Data Evento
    { wch: 20 }, // Cadastro
    { wch: 14 }, // Presença
    { wch: 20 }, // Check-in
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Participantes');

  // Summary sheet
  const summaryData = [
    { Indicador: 'Organização', Valor: 'CheckIn QR Eventos' },
    { Indicador: 'Filtro de Evento', Valor: eventFilterName || 'Todos os Eventos' },
    ...(eventFilterDate ? [{ Indicador: 'Data do Evento', Valor: new Date(eventFilterDate + 'T00:00:00').toLocaleDateString('pt-BR') }] : []),
    { Indicador: 'Total de Participantes', Valor: total },
    { Indicador: 'Presentes (Check-in Realizado)', Valor: present },
    { Indicador: 'Ausentes (Pendente)', Valor: absent },
    { Indicador: 'Taxa de Presença (%)', Valor: `${rate}%` },
    { Indicador: 'Data de Extração', Valor: new Date().toLocaleString('pt-BR') },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 32 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo Geral');

  const today = new Date().toISOString().slice(0, 10);
  const safeTitle = eventFilterName ? `_${eventFilterName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20)}` : '';
  XLSX.writeFile(wb, `participantes${safeTitle}_${today}.xlsx`);
}

/**
 * Exports participants list to a clean, professional PDF report
 */
export function exportParticipantsToPDF(
  participants: Participant[],
  eventFilterName?: string,
  eventFilterDate?: string
) {
  if (!participants || participants.length === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const total = participants.length;
  const present = participants.filter((p) => p.checkedIn).length;
  const absent = total - present;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;
  const dateStr = new Date().toLocaleString('pt-BR');

  // Header banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const mainTitle = eventFilterName ? `Relatório: ${eventFilterName}` : `Relatório Oficial de Participantes`;
  doc.text(mainTitle.slice(0, 52), 14, 12);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  const subTitle = eventFilterDate
    ? `Data do Evento: ${new Date(eventFilterDate + 'T00:00:00').toLocaleDateString('pt-BR')} | Extraído em: ${dateStr}`
    : `Gerado em: ${dateStr} | Credenciamento & Controle de Presença`;
  doc.text(subTitle, 14, 21);

  // Metrics summary boxes
  const startY = 38;

  // Box Total
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, startY, 42, 18, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL DE INSCRITOS', 17, startY + 6);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${total}`, 17, startY + 14);

  // Box Presentes
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(60, startY, 42, 18, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(22, 101, 52);
  doc.text('PRESENTES', 63, startY + 6);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(21, 128, 61);
  doc.text(`${present}`, 63, startY + 14);

  // Box Ausentes
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(253, 230, 138);
  doc.roundedRect(106, startY, 42, 18, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(146, 64, 14);
  doc.text('AUSENTES', 109, startY + 6);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9);
  doc.text(`${absent}`, 109, startY + 14);

  // Box Taxa
  doc.setFillColor(240, 249, 255);
  doc.setDrawColor(186, 230, 253);
  doc.roundedRect(152, startY, 44, 18, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(3, 105, 161);
  doc.text('TAXA DE COMPARECIMENTO', 155, startY + 6);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(2, 132, 199);
  doc.text(`${rate}%`, 155, startY + 14);

  // Table Data
  const tableData = participants.map((p, i) => {
    const eventLabel = p.eventName
      ? `${p.eventName.slice(0, 18)}${p.eventDate ? ` (${new Date(p.eventDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})` : ''}`
      : '---';

    return [
      (i + 1).toString(),
      p.name,
      p.matricula,
      p.company,
      eventLabel,
      p.checkedIn ? 'PRESENTE' : 'AUSENTE',
      p.checkInTime ? new Date(p.checkInTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '---',
    ];
  });

  autoTable(doc, {
    startY: startY + 24,
    head: [['#', 'Nome Completo', 'Matrícula', 'Empresa', 'Evento / Data', 'Status', 'Check-in']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 44 },
      2: { cellWidth: 22 },
      3: { cellWidth: 36 },
      4: { cellWidth: 35 },
      5: { cellWidth: 21, halign: 'center', fontStyle: 'bold' },
      6: { cellWidth: 17, halign: 'center' },
    },
    didParseCell: (hookData) => {
      // Colorize the presence status column in body
      if (hookData.section === 'body' && hookData.column.index === 5) {
        const text = hookData.cell.raw as string;
        if (text === 'PRESENTE') {
          hookData.cell.styles.textColor = [22, 101, 52]; // dark green
          hookData.cell.styles.fillColor = [240, 253, 244]; // light green bg
        } else {
          hookData.cell.styles.textColor = [180, 83, 9]; // dark amber
          hookData.cell.styles.fillColor = [254, 243, 199]; // light amber bg
        }
      }
    },
    styles: {
      cellPadding: 2,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    margin: { left: 14, right: 14, bottom: 18 },
    didDrawPage: (data) => {
      // Footer page numbering
      const pageStr = `Página ${data.pageNumber} de ${doc.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(pageStr, 196, 290, { align: 'right' });
      doc.text('Sistema de Credenciamento & Check-in QR Code', 14, 290);
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const safeTitle = eventFilterName ? `_${eventFilterName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20)}` : '';
  doc.save(`relatorio${safeTitle}_${today}.pdf`);
}
