package br.com.colorine.web.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record CandleRequest(
    @NotBlank @Size(max = 60) String name,
    @NotBlank @Size(max = 60) String scent,
    @NotBlank @Size(max = 180) String description,
    @NotNull @DecimalMin("0.01") BigDecimal price,
    @Min(0) int stock,
    @NotBlank @Size(max = 30) String color,
    String imageUrl
) {
}
