"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Upload, Database, CheckCircle, BarChart3, LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

const navigation = [
  {
    name: "Upload",
    href: "/",
    icon: Upload,
    description: "Upload nameplate images",
  },
  {
    name: "Predictions",
    href: "/predictions",
    icon: Database,
    description: "View AI predictions",
  },
  {
    name: "Verification",
    href: "/verification",
    icon: CheckCircle,
    description: "Verify and correct results",
  },
  {
    name: "Batch Evaluation",
    href: "/evaluation",
    icon: BarChart3,
    description: "Run batch evaluations",
  },
]

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  return (
    <Card className="w-64 h-full bg-sidebar border-sidebar-border">
      <div className="flex flex-col h-full p-6">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-sidebar-foreground">Nameplate Extraction</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-powered data extraction</p>
        </div>

        <nav className="flex-1 space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <div>
                    <div>{item.name}</div>
                    <div className="text-xs opacity-75">{item.description}</div>
                  </div>
                </div>
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto pt-4 border-t border-sidebar-border">
          <Button variant="ghost" onClick={handleSignOut} className="w-full justify-start text-sidebar-foreground">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </Card>
  )
}
