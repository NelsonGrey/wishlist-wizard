import { Link } from "wouter";

export default function Hero() {
  return (
    <section className="py-10 md:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto bg-emerald-900 text-white rounded-2xl px-8 sm:px-12 py-10 md:py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-5 leading-tight">
              Save Anything
              <span className="block text-emerald-300">From Anywhere</span>
            </h1>
            <p className="text-lg md:text-xl mb-7 text-emerald-100 leading-relaxed">
              Create wishlists from your favorite shopping sites with just one click.{" "}
              <span className="font-semibold text-white">Wishlist Wizard</span> makes
              tracking, organizing, and sharing your shopping lists effortless.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/extension"
                className="bg-white text-emerald-900 px-8 py-4 rounded-xl font-semibold hover:bg-emerald-50 transition-all shadow-xl hover:shadow-2xl hover:scale-105 inline-block"
              >
                Download Extension
              </Link>
              <Link
                href="/app/dashboard"
                className="bg-emerald-700 text-white px-8 py-4 rounded-xl font-semibold hover:bg-emerald-600 transition-all border-2 border-emerald-600 hover:border-emerald-500 inline-block"
              >
                Try It Now
              </Link>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-emerald-200 max-w-md w-full transform hover:scale-105 transition-transform">
              <div className="bg-emerald-900 text-white p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Wishlist Wizard</h2>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
              <div className="p-5 border-b">
                <div className="flex justify-between mb-5">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">Birthday Wishlist</h3>
                    <p className="text-sm text-emerald-700 font-medium">5 items</p>
                  </div>
                </div>
                <div className="flex space-x-3 mb-3">
                  <div className="w-16 h-16 bg-emerald-100 rounded-md flex items-center justify-center">
                    <svg className="w-8 h-8 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm line-clamp-2">Sony WH-1000XM4 Wireless Noise-Cancelling Headphones</h4>
                    <p className="text-sm text-gray-600 mt-1">$298.00</p>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <div className="w-16 h-16 bg-emerald-100 rounded-md flex items-center justify-center">
                    <svg className="w-8 h-8 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm line-clamp-2">Breville Barista Express Espresso Machine</h4>
                    <p className="text-sm text-gray-600 mt-1">$699.95</p>
                  </div>
                </div>
              </div>
              <div className="p-4 text-center bg-emerald-50">
                <span className="text-emerald-700 text-sm font-semibold">View More Items →</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
