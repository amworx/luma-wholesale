import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { assetUrl } from '@/data/store';

/**
 * Elastic gallery hero: a horizontal image accordion. The active card expands
 * with a dark gradient overlay, a category chip, a title and a CTA; the other
 * cards collapse to narrow strips. Clicking a collapsed card makes it active.
 *
 * Rebuilt in the app's own CSS from the published design of 21st.dev's
 * "Elastic Gallery" (@daiwiikharihar, MIT) — no Tailwind/shadcn dependency.
 * RTL-first: the accordion grows from the inline-start edge and all offsets
 * use logical properties, so it mirrors correctly in Arabic.
 */
interface Slide {
  image: string;
  title: string;
  category: string;
  to: string;
}

const SLIDES: Slide[] = [
  { image: 'images/lipstick-velvet.svg', title: 'أحمر الشفاه المخملي', category: 'أحمر الشفاه', to: '/store/category/c-lips' },
  { image: 'images/serum-glow.svg', title: 'سيروم الإشراقة', category: 'العناية بالبشرة', to: '/store/category/c-skin' },
  { image: 'images/perfume-amber.svg', title: 'عطر العنبر الفاخر', category: 'العطور', to: '/store/category/c-fragrance' },
  { image: 'images/foundation.svg', title: 'أساس المكياج', category: 'المكياج', to: '/store/category/c-makeup' },
  { image: 'images/sunscreen.svg', title: 'واقي الشمس اليومي', category: 'الحماية من الشمس', to: '/store/category/c-sun' },
];

export function ElasticGallery() {
  const [active, setActive] = useState(0);
  const timer = useRef<number | null>(null);

  // Slow auto-advance so the hero feels alive; a click takes over immediately.
  useEffect(() => {
    timer.current = window.setInterval(() => setActive((i) => (i + 1) % SLIDES.length), 5000);
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, []);

  const pick = (i: number) => {
    setActive(i);
    if (timer.current) window.clearInterval(timer.current);
  };

  return (
    <div className="elastic-gallery" role="region" aria-label="منتجات مميزة">
      {SLIDES.map((s, i) => {
        const isActive = i === active;
        return (
          <div key={s.image} className={`elastic-card ${isActive ? 'is-active' : ''}`}>
            <button className="elastic-pick" onClick={() => pick(i)} aria-label={`عرض ${s.title}`} aria-expanded={isActive} />
            <img src={assetUrl(s.image)} alt="" loading={i === 0 ? 'eager' : 'lazy'} />
            <span className="elastic-shade" />
            <span className="elastic-content">
              <span className="elastic-chip"><Sparkles size={11} /> {s.category}</span>
              <strong className="elastic-title">{s.title}</strong>
              {isActive && <Link to={s.to} className="elastic-cta">تصفّح الفئة <ArrowLeft size={14} /></Link>}
            </span>
          </div>
        );
      })}
    </div>
  );
}
