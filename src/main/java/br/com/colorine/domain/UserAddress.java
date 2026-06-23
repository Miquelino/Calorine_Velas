package br.com.colorine.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "user_addresses")
public class UserAddress {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 9)
  private String cep;

  @Column(nullable = false, length = 90)
  private String street;

  @Column(nullable = false, length = 12)
  private String number;

  @Column(nullable = false, length = 50)
  private String neighborhood;

  @Column(length = 50)
  private String complement;

  @Column(nullable = false, length = 50)
  private String city;

  @Column(nullable = false, length = 2)
  private String state;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getCep() { return cep; }
  public void setCep(String cep) { this.cep = cep; }
  public String getStreet() { return street; }
  public void setStreet(String street) { this.street = street; }
  public String getNumber() { return number; }
  public void setNumber(String number) { this.number = number; }
  public String getNeighborhood() { return neighborhood; }
  public void setNeighborhood(String neighborhood) { this.neighborhood = neighborhood; }
  public String getComplement() { return complement; }
  public void setComplement(String complement) { this.complement = complement; }
  public String getCity() { return city; }
  public void setCity(String city) { this.city = city; }
  public String getState() { return state; }
  public void setState(String state) { this.state = state; }
}
