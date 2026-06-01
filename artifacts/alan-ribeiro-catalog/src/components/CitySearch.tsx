import { useState, useRef, useEffect } from "react";
import { MapPin } from "lucide-react";
import { useCities } from "@/hooks/useCities";

interface CitySearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function CitySearch({ value, onChange }: CitySearchProps) {
  const { cities } = useCities();
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = (cities || []).filter((c) => {
    const q = query.toLowerCase();
    const label = `${c.nome}${c.estado ? `, ${c.estado}` : ""}`.toLowerCase();
    return label.includes(q);
  });

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const select = (city: (typeof cities)[0]) => {
    const label = city.estado ? `${city.nome}, ${city.estado}` : city.nome;
    setQuery(label);
    onChange(label);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); onChange(e.target.value); }}
          onFocus={() => setOpen(true)}
          className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="Digite para buscar cidade..."
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-xl shadow-2xl max-h-48 overflow-y-auto">
          {filtered.map((city) => (
            <button
              key={city.id}
              type="button"
              onClick={() => select(city)}
              className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-primary/10 transition-colors flex items-center gap-2"
            >
              <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              {city.nome}{city.estado ? `, ${city.estado}` : ""}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
