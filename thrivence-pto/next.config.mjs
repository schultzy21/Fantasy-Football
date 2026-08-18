import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // This app lives in a subfolder of the fantasy-football repo, which has
  // its own lockfile -- pin the workspace root here so Next.js doesn't
  // guess wrong when both lockfiles are present.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
