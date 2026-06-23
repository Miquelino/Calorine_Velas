package br.com.colorine.repository;

import br.com.colorine.domain.ProductReview;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductReviewRepository extends JpaRepository<ProductReview, Long> {
  List<ProductReview> findByProductIdOrderByCreatedAtDesc(Long productId);
  boolean existsByCustomerIdAndProductIdAndOrderId(Long customerId, Long productId, Long orderId);
}
