"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Section {
  title: string;
  href: string;
  icon: string;
}

const allSections: Section[] = [
  { title: "Invoices", href: "/invoices", icon: "📄" },
  { title: "Accounts", href: "/accounts", icon: "💰" },
  { title: "Employees", href: "/employees", icon: "👥" },
  { title: "Expenses", href: "/expenses", icon: "💸" },
  { title: "Business Info", href: "/business-info", icon: "🏢" },
];

export function SectionHeader() {
  const pathname = usePathname();
  const [visibleSections, setVisibleSections] = useState<Section[]>(allSections);
  const [hiddenSections, setHiddenSections] = useState<Section[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionsContainerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const calculateVisibleItems = () => {
      if (!containerRef.current || !measureRef.current) return;

      // Measure all items from the hidden container
      const measuredWidths: number[] = [];
      const measureItems = measureRef.current.children;
      
      for (let i = 0; i < measureItems.length; i++) {
        measuredWidths.push(measureItems[i].getBoundingClientRect().width);
      }

      const containerWidth = containerRef.current.offsetWidth;
      const dashboardElement = containerRef.current.querySelector('a[href="/"]') as HTMLElement;
      const dashboardWidth = dashboardElement?.offsetWidth || 120;
      const padding = 48; // px-6 on both sides
      const gap = 16; // gap-4
      const moreButtonWidth = 80;
      
      let usedWidth = dashboardWidth + padding + gap;
      const visible: Section[] = [];
      const hidden: Section[] = [];

      // Check each item
      for (let i = 0; i < allSections.length; i++) {
        const itemWidth = measuredWidths[i] + gap;
        const hasMoreItems = i < allSections.length - 1;
        const requiredWidth = usedWidth + itemWidth + (hasMoreItems ? moreButtonWidth + gap : 0);
        
        if (requiredWidth <= containerWidth) {
          visible.push(allSections[i]);
          usedWidth += itemWidth;
        } else {
          hidden.push(...allSections.slice(i));
          break;
        }
      }

      if (hidden.length === 0) {
        setVisibleSections(allSections);
        setHiddenSections([]);
      } else {
        setVisibleSections(visible);
        setHiddenSections(hidden);
      }
    };

    const timeoutId = setTimeout(calculateVisibleItems, 100);
    window.addEventListener("resize", calculateVisibleItems);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", calculateVisibleItems);
    };
  }, []);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  return (
    <header className="w-full bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      {/* Hidden measurement container */}
      <div ref={measureRef} className="absolute invisible flex items-center gap-4">
        {allSections.map((section) => (
          <div
            key={`measure-${section.href}`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border whitespace-nowrap"
          >
            <span className="text-xl">{section.icon}</span>
            <span className="font-medium">{section.title}</span>
          </div>
        ))}
      </div>

      <div
        ref={containerRef}
        className="flex items-center gap-4 px-6 py-4"
      >
        {/* Dashboard Link */}
        <Link
          href="/"
          className={cn(
            "text-lg font-semibold whitespace-nowrap hover:text-blue-600 transition-colors flex-shrink-0",
            isActive("/") ? "text-blue-600" : "text-gray-900"
          )}
        >
          Dashboard
        </Link>

        {/* Section Boxes */}
        <div ref={sectionsContainerRef} className="flex items-center gap-4 flex-1 min-w-0">
          {visibleSections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all whitespace-nowrap flex-shrink-0",
                "hover:shadow-md hover:scale-105",
                isActive(section.href)
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
              )}
            >
              <span className="text-xl">{section.icon}</span>
              <span className="font-medium">{section.title}</span>
            </Link>
          ))}

          {/* More Button */}
          {hiddenSections.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="whitespace-nowrap flex-shrink-0"
                >
                  More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {hiddenSections.map((section) => (
                  <DropdownMenuItem key={section.href} asChild>
                    <Link
                      href={section.href}
                      className={cn(
                        "flex items-center gap-2 cursor-pointer",
                        isActive(section.href) && "bg-blue-50 text-blue-700"
                      )}
                    >
                      <span className="text-lg">{section.icon}</span>
                      <span>{section.title}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
