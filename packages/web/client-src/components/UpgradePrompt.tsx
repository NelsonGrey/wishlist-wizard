import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

interface UpgradePromptProps {
  title: string;
  description: string;
  className?: string;
  secondaryCta?: { label: string; href: string };
}

export default function UpgradePrompt({ title, description, className, secondaryCta }: UpgradePromptProps) {
  return (
    <div className={className ?? "site-container py-16"}>
      <Card className="mx-auto max-w-xl text-center">
        <CardHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
            <Lock className="h-6 w-6" aria-hidden="true" />
          </div>
          <CardTitle className="mt-4">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{description}</p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/subscriptions">Compare plans</Link>
            </Button>
            {secondaryCta && (
              <Button variant="outline" asChild>
                <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
