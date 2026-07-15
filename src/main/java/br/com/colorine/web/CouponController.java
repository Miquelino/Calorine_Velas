package br.com.colorine.web;

import br.com.colorine.service.CouponService;
import br.com.colorine.web.dto.CouponRequest;
import br.com.colorine.web.dto.CouponResponse;
import br.com.colorine.web.dto.CouponValidationRequest;
import br.com.colorine.web.dto.CouponValidationResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/coupons")
public class CouponController {

  private final CouponService couponService;

  public CouponController(CouponService couponService) {
    this.couponService = couponService;
  }

  @PostMapping("/validate")
  public CouponValidationResponse validate(@Valid @RequestBody CouponValidationRequest request) {
    return couponService.validate(request.code(), request.subtotal(), request.shippingCost());
  }

  @GetMapping
  @PreAuthorize("hasRole('ADMIN')")
  public List<CouponResponse> list() {
    return couponService.list();
  }

  @PostMapping
  @PreAuthorize("hasRole('ADMIN')")
  public CouponResponse create(@Valid @RequestBody CouponRequest request) {
    return couponService.create(request);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public CouponResponse update(@PathVariable("id") Long id, @Valid @RequestBody CouponRequest request) {
    return couponService.update(id, request);
  }
}
