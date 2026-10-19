/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The API is a separate NestJS application; no rewrites are needed because
  // the browser talks to it directly with credentials included.
};

export default nextConfig;
