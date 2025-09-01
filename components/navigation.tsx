"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Database, LogOut, TestTube } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Separator } from "./ui/separator";

const navigation = [
  {
    name: "Upload",
    href: "/",
    icon: Upload,
    description: "Upload nameplate images",
  },
  {
    name: "Extractions",
    href: "/extractions",
    icon: Database,
    description: "View AI extractions",
  },

  {
    name: "Test Zone",
    href: "/test-zone",
    icon: TestTube,
    description: "Run batch tests",
  },
];

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <Card className="w-64 h-full bg-sidebar border-sidebar-border">
      <div className="flex flex-col h-full p-6">
        <div className="mb-4 px-4 py-2 rounded-xl bg-blue-500">
          <Image
            src="/revalue-logo.png"
            alt="Nameplate Extraction"
            width={100}
            height={100}
          />
        </div>

        <Separator className="my-4" />

        <nav className="flex-1 space-y-2 gap-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 mt-1.5 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <div>
                    <div>{item.name}</div>
                    <div className="text-xs opacity-75">{item.description}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-4 border-t border-sidebar-border">
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-start text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </Card>
  );
}
