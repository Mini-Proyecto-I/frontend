import { CalendarDays, PlusCircle, BarChart3, GraduationCap, Settings, FileText } from 'lucide-react';
import { NavLink } from '@/app/NavLink';
import { useStore } from '@/app/store';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from '@/shared/components/sidebar';
import { Avatar, AvatarFallback } from '@/shared/components/avatar';
import { cn } from '@/shared/utils/utils';

const navItems = [
  { title: 'Hoy', url: '/hoy', icon: CalendarDays },
  { title: 'Crear', url: '/crear', icon: PlusCircle },
  { title: 'Actividad', url: '/actividad/1', icon: FileText },
  { title: 'Progreso', url: '/progreso', icon: BarChart3 },
];

export function AppSidebar() {
  const user = useStore((s) => s.user);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="py-4">
        <div className="flex items-center gap-3 transition-opacity duration-200">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary shadow-sm transition-transform duration-200 hover:scale-105">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span 
            className={cn(
              "text-lg font-bold tracking-tight text-foreground",
              "group-data-[collapsible=icon]:hidden"
            )}
          >
            StudyFlow
          </span>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.title === 'Actividad' ? (
                    <SidebarMenuButton 
                      tooltip={item.title}
                      onClick={(e) => e.preventDefault()}
                      className="hover:bg-sidebar-accent hover:translate-x-0.5 cursor-default transition-all duration-200"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        end={!item.url.includes(':')}
                        className="transition-all duration-200"
                        activeClassName="!bg-primary/25 !text-primary font-semibold border-l-4 border-primary shadow-[0_0_12px_hsl(var(--primary)/0.3)]"
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="py-3">
        <SidebarSeparator className="group-data-[collapsible=icon]:hidden" />
        <div className="flex items-center gap-3 mt-2 transition-opacity duration-200">
          <Avatar className="h-9 w-9 shrink-0 ring-2 ring-sidebar-border/50 rounded-full transition-shadow duration-200 hover:ring-primary/30">
            <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">
              {user.name.split(' ').map((n) => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className={cn("flex flex-col min-w-0", "group-data-[collapsible=icon]:hidden")}>
            <span className="text-sm font-medium text-foreground truncate">{user.name}</span>
            <span className="text-xs text-muted-foreground truncate">{user.major}</span>
          </div>
          <Settings className="ml-auto h-4 w-4 text-muted-foreground shrink-0 transition-colors duration-150 hover:text-foreground" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}