import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canCustomerModify, editWindowHoursLeft, msLeftToEdit, EDIT_WINDOW_MS } from './orderWindow';
import type { Order } from '@/types';

function order(createdAt: string, status: Order['status'] = 'new'): Order {
  return { createdAt, status } as Order;
}

test('new order within 24h is editable', () => {
  const now = new Date('2026-11-20T12:00:00Z').getTime();
  const o = order(new Date(now - 60 * 60 * 1000).toISOString());
  assert.equal(canCustomerModify(o, now), true);
  assert.equal(editWindowHoursLeft(o, now), 23);
});

test('order older than 24h is not editable', () => {
  const now = new Date('2026-11-20T12:00:00Z').getTime();
  const o = order(new Date(now - EDIT_WINDOW_MS - 1000).toISOString());
  assert.equal(canCustomerModify(o, now), false);
  assert.equal(editWindowHoursLeft(o, now), 0);
  assert.ok(msLeftToEdit(o, now) < 0);
});

test('order already being processed is not editable even within 24h', () => {
  const now = new Date('2026-11-20T12:00:00Z').getTime();
  const o = order(new Date(now - 1000).toISOString(), 'processing');
  assert.equal(canCustomerModify(o, now), false);
});

test('cancelled order is never editable', () => {
  const now = new Date('2026-11-20T12:00:00Z').getTime();
  const o = order(new Date(now - 1000).toISOString(), 'cancelled');
  assert.equal(canCustomerModify(o, now), false);
});
