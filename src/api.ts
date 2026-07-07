'use client';

// Full-stack API client. Talks to the backend over HTTP.
// The deploy pipeline injects NEXT_PUBLIC_API_URL automatically.
export const API_BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
  'http://localhost:4000';

const TOKEN_KEY = 'teamhub_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export interface ApiUser { id: string; name: string; email: string; role: string; avatar: string; }
export interface ApiTask {
  id: string; project_id: string; title: string; description: string;
  assignee: string; due_date: string; priority: string; status: string;
}
export interface ApiProject {
  id: string; name: string; icon: string; color: string; description: string; archived: boolean;
}

export const api = {
  health: () => request<{ status: string }>('/health'),
  me: () => request<{ user: ApiUser }>('/auth/me'),
  signup: (name: string, email: string, password: string) =>
    request<{ token: string; user: ApiUser }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),
  login: (email: string, password: string) =>
    request<{ token: string; user: ApiUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  listProjects: () => request<{ projects: ApiProject[] }>('/projects'),
  createProject: (p: Partial<ApiProject>) =>
    request<{ project: ApiProject }>('/projects', { method: 'POST', body: JSON.stringify(p) }),
  updateProject: (id: string, p: Partial<ApiProject>) =>
    request<{ project: ApiProject }>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(p) }),
  deleteProject: (id: string) => request<{ ok: boolean }>(`/projects/${id}`, { method: 'DELETE' }),
  listTasks: (projectId?: string) =>
    request<{ tasks: ApiTask[] }>(`/tasks${projectId ? `?projectId=${projectId}` : ''}`),
  createTask: (t: Partial<ApiTask> & { projectId?: string; dueDate?: string }) =>
    request<{ task: ApiTask }>('/tasks', { method: 'POST', body: JSON.stringify(t) }),
  updateTask: (id: string, t: Partial<ApiTask> & { dueDate?: string }) =>
    request<{ task: ApiTask }>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(t) }),
  deleteTask: (id: string) => request<{ ok: boolean }>(`/tasks/${id}`, { method: 'DELETE' }),
};
