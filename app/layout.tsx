import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spims",
  description: "Student Information & Learning Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
