import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PaisaMatters — Split Expenses Effortlessly",
  description:
    "PaisaMatters makes splitting travel expenses with friends simple, fair, and stress-free. Track group spending, settle debts instantly, and focus on the adventure.",
  keywords: [
    "split expenses",
    "travel expense tracker",
    "group spending",
    "trip money manager",
    "PaisaMatters",
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="dark antialiased">
      <body className="min-h-screen bg-[#0b1212] text-[#f0eee6] overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
