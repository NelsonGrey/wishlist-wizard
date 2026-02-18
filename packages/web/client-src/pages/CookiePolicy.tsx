import { Helmet } from "react-helmet";

export default function CookiePolicy() {
  return (
    <>
      <Helmet>
        <title>Cookie Policy | Wishlist Wizard</title>
        <meta 
          name="description" 
          content="Information about how Wishlist Wizard uses cookies and similar tracking technologies."
        />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-800 to-green-800 bg-clip-text text-transparent">
            Cookie Policy
          </h1>
          <p className="text-gray-600 mt-2">
            Last updated: February 18, 2026
          </p>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. What are Cookies?</h2>
            <p className="text-gray-700 mb-4">
              Cookies are small pieces of data stored on your device (computer, tablet, or mobile phone) when you visit a website. They are used to remember information about your visit, including your preferences and login information. This makes your next visit to the website easier and the website more useful to you.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. How We Use Cookies</h2>
            <p className="text-gray-700 mb-4">
              Wishlist Wizard uses cookies for the following purposes:
            </p>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900">Essential Cookies</h3>
                <p className="text-gray-700 mt-1">These cookies are necessary for the website to function properly and cannot be disabled in our systems. They are usually set in response to your interactions.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Performance Cookies</h3>
                <p className="text-gray-700 mt-1">These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Functional Cookies</h3>
                <p className="text-gray-700 mt-1">These cookies enable the website to provide enhanced functionality and personalization, such as remembering your preferences.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Advertising Cookies</h3>
                <p className="text-gray-700 mt-1">These cookies may be set by our advertising partners to build a profile of your interests and show you relevant advertisements on other sites.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Types of Cookies We Use</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900">Session Cookies</h3>
                <p className="text-gray-700 mt-1">These are temporary cookies that expire when you close your browser.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Persistent Cookies</h3>
                <p className="text-gray-700 mt-1">These cookies remain on your device for a set period of time or until you delete them.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Third-Party Cookies</h3>
                <p className="text-gray-700 mt-1">Some cookies are set by third-party services we use, such as analytics providers.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Your Cookie Choices</h2>
            <p className="text-gray-700 mb-4">
              You can control and/or delete cookies as you wish. Most browsers allow you to refuse cookies and alert you when a cookie is being sent. Please refer to your browser settings for more information. If you disable non-essential cookies, some functionality of the website may be impacted.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Consent Management</h2>
            <p className="text-gray-700 mb-4">
              When you first visit our website, we display a cookie consent banner allowing you to accept or reject non-essential cookies. You can withdraw your consent at any time in your account preferences.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Contact Us</h2>
            <p className="text-gray-700">
              If you have questions about our cookie policy or how we use cookies, please contact us at privacy@wishlist-wizard.com.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
