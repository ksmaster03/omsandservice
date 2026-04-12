import api from './api';

export interface TechUser {
  id: string;
  email: string;
  name: string;
  role: 'INSTALL' | 'SERVICE' | 'ADMIN';
}

export interface TechTicket {
  id: string;
  ticketNo: string;
  problemType: 'BELT' | 'NOISE' | 'CONSOLE' | 'MOTOR' | 'POWER' | 'PM' | 'OTHER';
  priority: 'URGENT' | 'NORMAL' | 'LOW';
  description: string;
  stage: 'RECEIVED' | 'ASSIGNED' | 'EN_ROUTE' | 'ARRIVED' | 'REPAIRING' | 'CLOSED' | 'CANCELLED';
  locationLat: string | null;
  locationLng: string | null;
  locationAddress: string | null;
  locationDetail: string | null;
  slaDueAt: string | null;
  createdAt: string;
  customer: { id: string; name: string; phone: string | null; address: string | null };
  asset: { id: string; serialNo: string; product: { id: string; name: string; sku: string; brand: string } };
}

export async function login(email: string, password: string) {
  const res = await api.post('/auth/login', { email, password });
  const { accessToken, user } = res.data.data;
  if (!['INSTALL', 'SERVICE', 'ADMIN'].includes(user.role)) {
    throw new Error('Only install/service technicians can use this app');
  }
  localStorage.setItem('techAccessToken', accessToken);
  return user as TechUser;
}

export async function getMe() {
  const res = await api.get('/auth/me');
  return res.data.data.user as TechUser;
}

export async function logout() {
  localStorage.removeItem('techAccessToken');
}

export async function getMyTickets() {
  const res = await api.get('/tech/me/tickets');
  return res.data.data as TechTicket[];
}

export async function updateTicketStage(id: string, stage: string, note?: string) {
  const res = await api.post(`/tech/tickets/${id}/stage`, { stage, note });
  return res.data.data;
}

export async function pingLocation(lat: number, lng: number, activeTicketId?: string) {
  const res = await api.post('/tech/location', { lat, lng, activeTicketId });
  return res.data.data;
}

export async function getTechSettings() {
  const res = await api.get('/tech/settings');
  return res.data.data as Record<string, string>;
}

export interface TechPmJob {
  id: string;
  scheduledAt: string;
  status: string;
  asset: {
    id: string;
    serialNo: string;
    customer: { id: string; name: string; phone: string | null };
    product: { id: string; name: string; sku: string; pmIntervalMonths: number };
  };
}

export async function getMyPmJobs() {
  const res = await api.get('/tech/me/pm');
  return res.data.data as TechPmJob[];
}
