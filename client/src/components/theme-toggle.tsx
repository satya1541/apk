import { useEffect, useState, memo } from "react";
import { cn } from "@/lib/utils";

type ThemeMode = "light" | "auto" | "dark";

// SVG icons from the reference design (scaled down) - memoized for performance
const SunIcon = memo(() => (
  <svg width="35" height="35" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4">
    <path d="M17.5 35L14.2959 28.5439C15.3133 28.8386 16.3877 29 17.5 29C18.612 29 19.686 28.8384 20.7031 28.5439L17.5 35ZM7.42383 23.0449C8.47439 24.9499 10.0492 26.5244 11.9541 27.5752L5.12598 29.874L7.42383 23.0449ZM29.874 29.874L23.0449 27.5752C24.95 26.5245 26.5245 24.95 27.5752 23.0449L29.874 29.874ZM17.5 7.09961C18.8796 7.09961 20.1957 7.30664 21.4326 7.69336L23.0449 1.42383C21.0986 0.792969 19.0186 0.455078 16.8623 0.455078C14.707 0.455078 12.627 0.792969 10.6807 1.42383L12.293 7.69336C13.5299 7.30664 14.646 7.09961 17.5 7.09961ZM0 17.5C0 19.6553 0.337891 21.7354 0.96875 23.6816L7.23828 22.0693C6.8515 20.8325 6.64453 19.543 6.64453 17.5C6.64453 15.457 6.8515 14.1675 7.23828 12.9307L0.96875 11.3184C0.337891 13.2646 0 15.3447 0 17.5ZM34.0312 11.3184L27.7617 12.9307C28.1484 14.1675 28.3555 15.457 28.3555 17.5C28.3555 19.543 28.1484 20.8325 27.7617 22.0693L34.0312 23.6816C34.6621 21.7354 35 19.6553 35 17.5C35 15.3447 34.6621 13.2646 34.0312 11.3184Z" fill="currentColor"/>
  </svg>
));

const AutoIcon = memo(() => (
  <svg width="35" height="35" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4">
    <path d="M22.772 25.604H11.714L9.814 31H5.292L14.754 4.552H19.77L29.232 31H24.672L22.772 25.604ZM21.556 22.07L17.262 9.796L12.93 22.07H21.556Z" fill="currentColor"/>
  </svg>
));

const MoonIcon = memo(() => (
  <svg width="35" height="35" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4">
    <path d="M21.6271 3.69749C29.3005 6.36716 33.9066 14.9306 31.2599 22.5389C28.6128 30.1472 19.5868 34.2667 12.1964 31.0863C10.2361 30.2427 8.47849 29.0834 7.00306 27.6944C13.4772 29.12 20.141 25.5029 22.3758 19.0799C24.5821 12.7383 21.7058 5.86091 15.8955 2.8956C17.7836 2.78471 19.7266 3.03636 21.6271 3.69749Z" fill="currentColor"/>
  </svg>
));

export const ThemeToggle = memo(function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
  const savedTheme = localStorage.getItem("theme") as ThemeMode;
  const initialTheme = savedTheme || "light";
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  useEffect(() => {
    if (theme === "auto") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme("auto");
      
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  const applyTheme = (mode: ThemeMode) => {
    if (mode === "dark") {
      document.documentElement.classList.add("dark");
    } else if (mode === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      // Auto mode: follow system preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  const setThemeMode = (mode: ThemeMode) => {
    if (mode === theme) return; // Don't do anything if already in this mode
    
    setTheme(mode);
    localStorage.setItem("theme", mode);
    applyTheme(mode);
  };

  const getSliderPosition = () => {
    if (theme === "light") return "left-[7px]";
    if (theme === "auto") return "left-[37px]";
    return "left-[67px]";
  };

  const getBackgroundColor = () => {
    if (theme === "light") return "bg-gradient-to-r from-blue-200 to-blue-300 dark:from-blue-800/40 dark:to-blue-900/40";
    if (theme === "auto") return "bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-800";
    return "bg-gradient-to-r from-purple-300 to-indigo-400 dark:from-purple-800/50 dark:to-indigo-900/50";
  };

  const getSliderIcon = () => {
    if (theme === "light") return <SunIcon />;
    if (theme === "auto") return <AutoIcon />;
    return <MoonIcon />;
  };

  return (
    <div
      className={cn(
        "relative w-[90px] h-[30px] rounded-full shadow-md",
        getBackgroundColor()
      )}
      style={{
        transition: "background 150ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      aria-label="Toggle theme"
      data-testid="button-theme-toggle"
    >
      {/* Clickable icon areas */}
      <div className="absolute inset-0 flex items-center justify-between px-[7px]">
        <button
          onClick={() => setThemeMode("light")}
          className="w-[18px] h-[18px] flex items-center justify-center hover:scale-125 transition-transform z-10"
          aria-label="Light mode"
          data-testid="button-theme-light"
        >
          <SunIcon />
        </button>
        <button
          onClick={() => setThemeMode("auto")}
          className="w-[18px] h-[18px] flex items-center justify-center hover:scale-125 transition-transform z-10"
          aria-label="Auto mode"
          data-testid="button-theme-auto"
        >
          <AutoIcon />
        </button>
        <button
          onClick={() => setThemeMode("dark")}
          className="w-[18px] h-[18px] flex items-center justify-center hover:scale-125 transition-transform z-10"
          aria-label="Dark mode"
          data-testid="button-theme-dark"
        >
          <MoonIcon />
        </button>
      </div>
      
      {/* Slider thumb */}
      <div
        className={cn(
          "absolute top-[5px] w-[20px] h-[20px] rounded-full bg-gray-800 dark:bg-gray-700 shadow-lg flex items-center justify-center pointer-events-none",
          getSliderPosition()
        )}
        style={{
          boxShadow: "2px 2px 4px 0px rgba(0,0,0,0.30)",
          transition: "left 200ms cubic-bezier(0.4, 0, 0.2, 1), background-color 150ms ease",
        }}
      >
        <div className="text-white">
          {getSliderIcon()}
        </div>
      </div>
    </div>
  );
});
