import { HelpDialog } from "@/components/ui/help-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function ExtensionHelp() {
  return (
    <HelpDialog title="Browser Extension Help">
      <p className="text-sm text-muted-foreground mb-4">
        The WishKeeper Chrome Extension enhances your online shopping experience.
        Learn how to get the most out of it:
      </p>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="install">
          <AccordionTrigger>Installing the Extension</AccordionTrigger>
          <AccordionContent>
            <ol className="text-sm list-decimal pl-5 space-y-2">
              <li>
                Click the "Install Extension" button on the Extension page
              </li>
              <li>
                Confirm the installation in Chrome when prompted
              </li>
              <li>
                The WishKeeper icon will appear in your browser toolbar
              </li>
              <li>
                Click the icon to access extension features on any shopping page
              </li>
              <li>
                You'll need to log in with your WishKeeper account to use the extension
              </li>
            </ol>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="one-click">
          <AccordionTrigger>One-Click Add to Wishlist</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              Easily add products to your wishlists while browsing online:
            </p>
            <ol className="text-sm list-decimal pl-5 space-y-2">
              <li>
                Browse to any product page on a supported shopping website
              </li>
              <li>
                Click the WishKeeper extension icon in your toolbar
              </li>
              <li>
                Select the "Add to Wishlist" tab
              </li>
              <li>
                Choose which wishlist to add the item to
              </li>
              <li>
                The product details (title, price, image) will be automatically detected
              </li>
              <li>
                Add an optional note if desired
              </li>
              <li>
                Click "Add to Wishlist" to complete the process
              </li>
            </ol>
            <p className="text-sm mt-2">
              The extension works on most major shopping sites. If product detection doesn't work
              correctly, you can manually adjust the information before saving.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="price-compare">
          <AccordionTrigger>Price Comparison Feature</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              Find the best deals with our price comparison tool:
            </p>
            <ol className="text-sm list-decimal pl-5 space-y-2">
              <li>
                Browse to a product page
              </li>
              <li>
                Click the WishKeeper extension icon
              </li>
              <li>
                Select the "Compare Prices" tab
              </li>
              <li>
                The extension will search for the same or similar products across multiple retailers
              </li>
              <li>
                View a list of alternative options sorted by price
              </li>
              <li>
                Click any option to open that retailer in a new tab
              </li>
              <li>
                Save any of the alternatives directly to your wishlist
              </li>
            </ol>
            <p className="text-sm mt-2">
              Price comparison works best for products with clear identifiers like model numbers, ISBNs, 
              or UPCs. For more generic items, you may need to refine the results.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="coupons">
          <AccordionTrigger>Coupon Finder</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              Never miss a discount with automatic coupon detection:
            </p>
            <ol className="text-sm list-decimal pl-5 space-y-2">
              <li>
                Browse to any shopping website
              </li>
              <li>
                Click the WishKeeper extension icon
              </li>
              <li>
                Select the "Find Coupons" tab
              </li>
              <li>
                The extension will search for available promo codes and discounts
              </li>
              <li>
                Click "Copy" next to any coupon to copy the code to your clipboard
              </li>
              <li>
                During checkout, paste the coupon code in the appropriate field
              </li>
              <li>
                Try multiple codes if needed—some may be expired or have restrictions
              </li>
            </ol>
            <p className="text-sm mt-2">
              Coupon availability varies by retailer and region. For some sites, you may also see 
              cashback offers or loyalty program information.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="notifications">
          <AccordionTrigger>Price Drop Alerts</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              Get notified when items on your wishlist drop in price:
            </p>
            <ol className="text-sm list-decimal pl-5 space-y-2">
              <li>
                Add items to your wishlist using the extension
              </li>
              <li>
                Enable price tracking by toggling the "Track Price" option when adding an item
              </li>
              <li>
                Set a target price or percentage discount (optional)
              </li>
              <li>
                The extension will periodically check prices in the background
              </li>
              <li>
                Receive notifications when prices drop below your target or any significant discount
              </li>
              <li>
                View price history graphs for any tracked item in your wishlist
              </li>
            </ol>
            <p className="text-sm mt-2">
              Price tracking works even when your browser is closed. You'll receive notifications
              through the WishKeeper website and email (if enabled in settings).
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="troubleshooting">
          <AccordionTrigger>Troubleshooting</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              If you encounter issues with the extension:
            </p>
            <ul className="text-sm list-disc pl-5 space-y-2">
              <li>
                <strong>Extension not detecting products correctly:</strong> Try refreshing the page or manually entering details.
              </li>
              <li>
                <strong>Not signed in:</strong> Click "Sign In" in the extension popup and login with your WishKeeper account.
              </li>
              <li>
                <strong>Extension not appearing:</strong> Right-click the extensions icon in Chrome and pin WishKeeper.
              </li>
              <li>
                <strong>Slow performance:</strong> Disable other extensions temporarily to check for conflicts.
              </li>
              <li>
                <strong>Extension crashes:</strong> Try uninstalling and reinstalling the extension.
              </li>
              <li>
                <strong>Price tracking not working:</strong> Ensure you have background processes enabled in your browser settings.
              </li>
            </ul>
            <p className="text-sm mt-2">
              For continued issues, contact support through the main WishKeeper website.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </HelpDialog>
  );
}