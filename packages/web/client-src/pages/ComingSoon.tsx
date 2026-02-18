import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Mail, MessageSquare, Sparkles, ShoppingCart, Share2, Bell, TrendingUp, Users, Zap, Loader2 } from "lucide-react";

const ComingSoon = () => {
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState<"suggestion" | "bug" | "general">("general");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isFeedbackSubmitted, setIsFeedbackSubmitted] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubscribing(true);
    setError(null);

    try {
      const response = await fetch('/api/coming-soon/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSubscribed(true);
        setEmail("");
      } else {
        setError(data.message || 'Failed to subscribe. Please try again.');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;

    setIsSubmittingFeedback(true);
    setError(null);

    try {
      const response = await fetch('/api/coming-soon/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedback: feedback.trim(),
          feature: feedbackType
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsFeedbackSubmitted(true);
        setFeedback("");
      } else {
        setError(data.message || 'Failed to submit feedback. Please try again.');
      }
    } catch (error) {
      console.error('Feedback submission error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const features = [
    {
      icon: <ShoppingCart className="h-6 w-6" />,
      title: "One-Click Wishlist Creation",
      description: "Save items from any shopping site with a single click using our browser extension."
    },
    {
      icon: <Share2 className="h-6 w-6" />,
      title: "Social Sharing",
      description: "Share your wishlists with friends and family, and let them contribute to group gifts."
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Price Tracking",
      description: "Get notified when prices drop on items in your wishlist."
    },
    {
      icon: <Bell className="h-6 w-6" />,
      title: "Smart Notifications",
      description: "Receive personalized alerts about sales, restocks, and wishlist updates."
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Group Gift Coordination",
      description: "Coordinate group gifts and avoid duplicates with shared wishlists."
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "AI-Powered Recommendations",
      description: "Discover new items you'll love based on your shopping preferences."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">Wishlist Wizard</span>
              <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="mb-8">
            <Sparkles className="h-16 w-16 text-blue-600 mx-auto mb-6" />
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Something Amazing is
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600"> Coming Soon</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              We&apos;re building the ultimate wishlist management platform that makes shopping,
              sharing, and gifting more delightful than ever before.
            </p>
          </div>

          {/* Launch Signup */}
          <Card className="max-w-md mx-auto mb-12">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                <Bell className="h-5 w-5" />
                Get Notified at Launch
              </CardTitle>
              <CardDescription>
                Be the first to know when Wishlist Wizard launches!
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isSubscribed ? (
                <form onSubmit={handleSubscribe} className="space-y-4">
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isSubscribing}
                  />
                  {error && (
                    <p className="text-sm text-red-600">{error}</p>
                  )}
                  <Button type="submit" className="w-full" disabled={isSubscribing}>
                    {isSubscribing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Subscribing...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Notify Me at Launch
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                <div className="text-center py-4">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p className="text-green-700 font-medium">You&apos;re on the list!</p>
                  <p className="text-sm text-gray-600">We&apos;ll notify you when we launch.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Features Coming to Wishlist Wizard
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We&apos;re building powerful features to revolutionize how you create, manage, and share wishlists.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Feedback Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Help Shape the Future
            </h2>
            <p className="text-xl text-gray-600">
              Your feedback is invaluable! Tell us what features you&apos;d love to see or any issues you&apos;ve encountered.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Feedback Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Share Your Thoughts
                </CardTitle>
                <CardDescription>
                  Suggestions, bug reports, or general feedback welcome!
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!isFeedbackSubmitted ? (
                  <form onSubmit={handleFeedback} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Feedback Type</label>
                      <div className="flex gap-2">
                        {[
                          { value: "suggestion", label: "Suggestion" },
                          { value: "bug", label: "Bug Report" },
                          { value: "general", label: "General" }
                        ].map((type) => (
                          <Button
                            key={type.value}
                            type="button"
                            variant={feedbackType === type.value ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFeedbackType(type.value as "suggestion" | "bug" | "general")}
                            disabled={isSubmittingFeedback}
                          >
                            {type.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <Textarea
                      placeholder="Tell us what's on your mind..."
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      rows={4}
                      required
                      disabled={isSubmittingFeedback}
                    />
                    {error && (
                      <p className="text-sm text-red-600">{error}</p>
                    )}
                    <Button type="submit" className="w-full" disabled={isSubmittingFeedback}>
                      {isSubmittingFeedback ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Submit Feedback
                        </>
                      )}
                    </Button>
                  </form>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <p className="text-green-700 font-medium">Thank you for your feedback!</p>
                    <p className="text-sm text-gray-600">We appreciate your input.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* What's Next */}
            <Card>
              <CardHeader>
                <CardTitle>What&apos;s Next?</CardTitle>
                <CardDescription>
                  Our development roadmap and upcoming milestones
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Browser Extension</p>
                    <p className="text-sm text-gray-600">One-click saving from any website</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Web Dashboard</p>
                    <p className="text-sm text-gray-600">Full wishlist management interface</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="h-5 w-5 rounded-full bg-blue-500 mt-0.5"></div>
                  <div>
                    <p className="font-medium">Mobile App</p>
                    <p className="text-sm text-gray-600">Native iOS and Android apps</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="h-5 w-5 rounded-full bg-gray-300 mt-0.5"></div>
                  <div>
                    <p className="font-medium">AI Recommendations</p>
                    <p className="text-sm text-gray-600">Smart product suggestions</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="h-5 w-5 rounded-full bg-gray-300 mt-0.5"></div>
                  <div>
                    <p className="font-medium">Price Tracking</p>
                    <p className="text-sm text-gray-600">Automatic price drop alerts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ComingSoon;