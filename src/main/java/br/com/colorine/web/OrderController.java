package br.com.colorine.web;

import br.com.colorine.service.OrderService;
import br.com.colorine.service.SecurityService;
import br.com.colorine.web.dto.OrderRequest;
import br.com.colorine.web.dto.OrderResponse;
import br.com.colorine.web.dto.OrderStatusRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

  private final OrderService orderService;
  private final SecurityService securityService;

  public OrderController(OrderService orderService, SecurityService securityService) {
    this.orderService = orderService;
    this.securityService = securityService;
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasAnyRole('CUSTOMER', 'ADMIN')")
  public OrderResponse create(@Valid @RequestBody OrderRequest request, Authentication authentication) {
    var currentUser = securityService.currentUser(authentication);
    securityService.requireSameUserOrAdmin(currentUser, request.customerId());
    return orderService.create(request, currentUser);
  }

  @GetMapping("/customer/{customerId}")
  @PreAuthorize("hasAnyRole('CUSTOMER', 'ADMIN')")
  public List<OrderResponse> listByCustomer(@PathVariable Long customerId, Authentication authentication) {
    securityService.requireSameUserOrAdmin(securityService.currentUser(authentication), customerId);
    return orderService.listByCustomer(customerId);
  }

  @GetMapping
  @PreAuthorize("hasRole('ADMIN')")
  public List<OrderResponse> listAll() {
    return orderService.listAll();
  }

  @PutMapping("/{id}/status")
  @PreAuthorize("hasRole('ADMIN')")
  public OrderResponse updateStatus(@PathVariable Long id, @Valid @RequestBody OrderStatusRequest request) {
    return orderService.updateStatus(id, request.status());
  }
}
