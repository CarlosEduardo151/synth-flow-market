import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * HONEYPOT ROUTE
 * 
 * Esta página é uma rota-isca: sistemas de scan automatizado e atacantes que
 * procuram painéis de admin acessíveis costumam tentar /admin, /wp-admin, /phpmyadmin.
 * 
 * Quando alguém acessa, o IP é registrado na tabela `security_blocklist` via edge
 * function. A página renderiza um 404 falso para não revelar a armadilha.
 * 
 * O painel administrativo REAL fica em /admin/dashboard, /admin/financial, etc.
 * (rotas filhas, nunca a raiz /admin).
 */
export default function HoneypotPage() {
  useEffect(() => {
    // Dispara registro silencioso (não bloqueia render, não vaza erro)
    supabase.functions
      .invoke('honeypot', {
        body: {
          route: window.location.pathname,
          referrer: document.referrer || null,
        },
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
        <p className="mt-4 text-lg text-muted-foreground">Página não encontrada</p>
        <a href="/" className="mt-6 inline-block text-primary hover:underline">
          Voltar ao início
        </a>
      </div>
    </div>
  );
}
