package br.com.colorine.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import java.math.BigDecimal;

@Entity
public class CandleProduct {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 60)
  private String name;

  @Column(nullable = false, length = 60)
  private String scent;

  @Column(nullable = false, length = 180)
  private String description;

  @Column(nullable = false, precision = 10, scale = 2)
  private BigDecimal price;

  @Column(nullable = false)
  private int stock;

  @Column(nullable = false, length = 30)
  private String color;

  @Column(nullable = false, length = 20)
  private String size = "120g";

  @Column(nullable = false, length = 30)
  private String occasion = "classica";

  @Column(nullable = false, length = 30)
  private String mood = "aconchegante";

  @Column(nullable = false)
  private boolean active = true;

  @Lob
  @Column(columnDefinition = "CLOB")
  private String imageUrl;

  @Lob
  @Column(columnDefinition = "CLOB")
  private String extraImageUrlOne;

  @Lob
  @Column(columnDefinition = "CLOB")
  private String extraImageUrlTwo;

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getScent() {
    return scent;
  }

  public void setScent(String scent) {
    this.scent = scent;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public BigDecimal getPrice() {
    return price;
  }

  public void setPrice(BigDecimal price) {
    this.price = price;
  }

  public int getStock() {
    return stock;
  }

  public void setStock(int stock) {
    this.stock = stock;
  }

  public String getColor() {
    return color;
  }

  public void setColor(String color) {
    this.color = color;
  }

  public String getSize() {
    return size;
  }

  public void setSize(String size) {
    this.size = size;
  }

  public String getOccasion() {
    return occasion;
  }

  public void setOccasion(String occasion) {
    this.occasion = occasion;
  }

  public String getMood() {
    return mood;
  }

  public void setMood(String mood) {
    this.mood = mood;
  }

  public String getImageUrl() {
    return imageUrl;
  }

  public void setImageUrl(String imageUrl) {
    this.imageUrl = imageUrl;
  }

  public String getExtraImageUrlOne() {
    return extraImageUrlOne;
  }

  public void setExtraImageUrlOne(String extraImageUrlOne) {
    this.extraImageUrlOne = extraImageUrlOne;
  }

  public String getExtraImageUrlTwo() {
    return extraImageUrlTwo;
  }

  public void setExtraImageUrlTwo(String extraImageUrlTwo) {
    this.extraImageUrlTwo = extraImageUrlTwo;
  }

  public boolean isActive() {
    return active;
  }

  public void setActive(boolean active) {
    this.active = active;
  }
}
