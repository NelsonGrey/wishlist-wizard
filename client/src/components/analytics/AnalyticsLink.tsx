import { Link } from "wouter";
import { trackEvent } from "@/lib/analytics";
import { ReactNode } from "react";

interface AnalyticsLinkProps {
  category: string;
  action: string;
  label?: string;
  value?: number;
  href: string;
  className?: string;
  children: ReactNode;
}

/**
 * Link component that automatically tracks click events in Google Analytics
 * 
 * Use this component for important navigation links that you want to track
 * 
 * @example
 * <AnalyticsLink 
 *   category="navigation" 
 *   action="click" 
 *   label="featured_products"
 *   href="/products/featured"
 * >
 *   View Featured Products
 * </AnalyticsLink>
 */
export function AnalyticsLink({
  category,
  action,
  label,
  value,
  href,
  className,
  children,
}: AnalyticsLinkProps) {
  const handleClick = () => {
    // Track the event in Google Analytics
    trackEvent(action, category, label, value);
  };

  return (
    <Link to={href} onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}