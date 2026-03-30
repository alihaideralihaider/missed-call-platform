export async function createSubscription(restaurant: {
  name: string;
  email: string;
}) {
  // For now: mock / placeholder
  return {
    subscriptionId: "demo_sub_123",
    status: "active",
  };
}