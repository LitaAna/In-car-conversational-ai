import type { Metadata } from "next";
import "./globals.css";
import { LocaleProvider } from "./i18n/context";

export const metadata: Metadata = {
  title: "Conversational car assistant",
  description: "In-car conversational assistant",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ro"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
