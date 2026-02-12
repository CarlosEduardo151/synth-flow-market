import { AdminAICredentials } from "@/components/admin/AdminAICredentials";
import { ProductAIModelAssignments } from "@/components/admin/ProductAIModelAssignments";

export function AdminAISettings() {
  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Configurações de IA</h2>
        <p className="text-sm text-muted-foreground">
          Defina as chaves (por provedor) e escolha um modelo padrão para todos os produtos, com opção de
          sobrescrever por produto.
        </p>
      </div>

      <AdminAICredentials />
      <ProductAIModelAssignments />
    </section>
  );
}
