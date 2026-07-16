import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { apiRequest } from "@/lib/queryClient";

const formSchema = z.object({
  name: z.string().trim().min(1, "Wishlist name is required").max(50, "Name cannot exceed 50 characters"),
  recipientType: z.enum(["self", "person", "group"]).default("self"),
  recipientInputMode: z.enum(["manual", "source"]).default("manual"),
  externalContactId: z.string().trim().optional(),
  recipientName: z.string().trim().max(80, "Recipient name cannot exceed 80 characters").optional(),
  recipientMembers: z.string().trim().max(300, "Recipient members cannot exceed 300 characters").optional(),
  occasion: z.string().max(50, "Event cannot exceed 50 characters").optional(),
  isPublic: z.boolean().default(false),
  occasionDate: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurrence: z.enum(["yearly", "monthly"]),
  reminderDays: z.coerce.number().min(0).max(90).default(7),
  description: z.string().max(200, "Description cannot exceed 200 characters").optional(),
}).superRefine((values, context) => {
  if (
    (values.recipientType === "person" || values.recipientType === "group")
    && values.recipientInputMode === "manual"
    && !values.recipientName?.trim()
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["recipientName"],
      message: "Recipient name is required",
    });
  }
});

export type CreateWishlistFormValues = z.infer<typeof formSchema>;

type ContactQualityLevel = "high" | "medium" | "low";

type ExternalContact = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  primarySource: "google" | "outlook" | "apple";
  sources: Array<{
    provider: "google" | "outlook" | "apple";
    sourceContactId: string;
  }>;
  duplicateSourceCount: number;
  quality: {
    score: number;
    level: ContactQualityLevel;
    factors: string[];
  };
};

type ExternalProviderStatus = {
  provider: "google" | "outlook" | "apple" | "facebook";
  connected: boolean;
  supported: boolean;
  message?: string;
};

type ExternalContactsResponse = {
  contacts: ExternalContact[];
  providerStatuses: ExternalProviderStatus[];
};

interface CreateWishlistDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateWishlist: (data: CreateWishlistFormValues) => void;
  isPending: boolean;
}

