export interface EventItem {
  id: string;
  name: string;
  date: string; // Format YYYY-MM-DD
  endDate?: string | null; // Format YYYY-MM-DD
  time?: string | null; // Format HH:mm
  location?: string;
  description?: string;
  createdAt: string;
  status?: 'active' | 'closed';
  closedAt?: string | null;
}

export interface Participant {
  id: string;
  name: string;
  matricula: string;
  company: string;
  createdAt: string;
  checkedIn: boolean;
  checkInTime?: string | null;
  eventId?: string;
  eventName?: string;
  eventDate?: string;
}

export type ReportFormat = 'pdf' | 'excel' | 'both';
export type WeekDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface SmtpConfig {
  enabled: boolean;
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
  fromName: string;
  fromEmail: string;
}

export interface AutomationSettings {
  enabled: boolean;
  adminEmail: string;
  adminName?: string;
  reportFormat: ReportFormat;
  sendWeekly: boolean;
  weeklyDay: WeekDay;
  weeklyTime: string; // e.g. "08:00"
  sendOnEventClosed: boolean;
  includeAbsenteesList: boolean;
  lastWeeklyRun?: string | null;
  smtp?: SmtpConfig;
}

export interface ReportLogItem {
  id: string;
  triggeredAt: string;
  triggerType: 'weekly' | 'event_closed' | 'manual_test';
  recipientEmail: string;
  format: ReportFormat;
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

export interface AutomationData {
  settings: AutomationSettings;
  logs: ReportLogItem[];
}

export interface QRPayload {
  v: number;
  id: string;
  m: string; // matricula
  n: string; // name
  c: string; // company
  e?: string; // eventName
  ed?: string; // eventDate
}

export type ActiveTab = 'register' | 'admin' | 'scanner';

export interface CompanyBranding {
  companyName: string;
  companyLogo: string; // Base64 data URL or external URL
  updatedAt?: string;
}
