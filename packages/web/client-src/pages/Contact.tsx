import { Helmet } from "react-helmet";
import { Mail, MessageSquare, MapPin } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export default function Contact() {
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
    // TODO: Implement contact form submission
    setSubmitted(true);
    setTimeout(() => {
      setFormData({ name: "", email: "", subject: "", message: "" });
      setSubmitted(false);
    }, 3000);
  };

  return (
    <>
      <Helmet>
        <title>Contact Us | Wishlist Wizard</title>
        <meta 
          name="description" 
          content="Get in touch with the Wishlist Wizard team. We'd love to hear from you!"
        />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-rose-500 bg-clip-text text-transparent">
            Contact Us
          </h1>
          <p className="text-gray-600 mt-2">
            We'd love to hear from you. Get in touch with our team.
          </p>
        </div>

        <div className="max-w-3xl space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader>
                <Mail className="h-6 w-6 text-pink-600 mb-2" />
                <CardTitle className="text-lg">Email</CardTitle>
              </CardHeader>
              <CardContent>
                <a href="mailto:support@wishlist-wizard.com" className="text-pink-600 hover:text-pink-700">
                  support@wishlist-wizard.com
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <MessageSquare className="h-6 w-6 text-pink-600 mb-2" />
                <CardTitle className="text-lg">Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">
                  Response time: 24-48 hours
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <MapPin className="h-6 w-6 text-pink-600 mb-2" />
                <CardTitle className="text-lg">Community</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">
                  Join our community forum
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Send us a Message</CardTitle>
              <CardDescription>
                Fill out the form below and we'll get back to you as soon as possible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <div className="text-center py-8">
                  <div className="text-green-600 font-semibold mb-2">Thank you for your message!</div>
                  <p className="text-gray-600">
                    We've received your message and will get back to you soon.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                      </label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject
                    </label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message
                    </label>
                    <Textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Tell us what's on your mind..."
                      rows={5}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    Send Message
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">FAQ</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900">How long does it take to respond?</h3>
                <p className="text-gray-700 mt-1">
                  We typically respond to all inquiries within 24-48 hours during business days.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">What should I do if I found a bug?</h3>
                <p className="text-gray-700 mt-1">
                  Please include detailed steps to reproduce the issue when you report a bug. This helps us fix it faster.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">How can I request a feature?</h3>
                <p className="text-gray-700 mt-1">
                  We love hearing feature requests! Send them our way and we'll consider them for future releases.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
