import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/context/cart-context";
import { WishlistProvider } from "@/context/wishlist-context";
import Link from "next/link";
import { ShoppingBag, MessageCircle } from "lucide-react";
import { HeaderCartButton } from "@/components/header-cart-button";
import { HeaderWishlistButton } from "@/components/header-wishlist-button";

export const metadata: Metadata = {
  title: "Aura Essentials | Curated Multi-Sector Storefront",
  description:
    "Jewelry & Accessories, Girly Essentials, Content Accessories, and Kitchen Souvenirs. Fast delivery across Nigeria.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <CartProvider>
          <WishlistProvider>
            {/* Top Announcement Bar */}
            <div className="bg-slate-900 text-white text-xs font-medium py-2 text-center px-4">
              🚀 Fast delivery across Lagos & nationwide | Instant checkout via Paystack
            </div>

            {/* Navigation Bar */}
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <Link href="/" className="text-xl font-bold tracking-tight text-slate-900">
                  Aura<span className="text-pink-600">.</span>Store
                </Link>

                {/* Sector Navigation */}
                <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
                  <Link href="/#jewelry-accessories" className="hover:text-slate-900 transition-colors">
                    Jewelry & Accessories
                  </Link>
                  <Link href="/#girly-essentials" className="hover:text-slate-900 transition-colors">
                    Girly Essentials
                  </Link>
                  <Link href="/#content-accessories" className="hover:text-slate-900 transition-colors">
                    Content Accessories
                  </Link>
                  <Link href="/#kitchen-souvenirs" className="hover:text-slate-900 transition-colors">
                    Kitchen/Souvenirs
                  </Link>
                </nav>

                {/* Header Actions */}
                <div className="flex items-center gap-3">
                  {/* Track Order */}
                  <Link
                    href="/track-order"
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors hidden sm:inline-block"
                  >
                    Track Order
                  </Link>

                  {/* WhatsApp Support Button */}
                  <a
                    href="https://wa.me/2348000000000?text=Hello%2C%20I%20have%20an%20inquiry%20about%20your%20store"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    WhatsApp Support
                  </a>

                  {/* Wishlist Trigger */}
                  <HeaderWishlistButton />

                  {/* Cart Trigger */}
                  <HeaderCartButton />
                </div>
              </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1">{children}</main>

          {/* Footer */}
          <footer className="bg-white border-t border-slate-200 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <span className="text-lg font-bold text-slate-900">
                  Aura<span className="text-pink-600">.</span>Store
                </span>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                  Your curated destination for everyday jewelry, girly lifestyle essentials, creator gadgets, and premium home souvenirs.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Explore Sectors</h4>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  <li><Link href="/#jewelry-accessories">Jewelry & Accessories</Link></li>
                  <li><Link href="/#girly-essentials">Girly Essentials</Link></li>
                  <li><Link href="/#content-accessories">Content Accessories</Link></li>
                  <li><Link href="/#kitchen-souvenirs">Kitchen & Souvenirs</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Customer Care</h4>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  <li>
                    <a
                      href="https://wa.me/2348000000000"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 font-medium hover:underline flex items-center gap-1"
                    >
                      <MessageCircle className="w-4 h-4" /> Chat on WhatsApp
                    </a>
                  </li>
                  <li>
                    <Link href="/track-order" className="hover:text-slate-900 transition-colors">
                      Track Your Order
                    </Link>
                  </li>
                  <li>Email: support@aurastore.ng</li>
                  <li>Delivery: Lagos 24-48 hrs, Nationwide 2-5 days</li>
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Connect</h4>
                <div className="mt-3 flex items-center gap-4 text-sm text-slate-600">
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-pink-600">Instagram</a>
                  <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="hover:text-black">TikTok</a>
                  <a href="https://wa.me/2348000000000" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-600">WhatsApp</a>
                </div>
                <div className="mt-6">
                  <Link href="/admin" className="text-xs text-slate-400 hover:text-slate-600 underline">
                    Admin Portal
                  </Link>
                </div>
              </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
              © {new Date().getFullYear()} Aura Store. All rights reserved. Secured by Paystack.
            </div>
          </footer>
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}
