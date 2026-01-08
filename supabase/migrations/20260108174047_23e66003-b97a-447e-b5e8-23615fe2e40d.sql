-- Add special_notes column to orders table for customer special requests
ALTER TABLE orders
ADD COLUMN special_notes TEXT;