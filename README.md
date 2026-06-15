# Calorine Velas

E-commerce de velas artesanais com frontend estatico e base Spring Boot.

## Como rodar em desenvolvimento

```powershell
mvn spring-boot:run
```

Depois acesse:

```text
http://localhost:8080
```

O perfil padrao e `dev`, usando H2 em arquivo:

```text
data/calorine.mv.db
```

## Acesso administrativo de desenvolvimento

```text
E-mail: admin@calorine.com
Senha: admin123
```

Esse usuario de teste nao e criado no perfil `prod`.

## Banco de dados

O projeto agora usa Flyway para criar e versionar o schema.

Perfil `dev`:

```text
H2 local em arquivo
```

Perfil `prod`:

```text
PostgreSQL
```

Variaveis esperadas em producao:

```text
APP_PROFILE=prod
DATABASE_URL=jdbc:postgresql://localhost:5432/calorine
DATABASE_USERNAME=calorine
DATABASE_PASSWORD=calorine
JWT_SECRET=troque-por-um-segredo-grande-e-seguro
```

## Autenticacao

O login retorna um token JWT. O frontend usa:

```text
Authorization: Bearer <token>
```

## Testes

```powershell
mvn test
```
