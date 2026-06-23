package br.com.colorine;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CalorineApiIntegrationTest {

  private final ObjectMapper json = new ObjectMapper();

  @Autowired
  private MockMvc mockMvc;

  private record TestUser(long id, String token) {
  }

  @Test
  void loginReturnsJwtToken() throws Exception {
    mockMvc.perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "email": "admin@calorine.com",
                  "password": "admin123"
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.email").value("admin@calorine.com"))
        .andExpect(jsonPath("$.role").value("ADMIN"))
        .andExpect(jsonPath("$.token").isString());
  }

  @Test
  void listProductsReturnsSeedCandles() throws Exception {
    mockMvc.perform(get("/api/candles"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(greaterThan(0))))
        .andExpect(jsonPath("$[0].name").isString())
        .andExpect(jsonPath("$[0].minimumStock").isNumber());
  }

  @Test
  void customerCanCreateOrderAndStockIsReduced() throws Exception {
    TestUser customer = registerCustomerAndToken("cliente.pedido@calorine.com");
    MvcResult productsResult = mockMvc.perform(get("/api/candles")).andExpect(status().isOk()).andReturn();
    JsonNode product = json.readTree(productsResult.getResponse().getContentAsString()).get(0);

    MvcResult orderResult = mockMvc.perform(post("/api/orders")
            .header("Authorization", "Bearer " + customer.token())
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "customerId": %d,
                  "deliveryAddress": "Rua Teste, 123, Ribeirao Preto - SP",
                  "paymentMethod": "PIX",
                  "shippingCep": "14000-000",
                  "shippingService": "economico",
                  "shippingCost": 14.90,
                  "shippingDays": 4,
                  "items": [
                    { "productId": %d, "quantity": 1 }
                  ]
                }
                """.formatted(customer.id(), product.get("id").asLong())))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.customerEmail").value("cliente.pedido@calorine.com"))
        .andExpect(jsonPath("$.shippingCep").value("14000-000"))
        .andExpect(jsonPath("$.shippingService").value("economico"))
        .andExpect(jsonPath("$.items[0].quantity").value(1))
        .andExpect(jsonPath("$.status").value("PENDING_PAYMENT"))
        .andReturn();

    long orderId = json.readTree(orderResult.getResponse().getContentAsString()).get("id").asLong();
    mockMvc.perform(put("/api/orders/%d/payment/confirm".formatted(orderId))
            .header("Authorization", "Bearer " + customer.token()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("PAID"));
  }

  @Test
  void adminCanUpdateOrderStatus() throws Exception {
    String adminToken = loginAndToken("admin@calorine.com", "admin123");
    TestUser customer = registerCustomerAndToken("cliente.status@calorine.com");
    JsonNode product = json.readTree(mockMvc.perform(get("/api/candles")).andReturn().getResponse().getContentAsString()).get(0);

    MvcResult orderResult = mockMvc.perform(post("/api/orders")
            .header("Authorization", "Bearer " + customer.token())
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "customerId": %d,
                  "deliveryAddress": "Rua Status, 10, Araraquara - SP",
                  "paymentMethod": "PIX",
                  "items": [
                    { "productId": %d, "quantity": 1 }
                  ]
                }
                """.formatted(customer.id(), product.get("id").asLong())))
        .andExpect(status().isCreated())
        .andReturn();

    long orderId = json.readTree(orderResult.getResponse().getContentAsString()).get("id").asLong();
    mockMvc.perform(put("/api/orders/%d/status".formatted(orderId))
            .header("Authorization", "Bearer " + adminToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                { "status": "PREPARING" }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("PREPARING"));
  }

  @Test
  void customerCanUpdateProfileAndChangePassword() throws Exception {
    TestUser customer = registerCustomerAndToken("cliente.perfil@calorine.com");

    mockMvc.perform(put("/api/auth/me")
            .header("Authorization", "Bearer " + customer.token())
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "name": "Cliente Atualizado",
                  "phone": "16988887777",
                  "acceptsMarketing": true,
                  "address": {
                    "cep": "14801-562",
                    "street": "Rua Atualizada",
                    "number": "201",
                    "neighborhood": "Centro",
                    "complement": "Casa",
                    "city": "Araraquara",
                    "state": "SP"
                  }
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.name").value("Cliente Atualizado"))
        .andExpect(jsonPath("$.phone").value("16988887777"))
        .andExpect(jsonPath("$.acceptsMarketing").value(true))
        .andExpect(jsonPath("$.address.street").value("Rua Atualizada"));

    mockMvc.perform(put("/api/auth/password")
            .header("Authorization", "Bearer " + customer.token())
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "currentPassword": "cliente123",
                  "newPassword": "novaSenha123"
                }
                """))
        .andExpect(status().isNoContent());

    loginAndToken("cliente.perfil@calorine.com", "novaSenha123");
  }

  @Test
  void profileUpdateRequiresAuthentication() throws Exception {
    mockMvc.perform(put("/api/auth/me")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{}"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void deliveredProductCanBeReviewedOnlyByItsCustomer() throws Exception {
    String adminToken = loginAndToken("admin@calorine.com", "admin123");
    TestUser customer = registerCustomerAndToken("cliente.avaliacao@calorine.com");
    JsonNode product = json.readTree(mockMvc.perform(get("/api/candles")).andReturn().getResponse().getContentAsString()).get(0);

    MvcResult orderResult = mockMvc.perform(post("/api/orders")
            .header("Authorization", "Bearer " + customer.token())
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "customerId": %d,
                  "deliveryAddress": "Rua Avaliacao, 10, Araraquara - SP",
                  "paymentMethod": "PIX",
                  "items": [{ "productId": %d, "quantity": 1 }]
                }
                """.formatted(customer.id(), product.get("id").asLong())))
        .andExpect(status().isCreated())
        .andReturn();
    long orderId = json.readTree(orderResult.getResponse().getContentAsString()).get("id").asLong();

    mockMvc.perform(put("/api/orders/%d/status".formatted(orderId))
            .header("Authorization", "Bearer " + adminToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""{ "status": "DELIVERED" }"""))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.reviewNotification").isString());

    mockMvc.perform(get("/api/reviews/eligible").header("Authorization", "Bearer " + customer.token()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(1)))
        .andExpect(jsonPath("$[0].productId").value(product.get("id").asLong()));

    mockMvc.perform(post("/api/reviews")
            .header("Authorization", "Bearer " + customer.token())
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                { "orderId": %d, "productId": %d, "rating": 5, "comment": "Vela excelente." }
                """.formatted(orderId, product.get("id").asLong())))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.rating").value(5));

    mockMvc.perform(get("/api/reviews/product/%d".formatted(product.get("id").asLong())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].comment").value("Vela excelente."));
  }

  private TestUser registerCustomerAndToken(String email) throws Exception {
    MvcResult result = mockMvc.perform(post("/api/auth/register")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "name": "Cliente Teste",
                  "phone": "16999999999",
                  "email": "%s",
                  "password": "cliente123",
                  "acceptsMarketing": false,
                  "address": {
                    "cep": "14000-000",
                    "street": "Rua Teste",
                    "number": "123",
                    "neighborhood": "Centro",
                    "complement": "",
                    "city": "Ribeirao Preto",
                    "state": "SP"
                  }
                }
                """.formatted(email)))
        .andExpect(status().isCreated())
        .andReturn();

    JsonNode response = json.readTree(result.getResponse().getContentAsString());
    return new TestUser(response.get("id").asLong(), response.get("token").asText());
  }

  private String loginAndToken(String email, String password) throws Exception {
    MvcResult result = mockMvc.perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "email": "%s",
                  "password": "%s"
                }
                """.formatted(email, password)))
        .andExpect(status().isOk())
        .andReturn();
    return json.readTree(result.getResponse().getContentAsString()).get("token").asText();
  }
}
