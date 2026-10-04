import type { Metadata, Viewport } from "next"
import { Inter, Noto_Sans_Bengali } from "next/font/google"
import { cookies } from "next/headers"
import { AppProviders } from "@/components/providers/app-providers"
import { DEFAULT_LANG, isLang, LANG_COOKIE } from "@/i18n"
import "./globals.css"

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" })
const bengali = Noto_Sans_Bengali({
  variable: "--font-bengali",
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "MessHisab — Smart Mess Management & Monthly Hisab",
    template: "%s · MessHisab",
  },
  description: "Manage meals, bazar, house rent, payments, expenses, and monthly mess Hisab in one place.",
  applicationName: "MessHisab",
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#13121a" },
  ],
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieLang = (await cookies()).get(LANG_COOKIE)?.value
  const lang = isLang(cookieLang) ? cookieLang : DEFAULT_LANG

  return (
    <html lang={lang} suppressHydrationWarning className={`${inter.variable} ${bengali.variable} h-full antialiased`}>
      <body className="min-h-full">
        <AppProviders lang={lang}>{children}</AppProviders>
      </body>
    </html>
  )
}
