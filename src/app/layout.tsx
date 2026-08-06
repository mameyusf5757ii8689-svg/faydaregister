
import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/navbar';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { ThemeProvider } from '@/components/theme-provider';

const INSTITUTIONAL_ICON = "https://services.eaes.et/NID-Logos/Fayda%20For%20Ethiopia%20logo-%20english-2-01.png";

export const metadata: Metadata = {
  title: 'FaydaTrack | Professional Registration Tracking',
  description: 'High-fidelity terminal for institutional registration tracking and field coordination.',
  icons: {
    icon: INSTITUTIONAL_ICON,
    shortcut: INSTITUTIONAL_ICON,
    apple: INSTITUTIONAL_ICON,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground min-h-screen flex flex-col transition-colors duration-300">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <FirebaseClientProvider>
            <Navbar />
            <main className="flex-1 container mx-auto py-8 px-4 sm:px-6 lg:px-8">
              {children}
            </main>
            <Toaster />
          </FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
