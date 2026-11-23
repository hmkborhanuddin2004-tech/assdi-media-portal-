-- ============================================================================
-- ASSDI Media Portal — Official Seed Data (Courses, Venues, Camera Gear)
-- ============================================================================

INSERT INTO public.courses (name, code) VALUES
  ('Refrigeration & Air Conditioning (RAC)', 'RAC'),
  ('Motorcycle Servicing', 'MOTO'),
  ('Mobile Servicing', 'MOB'),
  ('Electrical', 'ELEC'),
  ('SBMC (Bakery & Pastry)', 'SBMC'),
  ('English Language', 'ENG'),
  ('The Art of Creation', 'AOC'),
  ('Professional Cooking', 'COOK'),
  ('Dawah', 'DAWAH')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.venues (name) VALUES
  ('50 Katha Campus'),
  ('Kazibari Branch'),
  ('Lab Room')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.gear_items (name, category, serial_number, status) VALUES
  ('Sony FX3 Cinema Body', 'camera_body', 'SN-FX3-01', 'available'),
  ('Sony FX30 Cinema Body', 'camera_body', 'SN-FX30-01', 'available'),
  ('Sony A7C Mirrorless Body', 'camera_body', 'SN-A7C-01', 'available'),
  ('Sony FE 24-105mm f/4 G OSS', 'lens', 'SN-LN-24105-01', 'available'),
  ('DJI Mini 3 Pro Drone', 'drone', 'SN-DR-M3P-01', 'available'),
  ('DJI Air 3S Drone', 'drone', 'SN-DR-A3S-01', 'available'),
  ('DJI RS 4 Gimbal', 'gimbal', 'SN-GM-RS4-01', 'available'),
  ('DJI RS 5 Gimbal', 'gimbal', 'SN-GM-RS5-01', 'available'),
  ('Wireless Lavalier Mic Kit', 'microphone', 'SN-MIC-01', 'available'),
  ('LED Key Light Panel', 'light', 'SN-LGT-01', 'available'),
  ('SDXC V90 128GB Memory Card #1', 'memory_card', 'SN-SD-01', 'available'),
  ('SDXC V90 128GB Memory Card #2', 'memory_card', 'SN-SD-02', 'available')
ON CONFLICT (serial_number) DO NOTHING;
