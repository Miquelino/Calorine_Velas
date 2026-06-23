package br.com.colorine.service;

import br.com.colorine.domain.CustomerOrder;
import br.com.colorine.domain.OrderStatus;
import br.com.colorine.domain.ProductReview;
import br.com.colorine.domain.UserAccount;
import br.com.colorine.repository.CustomerOrderRepository;
import br.com.colorine.repository.ProductReviewRepository;
import br.com.colorine.web.dto.ReviewEligibilityResponse;
import br.com.colorine.web.dto.ReviewRequest;
import br.com.colorine.web.dto.ReviewResponse;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReviewService {
  private final ProductReviewRepository reviews;
  private final CustomerOrderRepository orders;

  public ReviewService(ProductReviewRepository reviews, CustomerOrderRepository orders) {
    this.reviews = reviews;
    this.orders = orders;
  }

  @Transactional(readOnly = true)
  public List<ReviewResponse> listByProduct(Long productId) {
    return reviews.findByProductIdOrderByCreatedAtDesc(productId).stream().map(this::toResponse).toList();
  }

  @Transactional(readOnly = true)
  public List<ReviewEligibilityResponse> eligible(UserAccount customer) {
    List<ReviewEligibilityResponse> result = new ArrayList<>();
    for (CustomerOrder order : orders.findByCustomerIdOrderByCreatedAtDesc(customer.getId())) {
      if (order.getStatus() != OrderStatus.DELIVERED) continue;
      order.getItems().forEach(item -> {
        if (!reviews.existsByCustomerIdAndProductIdAndOrderId(customer.getId(), item.getProduct().getId(), order.getId())) {
          result.add(new ReviewEligibilityResponse(order.getId(), item.getProduct().getId(), item.getProduct().getName(), order.getReviewRequestedAt()));
        }
      });
    }
    return result;
  }

  @Transactional
  public ReviewResponse create(UserAccount customer, ReviewRequest request) {
    CustomerOrder order = orders.findById(request.orderId()).orElseThrow(() -> new IllegalArgumentException("Pedido nao encontrado."));
    if (!order.getCustomer().getId().equals(customer.getId())) throw new IllegalArgumentException("Este pedido nao pertence a sua conta.");
    if (order.getStatus() != OrderStatus.DELIVERED) throw new IllegalArgumentException("A avaliacao fica disponivel depois que o pedido for entregue.");
    var item = order.getItems().stream().filter(value -> value.getProduct().getId().equals(request.productId())).findFirst()
        .orElseThrow(() -> new IllegalArgumentException("Este produto nao faz parte do pedido."));
    if (reviews.existsByCustomerIdAndProductIdAndOrderId(customer.getId(), request.productId(), order.getId())) {
      throw new IllegalArgumentException("Este produto ja foi avaliado neste pedido.");
    }
    ProductReview review = new ProductReview();
    review.setCustomer(customer);
    review.setProduct(item.getProduct());
    review.setOrder(order);
    review.setRating(request.rating());
    review.setComment(request.comment().trim());
    return toResponse(reviews.save(review));
  }

  private ReviewResponse toResponse(ProductReview review) {
    String name = review.getCustomer().getName().trim();
    String author = name.contains(" ") ? name.substring(0, name.indexOf(' ')) : name;
    return new ReviewResponse(review.getId(), review.getProduct().getId(), author, review.getRating(), review.getComment(), review.getCreatedAt());
  }
}
