import type { AppData, Category, Product, ProductVariant, User, Order, CustomerGroup, PriceRule } from '@/types';

// Base-aware image path so products render at a domain root or /subpath/.
const img = (name: string) => `${import.meta.env.BASE_URL}images/${name}.svg`;
const now = '2026-11-01T09:00:00.000Z';

export const seedCategories: Category[] = [
  { id: 'c-lips', nameAr: 'أحمر الشفاه', nameEn: 'Lipstick', descriptionAr: 'ألوان ثابتة وترطيب يدوم طويلاً', icon: 'Palette', color: '#b3123f', active: true, sortOrder: 1, parentId: null },
  { id: 'c-lips-matte', nameAr: 'أحمر مطفي', nameEn: 'Matte Lipstick', descriptionAr: 'تركيبة مطفيّة تدوم طويلاً', icon: 'Palette', color: '#b3123f', active: true, sortOrder: 1, parentId: 'c-lips' },
  { id: 'c-lips-matte-long', nameAr: 'يدوم طويلاً', nameEn: 'Long Lasting', descriptionAr: 'أحمر مطفي ثبات عالي', icon: 'Star', color: '#b3123f', active: true, sortOrder: 1, parentId: 'c-lips-matte' },
  { id: 'c-lips-gloss', nameAr: 'لمعة الشفاه', nameEn: 'Lip Gloss', descriptionAr: 'لمعة وترطيب فوري', icon: 'Sparkles', color: '#b3123f', active: true, sortOrder: 2, parentId: 'c-lips' },
  { id: 'c-skin', nameAr: 'العناية بالبشرة', nameEn: 'Skincare', descriptionAr: 'سيرومات وكريمات للبشرة', icon: 'Sparkles', color: '#4d8ba3', active: true, sortOrder: 2, parentId: null },
  { id: 'c-skin-serum', nameAr: 'السيرومات', nameEn: 'Serums', descriptionAr: 'سيرومات مركّزة لكل أنواع البشرة', icon: 'Sparkles', color: '#4d8ba3', active: true, sortOrder: 1, parentId: 'c-skin' },
  { id: 'c-skin-cream', nameAr: 'الكريمات', nameEn: 'Creams', descriptionAr: 'كريمات ترطيب وحماية', icon: 'Sparkles', color: '#4d8ba3', active: true, sortOrder: 2, parentId: 'c-skin' },
  { id: 'c-fragrance', nameAr: 'العطور', nameEn: 'Fragrance', descriptionAr: 'روائح فاخرة تدوم طوال اليوم', icon: 'Flower2', color: '#a85480', active: true, sortOrder: 3, parentId: null },
  { id: 'c-fragrance-women', nameAr: 'عطور زهرية', nameEn: 'Floral', descriptionAr: 'روائح زهرية ناعمة', icon: 'Flower2', color: '#a85480', active: true, sortOrder: 1, parentId: 'c-fragrance' },
  { id: 'c-fragrance-oud', nameAr: 'العود والعنبر', nameEn: 'Oud & Amber', descriptionAr: 'روائح شرقية دافئة', icon: 'Flower2', color: '#a85480', active: true, sortOrder: 2, parentId: 'c-fragrance' },
  { id: 'c-makeup', nameAr: 'المكياج', nameEn: 'Makeup', descriptionAr: 'أساسيات الإطلالة اليومية', icon: 'Brush', color: '#63468a', active: true, sortOrder: 4, parentId: null },
  { id: 'c-sun', nameAr: 'الحماية من الشمس', nameEn: 'Sun Care', descriptionAr: 'حماية يومية بتركيبة خفيفة', icon: 'Sun', color: '#c99a2c', active: true, sortOrder: 5, parentId: null },
  { id: 'c-nails', nameAr: 'الأظافر', nameEn: 'Nails', descriptionAr: 'ألوان تدوم وتلمع', icon: 'Hand', color: '#8e2b20', active: true, sortOrder: 6, parentId: null },
];

