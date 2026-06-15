package br.com.colorine.web.dto;

import br.com.colorine.domain.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

public record OrderRequest(
    @NotNull Long customerId,
    @NotBlank @Size(max = 160) String deliveryAddress,
    @NotNull PaymentMethod paymentMethod,
    @Size(max = 30) String couponCode,
    BigDecimal discountTotal,
    @Size(max = 12) String shippingCep,
    BigDecimal shippingCost,
    Integer shippingDays,
    @Size(max = 30) String paymentSimulation,
    @NotEmpty List<@Valid OrderItemRequest> items
) {
}
