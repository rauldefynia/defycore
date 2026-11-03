import AppLogoIcon from '@/components/app-logo-icon';
import BrandLogo from '@/components/brand-logo';

/** Logo del sidebar: completo al expandir, solo el escudo al colapsar. */
export default function AppLogo() {
    return (
        <>
            <BrandLogo
                variant="onDark"
                className="h-7 group-data-[collapsible=icon]:hidden"
            />
            <AppLogoIcon className="hidden size-7 shrink-0 group-data-[collapsible=icon]:block" />
        </>
    );
}
