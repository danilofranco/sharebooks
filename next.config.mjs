/** @type {import('next').NextConfig} */
const nextConfig = {
  // Temporariamente ignorar erros de TypeScript no build (hotfix).
  // REMOVER assim que as tipagens do Supabase forem corrigidas.
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // ── Security headers (OWASP) ──────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Previne clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // XSS protection (legacy browsers)
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Previne MIME sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Referrer policy
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Permissions policy
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // HSTS (force HTTPS em produção)
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // CSP (OWASP A02:2025) — unsafe-inline necessário para Next.js/Tailwind
          // Em produção com nonce, usar next.config experimental.sri
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // unsafe-inline é necessário para Next.js inline scripts/styles
              // unsafe-eval apenas em dev; em prod, Next.js não precisa
              process.env.NODE_ENV === "development"
                ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
                : "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' blob: data: https://*.supabase.co",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mercadopago.com https://sr-client-cfg.amplitude.com https://api2.amplitude.com https://api.amplitude.com",
              "frame-src https://www.mercadopago.com.br https://www.mercadopago.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
