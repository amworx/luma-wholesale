// Core domain types for the Luma wholesale demo store.
// All money values are stored as integer minor units (US cents) to avoid float drift.

export type Role = 'admin' | 'sales' | 'customer';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // demo only, plaintext local; replace with real auth for production
  role: Role;
  active: boolean;
  createdAt: string;
  avatarColor: string;
}

export interface Category {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  icon: string; // lucide icon name
  color: string;
  active: boolean;
  sortOrder: number;
}

export interface ProductVariant {
  id: string;
  nameAr: string; // e.g. "عاجي 01", "50 مل"
  sku: string;
  barcode: string;
  costPrice: number; // US cents
  retailPrice: number; // US cents
  salePrice: number | null; // US cents, null = no sale
  stock: number;
  lowStockThreshold: number;
  weightGrams: number;
  colorHex?: string;
  sizeLabel?: string;
}

export type ShippingType = 'standard' | 'express' | 'free' | 'local_pickup';

export interface Product {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  shortDescriptionAr: string;
  categoryId: string;
  brand: string;
  tags: string[];
  images: string[]; // data URLs or remote URLs
  variants: ProductVariant[];
  shipping: ShippingType;
  shippingFee: number; // US cents
  freeShippingOver: number | null; // US cents
  isFeatured: boolean;
  isNew: boolean;
  isActive: boolean;
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = 'new' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
// Kept for sales-side manual recording only; customers never choose a payment method.
export type PaymentMethod = 'cod' | 'card' | 'bank_transfer' | 'pending';

export interface OrderLine {
  productId: string;
  variantId: string;
  productNameAr: string;
  variantNameAr: string;
  image: string;
  unitPrice: number; // US cents, price at purchase
  quantity: number;
  lineTotal: number; // US cents
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  city: string;
  area: string;
  street: string;
  notes: string;
  // Detailed shipping fields for wholesale delivery.
  companyName: string;       // business / pharmacy / salon name
  phone2: string;            // secondary phone
  email: string;
  postalCode: string;
  building: string;          // building / floor / apartment
  landmarks: string;         // nearest landmark
  deliveryTime: string;      // preferred delivery time
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  lines: OrderLine[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod; // sales-side only, set manually
  address: ShippingAddress;
  // Sales-side handling fields (manual, after the order report is received).
  handledBy: string;      // salesperson name
  handlingNotes: string;  // internal notes
  quotedTotal: number | null; // US cents, final quoted price after sales review
  handledAt: string;
  createdAt: string;
  updatedAt: string;
  notes: string;
}

export interface CartLine {
  productId: string;
  variantId: string;
  quantity: number;
}

export interface StoreSettings {
  storeNameAr: string;
  storeNameEn: string;
  taglineAr: string;
  currency: string;              // USD
  currencySymbol: string;        // $
  currencyPosition: 'before' | 'after';
  freeShippingOver: number;
  defaultShippingFee: number;
  contactPhone: string;
  contactEmail: string;
  addressAr: string;
  instagram: string;
  whatsapp: string;
  maintenanceMode: boolean;
  announcementsAr: string[];
}

export interface AppData {
  version: number;
  users: User[];
  categories: Category[];
  products: Product[];
  orders: Order[];
  settings: StoreSettings;
}

export interface Session {
  userId: string;
  role: Role;
  name: string;
}
