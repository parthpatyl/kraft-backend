// Credential, Contact & Number Validation Utilities for Kraft Your Trip Backend

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

const COUNTRY_PHONE_RULES = {
  '+91': { name: 'India', min: 10, max: 10, label: 'Indian phone numbers must be exactly 10 digits' },
  '+1': { name: 'US/Canada', min: 10, max: 10, label: 'US/Canada phone numbers must be exactly 10 digits' },
  '+44': { name: 'UK', min: 10, max: 11, label: 'UK phone numbers must be 10 or 11 digits' },
  '+971': { name: 'UAE', min: 9, max: 9, label: 'UAE phone numbers must be exactly 9 digits' },
  '+65': { name: 'Singapore', min: 8, max: 8, label: 'Singapore phone numbers must be exactly 8 digits' },
  '+61': { name: 'Australia', min: 9, max: 9, label: 'Australian phone numbers must be exactly 9 digits' }
};

export function validateEmail(email, options = {}) {
  const raw = (email || '').trim();
  if (!raw) {
    return {
      isValid: false,
      error: options.requireCorporate
        ? 'Work email is required (e.g. name@company.com)'
        : 'A valid email is required'
    };
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

  let cc = (defaultCountryCode || '+91').toString().trim();
  if (!cc.startsWith('+')) cc = `+${cc}`;
  let digits = raw.replace(/\D/g, '');

  if (raw.startsWith('+')) {
    const knownCodes = Object.keys(COUNTRY_PHONE_RULES).sort((a, b) => b.length - a.length);
    for (const code of knownCodes) {
      if (raw.startsWith(code)) {
        cc = code;
        digits = raw.slice(code.length).replace(/\D/g, '');
        break;
      }
    }
  } else if (digits.length > 10 && cc && digits.startsWith(cc.replace('+', ''))) {
    digits = digits.slice(cc.replace('+', '').length);
  }

  if (!digits || digits.length < 7 || digits.length > 15) {
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

  // Country specific length check
  const rule = COUNTRY_PHONE_RULES[cc];
  if (rule) {
    if (digits.length < rule.min || digits.length > rule.max) {
      return { isValid: false, error: rule.label };
    }
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
  if (!/^[a-zA-Z\s.'-]+$/.test(raw)) {
    return { isValid: false, error: 'Name should only contain letters and spaces' };
  }
  const lower = raw.toLowerCase();
  if (['test', 'testing', 'asdf', 'qwerty', 'fake', 'fake name', 'none', 'null', 'na'].includes(lower)) {
    return { isValid: false, error: 'Please enter your genuine full name' };
  }
  return { isValid: true, normalized: raw };
}

export function validateNumber(value, options = {}) {
  const { min, max, integerOnly = false, fieldName = 'Value', required = true } = options;
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    if (!required) return { isValid: true, value: null };
    return { isValid: false, error: `${fieldName} is required` };
  }
  const num = Number(value);
  if (isNaN(num) || !isFinite(num)) {
    return { isValid: false, error: `${fieldName} must be a valid number` };
  }
  if (integerOnly && !Number.isInteger(num)) {
    return { isValid: false, error: `${fieldName} must be a whole number` };
  }
  if (min !== undefined && num < min) {
    return { isValid: false, error: `${fieldName} must be at least ${min}` };
  }
  if (max !== undefined && num > max) {
    return { isValid: false, error: `${fieldName} cannot exceed ${max}` };
  }
  return { isValid: true, value: num };
}

export function validatePrice(value, fieldName = 'Price') {
  return validateNumber(value, { min: 0, fieldName });
}

export function validatePercentage(value, fieldName = 'Percentage') {
  return validateNumber(value, { min: 0, max: 100, fieldName });
}

export function validateRating(value) {
  return validateNumber(value, { min: 1, max: 5, integerOnly: true, fieldName: 'Rating' });
}

export function validateGuests(value) {
  return validateNumber(value, { min: 1, max: 500, integerOnly: true, fieldName: 'Number of guests' });
}

export function validateInteger(value, options = {}) {
  return validateNumber(value, { ...options, integerOnly: true });
}
