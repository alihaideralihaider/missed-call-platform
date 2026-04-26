"use client";

type UpgradeType = "vibe" | "menu" | "bundle";

type Props = {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onChoose: (type: UpgradeType) => void;
};

export default function UpgradeModal({
  open,
  loading = false,
  onClose,
  onChoose,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50">
      <div className="flex min-h-full items-end justify-center p-0 sm:items-center sm:p-4">
        <div className="w-full max-w-lg rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">
                Upgrade visuals
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Choose one option for this restaurant.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-full px-3 py-1 text-sm font-medium text-neutral-500 hover:bg-neutral-100 disabled:opacity-50"
            >
              Close
            </button>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-neutral-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-neutral-900">
                    Vibe Upgrade — $20
                  </h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    Up to 5 vibe images.
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    Enables the storefront vibe background.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onChoose("vibe")}
                disabled={loading}
                className="mt-4 w-full rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Processing..." : "Choose Vibe Upgrade"}
              </button>
            </div>

            <div className="rounded-2xl border border-neutral-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-neutral-900">
                    Menu Image Upgrade — $20
                  </h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    Up to 20 menu images.
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    For menu image optimization and consistency.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onChoose("menu")}
                disabled={loading}
                className="mt-4 w-full rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Processing..." : "Choose Menu Upgrade"}
              </button>
            </div>

            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="mb-2 inline-flex rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
                    Most Popular
                  </div>
                  <h3 className="text-base font-semibold text-neutral-900">
                    Full Visual Bundle — $40
                  </h3>
                  <p className="mt-1 text-sm text-neutral-600">
                    Vibe images: up to 5 + 5 bonus included
                  </p>
                  <p className="mt-1 text-sm text-neutral-600">
                    Menu images: up to 20 + 5 bonus included
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onChoose("bundle")}
                disabled={loading}
                className="mt-4 w-full rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Processing..." : "Choose Full Bundle"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}