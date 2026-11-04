import { Link } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';

const hrefOf = (href: NavItem['href']): string | undefined =>
    typeof href === 'string' ? href : (href as { url?: string }).url;

/** Opción simple o submenú desplegable (`children`). */
export type NavEntry =
    | NavItem
    | { title: string; icon?: LucideIcon; children: NavItem[] };

export function NavMain({ items }: { items: NavEntry[] }) {
    const { isCurrentUrl } = useCurrentUrl();

    return (
        <SidebarGroup className="px-2.5 py-0">
            <SidebarMenu>
                {items.map((item, i) =>
                    'children' in item ? (
                        <Collapsible
                            key={item.title}
                            defaultOpen
                            asChild
                            className="group/collapsible"
                        >
                            <SidebarMenuItem
                                style={{ animationDelay: `${i * 55}ms` }}
                                className="animate-in fade-in slide-in-from-left-4 fill-mode-backwards duration-500"
                            >
                                <CollapsibleTrigger asChild>
                                    <SidebarMenuButton
                                        tooltip={{ children: item.title }}
                                        isActive={item.children.some((c) =>
                                            isCurrentUrl(c.href),
                                        )}
                                    >
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <SidebarMenuSub>
                                        {item.children.map((child) => (
                                            <SidebarMenuSubItem
                                                key={child.title}
                                                data-tour={hrefOf(child.href)}
                                            >
                                                <SidebarMenuSubButton
                                                    asChild
                                                    isActive={isCurrentUrl(
                                                        child.href,
                                                    )}
                                                >
                                                    <Link
                                                        href={child.href}
                                                        prefetch
                                                    >
                                                        {child.icon && (
                                                            <child.icon />
                                                        )}
                                                        <span>
                                                            {child.title}
                                                        </span>
                                                    </Link>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                        ))}
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>
                    ) : (
                        <SidebarMenuItem
                            key={item.title}
                            data-tour={hrefOf(item.href)}
                            style={{ animationDelay: `${i * 55}ms` }}
                            className="animate-in fade-in slide-in-from-left-4 fill-mode-backwards duration-500"
                        >
                            {item.href ? (
                                <SidebarMenuButton
                                    asChild
                                    isActive={isCurrentUrl(item.href)}
                                    tooltip={{ children: item.title }}
                                    className="data-[active=true]:font-semibold"
                                >
                                    <Link href={item.href} prefetch>
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            ) : (
                                <SidebarMenuButton
                                    tooltip={{ children: item.title }}
                                    className="cursor-default"
                                >
                                    {item.icon && <item.icon />}
                                    <span>{item.title}</span>
                                </SidebarMenuButton>
                            )}
                        </SidebarMenuItem>
                    ),
                )}
            </SidebarMenu>
        </SidebarGroup>
    );
}
