export interface WxQrData {
  ticket: string;
  expire_seconds: number;
  url: string;
}

export interface WxPending {
  status: 'pending' | 'scanned' | 'confirming' | 'expired';
}

export interface WxToken {
  token: {
    access_token: string;
    token_type: string;
    expires_in: number;
  };
  user: {
    id: string;
    email?: string;
    name?: string;
    avatar?: string;
  };
}

export interface ApiSuccess<T> {
  code: number;
  data: T;
  message: string;
}

export interface WxExchangeEmailLike {
  email: string;
}
