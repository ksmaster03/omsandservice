import api from './api';

// ─── Types ─────────────────────────────────────────────────────
export interface CustomerMe {
  id: string;
  displayName: string;
  phone: string | null;
  customer: { id: string; name: string; phone: string | null; email: string | null; address: string | null };
}

export type WarrantyStatus = 'active' | 'expiring' | 'expired';

export interface Asset {
  id: string;
  serialNo: string;
  installedAt: string;
  warrantyEnd: string;
  nextPmDate: string | null;
  locationDetail: string | null;
  product: { id: string; name: string; brand: string; sku: string; warrantyMonths: number; pmIntervalMonths: number };
  warrantyStatus: WarrantyStatus;
  warrantyDaysLeft: number;
  _count: { tickets: number; pmSchedules: number };
}

export interface AssetDetail extends Asset {
  pmSchedules: Array<{ id: string; scheduledAt: string; status: string; completedAt: string | null; note: string | null }>;
  tickets: Array<{ id: string; ticketNo: string; problemType: string; stage: string; createdAt: string }>;
}

export type TicketStage = 'RECEIVED' | 'ASSIGNED' | 'EN_ROUTE' | 'ARRIVED' | 'REPAIRING' | 'CLOSED' | 'CANCELLED';
export type ProblemType = 'BELT' | 'NOISE' | 'CONSOLE' | 'MOTOR' | 'POWER' | 'PM' | 'OTHER';
export type Priority = 'URGENT' | 'NORMAL' | 'LOW';

export interface Ticket {
  id: string;
  ticketNo: string;
  problemType: ProblemType;
  priority: Priority;
  description: string;
  stage: TicketStage;
  slaDueAt: string | null;
  closedAt: string | null;
  createdAt: string;
  locationDetail: string | null;
  asset: { id: string; serialNo: string; product: { id: string; name: string; sku: string } };
  tech: { id: string; name: string; phone: string | null } | null;
}

export interface TicketDetail extends Ticket {
  events: Array<{ id: string; stage: TicketStage; note: string | null; createdAt: string }>;
  photos: Array<{ id: string; s3Key: string }>;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface Renewal {
  id: string;
  type: 'STANDARD' | 'PREMIUM';
  price: string;
  status: 'OFFERED' | 'ACCEPTED' | 'PAID' | 'EXPIRED';
  newEndDate: string | null;
  paidAt: string | null;
  createdAt: string;
  asset: { id: string; serialNo: string; product: { id: string; name: string; sku: string } };
}

// ─── Auth ──────────────────────────────────────────────────────
export async function requestOtp(phone: string) {
  const res = await api.post('/customer/auth/request-otp', { phone });
  return res.data.data as { sent: boolean; dev_code?: string };
}

export async function verifyOtp(phone: string, code: string) {
  const res = await api.post('/customer/auth/verify-otp', { phone, code });
  const { accessToken, user } = res.data.data;
  localStorage.setItem('customerAccessToken', accessToken);
  return user as { id: string; customerId: string; displayName: string; phone: string };
}

export async function getMe() {
  const res = await api.get('/customer/auth/me');
  return res.data.data as CustomerMe;
}

export function logout() {
  localStorage.removeItem('customerAccessToken');
}

// ─── Data ──────────────────────────────────────────────────────
export async function listAssets() {
  const res = await api.get('/customer/assets');
  return res.data.data as Asset[];
}

export async function getAsset(id: string) {
  const res = await api.get(`/customer/assets/${id}`);
  return res.data.data as AssetDetail;
}

export async function listTickets() {
  const res = await api.get('/customer/tickets');
  return res.data.data as Ticket[];
}

export async function getTicket(id: string) {
  const res = await api.get(`/customer/tickets/${id}`);
  return res.data.data as TicketDetail;
}

export async function createTicket(payload: {
  assetId: string;
  problemType: ProblemType;
  priority: Priority;
  description: string;
  locationDetail?: string;
}) {
  const res = await api.post('/customer/tickets', payload);
  return res.data.data as Ticket;
}

export async function listNotifications() {
  const res = await api.get('/customer/notifications');
  return res.data.data as Notification[];
}

export async function markNotificationRead(id: string) {
  const res = await api.post(`/customer/notifications/${id}/read`);
  return res.data.data;
}

export async function listRenewals() {
  const res = await api.get('/customer/renewals');
  return res.data.data as Renewal[];
}

// ─── RMA ───
export interface CustomerRma {
  id: string;
  rmaNo: string;
  stage: string;
  reason: string;
  description: string;
  createdAt: string;
  asset: { id: string; serialNo: string; product: { id: string; name: string; sku: string } };
}

export async function listRmas() {
  const res = await api.get('/customer/rmas');
  return res.data.data as CustomerRma[];
}

export async function createRma(payload: { assetId: string; reason: string; description: string }) {
  const res = await api.post('/customer/rmas', payload);
  return res.data.data as CustomerRma;
}
