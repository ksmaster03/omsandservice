import type { ListQuery } from '@oms/shared';

export interface PaginationArgs {
  skip: number;
  take: number;
}

export function toPrismaPagination(q: ListQuery): PaginationArgs {
  return {
    skip: (q.page - 1) * q.pageSize,
    take: q.pageSize,
  };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function paginate<T>(items: T[], total: number, q: ListQuery): Paginated<T> {
  return {
    items,
    total,
    page: q.page,
    pageSize: q.pageSize,
    totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
  };
}
