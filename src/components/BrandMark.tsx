// Super Mercado symbol (cart + euro coin) from the brand pack, without the name: the product name
// comes from the backend (APP_NAME_FOR_CUSTOMER), so it is rendered as text next to the mark.
// Same geometry as scripts/make_icons.mjs.
export function BrandMark({ className = "size-12" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 -4 347 226" className={className}>
      <g fill="#12B76A">
        <rect x="0" y="122" width="60" height="18" rx="9" />
        <rect x="12" y="158" width="48" height="18" rx="9" />
        <rect x="24" y="194" width="36" height="18" rx="9" />
        <path d="M143 141 H295 L282 169 H160 Z" />
      </g>
      <path
        d="M62 42 H92 C106 42 117 50 123 65 L151 145 Q156 158 171 158 H286 Q301 158 308 142 L333 72"
        fill="none"
        stroke="#12B76A"
        strokeWidth="26"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="184" cy="205" r="15" className="fill-brand" />
      <circle cx="278" cy="205" r="15" className="fill-brand" />
      <circle cx="244" cy="52" r="55" fill="#FFC928" />
      <path d="M262 38 A22.8 22.8 0 1 0 262 66" fill="none" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" />
      <path d="M224 46 H252 M224 58 H252" fill="none" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}
