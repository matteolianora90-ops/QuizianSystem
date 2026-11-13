import React from 'react';

export const StudyHeroIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 240 180"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Subtle backdrop circle */}
    <circle cx="128" cy="92" r="74" fill="white" fillOpacity="0.12" />
    <circle cx="128" cy="92" r="54" fill="white" fillOpacity="0.1" />

    {/* Floating flashcard */}
    <rect
      x="124"
      y="20"
      width="86"
      height="54"
      rx="12"
      fill="#172337"
      stroke="white"
      strokeOpacity="0.28"
      strokeWidth="1.5"
    />
    <rect x="136" y="33" width="42" height="5" rx="2.5" fill="#F47A18" />
    <rect x="136" y="44" width="60" height="4" rx="2" fill="white" fillOpacity="0.7" />
    <rect x="136" y="53" width="48" height="4" rx="2" fill="white" fillOpacity="0.45" />
    <circle cx="195" cy="36" r="8" fill="#239B70" />
    <path
      d="M191.5 36L194 38.5L198.5 33.5"
      stroke="white"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* Open textbook */}
    <path
      d="M34 74C34 68.4772 38.4772 64 44 64H106C111.523 64 116 68.4772 116 74V146C116 146 104 140 75 140C46 140 34 146 34 146V74Z"
      fill="white"
    />
    <path
      d="M198 74C198 68.4772 193.523 64 188 64H126C120.477 64 116 68.4772 116 74V146C116 146 128 140 157 140C186 140 198 146 198 146V74Z"
      fill="#FFF0E3"
    />
    <rect x="114" y="68" width="4" height="78" rx="2" fill="#E8E4DC" />

    {/* Left page notes lines */}
    <rect x="48" y="82" width="44" height="5" rx="2.5" fill="#172337" fillOpacity="0.85" />
    <rect x="48" y="94" width="54" height="4" rx="2" fill="#172337" fillOpacity="0.25" />
    <rect x="48" y="104" width="50" height="4" rx="2" fill="#172337" fillOpacity="0.25" />
    <rect x="48" y="114" width="38" height="4" rx="2" fill="#172337" fillOpacity="0.25" />

    {/* Right page checklist */}
    <circle cx="136" cy="90" r="5" fill="#F47A18" />
    <rect x="146" y="88" width="36" height="4" rx="2" fill="#172337" fillOpacity="0.7" />
    <circle cx="136" cy="106" r="5" fill="#239B70" />
    <rect x="146" y="104" width="38" height="4" rx="2" fill="#172337" fillOpacity="0.5" />
    <circle cx="136" cy="122" r="5" fill="#172337" fillOpacity="0.25" />
    <rect x="146" y="120" width="30" height="4" rx="2" fill="#172337" fillOpacity="0.35" />

    {/* Pencil accent */}
    <g transform="translate(26 126) rotate(-18)">
      <rect x="0" y="0" width="52" height="10" rx="3" fill="#172337" />
      <rect x="38" y="0" width="8" height="10" fill="#F47A18" />
      <path d="M52 0L61 5L52 10V0Z" fill="#FFF0E3" />
    </g>

    {/* Subtle sparkles */}
    <path
      d="M54 32L56.5 38.5L63 41L56.5 43.5L54 50L51.5 43.5L45 41L51.5 38.5L54 32Z"
      fill="white"
      fillOpacity="0.85"
    />
    <circle cx="212" cy="128" r="4" fill="white" fillOpacity="0.55" />
  </svg>
);

export const ChallengeArenaIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 180 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <circle cx="90" cy="60" r="52" fill="#FFF0E3" fillOpacity="0.16" />
    {/* Left student card */}
    <rect x="18" y="28" width="56" height="66" rx="14" fill="white" fillOpacity="0.12" stroke="white" strokeOpacity="0.25" />
    <circle cx="46" cy="52" r="13" fill="#F47A18" />
    <rect x="30" y="72" width="32" height="5" rx="2.5" fill="white" fillOpacity="0.85" />
    <rect x="35" y="81" width="22" height="4" rx="2" fill="#239B70" />

    {/* Right student card */}
    <rect x="106" y="28" width="56" height="66" rx="14" fill="white" fillOpacity="0.12" stroke="white" strokeOpacity="0.25" />
    <circle cx="134" cy="52" r="13" fill="#239B70" />
    <rect x="118" y="72" width="32" height="5" rx="2.5" fill="white" fillOpacity="0.85" />
    <rect x="123" y="81" width="22" height="4" rx="2" fill="#F47A18" />

    {/* Center VS badge */}
    <circle cx="90" cy="60" r="16" fill="#F47A18" stroke="#172337" strokeWidth="3" />
    <path
      d="M84 54L88.5 66L93 54"
      stroke="white"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M95 57C95 55.5 96.5 54.5 98 55"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export const QuizSuccessIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <circle cx="60" cy="60" r="52" fill="#239B70" fillOpacity="0.1" />
    <circle cx="60" cy="60" r="38" fill="#239B70" fillOpacity="0.16" />
    {/* Ribbon tails */}
    <path d="M46 84L40 106L52 98L58 106L60 84" fill="#F47A18" />
    <path d="M74 84L80 106L68 98L62 106L60 84" fill="#172337" />
    {/* Seal */}
    <circle cx="60" cy="58" r="28" fill="#239B70" stroke="white" strokeWidth="4" />
    <path
      d="M48 58.5L56 66.5L73 49.5"
      stroke="white"
      strokeWidth="4.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Decorative stars */}
    <circle cx="24" cy="34" r="3.5" fill="#F47A18" />
    <circle cx="96" cy="32" r="4" fill="#F47A18" />
    <circle cx="98" cy="78" r="3" fill="#239B70" />
  </svg>
);
