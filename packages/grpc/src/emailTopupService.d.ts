/**
 * Email Topup Service Implementation
 */
export declare const emailTopupService: {
    /**
     * Get available email topups for a country
     */
    GetEmailTopups: (call: any, callback: any) => void;
    /**
     * Buy an email topup
     */
    BuyEmailTopup: (call: any, callback: any) => void;
    /**
     * Get current email quota for an entity
     */
    GetEmailQuota: (call: any, callback: any) => Promise<void>;
    /**
     * Deduct email quota after sending
     */
    DeductEmailQuota: (call: any, callback: any) => Promise<void>;
    /**
     * Get email overview for dashboard
     */
    GetEmailOverview: (call: any, callback: any) => Promise<void>;
    /**
     * Get billing history for top-ups and subscriptions
     */
    GetBillingHistory: (call: any, callback: any) => Promise<void>;
};
//# sourceMappingURL=emailTopupService.d.ts.map