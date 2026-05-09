"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageCircle, User, CalendarDays, BarChart2 } from "lucide-react";
import styles from "./BottomNav.module.css";

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
}

export default function BottomNav({ role }: { role?: string }) {
  const pathname = usePathname();

  const isAdminArea = role === 'admin' || role === 'admin_master' || role === 'suporte' || role === 'dev' || pathname?.startsWith('/admin');
  const isFinanceiroRole = role === 'admin_master' || role === 'suporte' || role === 'dev';

  const adminItems: NavItem[] = [
    { name: 'Dashboard',    href: '/dashboard',           icon: Home },
    { name: 'Minhas Aulas', href: '/admin/agenda',        icon: CalendarDays },
    { name: 'Chat',         href: '/admin/chat',          icon: MessageCircle },
    ...(isFinanceiroRole ? [{ name: 'Financeiro', href: '/admin/financeiro', icon: BarChart2 }] : []),
    { name: 'Perfil',       href: '/admin/profile',       icon: User },
  ]

  const studentItems: NavItem[] = [
    { name: 'Início',       href: '/dashboard',              icon: Home },
    { name: 'Minhas Aulas', href: '/dashboard/minhas-aulas', icon: CalendarDays },
    { name: 'Chat',         href: '/dashboard/chat',         icon: MessageCircle },
    { name: 'Perfil',       href: '/dashboard/profile',      icon: User },
  ]

  const navItems = isAdminArea ? adminItems : studentItems

  return (
    <>
      <div className={styles.navSpacer} />
      <nav className={styles.bottomNav} aria-label="Navegação principal">
        <ul className={styles.navList}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === '/dashboard' || item.href === '/admin'
              ? pathname === item.href
              : pathname?.startsWith(item.href)

            return (
              <li key={item.name} className={styles.navItem}>
                <Link
                  href={item.href}
                  className={`${styles.navLink} ${isActive ? styles.active : ""}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className={styles.iconWrap}>
                    <Icon className={styles.icon} />
                    {isActive && <span className={styles.activeDot} />}
                  </span>
                  <span className={styles.label}>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
