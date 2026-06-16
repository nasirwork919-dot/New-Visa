import { useState } from 'react';
import { SERVICE_GST_RATE_DEFAULT, BANK_GST_RATE_DEFAULT } from '@/utils/gst';

export interface MessageTemplates {
  welcome: string;
  under_process: string;
  submitted: string;
  completed: string;
  cancelled: string;
  payment_received: string;
  payment_reminder: string;
}

export interface CRMSettings {
  waNumber: string;
  businessName: string;
  serviceGSTRate: number;
  bankGSTRate: number;
  messages: MessageTemplates;
  logoUrl: string;
  colorTheme: string;
}

const SETTINGS_KEY = 'visa-crm-settings';

export const DEFAULT_MESSAGES: MessageTemplates = {
  welcome:
    'Hello {name},\n\nWelcome! We have initiated your *{service}* application.\n\nFee: {fee}\nGST: {gst}\nAmount Paid: {paid}\nBalance Due: {balance}\n\nWe will keep you updated on the progress.',
  under_process:
    'Hello {name},\n\nUpdate on your *{service}* application:\n\n📋 Status: *Under Process*\n\n⏳ We are processing your application and will keep you updated.\n\nFor any queries, feel free to reach out to us.',
  submitted:
    'Hello {name},\n\nUpdate on your *{service}* application:\n\n📋 Status: *Submitted*\n\n✅ Your documents have been submitted to the embassy/consulate.\n\nFor any queries, feel free to reach out to us.',
  completed:
    'Hello {name},\n\n🎉 Great news! Your *{service}* application is now complete.\n\nThank you for choosing our services.',
  cancelled:
    'Hello {name},\n\nRegarding your *{service}* application:\n\nYour application has been cancelled. Please contact us for further assistance.',
  payment_received:
    'Hello {name},\n\nWe have received your payment.\n\nTotal Fee: {fee}\nGST: {gst}\nAmount Paid: {paid}\nBalance Due: {balance}\n\nThank you!',
  payment_reminder:
    'Hello {name},\n\nThis is a gentle reminder regarding your pending balance for the *{service}* application.\n\nTotal Fee: {fee}\nAmount Paid: {paid}\n*Balance Due: {balance}*\n\nPlease arrange for the payment at your earliest convenience.',
};

export const COLOR_THEMES = [
  { name: 'Blue',    primary: '213 82% 40%', hex: '#1A5FB4' },
  { name: 'Indigo',  primary: '240 60% 50%', hex: '#4338CA' },
  { name: 'Purple',  primary: '270 55% 45%', hex: '#7C3AED' },
  { name: 'Teal',    primary: '175 55% 35%', hex: '#0F766E' },
  { name: 'Green',   primary: '142 55% 35%', hex: '#16A34A' },
  { name: 'Orange',  primary: '25 85% 45%',  hex: '#EA580C' },
  { name: 'Red',     primary: '0 72% 45%',   hex: '#DC2626' },
  { name: 'Pink',    primary: '330 70% 50%', hex: '#DB2777' },
];

export function applyTheme(themeName: string) {
  const theme = COLOR_THEMES.find(t => t.name === themeName);
  if (!theme) return;
  const p = theme.primary;
  const parts = p.split(' ');
  const lightNum = parseInt(parts[2]);
  const darkL = Math.min(75, lightNum + 12) + '%';
  const darkP = `${parts[0]} ${parts[1]} ${darkL}`;

  let styleEl = document.getElementById('crm-theme-vars') as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'crm-theme-vars';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = [
    `:root { --primary: ${p}; --sidebar-primary: ${p}; --ring: ${p}; --sidebar-ring: ${p}; --chart-1: ${p}; }`,
    `.dark { --primary: ${darkP}; --sidebar-primary: ${darkP}; --ring: ${darkP}; --sidebar-ring: ${darkP}; --chart-1: ${darkP}; }`,
  ].join('\n');
}

export const SETTING_DEFAULTS: CRMSettings = {
  waNumber: '',
  businessName: 'VisaCRM',
  serviceGSTRate: SERVICE_GST_RATE_DEFAULT,
  bankGSTRate: BANK_GST_RATE_DEFAULT,
  messages: DEFAULT_MESSAGES,
  logoUrl: '',
  colorTheme: 'Blue',
};

export function loadSettings(): CRMSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return SETTING_DEFAULTS;
    const parsed = JSON.parse(stored);
    return {
      ...SETTING_DEFAULTS,
      ...parsed,
      messages: { ...DEFAULT_MESSAGES, ...(parsed.messages || {}) },
    };
  } catch {
    return SETTING_DEFAULTS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<CRMSettings>(loadSettings);

  const saveSettings = (updates: Partial<CRMSettings>) => {
    const next: CRMSettings = {
      ...settings,
      ...updates,
      messages: { ...settings.messages, ...(updates.messages || {}) },
    };
    setSettings(next);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event('crm-settings-changed'));
    return next;
  };

  return { settings, saveSettings };
}
