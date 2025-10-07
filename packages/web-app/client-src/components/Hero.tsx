import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <section className="bg-gradient-to-r from-indigo-700 to-purple-700 text-white py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <h1 className="text-4xl font-bold mb-4">Save Anything From Anywhere</h1>
            <p className="text-xl mb-8">Create wishlists from your favorite shopping sites with just one click. WishKeeper makes tracking, organizing, and sharing your shopping lists effortless.</p>
            <div className="space-x-4">
              <a 
                href="https://chrome.google.com/webstore/detail/wishkeeper/placeholder"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-indigo-700 px-6 py-3 rounded-md font-medium hover:bg-gray-100 transition shadow-md inline-block"
              >
                Download Extension
              </a>
              <Link href="/dashboard">
                <a className="bg-indigo-800 text-white px-6 py-3 rounded-md font-medium hover:bg-indigo-900 transition border border-indigo-600 inline-block">
                  Try It Now
                </a>
              </Link>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="bg-white rounded-lg shadow-xl overflow-hidden border border-gray-300 max-w-md w-full">
              <div className="bg-primary text-white p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">WishKeeper</h2>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
              <div className="p-4 border-b">
                <div className="flex justify-between mb-4">
                  <div>
                    <h3 className="font-medium text-gray-900">Birthday Wishlist</h3>
                    <p className="text-sm text-gray-500">5 items</p>
                  </div>
                </div>
                <div className="flex space-x-3 mb-3">
                  <img src="https://m.media-amazon.com/images/I/71o8Q5XJS5L._AC_SL1500_.jpg" alt="Sony Headphones" className="w-16 h-16 object-cover rounded-md" />
                  <div className="flex-1">
                    <h4 className="font-medium text-sm line-clamp-2">Sony WH-1000XM4 Wireless Noise-Cancelling Headphones</h4>
                    <p className="text-sm text-gray-600 mt-1">$298.00</p>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <img src="https://m.media-amazon.com/images/I/71tVNhmDDWL._AC_SL1500_.jpg" alt="Espresso Machine" className="w-16 h-16 object-cover rounded-md" />
                  <div className="flex-1">
                    <h4 className="font-medium text-sm line-clamp-2">Breville Barista Express Espresso Machine</h4>
                    <p className="text-sm text-gray-600 mt-1">$699.95</p>
                  </div>
                </div>
              </div>
              <div className="p-3 text-center">
                <span className="text-primary text-sm font-medium">View More Items</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
