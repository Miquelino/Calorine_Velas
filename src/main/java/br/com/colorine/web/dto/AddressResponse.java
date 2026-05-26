package br.com.colorine.web.dto;

public record AddressResponse(
    Long id,
    String cep,
    String street,
    String number,
    String neighborhood,
    String complement,
    String city,
    String state
) {
}