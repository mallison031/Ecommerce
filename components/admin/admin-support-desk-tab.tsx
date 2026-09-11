"use client";

import React, { useState, useEffect } from "react";
import { formatKoboToNaira } from "@/lib/utils";
import {
  MessageSquare,
  Search,
  RefreshCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Loader2,
  Send,
  MessageCircle,
  Package,
  User,
  Phone,
  Mail,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Ticket {
  id: string;
  customer_name?: string | null;
  customer_email?: string | null;
  whatsapp_phone_e164: string;
  subject?: string | null;
  message: string;
  status: "open" | "escalated" | "closed";
  admin_notes?: string | null;
  resolution_notes?: string | null;
  created_at: string;
  updated_at: string;
  whatsappReplyUrl: string;
  order?: {
    id: string;
    order_number: number;
    status: string;
    total_kobo: number;
    courier_name?: string | null;
    tracking_number?: string | null;
    customer?: {
      name: string;
      email: string;
      phone: string;
    } | null;
  } | null;
}

export default function AdminSupportDeskTab() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [counts, setCounts] = useState({ total: 0, open: 0, escalated: 0, closed: 0 });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState<{ [id: string]: string }>({});

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());

      const res = await fetch(`/api/admin/tickets?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
        if (data.counts) setCounts(data.counts);
      }
    } catch (e) {
      console.error("Failed to load tickets:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTickets();
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: "open" | "escalated" | "closed") => {
    setUpdatingId(ticketId);
    try {
      const res = await fetch("/api/admin/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          status: newStatus,
          adminNotes: notesInput[ticketId] !== undefined ? notesInput[ticketId] : undefined,
        }),
      });
      if (res.ok) {
        fetchTickets();
      }
    } catch (e) {
      console.error("Failed to update status:", e);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveNotes = async (ticketId: string) => {
    setUpdatingId(ticketId);
    try {
      const res = await fetch("/api/admin/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          adminNotes: notesInput[ticketId] || "",
        }),
      });
      if (res.ok) {
        fetchTickets();
      }
    } catch (e) {
      console.error("Failed to save notes:", e);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter("all")}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            statusFilter === "all"
              ? "bg-slate-900 text-white border-slate-900 shadow-sm"
              : "bg-white text-slate-900 border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider opacity-80">All Inquiries</span>
            <MessageSquare className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black mt-2">{counts.total}</p>
        </div>

        <div
          onClick={() => setStatusFilter("open")}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            statusFilter === "open"
              ? "bg-amber-600 text-white border-amber-600 shadow-sm"
              : "bg-white text-slate-900 border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-500">Open</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black mt-2 text-amber-600 dark:text-inherit">{counts.open}</p>
        </div>

        <div
          onClick={() => setStatusFilter("escalated")}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            statusFilter === "escalated"
              ? "bg-rose-600 text-white border-rose-600 shadow-sm"
              : "bg-white text-slate-900 border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-500">Escalated</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black mt-2 text-rose-600 dark:text-inherit">{counts.escalated}</p>
        </div>

        <div
          onClick={() => setStatusFilter("closed")}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            statusFilter === "closed"
              ? "bg-emerald-700 text-white border-emerald-700 shadow-sm"
              : "bg-white text-slate-900 border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black mt-2 text-emerald-600 dark:text-inherit">{counts.closed}</p>
        </div>
      </div>

      {/* Action Bar & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer, phone, order #..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-xs text-slate-500 font-medium">
            Showing {tickets.length} ticket{tickets.length === 1 ? "" : "s"}
          </span>
          <button
            onClick={fetchTickets}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh list"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Tickets List */}
      {loading ? (
        <div className="py-20 text-center bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-2" />
          <p className="text-xs text-slate-500">Loading support inquiries...</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-xl border border-slate-200 p-6">
          <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No support tickets found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {statusFilter !== "all"
              ? `There are currently no tickets matching "${statusFilter}".`
              : "No customer inquiries have been submitted yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => {
            const isExpanded = expandedTicketId === ticket.id;
            return (
              <div
                key={ticket.id}
                className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden transition-all hover:border-slate-300"
              >
                {/* Header row */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          ticket.status === "open"
                            ? "bg-amber-100 text-amber-800"
                            : ticket.status === "escalated"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {ticket.status}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">
                        {ticket.subject || "General Inquiry"}
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        • {new Date(ticket.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap pt-0.5">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <strong>{ticket.customer_name || "Guest Customer"}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {ticket.whatsapp_phone_e164}
                      </span>
                      {ticket.customer_email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {ticket.customer_email}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions & WhatsApp Reply */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <a
                      href={ticket.whatsappReplyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Reply on WhatsApp
                    </a>

                    {ticket.status !== "closed" ? (
                      <button
                        onClick={() => handleUpdateStatus(ticket.id, "closed")}
                        disabled={updatingId === ticket.id}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-semibold rounded-lg inline-flex items-center gap-1 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Resolve
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateStatus(ticket.id, "open")}
                        disabled={updatingId === ticket.id}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-700 text-xs font-semibold rounded-lg inline-flex items-center gap-1 transition-colors disabled:opacity-50"
                      >
                        <RefreshCcw className="w-3.5 h-3.5 text-amber-600" />
                        Reopen
                      </button>
                    )}

                    {ticket.status === "open" && (
                      <button
                        onClick={() => handleUpdateStatus(ticket.id, "escalated")}
                        disabled={updatingId === ticket.id}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg inline-flex items-center gap-1 transition-colors disabled:opacity-50"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        Escalate
                      </button>
                    )}

                    <button
                      onClick={() => setExpandedTicketId(isExpanded ? null : ticket.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                      title={isExpanded ? "Collapse" : "Expand"}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Body Message */}
                <div className="p-4 sm:p-5 bg-slate-50/50">
                  <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                    "{ticket.message}"
                  </p>

                  {/* Linked Order Preview if present */}
                  {ticket.order && (
                    <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200 text-xs flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-slate-500" />
                        <span className="font-bold text-slate-900">
                          Order #{ticket.order.order_number}
                        </span>
                        <span className="text-slate-500">
                          ({formatKoboToNaira(ticket.order.total_kobo)})
                        </span>
                        <span className="capitalize px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {ticket.order.status}
                        </span>
                      </div>

                      {ticket.order.courier_name && (
                        <div className="text-[11px] text-slate-500">
                          Courier: <span className="font-semibold text-slate-700">{ticket.order.courier_name}</span>
                          {ticket.order.tracking_number && ` (${ticket.order.tracking_number})`}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Expanded Section: Admin Internal Notes */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 border-t border-slate-100 bg-white space-y-3">
                    <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      Staff Internal Notes & History
                    </label>
                    <textarea
                      rows={2}
                      defaultValue={ticket.admin_notes || ""}
                      onChange={(e) =>
                        setNotesInput((prev) => ({ ...prev, [ticket.id]: e.target.value }))
                      }
                      placeholder="Add notes about customer follow-up, promised resolutions, etc..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleSaveNotes(ticket.id)}
                        disabled={updatingId === ticket.id}
                        className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                      >
                        {updatingId === ticket.id ? "Saving..." : "Save Note"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
