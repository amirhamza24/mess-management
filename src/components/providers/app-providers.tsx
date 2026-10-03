"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "next-themes"
import { useState } from "react"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { Lang } from "@/i18n"
import { I18nProvider } from "./i18n-provider"

export function AppProviders({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: (count, error) => {
              const code = (error as { code?: string })?.code
              // Don't retry permission / validation errors
              if (code && /^(42|23|P0|PGRST)/.test(code)) return false
              return count < 2
            },
          },
        },
      })
  )

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={queryClient}>
        <I18nProvider initialLang={lang}>
          <TooltipProvider>
            {children}
            <Toaster position="top-right" richColors closeButton offset={{ top: 68 }} mobileOffset={{ top: 64 }} />
          </TooltipProvider>
        </I18nProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
