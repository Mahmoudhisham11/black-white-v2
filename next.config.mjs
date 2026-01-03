/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'firebasestorage.googleapis.com',
                pathname: '/**',
            },
        ],
    },
};

// تعطيل PWA مؤقتاً لحل مشكلة التوافق مع Next.js 16
// يمكن تفعيله لاحقاً بعد حل مشكلة التوافق
export default nextConfig;
