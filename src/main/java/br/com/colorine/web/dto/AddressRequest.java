package br.com.colorine.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AddressRequest(
    @NotBlank @Size(max = 9) String cep,
    @NotBlank @Size(max = 90) String street,
    @NotBlank @Size(max = 12) String number,
    @NotBlank @Size(max = 50) String neighborhood,
    @Size(max = 50) String complement,
    @NotBlank @Size(max = 50) String city,
    @NotBlank @Size(max = 2) String state
) {
}