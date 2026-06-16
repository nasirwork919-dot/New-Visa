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

// GST applies only for UPI/GPay payments; Cash, Cheque, Bank Transfer, Other = no GST
const GST_METHODS = ['UPI/Transfer'];

/**
 * GST calculation — extracted from what the client pays.
 * UPI/Transfer: Service GST + Bank GST, both pulled from the total.
 * All other methods (Cash, Cheque, Bank Transfer, Other): no GST.
 */
export function calcGST(
  fee: number,
  paymentMethod?: string,
  serviceGSTRate = SERVICE_GST_RATE_DEFAULT,
  bankGSTRate = BANK_GST_RATE_DEFAULT,
): GSTBreakdown {
  const f = Math.round(parseFloat(String(fee)) || 0);
  const isUPI = !!paymentMethod && GST_METHODS.includes(paymentMethod);

  if (!isUPI) {
    return {
      fee: f,
      serviceGST: 0,
      bankGST: 0,
      totalGST: 0,
      netFee: f,
      totalAmount: f,
      gstAmount: 0,
    };
  }

  // UPI/Transfer: both GSTs extracted from the same client total
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
