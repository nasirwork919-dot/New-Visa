-- Migration: Add payment_date column to lead_payments table
-- Run this in your Supabase SQL editor

ALTER TABLE lead_payments
  ADD COLUMN IF NOT EXISTS payment_date DATE;
