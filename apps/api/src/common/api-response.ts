export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiFailure {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export function ok<T>(data: T): ApiSuccess<T> {
  return { ok: true, data };
}
