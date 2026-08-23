import './globals.css';

export const metadata = {
  title: 'Squad Room - FPL Tactical Hub',
  description: 'AI Transfer Desk & Matchday Hub',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-[#fbf9f5] text-stone-900 antialiased">
        {children}
      </body>
    </html>
  );
}
