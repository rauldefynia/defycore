import type { ImgHTMLAttributes } from 'react';

/** Escudo del logo (solo el icono). */
export default function AppLogoIcon({
    className,
    ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img
            src="/logo-icon.png"
            alt=""
            className={className}
            draggable={false}
            {...props}
        />
    );
}
