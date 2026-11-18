/**
 * Demo wholesale price resolver.
 *
 * Priority: individual customer > customer group > default wholesale.
 * Within a tier, the most specific rule wins (variant > product > all), then
 * the highest minQty the cart quantity satisfies. Effective dates are
 * inclusive. All prices are US cents.
 *
 * This is reference pricing for quotations and order requests. It is NOT a
 * financial authority: the sales team confirms the final price manually.
 */
import type { AppData, CustomerGroup, PriceRule, ProductVariant, User } from '@/types';

export interface PriceResult {
  unitPrice: number;       // US cents
  basePrice: number;       // retail/sale price before rules
  rule: PriceRule | null;  // winning rule, null = base price
  tierLabel: string;       // Arabic label for the applied tier
  source: 'customer' | 'group' | 'default' | 'base';
}

const TIER_LABEL: Record<PriceResult['source'], string> = {
  customer: 'سعر خاص بالعميل',
  group: 'سعر المجموعة',
  default: 'سعر الجملة',
  base: 'سعر البيع',
};

function dateOk(rule: PriceRule, today: string): boolean {
  const d = today.slice(0, 10); // YYYY-MM-DD
  if (rule.validFrom && d < rule.validFrom.slice(0, 10)) return false;
  if (rule.validTo && d > rule.validTo.slice(0, 10)) return false;
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
 * Resolve the effective unit price for one cart line.
 * `customer` may be null for guest orders; groups come from the user record.
 */
export function resolveUnitPrice(
  data: Pick<AppData, 'users' | 'customerGroups' | 'priceRules'>,
  variant: ProductVariant,
  productId: string,
  quantity: number,
  customer: User | null,
  today = new Date().toISOString()
): PriceResult {
  const basePrice = variant.salePrice ?? variant.retailPrice;
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
  return { unitPrice: basePrice, basePrice, rule: null, tierLabel: TIER_LABEL.base, source: 'base' };
}

/** Cart-wide subtotal using the resolver. */
export function resolveSubtotal(
  data: Pick<AppData, 'users' | 'customerGroups' | 'priceRules' | 'products'>,
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
