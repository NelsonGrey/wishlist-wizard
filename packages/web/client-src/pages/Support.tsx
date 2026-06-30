import { Helmet } from "react-helmet";
import { Mail, MessageSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useState } from "react";
import { Link } from "wouter";

export default function Support() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const subject = `[Wishlist Wizard] ${formData.subject.trim()}`;
    const body = [
      `Name: ${formData.name.trim()}`,
      `Email: ${formData.email.trim()}`,
      '',
      formData.message.trim()
    ].join('\n');

    const mailtoUrl = `mailto:support@wishlist-wizard.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;

    setSubmitted(true);
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <>
      <Helmet>
        <title>Help & Support | Wishlist Wizard</title>
        <meta name="description" content="Find answers about Wishlist Wizard wishlists, sharing, price tracking, subscriptions, and support." />
        <meta property="og:title" content="Help & Support | Wishlist Wizard" />
        <meta property="og:description" content="Find answers about Wishlist Wizard wishlists, sharing, price tracking, subscriptions, and support." />
        <meta property="og:url" content="https://wishlist-wizard.com/support" />
        <meta name="twitter:title" content="Help & Support | Wishlist Wizard" />
        <meta name="twitter:description" content="Find answers about Wishlist Wizard wishlists, sharing, price tracking, subscriptions, and support." />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-emerald-900">
            Help & Support
          </h1>
          <p className="text-gray-600 mt-2">
            Get help with wishlists, sharing, price tracking, subscriptions, and account settings.
          </p>
        </div>

        {/* ── FAQ ── */}
        <section aria-labelledby="faq-heading" className="mb-14">
          <h2 id="faq-heading" className="text-2xl font-semibold text-gray-900 mb-6">
            Frequently Asked Questions
          </h2>

          <Accordion type="multiple" className="space-y-2">

            {/* Getting Started */}
            <AccordionItem value="getting-started" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                How do I get started?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700 space-y-2 pb-4">
                <ol className="list-decimal pl-5 space-y-2">
                  <li><strong>Create an account</strong> — sign up with your email address.</li>
                  <li><strong>Set up your profile</strong> — add preferences so recommendations stay personalized.</li>
                  <li><strong>Create your first wishlist</strong> — go to My Wishlists and click Create New Wishlist.</li>
                  <li><strong>Install the browser extension</strong> — add items from any retailer in one click.</li>
                  <li><strong>Download the mobile app</strong> — manage wishlists and scan barcodes on the go. <Link href="/download" className="text-emerald-700 hover:underline">Download here.</Link></li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            {/* Wishlists */}
            <AccordionItem value="wishlists" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                How do I create and manage wishlists?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700 space-y-2 pb-4">
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Create multiple wishlists</strong> — make separate lists for different events or people.</li>
                  <li><strong>Add items</strong> — use the browser extension, manual entry, or the mobile app's barcode scanner.</li>
                  <li><strong>Organize lists</strong> — categorize, prioritize, and sort items as needed.</li>
                  <li><strong>Share wishlists</strong> — generate a shareable link for friends and family.</li>
                  <li><strong>Collaborate</strong> — invite others to add or edit items on a shared wishlist.</li>
                  <li><strong>Privacy controls</strong> — choose who can see each list (public, private, or limited).</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            {/* Sharing */}
            <AccordionItem value="sharing" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                How do I share a wishlist?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700 space-y-2 pb-4">
                <p>Open any wishlist and click <strong>Share</strong> to generate a unique link. You can then:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Send the link via email, text, or social media.</li>
                  <li>Set privacy to <em>Public</em> (anyone with the link), <em>Private</em> (invited people only), or <em>Limited</em> (restricted info).</li>
                  <li>Allow collaborators to add or edit items by granting edit access.</li>
                  <li>Leave comments on items so collaborators can coordinate.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            {/* Browser extension */}
            <AccordionItem value="extension" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                How do I install the browser extension?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700 space-y-3 pb-4">
                <p>The extension works on Chrome, Firefox, Edge, and Safari. Visit the <Link href="/extension" className="text-emerald-700 hover:underline">Extension page</Link> and click the install button for your browser. Once installed:</p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Click the Wishlist Wizard icon in your browser toolbar when viewing any product page.</li>
                  <li>The extension automatically detects the product title, price, and image.</li>
                  <li>Choose a wishlist and click <strong>Add to Wishlist</strong>.</li>
                </ol>
                <p className="text-sm text-gray-500">Works on thousands of retailers including Amazon, Target, Walmart, Etsy, and more.</p>
              </AccordionContent>
            </AccordionItem>

            {/* Extension troubleshooting */}
            <AccordionItem value="extension-trouble" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                The browser extension isn't detecting product information — what do I do?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700 space-y-2 pb-4">
                <ul className="list-disc pl-5 space-y-2">
                  <li>Refresh the page and try again — make sure you're on a product page, not a search results page.</li>
                  <li>Check that the extension is enabled in your browser settings.</li>
                  <li>Log out and back into your Wishlist Wizard account in the extension.</li>
                  <li>Some sites with unusual layouts require manual input — use the manual entry option in the extension popup.</li>
                  <li>If nothing works, try reinstalling the extension or updating your browser.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            {/* Price tracking */}
            <AccordionItem value="price-tracking" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                How does price tracking work?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700 space-y-2 pb-4">
                <p>Wishlist Wizard monitors prices for items on your wishlist and alerts you when they drop:</p>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li>Prices are checked regularly across supported retailers.</li>
                  <li>Price history is stored so you can see trends over time and confirm whether a "sale" is actually a good deal.</li>
                  <li>You receive a notification (in-app and/or email) when a price drops.</li>
                </ul>
                <p className="mt-2">To enable tracking, open any wishlist item and toggle <strong>Track Price</strong>. You can also set a <strong>target price</strong> or a <strong>percentage discount</strong> threshold so you're only notified when the drop is significant enough.</p>
                <p className="text-sm text-gray-500 mt-2">Price tracking is currently available for major online retailers. Prices typically update once per day.</p>
              </AccordionContent>
            </AccordionItem>

            {/* Group gifts */}
            <AccordionItem value="group-gifts" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                What is Gift Coordination and how does it work?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700 space-y-2 pb-4">
                <p>Gift Coordination helps multiple people reserve, contribute to, or coordinate around a single item on someone's wishlist so buyers avoid duplicates and confusion.</p>
                <p className="mt-2"><strong>To start a group gift:</strong></p>
                <ol className="list-decimal pl-5 space-y-1 mt-1">
                  <li>Find the item on a wishlist and click <strong>Start Group Gift</strong>.</li>
                  <li>Set a target amount and an optional message.</li>
                  <li>Share the group gift link with friends and family.</li>
                </ol>
                <p className="mt-2"><strong>To contribute:</strong> click the link shared with you, enter your amount, and choose whether to contribute anonymously.</p>
                <p className="mt-2">Everyone can track the total raised and the percentage toward the goal. The organizer is notified when the gift is fully funded and coordinates the purchase.</p>
              </AccordionContent>
            </AccordionItem>

            {/* Recommendations */}
            <AccordionItem value="recommendations" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                How do personalized recommendations work?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700 space-y-2 pb-4">
                <p>Wishlist Wizard uses wishlist activity, profile preferences, and product trends to suggest gift ideas that may fit your interests. The more complete your wishlists and preferences are, the more relevant suggestions can become.</p>
                <p className="mt-2"><strong>To improve recommendations:</strong></p>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>Complete your interests, favorite brands, and sizes in your profile settings.</li>
                  <li>Add more items to your wishlists.</li>
                  <li>Rate suggestions with thumbs up/down to help refine your suggestions.</li>
                  <li>Add important dates (birthdays, anniversaries) to your calendar for event-based suggestions.</li>
                </ul>
                <p className="text-sm text-gray-500 mt-2">Your data is used only for your own recommendations and is never shared with third parties. You can turn off recommendation tracking in Privacy settings.</p>
              </AccordionContent>
            </AccordionItem>

            {/* Mobile app */}
            <AccordionItem value="mobile-app" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                Is there a mobile app?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700 space-y-2 pb-4">
                <p>Yes — the Wishlist Wizard iOS app is available on the App Store. An Android app is coming soon.</p>
                <p className="mt-2">The mobile app lets you:</p>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>Scan product barcodes in-store to add items directly to a wishlist.</li>
                  <li>Receive price drop alerts on your lock screen.</li>
                  <li>Browse and manage all your wishlists offline.</li>
                  <li>Share wishlists via text, messaging apps, or social media.</li>
                </ul>
                <p className="mt-2">
                  <Link href="/download" className="text-emerald-700 hover:underline font-medium">Download the iOS app →</Link>
                </p>
              </AccordionContent>
            </AccordionItem>

            {/* Subscriptions */}
            <AccordionItem value="subscriptions" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                What's included in the free plan, and how do I upgrade?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700 space-y-2 pb-4">
                <p>The free plan lets you create useful wishlists, add items, share lists, and use the browser extension — no credit card required.</p>
                <p className="mt-2">Paid subscriptions unlock more wishlists, more price-tracked items, group gifting, creator analytics, commission share, team seats, and API access depending on the plan.</p>
                <p className="mt-2">
                  <Link href="/subscriptions" className="text-emerald-700 hover:underline font-medium">See all subscription plans →</Link>
                </p>
              </AccordionContent>
            </AccordionItem>

            {/* Account */}
            <AccordionItem value="account" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                How do I update my account or delete my data?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700 space-y-2 pb-4">
                <p>Click your profile icon in the top-right corner to access account settings. From there you can:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Update your name, photo, and preferences.</li>
                  <li>Change your password or enable two-factor authentication.</li>
                  <li>Control who can see your wishlists and activity.</li>
                  <li>Configure notification preferences (in-app, email, or push).</li>
                  <li>Export or delete all your data at any time.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

          </Accordion>
        </section>

        {/* ── Contact section ── */}
        <section aria-labelledby="contact-heading">
          <h2 id="contact-heading" className="text-2xl font-semibold text-gray-900 mb-6">
            Still need help?
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <Card>
              <CardHeader>
                <Mail className="h-6 w-6 text-emerald-800 mb-2" />
                <CardTitle className="text-lg">Email us</CardTitle>
              </CardHeader>
              <CardContent>
                <a href="mailto:support@wishlist-wizard.com" className="text-emerald-700 hover:text-emerald-800">
                  support@wishlist-wizard.com
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <MessageSquare className="h-6 w-6 text-emerald-800 mb-2" />
                <CardTitle className="text-lg">Response time</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">We reply within 24–48 hours on business days.</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Send us a message</CardTitle>
              <CardDescription>
                Fill out the form below and we'll get back to you as soon as possible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <div className="text-center py-8">
                  <div className="text-green-600 font-semibold mb-2">Your email client is ready.</div>
                  <p className="text-gray-600">
                    If nothing opened, email us directly at{" "}
                    <a href="mailto:support@wishlist-wizard.com" className="text-emerald-700 hover:underline">
                      support@wishlist-wizard.com
                    </a>.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <Input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Your name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <Input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <Input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="What is this about?"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <Textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Tell us what's on your mind..."
                      rows={5}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-emerald-800 text-white hover:bg-emerald-900"
                  >
                    Send Message
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  );
}
