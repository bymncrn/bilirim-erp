import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const pin = L.divIcon({
  className: "",
  html: '<span style="display:block;width:18px;height:18px;border-radius:9999px;background:#e11d48;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

/** Harita uzerinden tiklayarak koordinat secmeyi saglar. */
export default function MapPicker({
  value,
  onChange,
}: {
  value: { lat: number; lng: number } | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const holder = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;

  useEffect(() => {
    if (!holder.current || mapRef.current) return;
    const start = value ?? { lat: 39.925, lng: 32.8667 };
    const map = L.map(holder.current).setView([start.lat, start.lng], value ? 16 : 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    if (value) markerRef.current = L.marker([value.lat, value.lng], { icon: pin }).addTo(map);
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      if (markerRef.current) markerRef.current.setLatLng(e.latlng);
      else markerRef.current = L.marker(e.latlng, { icon: pin }).addTo(map);
      changeRef.current(lat, lng);
    });
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 120);
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !value) return;
    if (markerRef.current) markerRef.current.setLatLng([value.lat, value.lng]);
    else markerRef.current = L.marker([value.lat, value.lng], { icon: pin }).addTo(map);
  }, [value]);

  return <div ref={holder} className="h-64 w-full overflow-hidden rounded-xl border" />;
}
