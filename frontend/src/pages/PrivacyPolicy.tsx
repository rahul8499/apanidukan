import React from 'react'
import { Link } from 'react-router-dom'

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-slate-950">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950 text-sm text-white">Q</span>
            QuickStore
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 prose prose-slate prose-lg">
        <h1>Privacy Policy</h1>
        <p className="text-sm text-slate-500">
          <strong>Effective Date:</strong> September 8, 2026
          <br />
          <strong>Last Updated:</strong> September 8, 2026
        </p>

        <p>
          Apani Dukan (<strong>https://apanidukan.com</strong>) and our associated seller
          management application and Progressive Web App (collectively, <strong>"Apani Dukan,"
          "we," "us," or "our"</strong>) are committed to protecting your privacy. This Privacy
          Policy explains how we collect, use, disclose, and safeguard your information when you
          use our platform to create and manage your online store.
        </p>

        <h2>1. Information We Collect</h2>

        <h3>1.1 Account &amp; Registration Information</h3>
        <p>When you register for a seller account, we collect:</p>
        <ul>
          <li><strong>Email address</strong> — used as your unique login identifier and for account communications</li>
          <li><strong>Phone number (optional)</strong> — used for OTP-based verification and account security</li>
          <li><strong>First name and last name</strong> — for personalization of your dashboard</li>
          <li><strong>Password</strong> — securely hashed and stored; never accessible in plain text</li>
        </ul>

        <h3>1.2 One-Time Password (OTP) Data</h3>
        <p>When you verify your phone number, we collect:</p>
        <ul>
          <li><strong>Phone number</strong> — the number receiving the OTP</li>
          <li><strong>OTP code</strong> — a temporary 6-digit code used for verification</li>
          <li><strong>Verification status and timestamps</strong> — for security and fraud prevention</li>
        </ul>

        <h3>1.3 Store Information</h3>
        <p>When you create or manage a store, we collect:</p>
        <ul>
          <li><strong>Store name, description, and business type</strong> — displayed to customers</li>
          <li><strong>Store address (street, city, area)</strong> — used for delivery and public display</li>
          <li><strong>Store location (latitude and longitude)</strong> — used for delivery distance calculation and customer navigation</li>
          <li><strong>Store phone number</strong> — for customer contact and order communication</li>
          <li><strong>Store logo and theme preferences</strong> — for customizing your storefront appearance</li>
          <li><strong>Delivery configuration</strong> — minimum order amount, delivery radius, delivery fees, and delivery time estimates</li>
        </ul>

        <h3>1.4 Product &amp; Catalog Information</h3>
        <p>When you add products to your store, we collect:</p>
        <ul>
          <li><strong>Product name, description, pricing, and stock quantity</strong> — displayed to customers</li>
          <li><strong>Product images</strong> — for storefront display</li>
          <li><strong>Digital files (if applicable)</strong> — downloadable product files, stored securely for licensed purchases</li>
          <li><strong>Category assignments</strong> — for product organization</li>
          <li><strong>Customer search queries</strong> — collected to help you understand demand and improve your catalog</li>
        </ul>

        <h3>1.5 Order &amp; Customer Information</h3>
        <p>When customers place orders through your store, we collect (on your behalf):</p>
        <ul>
          <li><strong>Customer name and phone number</strong> — for order fulfillment and communication</li>
          <li><strong>Delivery address (if home delivery is selected)</strong> — for delivering orders</li>
          <li><strong>Delivery location data</strong> — delivery distance (km) and location URL for delivery coordination</li>
          <li><strong>Order details</strong> — items ordered, quantities, prices, order type (delivery/pickup), and order status</li>
          <li><strong>Delivery fee and coupon/discount information</strong> — for billing accuracy</li>
        </ul>

        <h3>1.6 Payment Information</h3>
        <p>When you set up payments and customers place orders, we collect:</p>
        <ul>
          <li><strong>Merchant payment credentials</strong> — your UPI ID, UPI name, UPI QR code, and Razorpay API key ID and secret (stored securely server-side, never exposed to the frontend)</li>
          <li><strong>Payment type selected by customer</strong> — Cash on Delivery (COD) or Online payment</li>
          <li><strong>Transaction references</strong> — UTR numbers and payment gateway references, used to confirm payments</li>
          <li><strong>Payment verification status</strong> — timestamps showing when payments are verified</li>
        </ul>
        <p>
          <strong>Note:</strong> We do not process or store your customers' actual payment card
          details. Online payments are handled directly by our third-party payment gateway (Razorpay/UPI).
        </p>

        <h3>1.7 Customer Loyalty &amp; Wallet Data</h3>
        <p>We maintain a customer loyalty wallet associated with your store:</p>
        <ul>
          <li><strong>Customer phone number</strong> — wallet identifier (unique per store + phone)</li>
          <li><strong>Customer name (if provided)</strong> — for wallet personalization</li>
          <li><strong>Wallet balance, total earned, and total redeemed</strong> — loyalty cashback tracking</li>
        </ul>

        <h3>1.8 Product Requests</h3>
        <p>When customers submit product requests through your store, we collect:</p>
        <ul>
          <li><strong>Customer name and phone number</strong> — for follow-up communication</li>
          <li><strong>Requested product name and message</strong> — to fulfill the request</li>
        </ul>

        <h3>1.9 Technical &amp; Usage Data</h3>
        <p>Automatically collected when you use our platform:</p>
        <ul>
          <li><strong>Device user agent</strong> — to detect device type and support PWA installation</li>
          <li><strong>Local storage data</strong> — your selected store slug, seller/store ID, and PWA install type (used solely for app functionality and offline support)</li>
          <li><strong>Browser information</strong> — for debugging and performance optimization</li>
          <li><strong>Store visit counts</strong> — aggregate analytics to help you understand store traffic</li>
          <li><strong>Product view counts</strong> — aggregate analytics per product</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>To create, manage, and authenticate your seller account</li>
          <li>To host and display your online store and product catalog to customers</li>
          <li>To process and fulfill orders placed through your store</li>
          <li>To facilitate payment processing and verify transactions</li>
          <li>To send you order notifications, announcements, and customer messages</li>
          <li>To provide analytics and insights to help grow your business</li>
          <li>To calculate delivery distances and optimize delivery routing</li>
          <li>To improve our platform, fix bugs, and enhance security</li>
          <li>To send you service-related communications (e.g., OTPs, password resets)</li>
        </ul>

        <h2>3. How We Share Your Information</h2>
        <h3>3.1 With Your Customers</h3>
        <p>
          Your store name, description, address, phone number, logo, products, and other public
          store details are visible to customers browsing your storefront.
        </p>

        <h3>3.2 Payment Providers</h3>
        <p>
          When you enable online payments, transaction data (order amount, reference IDs) is
          shared with our third-party payment processor (Razorpay) solely to process the payment.
        </p>

        <h3>3.3 Service Providers</h3>
        <p>
          We share data with trusted third parties who assist us in operating our platform,
          including cloud hosting, analytics, and communication services. These parties are
          obligated to protect your data and use it only for the services they provide to us.
        </p>

        <h3>3.4 Legal Compliance &amp; Safety</h3>
        <p>
          We may disclose your information if required by law, to respond to legal requests,
          to protect our rights and safety, or to prevent fraud and abuse.
        </p>

        <h3>3.5 Business Transfers</h3>
        <p>
          In the event of a merger, acquisition, or sale of all or part of our assets, your
          information may be transferred to the acquiring entity, subject to this Privacy Policy.
        </p>

        <p>
          <strong>We do not sell, trade, or rent your personal information to third parties
          for their marketing purposes.</strong>
        </p>

        <h2>4. Data Storage &amp; Security</h2>
        <ul>
          <li>
            All data is stored on secure servers protected by industry-standard security measures
            including encryption in transit (TLS/SSL) and at rest where applicable.
          </li>
          <li>
            Your password is hashed using strong cryptographic algorithms and is never stored in plain text.
          </li>
          <li>
            Merchant payment credentials (UPI details, Razorpay keys) are stored server-side only
            and are never exposed to the frontend or other users.
          </li>
          <li>
            Digital product files are stored in a private, access-controlled directory.
          </li>
          <li>
            We retain your information for as long as your account is active or as needed to
            provide our services, unless a longer retention period is required by law.
          </li>
        </ul>

        <h2>5. Cookies &amp; Local Storage</h2>
        <p>
          Our Progressive Web App uses local storage to:
        </p>
        <ul>
          <li>Remember your selected store and seller identity for app functionality</li>
          <li>Configure the PWA manifest (store name, theme, icons) for installed app experience</li>
          <li>Store authentication tokens (access and refresh tokens) locally for session management</li>
        </ul>
        <p>
          We do not use third-party tracking cookies. Authentication tokens are stored in
          local storage and are used solely to keep you logged in. They do not contain
          personally identifiable information beyond your user identifier.
        </p>

        <h2>6. Your Rights &amp; Choices</h2>
        <p>You have the right to:</p>
        <ul>
          <li><strong>Access &amp; Update:</strong> Access and update your account information (email, name, phone) at any time from your account settings.</li>
          <li><strong>Data Portability:</strong> Request an export of your store data, products, orders, and customer interactions.</li>
          <li><strong>Data Deletion:</strong> Submit a deletion request. You may request account deletion at any time by contacting us. Upon deletion, we will remove your personal information within 30 days, except where we need to retain it for legal compliance, security, or to complete pending transactions.</li>
          <li><strong>Opt-Out of Marketing:</strong> We send service-related communications (order notifications, OTPs) as part of our core service. You cannot opt out of these, but you may opt out of non-essential announcements.</li>
          <li><strong>PWA Uninstall:</strong> You may uninstall the Progressive Web App at any time through your device settings. This does not delete your account or data.</li>
        </ul>

        <h2>7. Children's Privacy</h2>
        <p>
          Our platform is designed for business use by individuals who are 18 years of age or older.
          We do not knowingly collect personal information from children under 18. If we become
          aware that we have collected such information, we will take steps to delete it promptly.
        </p>

        <h2>8. International Data Transfers</h2>
        <p>
          If you are located outside of India, your information may be transferred to and processed
          in India, where our servers are located and where data protection laws may differ from
          your jurisdiction. By using our services, you consent to such transfers.
        </p>

        <h2>9. Changes to This Privacy Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any changes
          by posting the new policy on our platform and, where applicable, updating the "Last
          Updated" date at the top of this page. Your continued use of our services after any
          changes constitutes your acceptance of the revised policy.
        </p>

        <h2>10. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, your data, or your rights, please
          contact us at:
        </p>
        <ul>
          <li><strong>Email:</strong> <a href="mailto:privacy@apanidukan.com">privacy@apanidukan.com</a></li>
          <li><strong>Website:</strong> https://apanidukan.com</li>
        </ul>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 mt-12">
        <div className="mx-auto max-w-4xl text-center text-sm text-slate-500">
          <p>&copy; 2026 Apani Dukan. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default PrivacyPolicy
