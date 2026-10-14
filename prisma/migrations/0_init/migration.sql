-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending_payment', 'paid', 'shipped', 'delivered', 'abandoned', 'cancelled', 'refunded', 'returned');

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('open', 'escalated', 'closed');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('requested', 'approved', 'rejected', 'in_transit', 'received', 'refunded', 'cancelled');

-- CreateEnum
CREATE TYPE "ReturnReason" AS ENUM ('damaged_defective', 'wrong_item_delivered', 'quality_not_as_expected', 'size_fit_issue', 'changed_mind', 'other');

-- CreateEnum
CREATE TYPE "RefundMethod" AS ENUM ('original_payment', 'store_credit');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('owner', 'staff');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('whatsapp', 'email');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('sent', 'failed', 'skipped');

-- CreateTable
CREATE TABLE "Sector" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "sector_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price_kobo" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "stock_qty" INTEGER NOT NULL DEFAULT 0,
    "image_urls" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "supports_engraving" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "whatsapp_opt_in" BOOLEAN NOT NULL DEFAULT false,
    "whatsapp_phone_e164" TEXT,
    "loyalty_points" INTEGER NOT NULL DEFAULT 0,
    "wallet_balance_kobo" INTEGER NOT NULL DEFAULT 0,
    "referral_code" TEXT,
    "referred_by_id" TEXT,
    "marketing_emails_opt_in" BOOLEAN NOT NULL DEFAULT true,
    "marketing_whatsapp_opt_in" BOOLEAN NOT NULL DEFAULT false,
    "replenishment_opt_in" BOOLEAN NOT NULL DEFAULT true,
    "unsubscribe_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "order_number" SERIAL NOT NULL,
    "customer_id" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending_payment',
    "subtotal_kobo" INTEGER NOT NULL,
    "total_kobo" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "delivery_address" TEXT NOT NULL,
    "courier_name" TEXT,
    "tracking_number" TEXT,
    "dispatch_notes" TEXT,
    "shipped_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "reminder_sent_at" TIMESTAMP(3),
    "abandoned_at" TIMESTAMP(3),
    "review_reminder_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "gift_card_discount_kobo" INTEGER NOT NULL DEFAULT 0,
    "wallet_discount_kobo" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT,
    "product_name_snapshot" TEXT NOT NULL,
    "unit_price_kobo_snapshot" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "line_total_kobo" INTEGER NOT NULL,
    "custom_engraving" TEXT,
    "engraving_font" TEXT,
    "gift_wrap" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "paystack_reference" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amount_kobo" INTEGER NOT NULL,
    "verified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raw_payload_json" JSONB NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "invoice_number" SERIAL NOT NULL,
    "pdf_url" TEXT,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "receipt_number" SERIAL NOT NULL,
    "pdf_url" TEXT,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesLedgerEntry" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "amount_kobo" INTEGER NOT NULL,
    "sector_breakdown_json" JSONB NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "customer_name" TEXT,
    "customer_email" TEXT,
    "whatsapp_phone_e164" TEXT NOT NULL,
    "subject" TEXT,
    "order_id" TEXT,
    "message" TEXT NOT NULL,
    "admin_notes" TEXT,
    "resolution_notes" TEXT,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'owner',
    "whatsapp_phone_e164" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageNotificationLog" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "template_name" TEXT,
    "status" "NotificationStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageNotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductReview" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_email" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "headline" TEXT,
    "comment" TEXT NOT NULL,
    "photo_url" TEXT,
    "is_verified_buyer" BOOLEAN NOT NULL DEFAULT false,
    "is_approved" BOOLEAN NOT NULL DEFAULT true,
    "helpful_votes" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAdjustmentLog" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "previous_stock" INTEGER NOT NULL,
    "new_stock" INTEGER NOT NULL,
    "adjustment" INTEGER NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockAdjustmentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockWaitlist" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockWaitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerAddress" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Home',
    "recipient_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "street_address" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT NOT NULL,
    "lga" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerAuthCode" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerAuthCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerSession" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnRequest" (
    "id" TEXT NOT NULL,
    "rma_number" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "status" "ReturnStatus" NOT NULL DEFAULT 'requested',
    "reason" "ReturnReason" NOT NULL,
    "customer_note" TEXT,
    "evidence_images" TEXT[],
    "refund_method" "RefundMethod" NOT NULL DEFAULT 'original_payment',
    "pickup_address" TEXT,
    "return_courier" TEXT,
    "return_tracking_num" TEXT,
    "admin_notes" TEXT,
    "rejection_reason" TEXT,
    "refund_amount_kobo" INTEGER NOT NULL DEFAULT 0,
    "refund_reference" TEXT,
    "restocked" BOOLEAN NOT NULL DEFAULT false,
    "approved_at" TIMESTAMP(3),
    "in_transit_at" TIMESTAMP(3),
    "received_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnItem" (
    "id" TEXT NOT NULL,
    "return_request_id" TEXT NOT NULL,
    "order_item_id" TEXT NOT NULL,
    "product_id" TEXT,
    "product_name_snapshot" TEXT NOT NULL,
    "unit_price_kobo" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "item_refund_kobo" INTEGER NOT NULL,

    CONSTRAINT "ReturnItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductBundle" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "bundle_item_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductBundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyPointsLedger" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "order_id" TEXT,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyPointsLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralReward" (
    "id" TEXT NOT NULL,
    "referrer_id" TEXT NOT NULL,
    "referee_id" TEXT,
    "order_id" TEXT,
    "reward_points" INTEGER NOT NULL DEFAULT 500,
    "status" TEXT NOT NULL DEFAULT 'awarded',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminNotification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "reference_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashSale" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "discount_percentage" INTEGER NOT NULL,
    "banner_text" TEXT,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashSaleProduct" (
    "id" TEXT NOT NULL,
    "flash_sale_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlashSaleProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCard" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "initial_value_kobo" INTEGER NOT NULL,
    "balance_kobo" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "recipient_name" TEXT,
    "recipient_email" TEXT,
    "sender_name" TEXT,
    "message" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCardRedemption" (
    "id" TEXT NOT NULL,
    "gift_card_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "amount_kobo" INTEGER NOT NULL,
    "redeemed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftCardRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductQuestion" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_email" TEXT,
    "question" TEXT NOT NULL,
    "is_approved" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAnswer" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "answered_by" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "is_official" BOOLEAN NOT NULL DEFAULT true,
    "helpful_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductWatchlist" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "notify_price_drop" BOOLEAN NOT NULL DEFAULT true,
    "notify_restock" BOOLEAN NOT NULL DEFAULT true,
    "initial_price_kobo" INTEGER NOT NULL,
    "target_price_kobo" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductWatchlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "order_id" TEXT,
    "type" TEXT NOT NULL,
    "amount_kobo" INTEGER NOT NULL,
    "balance_after_kobo" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingCampaignSetting" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "delay_days" INTEGER NOT NULL DEFAULT 30,
    "discount_percentage" INTEGER NOT NULL DEFAULT 10,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'email',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingCampaignSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingCampaignLog" (
    "id" TEXT NOT NULL,
    "campaign_type" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'email',
    "recipient_email" TEXT NOT NULL,
    "recipient_phone" TEXT,
    "discount_code" TEXT,
    "subject" TEXT NOT NULL,
    "content_snippet" TEXT,
    "status" "NotificationStatus" NOT NULL DEFAULT 'sent',
    "opened_at" TIMESTAMP(3),
    "converted_at" TIMESTAMP(3),
    "order_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingCampaignLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryFeedback" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "survey_token" TEXT NOT NULL,
    "survey_sent_at" TIMESTAMP(3),
    "nps_score" INTEGER,
    "delivery_speed_rating" INTEGER,
    "packaging_rating" INTEGER,
    "product_quality_rating" INTEGER,
    "feedback_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "comments" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVolumeTier" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "min_quantity" INTEGER NOT NULL,
    "max_quantity" INTEGER,
    "discount_percentage" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductVolumeTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurrencySetting" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "exchange_rate_to_ngn" DOUBLE PRECISION NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurrencySetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sector_slug_key" ON "Sector"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_sector_id_idx" ON "Product"("sector_id");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_referral_code_key" ON "Customer"("referral_code");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_unsubscribe_token_key" ON "Customer"("unsubscribe_token");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_referral_code_idx" ON "Customer"("referral_code");

-- CreateIndex
CREATE INDEX "Customer_unsubscribe_token_idx" ON "Customer"("unsubscribe_token");

-- CreateIndex
CREATE INDEX "Customer_whatsapp_phone_e164_idx" ON "Customer"("whatsapp_phone_e164");

-- CreateIndex
CREATE UNIQUE INDEX "Order_order_number_key" ON "Order"("order_number");

-- CreateIndex
CREATE INDEX "Order_customer_id_idx" ON "Order"("customer_id");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_order_number_idx" ON "Order"("order_number");

-- CreateIndex
CREATE INDEX "Order_tracking_number_idx" ON "Order"("tracking_number");

-- CreateIndex
CREATE INDEX "Order_created_at_idx" ON "Order"("created_at");

-- CreateIndex
CREATE INDEX "OrderItem_order_id_idx" ON "OrderItem"("order_id");

-- CreateIndex
CREATE INDEX "OrderItem_product_id_idx" ON "OrderItem"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_order_id_key" ON "Payment"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_paystack_reference_key" ON "Payment"("paystack_reference");

-- CreateIndex
CREATE INDEX "Payment_paystack_reference_idx" ON "Payment"("paystack_reference");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_order_id_key" ON "Invoice"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoice_number_key" ON "Invoice"("invoice_number");

-- CreateIndex
CREATE INDEX "Invoice_invoice_number_idx" ON "Invoice"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_order_id_key" ON "Receipt"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_receipt_number_key" ON "Receipt"("receipt_number");

-- CreateIndex
CREATE INDEX "Receipt_receipt_number_idx" ON "Receipt"("receipt_number");

-- CreateIndex
CREATE UNIQUE INDEX "SalesLedgerEntry_order_id_key" ON "SalesLedgerEntry"("order_id");

-- CreateIndex
CREATE INDEX "SalesLedgerEntry_recorded_at_idx" ON "SalesLedgerEntry"("recorded_at");

-- CreateIndex
CREATE INDEX "SupportTicket_whatsapp_phone_e164_idx" ON "SupportTicket"("whatsapp_phone_e164");

-- CreateIndex
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "AdminUser_whatsapp_phone_e164_idx" ON "AdminUser"("whatsapp_phone_e164");

-- CreateIndex
CREATE INDEX "MessageNotificationLog_order_id_idx" ON "MessageNotificationLog"("order_id");

-- CreateIndex
CREATE INDEX "MessageNotificationLog_channel_idx" ON "MessageNotificationLog"("channel");

-- CreateIndex
CREATE INDEX "MessageNotificationLog_status_idx" ON "MessageNotificationLog"("status");

-- CreateIndex
CREATE INDEX "ProductReview_product_id_idx" ON "ProductReview"("product_id");

-- CreateIndex
CREATE INDEX "ProductReview_rating_idx" ON "ProductReview"("rating");

-- CreateIndex
CREATE INDEX "ProductReview_is_approved_idx" ON "ProductReview"("is_approved");

-- CreateIndex
CREATE INDEX "ProductReview_created_at_idx" ON "ProductReview"("created_at");

-- CreateIndex
CREATE INDEX "StockAdjustmentLog_product_id_idx" ON "StockAdjustmentLog"("product_id");

-- CreateIndex
CREATE INDEX "StockAdjustmentLog_created_at_idx" ON "StockAdjustmentLog"("created_at");

-- CreateIndex
CREATE INDEX "StockWaitlist_product_id_idx" ON "StockWaitlist"("product_id");

-- CreateIndex
CREATE INDEX "StockWaitlist_email_idx" ON "StockWaitlist"("email");

-- CreateIndex
CREATE INDEX "CustomerAddress_customer_id_idx" ON "CustomerAddress"("customer_id");

-- CreateIndex
CREATE INDEX "CustomerAddress_is_default_idx" ON "CustomerAddress"("is_default");

-- CreateIndex
CREATE INDEX "CustomerAuthCode_email_idx" ON "CustomerAuthCode"("email");

-- CreateIndex
CREATE INDEX "CustomerAuthCode_code_idx" ON "CustomerAuthCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerSession_token_key" ON "CustomerSession"("token");

-- CreateIndex
CREATE INDEX "CustomerSession_customer_id_idx" ON "CustomerSession"("customer_id");

-- CreateIndex
CREATE INDEX "CustomerSession_token_idx" ON "CustomerSession"("token");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnRequest_rma_number_key" ON "ReturnRequest"("rma_number");

-- CreateIndex
CREATE INDEX "ReturnRequest_order_id_idx" ON "ReturnRequest"("order_id");

-- CreateIndex
CREATE INDEX "ReturnRequest_customer_id_idx" ON "ReturnRequest"("customer_id");

-- CreateIndex
CREATE INDEX "ReturnRequest_status_idx" ON "ReturnRequest"("status");

-- CreateIndex
CREATE INDEX "ReturnRequest_rma_number_idx" ON "ReturnRequest"("rma_number");

-- CreateIndex
CREATE INDEX "ReturnItem_return_request_id_idx" ON "ReturnItem"("return_request_id");

-- CreateIndex
CREATE INDEX "ReturnItem_order_item_id_idx" ON "ReturnItem"("order_item_id");

-- CreateIndex
CREATE INDEX "ReturnItem_product_id_idx" ON "ReturnItem"("product_id");

-- CreateIndex
CREATE INDEX "ProductBundle_product_id_idx" ON "ProductBundle"("product_id");

-- CreateIndex
CREATE INDEX "ProductBundle_bundle_item_id_idx" ON "ProductBundle"("bundle_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "ProductBundle_product_id_bundle_item_id_key" ON "ProductBundle"("product_id", "bundle_item_id");

-- CreateIndex
CREATE INDEX "LoyaltyPointsLedger_customer_id_idx" ON "LoyaltyPointsLedger"("customer_id");

-- CreateIndex
CREATE INDEX "LoyaltyPointsLedger_order_id_idx" ON "LoyaltyPointsLedger"("order_id");

-- CreateIndex
CREATE INDEX "LoyaltyPointsLedger_created_at_idx" ON "LoyaltyPointsLedger"("created_at");

-- CreateIndex
CREATE INDEX "ReferralReward_referrer_id_idx" ON "ReferralReward"("referrer_id");

-- CreateIndex
CREATE INDEX "ReferralReward_referee_id_idx" ON "ReferralReward"("referee_id");

-- CreateIndex
CREATE INDEX "ReferralReward_order_id_idx" ON "ReferralReward"("order_id");

-- CreateIndex
CREATE INDEX "AdminNotification_is_read_idx" ON "AdminNotification"("is_read");

-- CreateIndex
CREATE INDEX "AdminNotification_created_at_idx" ON "AdminNotification"("created_at");

-- CreateIndex
CREATE INDEX "AdminNotification_type_idx" ON "AdminNotification"("type");

-- CreateIndex
CREATE INDEX "FlashSale_is_active_idx" ON "FlashSale"("is_active");

-- CreateIndex
CREATE INDEX "FlashSale_start_time_end_time_idx" ON "FlashSale"("start_time", "end_time");

-- CreateIndex
CREATE INDEX "FlashSaleProduct_flash_sale_id_idx" ON "FlashSaleProduct"("flash_sale_id");

-- CreateIndex
CREATE INDEX "FlashSaleProduct_product_id_idx" ON "FlashSaleProduct"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "FlashSaleProduct_flash_sale_id_product_id_key" ON "FlashSaleProduct"("flash_sale_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCard_code_key" ON "GiftCard"("code");

-- CreateIndex
CREATE INDEX "GiftCard_code_idx" ON "GiftCard"("code");

-- CreateIndex
CREATE INDEX "GiftCard_is_active_idx" ON "GiftCard"("is_active");

-- CreateIndex
CREATE INDEX "GiftCardRedemption_gift_card_id_idx" ON "GiftCardRedemption"("gift_card_id");

-- CreateIndex
CREATE INDEX "GiftCardRedemption_order_id_idx" ON "GiftCardRedemption"("order_id");

-- CreateIndex
CREATE INDEX "ProductQuestion_product_id_idx" ON "ProductQuestion"("product_id");

-- CreateIndex
CREATE INDEX "ProductQuestion_is_approved_idx" ON "ProductQuestion"("is_approved");

-- CreateIndex
CREATE INDEX "ProductAnswer_question_id_idx" ON "ProductAnswer"("question_id");

-- CreateIndex
CREATE INDEX "ProductWatchlist_product_id_idx" ON "ProductWatchlist"("product_id");

-- CreateIndex
CREATE INDEX "ProductWatchlist_customer_id_idx" ON "ProductWatchlist"("customer_id");

-- CreateIndex
CREATE INDEX "ProductWatchlist_email_idx" ON "ProductWatchlist"("email");

-- CreateIndex
CREATE INDEX "ProductWatchlist_is_active_idx" ON "ProductWatchlist"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "ProductWatchlist_product_id_email_key" ON "ProductWatchlist"("product_id", "email");

-- CreateIndex
CREATE INDEX "WalletTransaction_customer_id_idx" ON "WalletTransaction"("customer_id");

-- CreateIndex
CREATE INDEX "WalletTransaction_order_id_idx" ON "WalletTransaction"("order_id");

-- CreateIndex
CREATE INDEX "WalletTransaction_type_idx" ON "WalletTransaction"("type");

-- CreateIndex
CREATE INDEX "WalletTransaction_created_at_idx" ON "WalletTransaction"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingCampaignSetting_type_key" ON "MarketingCampaignSetting"("type");

-- CreateIndex
CREATE INDEX "MarketingCampaignLog_customer_id_idx" ON "MarketingCampaignLog"("customer_id");

-- CreateIndex
CREATE INDEX "MarketingCampaignLog_campaign_type_idx" ON "MarketingCampaignLog"("campaign_type");

-- CreateIndex
CREATE INDEX "MarketingCampaignLog_created_at_idx" ON "MarketingCampaignLog"("created_at");

-- CreateIndex
CREATE INDEX "MarketingCampaignLog_discount_code_idx" ON "MarketingCampaignLog"("discount_code");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryFeedback_order_id_key" ON "DeliveryFeedback"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryFeedback_survey_token_key" ON "DeliveryFeedback"("survey_token");

-- CreateIndex
CREATE INDEX "DeliveryFeedback_nps_score_idx" ON "DeliveryFeedback"("nps_score");

-- CreateIndex
CREATE INDEX "DeliveryFeedback_status_idx" ON "DeliveryFeedback"("status");

-- CreateIndex
CREATE INDEX "DeliveryFeedback_survey_token_idx" ON "DeliveryFeedback"("survey_token");

-- CreateIndex
CREATE INDEX "DeliveryFeedback_created_at_idx" ON "DeliveryFeedback"("created_at");

-- CreateIndex
CREATE INDEX "ProductVolumeTier_product_id_idx" ON "ProductVolumeTier"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVolumeTier_product_id_min_quantity_key" ON "ProductVolumeTier"("product_id", "min_quantity");

-- CreateIndex
CREATE UNIQUE INDEX "CurrencySetting_code_key" ON "CurrencySetting"("code");

-- CreateIndex
CREATE INDEX "CurrencySetting_code_idx" ON "CurrencySetting"("code");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_referred_by_id_fkey" FOREIGN KEY ("referred_by_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesLedgerEntry" ADD CONSTRAINT "SalesLedgerEntry_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageNotificationLog" ADD CONSTRAINT "MessageNotificationLog_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustmentLog" ADD CONSTRAINT "StockAdjustmentLog_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockWaitlist" ADD CONSTRAINT "StockWaitlist_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAddress" ADD CONSTRAINT "CustomerAddress_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerSession" ADD CONSTRAINT "CustomerSession_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_return_request_id_fkey" FOREIGN KEY ("return_request_id") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBundle" ADD CONSTRAINT "ProductBundle_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBundle" ADD CONSTRAINT "ProductBundle_bundle_item_id_fkey" FOREIGN KEY ("bundle_item_id") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyPointsLedger" ADD CONSTRAINT "LoyaltyPointsLedger_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralReward" ADD CONSTRAINT "ReferralReward_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashSaleProduct" ADD CONSTRAINT "FlashSaleProduct_flash_sale_id_fkey" FOREIGN KEY ("flash_sale_id") REFERENCES "FlashSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashSaleProduct" ADD CONSTRAINT "FlashSaleProduct_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardRedemption" ADD CONSTRAINT "GiftCardRedemption_gift_card_id_fkey" FOREIGN KEY ("gift_card_id") REFERENCES "GiftCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardRedemption" ADD CONSTRAINT "GiftCardRedemption_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductQuestion" ADD CONSTRAINT "ProductQuestion_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAnswer" ADD CONSTRAINT "ProductAnswer_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "ProductQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductWatchlist" ADD CONSTRAINT "ProductWatchlist_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductWatchlist" ADD CONSTRAINT "ProductWatchlist_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingCampaignLog" ADD CONSTRAINT "MarketingCampaignLog_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryFeedback" ADD CONSTRAINT "DeliveryFeedback_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryFeedback" ADD CONSTRAINT "DeliveryFeedback_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVolumeTier" ADD CONSTRAINT "ProductVolumeTier_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

