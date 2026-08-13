import wordmark from "@/assets/nilex-wordmark.png";

export function NilexLogo({ className = "h-6", withText = false }: { className?: string; withText?: boolean }) {
  return (
    <span translate="no" className={`notranslate inline-flex items-center gap-2 ${className}`}>
      <img
        src={wordmark}
        alt="nilex"
        width={1152}
        height={576}
        className="h-full w-auto object-contain select-none"
        draggable={false}
      />
      {withText && <span className="sr-only">nilex</span>}
    </span>
  );
}
