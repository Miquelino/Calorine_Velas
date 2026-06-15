package br.com.colorine.web.dto;

import br.com.colorine.domain.OrderStatus;
import jakarta.validation.constraints.NotNull;

public record OrderStatusRequest(
    @NotNull OrderStatus status
) {
}
