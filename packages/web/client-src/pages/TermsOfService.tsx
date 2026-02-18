import { Helmet } from "react-helmet";

export default function TermsOfService() {
  return (
    <>
      <Helmet>
        <title>Terms of Service | Wishlist Wizard</title>
        <meta 
          name="description" 
          content="Read the terms and conditions for using Wishlist Wizard services."
        />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">
            Terms of Service
          </h1>
          <p className="text-gray-600 mt-2">
            Last updated: February 18, 2026
          </p>
        </div>

        <div className="max-w-3xl space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 mb-4">
              By accessing and using Wishlist Wizard, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Use License</h2>
            <p className="text-gray-700 mb-4">
              Permission is granted to temporarily download one copy of the materials (information or software) on Wishlist Wizard for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li>Modifying or copying the materials</li>
              <li>Using the materials for any commercial purpose or for any public display</li>
              <li>Attempting to decompile or reverse engineer any software found on Wishlist Wizard</li>
              <li>Transferring the materials to another person or "mirroring" the materials on any other server</li>
              <li>Removing any copyright or other proprietary notations from the materials</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Disclaimer</h2>
            <p className="text-gray-700 mb-4">
              The materials on Wishlist Wizard's website and mobile application are provided "as is". Wishlist Wizard makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Limitations</h2>
            <p className="text-gray-700 mb-4">
              In no event shall Wishlist Wizard or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Wishlist Wizard's internet site, even if Wishlist Wizard or a Wishlist Wizard authorized representative has been notified orally or in writing of the possibility of such damage.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Accuracy of Materials</h2>
            <p className="text-gray-700 mb-4">
              The materials appearing on Wishlist Wizard's website and mobile application could include technical, typographical, or photographic errors. Wishlist Wizard does not warrant that any of the materials on the website or application are accurate, complete, or current. Wishlist Wizard may make changes to the materials contained on the website or application at any time without notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Links</h2>
            <p className="text-gray-700 mb-4">
              Wishlist Wizard has not reviewed all of the sites linked to its website or application and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by Wishlist Wizard of the site. Use of any such linked website is at the user's own risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Modifications</h2>
            <p className="text-gray-700 mb-4">
              Wishlist Wizard may revise these terms of service for the website and application at any time without notice. By using this website or application, you are agreeing to be bound by the then current version of these terms of service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Governing Law</h2>
            <p className="text-gray-700 mb-4">
              These terms and conditions are governed by and construed in accordance with the laws of the jurisdiction in which Wishlist Wizard operates, and you irrevocably submit to the exclusive jurisdiction of the courts located in that location.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Us</h2>
            <p className="text-gray-700">
              If you have any questions about these Terms of Service, please contact us at support@wishlist-wizard.com.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
