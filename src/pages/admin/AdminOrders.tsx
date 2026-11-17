import { PageHeader } from '@/components/ui/Common';
import { OrdersTable } from '@/components/dashboard/OrdersTable';
export function AdminOrders() {
  return <><PageHeader title="الطلبات" subtitle="تابع طلبات العملاء وحدّث حالتها" /><OrdersTable /></>;
}
