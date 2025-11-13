const SUPPORTED_LANGUAGES = ['es', 'en'];
const DEFAULT_LANGUAGE = 'es';

const normalizeLanguage = (value = '') => {
  if (!value) return null;
  const lower = value.toLowerCase();
  return SUPPORTED_LANGUAGES.find(code => lower === code || lower.startsWith(`${code}-`)) || null;
};

const parseAcceptLanguageHeader = (headerValue = '') => {
  if (!headerValue) return null;
  const candidates = headerValue
    .split(',')
    .map(part => part.trim().split(';')[0])
    .filter(Boolean);
  for (const candidate of candidates) {
    const normalized = normalizeLanguage(candidate);
    if (normalized) return normalized;
  }
  return null;
};

export const languageMiddleware = (req, res, next) => {
  try {
    const fromBody = normalizeLanguage(req.body?.language);
    const fromQuery = normalizeLanguage(req.query?.lang);
    const fromHeader = parseAcceptLanguageHeader(req.headers['accept-language']);

    const resolved = fromBody || fromQuery || fromHeader || DEFAULT_LANGUAGE;

    req.locale = resolved;
    res.locals.language = resolved;
    res.setHeader('Content-Language', resolved);
  } catch (error) {
    req.locale = DEFAULT_LANGUAGE;
    res.locals.language = DEFAULT_LANGUAGE;
    res.setHeader('Content-Language', DEFAULT_LANGUAGE);
  }

  next();
};

export default languageMiddleware;
