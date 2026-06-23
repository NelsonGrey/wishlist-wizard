import { HelpDialog } from "@/components/ui/help-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function RecommendationsHelp() {
  return (
    <HelpDialog title="Recommendations Help">
      <p className="text-sm text-muted-foreground mb-4">
        The Recommendations feature is currently in early access. Here&apos;s what&apos;s available today.
      </p>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="what-is">
          <AccordionTrigger>What are Recommendations?</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              Recommendations are curated gift ideas that appear on this page. They can be saved to any of your wishlists with one click.
            </p>
            <p className="text-sm text-muted-foreground">
              A personalized recommendation engine — one that suggests products based on your wishlist history and preferences — is planned for a future release.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="add-to-wishlist">
          <AccordionTrigger>How do I save a recommendation?</AccordionTrigger>
          <AccordionContent>
            <ol className="text-sm list-decimal pl-5 space-y-2">
              <li>Browse the recommendations shown on this page.</li>
              <li>Click the wishlist selector on a recommendation card to choose which list to add it to.</li>
              <li>Click <strong>Add to Wishlist</strong> — the item is saved instantly.</li>
            </ol>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="filter">
          <AccordionTrigger>Can I filter recommendations by recipient?</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm">
              Yes — use the <strong>Recommendation focus</strong> dropdown at the top of the page to filter by a specific recipient. Selecting &quot;All wishlists&quot; shows everything available.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="privacy">
          <AccordionTrigger>Privacy</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm">
              Your wishlist data is not shared with third parties. Recommendations shown today are not generated from your personal browsing or purchase history.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </HelpDialog>
  );
}
