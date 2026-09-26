/**
 * Seed data for GOSHEN OS testing
 * Realistic agricultural data for development and testing
 */

import { sql } from "@/lib/db";

async function seedAgriculturalData() {
  console.log("Seeding agricultural data...");

  // Seed crop catalog with realistic data
  await sql`
    INSERT INTO public.crops (id, name, category, description, planting_seasons, typical_yield_kg_ha, growth_days_min, growth_days_max)
    VALUES
      -- Cereals
      ('00000000-0000-0000-0000-000000000001', 'Maize', 'cereal', 'Corn suitable for human consumption and animal feed', ARRAY['long_rain', 'short_rain'], 4500, 90, 150),
      ('00000000-0000-0000-0000-000000000002', 'Wheat', 'cereal', 'Common wheat for flour production', ARRAY['winter', 'spring'], 3500, 100, 140),
      ('00000000-0000-0000-0000-000000000003', 'Rice', 'cereal', 'Paddy rice for staple food', ARRAY['monsoon', 'dry'], 5500, 110, 160),
      ('00000000-0000-0000-0000-000000000004', 'Sorghum', 'cereal', 'Drought-resistant cereal', ARRAY['short_rain'], 2500, 90, 120),
      ('00000000-0000-0000-0000-000000000005', 'Millet', 'cereal', 'Fast-growing drought-resistant cereal', ARRAY['short_rain'], 2000, 60, 90),

      -- Legumes
      ('00000000-0000-0000-0000-000000000006', 'Soybeans', 'legume', 'Oilseed crop for protein and oil', ARRAY['summer', 'fall'], 2500, 90, 130),
      ('00000000-0000-0000-0000-000000000007', 'Beans', 'legume', 'Common beans for protein', ARRAY['spring', 'summer'], 1500, 60, 90),
      ('00000000-0000-0000-0000-000000000008', 'Groundnuts', 'legume', 'Peanuts for oil and food', ARRAY['summer'], 1500, 90, 140),
      ('00000000-0000-0000-0000-000000000009', 'Cowpeas', 'legume', 'Drought-tolerant legume', ARRAY['summer'], 800, 60, 90),

      -- Vegetables
      ('00000000-0000-0000-0000-000000000010', 'Tomatoes', 'vegetable', 'Fresh market tomatoes', ARRAY['spring', 'summer', 'fall'], 45000, 60, 120),
      ('00000000-0000-0000-0000-000000000011', 'Potatoes', 'vegetable', 'Irish potatoes for food', ARRAY['spring', 'fall'], 25000, 90, 120),
      ('00000000-0000-0000-0000-000000000012', 'Onions', 'vegetable', 'Storage onions', ARRAY['spring', 'fall'], 20000, 90, 120),
      ('00000000-0000-0000-0000-000000000013', 'Carrots', 'vegetable', 'Root vegetables', ARRAY['spring', 'fall'], 30000, 70, 100),
      ('00000000-0000-0000-0000-000000000014', 'Cabbage', 'vegetable', 'Leafy vegetables', ARRAY['spring', 'fall'], 40000, 60, 90),
      ('00000000-0000-0000-0000-000000000015', 'Peppers', 'vegetable', 'Sweet and hot peppers', ARRAY['summer'], 15000, 90, 120),

      -- Cash crops
      ('00000000-0000-0000-0000-000000000016', 'Cotton', 'cash_crop', 'Fiber crop for textiles', ARRAY['long_rain'], 1200, 150, 180),
      ('00000000-0000-0000-0000-000000000017', 'Coffee', 'cash_crop', 'Arabica coffee beans', ARRAY['perennial'], 800, 180, 365),
      ('00000000-0000-0000-0000-000000000018', 'Tea', 'cash_crop', 'Black tea leaves', ARRAY['perennial'], 2000, 365, 365),
      ('00000000-0000-0000-0000-000000000019', 'Sugarcane', 'cash_crop', 'Sugar for ethanol and food', ARRAY['perennial'], 60000, 365, 365),
      ('00000000-0000-0000-0000-000000000020', 'Tobacco', 'cash_crop', 'Tobacco leaves', ARRAY['summer'], 2000, 90, 120)
    ON CONFLICT (id) DO NOTHING;
  `;

  // Seed livestock species
  await sql`
    INSERT INTO public.livestock_species (id, name, category, typical_weight_kg, average_lifespan_years, typical_feed_type)
    VALUES
      -- Poultry
      ('00000000-0000-0000-0000-000000000030', 'Broiler Chickens', 'poultry', 1.8, 0.5, 'concentrate'),
      ('00000000-0000-0000-0000-000000000031', 'Layer Chickens', 'poultry', 1.6, 2.0, 'layer_feed'),
      ('00000000-0000-0000-0000-000000000032', 'Ducks', 'poultry', 2.5, 1.5, 'mixed'),
      ('00000000-0000-0000-0000-000000000033', 'Turkeys', 'poultry', 8.0, 1.0, 'concentrate'),

      -- Ruminants
      ('00000000-0000-0000-0000-000000000034', 'Beef Cattle', 'ruminant', 500, 5.0, 'roughage'),
      ('00000000-0000-0000-0000-000000000035', 'Dairy Cattle', 'ruminant', 450, 6.0, 'mixed'),
      ('00000000-0000-0000-0000-000000000036', 'Sheep', 'ruminant', 60, 4.0, 'roughage'),
      ('00000000-0000-0000-0000-000000000037', 'Goats', 'ruminant', 40, 3.0, 'roughage'),

      -- Swine
      ('00000000-0000-0000-0000-000000000038', 'Pigs', 'swine', 100, 2.0, 'concentrate'),

      -- Others
      ('00000000-0000-0000-0000-000000000039', 'Rabbits', 'small_animal', 3.0, 1.5, 'mixed'),
      ('00000000-0000-0000-0000-000000000040', 'Guinea Fowl', 'poultry', 1.2, 1.5, 'concentrate')
    ON CONFLICT (id) DO NOTHING;
  `;

  // Seed seasons
  await sql`
    INSERT INTO public.seasons (id, name, organization_id, start_date, end_date, is_current)
    VALUES
      ('00000000-0000-0000-0000-000000000050', '2026 Long Rain Season', null, '2026-03-01', '2026-06-30', false),
      ('00000000-0000-0000-0000-000000000051', '2026 Short Rain Season', null, '2026-10-01', '2026-12-31', false),
      ('00000000-0000-0000-0000-000000000052', '2027 Long Rain Season', null, '2027-03-01', '2027-06-30', true)
    ON CONFLICT (id) DO NOTHING;
  `;

  // Seed inventory categories
  await sql`
    INSERT INTO public.inventory_categories (id, name, organization_id, description)
    VALUES
      ('00000000-0000-0000-0000-000000000060', 'Seeds', null, 'Crop seeds and planting materials'),
      ('00000000-0000-0000-0000-000000000061', 'Fertilizers', null, 'Soil amendments and plant nutrients'),
      ('00000000-0000-0000-0000-000000000062', 'Pesticides', null, 'Crop protection chemicals'),
      ('00000000-0000-0000-0000-000000000063', 'Feed', null, 'Animal feed and supplements'),
      ('00000000-0000-0000-0000-000000000064', 'Medication', null, 'Veterinary medicines and treatments'),
      ('00000000-0000-0000-0000-000000000065', 'Equipment', null, 'Farm equipment and spare parts'),
      ('00000000-0000-0000-0000-000000000066', 'Fuel', null, 'Diesel, petrol, and lubricants'),
      ('00000000-0000-0000-0000-000000000067', 'Tools', null, 'Hand tools and implements')
    ON CONFLICT (id) DO NOTHING;
  `;

  // Seed typical inventory items
  await sql`
    INSERT INTO public.inventory_items (id, name, category_id, organization_id, unit, default_reorder_level, unit_cost)
    VALUES
      -- Seeds
      ('00000000-0000-0000-0000-000000000070', 'Maize Seed - Hybrid', '00000000-0000-0000-0000-000000000060', null, 'kg', 500, 5.00),
      ('00000000-0000-0000-0000-000000000071', 'Wheat Seed - Improved', '00000000-0000-0000-0000-000000000060', null, 'kg', 300, 3.50),
      ('00000000-0000-0000-0000-000000000072', 'Rice Seed - IR64', '00000000-0000-0000-0000-000000000060', null, 'kg', 400, 2.80),
      ('00000000-0000-0000-0000-000000000073', 'Tomato Seeds', '00000000-0000-0000-0000-000000000060', null, 'g', 50, 0.15),

      -- Fertilizers
      ('00000000-0000-0000-0000-000000000074', 'UREA 46% N', '00000000-0000-0000-0000-000000000061', null, '50kg bag', 20, 25.00),
      ('00000000-0000-0000-0000-000000000075', 'DAP 18-46-0', '00000000-0000-0000-0000-000000000061', null, '50kg bag', 15, 35.00),
      ('00000000-0000-0000-0000-000000000076', 'NPK 17-17-17', '00000000-0000-0000-0000-000000000061', null, '50kg bag', 25, 40.00),
      ('00000000-0000-0000-0000-000000000077', 'CAN 17% N', '00000000-0000-0000-0000-000000000061', null, '50kg bag', 10, 30.00),

      -- Pesticides
      ('00000000-0000-0000-0000-000000000078', 'Glyphosate 360 SL', '00000000-0000-0000-0000-000000000062', null, 'liter', 5, 12.00),
      ('00000000-0000-0000-0000-000000000079', 'Lambda Cyhalothrin', '00000000-0000-0000-0000-000000000062', null, 'liter', 3, 45.00),
      ('00000000-0000-0000-0000-000000000080', 'Mancozeb', '00000000-0000-0000-0000-000000000062', null, 'kg', 2, 18.00),

      -- Feed
      ('00000000-0000-0000-0000-000000000081', 'Broiler Starter Feed', '00000000-0000-0000-0000-000000000064', null, '50kg bag', 50, 18.00),
      ('00000000-0000-0000-0000-000000000082', 'Broiler Grower Feed', '00000000-0000-0000-0000-000000000064', null, '50kg bag', 50, 16.00),
      ('00000000-0000-0000-0000-000000000083', 'Broiler Finisher Feed', '00000000-0000-0000-0000-000000000064', null, '50kg bag', 50, 15.00),
      ('00000000-0000-0000-0000-000000000084', 'Layer Mash', '00000000-0000-0000-0000-000000000064', null, '50kg bag', 30, 14.00),
      ('00000000-0000-0000-0000-000000000085', 'Maize Bran', '00000000-0000-0000-0000-000000000064', null, '50kg bag', 20, 8.00),
      ('00000000-0000-0000-0000-000000000086', 'Fish Meal', '00000000-0000-0000-0000-000000000064', null, '50kg bag', 10, 35.00),

      -- Fuel
      ('00000000-0000-0000-0000-000000000087', 'Diesel', '00000000-0000-0000-0000-000000000067', null, 'liter', 200, 1.20),
      ('00000000-0000-0000-0000-000000000088', 'Petrol', '00000000-0000-0000-0000-000000000067', null, 'liter', 50, 1.50),
      ('00000000-0000-0000-0000-000000000089', 'Engine Oil', '00000000-0000-0000-0000-000000000067', null, 'liter', 10, 8.00)
    ON CONFLICT (id) DO NOTHING;
  `;

  console.log("Agricultural seed data completed");
}

