import { LegalPageLayout } from '@/components/public/legal-page-layout';

export const metadata = {
  title: 'Terms & Conditions — BookEasy AI',
  description: 'The terms and conditions governing your use of BookEasy AI, our appointment booking and business management platform.',
};

export default function TermsPage() {
  return (
    <LegalPageLayout title="Terms & Conditions" lastUpdated="September 20, 2026">
      <p>
        Welcome to BookEasy AI. These Terms & Conditions (&ldquo;Terms&rdquo;) govern your use of the BookEasy AI platform (the &ldquo;Service&rdquo;). By creating an account or using the Service, you agree to these Terms.
      </p>

      <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
      <p>
        By accessing or using BookEasy AI, you agree to be bound by these Terms and our Privacy Policy. If you do not agree, you may not use the Service.
      </p>

      <h2 className="text-xl font-semibold text-foreground">2. Description of BookEasy AI</h2>
      <p>
        BookEasy AI is a cloud-based appointment booking and business management platform designed for salons, barbers, beauty lounges, and similar service businesses. It provides online booking, staff scheduling, customer management, analytics, and an AI-powered appointment assistant.
      </p>

      <h2 className="text-xl font-semibold text-foreground">3. User Accounts</h2>
      <p>
        You must provide accurate and complete information when creating an account. You are responsible for safeguarding your password and for all activity under your account. You must be at least 18 years old to create an account.
      </p>

      <h2 className="text-xl font-semibold text-foreground">4. Business and Customer Responsibilities</h2>
      <p><strong>Business owners</strong> are responsible for the accuracy of their business information, services, pricing, and availability. Owners are responsible for honoring booked appointments and for communicating with their customers.</p>
      <p><strong>Customers</strong> are responsible for providing accurate contact information and arriving for their appointments. Customers are responsible for canceling appointments they cannot attend.</p>

      <h2 className="text-xl font-semibold text-foreground">5. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service for any illegal or unauthorized purpose.</li>
        <li>Enter false, misleading, or fraudulent business or booking information.</li>
        <li>Attempt to access another user&rsquo;s data without authorization.</li>
        <li>Disrupt, overload, or reverse-engineer the Service or its infrastructure.</li>
        <li>Use the AI assistant to generate abusive, harmful, or misleading content.</li>
        <li>Resell or sublicense access to the Service without our written permission.</li>
      </ul>

      <h2 className="text-xl font-semibold text-foreground">6. Subscription Plans</h2>
      <p>BookEasy AI offers the following plans:</p>
      <ul>
        <li><strong>Free</strong> — PKR 0 / USD 0 per month. For solo professionals getting started.</li>
        <li><strong>Starter</strong> — PKR 2,499 / USD 10 per month. For small businesses growing their bookings.</li>
        <li><strong>Pro</strong> — PKR 4,999 / USD 20 per month. For busy salons with multiple staff and locations.</li>
      </ul>
      <p>
        Plan features, limits, and pricing may change. Any changes will be communicated in advance. Your selected billing currency (PKR or USD) applies to all subscription charges.
      </p>

      <h2 className="text-xl font-semibold text-foreground">7. Billing</h2>
      <p>
        Paid plans are billed monthly in advance. Payments are processed by approved third-party payment providers. BookEasy AI does not store your card details. Your subscription remains active until canceled or until payment fails.
      </p>

      <h2 className="text-xl font-semibold text-foreground">8. Renewal</h2>
      <p>
        Your subscription automatically renews at the end of each billing period unless you cancel before the renewal date. You will be charged the same price and currency as your current billing period unless a price change has been communicated in advance.
      </p>

      <h2 className="text-xl font-semibold text-foreground">9. Failed Payments</h2>
      <p>
        If a payment fails, we will attempt to retry the charge. If the payment remains unsuccessful, your subscription may be downgraded to the Free plan or suspended. You will be notified by email before any downgrade.
      </p>

      <h2 className="text-xl font-semibold text-foreground">10. Upgrades and Downgrades</h2>
      <p>
        You can upgrade or downgrade your plan at any time. Upgrades take effect immediately and you will be charged a prorated amount for the remaining billing period. Downgrades take effect at the start of the next billing period.
      </p>

      <h2 className="text-xl font-semibold text-foreground">11. Cancellation</h2>
      <p>
        You can cancel your subscription at any time. Cancellation prevents future renewal charges. Access to paid features continues until the end of the already-paid billing period. See our <a href="/refund-policy" className="text-primary hover:underline">Refund &amp; Cancellation Policy</a> for details.
      </p>

      <h2 className="text-xl font-semibold text-foreground">12. Intellectual Property</h2>
      <p>
        BookEasy AI, including its software, design, branding, and content, is owned by us and protected by intellectual property laws. You retain ownership of the business and customer data you enter into the Service. We grant you a limited, non-exclusive, non-transferable license to use the Service for your business operations.
      </p>

      <h2 className="text-xl font-semibold text-foreground">13. Service Availability</h2>
      <p>
        We strive to maintain high availability but do not guarantee uninterrupted service. We are not liable for downtime caused by maintenance, updates, infrastructure failures, or events beyond our control.
      </p>

      <h2 className="text-xl font-semibold text-foreground">14. Third-Party Services</h2>
      <p>
        The Service integrates with third-party providers for authentication, payments, and infrastructure. We are not responsible for the practices or availability of these third-party services.
      </p>

      <h2 className="text-xl font-semibold text-foreground">15. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, BookEasy AI shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, including loss of revenue, data, or business opportunities. Our total liability shall not exceed the amount you paid us in the three months preceding the claim.
      </p>

      <h2 className="text-xl font-semibold text-foreground">16. Account Suspension and Termination</h2>
      <p>
        We may suspend or terminate your account if you violate these Terms, engage in fraudulent activity, or abuse the Service. You may terminate your account at any time by contacting us.
      </p>

      <h2 className="text-xl font-semibold text-foreground">17. Changes to the Service and Terms</h2>
      <p>
        We may update or modify the Service and these Terms from time to time. Material changes to the Terms will be communicated in advance. Continued use of the Service after changes take effect constitutes acceptance of the updated Terms.
      </p>

      <h2 className="text-xl font-semibold text-foreground">18. Governing Law</h2>
      <p>
        These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles. Any disputes arising from these Terms or your use of the Service shall be resolved through good-faith negotiation, and if unresolved, through appropriate legal proceedings.
      </p>

      <h2 className="text-xl font-semibold text-foreground">19. Contact Us</h2>
      <p>
        If you have any questions about these Terms, please contact us at support@bookeasy.ai or through our <a href="/contact" className="text-primary hover:underline">Contact page</a>.
      </p>
    </LegalPageLayout>
  );
}
