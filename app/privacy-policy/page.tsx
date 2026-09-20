import { LegalPageLayout } from '@/components/public/legal-page-layout';

export const metadata = {
  title: 'Privacy Policy — BookEasy AI',
  description: 'How BookEasy AI collects, uses, and protects your information when you use our appointment booking and business management platform.',
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated="September 20, 2026">
      <p>
        BookEasy AI (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates a cloud-based appointment booking and business management platform for salons, barbers, and beauty businesses. This Privacy Policy explains what information we collect, how we use it, and the choices you have.
      </p>

      <h2 className="text-xl font-semibold text-foreground">1. Information We Collect</h2>
      <p><strong>Account information:</strong> When you sign up, we collect your name, email address, and phone number to create and manage your account.</p>
      <p><strong>Business information:</strong> Business owners may enter business name, description, address, category, services, staff details, and working hours to set up their booking page.</p>
      <p><strong>Booking and customer information:</strong> When customers book appointments through BookEasy AI, we process their name, contact details, selected service, staff member, and appointment time. This information is visible to the business they are booking with.</p>
      <p><strong>Authentication information:</strong> We use Supabase Authentication to manage sign-in sessions. Your password is hashed and never stored in plain text.</p>
      <p><strong>Payment information:</strong> When paid plans are available, subscription payments will be processed by approved third-party payment providers (such as Stripe or Razorpay). BookEasy AI does <strong>not</strong> collect, store, or transmit your card number, CVV, or other sensitive card details. We only receive a confirmation from the payment provider and store the transaction identifier and subscription status.</p>
      <p><strong>Usage data:</strong> We may collect anonymous usage analytics such as pages visited and features used to improve the platform.</p>

      <h2 className="text-xl font-semibold text-foreground">2. Cookies and Local Storage</h2>
      <p>
        BookEasy AI uses browser local storage to remember your preferences, such as your selected billing currency (PKR or USD) and theme (light or dark). We do not use tracking cookies for advertising. Authentication tokens are stored securely by the Supabase client library.
      </p>

      <h2 className="text-xl font-semibold text-foreground">3. How We Use Your Information</h2>
      <ul>
        <li>To create and manage your account and business profile.</li>
        <li>To enable appointment booking, scheduling, and customer management.</li>
        <li>To send booking confirmations and reminders to customers.</li>
        <li>To process subscription payments and manage billing.</li>
        <li>To provide customer support and respond to your inquiries.</li>
        <li>To improve our features, performance, and user experience.</li>
        <li>To detect, prevent, and address technical issues or abuse.</li>
      </ul>

      <h2 className="text-xl font-semibold text-foreground">4. Service Providers</h2>
      <p>
        We use trusted third-party services to operate the platform:
      </p>
      <ul>
        <li><strong>Supabase</strong> — database, authentication, and hosting infrastructure.</li>
        <li><strong>Payment providers</strong> (when available) — to process subscription payments securely.</li>
      </ul>
      <p>
        These providers process data on our behalf under appropriate data processing agreements and are bound by confidentiality obligations.
      </p>

      <h2 className="text-xl font-semibold text-foreground">5. Data Security</h2>
      <p>
        We protect your data using industry-standard practices including row-level security policies on our database, encrypted authentication tokens, and access controls that ensure business owners can only access their own data, staff see only what is assigned to them, and customers see only their own appointments.
      </p>

      <h2 className="text-xl font-semibold text-foreground">6. Data Retention</h2>
      <p>
        We retain your account and business data for as long as your account is active. If you delete your account, we will remove your personal data within a reasonable period, except where retention is required by law or for legitimate business purposes such as fraud prevention.
      </p>

      <h2 className="text-xl font-semibold text-foreground">7. Your Rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li>Access the personal data we hold about you.</li>
        <li>Request correction of inaccurate or incomplete data.</li>
        <li>Request deletion of your account and associated data.</li>
        <li>Withdraw consent for any optional data processing.</li>
        <li>Export your business data.</li>
      </ul>
      <p>
        To exercise these rights, contact us at support@bookeasy.ai.
      </p>

      <h2 className="text-xl font-semibold text-foreground">8. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. When we do, we will revise the &ldquo;Last updated&rdquo; date at the top of this page. We encourage you to review this page periodically.
      </p>

      <h2 className="text-xl font-semibold text-foreground">9. Contact Us</h2>
      <p>
        If you have any questions about this Privacy Policy, please contact us at support@bookeasy.ai or through our <a href="/contact" className="text-primary hover:underline">Contact page</a>.
      </p>
    </LegalPageLayout>
  );
}
