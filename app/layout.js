import "./globals.css";

export const metadata = {
  title: "Olokoro Football League 2026",
  description: "Official live scores, fixtures, standings and top scorers for Olokoro Football League 2026.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