function variant(
  id: string, nameAr: string, sku: string, cost: number, retail: number,
  sale: number | null, stock: number, colorHex?: string, sizeLabel?: string,
  packSize = 1, moq = 1
): ProductVariant {
  return {
    id, nameAr, sku, barcode: `619${sku.replace(/\D/g, '').padStart(10, '0').slice(0, 10)}`,
    costPrice: Math.round(cost * 100), retailPrice: Math.round(retail * 100),
    salePrice: sale === null ? null : Math.round(sale * 100),
    stock, lowStockThreshold: 5, weightGrams: 60, colorHex, sizeLabel,
    packSize, moq,
  };
}

// Prices are USD (stored as cents). Quantities and stock are wholesale-oriented.
export const seedProducts: Product[] = [
  {
    id: 'p-lip-velvet', nameAr: 'أحمر شفاه مخملي', nameEn: 'Velvet Matte Lipstick',
    shortDescriptionAr: 'لون مخملي غني يدوم 12 ساعة',
    descriptionAr: 'تركيبة مخملية ناعمة تمنح الشفاه لوناً غنياً يدوم طوال اليوم دون جفاف. غني بزبدة الشيا وفيتامين E للترطيب.',
    categoryId: 'c-lips-matte', brand: 'لُما بيوتي', tags: ['مخملي', 'يدوم طويلاً', 'الأكثر مبيعاً'],
    images: [img('lipstick-velvet'), img('lipstick-coral'), img('lipstick-nude')],
    variants: [
      variant('v-lv-01', 'أحمر كرزي', 'LM-LV-01', 4.5, 12, 8.9, 24, '#b3123f'),
      variant('v-lv-02', 'وردي داكن', 'LM-LV-02', 4.5, 12, 8.9, 18, '#a85480'),
      variant('v-lv-03', 'بني نيود', 'LM-LV-03', 4.5, 12, null, 7, '#8a5548'),
    ],
    shipping: 'standard', shippingFee: 800, freeShippingOver: 10000,
    isFeatured: true, isNew: false, isActive: true, rating: 4.8, reviewCount: 124,
    createdAt: now, updatedAt: now,
  },
  {
    id: 'p-lip-coral', nameAr: 'أحمر شفاه كورال', nameEn: 'Coral Glow Lipstick',
    shortDescriptionAr: 'لون كورال مشرق لإطلالة نضرة',
    descriptionAr: 'لون كورال دافئ يمنح الشفاه إشراقة طبيعية. تركيبة خفيفة غير لامعة تناسب الاستخدام اليومي.',
    categoryId: 'c-lips-matte', brand: 'لُما بيوتي', tags: ['كورال', 'يومي'],
    images: [img('lipstick-coral'), img('lipstick-velvet'), img('lip-gloss')],
    variants: [
      variant('v-lc-01', 'كورال مشرق', 'LM-LC-01', 4, 11, 7.9, 32, '#e0563f'),
      variant('v-lc-02', 'مرجاني', 'LM-LC-02', 4, 11, null, 3, '#c9503b'),
    ],
    shipping: 'standard', shippingFee: 800, freeShippingOver: 10000,
    isFeatured: false, isNew: true, isActive: true, rating: 4.6, reviewCount: 58,
    createdAt: now, updatedAt: now,
  },
  {
    id: 'p-lip-nude', nameAr: 'أحمر شفاه نيود', nameEn: 'Nude Rose Lipstick',
    shortDescriptionAr: 'درجات نيود طبيعية لكل البشرات',
    descriptionAr: 'مجموعة درجات نيود رقيقة تمنح مظهراً طبيعياً أنيقاً. مرطب بزيوت طبيعية.',
    categoryId: 'c-lips-matte', brand: 'لُما بيوتي', tags: ['نيود', 'طبيعي'],
    images: [img('lipstick-nude')],
    variants: [
      variant('v-ln-01', 'نيود وردي', 'LM-LN-01', 4.2, 11.5, 8.5, 15, '#b9786a'),
      variant('v-ln-02', 'نيود دافئ', 'LM-LN-02', 4.2, 11.5, null, 11, '#a06b5c'),
    ],
    shipping: 'standard', shippingFee: 800, freeShippingOver: 10000,
    isFeatured: false, isNew: false, isActive: true, rating: 4.5, reviewCount: 41,
    createdAt: now, updatedAt: now,
  },
  {
    id: 'p-serum-glow', nameAr: 'سيروم الإشراقة', nameEn: 'Glow Serum',
    shortDescriptionAr: 'سيروم فيتامين C لإشراقة فورية',
    descriptionAr: 'سيروم غني بفيتامين C وحمض الهيالورونيك يوحّد لون البشرة ويمنحها إشراقة صحية.',
    categoryId: 'c-skin-serum', brand: 'لُما سكين', tags: ['فيتامين C', 'إشراقة'],
    images: [img('serum-glow'), img('serum-hyaluronic'), img('cream-jar')],
    variants: [variant('v-sg-01', '30 مل', 'LM-SG-30', 8.5, 24, 18.9, 20, undefined, '30 مل')],
    shipping: 'standard', shippingFee: 800, freeShippingOver: 10000,
    isFeatured: true, isNew: false, isActive: true, rating: 4.9, reviewCount: 203,
    createdAt: now, updatedAt: now,
  },
  {
    id: 'p-serum-ha', nameAr: 'سيروم الهيالورونيك', nameEn: 'Hyaluronic Serum',
    shortDescriptionAr: 'ترطيب عميق وبشرة ممتلئة',
    descriptionAr: 'سيروم مرطب بتركيز عالٍ من حمض الهيالورونيك يحفظ رطوبة البشرة ويملأ الخطوط الدقيقة.',
    categoryId: 'c-skin-serum', brand: 'لُما سكين', tags: ['ترطيب', 'هيالورونيك'],
    images: [img('serum-hyaluronic')],
    variants: [variant('v-sh-01', '30 مل', 'LM-SH-30', 7.8, 22, 17.5, 16, undefined, '30 مل')],
    shipping: 'standard', shippingFee: 800, freeShippingOver: 10000,
    isFeatured: false, isNew: true, isActive: true, rating: 4.7, reviewCount: 96,
    createdAt: now, updatedAt: now,
  },
  {
    id: 'p-foundation', nameAr: 'أساس المكياج السائل', nameEn: 'Liquid Foundation',
    shortDescriptionAr: 'تغطية كاملة بمظهر طبيعي',
    descriptionAr: 'أساس سائل بتغطية قابلة للبناء يمنح بشرة موحّدة دون مظهر مسحوقي. يدوم 16 ساعة.',
    categoryId: 'c-makeup', brand: 'لُما بيوتي', tags: ['تغطية كاملة', 'مكياج'],
    images: [img('foundation')],
    variants: [
      variant('v-fd-01', 'درجة فاتح', 'LM-FD-01', 9.5, 26, 21, 12, '#e8c9a8'),
      variant('v-fd-02', 'درجة متوسط', 'LM-FD-02', 9.5, 26, 21, 9, '#c98f6b'),
      variant('v-fd-03', 'درجة داكن', 'LM-FD-03', 9.5, 26, null, 4, '#8a5c3f'),
    ],
    shipping: 'standard', shippingFee: 800, freeShippingOver: 10000,
    isFeatured: false, isNew: false, isActive: true, rating: 4.6, reviewCount: 87,
    createdAt: now, updatedAt: now,
  },
  {
    id: 'p-perfume-rose', nameAr: 'عطر ورد ليلي', nameEn: 'Rose Noir Perfume',
    shortDescriptionAr: 'عطر فاخر بنفحات الورد',
    descriptionAr: 'عطر أو دو بارفان يجمع بين الورد الدمشقي والمسك الأبيض، يدوم أكثر من 8 ساعات.',
    categoryId: 'c-fragrance-women', brand: 'لُما عطور', tags: ['ورد', 'فاخر'],
    images: [img('perfume-rose'), img('perfume-amber')],
    variants: [
      variant('v-pr-01', '50 مل', 'LM-PR-50', 18, 49, 39.9, 14, undefined, '50 مل'),
      variant('v-pr-02', '100 مل', 'LM-PR-100', 28, 75, 62, 6, undefined, '100 مل'),
    ],
    shipping: 'standard', shippingFee: 800, freeShippingOver: 10000,
    isFeatured: true, isNew: false, isActive: true, rating: 4.9, reviewCount: 167,
    createdAt: now, updatedAt: now,
  },
  {
    id: 'p-perfume-amber', nameAr: 'عطر العنبر', nameEn: 'Amber Perfume',
    shortDescriptionAr: 'دفء العنبر والفانيليا',
    descriptionAr: 'عطر دافئ غني بنفحات العنبر والفانيليا والخشب، مثالي للمناسبات الخاصة.',
    categoryId: 'c-fragrance-oud', brand: 'لُما عطور', tags: ['عنبر', 'دافئ'],
    images: [img('perfume-amber')],
    variants: [variant('v-pa-01', '100 مل', 'LM-PA-100', 26, 69, 54.9, 10, undefined, '100 مل')],
    shipping: 'standard', shippingFee: 800, freeShippingOver: 10000,
    isFeatured: false, isNew: false, isActive: true, rating: 4.7, reviewCount: 74,
    createdAt: now, updatedAt: now,
  },
  {
    id: 'p-cream', nameAr: 'كريم الترطيب', nameEn: 'Moisture Cream',
    shortDescriptionAr: 'ترطيب 24 ساعة للبشرة',
    descriptionAr: 'كريم غني بزبدة الشيا والجلسرين يرطب البشرة بعمق ويحافظ على نعومتها طوال اليوم.',
    categoryId: 'c-skin-cream', brand: 'لُما سكين', tags: ['ترطيب', 'كريم'],
    images: [img('cream-jar')],
    variants: [variant('v-cr-01', '50 مل', 'LM-CR-50', 6.5, 18, 13.9, 22, undefined, '50 مل')],
    shipping: 'standard', shippingFee: 800, freeShippingOver: 10000,
    isFeatured: false, isNew: false, isActive: true, rating: 4.5, reviewCount: 63,
    createdAt: now, updatedAt: now,
  },
  {
    id: 'p-eyeshadow', nameAr: 'باليت ظلال العيون', nameEn: 'Eyeshadow Palette',
    shortDescriptionAr: '12 لوناً بتدرجات متناسقة',
    descriptionAr: 'باليت ظلال عيون بـ12 لوناً من درجات الأرض والوردي، تركيبة مخملية سهلة الدمج.',
    categoryId: 'c-makeup', brand: 'لُما بيوتي', tags: ['ظلال', 'باليت'],
    images: [img('eye-shadow')],
    variants: [variant('v-es-01', '12 لون', 'LM-ES-12', 12, 32, 25.9, 13)],
    shipping: 'standard', shippingFee: 800, freeShippingOver: 10000,
    isFeatured: true, isNew: true, isActive: true, rating: 4.8, reviewCount: 112,
    createdAt: now, updatedAt: now,
  },
  {
    id: 'p-mascara', nameAr: 'ماسكارا الحجم', nameEn: 'Volume Mascara',
    shortDescriptionAr: 'رموش كثيفة ومفصولة',
    descriptionAr: 'ماسكارا بفرشاة مبتكرة تمنح الرموش حجماً مذهلاً دون تكتل. مقاومة للماء.',
    categoryId: 'c-makeup', brand: 'لُما بيوتي', tags: ['رموش', 'مقاوم للماء'],
    images: [img('mascara')],
    variants: [variant('v-ms-01', 'أسود', 'LM-MS-01', 5.5, 15, 11.5, 27, '#1d1d24')],
    shipping: 'standard', shippingFee: 800, freeShippingOver: 10000,
    isFeatured: false, isNew: false, isActive: true, rating: 4.4, reviewCount: 89,
    createdAt: now, updatedAt: now,
  },
  {
    id: 'p-blush', nameAr: 'بلاش وردي', nameEn: 'Rose Blush',
    shortDescriptionAr: 'لون وردي طبيعي للخدود',
    descriptionAr: 'بلاش مخملي يمنح الخدود لوناً وردياً طبيعياً وإشراقة صحية.',
    categoryId: 'c-makeup', brand: 'لُما بيوتي', tags: ['بلاش', 'وردي'],
    images: [img('blush')],
    variants: [variant('v-bl-01', 'وردي فاتح', 'LM-BL-01', 4.8, 13.5, 9.9, 19, '#e08fa0')],
    shipping: 'standard', shippingFee: 800, freeShippingOver: 10000,
    isFeatured: false, isNew: false, isActive: true, rating: 4.3, reviewCount: 52,
    createdAt: now, updatedAt: now,
  },
  {
    id: 'p-sunscreen', nameAr: 'واقي الشمس SPF 50+', nameEn: 'SPF 50+ Sunscreen',
    shortDescriptionAr: 'حماية عالية بتركيبة خفيفة',
    descriptionAr: 'واقي شمس واسع الطيف بحماية SPF 50+، تركيبة خفيفة سريعة الامتصاص لا تترك أثراً أبيض.',
    categoryId: 'c-sun', brand: 'لُما سكين', tags: ['SPF 50', 'حماية'],
    images: [img('sunscreen')],
    variants: [variant('v-su-01', '50 مل', 'LM-SU-50', 7, 19.5, 15.5, 31, undefined, '50 مل')],
    shipping: 'standard', shippingFee: 800, freeShippingOver: 10000,
    isFeatured: true, isNew: false, isActive: true, rating: 4.8, reviewCount: 145,
    createdAt: now, updatedAt: now,
  },
  {
    id: 'p-cleanser', nameAr: 'غسول البشرة اللطيف', nameEn: 'Gentle Cleanser',
    shortDescriptionAr: 'تنظيف يومي دون جفاف',
    descriptionAr: 'غسول لطيف يزيل الشوائب والمكياج دون أن يجرّد البشرة من زيوتها الطبيعية.',
    categoryId: 'c-skin-cream', brand: 'لُما سكين', tags: ['غسول', 'يومي'],
    images: [img('cleanser')],
    variants: [variant('v-cl-01', '150 مل', 'LM-CL-150', 5, 14, 10.5, 25, undefined, '150 مل')],
    shipping: 'standard', shippingFee: 800, freeShippingOver: 10000,
    isFeatured: false, isNew: false, isActive: true, rating: 4.4, reviewCount: 67,
    createdAt: now, updatedAt: now,
  },
  {
    id: 'p-lipgloss', nameAr: 'لمعة الشفاه', nameEn: 'Lip Gloss',
    shortDescriptionAr: 'لمعة لامعة وترطيب فوري',
    descriptionAr: 'لمعة شفاه بتركيبة غير لزجة تمنح مظهراً لامعاً وترطيباً يدوم.',
    categoryId: 'c-lips-gloss', brand: 'لُما بيوتي', tags: ['لمعة', 'ترطيب'],
    images: [img('lip-gloss')],
    variants: [variant('v-lg-01', 'وردي', 'LM-LG-01', 3.8, 10.5, 7.9, 21, '#e07fa8')],
    shipping: 'standard', shippingFee: 800, freeShippingOver: 10000,
    isFeatured: false, isNew: true, isActive: true, rating: 4.2, reviewCount: 38,
    createdAt: now, updatedAt: now,
  },
  {
    id: 'p-nail', nameAr: 'طلاء الأظافر', nameEn: 'Nail Polish',
    shortDescriptionAr: 'ألوان تدوم وتلمع',
    descriptionAr: 'طلاء أظافر بتركيبة تدوم طويلاً وتمنح الأظافر لمعة احترافية.',
    categoryId: 'c-nails', brand: 'لُما بيوتي', tags: ['أظافر', 'أحمر'],
    images: [img('nail-polish')],
    variants: [variant('v-np-01', 'أحمر كلاسيكي', 'LM-NP-01', 2.8, 8, 5.9, 34, '#c0392b')],
    shipping: 'standard', shippingFee: 800, freeShippingOver: 10000,
    isFeatured: false, isNew: false, isActive: true, rating: 4.1, reviewCount: 29,
    createdAt: now, updatedAt: now,
  },
];

