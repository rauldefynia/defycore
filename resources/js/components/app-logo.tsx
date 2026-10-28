import { usePage } from '@inertiajs/react';

import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    const { name } = usePage().props;

    return (
        <>
            <AppLogoIcon className="size-7 shrink-0 text-white" />
            <span className="truncate text-[17px] font-semibold tracking-tight text-white">
                {name}
            </span>
        </>
    );
}
