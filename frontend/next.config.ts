import type { NextConfig } from "next";

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https: blob:;
  font-src 'self' data:;
  connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com https://us-central1-aiplatform.googleapis.com https://oauth2.googleapis.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
`;

const nextConfig: NextConfig = {
  serverExternalPackages: ['onnxruntime-node'],
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "5001",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  async headers() {
    const isProd = process.env.NODE_ENV === 'production';
    const headers = [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: cspHeader.replace(/\s+/g, ' ').trim() },
        ],
      },
    ];

    if (isProd) {
      headers[0].headers.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
      });
    }

    return headers;
  },
};

export default nextConfig;