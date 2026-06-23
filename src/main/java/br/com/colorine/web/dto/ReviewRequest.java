package br.com.colorine.web.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReviewRequest(@NotNull Long orderId, @NotNull Long productId, @Min(1) @Max(5) int rating, @NotBlank @Size(max = 280) String comment) {
}
