import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import XLSX from 'xlsx';
import nodemailer from 'nodemailer';

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'participants.json');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const BRANDING_FILE = path.join(DATA_DIR, 'branding.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const AUTOMATION_FILE = path.join(DATA_DIR, 'automation.json');

interface SmtpSettings {
  enabled: boolean;
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
  fromName: string;
  fromEmail: string;
}

interface AutomationSettingsRecord {
  enabled: boolean;
  adminEmail: string;
  adminName: string;
  reportFormat: 'pdf' | 'excel' | 'both';
  sendWeekly: boolean;
  weeklyDay: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  weeklyTime: string; // e.g. "08:00"
  sendOnEventClosed: boolean;
  includeAbsenteesList: boolean;
  lastWeeklyRun: string | null;
  smtp: SmtpSettings;
}

interface ReportLogRecord {
  id: string;
  triggeredAt: string;
  triggerType: 'weekly' | 'event_closed' | 'manual_test';
  recipientEmail: string;
  format: 'pdf' | 'excel' | 'both';
  eventName?: string;
  eventId?: string;
  status: 'sent' | 'simulated' | 'error';
  summary: {
    total: number;
    present: number;
    absent: number;
    rate: string;
  };
  details: string;
}

interface AutomationFileRecord {
  settings: AutomationSettingsRecord;
  logs: ReportLogRecord[];
}

function ensureAutomationFile(): AutomationFileRecord {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(AUTOMATION_FILE)) {
      const defaultData: AutomationFileRecord = {
        settings: {
          enabled: true,
          adminEmail: 'jovany.reis32@gmail.com',
          adminName: 'Administrador do Sistema',
          reportFormat: 'both',
          sendWeekly: true,
          weeklyDay: 'monday',
          weeklyTime: '08:00',
          sendOnEventClosed: true,
          includeAbsenteesList: true,
          lastWeeklyRun: null,
          smtp: {
            enabled: false,
            host: '',
            port: 587,
            user: '',
            pass: '',
            secure: false,
            fromName: 'CheckIn QR Eventos',
            fromEmail: 'noreply@checkin-qr.com',
          },
        },
        logs: [
          {
            id: 'log-init-1',
            triggeredAt: new Date(Date.now() - 3600000 * 20).toISOString(),
            triggerType: 'weekly',
            recipientEmail: 'jovany.reis32@gmail.com',
            format: 'both',
            status: 'simulated',
            summary: {
              total: 2,
              present: 1,
              absent: 1,
              rate: '50.0%',
            },
            details: 'Relatório semanal inicial consolidado gerado e registrado no sistema para o administrador.',
          },
        ],
      };
      fs.writeFileSync(AUTOMATION_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
      return defaultData;
    }
    const raw = fs.readFileSync(AUTOMATION_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro ao ler automação:', err);
    return {
      settings: {
        enabled: true,
        adminEmail: 'jovany.reis32@gmail.com',
        adminName: 'Administrador',
        reportFormat: 'both',
        sendWeekly: true,
        weeklyDay: 'monday',
        weeklyTime: '08:00',
        sendOnEventClosed: true,
        includeAbsenteesList: true,
        lastWeeklyRun: null,
        smtp: {
          enabled: false,
          host: '',
          port: 587,
          user: '',
          pass: '',
          secure: false,
          fromName: 'CheckIn QR',
          fromEmail: '',
        },
      },
      logs: [],
    };
  }
}

function saveAutomationFile(data: AutomationFileRecord): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(AUTOMATION_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erro ao salvar automação:', err);
  }
}

interface BrandingRecord {
  companyName: string;
  companyLogo: string;
  updatedAt: string;
}

interface SettingsRecord {
  adminLogin: string;
  adminPassword: string;
}

function ensureBrandingFile(): BrandingRecord {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(BRANDING_FILE)) {
      const defaultBranding: BrandingRecord = {
        companyName: '',
        companyLogo: '',
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(BRANDING_FILE, JSON.stringify(defaultBranding, null, 2), 'utf-8');
      return defaultBranding;
    }
    const raw = fs.readFileSync(BRANDING_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { companyName: '', companyLogo: '', updatedAt: new Date().toISOString() };
  }
}

function saveBrandingFile(data: BrandingRecord): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(BRANDING_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erro ao salvar branding:', err);
  }
}

