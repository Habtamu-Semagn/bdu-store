import type {
  AdminReleaseRequest,
  AdminStats,
  Device,
  DeviceInput,
  LoginInput,
  LoginResult,
  ProductType,
  RegisterInput,
  ReleaseRequestView,
  ReleaseStatus,
  StorageStatus,
  User,
} from '@/types/api';

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

interface ApiErrorBody {
  message?: string | string[];
  errors?: Array<{ field: string; messages: string[] }>;
}

/** Error thrown for any non-2xx API response, carrying per-field messages. */
export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;

  constructor(
    message: string,
    status: number,
    fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

function firstMessage(message: string | string[] | undefined): string {
  if (Array.isArray(message)) return message[0] ?? 'Something went wrong.';
  return message ?? 'Something went wrong.';
}

function toFieldErrors(
  errors: ApiErrorBody['errors'],
): Record<string, string> {
  if (!Array.isArray(errors)) return {};
  return errors.reduce<Record<string, string>>((acc, issue) => {
    if (issue?.field && issue.messages?.length) {
      acc[issue.field] = issue.messages[0];
    }
    return acc;
  }, {});
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

/**
 * Single fetch wrapper for the whole app.
 *
 * `credentials: 'include'` is what carries the HttpOnly auth cookie, and the
 * `{ success, data }` envelope is unwrapped here so callers see plain data.
 */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      credentials: 'include',
      cache: 'no-store',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch {
    throw new ApiError(
      'Could not reach the BDU Store server. Check that the API is running.',
      0,
    );
  }

  const text = await response.text();
  let payload: (ApiErrorBody & { data?: unknown }) | null = null;
  if (text) {
    try {
      payload = JSON.parse(text) as ApiErrorBody & { data?: unknown };
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      firstMessage(payload?.message),
      response.status,
      toFieldErrors(payload?.errors),
    );
  }

  return (payload?.data ?? null) as T;
}

export const api = {
  auth: {
    register: (input: RegisterInput) =>
      request<User>('/auth/register', { method: 'POST', body: input }),
    login: (input: LoginInput) =>
      request<LoginResult>('/auth/login', { method: 'POST', body: input }),
    logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),
    me: () => request<User>('/auth/me'),
  },

  devices: {
    listMine: () => request<Device[]>('/devices/my'),
    get: (id: string) => request<Device>(`/devices/${id}`),
    create: (input: DeviceInput) =>
      request<Device>('/devices', { method: 'POST', body: input }),
    requestRelease: (id: string) =>
      request<ReleaseRequestView>(`/devices/${id}/release-requests`, {
        method: 'POST',
      }),
  },

  admin: {
    stats: () => request<AdminStats>('/admin/stats'),
    storageRequests: (status: StorageStatus = 'PENDING') =>
      request<Device[]>(`/admin/storage-requests?status=${status}`),
    storedDevices: () => request<Device[]>('/admin/devices/stored'),
    approveStorage: (id: string) =>
      request<Device>(`/admin/devices/${id}/approve-storage`, { method: 'PATCH' }),
    rejectStorage: (id: string, rejectionReason: string) =>
      request<Device>(`/admin/devices/${id}/reject-storage`, {
        method: 'PATCH',
        body: { rejectionReason },
      }),
    releaseRequests: (status: ReleaseStatus = 'PENDING') =>
      request<AdminReleaseRequest[]>(`/admin/release-requests?status=${status}`),
    approveRelease: (id: string) =>
      request<{ releaseRequest: ReleaseRequestView; device: Device }>(
        `/admin/release-requests/${id}/approve`,
        { method: 'PATCH' },
      ),
    rejectRelease: (id: string, rejectionReason: string) =>
      request<{ releaseRequest: ReleaseRequestView; device: Device }>(
        `/admin/release-requests/${id}/reject`,
        { method: 'PATCH', body: { rejectionReason } },
      ),
  },
};

export type { ProductType };
