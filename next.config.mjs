/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // ← ЭТА СТРОКА ОБЯЗАТЕЛЬНА!
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig