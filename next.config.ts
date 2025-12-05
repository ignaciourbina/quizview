import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  output: 'export',           // Enable static HTML export
  distDir: 'docs',            // Output to docs/ for GitHub Pages
  basePath: '/quizview',      // Must match your GitHub repo name
  assetPrefix: '/quizview/',  // Prefix for all assets
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true, // Required for static export
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
