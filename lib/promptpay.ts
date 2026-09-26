import generatePayload from 'promptpay-qr'
import QRCode from 'qrcode'

// PROMPTPAY_ID is the dormitory's own receiving account (phone or tax ID),
// not a per-tenant value — every bill's QR just carries a different amount.
export async function generatePromptPayQr(amountBaht: number): Promise<string | null> {
  const promptPayId = process.env.PROMPTPAY_ID
  if (!promptPayId) return null

  const payload = generatePayload(promptPayId, { amount: amountBaht })
  return QRCode.toDataURL(payload, { margin: 1, width: 320 })
}
