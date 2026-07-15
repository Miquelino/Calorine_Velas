package br.com.colorine.web.dto;

import java.math.BigDecimal;

public record CouponValidationResponse(
    String code,
    boolean valid,
    String message,
    BigDecimal discountTotal,
    BigDecimal shippingDiscount,
    boolean freeShipping
) {
}
