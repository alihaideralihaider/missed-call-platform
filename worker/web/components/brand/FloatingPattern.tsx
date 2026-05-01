type FloatingPatternProps = {
  className?: string;
  opacity?: "soft" | "medium";
};

export function FloatingPattern({
  className = "",
  opacity = "soft",
}: FloatingPatternProps) {
  const opacityClass = opacity === "medium" ? "opacity-[0.10]" : "opacity-[0.08]";

  return (
    <img
      src="/brand/patterns/saana-pattern-source.png"
      alt=""
      aria-hidden="true"
      className={[
        "pointer-events-none absolute max-w-none select-none",
        opacityClass,
        className,
      ].join(" ")}
    />
  );
}
