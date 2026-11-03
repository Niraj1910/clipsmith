import type {
  UserDto,
  VideoDto,
  Paginated,
  ErrorBody,
  ErrorCode,
} from '@clipper/shared/dto';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export class ApiError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_URL}${path}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  let body: any;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    if (body && typeof body === 'object' && 'error' in body) {
      const errBody = body as ErrorBody;
      throw new ApiError(errBody.error.code, errBody.error.message, errBody.error.details);
    }
    throw new ApiError('INTERNAL', `Request failed with status ${res.status}`);
  }

  return body as T;
}

export interface HealthResponse {
  status: string;
  mongo: 'up' | 'down';
  redis: 'up' | 'down';
}

export const api = {
  getHealth(): Promise<HealthResponse> {
    return request<HealthResponse>('/health');
  },

  async signup(data: { email: string; password: string; name?: string }): Promise<{ user: UserDto }> {
    return request<{ user: UserDto }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async login(data: { email: string; password: string }): Promise<{ user: UserDto }> {
    return request<{ user: UserDto }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async logout(): Promise<void> {
    return request<void>('/api/auth/logout', {
      method: 'POST',
    });
  },

  async getMe(): Promise<{ user: UserDto }> {
    return request<{ user: UserDto }>('/api/auth/me', {
      method: 'GET',
    });
  },

  async listVideos(page = 1, limit = 20): Promise<Paginated<VideoDto>> {
    return request<Paginated<VideoDto>>(`/api/videos?page=${page}&limit=${limit}`, {
      method: 'GET',
    });
  },

  async getVideo(id: string): Promise<{
    video: VideoDto;
    transcript: null;
    clips: never[];
    latestJob: null;
  }> {
    return request(`/api/videos/${id}`, {
      method: 'GET',
    });
  },

  uploadVideo(
    file: File,
    title?: string,
    onProgress?: (progressPercent: number) => void
  ): Promise<{ video: VideoDto }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);
      if (title && title.trim()) {
        formData.append('title', title.trim());
      }

      xhr.open('POST', `${API_URL}/api/videos/upload`);
      xhr.withCredentials = true;

      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        let body: any;
        try {
          body = JSON.parse(xhr.responseText);
        } catch {
          body = null;
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(body as { video: VideoDto });
        } else {
          if (body && typeof body === 'object' && 'error' in body) {
            const errBody = body as ErrorBody;
            reject(new ApiError(errBody.error.code, errBody.error.message, errBody.error.details));
          } else {
            reject(new ApiError('INTERNAL', `Upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new ApiError('INTERNAL', 'Network error occurred during video upload'));
      };

      xhr.send(formData);
    });
  },
};
