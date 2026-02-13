"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { CONDITIONS, DEAL_TYPES, GRADES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Props = {
  searchParams: Record<string, string | undefined>;
};

// Chips rápidos para acesso em 1 clique
const QUICK_CHIPS = [
  { label: "Doações", params: { deal_type: "donation" } },
  { label: "6º ano", params: { grade: "6º ano" } },
  { label: "7º ano", params: { grade: "7º ano" } },
  { label: "8º ano", params: { grade: "8º ano" } },
  { label: "9º ano", params: { grade: "9º ano" } },
  { label: "1º EM", params: { grade: "1º EM" } },
  { label: "Novo", params: { condition: "new" } },
  { label: "Até R$30", params: { max_price: "30" } },
] as const;

export function SearchFilters({ searchParams }: Props) {
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(false);

  const [q, setQ] = useState(searchParams.q || "");
  const [school, setSchool] = useState(searchParams.school || "");
  const [grade, setGrade] = useState(searchParams.grade || "");
  const [condition, setCondition] = useState(searchParams.condition || "");
  const [dealType, setDealType] = useState(searchParams.deal_type || "");
  const [minPrice, setMinPrice] = useState(searchParams.min_price || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.max_price || "");
  const [location, setLocation] = useState(searchParams.location || "");
  const [sort, setSort] = useState(searchParams.sort || "");

  const buildUrl = (overrides: Record<string, string> = {}) => {
    const params = new URLSearchParams();
    const merged = {
      q, school, grade, condition, deal_type: dealType,
      min_price: minPrice, max_price: maxPrice, location, sort,
      ...overrides,
    };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    return `/listings?${params.toString()}`;
  };

  const applyFilters = () => router.push(buildUrl());

  const clearFilters = () => {
    setQ(""); setSchool(""); setGrade(""); setCondition("");
    setDealType(""); setMinPrice(""); setMaxPrice(""); setLocation(""); setSort("");
    router.push("/listings");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const handleChip = (chipParams: Record<string, string>) => {
    // Toggle: se o chip já está ativo, desativa
    const isActive = Object.entries(chipParams).every(
      ([k, v]) => searchParams[k] === v,
    );
    if (isActive) {
      const params = new URLSearchParams(searchParams as Record<string, string>);
      Object.keys(chipParams).forEach((k) => params.delete(k));
      router.push(`/listings?${params.toString()}`);
    } else {
      const params = new URLSearchParams(searchParams as Record<string, string>);
      Object.entries(chipParams).forEach(([k, v]) => params.set(k, v));
      params.delete("page");
      router.push(`/listings?${params.toString()}`);
    }
  };

  const hasActiveFilters = Object.entries(searchParams).some(
    ([k, v]) => v && k !== "page",
  );

  return (
    <div className="mb-6 space-y-3">
      {/* Barra de busca */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="input pl-10"
            placeholder="Busque por escola, série ou livro..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary">
          Buscar
        </button>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "btn-secondary",
            showFilters && "bg-brand-50 border-brand-300",
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filtros</span>
        </button>
      </form>

      {/* Chip filters rápidos */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {QUICK_CHIPS.map((chip) => {
          const isActive = Object.entries(chip.params).every(
            ([k, v]) => searchParams[k] === v,
          );
          return (
            <button
              key={chip.label}
              onClick={() => handleChip(chip.params as Record<string, string>)}
              className={cn(
                "flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50",
              )}
            >
              {chip.label}
            </button>
          );
        })}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex-shrink-0 flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600"
          >
            <X className="h-3 w-3" />
            Limpar
          </button>
        )}
      </div>

      {/* Filtros expandidos */}
      {showFilters && (
        <div className="card p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="label">Escola</label>
              <input
                className="input"
                placeholder="Nome da escola"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Série</label>
              <select
                className="input"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              >
                <option value="">Todas</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Estado</label>
              <select
                className="input"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
              >
                <option value="">Todos</option>
                {Object.entries(CONDITIONS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Tipo</label>
              <select
                className="input"
                value={dealType}
                onChange={(e) => setDealType(e.target.value)}
              >
                <option value="">Todos</option>
                {Object.entries(DEAL_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="label">Preço mín (R$)</label>
              <input
                className="input"
                type="number"
                min="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Preço máx (R$)</label>
              <input
                className="input"
                type="number"
                min="0"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Local</label>
              <input
                className="input"
                placeholder="Bairro, cidade"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Ordenar</label>
              <select
                className="input"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="">Recentes</option>
                <option value="price_asc">Menor preço</option>
                <option value="price_desc">Maior preço</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={applyFilters} className="btn-primary">
              Aplicar filtros
            </button>
            <button onClick={clearFilters} className="btn-ghost">
              <X className="h-4 w-4" />
              Limpar tudo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
