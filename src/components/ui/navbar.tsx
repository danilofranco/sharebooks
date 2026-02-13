"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, Plus, MessageCircle, LogOut, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";

export function Navbar() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (data) setProfile(data);
      }
    };
    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.jpg"
            alt="ShareBooks"
            width={140}
            height={40}
            className="h-9 w-auto"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-3 md:flex">
          <Link href="/listings" className="btn-ghost text-sm">
            Buscar livros
          </Link>
          {user ? (
            <>
              <Link href="/listings/new" className="btn-primary text-sm">
                <Plus className="h-4 w-4" />
                Anunciar
              </Link>
              <Link href="/dashboard" className="btn-ghost text-sm">
                <MessageCircle className="h-4 w-4" />
                Painel
              </Link>
              <Link href="/settings" className="btn-ghost text-sm">
                <Settings className="h-4 w-4" />
              </Link>
              {profile?.role === "admin" && (
                <Link href="/admin" className="btn-ghost text-sm text-brand-600">
                  Admin
                </Link>
              )}
              <button onClick={handleSignOut} className="btn-ghost text-sm">
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/sign-in" className="btn-ghost text-sm">
                Entrar
              </Link>
              <Link href="/auth/sign-up" className="btn-primary text-sm">
                Criar conta
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden btn-ghost p-2"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-gray-100 bg-white px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-2 pt-2">
            <Link
              href="/listings"
              className="btn-ghost justify-start"
              onClick={() => setMenuOpen(false)}
            >
              Buscar livros
            </Link>
            {user ? (
              <>
                <Link
                  href="/listings/new"
                  className="btn-primary justify-start"
                  onClick={() => setMenuOpen(false)}
                >
                  <Plus className="h-4 w-4" />
                  Anunciar
                </Link>
                <Link
                  href="/dashboard"
                  className="btn-ghost justify-start"
                  onClick={() => setMenuOpen(false)}
                >
                  Painel
                </Link>
                <Link
                  href="/settings"
                  className="btn-ghost justify-start"
                  onClick={() => setMenuOpen(false)}
                >
                  <Settings className="h-4 w-4" />
                  Configurações
                </Link>
                {profile?.role === "admin" && (
                  <Link
                    href="/admin"
                    className="btn-ghost justify-start text-brand-600"
                    onClick={() => setMenuOpen(false)}
                  >
                    Admin
                  </Link>
                )}
                <button
                  onClick={() => {
                    handleSignOut();
                    setMenuOpen(false);
                  }}
                  className="btn-ghost justify-start"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/sign-in"
                  className="btn-ghost justify-start"
                  onClick={() => setMenuOpen(false)}
                >
                  Entrar
                </Link>
                <Link
                  href="/auth/sign-up"
                  className="btn-primary justify-start"
                  onClick={() => setMenuOpen(false)}
                >
                  Criar conta
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
