
import { MetadataRoute } from 'next'

/**
 * FaydaTrack Institutional Manifest
 * Configures the web terminal to be "Installable" on Android/iOS devices.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FaydaTrack Bureau Terminal',
    short_name: 'FaydaTrack',
    description: 'High-fidelity institutional terminal for registration tracking and field coordination.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      {
        src: 'https://services.eaes.et/NID-Logos/Fayda%20For%20Ethiopia%20logo-%20english-2-01.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: 'https://services.eaes.et/NID-Logos/Fayda%20For%20Ethiopia%20logo-%20english-2-01.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      }
    ],
  }
}