export const seedCustomerGroups: CustomerGroup[] = [
  { id: 'g-retail', nameAr: 'متاجر التجزئة', descriptionAr: 'السعر الافتراضي للجملة', active: true },
  { id: 'g-wholesale', nameAr: 'تجار الجملة', descriptionAr: 'خصم إضافي للكميات الكبيرة', active: true },
  { id: 'g-vip', nameAr: 'عملاء مميزون', descriptionAr: 'أفضل سعر للعملاء الدائمين', active: true },
];

export const seedUsers: User[] = [
  { id: 'u-admin', name: 'سامر الحسن', email: 'admin@luma.sy', password: 'admin123', role: 'admin', active: true, createdAt: now, avatarColor: '#7c1d4f', customerGroupId: null, accountStatus: 'active', companyName: '' },
  { id: 'u-sales', name: 'محمد العلي', email: 'sales@luma.sy', password: 'sales123', role: 'sales', active: true, createdAt: now, avatarColor: '#4d8ba3', customerGroupId: null, accountStatus: 'active', companyName: '' },
  { id: 'u-customer', name: 'رنا خالد', email: 'customer@example.com', password: 'customer123', role: 'customer', active: true, createdAt: now, avatarColor: '#c9953f', customerGroupId: 'g-wholesale', accountStatus: 'active', companyName: 'مستحضرات رنا' },
];

