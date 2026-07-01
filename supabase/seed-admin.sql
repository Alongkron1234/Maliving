-- ===================================================
-- Step 1: Check trigger exists
-- ===================================================
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- ===================================================
-- Step 2: Recreate trigger (safe: drop + create)
-- ===================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'tenant')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===================================================
-- Step 3: Create admin user (run AFTER trigger is fixed)
-- ===================================================
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Check if user already exists
  SELECT id INTO new_user_id FROM auth.users WHERE email = 'admin@maliving.com';

  IF new_user_id IS NOT NULL THEN
    RAISE NOTICE 'Admin user already exists: %', new_user_id;
    RETURN;
  END IF;

  -- Create the user in auth.users
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    aud,
    role,
    is_super_admin
  )
  VALUES (
    gen_random_uuid(),
    'admin@maliving.com',
    crypt('Admin123456!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
    '{"full_name":"ผู้ดูแลระบบ","role":"admin"}'::jsonb,
    NOW(),
    NOW(),
    'authenticated',
    'authenticated',
    FALSE
  )
  RETURNING id INTO new_user_id;

  IF new_user_id IS NOT NULL THEN
    -- Insert identity record (required for email login)
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      new_user_id,
      jsonb_build_object('sub', new_user_id::text, 'email', 'admin@maliving.com'),
      'email',
      'admin@maliving.com',
      NOW(),
      NOW(),
      NOW()
    );

    -- Upsert profile with admin role
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (new_user_id, 'ผู้ดูแลระบบ', 'admin')
    ON CONFLICT (id) DO UPDATE SET full_name = 'ผู้ดูแลระบบ', role = 'admin';

    RAISE NOTICE 'Admin user created: %', new_user_id;
  ELSE
    RAISE NOTICE 'Admin user already exists';
  END IF;
END;
$$;

-- ===================================================
-- Step 4: Verify
-- ===================================================
SELECT u.email, u.raw_app_meta_data->>'role' AS auth_role,
       p.role AS profile_role, p.full_name
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'admin@maliving.com';
