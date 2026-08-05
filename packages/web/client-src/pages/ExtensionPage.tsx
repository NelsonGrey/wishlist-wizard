import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// Using alternative icons from the React Icons library
import { FaChrome, FaFirefox, FaEdge, FaSafari } from 'react-icons/fa';
import { ExtensionHelp } from '@/components/help/ExtensionHelp';

const ExtensionPage = () => {
  return (
    <>
      <Helmet>
        <title>Browser Extension | Wishlist Wizard</title>
        <meta name="description" content="Save products from online retailers into Wishlist Wizard in one click. Available for Chrome, Firefox, Edge, and Safari." />
        <meta property="og:title" content="Wishlist Wizard Browser Extension" />
        <meta property="og:description" content="Save products from online retailers into Wishlist Wizard in one click. Available for Chrome, Firefox, Edge, and Safari." />
        <meta property="og:url" content="https://wishlist-wizard.com/extension" />
        <meta name="twitter:title" content="Wishlist Wizard Browser Extension" />
        <meta name="twitter:description" content="Save products from online retailers into Wishlist Wizard in one click. Available for Chrome, Firefox, Edge, and Safari." />
      </Helmet>
    <div className="container mx-auto px-4 py-6 2xl:py-8 max-w-7xl">
      <div>
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-emerald-900 mb-2">
            Save gift ideas from any store
          </h1>
          <div className="flex items-center gap-2 mb-4">
            <p className="text-xl text-gray-600">
              Capture product details while you shop, then send them to the right wishlist before the idea gets lost.
            </p>
            <ExtensionHelp />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="flex flex-col justify-center">
            <h2 className="text-2xl font-bold mb-4">Built for the moment you find the right gift</h2>
            <ul className="space-y-3">
              <li className="flex items-start">
                <div className="bg-emerald-100 p-1 rounded-full mr-3 mt-1">
                  <svg className="w-4 h-4 text-emerald-800" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-gray-700">Works with major online retailers including Amazon, Target, Walmart, Etsy, and more</p>
              </li>
              <li className="flex items-start">
                <div className="bg-emerald-100 p-1 rounded-full mr-3 mt-1">
                  <svg className="w-4 h-4 text-emerald-800" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-gray-700">Detects product details such as title, price, image, and product URL</p>
              </li>
              <li className="flex items-start">
                <div className="bg-emerald-100 p-1 rounded-full mr-3 mt-1">
                  <svg className="w-4 h-4 text-emerald-800" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-gray-700">Adds items to personal, family, event, or creator wishlists</p>
              </li>
              <li className="flex items-start">
                <div className="bg-emerald-100 p-1 rounded-full mr-3 mt-1">
                  <svg className="w-4 h-4 text-emerald-800" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-gray-700">Keeps shopping separate from planning: you choose exactly what to save</p>
              </li>
            </ul>
          </div>
          
          <div className="flex items-center justify-center">
            {/* Browser chrome mockup — replace outer div contents with a real screenshot once available */}
            <div className="w-full max-w-sm rounded-xl shadow-xl overflow-hidden border border-gray-200">
              {/* Browser toolbar */}
              <div className="bg-gray-100 px-4 py-2 flex items-center gap-2 border-b border-gray-200">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-gray-400 border border-gray-200 truncate">
                  amazon.com/product/…
                </div>
                {/* Extension icon in toolbar */}
                <div className="w-6 h-6 rounded bg-emerald-700 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" aria-hidden="true">
                    <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/>
                  </svg>
                </div>
              </div>
              {/* Extension popup */}
              <div className="bg-white p-5">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" aria-hidden="true">
                      <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/>
                    </svg>
                  </div>
                  <span className="font-semibold text-gray-800 text-sm">Wishlist Wizard</span>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 mb-3 flex gap-3">
                  <div className="w-14 h-14 bg-gray-200 rounded-md flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="h-3 bg-gray-300 rounded mb-1.5 w-full" />
                    <div className="h-3 bg-gray-200 rounded mb-2 w-2/3" />
                    <div className="h-4 bg-emerald-100 rounded w-1/3 flex items-center justify-center">
                      <span className="text-[10px] font-semibold text-emerald-700">$49.99</span>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mb-2">Save to wishlist:</div>
                <div className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-400 mb-3">My Wishlist ▾</div>
                <div className="bg-emerald-700 text-white text-xs font-semibold text-center py-2.5 rounded-lg">
                  Add to Wishlist
                </div>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="chrome" className="w-full mb-16">
          <TabsList className="grid w-full grid-cols-4 mb-8 bg-gray-100">
            <TabsTrigger value="chrome" className="flex items-center gap-2 data-[state=active]:bg-emerald-700 data-[state=active]:text-white">
              <FaChrome className="h-5 w-5" /> Chrome
            </TabsTrigger>
            <TabsTrigger value="firefox" className="flex items-center gap-2 data-[state=active]:bg-emerald-700 data-[state=active]:text-white">
              <FaFirefox className="h-5 w-5" /> Firefox
            </TabsTrigger>
            <TabsTrigger value="edge" className="flex items-center gap-2 data-[state=active]:bg-emerald-700 data-[state=active]:text-white">
              <FaEdge className="h-5 w-5" /> Edge
            </TabsTrigger>
            <TabsTrigger value="safari" className="flex items-center gap-2 data-[state=active]:bg-emerald-700 data-[state=active]:text-white">
              <FaSafari className="h-5 w-5" /> Safari
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="chrome" className="w-full">
            <Card>
              <CardHeader>
                <CardTitle>Install for Chrome</CardTitle>
                <CardDescription>
                  Google Chrome and other Chromium-based browsers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    Add the Wishlist Wizard extension to Chrome, then save gift ideas directly from product pages while you shop.
                  </p>
                  
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h3 className="font-bold mb-2">Installation Steps</h3>
                    <ol className="list-decimal list-inside space-y-2 text-gray-700">
                      <li>Click the &quot;Install for Chrome&quot; button below</li>
                      <li>When prompted, click &quot;Add to Chrome&quot;</li>
                      <li>The Wishlist Wizard icon will appear in your browser toolbar</li>
                      <li>Sign in to your Wishlist Wizard account when prompted</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full sm:w-auto bg-emerald-800 text-white hover:bg-emerald-900" size="lg" asChild>
                  <a href="https://chromewebstore.google.com/" target="_blank" rel="noopener noreferrer">
                    <FaChrome className="mr-2 h-5 w-5" />
                    Install for Chrome
                  </a>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="firefox" className="w-full">
            <Card>
              <CardHeader>
                <CardTitle>Install for Firefox</CardTitle>
                <CardDescription>
                  Mozilla Firefox browser
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    Install Wishlist Wizard for Firefox to capture gift ideas from product pages and keep your wishlists current.
                  </p>
                  
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-md">
                    <p className="text-sm text-emerald-900">
                      <strong>📦 Status:</strong> Available on Mozilla Add-ons Store
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h3 className="font-bold mb-2">Installation Steps</h3>
                    <ol className="list-decimal list-inside space-y-2 text-gray-700">
                      <li>Click the &quot;Install for Firefox&quot; button below</li>
                      <li>You'll be taken to the Mozilla Add-ons store page</li>
                      <li>Click &quot;Add to Firefox&quot;</li>
                      <li>When prompted, click &quot;Add&quot; to confirm</li>
                      <li>The Wishlist Wizard icon will appear in your browser toolbar</li>
                      <li>Sign in to your Wishlist Wizard account when prompted</li>
                    </ol>
                  </div>
                  
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-md">
                    <p className="text-sm text-emerald-900">
                      <strong>💡 Tip:</strong> Make sure you&apos;re running Firefox 90 or later for best compatibility.
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full sm:w-auto bg-emerald-800 text-white hover:bg-emerald-900" size="lg" asChild>
                  <a href="https://addons.mozilla.org/en-US/firefox/addon/wishlist-wizard/" target="_blank" rel="noopener noreferrer">
                    <FaFirefox className="mr-2 h-5 w-5" />
                    Install from Mozilla Add-ons
                  </a>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="edge" className="w-full">
            <Card>
              <CardHeader>
                <CardTitle>Install for Edge</CardTitle>
                <CardDescription>
                  Microsoft Edge browser
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    Add Wishlist Wizard to Microsoft Edge to save product ideas into the right wishlist as soon as you find them.
                  </p>
                  
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h3 className="font-bold mb-2">Installation Steps</h3>
                    <ol className="list-decimal list-inside space-y-2 text-gray-700">
                      <li>Click the &quot;Install for Edge&quot; button below</li>
                      <li>When prompted, click &quot;Add to Edge&quot;</li>
                      <li>The Wishlist Wizard icon will appear in your browser toolbar</li>
                      <li>Sign in to your Wishlist Wizard account when prompted</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full sm:w-auto bg-emerald-800 text-white hover:bg-emerald-900" size="lg" asChild>
                  <a href="https://microsoftedge.microsoft.com/addons/" target="_blank" rel="noopener noreferrer">
                    <FaEdge className="mr-2 h-5 w-5" />
                    Install for Edge
                  </a>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="safari" className="w-full">
            <Card>
              <CardHeader>
                <CardTitle>Install for Safari</CardTitle>
                <CardDescription>
                  Apple Safari on macOS and iOS
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    Safari support is available through the Wishlist Wizard app bundle and can be enabled from Safari extension settings.
                  </p>

                  <div className="bg-gray-50 p-4 rounded-md">
                    <h3 className="font-bold mb-2">Installation Steps</h3>
                    <ol className="list-decimal list-inside space-y-2 text-gray-700">
                      <li>Open the App Store and install Wishlist Wizard</li>
                      <li>Open Safari Settings and go to Extensions</li>
                      <li>Enable the Wishlist Wizard Safari extension</li>
                      <li>Sign in to your Wishlist Wizard account when prompted</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full sm:w-auto bg-emerald-800 text-white hover:bg-emerald-900" size="lg" asChild>
                  <a href="https://apps.apple.com/" target="_blank" rel="noopener noreferrer">
                    <FaSafari className="mr-2 h-5 w-5" />
                    Install for Safari
                  </a>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card>
            <CardHeader>
              <div className="bg-emerald-100 w-12 h-12 flex items-center justify-center rounded-full mb-4">
                <svg className="w-6 h-6 text-emerald-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <CardTitle>Universal Support</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">Save ideas from major retailers and many specialty stores without being locked into one shopping ecosystem.</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <div className="bg-emerald-100 w-12 h-12 flex items-center justify-center rounded-full mb-4">
                <svg className="w-6 h-6 text-emerald-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <CardTitle>Privacy First</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">We only use product information from pages where you choose to save an item. Your browsing history stays private.</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <div className="bg-emerald-100 w-12 h-12 flex items-center justify-center rounded-full mb-4">
                <svg className="w-6 h-6 text-emerald-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <CardTitle>Lightweight & Fast</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">The extension stays lightweight so saving an item does not interrupt the shopping experience.</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
          
          <div className="space-y-4">
            <div className="border-b pb-4">
              <h3 className="font-bold text-lg mb-2">Is the Wishlist Wizard extension free?</h3>
              <p className="text-gray-700">Yes. The extension is free to use with a Wishlist Wizard account.</p>
            </div>
            
            <div className="border-b pb-4">
              <h3 className="font-bold text-lg mb-2">Does the extension work on all websites?</h3>
              <p className="text-gray-700">The Wishlist Wizard extension is designed to work on most online retail websites. Our smart detection algorithm can identify product information on thousands of different stores.</p>
            </div>
            
            <div className="border-b pb-4">
              <h3 className="font-bold text-lg mb-2">What information does the extension collect?</h3>
              <p className="text-gray-700">The extension only collects product information (title, price, image, URL) from pages where you explicitly choose to save an item. We do not track your browsing history or collect any personal information.</p>
            </div>
            
            <div className="border-b pb-4">
              <h3 className="font-bold text-lg mb-2">How do I uninstall the extension?</h3>
              <p className="text-gray-700">To uninstall, right-click on the Wishlist Wizard icon in your browser toolbar and select &quot;Remove from Chrome&quot; (or your browser of choice). Alternatively, you can manage extensions in your browser settings.</p>
            </div>
            
            <div className="border-b pb-4">
              <h3 className="font-bold text-lg mb-2">Do I need a Wishlist Wizard account to use the extension?</h3>
              <p className="text-gray-700">Yes, you need a Wishlist Wizard account to save items using the extension. <Link href="/register" className="text-emerald-700 hover:text-emerald-800 hover:underline font-medium">Sign up for free</Link> if you don&apos;t have an account yet.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default ExtensionPage;
