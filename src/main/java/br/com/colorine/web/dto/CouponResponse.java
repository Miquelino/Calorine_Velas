package br.com.colorine.web.dto;

import br.com.colorine.domain.CouponType;
import java.math.BigDecimal;
import java.time.LocalDate;

public record CouponResponse(
    Long id,
    String code,
    CouponType type,
    BigDecimal value,
    BigDecimal minimumSubtotal,
    Integer usageLimit,
    int usedCount,
    LocalDate validUntil,
    boolean active
) {
}
