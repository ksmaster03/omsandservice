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
