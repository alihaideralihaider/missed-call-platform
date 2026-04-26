export const metadata = {
  title: "Terms of Service | SaanaOS – Restaurant Online Ordering Platform",
  description:
    "Terms of Service for SaanaOS, a restaurant online ordering platform with optional SMS order updates.",
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10 text-sm leading-6">
      <h1 className="text-3xl font-bold mb-4">
        Terms and Conditions – SaanaOS
      </h1>

      <p className="mb-4">Last updated: April 2026</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        Service Description
      </h2>
      <p>
        SaanaOS provides a restaurant online ordering platform. Customers can
        place orders through participating restaurant websites.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        Use of Service
      </h2>
      <p>
        You agree to use this service only for lawful purposes and not to
        interfere with system operations.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        SMS Communication
      </h2>
      <p>
        Customers may choose to opt in to receive SMS messages during the
        checkout process when placing an order.
      </p>
      <p className="mt-2">
        During checkout, an optional, unchecked checkbox allows customers to
        consent to receive SMS updates related to their order, including order
        confirmation and order status updates (e.g., order ready for pickup).
        SMS consent is not required to complete a transaction.
      </p>
      <p className="mt-2">
        If a customer does not opt in, no SMS messages will be sent.
      </p>
      <p className="mt-2">
        Message frequency varies. Message and data rates may apply.
      </p>
      <p className="mt-2">
        Reply <strong>STOP</strong> to unsubscribe. Reply{" "}
        <strong>HELP</strong> for assistance.
      </p>
      <p className="mt-2">
        Carriers are not liable for delayed or undelivered messages. For more
        information about how customer information is handled, please review our{" "}
        <a href="/privacy" className="underline">
          Privacy Policy
        </a>
        .
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        Service Availability
      </h2>
      <p>
        We do not guarantee uninterrupted service. Availability may depend on
        third-party systems including telecommunications providers.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        Limitation of Liability
      </h2>
      <p>
        SaanaOS is provided “as is” without warranties. We are not liable for any
        damages resulting from service usage.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        Changes to Terms
      </h2>
      <p>
        We may update these terms periodically. Continued use of the service
        indicates acceptance of updated terms.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        Contact
      </h2>
      <p>support@saanaos.com</p>
    </div>
  );
}
