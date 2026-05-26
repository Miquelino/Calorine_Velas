package br.com.colorine.web.dto;

import br.com.colorine.domain.OrderStatus;
import br.com.colorine.domain.PaymentMethod;
import java.math.BigDecimal;
import java.time.Instant;

public record OrderResponse(
    Long id,
    String customerName,
    BigDecimal total,
    PaymentMethod paymentMethod,
    OrderStatus status,
    Instant createdAt
) {
}
