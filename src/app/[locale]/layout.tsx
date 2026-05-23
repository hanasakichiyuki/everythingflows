import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { MainLayout } from "@/components/layout/MainLayout";
import { getSearchIndex } from "@/lib/api/posts";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;

  if (locale !== "zh") {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const searchItems = await getSearchIndex(locale);

  return (
    <NextIntlClientProvider messages={messages}>
      <ThemeProvider>
        <MainLayout searchItems={searchItems}>{children}</MainLayout>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
