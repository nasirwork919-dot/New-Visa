-- Migration: Add alt_phone column to leads table
-- Run this in your Supabase SQL editor

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS alt_phone TEXT;
