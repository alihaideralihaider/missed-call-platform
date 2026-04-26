export const metadata = {
  title: "Privacy Policy | SaanaOS – Restaurant Missed Call & SMS Ordering",
  description:
    "SaanaOS Privacy Policy explaining how we collect and use data for restaurant missed call recovery and SMS ordering systems.",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10 text-sm leading-6">
      <h1 className="text-3xl font-bold mb-4">Privacy Policy – SaanaOS</h1>

      <p className="mb-4">Last updated: April 2026</p>

      <p className="mb-4">
        SaanaOS is a restaurant technology platform that enables missed call
        recovery and SMS-based ordering. This Privacy Policy explains how we
        collect, use, and protect your information when you interact with
        restaurants using our system.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        Information We Collect
      </h2>
      <ul className="list-disc ml-6">
        <li>Customer phone numbers</li>
        <li>Call activity (missed, answered, busy)</li>
        <li>Order details when placing an order</li>
        <li>SMS delivery and interaction data</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        How We Use Information
      </h2>
      <p>
        We use collected data to operate our restaurant missed call recovery
        system, send transactional SMS notifications, process orders, and
        improve platform performance.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        SMS Communication Disclosure
      </h2>
      <p>
        By interacting with a restaurant using SaanaOS, you agree to receive
        transactional SMS messages related to missed calls, order confirmations,
        and order updates.
      </p>
      <p className="mt-2">
        Message frequency varies. Message and data rates may apply.
      </p>
      <p className="mt-2">
        Reply <strong>STOP</strong> to unsubscribe. Reply{" "}
        <strong>HELP</strong> for assistance.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        Data Sharing
      </h2>
      <p>
        We do not sell personal data. Information may be shared only with service
        providers necessary to operate the platform, such as SMS delivery
        providers.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        Data Security
      </h2>
      <p>
        We implement reasonable safeguards to protect data and maintain secure
        system operations.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        Contact
      </h2>
      <p>support@saanaos.com</p>
    </div>
  );
}