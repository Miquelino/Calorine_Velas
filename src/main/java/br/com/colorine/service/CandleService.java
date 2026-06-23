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
    return candles.findByActiveTrueOrderByName().stream().map(this::toResponse).toList();
  }

  @Transactional(readOnly = true)
  public List<CandleResponse> listAll() {
    return candles.findAllByOrderByName().stream().map(this::toResponse).toList();
  }

  @Transactional
  public CandleResponse create(CandleRequest request) {
    CandleProduct candle = new CandleProduct();
    applyRequest(candle, request);
    candle.setActive(request.active() == null || request.active());
    return toResponse(candles.save(candle));
  }

  @Transactional
  public CandleResponse update(Long id, CandleRequest request) {
    CandleProduct candle = findById(id);
    applyRequest(candle, request);
    return toResponse(candle);
  }

  @Transactional
  public CandleResponse setActive(Long id, boolean active) {
    CandleProduct candle = findById(id);
    candle.setActive(active);
    return toResponse(candle);
  }

  @Transactional
  public void deactivate(Long id) {
    findById(id).setActive(false);
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
    candle.setMinimumStock(request.minimumStock() == null ? 5 : request.minimumStock());
    if (request.active() != null) candle.setActive(request.active());
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
        candle.getId(), candle.getName(), candle.getScent(), candle.getDescription(), candle.getPrice(),
        candle.getStock(), candle.getMinimumStock(), candle.getColor(), candle.getSize(), candle.getOccasion(),
        candle.getMood(), candle.getImageUrl(), candle.getExtraImageUrlOne(), candle.getExtraImageUrlTwo(), candle.isActive());
  }
}
