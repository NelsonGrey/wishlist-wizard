import { Button, ButtonProps } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { ReactNode } from "react";

interface AnalyticsButtonProps extends ButtonProps {
  category: string;
  action: string;
  label?: string;
  value?: number;
  children: ReactNode;
}

/**
 * Button component that automatically tracks click events in Google Analytics
 * 
 * This component wraps the regular Button component and adds analytics tracking functionality
 * Use this for important buttons that you want to track user interactions with
 * 
 * @example
 * <AnalyticsButton 
 *   category="wishlist" 
 *   action="create" 
 *   label="homepage"
 *   variant="default"
 * >
 *   Create Wishlist
 * </AnalyticsButton>
 */
export function AnalyticsButton({
  category,
  action,
  label,
  value,
  onClick,
  children,
  ...props
}: AnalyticsButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Track the event in Google Analytics
    trackEvent(action, category, label, value);
    
    // Call the original onClick handler if it exists
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <Button onClick={handleClick} {...props}>
      {children}
    </Button>
  );
}