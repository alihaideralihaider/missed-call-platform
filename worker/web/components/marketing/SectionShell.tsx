import type { ReactNode } from "react";

type SectionShellProps = {
  children: ReactNode;
  className?: string;
  id?: string;
};

export function SectionShell({ children, className = "", id }: SectionShellProps) {
  return (
    <section
      id={id}
      className={["px-4 py-16 sm:px-6 lg:px-8", className].join(" ")}
    >
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}
