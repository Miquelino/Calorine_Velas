package br.com.colorine;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
        .andExpect(jsonPath("$[0].name").isString());
  }

  @Test
  void customerCanCreateOrderAndStockIsReduced() throws Exception {
    String customerToken = registerCustomerAndToken();

    MvcResult productsResult = mockMvc.perform(get("/api/candles"))
        .andExpect(status().isOk())
        .andReturn();
    JsonNode product = json.readTree(productsResult.getResponse().getContentAsString()).get(0);
    long productId = product.get("id").asLong();
    int originalStock = product.get("stock").asInt();

    mockMvc.perform(post("/api/orders")
            .header("Authorization", "Bearer " + customerToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "customerId": 2,
                  "deliveryAddress": "Rua Teste, 123, Ribeirao Preto - SP",
                  "paymentMethod": "PIX",
                  "items": [
                    { "productId": %d, "quantity": 1 }
                  ]
                }
                """.formatted(productId)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.items[0].quantity").value(1));

    mockMvc.perform(get("/api/candles"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].stock").value(originalStock - 1));
  }

  private String registerCustomerAndToken() throws Exception {
    MvcResult result = mockMvc.perform(post("/api/auth/register")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "name": "Cliente Teste",
                  "phone": "16999999999",
                  "email": "cliente.teste@calorine.com",
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
                """))
        .andExpect(status().isCreated())
        .andReturn();

    return json.readTree(result.getResponse().getContentAsString()).get("token").asText();
  }
}
