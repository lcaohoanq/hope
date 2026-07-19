import type { AppTheme } from "@hope/shared";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import { colorsFor, type ThemeColors } from "@/lib/theme";

const STORAGE_KEY = "hope.theme";

type ThemeContextValue = {
  theme: AppTheme;
  colors: ThemeColors;
  setTheme: (theme: AppTheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: ReactNode;
  initialTheme?: AppTheme;
}) {
  const system = useColorScheme();
  const [theme, setThemeState] = useState<AppTheme>(
    initialTheme ?? (system === "dark" ? "dark" : "light"),
  );

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === "light" || stored === "dark") setThemeState(stored);
    });
  }, []);

  useEffect(() => {
    if (initialTheme) setThemeState(initialTheme);
  }, [initialTheme]);

  const setTheme = useCallback((next: AppTheme) => {
    setThemeState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo(() => ({ theme, colors: colorsFor(theme), setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
