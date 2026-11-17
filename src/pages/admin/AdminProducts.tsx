import { PageHeader } from '@/components/ui/Common';
import { ProductsTable } from '@/components/dashboard/ProductsTable';
export function AdminProducts() {
  return <><PageHeader title="المنتجات والمخزون" subtitle="تحكّم كامل بالمنتجات والمتغيرات والأسعار والكميات" /><ProductsTable scope="all" /></>;
}
