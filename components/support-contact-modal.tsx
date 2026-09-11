"use client";

import React, { useState } from "react";
import { MessageCircle, HelpCircle, X, Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export function SupportContactModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("Order Status Inquiry");
  const [orderNumber, setOrderNumber] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          subject,
          orderNumber: orderNumber ? orderNumber.trim() : undefined,
          message,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit inquiry.");
      }

      setSuccessMsg("Your inquiry has been submitted! Our support team will follow up with you on WhatsApp/email shortly.");
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
      setOrderNumber("");
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Support Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-slate-900 text-white hover:bg-slate-800 shadow-xl rounded-full px-4 py-3 flex items-center gap-2 text-xs font-semibold tracking-wide transition-transform hover:scale-105"
        aria-label="Contact Customer Support"
      >
        <HelpCircle className="w-4 h-4 text-pink-400" />
        <span>Need Help?</span>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Customer Support Desk</h3>
                  <p className="text-[11px] text-slate-300">We respond fast via WhatsApp or email</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[80vh] overflow-y-auto space-y-5">
              {/* Quick WhatsApp Link CTA */}
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-950">Chat Live on WhatsApp</span>
                    <p className="text-[11px] text-emerald-700">Instant answers from our customer care team</p>
                  </div>
                </div>
                <a
                  href="https://wa.me/2348000000000?text=Hello%20Aura%20Store%2C%20I%20have%20an%20inquiry%20regarding%20my%20order."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1 shrink-0"
                >
                  Open Chat
                </a>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-px bg-slate-200 flex-1" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Or Open a Ticket</span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>

              {successMsg && (
                <div className="p-3.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Inquiry Sent!</span>
                    <p className="mt-0.5">{successMsg}</p>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="p-3.5 bg-red-50 text-red-900 border border-red-200 rounded-xl text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <p>{errorMsg}</p>
                </div>
              )}

              {/* Support Ticket Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Your Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Chioma Adebayo"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="chioma@example.com"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      WhatsApp Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="08012345678"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Order # (Optional)
                    </label>
                    <input
                      type="text"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      placeholder="e.g. 1042"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Subject / Topic <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                  >
                    <option value="Order Status Inquiry">Where is my order? (Status inquiry)</option>
                    <option value="Delivery Delay">Delivery delay / Courier follow-up</option>
                    <option value="Product Sizing & Details">Product details / sizing question</option>
                    <option value="Custom Engraving Request">Custom engraving / gift question</option>
                    <option value="Returns & Exchanges">Return, refund or exchange request</option>
                    <option value="Payment or Checkout Issue">Payment verification or checkout error</option>
                    <option value="Other">Other general inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Your Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe how we can help you..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Send Inquiry
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
