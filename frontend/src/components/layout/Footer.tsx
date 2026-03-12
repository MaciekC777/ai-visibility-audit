import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-sm text-gray-500">
          &copy; {new Date().getFullYear()} AI Visibility Audit. All rights reserved.
        </p>
        <div className="flex items-center gap-6 text-sm text-gray-500">
          <Link href="/pricing" className="hover:text-gray-900 transition-colors">Pricing</Link>
          <Link href="/login" className="hover:text-gray-900 transition-colors">Login</Link>
        </div>
      </div>
    </footer>
  );
}
