package br.com.colorine.service;

import br.com.colorine.domain.CandleProduct;
import br.com.colorine.repository.CandleProductRepository;
import br.com.colorine.web.dto.CandleRequest;
import br.com.colorine.web.dto.CandleResponse;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CandleService {

  private final CandleProductRepository candles;

  public CandleService(CandleProductRepository candles) {
    this.candles = candles;
  }

  @Transactional(readOnly = true)
  public List<CandleResponse> listActive() {
    return candles.findByActiveTrueOrderByName().stream()
        .map(this::toResponse)
        .toList();
  }

  @Transactional
  public CandleResponse create(CandleRequest request) {
    CandleProduct candle = new CandleProduct();
    applyRequest(candle, request);
    candle.setActive(true);
    return toResponse(candles.save(candle));
  }

  @Transactional
  public CandleResponse update(Long id, CandleRequest request) {
    CandleProduct candle = findById(id);
    applyRequest(candle, request);
    return toResponse(candle);
  }

  @Transactional
  public void deactivate(Long id) {
    CandleProduct candle = findById(id);
    candle.setActive(false);
  }

  private CandleProduct findById(Long id) {
    return candles.findById(id)
        .orElseThrow(() -> new IllegalArgumentException("Vela nao encontrada."));
  }

  private void applyRequest(CandleProduct candle, CandleRequest request) {
    candle.setName(request.name().trim());
    candle.setScent(request.scent().trim());
    candle.setDescription(request.description().trim());
    candle.setPrice(request.price());
    candle.setStock(request.stock());
    candle.setColor(request.color().trim());
    candle.setSize(request.size().trim());
    candle.setOccasion(request.occasion().trim());
    candle.setMood(request.mood().trim());
    candle.setImageUrl(request.imageUrl());
    candle.setExtraImageUrlOne(request.extraImageUrlOne());
    candle.setExtraImageUrlTwo(request.extraImageUrlTwo());
  }

  private CandleResponse toResponse(CandleProduct candle) {
    return new CandleResponse(
        candle.getId(),
        candle.getName(),
        candle.getScent(),
        candle.getDescription(),
        candle.getPrice(),
        candle.getStock(),
        candle.getColor(),
        candle.getSize(),
        candle.getOccasion(),
        candle.getMood(),
        candle.getImageUrl(),
        candle.getExtraImageUrlOne(),
        candle.getExtraImageUrlTwo(),
        candle.isActive()
    );
  }
}


