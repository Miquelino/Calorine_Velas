package br.com.colorine.web.dto;

import br.com.colorine.domain.CouponType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public record CouponRequest(
    @NotBlank @Size(max = 30) String code,
    @NotNull CouponType type,
    @NotNull @DecimalMin("0.00") BigDecimal value,
    @NotNull @DecimalMin("0.00") BigDecimal minimumSubtotal,
    Integer usageLimit,
    LocalDate validUntil,
    Boolean active
) {
}
