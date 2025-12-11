import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Activity, History as HistoryIcon, Menu, X, Sparkles } from "lucide-react";
import logoImage from "@assets/toxishield-logo.png";
import gmrLogo from "@assets/GMR_1753253909814.webp";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

export function Header() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    {
      name: "Dashboard",
      href: "/",
      icon: Activity,
      current: location === "/",
    },
    {
      name: "History",
      href: "/history",
      icon: HistoryIcon,
      current: location === "/history",
    },
  ];

  return (
    <header className="glass-header sticky top-0 z-50 animate-slide-in-bottom">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-12 sm:h-14">
          {/* Logo with animation */}
          <div className="flex items-center animate-slide-in-left">
            <Link
              href="/"
              className="focus:outline-none hover:opacity-80 transition-all duration-300 group relative cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-lg blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
              <img 
                src={logoImage} 
                alt="ToxiShield-X Logo" 
                className="h-6 sm:h-7 w-auto relative z-10 transform group-hover:scale-110 transition-transform duration-300" 
              />
            </Link>
          </div>
          
          {/* Desktop Navigation with enhanced styling */}
          <nav className="hidden md:flex space-x-2 animate-fade-in-scale stagger-2">
            {navigation.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-300 relative group overflow-hidden cursor-pointer",
                    item.current
                      ? "text-white bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/50"
                      : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white glass-button"
                  )}
                  data-testid={`link-${item.name.toLowerCase()}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Shimmer effect on hover */}
                  {!item.current && (
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer-wave"></span>
                  )}
                  
                  {/* Active indicator with glow */}
                  {item.current && (
                    <span className="absolute inset-0 animate-glow-pulse rounded-xl"></span>
                  )}
                  
                  <Icon className={cn(
                    "h-4 w-4 mr-2 relative z-10 transition-transform duration-300",
                    item.current && "animate-scale-pulse"
                  )} />
                  <span className="relative z-10">{item.name}</span>
                  
                  {/* Sparkle effect for active item */}
                  {item.current && (
                    <Sparkles className="h-3 w-3 ml-1 relative z-10 animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>
          
          {/* Right side - Theme Toggle, GMR Logo and Mobile Menu Button */}
          <div className="flex items-center space-x-3 animate-slide-in-right">
            <ThemeToggle />
            <div className="flex items-center">
              <a 
                href="https://www.gmrgroup.in/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="transition-all duration-300 hover:opacity-80 focus:outline-none group relative"
                aria-label="Visit GMR Group website"
                data-testid="link-gmr-logo"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-green-400 rounded-lg blur-lg opacity-0 group-hover:opacity-25 transition-opacity duration-300"></div>
                <img 
                  src={gmrLogo} 
                  alt="GMR Logo" 
                  className="h-9 sm:h-10 w-auto relative z-10 transform group-hover:scale-105 transition-transform duration-300"
                />
              </a>
            </div>
            
            {/* Mobile menu button with animation */}
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center p-2.5 rounded-xl glass-button text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-all duration-300 hover:scale-110"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              <span className="sr-only">Open main menu</span>
              <div className="relative w-6 h-6">
                <X className={cn(
                  "absolute inset-0 h-6 w-6 transition-all duration-300",
                  mobileMenuOpen ? "rotate-0 opacity-100" : "rotate-90 opacity-0"
                )} aria-hidden="true" />
                <Menu className={cn(
                  "absolute inset-0 h-6 w-6 transition-all duration-300",
                  mobileMenuOpen ? "rotate-90 opacity-0" : "rotate-0 opacity-100"
                )} aria-hidden="true" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu with slide animation */}
      <div className={cn(
        "md:hidden overflow-hidden transition-all duration-300 ease-in-out",
        mobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="px-3 pt-2 pb-4 space-y-2 glass-card shadow-2xl rounded-b-2xl border-t border-white/20 mx-2">
          {navigation.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center w-full px-3 py-2 rounded-xl text-base font-medium transition-all duration-300 relative overflow-hidden group cursor-pointer",
                  item.current
                    ? "text-white bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30"
                    : "text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 glass-button",
                  "animate-slide-in-right"
                )}
                onClick={() => setMobileMenuOpen(false)}
                data-testid={`link-mobile-${item.name.toLowerCase()}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Shimmer effect */}
                {!item.current && (
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer-wave"></span>
                )}
                
                <Icon className={cn(
                  "h-5 w-5 mr-3 relative z-10",
                  item.current && "animate-scale-pulse"
                )} />
                <span className="relative z-10">{item.name}</span>
                
                {item.current && (
                  <Sparkles className="h-3 w-3 ml-auto relative z-10 animate-pulse" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
