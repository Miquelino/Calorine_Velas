package br.com.colorine.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
    @NotBlank @Size(max = 80) String name,
    @NotBlank @Size(max = 20) String phone,
    @NotBlank @Email @Size(max = 120) String email,
    @NotBlank @Size(min = 6, max = 80) String password,
    @Valid @NotNull AddressRequest address,
    boolean acceptsMarketing
) {
}