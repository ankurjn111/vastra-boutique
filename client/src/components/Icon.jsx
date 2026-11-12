import React from 'react';

const paths = {
  bag: <><path d="M5 8h14l1 13H4L5 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>,
  search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4 4" /></>,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  minus: <path d="M5 12h14" />,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  heart: <path d="M20.8 8.8c0 4.3-8.8 10-8.8 10s-8.8-5.7-8.8-10a4.7 4.7 0 0 1 8.8-2.2 4.7 4.7 0 0 1 8.8 2.2Z" />,
};

function Icon({ name, size = 20 }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

export default Icon;
