export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } };

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'SALES' | 'INSTALL' | 'SERVICE' | 'ADMIN';
}

export interface CustomerSession {
  customerUserId: string;
  customerId: string;
  lineUserId: string | null;
  displayName: string;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface TicketTracking {
  ticketId: string;
  stage: string;
  tech: { id: string; name: string; phone: string | null } | null;
  location: GeoPoint | null;
  etaMinutes: number | null;
  updatedAt: string;
}
