export const metadata = {
  title: "Compliance | SaanaOS – SMS & Data Compliance",
  description:
    "SaanaOS compliance overview covering SMS regulations, data usage, and operational transparency for restaurant technology.",
};

export default function CompliancePage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10 text-sm leading-6">
      <h1 className="text-3xl font-bold mb-4">Compliance – SaanaOS</h1>

      <p className="mb-4">Last updated: April 2026</p>

      <p>
        SaanaOS is committed to maintaining compliance with applicable
        telecommunications and data protection standards for transactional SMS
        messaging and restaurant ordering systems.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        SMS Compliance
      </h2>
      <p>
        Our messaging system follows industry standards for transactional SMS,
        including opt-out mechanisms, clear disclosure, and limited message
        frequency.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        Data Protection
      </h2>
      <p>
        We collect only the data necessary to provide our services and implement
        safeguards to protect user information.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        Platform Responsibility
      </h2>
      <p>
        SaanaOS acts as a technology provider for restaurants and ensures that
        messaging flows are used only for transactional purposes.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        Contact
      </h2>
      <p>support@saanaos.com</p>
    </div>
  );
}