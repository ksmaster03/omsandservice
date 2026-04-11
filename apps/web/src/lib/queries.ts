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

export async function markMilestonePaid(milestoneId: string) {
  const res = await api.post(`/internal/sales-orders/milestones/${milestoneId}/mark-paid`);
  return res.data.data;
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
