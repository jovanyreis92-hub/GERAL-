import {
  Participant,
  EventItem,
  CompanyBranding,
  AutomationSettings,
  AutomationData,
  ReportLogItem,
} from '../types';

const STORAGE_KEY = 'qr_event_participants_backup';
const EVENTS_STORAGE_KEY = 'qr_events_backup';
const BRANDING_STORAGE_KEY = 'qr_company_branding_backup';
const ADMIN_PASS_STORAGE_KEY = 'qr_admin_password_backup';
const AUTOMATION_STORAGE_KEY = 'qr_automation_backup';

function getLocalBrandingBackup(): CompanyBranding {
  try {
    const raw = localStorage.getItem(BRANDING_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { companyName: '', companyLogo: '' };
  } catch {
    return { companyName: '', companyLogo: '' };
  }
}

function saveLocalBrandingBackup(data: CompanyBranding): void {
  try {
    localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore
  }
}

function getLocalAdminPassword(): string {
  try {
    return localStorage.getItem(ADMIN_PASS_STORAGE_KEY) || '1234';
  } catch {
    return '1234';
  }
}

function saveLocalAdminPassword(pass: string): void {
  try {
    localStorage.setItem(ADMIN_PASS_STORAGE_KEY, pass);
  } catch {
    // Ignore
  }
}

function getLocalBackup(): Participant[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalBackup(data: Participant[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
}

function getLocalEventsBackup(): EventItem[] {
  try {
    const raw = localStorage.getItem(EVENTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalEventsBackup(data: EventItem[]): void {
  try {
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore
  }
}

export async function fetchEvents(): Promise<EventItem[]> {
  try {
    const res = await fetch('/api/events');
    if (!res.ok) throw new Error('Falha ao buscar eventos');
    const data: EventItem[] = await res.json();
    saveLocalEventsBackup(data);
    return data;
  } catch (err) {
    console.warn('Usando backup local de eventos:', err);
    return getLocalEventsBackup();
  }
}

export async function createEvent(payload: {
  name: string;
  date: string;
  endDate?: string | null;
  time?: string | null;
  location?: string;
  description?: string;
}): Promise<EventItem> {
  try {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Erro ao criar evento');
    }
    const current = getLocalEventsBackup();
    saveLocalEventsBackup([data, ...current.filter((e) => e.id !== data.id)]);
    return data;
  } catch (err: any) {
    if (err.message) throw err;
    // Offline fallback
    const offlineEvent: EventItem = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: payload.name.trim(),
      date: payload.date.trim(),
      endDate: payload.endDate || payload.date.trim(),
      time: payload.time || null,
      location: payload.location || '',
      description: payload.description || '',
      createdAt: new Date().toISOString(),
    };
    const current = getLocalEventsBackup();
    saveLocalEventsBackup([offlineEvent, ...current]);
    return offlineEvent;
  }
}

export async function updateEvent(
  id: string,
  payload: Partial<EventItem>
): Promise<EventItem> {
  const res = await fetch(`/api/events/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao atualizar evento');
  }
  const current = getLocalEventsBackup();
  saveLocalEventsBackup(current.map((e) => (e.id === id ? data : e)));
  return data;
}

export async function deleteEvent(id: string): Promise<boolean> {
  const res = await fetch(`/api/events/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao excluir evento');
  }
  const current = getLocalEventsBackup();
  saveLocalEventsBackup(current.filter((e) => e.id !== id));
  return true;
}

export async function closeEvent(id: string): Promise<{
  success: boolean;
  event: EventItem;
  automationTriggered: boolean;
  triggerResult?: ReportLogItem;
  message?: string;
}> {
  try {
    const res = await fetch(`/api/events/${encodeURIComponent(id)}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Erro ao encerrar evento');
    }
    const current = getLocalEventsBackup();
    saveLocalEventsBackup(current.map((e) => (e.id === id ? data.event : e)));
    return data;
  } catch (err: any) {
    // Local fallback
    const current = getLocalEventsBackup();
    const target = current.find((e) => e.id === id);
    if (!target) throw err;
    target.status = 'closed';
    target.closedAt = new Date().toISOString();
    saveLocalEventsBackup([...current]);
    return {
      success: true,
      event: target,
      automationTriggered: false,
      message: `Evento "${target.name}" encerrado localmente.`,
    };
  }
}

export async function reopenEvent(id: string): Promise<{
  success: boolean;
  event: EventItem;
  message?: string;
}> {
  try {
    const res = await fetch(`/api/events/${encodeURIComponent(id)}/reopen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Erro ao reabrir evento');
    }
    const current = getLocalEventsBackup();
    saveLocalEventsBackup(current.map((e) => (e.id === id ? data.event : e)));
    return data;
  } catch (err: any) {
    const current = getLocalEventsBackup();
    const target = current.find((e) => e.id === id);
    if (!target) throw err;
    target.status = 'active';
    target.closedAt = null;
    saveLocalEventsBackup([...current]);
    return {
      success: true,
      event: target,
      message: `Evento "${target.name}" reaberto localmente.`,
    };
  }
}

export async function fetchParticipants(eventId?: string): Promise<Participant[]> {
  try {
    const url = eventId && eventId !== 'all' ? `/api/participants?eventId=${encodeURIComponent(eventId)}` : '/api/participants';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Falha ao buscar participantes no servidor');
    const data: Participant[] = await res.json();
    saveLocalBackup(data);
    return data;
  } catch (err) {
    console.warn('Usando backup local de participantes:', err);
    return getLocalBackup();
  }
}

export async function registerParticipant(payload: {
  name: string;
  matricula: string;
  company: string;
  eventId?: string;
}): Promise<Participant> {
  try {
    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Erro ao registrar participante');
    }

    const current = getLocalBackup();
    const updated = [data, ...current.filter((p) => p.id !== data.id)];
    saveLocalBackup(updated);

    return data;
  } catch (err: any) {
    // If backend is somehow unreachable, allow offline registration
    if (err.message && !err.message.includes('já está cadastrada')) {
      const offlineParticipant: Participant = {
        id: `part-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: payload.name.trim(),
        matricula: payload.matricula.trim(),
        company: payload.company.trim(),
        createdAt: new Date().toISOString(),
        checkedIn: false,
        checkInTime: null,
        eventId: payload.eventId,
      };
      const current = getLocalBackup();
      saveLocalBackup([offlineParticipant, ...current]);
      return offlineParticipant;
    }
    throw err;
  }
}

export async function updateParticipant(
  id: string,
  payload: {
    name: string;
    matricula: string;
    company: string;
    eventId?: string;
    checkedIn?: boolean;
  }
): Promise<Participant> {
  const res = await fetch(`/api/participants/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao atualizar dados do participante');
  }

  const current = getLocalBackup();
  const updated = current.map((p) => (p.id === id ? data : p));
  saveLocalBackup(updated);

  return data;
}

export async function deleteParticipant(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/participants/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Erro ao excluir participante');
    }
    const current = getLocalBackup();
    saveLocalBackup(current.filter((p) => p.id !== id));
    return true;
  } catch (err) {
    // Offline deletion fallback
    const current = getLocalBackup();
    saveLocalBackup(current.filter((p) => p.id !== id));
    return true;
  }
}

export async function deleteParticipantsBulk(ids: string[]): Promise<boolean> {
  if (!ids || ids.length === 0) return true;
  const idsSet = new Set(ids);
  try {
    const res = await fetch('/api/participants/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Erro ao excluir participantes selecionados');
    }
    const current = getLocalBackup();
    saveLocalBackup(current.filter((p) => !idsSet.has(p.id)));
    return true;
  } catch (err) {
    const current = getLocalBackup();
    saveLocalBackup(current.filter((p) => !idsSet.has(p.id)));
    return true;
  }
}

export async function checkInParticipant(
  id: string,
  forceState?: boolean
): Promise<Participant> {
  try {
    const res = await fetch(`/api/participants/${encodeURIComponent(id)}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ forceState }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao alterar presença');
    return data.participant;
  } catch (err) {
    const current = getLocalBackup();
    const index = current.findIndex((p) => p.id === id);
    if (index !== -1) {
      const p = current[index];
      const newStatus = typeof forceState === 'boolean' ? forceState : !p.checkedIn;
      p.checkedIn = newStatus;
      p.checkInTime = newStatus ? new Date().toISOString() : null;
      saveLocalBackup(current);
      return p;
    }
    throw err;
  }
}

export async function scanCheckIn(rawCode: string): Promise<{
  success: boolean;
  participant: Participant;
  alreadyCheckedIn: boolean;
  message: string;
}> {
  try {
    const res = await fetch('/api/checkin/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawCode }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Código QR não reconhecido');
    }

    // update local cache
    const current = getLocalBackup();
    const idx = current.findIndex((p) => p.id === data.participant.id);
    if (idx !== -1) {
      current[idx] = data.participant;
    } else {
      current.push(data.participant);
    }
    saveLocalBackup(current);

    return data;
  } catch (err: any) {
    // Fallback search in local backup
    const clean = rawCode.trim();
    const current = getLocalBackup();
    let found = current.find(
      (p) =>
        p.id === clean ||
        p.matricula.toLowerCase() === clean.toLowerCase() ||
        clean.includes(p.matricula) ||
        clean.includes(p.id)
    );

    if (found) {
      const alreadyCheckedIn = found.checkedIn;
      found.checkedIn = true;
      if (!found.checkInTime) found.checkInTime = new Date().toISOString();
      saveLocalBackup(current);
      return {
        success: true,
        participant: found,
        alreadyCheckedIn,
        message: alreadyCheckedIn
          ? `Presença de ${found.name} já havia sido confirmada!`
          : `Presença confirmada com sucesso para ${found.name}!`,
      };
    }

    throw err;
  }
}

/**
 * Fetch company branding (logo & company name)
 */
export async function fetchBranding(): Promise<CompanyBranding> {
  try {
    const res = await fetch('/api/branding');
    if (!res.ok) throw new Error('Falha ao obter branding');
    const data: CompanyBranding = await res.json();
    saveLocalBrandingBackup(data);
    return data;
  } catch (err) {
    console.warn('Usando backup local de branding:', err);
    return getLocalBrandingBackup();
  }
}

/**
 * Update company branding
 */
export async function updateBranding(payload: {
  companyName: string;
  companyLogo: string;
}): Promise<CompanyBranding> {
  try {
    const res = await fetch('/api/branding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Falha ao atualizar branding no servidor');
    const data = await res.json();
    const branding = data.branding || { companyName: payload.companyName, companyLogo: payload.companyLogo };
    saveLocalBrandingBackup(branding);
    return branding;
  } catch (err) {
    console.warn('Salvando branding apenas localmente:', err);
    const fallback: CompanyBranding = {
      companyName: payload.companyName,
      companyLogo: payload.companyLogo,
      updatedAt: new Date().toISOString(),
    };
    saveLocalBrandingBackup(fallback);
    return fallback;
  }
}

/**
 * Authenticate administrator with username and password
 */
export async function authenticateAdmin(
  username: string,
  pass: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: pass }),
    });

    if (res.ok) {
      return { success: true };
    }
    const data = await res.json().catch(() => ({}));
    return { success: false, message: data.message || 'Credenciais inválidas.' };
  } catch {
    // Local fallback check
    const localPass = getLocalAdminPassword();
    const cleanUser = username.trim().toLowerCase();
    const isUserValid = cleanUser === 'admin' || cleanUser === 'administrador';
    if (isUserValid && pass.trim() === localPass) {
      return { success: true };
    }
    return { success: false, message: 'Credenciais inválidas.' };
  }
}

/**
 * Change administrator password
 */
export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string,
  newUsername?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword, newUsername }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Erro ao alterar senha.' };
    }
    saveLocalAdminPassword(newPassword);
    return { success: true, message: data.message || 'Senha alterada com sucesso.' };
  } catch {
    const localPass = getLocalAdminPassword();
    if (currentPassword !== localPass) {
      return { success: false, error: 'Senha atual incorreta.' };
    }
    saveLocalAdminPassword(newPassword);
    return { success: true, message: 'Senha alterada com sucesso.' };
  }
}

/**
 * Fetch automation settings and logs
 */
export async function fetchAutomation(): Promise<AutomationData> {
  try {
    const res = await fetch('/api/automation');
    if (!res.ok) throw new Error('Falha ao buscar configurações de automação');
    const data: AutomationData = await res.json();
    try {
      localStorage.setItem(AUTOMATION_STORAGE_KEY, JSON.stringify(data));
    } catch {}
    return data;
  } catch (err) {
    console.warn('Usando backup local de automação:', err);
    try {
      const raw = localStorage.getItem(AUTOMATION_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
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
          fromEmail: '',
        },
      },
      logs: [],
    };
  }
}

/**
 * Save automation settings
 */
export async function saveAutomationSettings(
  settings: AutomationSettings
): Promise<AutomationSettings> {
  try {
    const res = await fetch('/api/automation/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Erro ao salvar configurações de automação');
    }
    return data.settings;
  } catch (err) {
    console.warn('Salvando configurações de automação localmente:', err);
    try {
      const raw = localStorage.getItem(AUTOMATION_STORAGE_KEY);
      const current = raw ? JSON.parse(raw) : { logs: [] };
      current.settings = settings;
      localStorage.setItem(AUTOMATION_STORAGE_KEY, JSON.stringify(current));
    } catch {}
    return settings;
  }
}

/**
 * Trigger manual test report
 */
export async function triggerTestReport(eventId?: string): Promise<ReportLogItem> {
  const res = await fetch('/api/automation/trigger-test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Falha ao disparar teste de relatório');
  }
  return data.log;
}

/**
 * Clear automation history logs
 */
export async function clearAutomationLogs(): Promise<void> {
  await fetch('/api/automation/clear-logs', {
    method: 'POST',
  });
}