/** Demo price rules. Reference data only; not financially authoritative. */
export const seedPriceRules: PriceRule[] = [
  // Default wholesale: 10% off retail for everyone, any quantity.
  { id: 'pr-def-10', scope: 'default', scopeId: null, productId: null, variantId: null, minQty: 1, price: null, discountPct: 10, validFrom: null, validTo: null, active: true, noteAr: 'سعر الجملة الافتراضي: خصم 10%' },
  // Quantity tier: 12+ units of the velvet lipstick at a fixed price.
  { id: 'pr-def-lv-12', scope: 'default', scopeId: null, productId: 'p-lip-velvet', variantId: null, minQty: 12, price: 750, discountPct: 0, validFrom: null, validTo: null, active: true, noteAr: 'سعر الكرتونة (12 وحدة)' },
  // Group price for wholesale customers on all products.
  { id: 'pr-grp-ws', scope: 'group', scopeId: 'g-wholesale', productId: null, variantId: null, minQty: 1, price: null, discountPct: 15, validFrom: null, validTo: null, active: true, noteAr: 'سعر تجار الجملة: خصم 15%' },
  // Individual negotiated price for the demo customer on the lip gloss.
  { id: 'pr-cust-lg', scope: 'customer', scopeId: 'u-customer', productId: 'p-lipgloss', variantId: null, minQty: 1, price: 690, discountPct: 0, validFrom: '2026-01-01', validTo: '2027-12-31', active: true, noteAr: 'سعر تفاوضي خاص' },
];

