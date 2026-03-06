import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Link } from "wouter";
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
import { apiRequest } from "@/lib/queryClient";

const formSchema = z.object({
  name: z.string().trim().min(1, "Wishlist name is required").max(50, "Name cannot exceed 50 characters"),
  recipientType: z.enum(["self", "person", "group"]).default("self"),
  recipientInputMode: z.enum(["manual", "source"]).default("manual"),
  externalContactId: z.string().trim().optional(),
  recipientName: z.string().trim().max(80, "Recipient name cannot exceed 80 characters").optional(),
  recipientMembers: z.string().trim().max(300, "Recipient members cannot exceed 300 characters").optional(),
  occasion: z.string().max(50, "Event cannot exceed 50 characters").optional(),
  occasionDate: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurrence: z.enum(["yearly", "monthly"]),
  reminderDays: z.coerce.number().min(0).max(90).default(7),
  description: z.string().max(200, "Description cannot exceed 200 characters").optional(),
}).superRefine((values, context) => {
  if (values.recipientType === "person" && values.recipientInputMode === "source" && !values.externalContactId?.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["externalContactId"],
      message: "Select a contact from source providers",
    });
  }

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
      onCreateWishlist({
        ...data,
        recipientName: match?.name || data.recipientName || "Recipient",
      });
      return;
    }

    onCreateWishlist(data);
  };

  const isRecurring = form.watch("isRecurring");
  const recipientType = form.watch("recipientType");
  const recipientInputMode = form.watch("recipientInputMode");
  const selectedExternalContactId = form.watch("externalContactId");

  const shouldLoadExternalContacts = open && recipientType === "person" && recipientInputMode === "source";
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

              {recipientType === "person" && (
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

              {recipientType === "person" && recipientInputMode === "source" && (
                <>
                  <div className="rounded-md border p-3 space-y-2 text-xs text-muted-foreground">
                    <p className="text-xs text-muted-foreground">
                      Contacts are read live from your connected providers and are not stored when using this picker.
                    </p>
                    <p>
                      Configure provider connections and Apple contact setup in Profile Settings.
                    </p>
                    <Link href="/app/user-profile" className="inline-flex text-emerald-800 underline underline-offset-2">
                      Open Profile Settings
                    </Link>
                  </div>

                  <div className="space-y-2">
                    {providerStatuses.length > 0 && (
                      <div className="rounded-md border p-2 text-xs space-y-1">
                        {providerStatuses.map((status) => (
                          <div key={status.provider}>
                            <span className="font-medium">{formatProviderName(status.provider)}:</span>{" "}
                            {status.connected ? "connected" : status.supported ? "not connected" : "capability available"}
                            {status.message ? ` - ${status.message}` : ""}
                          </div>
                        ))}
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="externalContactId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select contact</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a contact from source providers" />
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
                        <div><span className="font-medium">Primary source:</span> {formatProviderName(selectedExternalContact.primarySource)}</div>
                        <div><span className="font-medium">All sources:</span> {selectedExternalContact.sources.map((source) => formatProviderName(source.provider)).join(", ")}</div>
                        <div><span className="font-medium">Quality:</span> {formatQualityLabel(selectedExternalContact.quality.level)} ({selectedExternalContact.quality.score})</div>
                        {selectedExternalContact.email && <div><span className="font-medium">Email:</span> {selectedExternalContact.email}</div>}
                        {selectedExternalContact.phone && <div><span className="font-medium">Phone:</span> {selectedExternalContact.phone}</div>}
                      </div>
                    )}
                  </div>
                </>
              )}

              {recipientType !== "self" && recipientInputMode === "manual" && (
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
                    <FormLabel>Event (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Emma's Birthday Party" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
            </div>
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
