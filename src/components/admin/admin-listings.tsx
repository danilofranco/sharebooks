"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { STATUSES } from "@/lib/constants";
import { formatPrice, timeAgo } from "@/lib/utils";

type AdminListing = {
  id: string;
  title: string;
  school_name: string;
  grade: string;
  status: string;
  price_cents: number | null;
  created_at: string;
  profiles: { full_name: string } | null;
  listing_photos: { url: string; sort_order: number }[];
};

type Props = {
  listings: AdminListing[];
};

export function AdminListings({ listings: initialListings }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [search, setSearch] = useState("");
  const [listings, setListings] = useState(initialListings);

  const filtered = listings.filter(
    (l) =>
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.school_name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleRemove = async (id: string) => {
    if (!confirm("Remover este anúncio?")) return;

    const { error } = await supabase
      .from("listings")
      .update({ status: "removed" })
      .eq("id", id);

    if (!error) {
      setListings((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: "removed" } : l)),
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-10"
          placeholder="Buscar anúncio..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2">Anúncio</th>
              <th className="pb-2">Anunciante</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Preço</th>
              <th className="pb-2">Data</th>
              <th className="pb-2">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((listing) => (
              <tr key={listing.id} className="hover:bg-gray-50">
                <td className="py-3">
                  <div className="flex items-center gap-3">
                    {listing.listing_photos?.[0]?.url && (
                      <img
                        src={listing.listing_photos[0].url}
                        alt=""
                        className="h-10 w-10 rounded object-cover"
                      />
                    )}
                    <div>
                      <p className="font-medium">{listing.title}</p>
                      <p className="text-xs text-gray-500">
                        {listing.school_name} · {listing.grade}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-3">
                  {listing.profiles?.full_name || "—"}
                </td>
                <td className="py-3">
                  <span
                    className={`badge text-xs ${
                      listing.status === "removed"
                        ? "bg-red-100 text-red-700"
                        : listing.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {STATUSES[listing.status as keyof typeof STATUSES] ||
                      listing.status}
                  </span>
                </td>
                <td className="py-3">{formatPrice(listing.price_cents)}</td>
                <td className="py-3 text-gray-500">
                  {timeAgo(listing.created_at)}
                </td>
                <td className="py-3">
                  {listing.status !== "removed" && (
                    <button
                      onClick={() => handleRemove(listing.id)}
                      className="btn-ghost p-1 text-red-500 hover:text-red-700"
                      title="Remover anúncio"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-gray-400">Nenhum anúncio encontrado.</p>
      )}
    </div>
  );
}
