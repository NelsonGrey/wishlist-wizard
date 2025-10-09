import { HelpDialog } from "@/components/ui/help-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function PriceTrackingHelp() {
  return (
    <HelpDialog title="Price Tracking Help">
      <p className="text-sm text-muted-foreground mb-4">
        Never miss a sale with Wishlist Wizard's price tracking feature.
        Here's how to make the most of this money-saving tool:
      </p>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="how-it-works">
          <AccordionTrigger>How Price Tracking Works</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              Wishlist Wizard's price tracking monitors items on your wishlist and alerts you when prices drop:
            </p>
            <ul className="text-sm list-disc pl-5 space-y-1">
              <li>We check prices regularly across supported retailers</li>
              <li>Price history is stored so you can see trends over time</li>
              <li>Price drops trigger notifications (via app and email if enabled)</li>
              <li>You can set custom price alerts for specific target prices</li>
              <li>Historical pricing helps you determine if a "sale" is actually a good deal</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="enable">
          <AccordionTrigger>Enabling Price Tracking</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              To start tracking prices for items:
            </p>
            <ol className="text-sm list-decimal pl-5 space-y-2">
              <li>
                <strong>For new items:</strong> When adding an item to your wishlist, toggle the "Track Price" option to ON
              </li>
              <li>
                <strong>For existing items:</strong> Go to any item in your wishlist and click "Enable Price Tracking"
              </li>
              <li>
                <strong>Optional:</strong> Set a target price to be notified when the price falls below that amount
              </li>
              <li>
                <strong>Optional:</strong> Set a percentage discount (e.g., 20% off) to be notified when the discount meets your threshold
              </li>
            </ol>
            <p className="text-sm mt-2">
              Price tracking works best for products from major online retailers. Availability may vary for smaller or specialty stores.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="history">
          <AccordionTrigger>Viewing Price History</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              To see how a product's price has changed over time:
            </p>
            <ol className="text-sm list-decimal pl-5 space-y-2">
              <li>
                Open any item that has price tracking enabled
              </li>
              <li>
                Look for the "Price History" section or tab
              </li>
              <li>
                View the interactive price graph showing historical price changes
              </li>
              <li>
                Hover over points on the graph to see exact prices and dates
              </li>
              <li>
                Use the time range selector to view different periods (1 month, 3 months, 6 months, 1 year)
              </li>
              <li>
                Note key statistics like highest price, lowest price, and average price
              </li>
            </ol>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="alerts">
          <AccordionTrigger>Setting Up Price Alerts</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              Customize when you receive price drop notifications:
            </p>
            <ol className="text-sm list-decimal pl-5 space-y-2">
              <li>
                Select an item with price tracking enabled
              </li>
              <li>
                Click "Manage Price Alerts"
              </li>
              <li>
                Choose from alert options:
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li><strong>Any price drop:</strong> Get notified for any reduction in price</li>
                  <li><strong>Target price:</strong> Set a specific price and get notified when it drops below that</li>
                  <li><strong>Percentage discount:</strong> Set a percentage (e.g., 15%) and get notified when the discount exceeds that</li>
                </ul>
              </li>
              <li>
                Configure notification preferences:
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>In-app notifications (always on)</li>
                  <li>Email notifications (optional)</li>
                  <li>Frequency caps to avoid notification overload</li>
                </ul>
              </li>
            </ol>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="best-time">
          <AccordionTrigger>Best Time to Buy Predictions</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              For items with sufficient price history, Wishlist Wizard can help predict the best time to purchase:
            </p>
            <ul className="text-sm list-disc pl-5 space-y-2">
              <li>
                <strong>Price trend analysis:</strong> See if prices are generally trending up or down
              </li>
              <li>
                <strong>Seasonal patterns:</strong> Identify if the item typically goes on sale during certain times of year
              </li>
              <li>
                <strong>Deal predictions:</strong> Get estimates on when the next sale might occur
              </li>
              <li>
                <strong>Historic lows:</strong> See when the item reached its lowest price in the past
              </li>
            </ul>
            <p className="text-sm mt-2">
              Remember that predictions are based on historical data and patterns, but aren't guaranteed. 
              Major sales events like Black Friday might offer unexpected discounts.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="troubleshooting">
          <AccordionTrigger>Troubleshooting Price Tracking</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              If you're experiencing issues with price tracking:
            </p>
            <ul className="text-sm list-disc pl-5 space-y-2">
              <li>
                <strong>Price not updating:</strong> Prices typically update once per day. If it's been longer, try manually refreshing the item.
              </li>
              <li>
                <strong>Wrong price showing:</strong> Retailers sometimes show different prices based on location or sales. Verify the current price on the retailer's site.
              </li>
              <li>
                <strong>Missing notifications:</strong> Check your notification settings and ensure you haven't muted price alerts.
              </li>
              <li>
                <strong>Price history not showing:</strong> New items need time to build price history. Check back after a few days.
              </li>
              <li>
                <strong>Unsupported retailer:</strong> Not all online stores are supported. Major retailers work best.
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </HelpDialog>
  );
}