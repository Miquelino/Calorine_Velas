package br.com.colorine.web;

import br.com.colorine.service.ImageStorageService;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/uploads")
public class ImageUploadController {

  private final ImageStorageService images;

  public ImageUploadController(ImageStorageService images) {
    this.images = images;
  }

  @PostMapping("/images")
  @PreAuthorize("hasRole('ADMIN')")
  public Map<String, String> upload(@RequestParam("file") MultipartFile file) {
    return Map.of("url", images.store(file));
  }
}
