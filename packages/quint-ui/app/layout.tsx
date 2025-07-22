import "@/src/globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <title>Quint UI</title>
      </head>
      <body>
        <div className="container mx-auto">{children}</div>
      </body>
    </html>
  );
}
