import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M5 3h10.5C22.4 3 28 9.2 28 16s-5.6 13-12.5 13H5z"
                fill="currentColor"
            />
            <path d="M5 3h10.5L5 29z" fill="#A78BFA" />
        </svg>
    );
}
