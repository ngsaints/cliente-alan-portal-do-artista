-- Migration: Add is_private field to songs table
-- Run this on your PostgreSQL VPS database

ALTER TABLE songs ADD COLUMN is_private BOOLEAN NOT NULL DEFAULT false;