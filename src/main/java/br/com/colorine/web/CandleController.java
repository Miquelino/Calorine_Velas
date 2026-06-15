package br.com.colorine.web;

import br.com.colorine.service.CandleService;
import br.com.colorine.web.dto.CandleRequest;
import br.com.colorine.web.dto.CandleResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/candles")
public class CandleController {

  private final CandleService candleService;

  public CandleController(CandleService candleService) {
    this.candleService = candleService;
  }

  @GetMapping
  public List<CandleResponse> list() {
    return candleService.listActive();
  }

  @GetMapping("/admin")
  @PreAuthorize("hasRole('ADMIN')")
  public List<CandleResponse> listAdmin() {
    return candleService.listAll();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasRole('ADMIN')")
  public CandleResponse create(@Valid @RequestBody CandleRequest request) {
    return candleService.create(request);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public CandleResponse update(@PathVariable Long id, @Valid @RequestBody CandleRequest request) {
    return candleService.update(id, request);
  }

  @PutMapping("/{id}/active/{active}")
  @PreAuthorize("hasRole('ADMIN')")
  public CandleResponse setActive(@PathVariable Long id, @PathVariable boolean active) {
    return candleService.setActive(id, active);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @PreAuthorize("hasRole('ADMIN')")
  public void delete(@PathVariable Long id) {
    candleService.deactivate(id);
  }
}
