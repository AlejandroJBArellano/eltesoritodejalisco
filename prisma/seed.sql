-- TesoritoOS - Database Seed Script
-- Populate database with sample data for testing

-- Clear existing data (use with caution!)
-- TRUNCATE TABLE users, customers, orders, order_items, payments, menu_items, ingredients, recipe_items, stock_adjustments RESTART IDENTITY CASCADE;

-- Sample Users
INSERT INTO users (id, email, name, role, password, created_at, updated_at) VALUES
  ('user1', 'admin@tesorito.com', 'Administrador', 'ADMIN', 'hashed_password', NOW(), NOW()),
  ('user2', 'chef@tesorito.com', 'Chef Principal', 'CHEF', 'hashed_password', NOW(), NOW()),
  ('user3', 'mesero@tesorito.com', 'Juan Mesero', 'WAITER', 'hashed_password', NOW(), NOW());

-- Sample Ingredients
INSERT INTO ingredients (id, name, unit, current_stock, minimum_stock, cost_per_unit, created_at, updated_at) VALUES
  ('ing1', 'Pan Telera', 'unit', 100, 20, 5.00, NOW(), NOW()),
  ('ing2', 'Carne Vegana', 'kg', 10, 2, 180.00, NOW(), NOW()),
  ('ing3', 'Salsa Ahogada', 'lt', 15, 3, 50.00, NOW(), NOW()),
  ('ing4', 'Frijoles Refritos', 'kg', 8, 2, 40.00, NOW(), NOW()),
  ('ing5', 'Cebolla', 'kg', 5, 1, 25.00, NOW(), NOW()),
  ('ing6', 'Aguacate', 'kg', 7, 1.5, 80.00, NOW(), NOW()),
  ('ing7', 'Tortillas', 'kg', 20, 5, 30.00, NOW(), NOW()),
  ('ing8', 'Queso Panela', 'kg', 4, 1, 120.00, NOW(), NOW()),
  ('ing9', 'Agua Jamaica', 'lt', 25, 5, 15.00, NOW(), NOW()),
  ('ing10', 'Hielo', 'kg', 30, 10, 5.00, NOW(), NOW());

-- Sample Menu Items
INSERT INTO menu_items (id, name, description, price, category, is_available, created_at, updated_at) VALUES
  ('menu1', 'Torta Ahogada Clásica', 'Tradicional torta con carne vegana, frijoles y salsa', 85.00, 'Platos Fuertes', true, NOW(), NOW()),
  ('menu2', 'Torta Ahogada Especial', 'Con extra aguacate y queso', 105.00, 'Platos Fuertes', true, NOW(), NOW()),
  ('menu3', 'Tostadas de Carne', 'Tostadas con carne vegana, frijoles y verduras', 65.00, 'Antojitos', true, NOW(), NOW()),
  ('menu4', 'Quesadilla Gigante', 'Quesadilla de queso panela con guarnición', 55.00, 'Antojitos', true, NOW(), NOW()),
  ('menu5', 'Agua de Jamaica', 'Refrescante agua natural de 500ml', 25.00, 'Bebidas', true, NOW(), NOW());

-- Sample Recipes (Menu Items -> Ingredients relationship)
INSERT INTO recipe_items (id, menu_item_id, ingredient_id, quantity_required) VALUES
  -- Torta Ahogada Clásica
  ('rec1', 'menu1', 'ing1', 1),      -- 1 pan
  ('rec2', 'menu1', 'ing2', 0.15),   -- 150g carne
  ('rec3', 'menu1', 'ing3', 0.1),    -- 100ml salsa
  ('rec4', 'menu1', 'ing4', 0.08),   -- 80g frijoles
  ('rec5', 'menu1', 'ing5', 0.02),   -- 20g cebolla

  -- Torta Ahogada Especial
  ('rec6', 'menu2', 'ing1', 1),
  ('rec7', 'menu2', 'ing2', 0.2),
  ('rec8', 'menu2', 'ing3', 0.15),
  ('rec9', 'menu2', 'ing4', 0.1),
  ('rec10', 'menu2', 'ing6', 0.1),   -- 100g aguacate
  ('rec11', 'menu2', 'ing8', 0.05),  -- 50g queso

  -- Tostadas de Carne
  ('rec12', 'menu3', 'ing2', 0.1),
  ('rec13', 'menu3', 'ing4', 0.05),
  ('rec14', 'menu3', 'ing5', 0.03),
  ('rec15', 'menu3', 'ing7', 0.1),   -- 100g tortillas

  -- Quesadilla Gigante
  ('rec16', 'menu4', 'ing7', 0.2),
  ('rec17', 'menu4', 'ing8', 0.15),

  -- Agua de Jamaica
  ('rec18', 'menu5', 'ing9', 0.5),   -- 500ml agua
  ('rec19', 'menu5', 'ing10', 0.1);  -- 100g hielo

-- Sample Customers
INSERT INTO customers (id, name, phone, email, birthday, loyalty_points, total_spend, created_at, updated_at) VALUES
  ('cust1', 'María González', '+525512345678', 'maria@email.com', '1990-05-15', 25, 850.00, NOW(), NOW()),
  ('cust2', 'Carlos López', '+525587654321', 'carlos@email.com', '1985-08-22', 42, 1420.00, NOW(), NOW()),
  ('cust3', 'Ana Martínez', '+525598765432', null, '1995-11-30', 15, 520.00, NOW(), NOW());

-- Sample Orders
INSERT INTO orders (id, order_number, customer_id, source, status, "table", subtotal, tax, total, created_at, updated_at) VALUES
  ('ord1', '001', 'cust1', 'TikTok', 'PREPARING', 'Mesa 3', 170.00, 27.20, 197.20, NOW() - INTERVAL '5 minutes', NOW()),
  ('ord2', '002', null, 'Pasaba por ahí', 'PENDING', 'Para llevar', 140.00, 22.40, 162.40, NOW() - INTERVAL '2 minutes', NOW()),
  ('ord3', '003', 'cust2', 'Instagram', 'READY', 'Mesa 7', 215.00, 34.40, 249.40, NOW() - INTERVAL '18 minutes', NOW());

-- Sample Order Items
INSERT INTO order_items (id, order_id, menu_item_id, quantity, unit_price, notes, created_at) VALUES
  -- Order 001
  ('oit1', 'ord1', 'menu1', 2, 85.00, null, NOW() - INTERVAL '5 minutes'),
  
  -- Order 002
  ('oit2', 'ord2', 'menu3', 2, 65.00, 'Sin cebolla', NOW() - INTERVAL '2 minutes'),
  ('oit3', 'ord2', 'menu5', 1, 25.00, null, NOW() - INTERVAL '2 minutes'),
  
  -- Order 003
  ('oit4', 'ord3', 'menu2', 2, 105.00, 'Extra picante', NOW() - INTERVAL '18 minutes'),
  ('oit5', 'ord3', 'menu5', 1, 25.00, null, NOW() - INTERVAL '18 minutes');

-- Note: Remember to update the .env file with your actual DATABASE_URL before running this script
-- Execute with: psql -U your_user -d tesoritoos -f seed.sql
