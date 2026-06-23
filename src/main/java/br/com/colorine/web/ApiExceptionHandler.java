package br.com.colorine.web;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

  @ExceptionHandler(IllegalArgumentException.class)
  ResponseEntity<Map<String, String>> handleIllegalArgument(IllegalArgumentException error) {
    return ResponseEntity.badRequest().body(Map.of("message", error.getMessage()));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException error) {
    String message = error.getBindingResult().getFieldErrors().stream()
        .findFirst()
        .map(field -> "Campo invalido: " + field.getField())
        .orElse("Dados invalidos.");
    return ResponseEntity.badRequest().body(Map.of("message", message));
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<Map<String, String>> handleUnexpected(Exception error) {
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Erro interno: " + error.getMessage()));
  }
}
