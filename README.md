# Colorine Velas

E-commerce de velas artesanais com frontend estatico e base Spring Boot.

## Como rodar

```powershell
mvn spring-boot:run
```

Depois acesse:

```text
http://localhost:8080
```

## Acesso administrativo

```text
E-mail: admin@colorine.com
Senha: admin123
```

Somente usuarios com perfil `ADMIN` podem criar, editar ou remover velas.

## Endpoints iniciais

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/candles
POST /api/candles        ADMIN
PUT  /api/candles/{id}   ADMIN
DELETE /api/candles/{id} ADMIN
POST /api/orders         CUSTOMER ou ADMIN
```

## Banco de dados

O projeto usa H2 em arquivo. Ao rodar a aplicacao, o Spring cria o banco e as tabelas automaticamente em:

```text
data/colorine.mv.db
```

No DBeaver, crie uma conexao H2 com:

```text
Driver: H2 Embedded
JDBC URL: jdbc:h2:file:C:/Users/reyna/Desktop/Projetos/Java/Alura/Colorine/data/colorine;AUTO_SERVER=TRUE
User: sa
Password: deixe em branco
```

O console web do H2 tambem fica disponivel enquanto a aplicacao estiver rodando:

```text
http://localhost:8080/h2-console
```

No console web, use a mesma URL:

```text
jdbc:h2:file:./data/colorine;AUTO_SERVER=TRUE
```
# Calorine_Velas
