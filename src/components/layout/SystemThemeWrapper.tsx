import { useSystemTheme } from "@/contexts/SystemThemeContext";

/**
 * Wrapper que aplica o tema claro/escuro apenas dentro dos sistemas.
 * As páginas públicas (home, categorias, etc.) não são afetadas.
 */
export function SystemThemeWrapper({ children }: { children: React.ReactNode }) {
  const { systemTheme } = useSystemTheme();

  return (
    <div className={systemTheme === 'light' ? 'light' : ''} style={{ minHeight: '100vh' }}>
      {children}
    </div>
  );
}
