import { Helmet } from "react-helmet";

export default function PrivacyPolicy() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy | Wishlist Wizard</title>
        <meta name="description" content="Learn how Wishlist Wizard protects your privacy and uses your personal information." />
        <meta property="og:title" content="Privacy Policy | Wishlist Wizard" />
        <meta property="og:description" content="Learn how Wishlist Wizard protects your privacy and uses your personal information." />
        <meta property="og:url" content="https://wishlist-wizard.com/privacy" />
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-emerald-900">
            Privacy Policy
          </h1>
          <p className="text-gray-600 mt-2">
            Last updated: August 10, 2026
          </p>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700 mb-4">
              Wishlist Wizard ("we" or "us" or "our") operates the Wishlist Wizard website, mobile application, browser extension, and related services (the "Service"). This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information Collection and Use</h2>
            <p className="text-gray-700 mb-4">
              We collect several different types of information for various purposes to provide and improve our Service.
            </p>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900">Types of Data Collected:</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mt-2">
                  <li><strong>Personal Data:</strong> Email address, name, profile picture, wishlist items, and shopping preferences</li>
                  <li><strong>Usage Data:</strong> Information about how you use the Service, including pages visited, time and date of visits, and time spent on pages</li>
                  <li><strong>Device Information:</strong> Device type, operating system, and unique device identifiers</li>
                  <li><strong>Location Data:</strong> With your consent, approximate location for personalized recommendations</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Browser Extension</h2>
            <p className="text-gray-700 mb-4">
              The Wishlist Wizard browser extension lets you save products from any online store to a wishlist with one click. This section describes what the extension specifically accesses and does, in addition to the general practices described above.
            </p>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900">Product page content:</h3>
                <p className="text-gray-700 mt-2">
                  The extension's content script runs on web pages so it can recognize when you're viewing a product page and offer an "Add to Wishlist" button. It reads product details — title, price, image, and page URL — only from the page you're currently viewing. It does not log, store, or transmit a history of the other pages you visit; product information is only sent to our servers when you deliberately choose to add an item to a wishlist.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Signed-in session (auth bridge):</h3>
                <p className="text-gray-700 mt-2">
                  If you're signed in to the Wishlist Wizard website in the same browser, a script running only on our own site's pages relays your authentication token and account email to the extension, so you don't have to sign in a second time. This script does not run on any other website.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Local storage:</h3>
                <p className="text-gray-700 mt-2">
                  The extension caches your session and small pieces of UI state (such as your last-selected wishlist) in the browser's local extension storage, so the popup loads quickly. Your wishlists and account data themselves are stored in your Wishlist Wizard account, not permanently in the extension.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Notifications:</h3>
                <p className="text-gray-700 mt-2">
                  If you opt in, the extension can show browser notifications for activity tied to your own account and wishlists — for example, a friend reserving or purchasing an item, or a price drop on an item you're tracking. These are delivered via Firebase Cloud Messaging.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Third-party code used by the extension:</h3>
                <p className="text-gray-700 mt-2">
                  The extension's background notification service loads Google's official Firebase Cloud Messaging SDK files directly from Google's servers (gstatic.com), following Firebase's documented approach for delivering push notifications from a browser extension. This code is used only to receive and display the notifications described above.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Use of Data</h2>
            <p className="text-gray-700 mb-4">
              We use the collected data for various purposes:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>To provide and maintain our Service</li>
              <li>To notify you about changes to our Service</li>
              <li>To allow you to participate in interactive features of our Service</li>
              <li>To provide customer support</li>
              <li>To gather analysis or valuable information so that we can improve our Service</li>
              <li>To monitor the usage of our Service</li>
              <li>To detect, prevent and address technical and security issues</li>
            </ul>
            <p className="text-gray-700 mt-4">
              We do not sell or transfer your personal data to third parties outside the approved uses described in this policy, use it for purposes unrelated to providing the Service, or use it to determine creditworthiness or for lending purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Security of Data</h2>
            <p className="text-gray-700 mb-4">
              The security of your data is important to us but remember that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Third-Party Services</h2>
            <p className="text-gray-700 mb-4">
              Our Service may contain links to third-party sites that are not operated by us. This Privacy Policy does not apply to third-party websites and we are not responsible for their privacy practices. We encourage you to review their privacy policies before providing your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Your Rights</h2>
            <p className="text-gray-700 mb-4">
              You have the right to:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Access the personal data we hold about you</li>
              <li>Correct any inaccurate or incomplete personal data</li>
              <li>Request deletion of your personal data</li>
              <li>Opt-out of marketing communications</li>
              <li>Data portability in a structured format</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Changes to This Privacy Policy</h2>
            <p className="text-gray-700 mb-4">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date at the top of this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Contact Us</h2>
            <p className="text-gray-700">
              If you have any questions about this Privacy Policy, please contact us at{" "}
              <a href="mailto:privacy@wishlist-wizard.com" className="text-emerald-700 hover:text-emerald-800">
                privacy@wishlist-wizard.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
