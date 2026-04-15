"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageCircle, User, CalendarDays, Bell } from "lucide-react";
import styles from "./BottomNav.module.css";

export default function BottomNav({ role }: { role?: string }) {
  const pathname = usePathname();
  
  const isProfileAdmin = role === 'admin' || role === 'admin_master' || pathname?.startsWith('/admin');

  const navItems = isProfileAdmin
    ? [
        { name: 'Dashboard',    href: '/admin',               icon: Home },
        { name: 'Minhas Aulas', href: '/admin/agenda',        icon: CalendarDays },
        { name: 'Chat',         href: '/admin/chat',          icon: MessageCircle },
        { name: 'Perfil',       href: '/admin/profile',       icon: User },
      ]
    : [
        { name: 'Início',       href: '/dashboard',           icon: Home },
        { name: 'Minhas Aulas', href: '/dashboard/minhas-aulas', icon: CalendarDays },
        { name: 'Chat',         href: '/dashboard/chat',      icon: MessageCircle },
        { name: 'Perfil',       href: '/dashboard/profile',   icon: User },
      ]


  return (
    <>
      {/* Spacer para garantir que o conteúdo não fique escondido sob a nav no mobile */}
      <div className={styles.navSpacer}></div>
      
      <nav className={styles.bottomNav}>
        <ul className={styles.navList}>
          {navItems.map((item) => {
            const Icon = item.icon;
            // Verifica se é ativo. Para o dashboard base, precisa ser exato ou quase exato
            const isActive = item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname?.startsWith(item.href)

            return (
              <li key={item.name} className={styles.navItem}>
                <Link 
                  href={item.href} 
                  className={`${styles.navLink} ${isActive ? styles.active : ""}`}
                >
                  <Icon className={styles.icon} />
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
