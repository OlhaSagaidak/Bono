"use client";

import { useRouter } from "next/navigation";
import { PayPalCheckout } from "@/components/paypal-checkout";
import { captureCampaignFundingAction, createCampaignFundingOrderAction } from "@/lib/matching/actions";

export function FundCheckout({ campaignId, clientId }: { campaignId: string; clientId: string }) {
  const router = useRouter();
  return (
    <PayPalCheckout
      clientId={clientId}
      createOrder={() => createCampaignFundingOrderAction(campaignId)}
      onApprove={async (orderId) => {
        const result = await captureCampaignFundingAction(orderId);
        if ("declined" in result) return "Your payment method was declined. Try another one.";
        if ("error" in result) return result.error;
        router.refresh();
        return null;
      }}
    />
  );
}
