/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',      // Kini ang mopahimo sa 'out' folder
  images: {
    unoptimized: true,   // Kinahanglan kini kung mag-static export ka
  },
  eslint: {
    ignoreDuringBuilds: true, // Para dili ma-stop ang build kung naay gamay nga warning
  },
};

export default nextConfig;