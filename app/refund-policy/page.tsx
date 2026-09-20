import { LegalPageLayout } from '@/components/public/legal-page-layout';

export const metadata = {
  title: 'Refund & Cancellation Policy — BookEasy AI',
  description: 'BookEasy AI subscription cancellation and refund policy for paid plans.',
};

export default function RefundPolicyPage() {
  return (
    <LegalPageLayout title="Refund & Cancellation Policy" lastUpdated="September 20, 2026">
      <p>
        This policy explains how cancellations and refunds work for BookEasy AI subscription plans.
      </p>

      <h2 className="text-xl font-semibold text-foreground">1. Canceling Your Subscription</h2>
      <p>
        You can cancel your subscription at any time. Cancellation stops future renewal charges from being applied. You will not be charged again after cancellation.
      </p>

      <h2 className="text-xl font-semibold text-foreground">2. Access After Cancellation</h2>
      <p>
        After canceling, you will continue to have access to all paid features until the end of your current billing period. Once the billing period ends, your account will automatically move to the Free plan.
      </p>

      <h2 className="text-xl font-semibold text-foreground">3. Refunds</h2>
      <p>
        Subscription payments are <strong>generally non-refundable</strong> once a billing period has started. This is because you retain access to paid features for the full billing period even after cancellation.
      </p>

      <h2 className="text-xl font-semibold text-foreground">4. Exceptions</h2>
      <ul>
        <li><strong>Duplicate charges:</strong> If you are charged more than once for the same billing period due to a system error, we will review and refund the duplicate charge.</li>
        <li><strong>Verified billing errors:</strong> If you are charged incorrectly (for example, charged after a successful cancellation before the billing period ended), we will review and issue a refund.</li>
        <li><strong>Legally required refunds:</strong> Any refunds required by applicable consumer protection laws remain unaffected by this policy.</li>
      </ul>

      <h2 className="text-xl font-semibold text-foreground">5. How to Request a Refund</h2>
      <p>
        To request a refund for a duplicate charge or billing error, contact us at <a href="mailto:support@bookeasy.ai" className="text-primary hover:underline">support@bookeasy.ai</a> with your account email, the charge date, and a brief description of the issue. We will review your request and respond within 3-5 business days.
      </p>

      <h2 className="text-xl font-semibold text-foreground">6. Downgrading to Free</h2>
      <p>
        If you downgrade from a paid plan to the Free plan, the change takes effect at the end of your current billing period. Features that exceed the Free plan limits (such as additional staff or services) may become unavailable until you upgrade again.
      </p>

      <h2 className="text-xl font-semibold text-foreground">7. Contact Us</h2>
      <p>
        For any billing disputes or questions about this policy, please contact us at <a href="mailto:support@bookeasy.ai" className="text-primary hover:underline">support@bookeasy.ai</a> or through our <a href="/contact" className="text-primary hover:underline">Contact page</a>.
      </p>
    </LegalPageLayout>
  );
}
