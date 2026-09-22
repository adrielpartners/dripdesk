interface ApiFailurePayload {
  ok?: boolean;
  error?: {
    code?: string;
    message?: string;
  };
}

interface FetchLikeError {
  data?: unknown;
  response?: {
    _data?: unknown;
    status?: number;
  };
  status?: number;
  message?: string;
}

const ERROR_EXPLANATIONS: Record<string, string> = {
  BADREQUEST: 'Some information needs attention. Review the form and try again.',
  BAD_REQUEST: 'Some information needs attention. Review the form and try again.',
  VALIDATION_ERROR: 'Some information needs attention. Review the form and try again.',
  UNAUTHORIZED: 'The email or password you entered is incorrect. Check both and try again, or create an account.',
  FORBIDDEN: 'You are signed in, but you do not have permission to do that.',
  NOTFOUND: 'We could not find what you requested. It may have been removed or the link may be incorrect.',
  NOT_FOUND: 'We could not find what you requested. It may have been removed or the link may be incorrect.',
  CONFLICT: 'That action cannot be completed because the current information has changed or already exists. Refresh the page and try again.',
  GONE: 'This link is no longer available because it has expired or has already been used.',
  PAYLOADTOOLARGE: 'The information you submitted is too large. Remove some content and try again.',
  PAYLOAD_TOO_LARGE: 'The information you submitted is too large. Remove some content and try again.',
  UNPROCESSABLEENTITY: 'Some information could not be processed. Review the form and try again.',
  UNPROCESSABLE_ENTITY: 'Some information could not be processed. Review the form and try again.',
  TOOMANYREQUESTS: 'Too many attempts were made. Please wait a minute before trying again.',
  TOO_MANY_REQUESTS: 'Too many attempts were made. Please wait a minute before trying again.',
  THROTTLER: 'Too many attempts were made. Please wait a minute before trying again.',
  SERVICEUNAVAILABLE: 'This service is not available right now. Please try again shortly.',
  SERVICE_UNAVAILABLE: 'This service is not available right now. Please try again shortly.',
  INTERNALSERVERERROR: 'Something went wrong on our side. Please try again shortly.',
  INTERNAL_SERVER_ERROR: 'Something went wrong on our side. Please try again shortly.',
  HTTP_ERROR: 'The request could not be completed. Please try again.',
};

function normalizeCode(code: unknown) {
  return typeof code === 'string' ? code.trim().toUpperCase() : '';
}

function asApiFailure(value: unknown): ApiFailurePayload | null {
  if (!value || typeof value !== 'object') return null;

  const payload = value as ApiFailurePayload;
  return payload.error && typeof payload.error === 'object' ? payload : null;
}

function getFailurePayload(error: unknown) {
  const directPayload = asApiFailure(error);
  if (directPayload) return directPayload;

  if (!error || typeof error !== 'object') return null;
  const fetchError = error as FetchLikeError;

  return asApiFailure(fetchError.data) ?? asApiFailure(fetchError.response?._data);
}

function isNetworkFailure(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const fetchError = error as FetchLikeError;
  return !fetchError.status && !fetchError.response?.status;
}

export function getApiErrorMessage(error: unknown, fallback = 'The request could not be completed. Please try again.') {
  const payload = getFailurePayload(error);
  const code = normalizeCode(payload?.error?.code);
  const explanation = ERROR_EXPLANATIONS[code];

  if (explanation) return explanation;
  if (isNetworkFailure(error)) return 'We could not reach DripDesk. Check your connection and try again.';

  const serverMessage = payload?.error?.message;
  return typeof serverMessage === 'string' && serverMessage.trim() ? serverMessage : fallback;
}
