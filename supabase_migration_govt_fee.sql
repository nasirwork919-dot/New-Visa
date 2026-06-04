-- Migration: Add govt_fee and govt_gst_amount columns to leads table
-- Run this in your Supabase SQL editor

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS govt_fee NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS govt_gst_amount NUMERIC(12,2) DEFAULT 0;

-- Update existing rows: recalculate total_amount to include govt_fee (stays 0 for existing)
-- (No data change needed — existing leads simply have govt_fee = 0)
