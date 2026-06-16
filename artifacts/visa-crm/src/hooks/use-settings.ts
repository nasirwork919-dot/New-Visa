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
  colorTheme: string;   // preset name or 'custom'
  customColor: string;  // hex color used when colorTheme === 'custom'
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

// ─── Full Theme System ────────────────────────────────────────────────────────

type ThemeVars = Record<string, string>;

export interface FullTheme {
  name: string;
  label: string;
  dark: boolean;
  preview: { sidebar: string; bg: string; primary: string };
  vars: ThemeVars;
}

function light(
  label: string,
  preview: FullTheme['preview'],
  h: number,
  primary: string,
  sidebarDark?: { bg: string; fg: string; border: string; accent: string; primary: string },
): FullTheme {
  const bg = `${h} 22% 97%`;
  const fg = `${h} 38% 11%`;
  const border = `${h} 18% 89%`;
  const muted = `${h} 22% 94%`;
  const mutedFg = `${h} 12% 48%`;
  const sd = sidebarDark;
  return {
    name: label.toLowerCase().replace(/\s+/g, '-'),
    label,
    dark: false,
    preview,
    vars: {
      background: bg,
      foreground: fg,
      border,
      input: border,
      ring: primary,
      card: '0 0% 100%',
      'card-foreground': fg,
      'card-border': border,
      popover: '0 0% 100%',
      'popover-foreground': fg,
      'popover-border': border,
      sidebar: sd ? sd.bg : '0 0% 100%',
      'sidebar-foreground': sd ? sd.fg : fg,
      'sidebar-border': sd ? sd.border : border,
      'sidebar-primary': sd ? sd.primary : primary,
      'sidebar-primary-foreground': '0 0% 100%',
      'sidebar-accent': sd ? sd.accent : muted,
      'sidebar-accent-foreground': sd ? sd.fg : fg,
      'sidebar-ring': sd ? sd.primary : primary,
      primary,
      'primary-foreground': '0 0% 100%',
      secondary: muted,
      'secondary-foreground': fg,
      muted,
      'muted-foreground': mutedFg,
      accent: muted,
      'accent-foreground': fg,
    },
  };
}

function dark(
  label: string,
  preview: FullTheme['preview'],
  h: number,
  primary: string,
): FullTheme {
  const bg = `${h} 38% 9%`;
  const fg = `${h} 22% 93%`;
  const border = `${h} 30% 20%`;
  const card = `${h} 38% 12%`;
  const sidebarBg = `${h} 42% 7%`;
  const sidebarFg = `${h} 18% 87%`;
  const sidebarBorder = `${h} 32% 16%`;
  const muted = `${h} 30% 17%`;
  const mutedFg = `${h} 18% 62%`;
  return {
    name: label.toLowerCase().replace(/\s+/g, '-'),
    label,
    dark: true,
    preview,
    vars: {
      background: bg,
      foreground: fg,
      border,
      input: border,
      ring: primary,
      card,
      'card-foreground': fg,
      'card-border': border,
      popover: card,
      'popover-foreground': fg,
      'popover-border': border,
      sidebar: sidebarBg,
      'sidebar-foreground': sidebarFg,
      'sidebar-border': sidebarBorder,
      'sidebar-primary': primary,
      'sidebar-primary-foreground': '0 0% 100%',
      'sidebar-accent': muted,
      'sidebar-accent-foreground': sidebarFg,
      'sidebar-ring': primary,
      primary,
      'primary-foreground': '0 0% 100%',
      secondary: muted,
      'secondary-foreground': fg,
      muted,
      'muted-foreground': mutedFg,
      accent: muted,
      'accent-foreground': fg,
    },
  };
}

export const FULL_THEMES: FullTheme[] = [
  // Light themes ────────────────────────────────────────────────────────────
  light('Sky Blue', { sidebar: '#ffffff', bg: '#f4f7fb', primary: '#1A5FB4' },
    213, '213 82% 40%'),

  light('Navy', { sidebar: '#1a2d44', bg: '#f4f7fb', primary: '#2176c7' },
    213, '213 78% 48%',
    { bg: '215 44% 17%', fg: '210 30% 90%', border: '215 38% 23%', accent: '215 38% 23%', primary: '213 78% 58%' }),

  light('Forest', { sidebar: '#ffffff', bg: '#f1f8f2', primary: '#2d8a47' },
    138, '138 55% 35%'),

  light('Lavender', { sidebar: '#ffffff', bg: '#f4f2fc', primary: '#7c3aed' },
    262, '262 55% 50%'),

  light('Sunset', { sidebar: '#ffffff', bg: '#fcf8f2', primary: '#cc5800' },
    28, '28 90% 42%'),

  light('Rose', { sidebar: '#ffffff', bg: '#fdf0f3', primary: '#d81b4a' },
    343, '343 72% 48%'),

  light('Teal', { sidebar: '#ffffff', bg: '#f0fbfa', primary: '#0d8a7c' },
    175, '175 80% 30%'),

  light('Slate', { sidebar: '#1e2d3d', bg: '#f6f8fa', primary: '#3a7bd5' },
    213, '213 60% 50%',
    { bg: '213 35% 18%', fg: '210 25% 88%', border: '213 30% 25%', accent: '213 30% 25%', primary: '213 65% 60%' }),

  // Dark themes ────────────────────────────────────────────────────────────
  dark('Dark', { sidebar: '#0b1120', bg: '#111827', primary: '#3d82cc' },
    222, '213 75% 55%'),

  dark('Midnight', { sidebar: '#130a26', bg: '#1a1030', primary: '#a855f7' },
    270, '270 65% 62%'),

  dark('Dark Green', { sidebar: '#0a1f10', bg: '#0f1e14', primary: '#22c55e' },
    138, '138 60% 46%'),
];

// ─── Custom color → full light theme ─────────────────────────────────────────

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

export function buildCustomTheme(hex: string): ThemeVars {
  const [h, s, rawL] = hexToHsl(hex);
  const sat = Math.max(s, 55);
  const primaryL = Math.min(Math.max(rawL, 32), 52);
  const primary = `${h} ${sat}% ${primaryL}%`;
  return light('Custom', { sidebar: '#ffffff', bg: '#f8f9fa', primary: hex },
    h, primary).vars;
}

// ─── Apply theme to DOM ───────────────────────────────────────────────────────

export function applyFullTheme(themeName: string, customHex?: string) {
  let vars: ThemeVars;
  if (themeName === 'custom' && customHex) {
    vars = buildCustomTheme(customHex);
  } else {
    const theme = FULL_THEMES.find(t => t.name === themeName) || FULL_THEMES[0];
    vars = theme.vars;
  }

  let el = document.getElementById('crm-theme-vars') as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = 'crm-theme-vars';
    document.head.appendChild(el);
  }
  const decls = Object.entries(vars).map(([k, v]) => `  --${k}: ${v};`).join('\n');
  el.textContent = `:root {\n${decls}\n}`;
}

// ─── Settings hook ────────────────────────────────────────────────────────────

export const SETTING_DEFAULTS: CRMSettings = {
  waNumber: '',
  businessName: 'VisaCRM',
  serviceGSTRate: SERVICE_GST_RATE_DEFAULT,
  bankGSTRate: BANK_GST_RATE_DEFAULT,
  messages: DEFAULT_MESSAGES,
  logoUrl: '',
  colorTheme: 'sky-blue',
  customColor: '#1A5FB4',
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
