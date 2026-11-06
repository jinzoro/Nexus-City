import type { ReactNode, SVGProps } from 'react'

export type IconName =
  | 'map'
  | 'sectors'
  | 'transit'
  | 'systems'
  | 'messages'
  | 'profile'
  | 'search'
  | 'plus'
  | 'minus'
  | 'reset'
  | 'overview'
  | 'audio'
  | 'audio-off'
  | 'close'
  | 'locate'
  | 'enter'
  | 'track'
  | 'chevron'
  | 'info'
  | 'warning'
  | 'critical'
  | 'power'
  | 'network'
  | 'stability'
  | 'people'
  | 'clock'
  | 'weather'
  | 'scan'
  | 'send'
  | 'grid'
  | 'target'

const PATHS: Record<IconName, ReactNode> = {
  map: (
    <>
      <path d="M3 5.5 8.5 3l7 2.5L21 3v15.5L15.5 21l-7-2.5L3 21Z" />
      <path d="M8.5 3v15.5M15.5 5.5V21" />
      <path d="m11 9 2 2-2 2-2-2Z" fill="currentColor" stroke="none" />
    </>
  ),
  sectors: (
    <>
      <path d="M12 2.5 21 7v10l-9 4.5L3 17V7Z" />
      <path d="M12 2.5V12m0 0 9-5M12 12 3 7m9 5v9.5" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
  transit: (
    <>
      <rect x="5" y="3" width="14" height="13" rx="3" />
      <path d="M8 19l2-3m6 3-2-3M5 9h14M8.5 12.5h.01M15.5 12.5h.01" />
      <circle cx="8.5" cy="16.5" r="1.4" />
      <circle cx="15.5" cy="16.5" r="1.4" />
    </>
  ),
  systems: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9 7 7m10 10 2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
    </>
  ),
  messages: (
    <>
      <path d="M4 5h16v11H9l-5 4Z" />
      <path d="M8 9h8M8 12.5h5" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M4.5 20c.7-4 3.4-6 7.5-6s6.8 2 7.5 6Z" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="5.5" />
      <path d="m15 15 5 5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  reset: (
    <>
      <path d="M4 12a8 8 0 1 0 2.4-5.7" />
      <path d="M4 4v4.5h4.5" />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    </>
  ),
  overview: (
    <>
      <path d="m12 3 9 4.5-9 4.5-9-4.5Z" />
      <path d="m3 12 9 4.5 9-4.5M3 16.5 12 21l9-4.5" />
    </>
  ),
  audio: (
    <>
      <path d="M4 9h3l4-3.5v13L7 15H4Z" />
      <path d="M14.5 8.5a5 5 0 0 1 0 7M17 6a8.5 8.5 0 0 1 0 12" />
    </>
  ),
  'audio-off': (
    <>
      <path d="M4 9h3l4-3.5v13L7 15H4Z" />
      <path d="m15 9 5 6m0-6-5 6" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  locate: (
    <>
      <circle cx="12" cy="12" r="5" />
      <path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
    </>
  ),
  enter: (
    <>
      <path d="M13 4h6v16h-6" />
      <path d="M3 12h11m-4-4 4 4-4 4" />
    </>
  ),
  track: (
    <>
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  chevron: <path d="m8 5 7 7-7 7" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6M12 7.5h.01" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3 22 20H2Z" />
      <path d="M12 9v5M12 17h.01" />
    </>
  ),
  critical: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 8.5 7 7m0-7-7 7" />
    </>
  ),
  power: (
    <>
      <path d="M13 2 5 14h6l-1 8 8-12h-6Z" />
    </>
  ),
  network: (
    <>
      <circle cx="12" cy="5" r="2.2" />
      <circle cx="5" cy="18" r="2.2" />
      <circle cx="19" cy="18" r="2.2" />
      <path d="M12 7.2v4.3M10.3 12.6 6.4 16m7.3-3.4 3.9 3.4M5 15.8V13h14v2.8" />
    </>
  ),
  stability: (
    <>
      <path d="M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6Z" />
      <path d="m8.5 12 2.4 2.4 4.8-5" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8.5" r="2.7" />
      <path d="M3.5 19c.5-3.4 2.6-5.2 5.5-5.2s5 1.8 5.5 5.2" />
      <path d="M15.5 6.4a2.6 2.6 0 0 1 0 5M17 13.8c2 .5 3.3 2.2 3.6 4.7" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6.5V12l4 2.5" />
    </>
  ),
  weather: (
    <>
      <path d="M7 17h10.5a3.5 3.5 0 0 0 .4-7A5.5 5.5 0 0 0 7.4 11 3 3 0 0 0 7 17Z" />
      <path d="M8 20.5h.01M12 20.5h.01M16 20.5h.01" />
    </>
  ),
  scan: (
    <>
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
      <path d="M3 12h18" />
    </>
  ),
  send: <path d="m3 11 18-8-8 18-2.5-7.5Z" />,
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v4m0 14v4M1 12h4m14 0h4" />
    </>
  ),
}

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName
  size?: number
}

export function Icon({ name, size = 18, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      {...props}
    >
      {PATHS[name]}
    </svg>
  )
}
