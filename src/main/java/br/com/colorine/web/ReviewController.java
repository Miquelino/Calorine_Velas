package br.com.colorine.web;

import br.com.colorine.service.ReviewService;
import br.com.colorine.service.SecurityService;
import br.com.colorine.web.dto.ReviewEligibilityResponse;
import br.com.colorine.web.dto.ReviewRequest;
import br.com.colorine.web.dto.ReviewResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {
  private final ReviewService reviewService;
  private final SecurityService securityService;

  public ReviewController(ReviewService reviewService, SecurityService securityService) {
    this.reviewService = reviewService;
    this.securityService = securityService;
  }

  @GetMapping("/product/{productId}")
  public List<ReviewResponse> list(@PathVariable("productId") Long productId) { return reviewService.listByProduct(productId); }

  @GetMapping("/eligible")
  public List<ReviewEligibilityResponse> eligible(Authentication authentication) {
    return reviewService.eligible(securityService.currentUser(authentication));
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ReviewResponse create(@Valid @RequestBody ReviewRequest request, Authentication authentication) {
    return reviewService.create(securityService.currentUser(authentication), request);
  }
}
