export default function HomePage() {
  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-[80vh] p-8 text-center">
      <h1 className="text-5xl font-bold mb-4">
        Secure, Wallet-Based Authentication
      </h1>
      <p className="text-xl text-charcoal max-w-2xl">
        A decentralized identity and authentication application powered by Firebase and Polygon.
        Proceed to the Profile page to connect your wallet and authenticate.
      </p>
    </div>
  );
}