const emptyAddress = {
  companyName: '', phone2: '', email: '', building: '', landmarks: '', deliveryTime: '',
  latitude: null, longitude: null, mapLabel: '',
};

export const seedOrders: Order[] = [
  {
    id: 'o-1001', orderNumber: 'LM-1001', customerId: 'u-customer', customerName: 'رنا خالد', customerPhone: '0933123456',
    lines: [{
      productId: 'p-lip-velvet', variantId: 'v-lv-01', productNameAr: 'أحمر شفاه مخملي', variantNameAr: 'أحمر كرزي',
      image: img('lipstick-velvet'), unitPrice: 890, quantity: 2, lineTotal: 1780,
      sku: 'LM-LV-01', priceTier: 'سعر الجملة', currency: 'USD',
    }],
    subtotal: 1780, shippingFee: 800, discount: 0, total: 2580,
    status: 'new', paymentMethod: 'pending',
    address: { fullName: 'رنا خالد', phone: '0933123456', city: 'دمشق', area: 'المالكي', street: 'شارع فردوس', notes: '', ...emptyAddress },
    handledBy: '', handlingNotes: '', quotedTotal: null, handledAt: '',
    createdAt: '2026-11-10T12:30:00.000Z', updatedAt: '2026-11-10T12:30:00.000Z', notes: '',
  },
  {
    id: 'o-1002', orderNumber: 'LM-1002', customerId: null, customerName: 'عبدالله ناصر', customerPhone: '0944987654',
    lines: [{
      productId: 'p-perfume-rose', variantId: 'v-pr-01', productNameAr: 'عطر ورد ليلي', variantNameAr: '50 مل',
      image: img('perfume-rose'), unitPrice: 3990, quantity: 1, lineTotal: 3990,
      sku: 'LM-PR-01', priceTier: 'سعر الجملة', currency: 'USD',
    }],
    subtotal: 3990, shippingFee: 0, discount: 200, total: 3790,
    status: 'shipped', paymentMethod: 'bank_transfer',
    address: { fullName: 'عبدالله ناصر', phone: '0944987654', city: 'حلب', area: 'الساحة', street: 'شارع النيل', notes: 'التوصيل بعد الساعة 4', ...emptyAddress },
    handledBy: 'محمد العلي', handlingNotes: 'تم تأكيد التحويل', quotedTotal: 3790, handledAt: '2026-11-09T14:00:00.000Z',
    createdAt: '2026-11-08T09:15:00.000Z', updatedAt: '2026-11-09T14:00:00.000Z', notes: '',
  },
  {
    id: 'o-1003', orderNumber: 'LM-1003', customerId: 'u-customer', customerName: 'رنا خالد', customerPhone: '0933123456',
    lines: [{
      productId: 'p-serum-glow', variantId: 'v-sg-01', productNameAr: 'سيروم الإشراقة', variantNameAr: '30 مل',
      image: img('serum-glow'), unitPrice: 1890, quantity: 1, lineTotal: 1890,
      sku: 'LM-SG-01', priceTier: 'سعر الجملة', currency: 'USD',
    }],
    subtotal: 1890, shippingFee: 800, discount: 0, total: 2690,
    status: 'delivered', paymentMethod: 'cod',
    address: { fullName: 'رنا خالد', phone: '0933123456', city: 'دمشق', area: 'المالكي', street: 'شارع فردوس', notes: '', ...emptyAddress },
    handledBy: 'محمد العلي', handlingNotes: '', quotedTotal: 2690, handledAt: '2026-11-04T10:20:00.000Z',
    createdAt: '2026-11-02T16:45:00.000Z', updatedAt: '2026-11-04T10:20:00.000Z', notes: '',
  },
];

export function createSeedData(): AppData {
  return {
    version: 5,
    users: structuredClone(seedUsers),
    customerGroups: structuredClone(seedCustomerGroups),
    priceRules: structuredClone(seedPriceRules),
    categories: structuredClone(seedCategories),
    products: structuredClone(seedProducts),
    orders: structuredClone(seedOrders),
    enquiries: [],
    favoriteIds: [],
    settings: {
      storeNameAr: 'لُما', storeNameEn: 'Luma', taglineAr: 'شريكك الموثوق في مستحضرات التجميل بالجملة',
      currency: 'USD', currencySymbol: '$', currencyPosition: 'before',
      defaultWholesalePct: 10,
      freeShippingOver: 10000, defaultShippingFee: 800,
      contactPhone: '0933000000', contactEmail: 'hello@luma.sy',
      addressAr: 'دمشق، الجمهورية العربية السورية', instagram: '@luma.beauty', whatsapp: '0933000000',
      maintenanceMode: false,
      announcementsAr: ['شحن مجاني للطلبات فوق 100 دولار', 'خصم 20% على العطور عند الطلب بالجملة'],
    },
  };
}
