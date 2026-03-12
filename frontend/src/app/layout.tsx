import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  title: {
    default: 'AI Visibility Audit — See How AI Models Describe Your Brand',
    template: '%s | AI Visibility Audit',
  },
  description:
    'Audit how ChatGPT, Gemini, Claude, and Perplexity describe your brand. Get actionable scores and recommendations to boost your AI visibility.',
  keywords: ['AI visibility', 'brand audit', 'ChatGPT', 'Gemini', 'AI SEO'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body>{children}</body>
    </html>
  );
}
