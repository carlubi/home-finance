import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Permite query strings de cache-busting en imágenes locales (p. ej. /icon.png?v=2)
    localPatterns: [{ pathname: "/**" }],
  },
};

export default nextConfig;
