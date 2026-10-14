"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, MessageCircle, RotateCw } from "lucide-react";

// error.message is never rendered: a Prisma connection failure carries the
// database hostname, and this page is public. The digest is the safe handle.
export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Storefront] unhandled render failure:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-20">
      <div className="max-w-lg w-full text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-50 text-pink-600">
          <MessageCircle className="h-7 w-7" />
        </div>

        <h1 className="mt-6 text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          This page could not load.
        </h1>
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          Something went wrong on our side, not yours. Nothing has been charged and your cart is
          still in this browser tab — try again in a moment, or message us and a human will pick it up.
        </p>

        {error.digest && (
          <p className="mt-4 text-[11px] font-mono text-slate-400">
            Reference: {error.digest}
          </p>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
          >
            <RotateCw className="h-4 w-4" /> Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:border-slate-900 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to store
          </Link>
          <a
            href="https://wa.me/2348000000000?text=Hello%2C%20your%20site%20showed%20me%20an%20error%20page"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp support
          </a>
        </div>
      </div>
    </div>
  );
}
