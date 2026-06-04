---
name: GST payment method rules
description: How GST is calculated based on payment method in VisaCRM
---

# GST Rules

Cash payments → GST is **inclusive** (already within the quoted price)
- Formula: `gstAmount = fee × 0.18 / 1.18`  (extract GST from within the price)
- `totalAmount === fee` (no extra charge)

UPI / Bank Transfer / Cheque / Other → GST is **exclusive** (added on top)
- Formula: `gstAmount = fee × 0.18`
- `totalAmount = fee + gstAmount`

`calcGSTByMethod(baseFee, paymentMethod)` in `gst.ts` handles both cases and returns `{ fee, gstAmount, totalAmount, isInclusive }`.

**Why:** Cash clients pay one round number; UPI/bank clients are billed base + GST separately for accounting clarity.

**How to apply:** Any place that computes GST — leads/index.tsx, leads/[id].tsx, whatsapp.ts — must use `calcGSTByMethod` with the lead's `payment_method` (defaulting to 'Cash' if missing). Never use the old `calcGST` for new code.
