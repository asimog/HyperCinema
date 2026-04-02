export type WhopCheckoutEmbedAdapter = {
  id: string;
  label: string;
  kind: "whop";
  checkoutEmbedUrl: string;
  planId: string;
  returnUrl: string;
  environment: "production" | "sandbox";
  hidePrice?: boolean;
  hideTermsAndConditions?: boolean;
  skipRedirect?: boolean;
};

export function createWhopCheckoutEmbedAdapter(input: {
  planId: string;
  returnUrl: string;
  environment?: "production" | "sandbox";
  hidePrice?: boolean;
  hideTermsAndConditions?: boolean;
  skipRedirect?: boolean;
}): WhopCheckoutEmbedAdapter {
  return {
    id: "whop-checkout-embed",
    label: "Whop Checkout",
    kind: "whop",
    checkoutEmbedUrl: "https://docs.whop.com/payments/checkout-embed",
    planId: input.planId,
    returnUrl: input.returnUrl,
    environment: input.environment ?? "production",
    hidePrice: input.hidePrice,
    hideTermsAndConditions: input.hideTermsAndConditions,
    skipRedirect: input.skipRedirect,
  };
}
