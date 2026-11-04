const PIXEL_ID = 'rh4bd';
const ENDPOINT = `https://ads-api.x.com/12/measurement/conversions/${PIXEL_ID}`;
const HASH_RE = /^[0-9a-f]{64}$/i;
const E164_RE = /^\+[1-9]\d{7,14}$/;

export interface XConversionIdentifiers {
  twclid?: string;
  email?: string;
  phone?: string;
  hashedEmail?: string;
  hashedPhoneNumber?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface XConversionInput {
  eventId: string;
  conversionTime?: Date | string;
  eventSourceUrl?: string;
  conversionId?: string;
  identifiers: XConversionIdentifiers;
}

export interface XConversionResult {
  ok: boolean;
  status: number | null;
  reason?: 'not_configured' | 'invalid_input' | 'request_failed';
}

const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';

export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function normalizePhone(value: string): string {
  const phone = value.trim().replace(/[\s().-]/g, '');
  if (!E164_RE.test(phone)) throw new Error('phone_must_be_e164');
  return phone;
}

async function identifiersFor(input: XConversionIdentifiers) {
  const identifiers: Record<string, string> = {};
  const twclid = text(input.twclid);
  const email = text(input.email);
  const phone = text(input.phone);
  const hashedEmail = text(input.hashedEmail);
  const hashedPhoneNumber = text(input.hashedPhoneNumber);
  const ipAddress = text(input.ipAddress);
  const userAgent = text(input.userAgent);

  if (twclid) identifiers.twclid = twclid;
  if (email) identifiers.hashed_email = await sha256Hex(email.toLowerCase());
  if (phone) identifiers.hashed_phone_number = await sha256Hex(normalizePhone(phone));
  if (hashedEmail) {
    if (!HASH_RE.test(hashedEmail)) throw new Error('hashed_email_must_be_sha256');
    identifiers.hashed_email = hashedEmail.toLowerCase();
  }
  if (hashedPhoneNumber) {
    if (!HASH_RE.test(hashedPhoneNumber)) throw new Error('hashed_phone_number_must_be_sha256');
    identifiers.hashed_phone_number = hashedPhoneNumber.toLowerCase();
  }
  if (ipAddress && userAgent) {
    identifiers.ip_address = ipAddress;
    identifiers.user_agent = userAgent;
  }
  if (!Object.keys(identifiers).length) throw new Error('missing_identifier');
  return [identifiers];
}

function conversionTime(value?: Date | string): string {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) throw new Error('invalid_conversion_time');
  return date.toISOString();
}

async function payloadFor(input: XConversionInput) {
  const eventId = text(input.eventId);
  if (!/^tw-rh4bd-[A-Za-z0-9_-]+$/.test(eventId)) throw new Error('invalid_event_id');
  const conversion: Record<string, unknown> = {
    conversion_time: conversionTime(input.conversionTime),
    event_id: eventId,
    identifiers: await identifiersFor(input.identifiers),
  };
  const eventSourceUrl = text(input.eventSourceUrl);
  const conversionId = text(input.conversionId);
  if (eventSourceUrl) conversion.event_source_url = eventSourceUrl;
  if (conversionId) conversion.conversion_id = conversionId;
  return conversion;
}

export async function sendXConversions(inputs: XConversionInput[]): Promise<XConversionResult> {
  const token = text(import.meta.env.X_PIXEL_TOKEN);
  if (!token) return { ok: false, status: null, reason: 'not_configured' };
  if (!inputs.length) return { ok: false, status: null, reason: 'invalid_input' };

  let conversions: Record<string, unknown>[];
  try {
    conversions = await Promise.all(inputs.map(payloadFor));
  } catch {
    return { ok: false, status: null, reason: 'invalid_input' };
  }

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'X-Pixel-Token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversions }),
      signal: AbortSignal.timeout(5000),
    });
    return { ok: response.ok, status: response.status };
  } catch {
    return { ok: false, status: null, reason: 'request_failed' };
  }
}

export const sendXConversion = (input: XConversionInput) => sendXConversions([input]);