async function seedFinancialAccounts() {
  console.log("Seeding financial accounts...");

  await sql`
    INSERT INTO public.accounts (id, name, type, organization_id, currency, parent_account_id)
    VALUES
      -- Asset accounts
      ('00000000-0000-0000-0000-000000000100', 'Cash on Hand', 'asset', null, 'TZS', null),
      ('00000000-0000-0000-0000-000000000101', 'Bank Account - CRDB', 'asset', null, 'TZS', null),
      ('00000000-0000-0000-0000-000000000102', 'Bank Account - NMB', 'asset', null, 'TZS', null),
      ('00000000-0000-0000-0000-000000000103', 'Accounts Receivable', 'asset', null, 'TZS', null),
      ('00000000-0000-0000-0000-000000000104', 'Inventory', 'asset', null, 'TZS', null),
      ('00000000-0000-0000-0000-000000000105', 'Equipment', 'asset', null, 'TZS', null),
      ('00000000-0000-0000-0000-000000000106', 'Buildings', 'asset', null, 'TZS', null),
      ('00000000-0000-0000-0000-000000000107', 'Land', 'asset', null, 'TZS', null),

      -- Liability accounts
      ('00000000-0000-0000-0000-000000000110', 'Accounts Payable', 'liability', null, 'TZS', null),
      ('00000000-0000-0000-0000-000000000111', 'Loans Payable', 'liability', null, 'TZS', null),
      ('00000000-0000-0000-0000-000000000112', 'Accrued Expenses', 'liability', null, 'TZS', null),

      -- Equity accounts
      ('00000000-0000-0000-0000-000000000120', 'Owner Equity', 'equity', null, 'TZS', null),
      ('00000000-0000-0000-0000-000000000121', 'Owner Contributions', 'equity', null, 'TZS', '00000000-0000-0000-0000-000000000120'),
      ('00000000-0000-0000-0000-000000000122', 'Owner Withdrawals', 'equity', null, 'TZS', '00000000-0000-0000-0000-000000000120'),
      ('00000000-0000-0000-0000-000000000123', 'Retained Earnings', 'equity', null, 'TZS', '00000000-0000-0000-0000-000000000120'),

      -- Revenue accounts
      ('00000000-0000-0000-0000-000000000130', 'Crop Sales', 'revenue', null, 'TZS', null),
      ('00000000-0000-0000-0000-000000000131', 'Livestock Sales', 'revenue', null, 'TZS', null),
      ('00000000-0000-0000-0000-000000000132', 'Product Sales', 'revenue', null, 'TZS', null),
      ('00000000-0000-0000-0000-000000000133', 'Service Income', 'revenue', null, 'TZS', null),
      ('00000000-0000-0000-0000-000000000134', 'Other Income', 'revenue', null, 'TZS', null),

      -- Expense accounts
      ('00000000-0000-0000-0000-000000000140', 'Seed Costs', 'expense', null, 'TZS', null),
      ('00000000-0000-0000-0000-000000000141', 'Fertilizer Costs', 'expense', null, 'TZS', null),
      ('00000000-0000-0000-0000-000000000142', 'Pesticide Costs', 'expense', null, 'TZS', null),
      ('00000000-0000-0000-0000-000000000143', 'Feed Costs', 'expense', null, 'TZS', null),
      ('00000000-0000-0000-0000-000000000144', 'Labor Costs', 'expense', null, 'TZS', null),
      ('00000000-0000-0000-0000-000000000145', 'Equipment Costs', 'expense', null, 'TZS', null),
      ('00000000-0000-0000-0000-000000000146', 'Fuel Costs', 'expense', null, 'TZS', null),
      ('00000000-0000-0000-0000-000000000147', 'Maintenance Costs', 'expense', null, 'TZS', null),
      ('00000000-0000-0000-0000-000000000148', 'Veterinary Costs', 'expense', null, 'TZS', null),
      ('00000000-0000-0000-0000-000000000149', 'Utilities', 'expense', null, 'TZS', null),
      ('00000000-0000-0000-0000-000000000150', 'Transport Costs', 'expense', null, 'TZS', null),
      ('00000000-0000-0000-0000-000000000151', 'Interest Expense', 'expense', null, 'TZS', null),
      ('00000000-0000-0000-0000-000000000152', 'Depreciation', 'expense', null, 'TZS', null)
    ON CONFLICT (id) DO NOTHING;
  `;

  console.log("Financial accounts seed data completed");
}

async function main() {
  try {
    await seedAgriculturalData();
    await seedFinancialAccounts();
    console.log("All seed data completed successfully");
  } catch (error) {
    console.error("Error seeding data:", error);
    process.exit(1);
  }
}

main();