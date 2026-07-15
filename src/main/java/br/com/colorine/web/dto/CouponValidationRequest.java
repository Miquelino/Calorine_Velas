package br.com.colorine.web.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record CouponValidationRequest(
    @Size(max = 30) String code,
    @DecimalMin("0.00") BigDecimal subtotal,
    @DecimalMin("0.00") BigDecimal shippingCost
) {
}
