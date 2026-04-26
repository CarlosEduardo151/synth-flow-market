Identifiquei um motivo forte no código e nos logs: a instância está presa em `connecting`, não chega em `open`, e o sistema está chamando `/instance/connect` repetidamente a cada status/cron. Além disso, o fluxo atual pode executar `/instance/logout` para tentar gerar QR novo quando reaproveita uma instância existente. Isso pode invalidar a sessão recém-escaneada e fazer o site mostrar “não conectado” mesmo pouco tempo depois.

Plano para corrigir sem desperdiçar créditos:

1. Parar de derrubar sessão automaticamente
   - Remover chamadas automáticas de `/instance/logout` nos fluxos de `connect_by_number` e `qrcode reset` quando a intenção for apenas verificar/reconectar.
   - Deixar logout/destruição apenas para ações explícitas do usuário: “Desconectar” ou “Reset total”.

2. Corrigir o self-healing para não martelar a Evolution
   - Ajustar `whatsapp-instance` e `whatsapp-auto-reconnect` para tratar `connecting` como estado intermediário, não como “reconectado”.
   - Se ficar em `connecting` por tempo demais, registrar erro claro e pedir QR novo, em vez de repetir `connect` infinitamente.
   - Aumentar o backoff real para reduzir chamadas desnecessárias ao Evolution.

3. Tornar o status mais fiel e menos confuso na interface
   - Mostrar estados diferentes: `Conectado`, `Conectando`, `QR pendente`, `Sessão expirada`, `Serviço indisponível`.
   - Trocar o texto genérico “não conectado” por instruções claras: “aguardando leitura do QR”, “sessão caiu”, ou “o provedor está lento”.
   - Evitar que a tela gere QR/reconexão automaticamente sem o usuário pedir.

4. Melhorar diagnóstico de queda
   - Fazer `whatsapp-ingest` processar `connection.update` apenas para atualizar `evolution_instances.connection_state` e salvar motivo/código da desconexão quando vier no webhook.
   - Assim, quando cair por WhatsApp/pareamento/401/logout, o painel mostra o motivo real em vez de apenas “desconectado”.

5. Reconfigurar webhook com prioridade correta e validação
   - Garantir que o webhook continue apontando para o produto principal `bots-automacao` e com fan-out para CRM/financeiro.
   - Corrigir o worker `whatsapp-auto-reconnect`, que hoje aparece com `webhookOk:false` nos logs, para configurar o webhook usando a mesma lógica testada do `whatsapp-instance`.

6. Validar depois da correção
   - Redeploy das Edge Functions afetadas.
   - Testar status da instância via função.
   - Verificar logs de `whatsapp-instance`, `whatsapp-auto-reconnect` e `whatsapp-ingest`.
   - Confirmar que a instância não recebe logout automático e que o status só fica `open` quando a Evolution retornar `open`.

Detalhe técnico importante:
```text
Estado atual observado:
Evolution: state = connecting
Banco: connection_state = connecting
Worker: marca como “reconnected” mesmo quando ainda é connecting
UI: interpreta tudo diferente de open como desconectado
Risco no código: chamadas automáticas de logout em fluxos de reconexão/QR
```

O objetivo da alteração é estabilizar a sessão: o sistema deve verificar e reconfigurar webhook, mas não deve ficar recriando/logoutando a instância por conta própria.