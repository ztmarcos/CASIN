# SQL Database Documentation

## Overview
The project uses MySQL as the database system with a service-based architecture for database operations. The database is configured to run locally with basic CRUD operations support.

## Configuration
Database configuration is stored in `.env` file with the following parameters:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=crud_db
DB_PORT=3306
```

## Database Service
Location: `backend/services/mysqlDatabase.js`

The `MySQLDatabaseService` class provides the following functionalities:

### Connection Management
- Uses `mysql2/promise` for async/await support
- Automatically manages connections with proper cleanup
- Configuration loaded from environment variables

### Available Methods
1. `getConnection()`: Creates and returns a database connection
2. `getTables()`: Returns table structures
3. `getData(tableName, filters)`: Retrieves data with optional filters
4. `insertData(tableName, data)`: Inserts new records

## Database Models
Location: `backend/models/`

Current models (to be implemented):
- `User.js`: User model
- `Product.js`: Product model
- `Order.js`: Order model

## Table Structures

### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255),
    role VARCHAR(100),
    status VARCHAR(50)
);
```

## Setup Instructions

1. Install MySQL locally
2. Create the database:
```sql
CREATE DATABASE crud_db;
```

3. Create necessary tables using the provided SQL scripts

4. Configure environment variables in `.env`

5. Test connection using:
```javascript
const db = require('./services/mysqlDatabase');
db.getConnection().then(() => console.log('Connected!')).catch(console.error);
```

## Best Practices
1. Always use parameterized queries to prevent SQL injection
2. Close connections after use (handled automatically by the service)
3. Use try-catch blocks for error handling
4. Validate input data before database operations

## Error Handling
The service includes built-in error handling for common scenarios:
- Connection failures
- Query errors
- Invalid table names
- Data validation errors

## Future Improvements
1. Implement remaining models (Product, Order)
2. Add transaction support
3. Implement connection pooling
4. Add data validation middleware
5. Implement user authentication and authorization 