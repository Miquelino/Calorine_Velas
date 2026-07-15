package br.com.colorine.service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ImageStorageService {

  private static final Map<String, String> EXTENSIONS = Map.of(
      "image/jpeg", ".jpg",
      "image/png", ".png",
      "image/webp", ".webp"
  );

  public String store(MultipartFile file) {
    if (file == null || file.isEmpty()) throw new IllegalArgumentException("Selecione uma imagem.");
    String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
    String extension = EXTENSIONS.get(contentType);
    if (extension == null) throw new IllegalArgumentException("Use imagem JPG, PNG ou WEBP.");
    if (file.getSize() > 3 * 1024 * 1024) throw new IllegalArgumentException("Escolha uma imagem com ate 3 MB.");
    try {
      Path folder = Path.of("uploads", "products");
      Files.createDirectories(folder);
      String filename = UUID.randomUUID() + extension;
      Path target = folder.resolve(filename);
      file.transferTo(target);
      return "/uploads/products/" + filename;
    } catch (Exception error) {
      throw new IllegalArgumentException("Nao foi possivel salvar a imagem.");
    }
  }
}
