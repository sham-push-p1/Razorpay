import { useEffect, useState } from "react";
import { IconSun, IconMoon } from "./Icons";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("shield_theme") as "light" | "dark") || "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("shield_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm theme-toggle-btn"
      onClick={toggleTheme}
      title={`Switch to ${theme === "light" ? "Cyber Dark" : "Razorpay Light"} mode`}
    >
      {theme === "light" ? (
        <>
          <IconMoon size={14} />
          <span>Cyber Dark</span>
        </>
      ) : (
        <>
          <IconSun size={14} />
          <span>Light Mode</span>
        </>
      )}
    </button>
  );
}

