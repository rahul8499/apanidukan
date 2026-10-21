import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="border-b border-slate-100 py-6 last:border-0">
    <h2 className="text-lg font-extrabold tracking-tight text-slate-900">{title}</h2>
    <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">{children}</div>
  </section>
)

const PrivacyPolicy: React.FC = () => {
  const location = useLocation()
  const sellerMatch = location.pathname.match(/^\/stores\/([^/]+)\/privacy-policy$/)
  const backTo = sellerMatch ? `/stores/${sellerMatch[1]}/manage` : '/customer-home'

  return (
  <div className="min-h-screen bg-slate-50 text-slate-800">
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to={backTo} className="flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-orange-600">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <Link to={backTo} aria-label="Apani Dukan home">
          <img src="/apanidukan-customer-logo.png" alt="Apani Dukan" className="h-8 w-auto object-contain" />
        </Link>
      </div>
    </header>

    <main className="mx-auto max-w-4xl px-3 py-6 sm:px-6 sm:py-10">
      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:rounded-3xl">
        <div className="border-b border-slate-100 bg-gradient-to-br from-orange-50 via-white to-amber-50 px-5 py-7 sm:px-9 sm:py-9">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-white px-3 py-1 text-[11px] font-bold text-orange-700">
            <ShieldCheck className="h-4 w-4" /> Privacy &amp; data use
          </span>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Privacy Policy</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            This policy explains how Apani Dukan handles information when people discover stores, place orders, or run a seller storefront on our platform. Sellers can review the responsibilities that apply when they receive customer and order information.
          </p>
          <p className="mt-4 text-xs font-medium text-slate-500"><strong>Effective and updated:</strong> 21 October 2026</p>
        </div>

        <div className="px-5 sm:px-9">
          <Section title="1. Who we are and what this policy covers">
            <p><strong className="text-slate-800">Apani Dukan is a technology platform that connects customers with independent sellers.</strong> We provide tools for store listings, product discovery, orders, customer-seller communication, and order updates. A seller operates their own business and is responsible for the products, prices, stock, fulfilment, delivery or pickup, customer service, and its own legal obligations.</p>
            <p>Apani Dukan does not own or operate the listed sellers’ shops and is not the seller or manufacturer of a product just because it appears on the platform. For data used to run the platform, Apani Dukan decides the purposes and means of processing. A seller that receives customer details for an order is separately responsible for its handling of those details for its business and must provide any notices required by law.</p>
            <p>This policy applies to customers, sellers, delivery personnel using the platform, and visitors to Apani Dukan websites and apps.</p>
          </Section>

          <Section title="2. Information we collect">
            <ul className="list-disc space-y-2 pl-5 marker:text-orange-500">
              <li><strong className="text-slate-800">Seller account and store:</strong> name, email or phone number, account credentials, store name and description, business category, address, contact details, GPS coordinates, logo, products, prices, stock, delivery settings, and payment setup details entered by the seller.</li>
              <li><strong className="text-slate-800">Customer and order:</strong> name, phone number, items and quantities, order value and status, chosen delivery or pickup method, delivery address and, if supplied, delivery coordinates or a map link. Sellers need this information to accept, prepare, deliver, or support an order.</li>
              <li><strong className="text-slate-800">Verification and security:</strong> phone verification results and related timestamps. OTPs are sent and verified through MSG91 or the provider configured for the relevant flow. Delivery verification codes are handled as security credentials and are not displayed as plain text in seller order records.</li>
              <li><strong className="text-slate-800">Customer requests and communications:</strong> messages sent to a seller, product requests, order cancellation or return/exchange/refund requests, and any images or evidence a user chooses to upload. WhatsApp conversations opened outside Apani Dukan are handled by WhatsApp under its own terms and privacy policy.</li>
              <li><strong className="text-slate-800">Location:</strong> if you allow browser/device location, we use coordinates to find nearby stores, calculate approximate distance, or show an address. The browser permission is controlled by you. Some location or address lookups may be sent to our location service providers. A saved location may remain in your device’s local storage until you remove it or clear site data.</li>
              <li><strong className="text-slate-800">Payments and loyalty:</strong> payment method, amount, transaction/reference IDs, payment status, and store wallet or loyalty records where enabled. Online payment processing is performed by the payment provider selected for that transaction. Apani Dukan does not ask customers to enter card PINs or banking passwords into order forms.</li>
              <li><strong className="text-slate-800">Device and usage:</strong> technical information needed to operate and protect the service, such as browser/device details, app preferences, store and product views, search terms, notification preferences, and diagnostic/security logs generated by the app or hosting providers.</li>
            </ul>
            <p>Please do not submit information that is not needed for a store, order, or support request. Sellers should not request sensitive credentials such as OTPs, card PINs, or banking passwords.</p>
          </Section>

          <Section title="3. Why we use information">
            <p>We use information to create and secure accounts; publish seller-authorised storefronts and catalogs; show relevant stores and approximate distance; route orders and customer requests to the chosen seller; support delivery, pickup, returns and payment status; send OTPs and service notifications; maintain loyalty features; prevent misuse and investigate problems; provide customer support; and maintain, troubleshoot, and improve the platform.</p>
            <p>We use location only when you provide it or enable the relevant feature. You can deny or revoke device location permission, though nearby search and distance features may then be limited.</p>
          </Section>

          <Section title="4. When information is shared">
            <ul className="list-disc space-y-2 pl-5 marker:text-orange-500">
              <li><strong className="text-slate-800">With the seller you choose:</strong> order and contact details, and delivery details when needed, are shared with that seller so they can handle the transaction. The seller may also receive information when you contact them or submit a request.</li>
              <li><strong className="text-slate-800">With a delivery person:</strong> relevant order, contact, and delivery information may be provided when a seller assigns a delivery person to fulfil an order.</li>
              <li><strong className="text-slate-800">With service providers:</strong> providers help us host the platform, send or verify OTPs and service messages, process payments, deliver notifications, and provide maps or geocoding. They receive information needed for their service and may process it under their own terms and applicable agreements.</li>
              <li><strong className="text-slate-800">With the public:</strong> a seller’s published store details, address, contact information, products, and prices are visible on its storefront. Do not publish personal information in a public store profile unless you intend it to be public.</li>
              <li><strong className="text-slate-800">For legal and safety reasons:</strong> we may disclose information where required by law or valid legal process, or where reasonably necessary to protect users, investigate fraud or abuse, or secure the platform.</li>
            </ul>
            <p>We do not sell personal information to data brokers or share it with third parties for their own unrelated advertising. We do not control a seller’s or external provider’s independent privacy practices; review their notices when interacting with them.</p>
          </Section>

          <Section title="5. Payments and third-party services">
            <p>The seller chooses which payment options to offer. Depending on the order, payment may be handled directly with the seller (for example, UPI or cash on delivery) or by a payment provider. The relevant provider may collect payment details directly and its own privacy terms apply. We receive or retain transaction references and payment status needed to show and reconcile an order; we do not store full card numbers, card security codes, UPI PINs, or bank passwords.</p>
            <p>MSG91 may process phone numbers and verification data for OTP services. Location lookups may be handled by Mappls and/or OpenStreetMap’s Nominatim service. These providers may process data on systems in locations that differ from yours.</p>
          </Section>

          <Section title="6. Cookies, app storage, and notifications">
            <p>Our website and installable app use browser storage for essential functions such as session/authentication state, selected store, customer preferences, saved location (when chosen), and pending app flows. Clearing browser storage or uninstalling the app may sign you out or remove saved preferences, but does not itself delete server-side account or order records.</p>
            <p>If you enable push notifications, your browser or device and our notification provider process the subscription information needed to deliver them. You can turn notifications off in device or browser settings. We do not use cookies for cross-site advertising.</p>
          </Section>

          <Section title="7. Retention and account closure">
            <p>We keep information for as long as it is needed to provide the platform, complete orders, resolve disputes, maintain security, and meet applicable legal, tax, and accounting obligations. Different records may be kept for different periods. We do not promise that every record is immediately erased when an account is closed; backups, legally required records, and records needed for unresolved orders or disputes may remain for a limited period.</p>
            <p>Seller account deactivation currently unpublishes and archives the seller’s stores; open or paid orders must be resolved first. Deactivation is not the same as immediate deletion of every order, transaction, or customer record. Customers and sellers can request access, correction, or deletion by emailing the contact below. We may ask for reasonable verification and may retain information where law permits or requires it.</p>
          </Section>

          <Section title="8. Security and your responsibilities">
            <p>We use access controls and operational safeguards intended to protect information. No website, device, or internet transmission can be guaranteed completely secure. Keep account credentials private, protect your device, and report suspected unauthorised access. Sellers must limit staff access to customer information and use it only for legitimate store, order, support, and legal purposes.</p>
          </Section>

          <Section title="9. Your choices and privacy requests">
            <p>You can manage device location and notification permissions in browser or device settings, update seller account/store information in the app, and choose whether to place an order or share optional information. You may request access to, correction of, or deletion of personal information, or raise a concern, by contacting us. We will verify the request, respond within the time required by applicable law, and explain if some information must be retained or a request cannot be completed.</p>
            <p>For an order issue, contact the seller first using the store’s contact details; contact us if the issue concerns platform handling, account access, or privacy. This does not limit any rights or remedies available under applicable law.</p>
          </Section>

          <Section title="10. Children">
            <p>Seller accounts are intended for people legally able to operate a business. A parent or guardian should supervise a minor’s use of shopping features. We do not knowingly seek to collect children’s personal data for independent account creation. If you believe a child has submitted personal information without appropriate permission, contact us so we can review it.</p>
          </Section>

          <Section title="11. Changes and applicable law">
            <p>We may revise this policy as the platform or applicable law changes. We will publish the latest version here and update the date above. If a change materially affects how information is used, we will provide notice or seek consent where required.</p>
            <p>We operate with reference to applicable Indian privacy and data-protection law, including the Digital Personal Data Protection Act, 2023 and rules as and when their relevant provisions take effect. The Act and Rules have a phased commencement schedule. This policy is an explanation of our practices, not a certification of legal compliance or legal advice.</p>
            <p>Official references: <a className="font-semibold text-orange-700 underline" href="https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023.pdf" target="_blank" rel="noreferrer">Digital Personal Data Protection Act, 2023</a> and <a className="font-semibold text-orange-700 underline" href="https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digital-Personal-Data-Protection-Rules-2025" target="_blank" rel="noreferrer">Digital Personal Data Protection Rules, 2025</a>.</p>
          </Section>

          <Section title="12. Contact Apani Dukan">
            <p>For privacy questions, access/correction/deletion requests, or complaints about how Apani Dukan handles personal information, email <a className="font-bold text-orange-700 underline" href="mailto:privacy@apanidukan.com">privacy@apanidukan.com</a>. Include the account phone/email or order reference needed to identify the issue, but do not include an OTP, password, card number, or UPI PIN.</p>
            <p>Website: <a className="font-semibold text-orange-700 underline" href="https://apanidukan.com" target="_blank" rel="noreferrer">apanidukan.com</a></p>
          </Section>
        </div>
      </article>
    </main>

    <footer className="py-6 text-center text-xs text-slate-500">© 2026 Apani Dukan · Connecting customers with independent local sellers</footer>
  </div>
)

}

export default PrivacyPolicy
