export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');

  if (!apiUrl) {
    throw new Error('Falta configurar EXPO_PUBLIC_API_URL');
  }

  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');

  if (options.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      'No se pudo conectar con el servidor. Comprueba la red y que NestJS esté ejecutándose.',
    );
  }

  const raw = await response.text();
  let body: unknown = null;

  if (raw) {
    try {
      body = JSON.parse(raw) as unknown;
    } catch {
      body = raw;
    }
  }

  if (!response.ok) {
    let message = `Error HTTP ${response.status}`;

    if (typeof body === 'object' && body !== null && 'message' in body) {
      const value = body.message;

      if (typeof value === 'string') {
        message = value;
      } else if (Array.isArray(value)) {
        message = value.map(String).join(', ');
      }
    }

    throw new ApiError(response.status, message);
  }

  return body as T;
}
