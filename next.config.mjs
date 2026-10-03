/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // ← ЭТА СТРОКА ГОВОРИТ NEXT.JS СОЗДАТЬ ПАПКУ "out"
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig