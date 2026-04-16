import { useState, useEffect } from "react";

interface Genre {
  id: number;
  nome: string;
  ativo: boolean;
  ordem: number;
}

// Cache em módulo — persiste entre renders, evita múltiplos fetches
let cache: string[] | null = null;
let promise: Promise<string[]> | null = null;

async function fetchGenres(): Promise<string[]> {
  const res = await fetch("/api/genres");
  if (!res.ok) throw new Error("Erro ao buscar gêneros");
  const data: Genre[] = await res.json();
  return data.map((g) => g.nome);
}

/**
 * Hook que retorna a lista de gêneros ativos do banco.
 * - Faz apenas 1 requisição por sessão (cache em módulo)
 * - invalidate() força um novo fetch (usar após salvar no admin)
 */
export function useGenres() {
  const [genres, setGenres]   = useState<string[]>(cache ?? []);
  const [loading, setLoading] = useState<boolean>(!cache);

  useEffect(() => {
    if (cache) {
      setGenres(cache);
      setLoading(false);
      return;
    }

    if (!promise) {
      promise = fetchGenres().then((g) => {
        cache = g;
        return g;
      }).catch(() => {
        promise = null; // permite retry
        return [] as string[];
      });
    }

    promise.then((g) => {
      setGenres(g);
      setLoading(false);
    });
  }, []);

  /** Limpa o cache e força re-fetch no próximo render */
  const invalidate = () => {
    cache   = null;
    promise = null;
  };

  return { genres, loading, invalidate };
}
