import { memo } from "react";
import clinoLogo from "@assets/Clino logo_1753252530778.png";
import { Shield } from "lucide-react";

export const Footer = memo(function Footer() {
  return (
    <footer className="glass-header mt-8 border-t border-white/20 animate-slide-in-bottom relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        {/* Main Footer Content */}
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-6">
          {/* Powered By Section */}
          <div className="flex items-center space-x-2 animate-fade-in-scale">
            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Powered by</span>
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-lg blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
              <img 
                src={clinoLogo} 
                alt="Clino Health Logo" 
                className="h-6 relative z-10 transform group-hover:scale-110 transition-transform duration-300" 
              />
            </div>
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-6 bg-gradient-to-b from-transparent via-gray-300 to-transparent dark:via-gray-600"></div>

          {/* System Name */}
          <div className="flex items-center space-x-2 animate-fade-in-scale stagger-1">
            <Shield className="h-4 w-4 text-blue-500 animate-pulse" />
            <span className="text-xs sm:text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ToxiShield-X Monitoring System
            </span>
          </div>
        </div>

        {/* Copyright Section */}
        <div className="mt-1 pt-1 border-t border-white/10">
          <p className="text-xs text-gray-600 dark:text-gray-400 text-center animate-fade-in-scale stagger-2">
            © {new Date().getFullYear()} ToxiShield-X. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
});
