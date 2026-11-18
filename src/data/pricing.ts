/**
 * Demo wholesale price resolver + quantity validation.
 *
 * Priority: individual customer > customer group > default wholesale.
 * Within a tier, the most specific rule wins (variant > product > all), then
 * the highest minQty the cart quantity satisfies. Effective dates are
 * inclusive. All prices are US cents.
 *
 * If no rule matches, a genuine wholesale fallback applies: the configured
 * default discount off the retail/sale price. It never silently returns the
 * full retail price. This is reference pricing for quotations and order
 * requests, NOT a financial authority — the sales team confirms the final price.
 */
import type { AppData, CustomerGroup, PriceRule, ProductVariant, User } from '@/types';

export interface PriceResult {
  unitPrice: number;       // US cents
  basePrice: number;       // retail/sale price before rules
  rule: PriceRule | null;  // winning rule, null = wholesale fallback
  tierLabel: string;       // Arabic label for the applied tier
  source: 'customer' | 'group' | 'default' | 'wholesale' | 'base';
}

const TIER_LABEL: Record<PriceResult['source'], string> = {
  customer: 'سعر خاص بالعميل',
  group: 'سعر المجموعة',
  default: 'سعر الجملة',
  wholesale: 'سعر الجملة الافتراضي',
  base: 'سعر البيع',
};

function dateOk(rule: PriceRule, today: string): boolean {
  const d = today.slice(0, 10); // YYYY-MM-DD
  // A rule applies only on or after validFrom and on or before validTo.
  if (rule.validFrom && d < rule.validFrom.slice(0, 10)) return false; // not started
  if (rule.validTo && d > rule.validTo.slice(0, 10)) return false;     // expired
  return true;
}

function specificity(rule: PriceRule): number {
  if (rule.variantId) return 3;
  if (rule.productId) return 2;
  return 1;
}

/** Rules that apply to this variant/quantity/date, best match last. */
function applicableRules(
  rules: PriceRule[], scope: PriceResult['source'], scopeId: string | null,
  variant: ProductVariant, productId: string, quantity: number, today: string
): PriceRule[] {
  return rules
    .filter((r) => r.active && r.scope === scope && (scope === 'default' || r.scopeId === scopeId))
    .filter((r) => dateOk(r, today))
    .filter((r) => quantity >= r.minQty)
    .filter((r) => (!r.productId || r.productId === productId))
    .filter((r) => (!r.variantId || r.variantId === variant.id))
    .sort((a, b) => specificity(a) - specificity(b) || a.minQty - b.minQty);
}

function priceFromRule(rule: PriceRule, basePrice: number): number {
  if (rule.price !== null) return rule.price;
  const pct = Math.max(0, Math.min(100, rule.discountPct));
  return Math.round(basePrice * (1 - pct / 100));
}

/**
 * Is this customer allowed to place wholesale orders?
 * Only active customer accounts that are not pending/rejected/suspended.
 * Admin and sales accounts are internal and never order through the storefront.
 */
export function isWholesaleEligible(customer: User | null): boolean {
  if (!customer || customer.role !== 'customer') return false;
  if (!customer.active) return false;
  return customer.accountStatus === 'active';
}

/** Resolve the effective unit price for one cart line. */
export function resolveUnitPrice(
  data: Pick<AppData, 'users' | 'customerGroups' | 'priceRules' | 'settings'>,
  variant: ProductVariant,
  productId: string,
  quantity: number,
  customer: User | null,
  today = new Date().toISOString()
): PriceResult {
  const basePrice = variant.salePrice ?? variant.retailPrice;
  // Inactive groups cannot confer group pricing; expired rules are filtered in dateOk.
  const group: CustomerGroup | null = customer?.customerGroupId
    ? data.customerGroups.find((g) => g.id === customer.customerGroupId && g.active) || null
    : null;

  const tiers: { source: PriceResult['source']; scopeId: string | null }[] = [
    { source: 'customer', scopeId: customer?.id ?? null },
    { source: 'group', scopeId: group?.id ?? null },
    { source: 'default', scopeId: null },
  ];

  for (const tier of tiers) {
    if (tier.source !== 'default' && !tier.scopeId) continue;
    const matches = applicableRules(data.priceRules, tier.source, tier.scopeId, variant, productId, quantity, today);
    const rule = matches[matches.length - 1]; // highest specificity + minQty
    if (rule) {
      return { unitPrice: priceFromRule(rule, basePrice), basePrice, rule, tierLabel: rule.noteAr || TIER_LABEL[tier.source], source: tier.source };
    }
  }
  // Genuine wholesale fallback: never return full retail for a wholesale demo.
  const pct = Math.max(0, Math.min(100, data.settings?.defaultWholesalePct ?? 10));
  return {
    unitPrice: Math.round(basePrice * (1 - pct / 100)),
    basePrice, rule: null, tierLabel: TIER_LABEL.wholesale, source: 'wholesale',
  };
}

/** Cart-wide subtotal using the resolver. */
export function resolveSubtotal(
  data: Pick<AppData, 'users' | 'customerGroups' | 'priceRules' | 'products' | 'settings'>,
  lines: { productId: string; variantId: string; quantity: number }[],
  customer: User | null,
  today?: string
): { total: number; lines: { key: string; quantity: number; result: PriceResult }[] } {
  let total = 0;
  const resolved = lines.map((line) => {
    const product = data.products.find((p) => p.id === line.productId);
    const variant = product?.variants.find((v) => v.id === line.variantId);
    const result = variant
      ? resolveUnitPrice(data, variant, line.productId, line.quantity, customer, today)
      : { unitPrice: 0, basePrice: 0, rule: null, tierLabel: '', source: 'base' as const };
    total += result.unitPrice * line.quantity;
    return { key: `${line.productId}-${line.variantId}`, quantity: line.quantity, result };
  });
  return { total, lines: resolved };
}

// ---- Quantity validation (MOQ, pack size, stock) ----

export interface QuantityCheck {
  valid: boolean;
  messageAr: string;
  adjusted: number; // nearest valid quantity (pack-aligned, >= MOQ, <= stock)
}

/**
 * Validate and normalise an order quantity against MOQ, pack size and stock.
 * Pack size > 1 means quantities must be whole multiples of the pack.
 * `adjusted` gives the UI a concrete fix to offer the customer.
 */
export function checkQuantity(variant: ProductVariant, requested: number): QuantityCheck {
  const moq = Math.max(1, variant.moq || 1);
  const pack = Math.max(1, variant.packSize || 1);
  const stock = Math.max(0, variant.stock || 0);
  const q = Math.max(0, Math.floor(requested));

  if (q === 0) return { valid: false, messageAr: 'أدخل كمية', adjusted: Math.min(moq, stock) || moq };
  if (q < moq) return { valid: false, messageAr: `الحد الأدنى للطلب ${moq} وحدة`, adjusted: Math.min(moq, stock) || moq };
  if (pack > 1 && q % pack !== 0) {
    const aligned = Math.max(moq, Math.ceil(q / pack) * pack);
    return { valid: false, messageAr: `الكمية بمضاعفات ${pack} (عبوة)`, adjusted: Math.min(aligned, Math.max(pack, stock)) };
  }
  if (q > stock) return { valid: false, messageAr: `الكمية المتوفرة ${stock} وحدة فقط`, adjusted: stock };
  return { valid: true, messageAr: '', adjusted: q };
}
