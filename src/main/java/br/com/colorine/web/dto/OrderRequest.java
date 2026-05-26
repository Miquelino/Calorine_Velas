package br.com.colorine.web.dto;

import br.com.colorine.domain.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record OrderRequest(
    @NotNull Long customerId,
    @NotBlank @Size(max = 160) String deliveryAddress,
    @NotNull PaymentMethod paymentMethod,
    @NotEmpty List<@Valid OrderItemRequest> items
) {
}
