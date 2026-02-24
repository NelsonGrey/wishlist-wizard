import { HelpDialog } from "@/components/ui/help-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function ExtensionHelp() {
  return (
    <HelpDialog title="Browser Extension Help">
      <p className="text-sm text-muted-foreground mb-4">
        The Wishlist Wizard browser extension makes it easy to add items to your wishlists while shopping online.
        Here&apos;s how to get the most out of this powerful tool:
      </p>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="one-click-add">
          <AccordionTrigger>One-Click Add to Wishlist</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              Quickly add items to your wishlists with a single click:
            </p>
            <ol className="text-sm list-decimal pl-5 space-y-2">
              <li>
                When viewing a product on any shopping website, click the Wishlist Wizard icon in your browser toolbar
              </li>
              <li>
                The extension will automatically detect the product information (title, price, image)
              </li>
              <li>
                Select which wishlist you want to add the item to
              </li>
              <li>
                Add optional notes or customize the product information if needed
              </li>
              <li>
                Click &quot;Add to Wishlist&quot; to save the item
              </li>
            </ol>
            <p className="text-sm mt-2">
              The extension works on thousands of online retailers including Amazon, Target, Walmart, 
              Best Buy, Etsy, and many more.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="price-comparison">
          <AccordionTrigger>Price Comparison Feature</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              Find the best deals across different retailers:
            </p>
            <ol className="text-sm list-decimal pl-5 space-y-2">
              <li>
                When viewing a product, click the Wishlist Wizard icon and select the &quot;Compare Prices&quot; tab
              </li>
              <li>
                The extension will search for the same or similar products across other major retailers
              </li>
              <li>
                View a list of prices from different stores
              </li>
              <li>
                Click on any result to open that product page
              </li>
              <li>
                Use the &quot;Add to Wishlist&quot; button to save the item from any of the comparison results
              </li>
            </ol>
            <p className="text-sm mt-2">
              Price comparison helps you find the best deals before making a purchase, potentially saving 
              you money on items you want.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="coupon-finder">
          <AccordionTrigger>Coupon Finder Feature</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              Discover valid coupon codes for additional savings:
            </p>
            <ol className="text-sm list-decimal pl-5 space-y-2">
              <li>
                While on a retailer&apos;s website, click the Wishlist Wizard icon
              </li>
              <li>
                Select the &quot;Find Coupons&quot; tab
              </li>
              <li>
                The extension will search for valid coupon codes for that specific retailer
              </li>
              <li>
                See coupon details including the discount amount and any restrictions
              </li>
              <li>
                Click &quot;Copy Code&quot; to copy a coupon code to your clipboard
              </li>
              <li>
                Paste the code during checkout to apply the discount
              </li>
            </ol>
            <p className="text-sm mt-2">
              The coupon finder regularly updates its database to ensure you have access to the 
              most current discount codes available.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="installation">
          <AccordionTrigger>Installation Guide</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              How to install the Wishlist Wizard extension:
            </p>
            
            <h4 className="text-sm font-medium mt-3 mb-1">For Chrome/Chromium Browsers:</h4>
            <ol className="text-sm list-decimal pl-5 space-y-1">
              <li>Click the &quot;Install for Chrome&quot; button on the extension page</li>
              <li>In the Chrome Web Store, click &quot;Add to Chrome&quot;</li>
              <li>When prompted, confirm by clicking &quot;Add extension&quot;</li>
              <li>Once installed, the Wishlist Wizard icon will appear in your browser toolbar</li>
              <li>Click the icon and log in to your Wishlist Wizard account</li>
            </ol>

            <h4 className="text-sm font-medium mt-3 mb-1">For Firefox:</h4>
            <ol className="text-sm list-decimal pl-5 space-y-1">
              <li>Click the &quot;Install for Firefox&quot; button on the extension page</li>
              <li>In the Firefox Add-ons page, click &quot;Add to Firefox&quot;</li>
              <li>When prompted, click &quot;Add&quot;</li>
              <li>The Wishlist Wizard icon will appear in your browser toolbar</li>
              <li>Click the icon and log in to your Wishlist Wizard account</li>
            </ol>

            <h4 className="text-sm font-medium mt-3 mb-1">For Microsoft Edge:</h4>
            <ol className="text-sm list-decimal pl-5 space-y-1">
              <li>Click the &quot;Install for Edge&quot; button on the extension page</li>
              <li>In the Edge Add-ons page, click &quot;Get&quot;</li>
              <li>When prompted, click &quot;Add extension&quot;</li>
              <li>The Wishlist Wizard icon will appear in your browser toolbar</li>
              <li>Click the icon and log in to your Wishlist Wizard account</li>
            </ol>

            <h4 className="text-sm font-medium mt-3 mb-1">For Safari:</h4>
            <ol className="text-sm list-decimal pl-5 space-y-1">
              <li>Click the &quot;Install for Safari&quot; button on the extension page</li>
              <li>Install the Wishlist Wizard app from the App Store</li>
              <li>Open Safari settings and enable the Wishlist Wizard extension</li>
              <li>The Wishlist Wizard icon will appear in your Safari toolbar</li>
              <li>Click the icon and log in to your Wishlist Wizard account</li>
            </ol>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="troubleshooting">
          <AccordionTrigger>Troubleshooting</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              Solutions for common extension issues:
            </p>
            
            <h4 className="text-sm font-medium mt-3 mb-1">Product Information Not Detected:</h4>
            <ul className="text-sm list-disc pl-5 space-y-1">
              <li>Refresh the page and try again</li>
              <li>Make sure you&apos;re on a product page, not a category or search results page</li>
              <li>Some websites with unusual layouts may require manual input</li>
              <li>Use the manual input option to enter product details</li>
            </ul>

            <h4 className="text-sm font-medium mt-3 mb-1">Extension Not Working:</h4>
            <ul className="text-sm list-disc pl-5 space-y-1">
              <li>Check that the extension is enabled in your browser settings</li>
              <li>Log out and log back into your Wishlist Wizard account</li>
              <li>Try reinstalling the extension</li>
              <li>Make sure your browser is updated to the latest version</li>
            </ul>

            <h4 className="text-sm font-medium mt-3 mb-1">Price Comparison Not Working:</h4>
            <ul className="text-sm list-disc pl-5 space-y-1">
              <li>Some unique or specialized products may not have matches on other sites</li>
              <li>Try using more generic product terms for better matching</li>
              <li>Wait a few moments for the search to complete</li>
            </ul>

            <h4 className="text-sm font-medium mt-3 mb-1">No Coupon Codes Found:</h4>
            <ul className="text-sm list-disc pl-5 space-y-1">
              <li>Not all retailers have active coupon codes at all times</li>
              <li>Try again later as coupon availability changes frequently</li>
              <li>Some retailer websites may block coupon code detection</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="privacy">
          <AccordionTrigger>Privacy & Data Collection</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              The Wishlist Wizard extension respects your privacy:
            </p>
            <ul className="text-sm list-disc pl-5 space-y-2">
              <li>
                <strong>What we collect:</strong> The extension only collects product information (title, price, image, URL) from pages where you explicitly choose to save an item
              </li>
              <li>
                <strong>What we don&apos;t collect:</strong> We do not track your browsing history, collect personal information, or monitor your behavior on non-product pages
              </li>
              <li>
                <strong>Permissions:</strong> The extension requests permissions to read content on retail sites to identify product information when you click the extension button
              </li>
              <li>
                <strong>Data storage:</strong> All wishlist data is stored securely on Wishlist Wizard servers and is protected by your account credentials
              </li>
              <li>
                <strong>Third parties:</strong> For price comparison and coupon features, we may send anonymized product identifiers to our price comparison service
              </li>
            </ul>
            <p className="text-sm mt-2">
              You can view our complete privacy policy on the Wishlist Wizard website.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </HelpDialog>
  );
}