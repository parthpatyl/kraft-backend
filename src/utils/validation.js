// Credential & Contact Validation Utilities for Kraft Your Trip Backend

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'tempmail.com', 'mailinator.com', 'guerrillamail.com', '10minutemail.com',
  'throwawaymail.com', 'yopmail.com', 'trashmail.com', 'sharklasers.com',
  'getairmail.com', 'dispostable.com', 'fake.com', 'temp-mail.org',
  'fakemailgenerator.com', 'inboxkitten.com', 'nada.ltd', 'mohmal.com',
  'emailondeck.com', 'mytemp.email', 'crazymailing.com'
]);

const DUMMY_EMAIL_PREFIXES = new Set([
  'test', 'testing', 'admin', 'asdf', 'qwerty', 'dummy'
]);

const SEQUENTIAL_ASC = '01234567890123456789';

export function validateEmail(email) {
  const raw = (email || '').trim();
  if (!raw) {
    return { isValid: false, error: 'A valid email is required' };
  }

  if (raw.length > 254) {
    return { isValid: false, error: 'Email address is too long' };
  }

  const rfcRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!rfcRegex.test(raw) || raw.includes('..')) {
    return { isValid: false, error: 'A valid email is required' };
  }

  const [localPart, domainPart] = raw.toLowerCase().split('@');
  if (!domainPart || !domainPart.includes('.')) {
    return { isValid: false, error: 'A valid email is required' };
  }

  const tld = domainPart.split('.').pop();
  if (!tld || tld.length < 2 || !/^[a-z]+$/.test(tld)) {
    return { isValid: false, error: 'A valid email is required' };
  }

  if (DISPOSABLE_EMAIL_DOMAINS.has(domainPart)) {
    return { isValid: false, error: 'Disposable or temporary email addresses are not accepted' };
  }

  if (DUMMY_EMAIL_PREFIXES.has(localPart) && (domainPart === 'test.com' || domainPart === 'dummy.com' || domainPart === 'fake.com')) {
    return { isValid: false, error: 'Please provide a genuine personal or work email address' };
  }

  return { isValid: true, normalized: raw.toLowerCase() };
}

export function validatePhone(phone, defaultCountryCode = '+91') {
  const raw = (phone || '').toString().trim();
  if (!raw) {
    return { isValid: false, error: 'A valid phone number is required (country code + at least 7 digits)' };
  }

  let cc = defaultCountryCode;
  let digits = raw;

  if (raw.startsWith('+')) {
    const match = raw.match(/^(\+\d{1,4})(\d+)$/);
    if (match) {
      cc = match[1];
      digits = match[2];
    } else {
      digits = raw.replace(/\D/g, '');
    }
  } else {
    digits = raw.replace(/\D/g, '');
  }

  if (!digits) {
    return { isValid: false, error: 'A valid phone number is required (country code + at least 7 digits)' };
  }

  if (digits.length < 7 || digits.length > 15) {
    return { isValid: false, error: 'A valid phone number is required (country code + at least 7 digits)' };
  }

  // Identical digits check
  if (/^(\d)\1+$/.test(digits)) {
    return { isValid: false, error: 'Phone number cannot contain all identical digits' };
  }

  // Sequential digits check
  if (digits.length >= 8 && SEQUENTIAL_ASC.includes(digits)) {
    return { isValid: false, error: 'Sequential dummy phone numbers are not allowed' };
  }

  const formatted = `${cc.startsWith('+') ? cc : `+${cc}`}${digits}`;
  return { isValid: true, formatted, cleanDigits: digits };
}

export function validateName(name) {
  const raw = (name || '').trim();
  if (!raw) {
    return { isValid: false, error: 'Name is required' };
  }
  if (raw.length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters' };
  }
  if (raw.length > 100) {
    return { isValid: false, error: 'Name must not exceed 100 characters' };
  }
  if (!/^[a-zA-Z\s]+$/.test(raw)) {
    return { isValid: false, error: 'Name should only contain letters and spaces' };
  }
  const lower = raw.toLowerCase();
  if (['test', 'testing', 'asdf', 'qwerty', 'fake', 'fake name', 'none', 'null', 'na'].includes(lower)) {
    return { isValid: false, error: 'Please enter your genuine full name' };
  }
  return { isValid: true, normalized: raw };
}
