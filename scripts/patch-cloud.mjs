// One-off maintenance script: patch the shared demo cloud document so the
// multi-image gallery and third-level category are visible on every device.
// Preserves all client edits; only touches image arrays + adds one category.
const SUPA_URL = 'https://dymkqaxrnmiveshhakan.supabase.co';
const KEY = 'sb_publishable_pklhCJqPaGCGsp8CYES7-g_5mFPVFH8';
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

const imageMap = {
  'p-lip-velvet': ['lipstick-velvet', 'lipstick-coral', 'lipstick-nude'],
  'p-lip-coral': ['lipstick-coral', 'lipstick-velvet', 'lip-gloss'],
  'p-serum-glow': ['serum-glow', 'serum-hyaluronic', 'cream-jar'],
  'p-perfume-rose': ['perfume-rose', 'perfume-amber'],
};
const img = (n) => `/luma-wholesale/images/${n}.svg`;

async function main() {
  const res = await fetch(`${SUPA_URL}/rest/v1/luma_store?id=eq.main&select=id,updated_at,data`, { headers });
  const rows = await res.json();
  if (!rows.length) throw new Error('No cloud row');
  const row = rows[0];
  const data = row.data;
  console.log('BEFORE version', data.version, 'products', data.products.length, 'categories', data.categories.length);

  let changed = 0;
  for (const p of data.products) {
    if (imageMap[p.id]) {
      p.images = imageMap[p.id].map(img);
      changed++;
    }
  }
  // Add the third-level category used to demo deep nesting (idempotent).
  if (!data.categories.some((c) => c.id === 'c-lips-matte-long')) {
    data.categories.push({
      id: 'c-lips-matte-long', nameAr: 'يدوم طويلاً', nameEn: 'Long Lasting',
      descriptionAr: 'أحمر مطفي ثبات عالي', icon: 'Star', color: '#b3123f',
      active: true, sortOrder: 1, parentId: 'c-lips-matte',
    });
  }
  // Ensure the default wholesale percentage is present in settings.
  if (data.settings && data.settings.defaultWholesalePct === undefined) {
    data.settings.defaultWholesalePct = 10;
  }

  const put = await fetch(`${SUPA_URL}/rest/v1/luma_store?id=eq.main`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify({ data, updated_at: new Date().toISOString() }),
  });
  const body = await put.text();
  console.log('PATCH status', put.status, 'changed products', changed);
  if (!put.ok) console.log('PATCH body', body.slice(0, 500));
}
main().catch((e) => { console.error('ERR', e); process.exit(1); });
