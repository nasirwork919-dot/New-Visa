export const SERVICE_GST_RATE_DEFAULT = 18;
export const BANK_GST_RATE_DEFAULT = 18;

export interface GSTBreakdown {
  fee: number;
  serviceGST: number;
  bankGST: number;
  totalGST: number;
  netFee: number;
  totalAmount: number;
  gstAmount: number; // alias for totalGST — kept for backward compat
}

const CASH_METHODS = ['Cash'];

/**
 * Dual-GST calculation — both GSTs extracted from what the client pays.
 * Cash: only Service GST applies.
 * Non-cash: Service GST + Bank GST, both pulled from the same total.
 *
 * serviceGSTRate and bankGSTRate are percentages (e.g. 18, 2).
 */
export function calcGST(
  fee: number,
  paymentMethod?: string,
  serviceGSTRate = SERVICE_GST_RATE_DEFAULT,
  bankGSTRate = BANK_GST_RATE_DEFAULT,
): GSTBreakdown {
  const f = Math.round(parseFloat(String(fee)) || 0);
  const isCash = !paymentMethod || CASH_METHODS.includes(paymentMethod);

  if (isCash) {
    const serviceGST = Math.round(f * serviceGSTRate / (100 + serviceGSTRate));
    const totalGST = serviceGST;
    return {
      fee: f,
      serviceGST,
      bankGST: 0,
      totalGST,
      netFee: f - totalGST,
      totalAmount: f,
      gstAmount: totalGST,
    };
  }

  // Non-cash: both GSTs from the same client total
  const totalRate = serviceGSTRate + bankGSTRate;
  const serviceGST = Math.round(f * serviceGSTRate / (100 + totalRate));
  const bankGST = Math.round(f * bankGSTRate / (100 + totalRate));
  const totalGST = serviceGST + bankGST;
  return {
    fee: f,
    serviceGST,
    bankGST,
    totalGST,
    netFee: f - totalGST,
    totalAmount: f,
    gstAmount: totalGST,
  };
}

// Backward-compat alias
export function calcGSTByMethod(fee: number, paymentMethod?: string) {
  return calcGST(fee, paymentMethod);
}

export function formatINR(amount: number) {
  const n = Math.round(amount || 0);
  return '₹' + n.toLocaleString('en-IN');
}

export function formatINRShort(amount: number) {
  const n = Math.round(amount || 0);
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
  if (n >= 1000) return '₹' + (n / 1000).toFixed(0) + 'k';
  return formatINR(n);
}
