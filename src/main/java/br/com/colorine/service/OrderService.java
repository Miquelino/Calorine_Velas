package br.com.colorine.service;

import br.com.colorine.domain.CandleProduct;
import br.com.colorine.domain.CustomerOrder;
import br.com.colorine.domain.OrderItem;
import br.com.colorine.domain.OrderStatus;
import br.com.colorine.domain.PaymentStatus;
import br.com.colorine.domain.UserAccount;
import br.com.colorine.domain.UserRole;
import br.com.colorine.repository.CandleProductRepository;
import br.com.colorine.repository.CustomerOrderRepository;
import br.com.colorine.repository.ProductReviewRepository;
import br.com.colorine.repository.UserAccountRepository;
import br.com.colorine.web.dto.OrderItemRequest;
import br.com.colorine.web.dto.OrderItemResponse;
import br.com.colorine.web.dto.OrderEventResponse;
import br.com.colorine.web.dto.OrderRequest;
import br.com.colorine.web.dto.OrderResponse;
import java.math.BigDecimal;
import java.util.List;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {

  private final CustomerOrderRepository orders;
  private final UserAccountRepository users;
  private final CandleProductRepository candles;
  private final ProductReviewRepository reviews;
  private final CouponService couponService;

  public OrderService(CustomerOrderRepository orders, UserAccountRepository users, CandleProductRepository candles, ProductReviewRepository reviews, CouponService couponService) {
    this.orders = orders;
    this.users = users;
    this.candles = candles;
    this.reviews = reviews;
    this.couponService = couponService;
  }

  @Transactional
  public OrderResponse create(OrderRequest request, UserAccount currentUser) {
    UserAccount customer = currentUser.getRole() == UserRole.ADMIN && !currentUser.getId().equals(request.customerId())
        ? users.findById(request.customerId()).orElseThrow(() -> new IllegalArgumentException("Cliente nao encontrado."))
        : currentUser;

    CustomerOrder order = new CustomerOrder();
    order.setCustomer(customer);
    order.setStatus(OrderStatus.CREATED);
    order.setPaymentStatus(PaymentStatus.PENDING);
    order.setDeliveryAddress(request.deliveryAddress().trim());
    order.setPaymentMethod(request.paymentMethod());
    order.setCouponCode(request.couponCode() == null ? "" : request.couponCode().trim().toUpperCase());
    order.setDiscountTotal(BigDecimal.ZERO);
    order.setShippingCep(request.shippingCep() == null ? "" : request.shippingCep().trim());
    order.setShippingService(request.shippingService() == null ? "" : request.shippingService().trim());
    order.setShippingCost(request.shippingCost() == null ? BigDecimal.ZERO : request.shippingCost());
    order.setShippingDays(request.shippingDays());
    order.setPaymentSimulation(request.paymentSimulation() == null ? "" : request.paymentSimulation().trim());

    BigDecimal subtotal = BigDecimal.ZERO;
    for (OrderItemRequest itemRequest : request.items()) {
      CandleProduct product = candles.findById(itemRequest.productId())
          .orElseThrow(() -> new IllegalArgumentException("Vela nao encontrada."));
      if (!product.isActive() || product.getStock() < itemRequest.quantity()) {
        throw new IllegalArgumentException("Estoque insuficiente para " + product.getName() + ".");
      }
      product.setStock(product.getStock() - itemRequest.quantity());

      OrderItem item = new OrderItem();
      item.setProduct(product);
      item.setQuantity(itemRequest.quantity());
      item.setUnitPrice(product.getPrice());
      order.addItem(item);
      subtotal = subtotal.add(product.getPrice().multiply(BigDecimal.valueOf(itemRequest.quantity())));
    }

    if (!order.getCouponCode().isBlank()) {
      var validation = couponService.validate(order.getCouponCode(), subtotal, order.getShippingCost());
      if (!validation.valid()) throw new IllegalArgumentException(validation.message());
      order.setDiscountTotal(validation.discountTotal());
      if (validation.freeShipping()) order.setShippingCost(BigDecimal.ZERO);
    }

    order.setTotal(subtotal.subtract(order.getDiscountTotal()).add(order.getShippingCost()).max(BigDecimal.ZERO));
    order.setEmailNotification("Pedido recebido e aguardando a confirmacao do pagamento.");
    order.addEvent("Pedido recebido", "Pedido registrado, estoque reservado e pagamento pendente.");
    return toResponse(orders.save(order));
  }

  @Transactional
  public OrderResponse confirmPayment(Long id, UserAccount currentUser) {
    CustomerOrder order = orders.findById(id)
        .orElseThrow(() -> new IllegalArgumentException("Pedido nao encontrado."));
    if (currentUser.getRole() != UserRole.ADMIN && !order.getCustomer().getId().equals(currentUser.getId())) {
      throw new IllegalArgumentException("Este pedido nao pertence a sua conta.");
    }
    if (order.getPaymentStatus() != PaymentStatus.PENDING) {
      throw new IllegalArgumentException("Este pedido nao esta aguardando pagamento.");
    }
    if (order.getStatus() == OrderStatus.CANCELED) {
      throw new IllegalArgumentException("Pedido cancelado nao pode receber pagamento.");
    }
    order.setPaymentStatus(PaymentStatus.PAID);
    couponService.registerUse(order.getCouponCode());
    order.setEmailNotification("Pagamento confirmado. E-mail simulado enviado para " + order.getCustomer().getEmail() + ".");
    order.addEvent("Pagamento confirmado", "Pagamento confirmado no painel de pagamento.");
    return toResponse(order);
  }

  @Transactional(readOnly = true)
  public List<OrderResponse> listByCustomer(Long customerId) {
    if (!users.existsById(customerId)) throw new IllegalArgumentException("Cliente nao encontrado.");
    return orders.findByCustomerIdOrderByCreatedAtDesc(customerId).stream().map(this::toResponse).toList();
  }

  @Transactional(readOnly = true)
  public List<OrderResponse> listAll() {
    return orders.findAllByOrderByCreatedAtDesc().stream().map(this::toResponse).toList();
  }

  @Transactional
  public OrderResponse updateStatus(Long id, OrderStatus status) {
    CustomerOrder order = orders.findById(id)
        .orElseThrow(() -> new IllegalArgumentException("Pedido nao encontrado."));
    OrderStatus previous = order.getStatus();
    if (previous == OrderStatus.CANCELED && status != OrderStatus.CANCELED) {
      throw new IllegalArgumentException("Pedido cancelado nao pode voltar para outro status.");
    }
    if (status == OrderStatus.CANCELED) {
      return cancel(id, null);
    }
    validateLogisticsTransition(order, status);
    order.setStatus(status);
    if (status == OrderStatus.DELIVERED && order.getReviewRequestedAt() == null) {
      order.setReviewRequestedAt(Instant.now());
      order.setReviewNotification("Seu pedido foi entregue. Conte como foi sua experiencia com os produtos.");
      order.setEmailNotification("E-mail simulado enviado para " + order.getCustomer().getEmail() + " solicitando a avaliacao dos produtos entregues.");
    }
    if (previous != status) {
      order.addEvent("Status alterado", optionLabel(previous) + " para " + optionLabel(status) + ".");
    }
    return toResponse(order);
  }

  @Transactional
  public OrderResponse cancel(Long id, UserAccount currentUser) {
    CustomerOrder order = orders.findById(id)
        .orElseThrow(() -> new IllegalArgumentException("Pedido nao encontrado."));
    if (currentUser != null && currentUser.getRole() != UserRole.ADMIN && !order.getCustomer().getId().equals(currentUser.getId())) {
      throw new IllegalArgumentException("Este pedido nao pertence a sua conta.");
    }
    if (order.getStatus() == OrderStatus.CANCELED) {
      throw new IllegalArgumentException("Pedido ja esta cancelado.");
    }
    if (order.getStatus() == OrderStatus.SHIPPED || order.getStatus() == OrderStatus.DELIVERED) {
      throw new IllegalArgumentException("Pedido enviado ou entregue nao pode ser cancelado por este fluxo.");
    }
    restoreStock(order);
    order.setStatus(OrderStatus.CANCELED);
    if (order.getPaymentStatus() == PaymentStatus.PAID) {
      order.setPaymentStatus(PaymentStatus.REFUNDED);
      order.setEmailNotification("Pedido cancelado. Estorno simulado registrado e estoque devolvido.");
      order.addEvent("Pedido cancelado", "Pedido pago cancelado com estorno simulado e estoque devolvido.");
    } else {
      order.setPaymentStatus(PaymentStatus.CANCELED);
      order.setEmailNotification("Pedido cancelado antes do pagamento. Estoque devolvido automaticamente.");
      order.addEvent("Pedido cancelado", "Pedido cancelado antes do pagamento e estoque devolvido.");
    }
    return toResponse(order);
  }

  private void validateLogisticsTransition(CustomerOrder order, OrderStatus target) {
    if (order.getPaymentStatus() != PaymentStatus.PAID) {
      throw new IllegalArgumentException("Confirme o pagamento antes de alterar o andamento do pedido.");
    }
    OrderStatus current = order.getStatus();
    OrderStatus expected = switch (current) {
      case CREATED -> OrderStatus.PREPARING;
      case PREPARING -> OrderStatus.SHIPPED;
      case SHIPPED -> OrderStatus.DELIVERED;
      case DELIVERED -> OrderStatus.DELIVERED;
      case CANCELED -> OrderStatus.CANCELED;
    };
    if (target == current) return;
    if (target != expected) {
      throw new IllegalArgumentException("Fluxo invalido. Proximo status permitido: " + optionLabel(expected) + ".");
    }
    if (current == OrderStatus.DELIVERED) {
      throw new IllegalArgumentException("Pedido entregue nao pode mudar de status.");
    }
  }

  private void restoreStock(CustomerOrder order) {
    for (OrderItem item : order.getItems()) {
      CandleProduct product = item.getProduct();
      product.setStock(product.getStock() + item.getQuantity());
    }
  }

  private String optionLabel(OrderStatus status) {
    return switch (status) {
      case CREATED -> "Recebido";
      case PREPARING -> "Preparando";
      case SHIPPED -> "Enviado";
      case DELIVERED -> "Entregue";
      case CANCELED -> "Cancelado";
    };
  }

  private OrderResponse toResponse(CustomerOrder order) {
    return new OrderResponse(
        order.getId(), order.getCustomer().getName(), order.getCustomer().getEmail(), order.getCustomer().getPhone(),
        order.getDeliveryAddress(),
        order.getItems().stream().map(item -> new OrderItemResponse(
            item.getProduct().getId(), item.getProduct().getName(), item.getQuantity(), item.getUnitPrice(),
            order.getStatus() == OrderStatus.DELIVERED
                && !reviews.existsByCustomerIdAndProductIdAndOrderId(order.getCustomer().getId(), item.getProduct().getId(), order.getId())
        )).toList(),
        order.getTotal(), order.getCouponCode(), order.getDiscountTotal(), order.getShippingCep(), order.getShippingService(),
        order.getShippingCost(), order.getShippingDays(), order.getPaymentSimulation(), order.getEmailNotification(),
        order.getPaymentMethod(), order.getPaymentStatus(), order.getStatus(), order.getReviewRequestedAt(), order.getReviewNotification(),
        order.getEvents().stream()
            .map(event -> new OrderEventResponse(event.getTitle(), event.getDescription(), event.getCreatedAt()))
            .toList(),
        order.getCreatedAt());
  }
}
