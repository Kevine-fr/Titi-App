import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  // Server Actions pas utilisées pour l'upload (on passe par un Route Handler streaming),
  // mais on relève la limite par défaut au cas où.
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default config;
