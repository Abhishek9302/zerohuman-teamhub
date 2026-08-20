export interface AuthResponse {
  token: string;
  user: {
    id: number;
    email: string;
  };
}

export interface ShortLink {
  id: number;
  slug: string;
  target_url: string;
  clicks: number;
  owner_id: number;
  created_at: string;
}

export interface ApiError {
  error: string;
}