function ensureSettingsFile(): SettingsRecord {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(SETTINGS_FILE)) {
      const defaultSettings: SettingsRecord = {
        adminLogin: 'admin',
        adminPassword: '123', // default 1234
      };
      // Standard default is 1234
      defaultSettings.adminPassword = '1234';
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2), 'utf-8');
      return defaultSettings;
    }
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { adminLogin: 'admin', adminPassword: '1234' };
  }
}

function saveSettingsFile(data: SettingsRecord): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erro ao salvar configurações:', err);
  }
}

interface EventRecord {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  endDate?: string | null;
  time?: string | null;
  location?: string;
  description?: string;
  createdAt: string;
  status?: 'active' | 'closed';
  closedAt?: string | null;
}

interface ParticipantRecord {
  id: string;
  name: string;
  matricula: string;
  company: string;
  createdAt: string;
  checkedIn: boolean;
  checkInTime: string | null;
  eventId?: string;
  eventName?: string;
  eventDate?: string;
}

function ensureEventsFile(): EventRecord[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(EVENTS_FILE)) {
      const today = new Date().toISOString().slice(0, 10);
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

      const initialEvents: EventRecord[] = [
        {
          id: 'evt-101',
          name: 'Seminário de Inovação & Tecnologia 2026',
          date: today,
          endDate: today,
          time: '09:00',
          location: 'Auditório Principal - Edifício Sede',
          description: 'Apresentação de novas tecnologias, inteligência artificial e processos digitais.',
          createdAt: new Date().toISOString(),
          status: 'active',
          closedAt: null,
        },
        {
          id: 'evt-102',
          name: 'Convenção Anual de Segurança & Meio Ambiente',
          date: tomorrow,
          endDate: tomorrow,
          time: '14:00',
          location: 'Centro de Convenções Empresariais',
          description: 'Treinamento de conformidade regulatória, ESG e boas práticas de prevenção.',
          createdAt: new Date().toISOString(),
          status: 'active',
          closedAt: null,
        },
        {
          id: 'evt-103',
          name: 'Workshop de Capacitação de Líderes',
          date: nextWeek,
          endDate: nextWeek,
          time: '10:30',
          location: 'Espaço Conectar - Sala 04',
          description: 'Desenvolvimento interpessoal, feedback produtivo e alinhamento estratégico.',
          createdAt: new Date().toISOString(),
          status: 'active',
          closedAt: null,
        },
      ];
      fs.writeFileSync(EVENTS_FILE, JSON.stringify(initialEvents, null, 2), 'utf-8');
      return initialEvents;
    }
    const raw = fs.readFileSync(EVENTS_FILE, 'utf-8');
    const events: EventRecord[] = JSON.parse(raw);
    let needsSave = false;
    for (const evt of events) {
      if (!evt.status) {
        evt.status = 'active';
        evt.closedAt = null;
        needsSave = true;
      }
    }
    if (needsSave) {
      fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf-8');
    }
    return events;
  } catch (err) {
    console.error('Error reading events data:', err);
    return [];
  }
}

function saveEvents(data: EventRecord[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving events data:', err);
  }
}

function ensureDataFile(): ParticipantRecord[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const events = ensureEventsFile();
    const defaultEvent = events[0] || {
      id: 'evt-101',
      name: 'Seminário de Inovação & Tecnologia 2026',
      date: new Date().toISOString().slice(0, 10),
    };

    if (!fs.existsSync(DATA_FILE)) {
      const initial: ParticipantRecord[] = [
        {
          id: 'part-1001',
          name: 'Mariana Souza Alcantara',
          matricula: '2024-8841',
          company: 'TechNova Soluções',
          createdAt: new Date().toISOString(),
          checkedIn: false,
          checkInTime: null,
          eventId: defaultEvent.id,
          eventName: defaultEvent.name,
          eventDate: defaultEvent.date,
        },
        {
          id: 'part-1002',
          name: 'Carlos Eduardo Lima',
          matricula: '2024-9120',
          company: 'Construtora Horizonte',
          createdAt: new Date().toISOString(),
          checkedIn: true,
          checkInTime: new Date().toISOString(),
          eventId: defaultEvent.id,
          eventName: defaultEvent.name,
          eventDate: defaultEvent.date,
        },
      ];
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const participants: ParticipantRecord[] = JSON.parse(raw);

    // Ensure backwards compatibility with participants without eventId
    let updated = false;
    for (const p of participants) {
      if (!p.eventId) {
        p.eventId = defaultEvent.id;
        p.eventName = defaultEvent.name;
        p.eventDate = defaultEvent.date;
        updated = true;
      }
    }
    if (updated) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(participants, null, 2), 'utf-8');
    }

    return participants;
  } catch (err) {
    console.error('Error reading participants data:', err);
    return [];
  }
}

