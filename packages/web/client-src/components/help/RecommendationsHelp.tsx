import { HelpDialog } from "@/components/ui/help-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function RecommendationsHelp() {
  return (
    <HelpDialog title="Personalized Recommendations Help">
      <p className="text-sm text-muted-foreground mb-4">
        Get personalized gift suggestions based on your wishlist activity and preferences.
        Here&apos;s everything you need to know:
      </p>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="what-is">
          <AccordionTrigger>How Do Recommendations Work?</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              Our recommendation engine analyzes several factors to suggest gifts you might like:
            </p>
            <ul className="text-sm list-disc pl-5 space-y-1">
              <li>Your past wishlist items</li>
              <li>Items you&apos;ve browsed</li>
              <li>Preferences you&apos;ve set in your profile</li>
              <li>Trending products in your favorite categories</li>
              <li>Similar items to what you already like</li>
            </ul>
            <p className="text-sm mt-2">
              The more you use Wishlist Wizard, the better your recommendations will become!
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="improve">
          <AccordionTrigger>How to Improve Your Recommendations</AccordionTrigger>
          <AccordionContent>
            <ol className="text-sm list-decimal pl-5 space-y-2">
              <li>
                <strong>Complete your preferences:</strong> Go to your profile settings and fill out your interests, favorite colors, sizes, and brands.
              </li>
              <li>
                <strong>Add more items to wishlists:</strong> The more items you add, the better we understand your tastes.
              </li>
              <li>
                <strong>Provide feedback:</strong> Rate recommendations with thumbs up/down to help refine your suggestions.
              </li>
              <li>
                <strong>Browse related items:</strong> When viewing a product, check out similar items and categories.
              </li>
              <li>
                <strong>Use the extension:</strong> Browse products on shopping sites with our extension installed to improve recommendations.
              </li>
            </ol>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="categories">
          <AccordionTrigger>Recommendation Categories</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              We provide different types of recommendations:
            </p>
            <ul className="text-sm list-disc pl-5 space-y-1">
              <li><strong>For You:</strong> Personalized based on your activity and preferences</li>
              <li><strong>Similar Items:</strong> Products like ones you&apos;ve shown interest in</li>
              <li><strong>Trending Now:</strong> Popular items in your favorite categories</li>
              <li><strong>Price Drops:</strong> Items you might like that have recently gone on sale</li>
              <li><strong>Event-Based:</strong> Tailored for birthdays, holidays, and other events</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="events">
          <AccordionTrigger>Event-Based Recommendations</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              We can suggest gifts for upcoming events:
            </p>
            <ol className="text-sm list-decimal pl-5 space-y-2">
              <li>
                <strong>Add events to your calendar:</strong> In your profile, add important dates like birthdays, anniversaries, etc.
              </li>
              <li>
                <strong>Specify the recipient:</strong> Connect events to people in your contacts.
              </li>
              <li>
                <strong>Set your budget:</strong> Indicate how much you&apos;re planning to spend.
              </li>
              <li>
                <strong>Check recommendations:</strong> As events approach, we&apos;ll suggest appropriate gifts.
              </li>
            </ol>
            <p className="text-sm mt-2">
              You&apos;ll receive reminders before important dates with gift suggestions.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="privacy">
          <AccordionTrigger>Privacy and Your Recommendations</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              We take your privacy seriously when generating recommendations:
            </p>
            <ul className="text-sm list-disc pl-5 space-y-1">
              <li>Your data is used only to improve your personal recommendations</li>
              <li>You can turn off recommendation tracking in privacy settings</li>
              <li>You can delete your recommendation history at any time</li>
              <li>We never share your browsing or wishlist data with third parties</li>
            </ul>
            <p className="text-sm mt-2">
              Control your recommendation settings in the &quot;Privacy&quot; section of your profile.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </HelpDialog>
  );
}