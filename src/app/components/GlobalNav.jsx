"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./GlobalNav.module.css";

/**
 * 统一全局导航组件
 * 在所有页面显示，支持页面间切换
 */
export default function GlobalNav() {
    const pathname = usePathname();

    const navItems = [
        { href: "/", label: "🎨 美化", icon: "beautify" },
        { href: "/write", label: "✍️ 撰写", icon: "write" },
        { href: "/write/history", label: "📜 历史", icon: "history" },
        { href: "/tasks", label: "📋 任务", icon: "tasks" },
    ];

    const isActive = (href) => {
        if (href === "/") return pathname === "/";
        if (href === "/write") return pathname === "/write";
        return pathname.startsWith(href);
    };

    return (
        <header className={styles.header}>
            {/* Logo */}
            <Link href="/" className={styles.logo}>
                <div className={styles.logoIcon}>
                    <img src="/logo_red.png" alt="PPT AI Pro" />
                </div>
                <span className={styles.logoText}>PPT AI Pro</span>
            </Link>

            {/* Navigation */}
            <nav className={styles.nav}>
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`${styles.navItem} ${isActive(item.href) ? styles.active : ""}`}
                    >
                        {item.label}
                    </Link>
                ))}
            </nav>

            {/* Mobile: Bottom Tab Bar (handled via CSS media query) */}
        </header>
    );
}