function saveParticipants(data: ParticipantRecord[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving participants data:', err);
  }
}

async function runAutomatedReport(params: {
  triggerType: 'weekly' | 'event_closed' | 'manual_test';
  event?: EventRecord;
}): Promise<ReportLogRecord> {
  const autoData = ensureAutomationFile();
  const allParticipants = ensureDataFile();

  const targetEvent = params.event;
  const filteredParticipants = targetEvent
    ? allParticipants.filter((p) => p.eventId === targetEvent.id)
    : allParticipants;

  const total = filteredParticipants.length;
  const present = filteredParticipants.filter((p) => p.checkedIn).length;
  const absent = total - present;
  const rate = total > 0 ? `${((present / total) * 100).toFixed(1)}%` : '0.0%';

  const eventTitle = targetEvent ? targetEvent.name : 'Consolidado Geral (Todos os Eventos)';
  const recipient = autoData.settings.adminEmail || 'admin@sistema.com';
  const format = autoData.settings.reportFormat || 'both';

  // Build Excel Workbook
  let excelBuffer: Buffer | null = null;
  try {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Resumo
    const summaryData = [
      {
        Campo: 'Relatório',
        Valor: `CheckIn QR - Relatório ${
          params.triggerType === 'weekly'
            ? 'Semanal'
            : params.triggerType === 'event_closed'
            ? 'de Encerramento de Evento'
            : 'Manual de Teste'
        }`,
      },
      { Campo: 'Evento', Valor: eventTitle },
      { Campo: 'Data do Disparo', Valor: new Date().toLocaleString('pt-BR') },
      { Campo: 'Destinatário', Valor: recipient },
      { Campo: 'Total de Inscritos', Valor: total },
      { Campo: 'Presenças Confirmadas', Valor: present },
      { Campo: 'Ausentes / Pendentes', Valor: absent },
      { Campo: 'Taxa de Comparecimento', Valor: rate },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');

    // Sheet 2: Participantes
    const participantsData = filteredParticipants.map((p, index) => ({
      N: index + 1,
      Nome: p.name,
      Matrícula: p.matricula,
      Empresa: p.company,
      Evento: p.eventName || eventTitle,
      'Data do Evento': p.eventDate || '-',
      Status: p.checkedIn ? 'PRESENTE' : 'AUSENTE',
      'Horário de Entrada': p.checkInTime ? new Date(p.checkInTime).toLocaleString('pt-BR') : '-',
    }));
    const wsParticipants = XLSX.utils.json_to_sheet(participantsData);
    XLSX.utils.book_append_sheet(wb, wsParticipants, 'Participantes');

    excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  } catch (err) {
    console.error('Erro ao gerar Excel para automação:', err);
  }

  let status: 'sent' | 'simulated' | 'error' = 'simulated';
  let details = '';

  // Check if SMTP is configured
  if (
    autoData.settings.smtp?.enabled &&
    autoData.settings.smtp.host &&
    autoData.settings.smtp.user
  ) {
    try {
      const transporter = nodemailer.createTransport({
        host: autoData.settings.smtp.host,
        port: autoData.settings.smtp.port || 587,
        secure: autoData.settings.smtp.secure || false,
        auth: {
          user: autoData.settings.smtp.user,
          pass: autoData.settings.smtp.pass,
        },
      });

      const triggerLabel =
        params.triggerType === 'weekly'
          ? 'Semanal'
          : params.triggerType === 'event_closed'
          ? 'Encerramento de Evento'
          : 'Teste Manual';

      const subject = `[CheckIn QR • Relatório ${triggerLabel}] ${eventTitle} (${rate} Presença)`;

      const html = `
        <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #0284c7; margin-top: 0;">Relatório Automatizado de Presença</h2>
          <p>Olá <strong>${autoData.settings.adminName || 'Administrador'}</strong>,</p>
          <p>Este é o relatório de credenciamento e presença gerado automaticamente pelo sistema <strong>CheckIn QR</strong>.</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Evento:</strong> ${eventTitle}</p>
            <p style="margin: 4px 0;"><strong>Tipo de Gatilho:</strong> ${triggerLabel}</p>
            <p style="margin: 4px 0;"><strong>Total de Participantes:</strong> ${total}</p>
            <p style="margin: 4px 0; color: #059669;"><strong>Presenças Confirmadas:</strong> ${present}</p>
            <p style="margin: 4px 0; color: #d97706;"><strong>Ausentes / Pendentes:</strong> ${absent}</p>
            <p style="margin: 4px 0; color: #0284c7; font-size: 16px;"><strong>Taxa de Presença:</strong> <strong>${rate}</strong></p>
          </div>

          <p>O arquivo consolidado com a lista nominal completa de participantes e horários de entrada foi gerado no formato <strong>${format.toUpperCase()}</strong> e segue anexo.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #64748b;">Enviado automaticamente por CheckIn QR • Sistema de Gestão de Eventos</p>
        </div>
      `;

      const attachments: any[] = [];
      if (excelBuffer) {
        attachments.push({
          filename: `Relatorio_Presenca_${Date.now()}.xlsx`,
          content: excelBuffer,
        });
      }

      await transporter.sendMail({
        from: `"${autoData.settings.smtp.fromName || 'CheckIn QR'}" <${autoData.settings.smtp.fromEmail || autoData.settings.smtp.user}>`,
        to: recipient,
        subject,
        html,
        attachments,
      });

      status = 'sent';
      details = `E-mail com relatório em formato ${format.toUpperCase()} enviado com sucesso para ${recipient} via SMTP (${autoData.settings.smtp.host}).`;
    } catch (err: any) {
      console.error('Falha ao enviar e-mail via SMTP:', err);
      status = 'simulated';
      details = `Tentativa de envio SMTP falhou (${err.message}). Relatório registrado e preservado no sistema para ${recipient}.`;
    }
  } else {
    status = 'simulated';
    details = `Relatório em formato ${format.toUpperCase()} gerado com sucesso para ${recipient}. Disparo automatizado arquivado no histórico de relatórios.`;
  }

  const logItem: ReportLogRecord = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    triggeredAt: new Date().toISOString(),
    triggerType: params.triggerType,
    recipientEmail: recipient,
    format,
    eventName: targetEvent?.name,
    eventId: targetEvent?.id,
    status,
    summary: {
      total,
      present,
      absent,
      rate,
    },
    details,
  };

  autoData.logs.unshift(logItem);
  if (autoData.logs.length > 50) {
    autoData.logs = autoData.logs.slice(0, 50);
  }
  saveAutomationFile(autoData);

  return logItem;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // API Routes
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Check admin password
  app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    const settings = ensureSettingsFile();

    const inputUser = username ? String(username).trim().toLowerCase() : 'admin';
    const inputPass = password ? String(password).trim() : '';

    const expectedUser = (settings.adminLogin || 'admin').toLowerCase();
    const expectedPass = settings.adminPassword || '1234';

    if (
      (inputUser === expectedUser || inputUser === 'administrador') &&
      inputPass === expectedPass
    ) {
      return res.json({ success: true, message: 'Autenticado com sucesso' });
    }
    return res.status(401).json({ success: false, message: 'Credenciais inválidas. Acesso negado.' });
  });

  // Change admin password
  app.post('/api/admin/change-password', (req, res) => {
    const { currentPassword, newPassword, newUsername } = req.body;
    const settings = ensureSettingsFile();

    const expectedPass = settings.adminPassword || '1234';
    if (currentPassword !== expectedPass) {
      return res.status(401).json({ error: 'Senha atual incorreta.' });
    }

    if (!newPassword || String(newPassword).trim().length < 3) {
      return res.status(400).json({ error: 'A nova senha deve ter no mínimo 3 caracteres.' });
    }

    settings.adminPassword = String(newPassword).trim();
    if (newUsername && String(newUsername).trim()) {
      settings.adminLogin = String(newUsername).trim();
    }

    saveSettingsFile(settings);
    return res.json({ success: true, message: 'Senha administrativa alterada com sucesso.' });
  });

  // --- Company Branding API ---
  app.get('/api/branding', (_req, res) => {
    const branding = ensureBrandingFile();
    res.json(branding);
  });

  app.post('/api/branding', (req, res) => {
    const { companyName, companyLogo } = req.body;
    const current = ensureBrandingFile();

    const updated: BrandingRecord = {
      companyName: typeof companyName === 'string' ? companyName.trim() : current.companyName,
      companyLogo: typeof companyLogo === 'string' ? companyLogo.trim() : current.companyLogo,
      updatedAt: new Date().toISOString(),
    };

    saveBrandingFile(updated);
    res.json({ success: true, branding: updated });
  });

  // --- Events API ---
  // Get all events sorted by date
  app.get('/api/events', (_req, res) => {
    const list = ensureEventsFile();
    // Sort descending (newest dates first) or by date
    list.sort((a, b) => (a.date < b.date ? 1 : -1));
    res.json(list);
  });

  // Create event by date
  app.post('/api/events', (req, res) => {
    const { name, date, endDate, time, location, description } = req.body;

    if (!name || !date) {
      return res.status(400).json({ error: 'Nome do evento e data são obrigatórios.' });
    }

    const trimmedName = String(name).trim();
    const trimmedDate = String(date).trim();

    if (!trimmedName || !trimmedDate) {
      return res.status(400).json({ error: 'Nome do evento e data válida são obrigatórios.' });
    }

    const events = ensureEventsFile();

    const newEvent: EventRecord = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: trimmedName,
      date: trimmedDate,
      endDate: endDate ? String(endDate).trim() : trimmedDate,
      time: time ? String(time).trim() : null,
      location: location ? String(location).trim() : '',
      description: description ? String(description).trim() : '',
      createdAt: new Date().toISOString(),
    };

    events.unshift(newEvent);
    saveEvents(events);

    return res.status(201).json(newEvent);
  });

  // Update event
  app.put('/api/events/:id', (req, res) => {
    const { id } = req.params;
    const { name, date, endDate, time, location, description } = req.body;

    const events = ensureEventsFile();
    const eventIndex = events.findIndex((e) => e.id === id);

    if (eventIndex === -1) {
      return res.status(404).json({ error: 'Evento não encontrado.' });
    }

    const updatedEvent: EventRecord = {
      ...events[eventIndex],
      name: name ? String(name).trim() : events[eventIndex].name,
      date: date ? String(date).trim() : events[eventIndex].date,
      endDate: endDate !== undefined ? (endDate ? String(endDate).trim() : null) : events[eventIndex].endDate,
      time: time !== undefined ? (time ? String(time).trim() : null) : events[eventIndex].time,
      location: location !== undefined ? String(location).trim() : events[eventIndex].location,
      description: description !== undefined ? String(description).trim() : events[eventIndex].description,
    };

    events[eventIndex] = updatedEvent;
    saveEvents(events);

    // Also cascade update participant event name/date if changed
    const participants = ensureDataFile();
    let pUpdated = false;
    for (const p of participants) {
      if (p.eventId === id) {
        p.eventName = updatedEvent.name;
        p.eventDate = updatedEvent.date;
        pUpdated = true;
      }
    }
    if (pUpdated) {
      saveParticipants(participants);
    }

    return res.json(updatedEvent);
  });

  // Delete event
  app.delete('/api/events/:id', (req, res) => {
    const { id } = req.params;
    const events = ensureEventsFile();

    if (events.length <= 1) {
      return res.status(400).json({ error: 'Não é possível excluir o único evento cadastrado.' });
    }

    const index = events.findIndex((e) => e.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Evento não encontrado.' });
    }

    const removed = events.splice(index, 1)[0];
    saveEvents(events);

    // Reassign participants to fallback event or unbind
    const fallbackEvent = events[0];
    const participants = ensureDataFile();
    let pUpdated = false;
    for (const p of participants) {
      if (p.eventId === id) {
        p.eventId = fallbackEvent.id;
        p.eventName = fallbackEvent.name;
        p.eventDate = fallbackEvent.date;
        pUpdated = true;
      }
    }
    if (pUpdated) {
      saveParticipants(participants);
    }

    return res.json({ success: true, removed, fallbackEventId: fallbackEvent.id });
  });

  // Close event and optionally trigger automated report
  app.post('/api/events/:id/close', async (req, res) => {
    const { id } = req.params;
    const events = ensureEventsFile();
    const event = events.find((e) => e.id === id);

    if (!event) {
      return res.status(404).json({ error: 'Evento não encontrado.' });
    }

    event.status = 'closed';
    event.closedAt = new Date().toISOString();
    saveEvents(events);

    let automationTriggered = false;
    let triggerResult: ReportLogRecord | null = null;

    const autoData = ensureAutomationFile();
    if (autoData.settings.enabled && autoData.settings.sendOnEventClosed) {
      try {
        triggerResult = await runAutomatedReport({
          triggerType: 'event_closed',
          event,
        });
        automationTriggered = true;
      } catch (err) {
        console.error('Erro ao disparar automação ao encerrar evento:', err);
      }
    }

    return res.json({
      success: true,
      event,
      automationTriggered,
      triggerResult,
      message: `Evento "${event.name}" encerrado com sucesso.${
        automationTriggered ? ' Relatório gerado e enviado/registrado para o administrador.' : ''
      }`,
    });
  });

  // Reopen event
  app.post('/api/events/:id/reopen', (req, res) => {
    const { id } = req.params;
    const events = ensureEventsFile();
    const event = events.find((e) => e.id === id);

    if (!event) {
      return res.status(404).json({ error: 'Evento não encontrado.' });
    }

    event.status = 'active';
    event.closedAt = null;
    saveEvents(events);

    return res.json({
      success: true,
      event,
      message: `Evento "${event.name}" reaberto com sucesso.`,
    });
  });

  // --- Automation API ---
  app.get('/api/automation', (_req, res) => {
    const data = ensureAutomationFile();
    res.json(data);
  });

  app.post('/api/automation/settings', (req, res) => {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Configurações inválidas.' });
    }

    const current = ensureAutomationFile();
    current.settings = {
      ...current.settings,
      ...settings,
    };
    saveAutomationFile(current);
    return res.json({ success: true, settings: current.settings });
  });

  app.post('/api/automation/trigger-test', async (req, res) => {
    const { eventId } = req.body;
    const events = ensureEventsFile();
    const targetEvent =
      eventId && typeof eventId === 'string' && eventId !== 'all'
        ? events.find((e) => e.id === eventId)
        : undefined;

    try {
      const log = await runAutomatedReport({
        triggerType: 'manual_test',
        event: targetEvent,
      });
      return res.json({ success: true, log });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Falha ao executar teste de envio.' });
    }
  });

  app.post('/api/automation/clear-logs', (_req, res) => {
    const current = ensureAutomationFile();
    current.logs = [];
    saveAutomationFile(current);
    return res.json({ success: true, logs: [] });
  });

  app.get('/api/automation/download-report', (req, res) => {
    const { eventId } = req.query;
    const allParticipants = ensureDataFile();
    const allEvents = ensureEventsFile();
    const targetEvent =
      eventId && typeof eventId === 'string' && eventId !== 'all'
        ? allEvents.find((e) => e.id === eventId)
        : undefined;

    const filtered = targetEvent
      ? allParticipants.filter((p) => p.eventId === targetEvent.id)
      : allParticipants;

    const eventName = targetEvent ? targetEvent.name : 'Geral (Todos os Eventos)';
    const total = filtered.length;
    const present = filtered.filter((p) => p.checkedIn).length;
    const absent = total - present;
    const rate = total > 0 ? `${((present / total) * 100).toFixed(1)}%` : '0.0%';

    const wb = XLSX.utils.book_new();
    const summaryData = [
      { Indicador: 'Relatório', Valor: 'CheckIn QR - Relatório de Presença' },
      { Indicador: 'Evento', Valor: eventName },
      { Indicador: 'Data de Emissão', Valor: new Date().toLocaleString('pt-BR') },
      { Indicador: 'Total de Inscritos', Valor: total },
      { Indicador: 'Presenças Confirmadas', Valor: present },
      { Indicador: 'Ausentes / Pendentes', Valor: absent },
      { Indicador: 'Taxa de Comparecimento', Valor: rate },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');

    const pData = filtered.map((p, idx) => ({
      'Nº': idx + 1,
      Nome: p.name,
      Matrícula: p.matricula,
      Empresa: p.company,
      Evento: p.eventName || eventName,
      'Data do Evento': p.eventDate || '-',
      Presença: p.checkedIn ? 'PRESENTE' : 'AUSENTE',
      'Horário de Entrada': p.checkInTime ? new Date(p.checkInTime).toLocaleString('pt-BR') : '-',
    }));
    const wsParts = XLSX.utils.json_to_sheet(pData);
    XLSX.utils.book_append_sheet(wb, wsParts, 'Participantes');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const safeName = (targetEvent ? targetEvent.name : 'geral')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_');

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="relatorio_${safeName}_${Date.now()}.xlsx"`
    );
    return res.send(buf);
  });

  // --- Participants API ---
  // Get all participants
  app.get('/api/participants', (req, res) => {
    const { eventId } = req.query;
    const list = ensureDataFile();
    if (eventId && typeof eventId === 'string' && eventId !== 'all') {
      return res.json(list.filter((p) => p.eventId === eventId));
    }
    res.json(list);
  });

  // Register participant
  app.post('/api/participants', (req, res) => {
    const { name, matricula, company, eventId } = req.body;

    if (!name || !matricula || !company) {
      return res.status(400).json({ error: 'Nome, matrícula e empresa são obrigatórios.' });
    }

    const trimmedName = String(name).trim();
    const trimmedMatricula = String(matricula).trim();
    const trimmedCompany = String(company).trim();

    const list = ensureDataFile();
    const events = ensureEventsFile();

    // Resolve event
    let targetEvent = events.find((e) => e.id === eventId);
    if (!targetEvent && events.length > 0) {
      targetEvent = events[0];
    }

    // Check if matricula already exists for this event or globally
    const existing = list.find(
      (p) =>
        p.matricula.toLowerCase() === trimmedMatricula.toLowerCase() &&
        (!targetEvent || !p.eventId || p.eventId === targetEvent.id)
    );
    if (existing) {
      return res.status(409).json({
        error: `A matrícula "${trimmedMatricula}" já está cadastrada para ${existing.name}${existing.eventName ? ` no evento ${existing.eventName}` : ''}.`,
        participant: existing,
      });
    }

    const newParticipant: ParticipantRecord = {
      id: `part-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: trimmedName,
      matricula: trimmedMatricula,
      company: trimmedCompany,
      createdAt: new Date().toISOString(),
      checkedIn: false,
      checkInTime: null,
      eventId: targetEvent ? targetEvent.id : undefined,
      eventName: targetEvent ? targetEvent.name : undefined,
      eventDate: targetEvent ? targetEvent.date : undefined,
    };

    list.unshift(newParticipant);
    saveParticipants(list);

    return res.status(201).json(newParticipant);
  });

  // Update / Edit participant
  app.put('/api/participants/:id', (req, res) => {
    const { id } = req.params;
    const { name, matricula, company, eventId, checkedIn } = req.body;
    const list = ensureDataFile();
    const index = list.findIndex((p) => p.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Participante não encontrado.' });
    }

    const current = list[index];
    const trimmedName = name !== undefined ? String(name).trim() : current.name;
    const trimmedMatricula = matricula !== undefined ? String(matricula).trim() : current.matricula;
    const trimmedCompany = company !== undefined ? String(company).trim() : current.company;

    if (!trimmedName || !trimmedMatricula || !trimmedCompany) {
      return res.status(400).json({ error: 'Nome, matrícula e empresa não podem estar vazios.' });
    }

    // Check duplicate matricula with another participant
    const duplicate = list.find(
      (p) => p.id !== id && p.matricula.toLowerCase() === trimmedMatricula.toLowerCase()
    );
    if (duplicate) {
      return res.status(400).json({
        error: `A matrícula "${trimmedMatricula}" já pertence ao participante "${duplicate.name}".`,
      });
    }

    current.name = trimmedName;
    current.matricula = trimmedMatricula;
    current.company = trimmedCompany;

    // Update event if specified
    if (eventId !== undefined) {
      const events = ensureEventsFile();
      const targetEvent = events.find((e) => e.id === eventId) || events[0];
      if (targetEvent) {
        current.eventId = targetEvent.id;
        current.eventName = targetEvent.name;
        current.eventDate = targetEvent.date;
      }
    }

    // Update presence if explicitly provided
    if (checkedIn !== undefined) {
      const newCheckedIn = Boolean(checkedIn);
      current.checkedIn = newCheckedIn;
      if (newCheckedIn && !current.checkInTime) {
        current.checkInTime = new Date().toISOString();
      } else if (!newCheckedIn) {
        current.checkInTime = null;
      }
    }

    list[index] = current;
    saveParticipants(list);

    return res.json(current);
  });

  // Delete participant
  app.delete('/api/participants/:id', (req, res) => {
    const { id } = req.params;
    const list = ensureDataFile();
    const index = list.findIndex((p) => p.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Participante não encontrado.' });
    }

    const removed = list.splice(index, 1)[0];
    saveParticipants(list);

    return res.json({ success: true, removed });
  });

  // Bulk delete participants
  app.post('/api/participants/bulk-delete', (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Nenhum ID fornecido para exclusão.' });
    }

    const idsSet = new Set(ids);
    const list = ensureDataFile();
    const remaining = list.filter((p) => !idsSet.has(p.id));
    const deletedCount = list.length - remaining.length;

    saveParticipants(remaining);

    return res.json({
      success: true,
      deletedCount,
      remainingCount: remaining.length,
    });
  });

  // Check-in participant by ID or toggle
  app.post('/api/participants/:id/checkin', (req, res) => {
    const { id } = req.params;
    const { forceState } = req.body; // optional boolean to explicitly set or toggle
    const list = ensureDataFile();
    const participant = list.find((p) => p.id === id);

    if (!participant) {
      return res.status(404).json({ error: 'Participante não encontrado.' });
    }

    if (typeof forceState === 'boolean') {
      participant.checkedIn = forceState;
      participant.checkInTime = forceState ? new Date().toISOString() : null;
    } else {
      participant.checkedIn = !participant.checkedIn;
      participant.checkInTime = participant.checkedIn ? new Date().toISOString() : null;
    }

    saveParticipants(list);
    return res.json({ success: true, participant });
  });

  // QR Scan check-in (handles payload string, id, or matricula)
  app.post('/api/checkin/scan', (req, res) => {
    const { rawCode } = req.body;
    if (!rawCode || typeof rawCode !== 'string') {
      return res.status(400).json({ error: 'Código QR inválido ou vazio.' });
    }

    const cleanInput = rawCode.trim();
    let targetId: string | null = null;
    let targetMatricula: string | null = null;

    // 1. Check if it's our JSON format
    try {
      const parsed = JSON.parse(cleanInput);
      if (parsed.id) targetId = parsed.id;
      if (parsed.m) targetMatricula = parsed.m;
      if (parsed.matricula) targetMatricula = parsed.matricula;
    } catch {
      // Not JSON, check if it's a URL or direct ID/matricula
    }

    // 2. Check if it's an ID or matricula directly
    if (!targetId && !targetMatricula) {
      if (cleanInput.startsWith('part-')) {
        targetId = cleanInput;
      } else {
        targetMatricula = cleanInput;
      }
    }

    const list = ensureDataFile();
    const participant = list.find(
      (p) =>
        (targetId && p.id === targetId) ||
        (targetMatricula && p.matricula.toLowerCase() === targetMatricula.toLowerCase()) ||
        p.id === cleanInput ||
        p.matricula.toLowerCase() === cleanInput.toLowerCase()
    );

    if (!participant) {
      return res.status(404).json({
        error: 'Nenhum participante encontrado para este código QR.',
        scannedCode: cleanInput,
      });
    }

    const alreadyCheckedIn = participant.checkedIn;
    participant.checkedIn = true;
    if (!participant.checkInTime) {
      participant.checkInTime = new Date().toISOString();
    }

    saveParticipants(list);

    return res.json({
      success: true,
      alreadyCheckedIn,
      participant,
      message: alreadyCheckedIn
        ? `Presença de ${participant.name} já havia sido confirmada anteriormente!`
        : `Presença confirmada com sucesso para ${participant.name}!`,
    });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });

  // Automated background scheduler for weekly reports
  setInterval(async () => {
    try {
      const autoData = ensureAutomationFile();
      const { enabled, sendWeekly, weeklyDay, weeklyTime, lastWeeklyRun } = autoData.settings;
      if (!enabled || !sendWeekly) return;

      const now = new Date();
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDay = days[now.getDay()];

      if (currentDay !== weeklyDay) return;

      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;

      if (currentTimeStr === weeklyTime) {
        const todayStr = now.toISOString().slice(0, 10);
        if (lastWeeklyRun === todayStr) {
          return;
        }
        autoData.settings.lastWeeklyRun = todayStr;
        saveAutomationFile(autoData);

        console.log(`[Automação] Executando envio semanal programado de relatório para ${autoData.settings.adminEmail}...`);
        await runAutomatedReport({
          triggerType: 'weekly',
        });
      }
    } catch (schedErr) {
      console.error('[Automação] Erro no agendamento semanal:', schedErr);
    }
  }, 40000);
}

startServer();
