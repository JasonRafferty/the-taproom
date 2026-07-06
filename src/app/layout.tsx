import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

export const metadata = { title: "The Taproom" };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="en">
      <body>
        {user ? (
          <div className="app">
            <Sidebar currentUser={{ displayName: user.displayName, avatarColor: user.avatarColor }} />
            <main className="content">{children}</main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
