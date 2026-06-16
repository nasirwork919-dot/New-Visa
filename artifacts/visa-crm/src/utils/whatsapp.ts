import { calcGST, formatINR } from './gst';
import { loadSettings } from '@/hooks/use-settings';

/** Substitute {name}, {service}, {fee}, {gst}, {net}, {paid}, {balance} in a template */
function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

export function buildWAUrl(lead: any, messageType: string) {
  if (!lead.whatsapp && !lead.phone) return '#';

  const phone = lead.whatsapp || lead.phone;
  let cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.slice(1); // strip leading 0
  if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

  const settings = loadSettings();
  const { serviceGST, bankGST, totalGST, totalAmount, netFee } = calcGST(
    lead.base_fee || 0,
    lead.payment_method,
    settings.serviceGSTRate,
    settings.bankGSTRate,
  );
  const balance = Math.max(0, totalAmount - (lead.amount_paid || 0));
  const isCash = !lead.payment_method || lead.payment_method === 'Cash';

  const gstDetail = isCash
    ? formatINR(serviceGST)
    : `${formatINR(serviceGST)} (svc) + ${formatINR(bankGST)} (bank) = ${formatINR(totalGST)}`;

  const vars: Record<string, string> = {
    name: lead.pax_name || '',
    service: lead.service_name || '',
    status: lead.status || '',
    fee: formatINR(totalAmount),
    gst: gstDetail,
    net: formatINR(netFee),
    paid: formatINR(lead.amount_paid || 0),
    balance: formatINR(balance),
  };

  const tpl = settings.messages;

  // Map messageType → template key
  let templateKey: keyof typeof tpl;
  switch (messageType) {
    case 'welcome':           templateKey = 'welcome'; break;
    case 'payment_received':  templateKey = 'payment_received'; break;
    case 'payment_reminder':  templateKey = 'payment_reminder'; break;
    case 'completed':         templateKey = 'completed'; break;
    case 'status_update':
      // Route by current lead status
      switch (lead.status) {
        case 'Under Process': templateKey = 'under_process'; break;
        case 'Follow-up':     templateKey = 'under_process'; break;
        case 'Submitted':     templateKey = 'submitted'; break;
        case 'Completed':     templateKey = 'completed'; break;
        case 'Cancelled':     templateKey = 'cancelled'; break;
        default:              templateKey = 'under_process';
      }
      break;
    default: templateKey = 'welcome';
  }

  const message = applyTemplate(tpl[templateKey], vars);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function openWhatsApp(lead: any, messageType: string) {
  const url = buildWAUrl(lead, messageType);
  if (url !== '#') {
    window.open(url, '_blank');
  }
}
