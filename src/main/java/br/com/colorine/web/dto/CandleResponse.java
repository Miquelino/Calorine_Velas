package br.com.colorine.web.dto;

import java.math.BigDecimal;

public record CandleResponse(
    Long id,
    String name,
    String scent,
    String description,
    BigDecimal price,
    int stock,
    String color,
    String size,
    String occasion,
    String mood,
    String imageUrl,
    String extraImageUrlOne,
    String extraImageUrlTwo,
    boolean active
) {
}
