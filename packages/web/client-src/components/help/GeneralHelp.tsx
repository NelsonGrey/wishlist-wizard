import { HelpDialog } from "@/components/ui/help-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function GeneralHelp() {
  return (
    <HelpDialog title="Wishlist Wizard Help Center">
      <p className="text-sm text-muted-foreground mb-4">
        Welcome to Wishlist Wizard! This guide will help you navigate the platform
        and make the most of all its features.
      </p>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="getting-started">
          <AccordionTrigger>Getting Started</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              To get started with Wishlist Wizard:
            </p>
            <ol className="text-sm list-decimal pl-5 space-y-2">
              <li>
                <strong>Create an account:</strong> Sign up with your email address and create a password
              </li>
              <li>
                <strong>Set up your profile:</strong> Add preferences to get personalized recommendations
              </li>
              <li>
                <strong>Create your first wishlist:</strong> Go to "My Wishlists" and click "Create New Wishlist"
              </li>
              <li>
                <strong>Install the browser extension:</strong> For seamless adding of items from any website
              </li>
              <li>
                <strong>Explore features:</strong> Try out gift coordination, price tracking, AR visualization, and more
              </li>
            </ol>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="wishlists">
          <AccordionTrigger>Managing Wishlists</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              Wishlist Wizard lets you organize items into different wishlists:
            </p>
            <ul className="text-sm list-disc pl-5 space-y-2">
              <li>
                <strong>Create multiple wishlists:</strong> Make separate lists for different occasions or people
              </li>
              <li>
                <strong>Add items:</strong> Use the browser extension, manual entry, or import from other sites
              </li>
              <li>
                <strong>Organize lists:</strong> Categorize, prioritize, and sort items as needed
              </li>
              <li>
                <strong>Share wishlists:</strong> Generate shareable links for friends and family
              </li>
              <li>
                <strong>Collaborative lists:</strong> Allow others to add or edit items on a shared wishlist
              </li>
              <li>
                <strong>Privacy settings:</strong> Control who can see your wishlists
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="sharing">
          <AccordionTrigger>Sharing and Social Features</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              Share wishlists and collaborate with others:
            </p>
            <ul className="text-sm list-disc pl-5 space-y-2">
              <li>
                <strong>Share links:</strong> Generate unique links for each wishlist to share via email, text, or social media
              </li>
              <li>
                <strong>Privacy options:</strong> Choose what information is visible to viewers
                <ul className="list-disc pl-5 mt-1">
                  <li>Public: Anyone with the link can view</li>
                  <li>Private: Only specific people you invite can access</li>
                  <li>Limited: Only show certain information to viewers</li>
                </ul>
              </li>
              <li>
                <strong>Collaborative editing:</strong> Invite others to add or edit items
              </li>
              <li>
                <strong>Comments:</strong> Leave notes on items for collaborators to see
              </li>
              <li>
                <strong>Group gifting:</strong> Coordinate with others for shared gifts
              </li>
              <li>
                <strong>Social sharing:</strong> Post wishlists to social media platforms
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="notifications">
          <AccordionTrigger>Notifications</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              Stay updated with Wishlist Wizard's notification system:
            </p>
            <ul className="text-sm list-disc pl-5 space-y-2">
              <li>
                <strong>Types of notifications:</strong>
                <ul className="list-disc pl-5 mt-1">
                  <li>Price drops on tracked items</li>
                  <li>Upcoming occasions (birthdays, anniversaries, etc.)</li>
                  <li>Collaborative wishlist activity</li>
                  <li>Group gift contributions and updates</li>
                  <li>Comments and messages from friends</li>
                  <li>Reserved or purchased items</li>
                </ul>
              </li>
              <li>
                <strong>Notification preferences:</strong> Customize where and how you receive notifications
                <ul className="list-disc pl-5 mt-1">
                  <li>In-app notifications</li>
                  <li>Email notifications</li>
                  <li>Browser push notifications (when extension is installed)</li>
                </ul>
              </li>
              <li>
                <strong>Managing notifications:</strong> Access your notification center to view all alerts
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="account">
          <AccordionTrigger>Account Settings</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              Manage your Wishlist Wizard account settings:
            </p>
            <ul className="text-sm list-disc pl-5 space-y-2">
              <li>
                <strong>Profile information:</strong> Update personal details, photo, and preferences
              </li>
              <li>
                <strong>Privacy settings:</strong> Control who can see your wishlists and activities
              </li>
              <li>
                <strong>Connected accounts:</strong> Link social media or shopping accounts
              </li>
              <li>
                <strong>Notification preferences:</strong> Choose how you receive updates
              </li>
              <li>
                <strong>Security settings:</strong> Change password, enable two-factor authentication
              </li>
              <li>
                <strong>Data management:</strong> Export or delete your data
              </li>
            </ul>
            <p className="text-sm mt-2">
              Access account settings by clicking your profile icon in the top-right corner.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="mobile-app">
          <AccordionTrigger>Mobile App Features</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              The Wishlist Wizard mobile app offers additional features:
            </p>
            <ul className="text-sm list-disc pl-5 space-y-2">
              <li>
                <strong>Barcode scanning:</strong> Add items by scanning product barcodes in stores
              </li>
              <li>
                <strong>AR visualization:</strong> See how items will look in your space
              </li>
              <li>
                <strong>In-store alerts:</strong> Get notified when you're near a store with wishlisted items
              </li>
              <li>
                <strong>Offline access:</strong> View your wishlists even without internet connection
              </li>
              <li>
                <strong>Share directly:</strong> Send wishlists via text, messaging apps, or social media
              </li>
              <li>
                <strong>Quick capture:</strong> Take photos and add items directly to wishlists
              </li>
            </ul>
            <p className="text-sm mt-2">
              Download the mobile app from the App Store or Google Play Store.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </HelpDialog>
  );
}