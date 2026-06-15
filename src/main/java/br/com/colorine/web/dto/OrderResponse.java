package br.com.colorine.web.dto;

import br.com.colorine.domain.OrderStatus;
import br.com.colorine.domain.PaymentMethod;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record OrderResponse(
    Long id,
    String customerName,
    String deliveryAddress,
    List<OrderItemResponse> items,
    BigDecimal total,
    String couponCode,
    BigDecimal discountTotal,
    BigDecimal shippingCost,
    Integer shippingDays,
    String paymentSimulation,
    String emailNotification,
    PaymentMethod paymentMethod,
    OrderStatus status,
    Instant createdAt
) {
}
