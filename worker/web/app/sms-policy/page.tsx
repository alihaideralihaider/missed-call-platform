export const metadata = {
  title: "SMS Policy | SaanaOS – Restaurant SMS & Missed Call Recovery",
  description:
    "SaanaOS SMS Policy outlining transactional messaging, opt-out instructions, and compliance for restaurant SMS ordering and missed call recovery.",
};

export default function SmsPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10 text-sm leading-6">
      <h1 className="text-3xl font-bold mb-4">SMS Policy – SaanaOS</h1>

      <p className="mb-4">Last updated: April 2026</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        Overview
      </h2>
      <p>
        SaanaOS provides a transactional SMS system for restaurants, including
        missed call recovery and SMS-based ordering. Messages are sent only in
        response to user interaction with a business.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        Types of Messages
      </h2>
      <ul className="list-disc ml-6">
        <li>Missed call recovery messages with ordering links</li>
        <li>Order confirmations</li>
        <li>Order status updates (e.g., ready for pickup)</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        Message Frequency
      </h2>
      <p>
        Message frequency varies depending on user activity. Typically, users
        receive messages only when interacting with a business.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        Charges
      </h2>
      <p>
        Message and data rates may apply depending on your mobile carrier plan.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        Opt-Out
      </h2>
      <p>
        You may opt out at any time by replying <strong>STOP</strong> to any SMS
        message.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        Help
      </h2>
      <p>
        For assistance, reply <strong>HELP</strong> or contact support.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        Data Usage
      </h2>
      <p>
        Phone numbers are used only for transactional messaging. We do not sell
        or share personal information for marketing purposes.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        Contact
      </h2>
      <p>support@saanaos.com</p>
    </div>
  );
}