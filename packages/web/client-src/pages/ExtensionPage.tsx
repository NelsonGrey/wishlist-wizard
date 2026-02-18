import React from 'react';
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
import { FaChrome, FaFirefox, FaEdge } from 'react-icons/fa';
import { ResponsiveAd } from '@/components/ads/AdUnit';
import { ExtensionHelp } from '@/components/help/ExtensionHelp';

const ExtensionPage = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex justify-center items-center gap-3 mb-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent">
              Wishlist Wizard Browser Extension
            </h1>
            <ExtensionHelp />
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Add products to your wishlists from any online retailer with a single click
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="flex flex-col justify-center">
            <h2 className="text-2xl font-bold mb-4">Save items from any website</h2>
            <ul className="space-y-3">
              <li className="flex items-start">
                <div className="bg-indigo-100 p-1 rounded-full mr-3 mt-1">
                  <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-gray-700">Works with <strong>any online retailer</strong> - Amazon, Target, Walmart, and thousands more</p>
              </li>
              <li className="flex items-start">
                <div className="bg-indigo-100 p-1 rounded-full mr-3 mt-1">
                  <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-gray-700">Automatically detects product information like title, price, and image</p>
              </li>
              <li className="flex items-start">
                <div className="bg-indigo-100 p-1 rounded-full mr-3 mt-1">
                  <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-gray-700">Add items to any of your personal or collaborative wishlists</p>
              </li>
              <li className="flex items-start">
                <div className="bg-indigo-100 p-1 rounded-full mr-3 mt-1">
                  <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-gray-700">Smart product detection works even on hard-to-parse pages</p>
              </li>
            </ul>
          </div>
          
          <div className="flex items-center justify-center">
            <img 
              src="/extension/screenshot.png" 
              alt="Wishlist Wizard Extension Screenshot" 
              className="rounded-lg shadow-lg w-full max-w-md"
            />
          </div>
        </div>

        <Tabs defaultValue="chrome" className="w-full mb-16">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="chrome" className="flex items-center gap-2">
              <FaChrome className="h-5 w-5" /> Chrome
            </TabsTrigger>
            <TabsTrigger value="firefox" className="flex items-center gap-2">
              <FaFirefox className="h-5 w-5" /> Firefox
            </TabsTrigger>
            <TabsTrigger value="edge" className="flex items-center gap-2">
              <FaEdge className="h-5 w-5" /> Edge
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
                    Add the Wishlist Wizard extension to Chrome with just a few clicks. The extension will help you save products to your wishlists while shopping online.
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
              <CardFooter className="flex flex-col sm:flex-row gap-4">
                <Button className="w-full sm:w-auto" size="lg" asChild>
                  <a href="https://github.com/mnelson3/wishlist-wizard/tree/develop/chrome-extension-package" target="_blank" rel="noopener noreferrer">
                    <FaChrome className="mr-2 h-5 w-5" />
                    Install for Chrome
                  </a>
                </Button>
                <Button variant="outline" className="w-full sm:w-auto" asChild>
                  <a href="https://github.com/mnelson3/wishlist-wizard/blob/develop/docs/packages/browser-extension/src/INSTALLATION-GUIDE.md" target="_blank" rel="noopener noreferrer">
                    View Installation Guide
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
                    Add the Wishlist Wizard extension to Firefox to easily save products to your wishlists while shopping online.
                  </p>
                  
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h3 className="font-bold mb-2">Installation Steps</h3>
                    <ol className="list-decimal list-inside space-y-2 text-gray-700">
                      <li>Click the &quot;Install for Firefox&quot; button below</li>
                      <li>When prompted, click &quot;Add to Firefox&quot;</li>
                      <li>The Wishlist Wizard icon will appear in your browser toolbar</li>
                      <li>Sign in to your Wishlist Wizard account when prompted</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row gap-4">
                <Button className="w-full sm:w-auto" size="lg" asChild>
                  <a href="https://github.com/mnelson3/wishlist-wizard/tree/develop/chrome-extension-package" target="_blank" rel="noopener noreferrer">
                    <FaFirefox className="mr-2 h-5 w-5" />
                    Install for Firefox
                  </a>
                </Button>
                <Button variant="outline" className="w-full sm:w-auto" asChild>
                  <a href="https://github.com/mnelson3/wishlist-wizard/blob/develop/docs/packages/browser-extension/src/INSTALLATION-GUIDE.md" target="_blank" rel="noopener noreferrer">
                    View Installation Guide
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
                    Add the Wishlist Wizard extension to Microsoft Edge to easily save products to your wishlists while shopping online.
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
              <CardFooter className="flex flex-col sm:flex-row gap-4">
                <Button className="w-full sm:w-auto" size="lg" asChild>
                  <a href="https://github.com/mnelson3/wishlist-wizard/tree/develop/chrome-extension-package" target="_blank" rel="noopener noreferrer">
                    <FaEdge className="mr-2 h-5 w-5" />
                    Install for Edge
                  </a>
                </Button>
                <Button variant="outline" className="w-full sm:w-auto" asChild>
                  <a href="https://github.com/mnelson3/wishlist-wizard/blob/develop/docs/packages/browser-extension/src/INSTALLATION-GUIDE.md" target="_blank" rel="noopener noreferrer">
                    View Installation Guide
                  </a>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mb-16">
          <ResponsiveAd />
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card>
            <CardHeader>
              <div className="bg-indigo-100 w-12 h-12 flex items-center justify-center rounded-full mb-4">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <CardTitle>Universal Support</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">Works with thousands of online retailers, not just the major ones. Our smart detection works on almost any product page.</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <div className="bg-indigo-100 w-12 h-12 flex items-center justify-center rounded-full mb-4">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <CardTitle>Privacy First</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">We only access the product information you want to save. Your browsing history and personal data stay private.</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <div className="bg-indigo-100 w-12 h-12 flex items-center justify-center rounded-full mb-4">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <CardTitle>Lightweight & Fast</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">Our extension is optimized for performance, using minimal resources while providing maximum functionality.</p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-gray-50 rounded-lg p-8 text-center mb-16">
          <h2 className="text-2xl font-bold mb-4">Ready to simplify your wishlist management?</h2>
          <p className="text-gray-600 max-w-2xl mx-auto mb-6">
            Install the Wishlist Wizard extension today and start adding items to your wishlists with just one click from any online store.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" className="py-6 px-8" asChild>
              <a href="https://github.com/mnelson3/wishlist-wizard/tree/develop/chrome-extension-package" target="_blank" rel="noopener noreferrer">
                <FaChrome className="mr-2 h-5 w-5" />
                Install Now
              </a>
            </Button>
            <Button variant="outline" size="lg" className="py-6 px-8" asChild>
              <Link href="/register">
                Create Account
              </Link>
            </Button>
          </div>
        </div>

        <div className="space-y-8">
          <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
          
          <div className="space-y-4">
            <div className="border-b pb-4">
              <h3 className="font-bold text-lg mb-2">Is the Wishlist Wizard extension free?</h3>
              <p className="text-gray-700">Yes, the Wishlist Wizard extension is completely free to use with your Wishlist Wizard account.</p>
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
              <p className="text-gray-700">Yes, you need a Wishlist Wizard account to save items using the extension. <Link href="/register" className="text-indigo-600 hover:underline">Sign up for free</Link> if you don&apos;t have an account yet.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExtensionPage;