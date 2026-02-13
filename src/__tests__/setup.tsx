import "@testing-library/jest-dom/vitest";

// Mock do Next.js navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// Mock do Next.js Image (sem JSX para evitar problemas com esbuild)
vi.mock("next/image", () => ({
  default: function MockImage(props: Record<string, unknown>) {
    const { priority, fill, ...rest } = props;
    return <img {...(rest as React.ImgHTMLAttributes<HTMLImageElement>)} />;
  },
}));
