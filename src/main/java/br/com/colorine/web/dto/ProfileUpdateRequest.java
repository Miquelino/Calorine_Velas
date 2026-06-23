package br.com.colorine.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ProfileUpdateRequest(
    @NotBlank @Size(max = 80) String name,
    @NotBlank @Size(max = 20) String phone,
    boolean acceptsMarketing,
    @NotNull @Valid AddressRequest address
) {
}
