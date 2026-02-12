import { OperationStep } from "@/types/product";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CheckCircle2, AlertTriangle, Lightbulb } from "lucide-react";
import { motion } from "framer-motion";

interface OperationManualProps {
  steps: OperationStep[];
  productTitle: string;
}

export function OperationManual({ steps, productTitle }: OperationManualProps) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
      <CardHeader className="border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Manual de Operação</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Guia completo para ativar e usar o {productTitle}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Alerta importante */}
        <div className="bg-warning/10 border-b border-warning/20 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-warning">Importante</p>
            <p className="text-xs text-muted-foreground">
              Siga cada etapa na ordem indicada para garantir a ativação correta do produto.
            </p>
          </div>
        </div>

        {/* Tabela de etapas */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-16">
                  Etapa
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-48">
                  Ação
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Detalhe Importante
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {steps.map((step, index) => (
                <motion.tr
                  key={step.step}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="hover:bg-muted/30 transition-colors group"
                >
                  <td className="px-4 py-4">
                    <Badge 
                      variant="outline" 
                      className="bg-primary/10 text-primary border-primary/30 font-mono text-sm"
                    >
                      {step.step}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className="font-medium text-foreground">{step.action}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground leading-relaxed">
                        {step.detail}
                      </span>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Dica final */}
        <div className="bg-success/10 border-t border-success/20 p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-success">Dica de Sucesso</p>
            <p className="text-xs text-muted-foreground">
              Após completar todas as etapas, aguarde até 24h para o sistema processar as configurações. 
              Em caso de dúvidas, entre em contato com nosso suporte.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
