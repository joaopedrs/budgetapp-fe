/**
 * Generic envelope returned by any paginated endpoint.
 * Mirrors `BudgetApp.Application.DTOs.Common.PagedResult<T>` from the backend.
 */
export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
}
