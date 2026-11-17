import { Navigate, Route, Routes } from 'react-router-dom';
import { useReady, useSession } from '@/data/store';
import { StoreLayout } from '@/components/layout/StoreLayout';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { HomePage } from '@/pages/store/HomePage';
import { ListingPage } from '@/pages/store/ListingPage';
import { ProductPage } from '@/pages/store/ProductPage';
import { CartPage } from '@/pages/store/CartPage';
import { CheckoutPage } from '@/pages/store/CheckoutPage';
import { AccountPage } from '@/pages/store/AccountPage';
import { FavoritesPage } from '@/pages/store/FavoritesPage';
import { LoginPage } from '@/pages/LoginPage';
import { SalesOverview } from '@/pages/sales/SalesOverview';
import { SalesProducts } from '@/pages/sales/SalesProducts';
import { SalesInventory } from '@/pages/sales/SalesInventory';
import { SalesCategories } from '@/pages/sales/SalesCategories';
import { SalesOrders } from '@/pages/sales/SalesOrders';
import { SalesEnquiries, AdminEnquiries } from '@/pages/sales/SalesEnquiries';
import { AdminOverview } from '@/pages/admin/AdminOverview';
import { AdminOrders } from '@/pages/admin/AdminOrders';
import { AdminProducts } from '@/pages/admin/AdminProducts';
import { AdminCategories } from '@/pages/admin/AdminCategories';
import { AdminUsers } from '@/pages/admin/AdminUsers';
import { AdminAnalytics } from '@/pages/admin/AdminAnalytics';
import { AdminSettings } from '@/pages/admin/AdminSettings';

function Guard({ role, children }: { role: 'admin' | 'sales'; children: React.ReactNode }) {
  const session = useSession();
  if (!session) return <Navigate to="/login" replace />;
  if (session.role !== role && session.role !== 'admin') return <Navigate to="/store" replace />;
  // Admin can view sales pages too.
  return <>{children}</>;
}

export default function App() {
  const ready = useReady();
  if (!ready) return <div className="loader"><div className="spinner" /></div>;

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/store" replace />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Storefront */}
      <Route path="/store" element={<StoreLayout />}>
        <Route index element={<HomePage />} />
        <Route path="categories" element={<ListingPage variant="all" />} />
        <Route path="category/:categoryId" element={<ListingPage variant="category" />} />
        <Route path="search" element={<ListingPage variant="search" />} />
        <Route path="offers" element={<ListingPage variant="offers" />} />
        <Route path="product/:id" element={<ProductPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="favorites" element={<FavoritesPage />} />
      </Route>

      {/* Sales dashboard */}
      <Route path="/sales" element={<Guard role="sales"><DashboardLayout mode="sales" /></Guard>}>
        <Route index element={<SalesOverview />} />
        <Route path="products" element={<SalesProducts />} />
        <Route path="inventory" element={<SalesInventory />} />
        <Route path="categories" element={<SalesCategories />} />
        <Route path="orders" element={<SalesOrders />} />
        <Route path="enquiries" element={<SalesEnquiries />} />
      </Route>

      {/* Admin dashboard */}
      <Route path="/admin" element={<Guard role="admin"><DashboardLayout mode="admin" /></Guard>}>
        <Route index element={<AdminOverview />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="enquiries" element={<AdminEnquiries />} />
      </Route>

      <Route path="*" element={<Navigate to="/store" replace />} />
    </Routes>
  );
}
