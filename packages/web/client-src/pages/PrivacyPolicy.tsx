import { Helmet } from "react-helmet";

export default function PrivacyPolicy() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy | Wishlist Wizard</title>
        <meta 
          name="description" 
          content="Learn how Wishlist Wizard protects your privacy and uses your personal information."
        />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-teal-500 bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          <p className="text-gray-600 mt-2">
            Last updated: February 18, 2026
          </p>
        </div>

        <div className="max-w-3xl space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700 mb-4">
              Wishlist Wizard ("we" or "us" or "our") operates the Wishlist Wizard website, mobile application and related services (the "Service"). This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.
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
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Use of Data</h2>
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
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Security of Data</h2>
            <p className="text-gray-700 mb-4">
              The security of your data is important to us but remember that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Third-Party Services</h2>
            <p className="text-gray-700 mb-4">
              Our Service may contain links to third-party sites that are not operated by us. This Privacy Policy does not apply to third-party websites and we are not responsible for their privacy practices. We encourage you to review their privacy policies before providing your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Your Rights</h2>
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
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Changes to This Privacy Policy</h2>
            <p className="text-gray-700 mb-4">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date at the top of this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Us</h2>
            <p className="text-gray-700">
              If you have any questions about this Privacy Policy, please contact us at privacy@wishlist-wizard.com.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
