import { useState, useEffect } from "react";

interface City {
  id: number;
  nome: string;
  estado: string | null;
  ativo: boolean;
  ordem: number;
}

// Cache em módulo — persiste entre renders, evita múltiplos fetches
let cache: City[] | null = null;
let promise: Promise<City[]> | null = null;

async function fetchCities(): Promise<City[]> {
  const res = await fetch("/api/cities");
  if (!res.ok) throw new Error("Erro ao buscar cidades");
  const data: City[] = await res.json();
  return data;
}

/**
 * Hook que retorna a lista de cidades ativas do banco.
 * - Faz apenas 1 requisição por sessão (cache em módulo)
 * - invalidate() força um novo fetch (usar após salvar no admin)
 */
export function useCities() {
  const [cities, setCities] = useState<City[]>(cache ?? []);
  const [loading, setLoading] = useState<boolean>(!cache);

  useEffect(() => {
    if (cache) {
      setCities(cache);
      setLoading(false);
      return;
    }

    if (!promise) {
      promise = fetchCities().then((c) => {
        cache = c;
        return c;
      }).catch(() => {
        promise = null;
        return [] as City[];
      });
    }

    promise.then((c) => {
      setCities(c);
      setLoading(false);
    });
  }, []);

  /** Limpa o cache e força re-fetch no próximo render */
  const invalidate = () => {
    cache = null;
    promise = null;
  };

  return { cities, loading, invalidate };
}
