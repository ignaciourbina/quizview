import type React from 'react';
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster'; // Import Toaster

// export const metadata: Metadata = {
//   title: 'QuizView',
//   description: 'Preview your Brightspace Quiz CSV files',
// };

// Use metadata object instead of config export
export const metadata: Metadata = {
  title: 'QuizView',
  description: 'Preview your Brightspace Quiz CSV files',
  // Add other metadata fields as needed
  // Example: icons, openGraph, etc.
  // icons: {
  //   icon: '/favicon.ico', // Example, make sure the favicon exists
  // },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      {/* Add suppressHydrationWarning to potentially mitigate issues from browser extensions modifying the DOM */}
      <body
        className={cn(
          GeistSans.variable,
          GeistMono.variable,
          "font-sans", // Apply the sans font by default
          "antialiased bg-background text-foreground"
        )}
        >
        {children}
        <Toaster /> {/* Add Toaster component here */}
      </body>
    </html>
  );
}
