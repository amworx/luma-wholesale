import { PageHeader } from '@/components/ui/Common';
import { ProductsTable } from '@/components/dashboard/ProductsTable';

export function SalesProducts() {
  return <><PageHeader title="المنتجات" subtitle="أضف المنتجات وتحكّم بمتغيراتها وأسعارها وصورها" /><ProductsTable scope="all" /></>;
}
