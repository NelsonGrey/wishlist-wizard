import { useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WishlistItem as DbWishlistItem } from "@wishlist-wizard/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type WishlistItem = DbWishlistItem;

interface WishlistItemProps {
  item: WishlistItem;
  onDelete: () => void;
}

export default function WishlistItem({ item, onDelete }: WishlistItemProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    onDelete();
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex space-x-4">
            <img 
              src={item.imageUrl} 
              alt={item.title}
              className="w-16 h-16 object-cover rounded-md"
            />
            <div className="flex-1">
              <div className="flex justify-between">
                <h3 className="font-medium line-clamp-2">{item.title}</h3>
                <div className="flex space-x-2 ml-2">
                  <a
                    href={item.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-primary"
                  >
                    <ExternalLink className="h-5 w-5" />
                  </a>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleDelete}
                    className="text-gray-500 hover:text-red-500"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center mt-1">
                <span className="text-sm font-semibold text-gray-900">{item.price}</span>
                <span className="text-xs text-gray-500 ml-1">{item.store}</span>
              </div>
              {item.note && (
                <p className="text-sm text-gray-500 mt-2">{item.note}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this item from your wishlist? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