export default function CreateWishlistDialog({
  open,
  onClose,
  onCreateWishlist,
  isPending
}: CreateWishlistDialogProps) {
  const form = useForm<CreateWishlistFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      recipientType: "self",
      recipientInputMode: "manual",
      externalContactId: "",
      recipientName: "",
      recipientMembers: "",
      occasion: "",
      isPublic: false,
      occasionDate: "",
      isRecurring: false,
      recurrence: "yearly",
      reminderDays: 7,
      description: "",
    },
  });

  const onSubmit = (data: CreateWishlistFormValues) => {
    if (data.recipientType === "person" && data.recipientInputMode === "source") {
      const match = externalContacts.find((contact) => contact.id === data.externalContactId);
      if (!match) {
        form.setError("externalContactId", {
          type: "manual",
          message: "Select a connected source contact or switch to manual entry",
        });
        return;
      }

      onCreateWishlist({
        ...data,
        recipientName: match.name || data.recipientName || "Recipient",
      });
      return;
    }

    onCreateWishlist(data);
  };

  const isRecurring = form.watch("isRecurring");
  const recipientType = form.watch("recipientType");
  const recipientInputMode = form.watch("recipientInputMode");
  const selectedExternalContactId = form.watch("externalContactId");

  // Load provider connection status as soon as "Specific person" is selected — before the
  // user picks manual vs. source — so the source-picker option can be hidden entirely when
  // no provider is connected, instead of showing it and then dead-ending.
  const shouldLoadExternalContacts = open && recipientType === "person";
  const { data: externalContactsResponse, isFetching: isLoadingExternalContacts } = useQuery<ExternalContactsResponse>({
    queryKey: ["/api/contacts/external"],
    enabled: shouldLoadExternalContacts,
    queryFn: () => apiRequest("/api/contacts/external", {
      method: "POST",
      body: {
        providers: ["google", "outlook", "apple", "facebook"],
        limit: 200,
      },
    }) as Promise<ExternalContactsResponse>,
    staleTime: 60_000,
  });

  const externalContacts = externalContactsResponse?.contacts || [];
  const providerStatuses = externalContactsResponse?.providerStatuses || [];
  const connectedSourceProviders = providerStatuses.filter((status) => status.connected && status.supported);
  const hasConnectedSourceProvider = connectedSourceProviders.length > 0;
  const selectedExternalContact = externalContacts.find((contact) => contact.id === selectedExternalContactId);

  const formatProviderName = (provider: string): string => {
    if (provider === "google") return "Google";
    if (provider === "outlook") return "Outlook";
    if (provider === "apple") return "Apple";
    if (provider === "facebook") return "Facebook";
    return provider;
  };

  const formatQualityLabel = (level: ContactQualityLevel): string => {
    if (level === "high") return "High";
    if (level === "medium") return "Medium";
    return "Low";
  };

  // Reset form when dialog closes
  const handleDialogChange = (open: boolean) => {
    if (!open && isPending) {
      return;
    }

    if (!open) {
      form.reset();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Wishlist</DialogTitle>
          <DialogDescription>
            Give your wishlist a name to help you organize your items.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wishlist Name</FormLabel>
                  <FormControl>
                    <Input data-testid="create-wishlist-name-input" placeholder="e.g., Birthday Wishlist" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-3 mt-3">
              <FormField
                control={form.control}
                name="recipientType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipient</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select recipient type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="self">Myself</SelectItem>
                        <SelectItem value="person">Specific person</SelectItem>
                        <SelectItem value="group">Group / couple / household</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {recipientType === "person" && hasConnectedSourceProvider && (
                <FormField
                  control={form.control}
                  name="recipientInputMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recipient source</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue("externalContactId", "");
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose input mode" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="manual">Enter manually</SelectItem>
                          <SelectItem value="source">Select from connected sources</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {recipientType === "person" && recipientInputMode === "source" && hasConnectedSourceProvider && (
                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="externalContactId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select contact</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={externalContacts.length === 0}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={isLoadingExternalContacts ? "Loading contacts..." : "Select a contact"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {externalContacts.map((contact) => {
                              const sources = contact.sources.map((source) => formatProviderName(source.provider)).join(", ");
                              return (
                                <SelectItem key={contact.id} value={contact.id}>
                                  {`${contact.name} • ${sources} • ${formatQualityLabel(contact.quality.level)} quality (${contact.quality.score})`}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedExternalContact && (
                    <div className="rounded-md border p-2 text-xs space-y-1">
                      <div><span className="font-medium">Source:</span> {selectedExternalContact.sources.map((source) => formatProviderName(source.provider)).join(", ")}</div>
                      {selectedExternalContact.email && <div><span className="font-medium">Email:</span> {selectedExternalContact.email}</div>}
                      {selectedExternalContact.phone && <div><span className="font-medium">Phone:</span> {selectedExternalContact.phone}</div>}
                    </div>
                  )}
                </div>
              )}

              {recipientType !== "self" && (recipientInputMode === "manual" || !hasConnectedSourceProvider) && (
                <FormField
                  control={form.control}
                  name="recipientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{recipientType === "group" ? "Group name" : "Recipient name"}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={recipientType === "group" ? "e.g., Mr. and Mrs. Thomas Kincaid" : "e.g., Emma Kincaid"}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {recipientType === "group" && (
                <FormField
                  control={form.control}
                  name="recipientMembers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group members (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Thomas Kincaid, Mary Kincaid"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="occasion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Occasion (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Birthday, Wedding, Just Because" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visibility</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "shared")}
                      value={field.value ? "shared" : "private"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="private">Private — only you can view</SelectItem>
                        <SelectItem value="shared">Shared — anyone with the link can view</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Collapsible className="mt-4">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground [&[data-state=open]>svg]:rotate-180"
                >
                  <span>Advanced options</span>
                  <ChevronDown className="h-4 w-4 transition-transform" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-3">
                <FormField
                  control={form.control}
                  name="occasionDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Date (optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Notes for this event wishlist" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isRecurring"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-md border p-3">
                      <FormLabel className="text-sm">Recurring event wishlist</FormLabel>
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(!!checked)} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {isRecurring && (
                  <>
                    <FormField
                      control={form.control}
                      name="recurrence"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recurrence</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select recurrence" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="yearly">Yearly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="reminderDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reminder lead time (days)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              max={90}
                              {...field}
                              value={Number.isFinite(field.value) ? field.value : 7}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </CollapsibleContent>
            </Collapsible>

            <DialogFooter className="mt-4">
              <Button 
                data-testid="create-wishlist-cancel"
                type="button" 
                variant="outline" 
                onClick={() => handleDialogChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button 
                data-testid="create-wishlist-submit"
                type="submit" 
                disabled={isPending}
              >
                {isPending ? "Creating..." : "Create Wishlist"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
