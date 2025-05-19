import { Plus, Archive, Share2 } from "lucide-react";

export default function Features() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">How WishKeeper Works</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">Save items from your favorite stores and organize them into custom wishlists. Share with friends and family with a single click.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="bg-indigo-100 text-primary w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Plus className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Add Items Easily</h3>
            <p className="text-gray-600">Browse your favorite stores and add items to your wishlists with a single click using our Chrome extension.</p>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="bg-indigo-100 text-primary w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Archive className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Organize Wishlists</h3>
            <p className="text-gray-600">Create and manage multiple lists for different occasions, interests, or shopping goals.</p>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="bg-indigo-100 text-primary w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Share2 className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Share with Anyone</h3>
            <p className="text-gray-600">Share your wishlists with friends and family through a simple link. Perfect for birthdays, holidays, and gift ideas.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
