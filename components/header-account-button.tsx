"use client";

import Link from "next/link";
import { User } from "lucide-react";

export function HeaderAccountButton() {
  return (
    <Link
      href="/account"
      className="p-2 text-slate-700 hover:text-slate-900 transition-colors rounded-full hover:bg-slate-100"
      aria-label="My Account"
      title="Customer Account & Order History"
    >
      <User className="w-5 h-5 text-slate-700" />
    </Link>
  );
}
