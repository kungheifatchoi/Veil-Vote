import type { NextConfig } from "next";
import webpack from "webpack";

const nextConfig: NextConfig = {
  // Transpile SDK packages
  transpilePackages: ['@zama-fhe/relayer-sdk'],
  
  // Enable Turbopack with empty config (Next.js 16 default)
  turbopack: {},
  
  // Webpack configuration for browser compatibility (fallback)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Polyfill 'global' for browser (SDK uses Node.js global)
      config.plugins.push(
        new webpack.DefinePlugin({
          'global': 'globalThis',
        })
      );
      
      // Polyfill Node.js modules for browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        buffer: false,
      };
    }
    
    // Ignore optional peer dependencies
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    
    return config;
  },
  
  // Add CORS headers for SDK threads
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
