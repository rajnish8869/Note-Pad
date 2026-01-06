import React from 'react';

// Simplified icon component to avoid external dependency issues
const paths: Record<string, string> = {
  menu: "M3 12h18M3 6h18M3 18h18",
  search: "M21 21l-4.35-4.35M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0z",
  plus: "M12 5v14M5 12h14",
  arrowLeft: "M19 12H5M12 19l-7-7 7-7",
  moreVertical: "M12 12h.01M12 5h.01M12 19h.01",
  check: "M20 6L9 17l-5-5",
  trash: "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  pin: "M22 10c-5-2-9-5-11-5s-6 3-11 5c0 0 5 1 5 10v4h12v-4c0-9 5-10 5-10z",
  pinOff: "M2 2l20 20",
  moon: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
  sun: "M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z",
  cloud: "M17.5 19c2.485 0 4.5-2.015 4.5-4.5 0-2.3-1.75-4.2-4-4.45-.75-3-3.5-5.05-6.5-5.05-3.5 0-6.4 2.5-7 5.9-2.5.25-4.5 2.2-4.5 4.6 0 2.485 2.015 4.5 4.5 4.5h13z",
  bold: "M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z",
  italic: "M19 4h-9M14 20H5M15 4L9 20",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  save: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z",
  share: "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13",
  refresh: "M23 4v6h-6M1 20v-6h6",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  folder: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z",
  tag: "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z M7 7h.01",
  palette: "M12 21a9 9 0 1 0 0-18c1.6 0 3.2.4 4.6 1.1a1 1 0 0 1 .4 1.3l-1.3 2.1a1 1 0 0 0 .1 1.1l2.2 3.3a1 1 0 0 1-.3 1.4l-1.9 1.4a1 1 0 0 0-.4.8v.1A5.02 5.02 0 0 1 12 21z",
  moreHorizontal: "M12 12h.01M19 12h.01M5 12h.01",
  restore: "M1 4v6h6 M3.51 15a9 9 0 1 0 2.13-9.36L1 10",
  x: "M18 6L6 18M6 6l12 12",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  viewList: "M8 6h13M8 12h13M8 18h13M3 6h1v1H3zm0 6h1v1H3zm0 6h1v1H3z",
  sort: "M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z",
  lock: "M19 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2zm0 0V9a7 7 0 0 0-14 0v2",
  unlock: "M19 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2zm0 0V9a7 7 0 0 1 14 0v2",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  fingerprint: "M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 6",
  eyeOff: "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22",
  incognito: "M2 12c0-3.5 2.5-6 6-6 1.5 0 2.5 1 3.5 2 1.5-1.5 2.5-2 4.5-2 3 0 5 2.5 5 6M2 12l2 2m18-2l-2 2"
};

interface IconProps {
  name: keyof typeof paths;
  size?: number;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export const Icon: React.FC<IconProps> = ({ name, size = 24, className = "", onClick }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      onClick={onClick}
    >
      <path d={paths[name]} />
    </svg>
  );
};
