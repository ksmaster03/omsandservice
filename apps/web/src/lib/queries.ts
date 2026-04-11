import api from './api';

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  [key: string]: unknown;
}

export async function listCustomers(params: ListParams = {}) {
  const res = await api.get('/internal/customers', { params });
  return res.data.data as Paginated<Customer>;
}

export async function createCustomer(payload: Partial<Customer>) {
  const res = await api.post('/internal/customers', payload);
  return res.data.data as Customer;
}

export async function listProducts(params: ListParams = {}) {
  const res = await api.get('/internal/products', { params });
  return res.data.data as Paginated<Product>;
}

export async function createProduct(payload: Partial<Product>) {
  const res = await api.post('/internal/products', payload);
  return res.data.data as Product;
}

export async function listUsers(params: ListParams = {}) {
  const res = await api.get('/internal/users', { params });
  return res.data.data as Paginated<User>;
}

export async function createUser(payload: {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: 'SALES' | 'INSTALL' | 'SERVICE' | 'ADMIN';
}) {
  const res = await api.post('/internal/users', payload);
  return res.data.data as User;
}

// ─── Leads ───
export async function listLeads(params: ListParams = {}) {
  const res = await api.get('/internal/leads', { params });
  return res.data.data as Paginated<Lead>;
}

export async function getLeadPipeline() {
  const res = await api.get('/internal/leads/pipeline');
  return res.data.data as Record<string, Lead[]>;
}

export async function createLead(payload: {
  customerId: string;
  value: number;
  stage?: string;
  note?: string;
}) {
  const res = await api.post('/internal/leads', payload);
  return res.data.data as Lead;
}

export async function updateLeadStage(id: string, stage: string, note?: string) {
  const res = await api.post(`/internal/leads/${id}/stage`, { stage, note });
  return res.data.data as Lead;
}

export async function listDemos(params: { from?: string; to?: string; status?: string } = {}) {
  const res = await api.get('/internal/leads/demos', { params });
  return res.data.data as Demo[];
}

export async function createDemo(payload: {
  leadId: string;
  productId: string;
  scheduledAt: string;
  note?: string;
}) {
  const res = await api.post('/internal/leads/demos', payload);
  return res.data.data as Demo;
}

export interface Demo {
  id: string;
  leadId: string;
  productId: string;
  scheduledAt: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  note: string | null;
  product: { id: string; name: string; brand: string; sku: string };
  lead: {
    id: string;
    customer: { id: string; name: string; phone: string | null };
  };
}

// ─── Quotations ───
export async function listQuotations(params: ListParams = {}) {
  const res = await api.get('/internal/quotations', { params });
  return res.data.data as Paginated<Quotation>;
}

export async function getQuotation(id: string) {
  const res = await api.get(`/internal/quotations/${id}`);
  return res.data.data as QuotationDetail;
}

export async function createQuotation(payload: {
  customerId: string;
  leadId?: string;
  items: Array<{ productId: string; qty: number; unitPrice: number; discount?: number }>;
  discount?: number;
  vatRate?: number;
  validDays?: number;
}) {
  const res = await api.post('/internal/quotations', payload);
  return res.data.data as Quotation;
}

export async function updateQuotationStatus(id: string, status: string) {
  const res = await api.post(`/internal/quotations/${id}/status`, { status });
  return res.data.data as Quotation;
}

/**
 * Download quotation PDF. Requires auth header so we can't just point
 * window.open at the URL — fetch the bytes then trigger a download.
 */
