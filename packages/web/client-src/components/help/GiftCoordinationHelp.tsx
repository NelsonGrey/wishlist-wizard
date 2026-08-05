import { HelpDialog } from "@/components/ui/help-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function GiftCoordinationHelp() {
  return (
    <HelpDialog title="Group Gift Coordination Help">
      <p className="text-sm text-muted-foreground mb-4">
        Group Gift Coordination helps you organize purchases with friends and family.
        Here&apos;s how to make the most of this feature:
      </p>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="what-is">
          <AccordionTrigger>What is Gift Coordination?</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              Gift Coordination makes it easy to organize group gifts when multiple people
              want to contribute to a single, larger item on someone&apos;s wishlist.
            </p>
            <p className="text-sm">
              Instead of risking duplicate gifts or awkward money conversations, our system
              lets everyone contribute what they&apos;re comfortable with and tracks progress
              toward the gift&apos;s total price.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="how-to-create">
          <AccordionTrigger>How to Start a Group Gift</AccordionTrigger>
          <AccordionContent>
            <ol className="text-sm list-decimal pl-5 space-y-2">
              <li>
                Find the item you want to purchase as a group on a wishlist
              </li>
              <li>
                Click the &quot;Start Group Gift&quot; button
              </li>
              <li>
                Set a target amount (usually the item&apos;s price)
              </li>
              <li>
                Add a personal message (optional)
              </li>
              <li>
                Share the group gift link with friends and family
              </li>
            </ol>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="how-to-contribute">
          <AccordionTrigger>How to Contribute to a Group Gift</AccordionTrigger>
          <AccordionContent>
            <ol className="text-sm list-decimal pl-5 space-y-2">
              <li>
                Click the group gift link shared with you, or find the gift on the wishlist
              </li>
              <li>
                Click &quot;Contribute to This Gift&quot;
              </li>
              <li>
                Enter your contribution amount
              </li>
              <li>
                Add an optional message
              </li>
              <li>
                Select whether you want your contribution to be anonymous
              </li>
              <li>
                Complete the contribution process
              </li>
            </ol>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="tracking">
          <AccordionTrigger>Tracking Gift Progress</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              Everyone who contributes to a group gift can see:
            </p>
            <ul className="text-sm list-disc pl-5 space-y-1">
              <li>Total amount contributed so far</li>
              <li>Percentage complete toward the goal</li>
              <li>List of other contributors (unless they chose to be anonymous)</li>
              <li>Any messages left by contributors</li>
            </ul>
            <p className="text-sm mt-2">
              You&apos;ll receive notifications when others contribute or when the gift goal is reached.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="purchasing">
          <AccordionTrigger>Purchasing the Gift</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm mb-2">
              When a group gift is fully funded:
            </p>
            <ol className="text-sm list-decimal pl-5 space-y-2">
              <li>
                All contributors receive a notification
              </li>
              <li>
                The gift organizer (whoever started the group gift) can mark the gift as &quot;Ready to Purchase&quot;
              </li>
              <li>
                The organizer coordinates the actual purchase
              </li>
              <li>
                After purchasing, the organizer marks the gift as &quot;Purchased&quot; and can add purchase details
              </li>
              <li>
                All contributors are notified that the gift has been purchased
              </li>
            </ol>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="canceling">
          <AccordionTrigger>Canceling a Group Gift</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm">
              If a group gift needs to be canceled for any reason, the gift organizer can do so from the
              group gift page. This will notify all contributors. In a real application, this would trigger
              refunds of all contributions.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </HelpDialog>
  );
}