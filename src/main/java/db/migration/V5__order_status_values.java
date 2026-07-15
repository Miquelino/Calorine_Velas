package db.migration;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

public class V5__order_status_values extends BaseJavaMigration {

  private static final String STATUS_CHECK =
      "status IN ('PENDING_PAYMENT','PAID','CREATED','PREPARING','SHIPPED','DELIVERED','CANCELED')";

  @Override
  public void migrate(Context context) throws Exception {
    Connection connection = context.getConnection();
    List<String> constraints = findStatusConstraints(connection);
    try (Statement statement = connection.createStatement()) {
      statement.execute("ALTER TABLE customer_orders ALTER COLUMN status VARCHAR(30) NOT NULL");
      for (String constraint : constraints) {
        statement.execute("ALTER TABLE customer_orders DROP CONSTRAINT " + constraint);
      }
      statement.execute("ALTER TABLE customer_orders ADD CONSTRAINT ck_customer_orders_status CHECK (" + STATUS_CHECK + ")");
    }
  }

  private List<String> findStatusConstraints(Connection connection) throws Exception {
    String sql = """
        SELECT tc.CONSTRAINT_NAME, cc.CHECK_CLAUSE
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
        JOIN INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc
          ON tc.CONSTRAINT_CATALOG = cc.CONSTRAINT_CATALOG
         AND tc.CONSTRAINT_SCHEMA = cc.CONSTRAINT_SCHEMA
         AND tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
        WHERE UPPER(tc.TABLE_NAME) = 'CUSTOMER_ORDERS'
          AND tc.CONSTRAINT_TYPE = 'CHECK'
        """;
    List<String> names = new ArrayList<>();
    try (PreparedStatement statement = connection.prepareStatement(sql);
         ResultSet rows = statement.executeQuery()) {
      while (rows.next()) {
        String name = rows.getString("CONSTRAINT_NAME");
        String clause = rows.getString("CHECK_CLAUSE");
        if (clause != null && clause.toUpperCase().contains("STATUS")) {
          names.add(name);
        }
      }
    }
    return names;
  }
}
