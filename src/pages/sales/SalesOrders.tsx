import { PageHeader } from '@/components/ui/Common';
import { OrdersTable } from '@/components/dashboard/OrdersTable';
export function SalesOrders() {
  return <><PageHeader title="الطلبات" subtitle="اعرض الطلبات وتابع حالتها" /><OrdersTable compact /></>;
}
