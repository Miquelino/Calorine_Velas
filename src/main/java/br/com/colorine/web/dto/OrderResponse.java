package br.com.colorine.web.dto;

import br.com.colorine.domain.OrderStatus;
import br.com.colorine.domain.PaymentMethod;
import br.com.colorine.domain.PaymentStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record OrderResponse(
    Long id,
    String customerName,
    String customerEmail,
    String customerPhone,
    String deliveryAddress,
    List<OrderItemResponse> items,
    BigDecimal total,
    String couponCode,
    BigDecimal discountTotal,
    String shippingCep,
    String shippingService,
    BigDecimal shippingCost,
    Integer shippingDays,
    String paymentSimulation,
    String emailNotification,
    PaymentMethod paymentMethod,
    PaymentStatus paymentStatus,
    OrderStatus status,
    Instant reviewRequestedAt,
    String reviewNotification,
    List<OrderEventResponse> events,
    Instant createdAt
) {
}
