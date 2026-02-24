import type { ReactElement } from 'react';

/** Icon size relative to the parent font-size so it scales with the theme's fontSize setting. */
const DEFAULT_ICON_SIZE = '1.14em';

/**
 * Base info field icons — custom WPS SVG icons using currentColor.
 */

/** 手机 / Phone */
export function IconPhone({ size = DEFAULT_ICON_SIZE, className }: { readonly size?: string | number; readonly className?: string }): ReactElement {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" width={size} height={size} className={className}>
      <g clipPath="url(#bi-phone-clip)">
        <rect width="10.5" height="14.5" x="2.75" y=".75" stroke="currentColor" strokeWidth="1.5" rx="1.25" />
        <path fill="currentColor" d="M6 12.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75z" />
      </g>
      <defs>
        <clipPath id="bi-phone-clip"><path fill="#fff" d="M0 0h16v16H0z" /></clipPath>
      </defs>
    </svg>
  );
}

/** 邮箱 / Email */
export function IconMail({ size = DEFAULT_ICON_SIZE, className }: { readonly size?: string | number; readonly className?: string }): ReactElement {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" width={size} height={size} className={className}>
      <g stroke="currentColor" strokeWidth="1.5" clipPath="url(#bi-mail-clip)">
        <path d="M1.75 4c0-.69.56-1.25 1.25-1.25h10c.69 0 1.25.56 1.25 1.25v9c0 .69-.56 1.25-1.25 1.25H3c-.69 0-1.25-.56-1.25-1.25V4z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l6 3 6-3" />
      </g>
      <defs>
        <clipPath id="bi-mail-clip"><path fill="#fff" d="M0 0h16v16H0z" /></clipPath>
      </defs>
    </svg>
  );
}

/** 性别 / Gender */
export function IconGender({ size = DEFAULT_ICON_SIZE, className }: { readonly size?: string | number; readonly className?: string }): ReactElement {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" width={size} height={size} className={className}>
      <g clipPath="url(#bi-gender-clip)">
        <path fill="currentColor" fillRule="evenodd" d="M9.5 5.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0-1.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z" clipRule="evenodd" />
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2 7V2.5a.5.5 0 0 1 .5-.5H7m-4.5.5L6 6" />
      </g>
      <defs>
        <clipPath id="bi-gender-clip"><path fill="#fff" d="M0 0h16v16H0z" /></clipPath>
      </defs>
    </svg>
  );
}

/** 年龄/生日 / Age/Birthday */
export function IconAge({ size = DEFAULT_ICON_SIZE, className }: { readonly size?: string | number; readonly className?: string }): ReactElement {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" width={size} height={size} className={className}>
      <g clipPath="url(#bi-age-clip)">
        <path stroke="currentColor" strokeWidth="1.5" d="M2.75 9c0-.69.56-1.25 1.25-1.25h8c.69 0 1.25.56 1.25 1.25v5.25H2.75V9z" />
        <path fill="currentColor" d="M1 14.25a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1-.75-.75z" />
        <rect width="2" height="2" x="4" y="1" fill="currentColor" rx="1" />
        <rect width="2" height="2" x="7" y="1" fill="currentColor" rx="1" />
        <path fill="currentColor" d="M10 2a1 1 0 1 1 2 0 1 1 0 0 1-2 0z" />
        <path stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" d="M5 5v2.5M8 5v2.5M11 5v2.5" />
      </g>
      <defs>
        <clipPath id="bi-age-clip"><path fill="#fff" d="M0 0h16v16H0z" /></clipPath>
      </defs>
    </svg>
  );
}

/** 所在地 / Location */
export function IconLocation({ size = DEFAULT_ICON_SIZE, className }: { readonly size?: string | number; readonly className?: string }): ReactElement {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" width={size} height={size} className={className}>
      <g clipPath="url(#bi-loc-clip)">
        <path stroke="currentColor" strokeWidth="1.5" d="M1.75 5.16c0-.448.24-.862.63-1.085l5-2.857a1.25 1.25 0 0 1 1.24 0l5 2.857c.39.223.63.637.63 1.086V13c0 .69-.56 1.25-1.25 1.25H3c-.69 0-1.25-.56-1.25-1.25V5.16z" />
        <path fill="currentColor" d="M9.5 6.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM6 9a2 2 0 0 0-2 2v1h1.5v-1a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5v1H12v-1a2 2 0 0 0-2-2H6z" />
      </g>
      <defs>
        <clipPath id="bi-loc-clip"><path fill="#fff" d="M0 0h16v16H0z" /></clipPath>
      </defs>
    </svg>
  );
}

/** 通用信息 / Generic info */
export function IconInfo({ size = DEFAULT_ICON_SIZE, className }: { readonly size?: string | number; readonly className?: string }): ReactElement {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" width={size} height={size} className={className}>
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <path fill="currentColor" d="M7.25 7h1.5v4.5h-1.5zM8 4.5a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5z" />
    </svg>
  );
}

/** 工作年限 / Work years */
export function IconWorkYear({ size = DEFAULT_ICON_SIZE, className }: { readonly size?: string | number; readonly className?: string }): ReactElement {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" width={size} height={size} className={className}>
      <g clipPath="url(#bi-wy-clip)">
        <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
        <path stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" d="M8 4.5V8l2.5 2.5" />
      </g>
      <defs>
        <clipPath id="bi-wy-clip"><path fill="#fff" d="M0 0h16v16H0z" /></clipPath>
      </defs>
    </svg>
  );
}
