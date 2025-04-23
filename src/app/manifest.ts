import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Gym Course',
        short_name: 'บันทึกคอร์สเรียน',
        description: 'Applications for data record',
        start_url: '/',
        display: 'standalone',
        orientation: "any",
        scope: "/",
        background_color: '#ffffff',
        theme_color: '#000000',
        icons: [
            {
                src: "icons/icon-16.png",
                type: "image/png",
                sizes: "16x16",
                purpose: "any"
            },
            {
                src: "icons/icon-48.png",
                type: "image/png",
                sizes: "48x48",
                purpose: "any"
            },
            {
                src: "icons/icon-64.png",
                type: "image/png",
                sizes: "64x64",
                purpose: "any"
            },
            {
                src: "icons/icon-72.png",
                type: "image/png",
                sizes: "72x72",
                purpose: "any"
            },
            {
                src: "icons/icon-96.png",
                type: "image/png",
                sizes: "96x96",
                purpose: "any"
            },
            {
                src: "icons/icon-128.png",
                type: "image/png",
                sizes: "128x128",
                purpose: "any"
            },
            {
                src: "icons/icon-144.png",
                type: "image/png",
                sizes: "144x144",
                purpose: "any"
            },
            {
                src: "icons/icon-152.png",
                type: "image/png",
                sizes: "152x152",
                purpose: "any"
            },
            {
                src: "icons/icon-180.png",
                type: "image/png",
                sizes: "180x180",
                purpose: "any"
            },
            {
                src: "icons/icon-192.png",
                type: "image/png",
                sizes: "192x192",
                purpose: "any"
            },
            {
                src: "icons/icon-256.png",
                type: "image/png",
                sizes: "256x256",
                purpose: "any"
            },
            {
                src: "icons/icon-512.png",
                type: "image/png",
                sizes: "512x512",
                purpose: "any"
            }
        ],
    }
}