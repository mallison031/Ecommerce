export interface WhatsAppTemplateConfig {
  name: string;
  category: "UTILITY" | "MARKETING";
  approved: boolean;
}

export const TEMPLATES = {
  order_confirmed: {
    name: "order_confirmed",
    category: "UTILITY",
    approved: true,
  },
  order_shipped: {
    name: "order_shipped",
    category: "UTILITY",
    approved: true,
  },
  order_delivered: {
    name: "order_delivered",
    category: "UTILITY",
    approved: true,
  },
  order_returned: {
    name: "order_returned",
    category: "UTILITY",
    approved: true,
  },
  admin_new_order: {
    name: "admin_new_order",
    category: "UTILITY",
    approved: true,
  },
  admin_return_alert: {
    name: "admin_return_alert",
    category: "UTILITY",
    approved: true,
  },
  abandoned_cart_reminder: {
    name: "abandoned_cart_reminder",
    category: "MARKETING",
    approved: true,
  },
} as const satisfies Record<string, WhatsAppTemplateConfig>;

export type TemplateKey = keyof typeof TEMPLATES;
