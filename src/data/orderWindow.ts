import type { Order } from '@/types';

/** Customer self-service window: 24 hours from submission. */
export const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function msLeftToEdit(order: Order, now = Date.now()): number {
  return new Date(order.createdAt).getTime() + EDIT_WINDOW_MS - now;
}

/** An order can be edited/rolled back only while new, within 24h. */
export function canCustomerModify(order: Order, now = Date.now()): boolean {
  return order.status === 'new' && msLeftToEdit(order, now) > 0;
}

export function editWindowHoursLeft(order: Order, now = Date.now()): number {
  return Math.max(0, Math.floor(msLeftToEdit(order, now) / (60 * 60 * 1000)));
}
