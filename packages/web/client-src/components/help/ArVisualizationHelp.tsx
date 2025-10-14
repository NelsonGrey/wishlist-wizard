import { HelpDialog } from "@/components/ui/help-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function ArVisualizationHelp() {
  return (
    <HelpDialog title="AR Visualization Help">
      <p className="text-sm text-muted-foreground mb-4">
        See how items will look in your space before you buy them with our AR visualization feature.
        Here's how to use this innovative tool:
      </p>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="what-is">
          <AccordionTrigger>What is AR Visualization?</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              Augmented Reality (AR) visualization lets you see digital representations of products in your real environment:
            </p>
            <ul className="text-sm list-disc pl-5 space-y-1">
              <li>View furniture, decor, and other items in your actual space</li>
              <li>Compare the size of products against real-world objects</li>
              <li>Visualize how items will fit and look before purchasing</li>
              <li>Share AR views with friends and family to get their opinions</li>
            </ul>
            <p className="text-sm mt-2">
              This technology helps eliminate the guesswork of online shopping and reduces returns
              due to items not meeting your expectations.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="requirements">
          <AccordionTrigger>Device Requirements</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              To use the AR visualization feature, you'll need:
            </p>
            <ul className="text-sm list-disc pl-5 space-y-2">
              <li>
                <strong>Mobile device:</strong> AR features work on supported smartphones and tablets
                <ul className="list-disc pl-5 mt-1">
                  <li>iOS: iPhone 6s or newer, running iOS 12 or higher</li>
                  <li>Android: Device with ARCore support, running Android 8.0 or higher</li>
                </ul>
              </li>
              <li>
                <strong>Camera access:</strong> You'll need to allow camera permissions
              </li>
              <li>
                <strong>Adequate lighting:</strong> Well-lit environment for better AR tracking
              </li>
              <li>
                <strong>Sufficient space:</strong> Open area to properly visualize larger items
              </li>
              <li>
                <strong>Latest Wishlist Wizard app:</strong> Make sure you're using the most updated version
              </li>
            </ul>
            <p className="text-sm mt-2">
              Desktop browsers don't support AR visualization, but you can view 3D models on desktops without the AR component.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="using">
          <AccordionTrigger>Using the AR Feature</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              To visualize a product in AR:
            </p>
            <ol className="text-sm list-decimal pl-5 space-y-2">
              <li>
                Find an AR-compatible item in your wishlist (look for the AR icon)
              </li>
              <li>
                Tap the "View in AR" button on the product details page
              </li>
              <li>
                Allow camera access if prompted
              </li>
              <li>
                Follow the on-screen instructions to scan your surroundings
              </li>
              <li>
                Once the surface is detected, tap to place the item
              </li>
              <li>
                Use pinch gestures to resize the item if needed
              </li>
              <li>
                Rotate the item by using a two-finger twist gesture
              </li>
              <li>
                Move the item by touching and dragging
              </li>
              <li>
                Take a screenshot or record a video to save or share
              </li>
            </ol>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="modes">
          <AccordionTrigger>AR Visualization Modes</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              Wishlist Wizard offers three AR visualization modes:
            </p>
            <ul className="text-sm list-disc pl-5 space-y-2">
              <li>
                <strong>Room View:</strong> See how items fit in your actual space
                <ul className="list-disc pl-5 mt-1">
                  <li>Place furniture and decor items in your room</li>
                  <li>Move around to view the item from different angles</li>
                  <li>Great for visualizing how furniture will work in your layout</li>
                </ul>
              </li>
              <li>
                <strong>Size Compare:</strong> Compare item dimensions with real objects
                <ul className="list-disc pl-5 mt-1">
                  <li>Visualize the product next to common objects for size reference</li>
                  <li>See actual measurements displayed in your preferred units</li>
                  <li>Perfect for understanding the true size of items</li>
                </ul>
              </li>
              <li>
                <strong>Space Fit:</strong> Check if an item will fit in a specific space
                <ul className="list-disc pl-5 mt-1">
                  <li>Measure a space in your home using AR tools</li>
                  <li>Place the item in that exact space to verify fit</li>
                  <li>Ideal for tight spaces or precise fit requirements</li>
                </ul>
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="tips">
          <AccordionTrigger>Tips for Better AR Experience</AccordionTrigger>
          <AccordionContent>
            <ul className="text-sm list-disc pl-5 space-y-2">
              <li>
                <strong>Good lighting:</strong> Use AR in well-lit environments for better tracking
              </li>
              <li>
                <strong>Clean surfaces:</strong> Clear clutter from the area where you're placing virtual items
              </li>
              <li>
                <strong>Stable position:</strong> Hold your device steady while scanning and placing items
              </li>
              <li>
                <strong>Distinctive features:</strong> Rooms with textured surfaces and visible edges work better than plain white walls
              </li>
              <li>
                <strong>Move slowly:</strong> When scanning, pan your camera slowly to allow proper environment mapping
              </li>
              <li>
                <strong>Battery life:</strong> AR features use significant battery power, so ensure your device is charged
              </li>
              <li>
                <strong>Multiple views:</strong> Walk around the virtual item to see it from different angles
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="troubleshooting">
          <AccordionTrigger>Troubleshooting AR Issues</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              If you encounter problems with the AR visualization:
            </p>
            <ul className="text-sm list-disc pl-5 space-y-2">
              <li>
                <strong>AR not working:</strong> Check if your device supports AR and that you've granted camera permissions
              </li>
              <li>
                <strong>Surface detection issues:</strong> Try moving to a better-lit area with more textured surfaces
              </li>
              <li>
                <strong>Item appears too large/small:</strong> Use pinch gestures to resize the object to proper scale
              </li>
              <li>
                <strong>AR object floating/sinking:</strong> Ensure you have a flat, well-detected surface
              </li>
              <li>
                <strong>App crashes:</strong> Close other apps to free up memory, or restart your device
              </li>
              <li>
                <strong>Poor AR tracking:</strong> Clean your camera lens and ensure adequate lighting
              </li>
              <li>
                <strong>Item not available in AR:</strong> Not all items have AR models; look for the AR icon
              </li>
            </ul>
            <p className="text-sm mt-2">
              Remember that AR technology is continually improving. Each app update may bring better performance and new features.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </HelpDialog>
  );
}