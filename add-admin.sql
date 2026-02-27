-- Add ian@neurovitalityltd.com as admin user
-- This will be run after the user signs up through the normal flow
-- Then we'll update their role to admin

-- First, check if user exists and update role to admin
UPDATE users 
SET role = 'admin'
WHERE email = 'ian@neurovitalityltd.com';

-- If no rows affected, the user hasn't signed up yet
-- They will need to sign up first, then this can be run
