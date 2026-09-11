export interface CourierInfo {
  name: string;
  trackingNumber: string;
}

export function getCourierTrackingUrl(courierName: string | null | undefined, trackingNumber: string | null | undefined): string {
  if (!trackingNumber) return "";
  const cleanCourier = (courierName || "").toLowerCase().trim();
  const cleanTracking = trackingNumber.trim();

  if (cleanCourier.includes("speedaf")) {
    return `https://www.speedaf.com/tracking?nums=${encodeURIComponent(cleanTracking)}`;
  }
  if (cleanCourier.includes("gig")) {
    return `https://giglogistics.com/track/?order=${encodeURIComponent(cleanTracking)}`;
  }
  if (cleanCourier.includes("dhl")) {
    return `https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(cleanTracking)}`;
  }
  if (cleanCourier.includes("fez")) {
    return `https://fezdelivery.co/tracking?id=${encodeURIComponent(cleanTracking)}`;
  }
  if (cleanCourier.includes("gokada")) {
    return `https://gokada.ng/track?ref=${encodeURIComponent(cleanTracking)}`;
  }

  return `https://ecommerce.ng/track-order?tracking=${encodeURIComponent(cleanTracking)}`;
}

export function generateDispatchMessage(orderNumber: number, courierName: string, trackingNumber: string, trackingUrl: string): string {
  return `📦 Your order #${orderNumber} has been dispatched via ${courierName}! Tracking Number: ${trackingNumber}. Track live here: ${trackingUrl}`;
}
