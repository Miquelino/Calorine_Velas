# Fluxo de Status do Pedido

```mermaid
flowchart TD
  A["Pedido criado"] --> B["Pagamento: Pendente<br/>Andamento: Recebido<br/>Estoque reservado"]

  B -->|"Cliente/Admin cancela antes do pagamento"| C["Pagamento: Cancelado<br/>Andamento: Cancelado<br/>Estoque devolvido"]

  B -->|"Admin confirma pagamento ou cliente paga"| D["Pagamento: Pago<br/>Andamento: Recebido"]

  D -->|"Admin avanca"| E["Andamento: Preparando"]
  E -->|"Admin avanca"| F["Andamento: Enviado"]
  F -->|"Admin avanca"| G["Andamento: Entregue"]

  G --> H["Avaliacao liberada para o cliente"]

  D -->|"Admin cancela antes do envio"| I["Pagamento: Estornado<br/>Andamento: Cancelado<br/>Estoque devolvido"]
  E -->|"Admin cancela antes do envio"| I

  F -->|"Cancelamento bloqueado nesse fluxo"| F
  G -->|"Cancelamento bloqueado nesse fluxo"| G
```

## Estados de pagamento

- `PENDING`: pagamento pendente.
- `PAID`: pagamento confirmado.
- `REFUNDED`: pagamento estornado após cancelamento administrativo.
- `CANCELED`: pagamento cancelado antes de ser confirmado.

## Estados de andamento

- `CREATED`: pedido recebido.
- `PREPARING`: pedido em preparação.
- `SHIPPED`: pedido enviado.
- `DELIVERED`: pedido entregue.
- `CANCELED`: pedido cancelado.

## Regras principais

- O pedido nasce com pagamento pendente e andamento recebido.
- O estoque é reservado quando o pedido é criado.
- O cupom só conta uso quando o pagamento é confirmado.
- O andamento só avança depois do pagamento confirmado.
- O admin não deve pular etapas de andamento.
- O cliente só cancela antes do pagamento.
- Pedido pago cancelado pelo admin vira estornado e devolve estoque.
