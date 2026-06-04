-- Migration: Add assignee_notes column to leads table
-- Run this in your Supabase SQL editor

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS assignee_notes TEXT;
