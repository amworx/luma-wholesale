import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Search, Crosshair } from 'lucide-react';

export interface PickedLocation {
  latitude: number;
  longitude: number;
  label: string;
}

interface Props {
  value: PickedLocation | null;
  onChange: (loc: PickedLocation | null) => void;
}

// Damascus city centre as a sensible default for Syrian customers.
const DEFAULT_CENTER: [number, number] = [33.5138, 36.2765];

/** Free, keyless location picker: OpenStreetMap tiles + Nominatim geocoding.
 *  Click the map to drop a pin, drag the pin, or search for a place by name. */
export function LocationPicker({ value, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [label, setLabel] = useState(value?.label || '');

  // Keep the local label in sync when the parent clears the value.
  useEffect(() => { if (!value) setLabel(''); }, [value]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: value ? [value.latitude, value.longitude] : DEFAULT_CENTER, zoom: value ? 15 : 11 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;

    const setMarker = (lat: number, lng: number) => {
      if (markerRef.current) map.removeLayer(markerRef.current);
      markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
      markerRef.current.on('dragend', () => {
        const p = markerRef.current!.getLatLng();
        void reverseGeocode(p.lat, p.lng);
      });
    };

    const reverseGeocode = async (lat: number, lng: number) => {
      let place = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=ar`);
        if (res.ok) {
          const j = await res.json();
          if (j.display_name) place = j.display_name;
        }
      } catch { /* offline: keep coordinates as the label */ }
      setLabel(place);
      onChange({ latitude: lat, longitude: lng, label: place });
    };

    map.on('click', (e: L.LeafletMouseEvent) => {
      setMarker(e.latlng.lat, e.latlng.lng);
      void reverseGeocode(e.latlng.lat, e.latlng.lng);
    });

    if (value) setMarker(value.latitude, value.longitude);

    // Leaflet needs a size recalculation when mounted inside a hidden/tabbed panel.
    const t = window.setTimeout(() => map.invalidateSize(), 200);
    return () => { window.clearTimeout(t); map.remove(); mapRef.current = null; markerRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query.trim())}&countrycodes=sy&limit=1&accept-language=ar`);
      if (res.ok) {
        const arr = await res.json();
        if (arr[0]) {
          const lat = Number(arr[0].lat), lng = Number(arr[0].lon);
          mapRef.current?.flyTo([lat, lng], 15);
          if (markerRef.current) mapRef.current?.removeLayer(markerRef.current);
          markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapRef.current!);
          markerRef.current.on('dragend', () => {
            const p = markerRef.current!.getLatLng();
            onChange({ latitude: p.lat, longitude: p.lng, label: arr[0].display_name });
          });
          setLabel(arr[0].display_name);
          onChange({ latitude: lat, longitude: lng, label: arr[0].display_name });
        }
      }
    } catch { /* network unavailable */ }
    setSearching(false);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      mapRef.current?.flyTo([latitude, longitude], 15);
      if (markerRef.current) mapRef.current?.removeLayer(markerRef.current);
      markerRef.current = L.marker([latitude, longitude], { draggable: true }).addTo(mapRef.current!);
      setLabel(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      onChange({ latitude, longitude, label: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` });
    }, () => undefined, { timeout: 8000 });
  };

  return (
    <div className="location-picker">
      <form className="row" onSubmit={search} style={{ gap: 8, marginBottom: 10 }}>
        <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن مكان في سوريا (مثال: المالكي، دمشق)" style={{ flex: 1 }} />
        <button type="submit" className="btn btn-outline" disabled={searching} title="بحث"><Search size={18} /></button>
        <button type="button" className="btn btn-outline" onClick={useMyLocation} title="موقعي"><Crosshair size={18} /></button>
      </form>
      <div ref={containerRef} className="location-map" style={{ height: 260, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)' }} />
      <p className="muted row" style={{ gap: 6, fontSize: 12, margin: '10px 0 0' }}>
        <MapPin size={15} color="var(--plum-600)" />
        {value ? `الموقع المختار: ${label || value.label || `${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)}`}` : 'اضغط على الخريطة لتحديد موقع التوصيل (اختياري)'}
      </p>
      {value && <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 6 }} onClick={() => { if (markerRef.current) mapRef.current?.removeLayer(markerRef.current); markerRef.current = null; setLabel(''); onChange(null); }}>إزالة الموقع</button>}
    </div>
  );
}
