import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { HelpCircle } from "lucide-react";
import { ReactNode } from "react";

interface HelpDialogProps {
  title: string;
  children: ReactNode;
  triggerClassName?: string;
}

export function HelpDialog({ title, children, triggerClassName }: HelpDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={`rounded-full ${triggerClassName}`}
          aria-label="Open help information"
        >
          <HelpCircle className="h-5 w-5 text-muted-foreground hover:text-primary" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Find help and instructions on how to use this feature.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {children}
        </div>
        <DialogFooter>
          <Button type="button">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}