export async function downloadQuotationPdf(id: string, quoteNo: string): Promise<void> {
  const res = await api.get(`/internal/quotations/${id}/pdf`, {
    responseType: 'blob',
  });
  const blob = new Blob([res.data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${quoteNo}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// ─── Sales Orders ───
export async function listSalesOrders(params: ListParams = {}) {
  const res = await api.get('/internal/sales-orders', { params });
  return res.data.data as Paginated<SalesOrder>;
}

export async function getSalesOrder(id: string) {
  const res = await api.get(`/internal/sales-orders/${id}`);
  return res.data.data as SalesOrderDetail;
}

export async function createSOFromQuote(
  quotationId: string,
  milestoneTemplate: '30_30_40' | '50_50' | 'FULL' = '30_30_40',
) {
  const res = await api.post('/internal/sales-orders/from-quote', {
    quotationId,
    milestoneTemplate,
  });
  return res.data.data as SalesOrderDetail;
}

// ─── Installations (Sprint 3) ───
export async function listInstallations(params: ListParams = {}) {
  const res = await api.get('/internal/installations', { params });
  return res.data.data as Paginated<Installation>;
}

export async function getInstallation(id: string) {
  const res = await api.get(`/internal/installations/${id}`);
  return res.data.data as InstallationDetail;
}

export async function scheduleInstallation(payload: {
  soId: string;
  scheduledAt: string;
  techId?: string;
}) {
  const res = await api.post('/internal/installations', payload);
  return res.data.data as Installation;
}

export async function assignInstallation(id: string, techId: string, scheduledAt?: string) {
  const res = await api.post(`/internal/installations/${id}/assign`, { techId, scheduledAt });
  return res.data.data as Installation;
}

export async function completeInstallation(
  id: string,
  payload: { assets: Array<{ soItemId: string; serialNo: string }>; note?: string; locationDetail?: string },
) {
  const res = await api.post(`/internal/installations/${id}/complete`, payload);
  return res.data.data;
}

export async function uploadInstallationPhotos(id: string, files: File[]) {
  const fd = new FormData();
  for (const f of files) fd.append('photo', f);
  const res = await api.post(`/internal/installations/${id}/photos`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

// ─── Assets ───
export async function listAssets(params: ListParams = {}) {
  const res = await api.get('/internal/assets', { params });
  return res.data.data as Paginated<Asset>;
}

export async function getAsset(id: string) {
  const res = await api.get(`/internal/assets/${id}`);
  return res.data.data as AssetDetail;
}

// ─── PM Schedules ───
export async function listPmSchedules(params: ListParams & { upcoming?: boolean } = {}) {
  const res = await api.get('/internal/pm-schedules', { params });
  return res.data.data as Paginated<PmScheduleItem>;
}

export async function assignPm(id: string, techId: string) {
  const res = await api.post(`/internal/pm-schedules/${id}/assign`, { techId });
  return res.data.data;
}

export async function completePm(id: string, note?: string) {
  const res = await api.post(`/internal/pm-schedules/${id}/complete`, { note });
  return res.data.data;
}

// ─── Service Tickets ───
export async function listTickets(params: ListParams = {}) {
  const res = await api.get('/internal/tickets', { params });
  return res.data.data as Paginated<ServiceTicket>;
}

export async function getTicket(id: string) {
  const res = await api.get(`/internal/tickets/${id}`);
  return res.data.data as ServiceTicketDetail;
}

export async function createTicket(payload: {
  customerId: string;
  assetId: string;
  problemType: string;
  priority: string;
  description: string;
  locationDetail?: string;
}) {
  const res = await api.post('/internal/tickets', payload);
  return res.data.data as ServiceTicket;
}

export async function assignTicket(id: string, techId: string) {
  const res = await api.post(`/internal/tickets/${id}/assign`, { techId });
  return res.data.data;
}

export async function updateTicketStage(id: string, stage: string, note?: string) {
  const res = await api.post(`/internal/tickets/${id}/stage`, { stage, note });
  return res.data.data;
}

// ─── Sprint 3 domain types ───
export interface Installation {
  id: string;
  soId: string;
  scheduledAt: string;
  completedAt: string | null;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  techId: string | null;
  note: string | null;
  photos: string[];
  so: { id: string; soNo: string; customer: { id: string; name: string; phone: string | null } };
  tech: { id: string; name: string; phone: string | null } | null;
}

export interface InstallationDetail extends Installation {
  so: Installation['so'] & {
    customer: Customer;
    items: Array<{
      id: string;
      qty: number;
      unitPrice: string;
      product: Product;
    }>;
  };
}

export interface Asset {
  id: string;
  serialNo: string;
  installedAt: string;
  warrantyEnd: string;
  nextPmDate: string | null;
  locationDetail: string | null;
  product: { id: string; name: string; brand: string; sku: string; warrantyMonths: number; pmIntervalMonths: number };
  customer: { id: string; name: string };
  warrantyStatus: 'active' | 'expiring' | 'expired';
  warrantyDaysLeft: number;
  _count: { tickets: number; pmSchedules: number };
}

export interface AssetDetail extends Asset {
  pmSchedules: PmScheduleItem[];
  tickets: ServiceTicket[];
}

export interface PmScheduleItem {
  id: string;
  assetId: string;
  scheduledAt: string;
  completedAt: string | null;
  status: 'PENDING' | 'SCHEDULED' | 'COMPLETED' | 'OVERDUE' | 'SKIPPED';
  techId: string | null;
  note: string | null;
  asset: {
    id: string;
    serialNo: string;
    customer: { id: string; name: string; phone: string | null };
    product: { id: string; name: string; brand: string; sku: string; pmIntervalMonths: number };
  };
  tech: { id: string; name: string; phone: string | null } | null;
}

export type TicketStage =
  | 'RECEIVED'
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'REPAIRING'
  | 'CLOSED'
  | 'CANCELLED';

export interface ServiceTicket {
  id: string;
  ticketNo: string;
  problemType: 'BELT' | 'NOISE' | 'CONSOLE' | 'MOTOR' | 'POWER' | 'OTHER';
  priority: 'URGENT' | 'NORMAL' | 'LOW';
  description: string;
  stage: TicketStage;
  slaDueAt: string | null;
  closedAt: string | null;
  customerRating: number | null;
  createdAt: string;
  customer: { id: string; name: string; phone: string | null };
  asset: { id: string; serialNo: string; product: { id: string; name: string; sku: string } };
  tech: { id: string; name: string; phone: string | null } | null;
  _count?: { photos: number; events: number };
}

export interface ServiceTicketDetail extends ServiceTicket {
  photos: Array<{ id: string; s3Key: string; size: number }>;
  events: Array<{
    id: string;
    stage: TicketStage;
    note: string | null;
    createdAt: string;
    actor: { id: string; name: string } | null;
  }>;
}

export async function markMilestonePaid(milestoneId: string) {
  const res = await api.post(`/internal/sales-orders/milestones/${milestoneId}/mark-paid`);
  return res.data.data;
}

// ─── Warranty Renewals (Sprint 4) ───
export async function listRenewals(params: ListParams = {}) {
  const res = await api.get('/internal/renewals', { params });
  return res.data.data as Paginated<Renewal>;
}

export async function listRenewalCandidates() {
  const res = await api.get('/internal/renewals/candidates');
  return res.data.data as RenewalCandidate[];
}

export async function createRenewalOffer(payload: {
  assetId: string;
  type: 'STANDARD' | 'PREMIUM';
  price: number;
  extendMonths: number;
}) {
  const res = await api.post('/internal/renewals', payload);
  return res.data.data;
}

export async function updateRenewalStatus(id: string, status: string) {
  const res = await api.post(`/internal/renewals/${id}/status`, { status });
  return res.data.data;
}

// ─── WMS ───
export async function getWmsStatus() {
  const res = await api.get('/internal/wms/status');
  return res.data.data as { mode: 'mock' | 'live'; connected: string };
}

export async function listWmsSyncLogs(params: { status?: string; entity?: string; page?: number } = {}) {
  const res = await api.get('/internal/wms/sync-logs', { params });
  return res.data.data as Paginated<WmsSyncLog>;
}

// ─── Reports ───
export async function getReportsSummary() {
  const res = await api.get('/internal/reports/summary');
  return res.data.data as ReportsSummary;
}

export async function getReportsPipeline() {
  const res = await api.get('/internal/reports/pipeline');
  return res.data.data as Record<string, { count: number; totalValue: number }>;
}

export async function getReportsSalesByBrand() {
  const res = await api.get('/internal/reports/sales-by-brand');
  return res.data.data as Record<string, { qty: number; revenue: number }>;
}

export async function getReportsTicketsByStage() {
  const res = await api.get('/internal/reports/tickets-by-stage');
  return res.data.data as Record<string, number>;
}

// ─── Sprint 4 domain types ───
export interface Renewal {
  id: string;
  assetId: string;
  type: 'STANDARD' | 'PREMIUM';
  price: string;
  status: 'OFFERED' | 'ACCEPTED' | 'PAID' | 'EXPIRED';
  newEndDate: string | null;
  paidAt: string | null;
  createdAt: string;
  asset: {
    id: string;
    serialNo: string;
    warrantyEnd: string;
    product: { id: string; name: string; sku: string; brand: string };
    customer: { id: string; name: string };
  };
}

export interface RenewalCandidate {
  id: string;
  serialNo: string;
  warrantyEnd: string;
  daysLeft: number;
  product: { id: string; name: string; sku: string; brand: string; price: string };
  customer: { id: string; name: string; phone: string | null };
  suggestedPrice: { standard12: number; premium12: number };
}

export interface WmsSyncLog {
  id: string;
  entity: string;
  action: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'RETRY';
  errorMsg: string | null;
  requestJson: unknown;
  responseJson: unknown;
  createdAt: string;
}

export interface ReportsSummary {
  sales: {
    customers: number;
    activeLeads: number;
    quotesThisMonth: number;
    soThisMonth: number;
    revenueThisMonth: number;
  };
  operations: {
    installsPending: number;
    assetsTotal: number;
  };
  afterSales: {
    ticketsOpen: number;
    warrantyExpiring60d: number;
    pmDueSoon60d: number;
  };
}

// ─── Sprint 2 domain types ───
export type LeadStage = 'LEAD' | 'QUALIFIED' | 'DEMO' | 'QUOTE' | 'NEGOTIATION' | 'WON' | 'LOST';

export interface Lead {
  id: string;
  stage: LeadStage;
  value: string;
  expectedClose: string | null;
  note: string | null;
  customer: { id: string; name: string };
  owner?: { id: string; name: string };
  createdAt: string;
}

export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export interface Quotation {
  id: string;
  quoteNo: string;
  status: QuoteStatus;
  subtotal: string;
  discount: string;
  vat: string;
  total: string;
  validUntil: string;
  customer: { id: string; name: string };
  sales?: { id: string; name: string };
  createdAt: string;
}

export interface QuotationDetail extends Quotation {
  items: Array<{
    id: string;
    productId: string;
    qty: number;
    unitPrice: string;
    discount: string;
    product: Product;
  }>;
  order: { id: string; soNo: string; status: string } | null;
}

export interface PaymentMilestone {
  id: string;
  seq: number;
  label: string;
  amount: string;
  dueDate: string;
  paidAt: string | null;
  status: 'PENDING' | 'DUE' | 'PAID' | 'OVERDUE';
}

export type SOStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PRODUCTION'
  | 'READY_TO_DELIVER'
  | 'INSTALLED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface SalesOrder {
  id: string;
  soNo: string;
  status: SOStatus;
  total: string;
  createdAt: string;
  customer: { id: string; name: string };
  paymentProgress?: string;
}

export interface SalesOrderDetail extends SalesOrder {
  items: Array<{
    id: string;
    qty: number;
    unitPrice: string;
    product: Product;
  }>;
  milestones: PaymentMilestone[];
  quotation: { id: string; quoteNo: string } | null;
}

// Domain types (mirror Prisma models, but only the fields we use in the UI)
export interface Customer {
  id: string;
  name: string;
  taxId: string | null;
  type: 'INDIVIDUAL' | 'CORPORATE';
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  createdAt: string;
}

export interface Product {
  id: string;
  sku: string;
  brand: 'MAXNUM' | 'GORILLA_TECK' | 'ANYFIT' | 'IMPULSE';
  name: string;
  category: string;
  price: string; // prisma Decimal serialized as string
  warrantyMonths: number;
  pmIntervalMonths: number;
  active: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: 'SALES' | 'INSTALL' | 'SERVICE' | 'ADMIN';
  active: boolean;
  createdAt: string;
}
