"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageCircle, User } from "lucide-react";
import styles from "./BottomNav.module.css";

// Este componente precisa saber se o usuário é admin ou aluno para redirecionar para a base certa
// ou podemos criar rotas unificadas: /dashboard, /chat, /profile
// Por enquanto, recebemos o base_path como prop ou inferimos da URL atual.
// // melhorar esse fluxo depois caso unifiquemos as rotas de aluno e admin.

export default function BottomNav({ role }: { role?: string }) {
  const pathname = usePathname();
  
  // Se não foi passado role, tenta adivinhar pela URL (ex: /admin/...)
  const isProfileAdmin = role === 'admin' || role === 'admin_master' || pathname?.startsWith('/admin');
  const basePath = isProfileAdmin ? '/admin' : '/dashboard';

  const navItems = [
    { name: "Dashboard", href: `${basePath}`, icon: Home },
    { name: "Chat", href: `${basePath}/chat`, icon: MessageCircle },
    { name: "Perfil", href: `${basePath}/profile`, icon: User },
  ];

  return (
    <>
      {/* Spacer para garantir que o conteúdo não fique escondido sob a nav no mobile */}
      <div className={styles.navSpacer}></div>
      
      <nav className={styles.bottomNav}>
        <ul className={styles.navList}>
          {navItems.map((item) => {
            const Icon = item.icon;
            // Verifica se é ativo. Para o dashboard base, precisa ser exato ou quase exato
            const isActive = pathname === item.href;

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
