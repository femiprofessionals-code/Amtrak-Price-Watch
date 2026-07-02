/** Shared stroke-style icons (lucide-like, inline to avoid a dependency). */

type P = { className?: string };
const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export const IconDashboard = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </svg>
);

export const IconBell = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

export const IconAlert = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden>
    <path d="m3 11 18-8-8 18-2.5-7.5L3 11Z" />
  </svg>
);

export const IconSettings = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

export const IconTrendDown = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden>
    <path d="m22 17-8.5-8.5-5 5L2 7" />
    <path d="M16 17h6v-6" />
  </svg>
);

export const IconTrendUp = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden>
    <path d="m22 7-8.5 8.5-5-5L2 17" />
    <path d="M16 7h6v6" />
  </svg>
);

export const IconPlus = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconDots = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden>
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="19" r="1" />
  </svg>
);

export const IconPause = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden>
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
);

export const IconPlay = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden>
    <polygon points="6 3 20 12 6 21 6 3" />
  </svg>
);

export const IconTrash = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden>
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

export const IconEdit = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden>
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </svg>
);

export const IconRefresh = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden>
    <path d="M3 12a9 9 0 0 1 15.36-6.36L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15.36 6.36L3 16" />
    <path d="M3 21v-5h5" />
  </svg>
);

export const IconTrain = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden>
    <path d="M8 3.1V7a4 4 0 0 0 8 0V3.1" />
    <path d="M9 15h6" />
    <path d="M17 3H7a2 2 0 0 0-2 2v10a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4V5a2 2 0 0 0-2-2Z" />
    <path d="m8 19-2 3" />
    <path d="m18 22-2-3" />
  </svg>
);

export const IconArrowRight = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden>
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

export const IconLogout = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

export const IconSearch = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

export const IconCheck = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const IconMail = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-10 5L2 7" />
  </svg>
);

export const IconTag = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden>
    <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
    <circle cx="7.5" cy="7.5" r="0.5" fill="currentColor" />
  </svg>
);
