import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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

const formSchema = z.object({
  name: z.string().min(1, "Wishlist name is required").max(50, "Name cannot exceed 50 characters"),
  occasion: z.string().max(50, "Occasion cannot exceed 50 characters").optional(),
  occasionDate: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurrence: z.enum(["yearly", "monthly"]),
  reminderDays: z.coerce.number().min(0).max(90).default(7),
  description: z.string().max(200, "Description cannot exceed 200 characters").optional(),
});

export type CreateWishlistFormValues = z.infer<typeof formSchema>;

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
      occasion: "",
      occasionDate: "",
      isRecurring: false,
      recurrence: "yearly",
      reminderDays: 7,
      description: "",
    },
  });

  const onSubmit = (data: CreateWishlistFormValues) => {
    onCreateWishlist(data);
  };

  const isRecurring = form.watch("isRecurring");

  // Reset form when dialog closes
  const handleDialogChange = (open: boolean) => {
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
                    <Input placeholder="e.g., Birthday Wishlist" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-3 mt-3">
              <FormField
                control={form.control}
                name="occasion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Occasion (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Emma's Birthday" {...field} value={field.value ?? ""} />
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
                    <FormLabel>Occasion Date (optional)</FormLabel>
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
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button 
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
