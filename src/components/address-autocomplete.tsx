"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const GEOAPIFY_KEY = process.env.NEXT_PUBLIC_GEOAPIFY_KEY || "";
const GEOAPIFY_URL = "https://api.geoapify.com/v1/geocode/autocomplete";

async function searchCitiesFromGov(q: string): Promise<string[]> {
  try {
    const url = new URL("/api/gov/cities", location.origin);
    url.searchParams.set("q", q);
    return await (await fetch(url.toString())).json();
  } catch { return []; }
}

async function searchStreetsFromGov(q: string, city: string): Promise<{ name: string }[]> {
  try {
    const url = new URL("/api/gov/streets", location.origin);
    url.searchParams.set("q", q);
    if (city) url.searchParams.set("city", city);
    return await (await fetch(url.toString())).json();
  } catch { return []; }
}

// ── Geoapify ───────────────────────────────────────────────────────────────
interface GeoFeature {
  properties: { name?: string; city?: string; street?: string; postcode?: string };
}
async function geoSearch(text: string, type: "city" | "street", cityName?: string): Promise<GeoFeature[]> {
  if (!GEOAPIFY_KEY || text.length < 2) return [];
  const url = new URL(GEOAPIFY_URL);
  url.searchParams.set("text", cityName ? `${text}, ${cityName}` : text);
  url.searchParams.set("type", type);
  url.searchParams.set("filter", "countrycode:il");
  url.searchParams.set("lang", "he");
  url.searchParams.set("limit", "10");
  url.searchParams.set("apiKey", GEOAPIFY_KEY);
  const res = await fetch(url.toString());
  const j = await res.json();
  return j.features || [];
}


// ── Component ───────────────────────────────────────────────────────────────
interface Props {
  address: string;
  houseNumber?: string;
  city: string;
  zipCode?: string;
  onAddressChange: (v: string) => void;
  onHouseNumberChange?: (v: string) => void;
  onCityChange: (v: string) => void;
  onZipChange?: (v: string) => void;
  className?: string;
}

export function AddressAutocomplete({
  address, houseNumber = "", city, zipCode,
  onAddressChange, onHouseNumberChange, onCityChange, onZipChange,
  className = "",
}: Props) {
  const [cityQ, setCityQ]       = useState(city);
  const [cityList, setCityList] = useState<string[]>([]);
  const [showCity, setShowCity] = useState(false);

  const [streetQ, setStreetQ]         = useState(address);
  const [streetList, setStreetList]   = useState<{ name: string }[]>([]);
  const [showStreet, setShowStreet]   = useState(false);
  const [streetLoading, setStreetLoading] = useState(false);

  const wrapRef   = useRef<HTMLDivElement>(null);
  const cityTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const strtTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowCity(false); setShowStreet(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── City search ─────────────────────────────────────────────────────────
  const searchCities = useCallback((q: string) => {
    clearTimeout(cityTimer.current);
    if (q.length < 2) { setCityList([]); return; }
    cityTimer.current = setTimeout(async () => {
      if (GEOAPIFY_KEY) {
        const features = await geoSearch(q, "city").catch(() => []);
        const seen = new Set<string>();
        const res: string[] = [];
        for (const f of features) {
          const n = f.properties.city || f.properties.name;
          if (n && !seen.has(n)) { seen.add(n); res.push(n); }
        }
        if (res.length) { setCityList(res); setShowCity(true); return; }
      }
      const cities = await searchCitiesFromGov(q);
      setCityList(cities);
      setShowCity(true);
    }, 250);
  }, []);

  // ── Street search ────────────────────────────────────────────────────────
  const searchStreets = useCallback((q: string, cityName: string) => {
    clearTimeout(strtTimer.current);
    if (q.length < 2 && !cityName) { setStreetList([]); setShowStreet(false); return; }
    // Show loading immediately so user gets feedback
    setStreetLoading(true);
    setShowStreet(true);
    strtTimer.current = setTimeout(async () => {
      try {
        if (GEOAPIFY_KEY) {
          const features = await geoSearch(q, "street", cityName).catch(() => []);
          const seen = new Set<string>();
          const res: { name: string }[] = [];
          for (const f of features) {
            const n = f.properties.street || f.properties.name;
            if (n && !seen.has(n)) { seen.add(n); res.push({ name: n }); }
          }
          if (res.length) { setStreetList(res); setStreetLoading(false); return; }
        }
        const streets = await searchStreetsFromGov(q, cityName);
        setStreetList(streets);
      } finally {
        setStreetLoading(false);
      }
    }, 250);
  }, []);

  const handleCityInput = (v: string) => { setCityQ(v); onCityChange(v); searchCities(v); };
  const handleCitySelect = (c: string) => {
    setCityQ(c); onCityChange(c); setShowCity(false);
    // Pre-load streets for the selected city
    searchStreets(streetQ, c);
  };

  const handleStreetInput = (v: string) => {
    setStreetQ(v);
    onAddressChange(v);
    searchStreets(v, city);
  };

  const handleStreetSelect = (s: { name: string }) => {
    setStreetQ(s.name);
    onAddressChange(s.name);
    setShowStreet(false);
  };

  const inp  = `w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white`;
  const drop = `absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-52 overflow-y-auto`;

  return (
    <div ref={wrapRef} className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
      {/* City */}
      <div className="relative">
        <label className="block text-xs font-semibold text-gray-500 mb-1">
          עיר / ישוב <span className="text-red-500">*</span>
        </label>
        <input value={cityQ} onChange={(e) => handleCityInput(e.target.value)}
          onFocus={() => { setShowStreet(false); if (cityQ.length >= 2) setShowCity(true); }}
          className={inp} placeholder="הקלד שם ישוב..." autoComplete="off" />
        {showCity && cityList.length > 0 && (
          <ul className={drop}>
            {cityList.map((c) => (
              <li key={c} onMouseDown={() => handleCitySelect(c)}
                className="px-4 py-2.5 hover:bg-indigo-50 cursor-pointer text-sm text-gray-800">{c}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Street */}
      <div className="relative">
        <label className="block text-xs font-semibold text-gray-500 mb-1">
          רחוב <span className="text-red-500">*</span>
        </label>
        <input value={streetQ} onChange={(e) => handleStreetInput(e.target.value)}
          onFocus={() => {
            setShowCity(false); // סגור dropdown עיר
            if (streetList.length > 0) { setShowStreet(true); }
            else { searchStreets(streetQ, city); }
          }}
          className={inp} placeholder="הקלד שם רחוב..." autoComplete="off" />
        {showStreet && (streetLoading || streetList.length > 0) && (
          <ul className={drop}>
            {streetLoading ? (
              <li className="px-4 py-3 text-sm text-gray-400 text-center">מחפש רחובות...</li>
            ) : streetList.map((s) => (
              <li key={s.name} onMouseDown={() => handleStreetSelect(s)}
                className="px-4 py-2.5 hover:bg-indigo-50 cursor-pointer text-sm text-gray-800">
                {s.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* House number */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">מספר בית</label>
        <input
          value={houseNumber}
          onChange={(e) => onHouseNumberChange?.(e.target.value)}
          className={inp}
          placeholder="מספר"
          type="text"
        />
      </div>

      {/* Zip */}
      {onZipChange !== undefined && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">מיקוד</label>
          <input value={zipCode || ""} onChange={(e) => onZipChange(e.target.value)}
            className={inp} placeholder="הזן מיקוד" />
        </div>
      )}
    </div>
  );
}
