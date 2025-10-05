-- Step 9: Seed trainers with education and profile data
-- 학력 정보 포함 트레이너 데이터
-- 실행 순서: 7-add-education-fields.sql → 8-add-profile-fields.sql → 9-seed-trainers.sql
--
-- 중요: 이 스크립트는 이미 회원가입된 사용자의 trainers 테이블만 업데이트합니다.
-- 먼저 앱에서 각 트레이너로 회원가입 후 실행하세요.

-- 트레이너 1: 김재활 (방문형 전문) - 학력 공개
-- 회원가입: trainer1@test.com / password123
UPDATE trainers SET
  years_experience = 8,
  certifications = ARRAY['물리치료사 1급', '재활운동전문가', '시니어케어전문가'],
  specialties = ARRAY['중풍재활', '관절통증', '근력강화'],
  bio = '8년간 시니어 재활 전문으로 활동해온 김재활입니다. 특히 중풍 후 재활과 관절 통증 완화에 전문성을 가지고 있습니다.',
  rating = 4.8,
  total_reviews = 42,
  home_visit_available = true,
  center_visit_available = false,
  service_areas = ARRAY['서울 강남구', '서울 서초구', '서울 송파구'],
  is_verified = true,
  is_active = true,
  education = '[{"school": "서울대학교", "major": "체육교육학", "degree": "학사", "year": "2015"}]'::jsonb,
  show_education = true
WHERE profile_id IN (SELECT id FROM profiles WHERE email = 'trainer1@test.com');

UPDATE profiles SET
  phone = '010-1111-1111',
  address = '서울시 강남구 테헤란로 123',
  address_detail = '5층 501호'
WHERE email = 'trainer1@test.com';

-- 트레이너 2: 박건강 (센터형 전문) - 학력 공개 (석사)
-- 회원가입: trainer2@test.com / password123
UPDATE trainers SET
  years_experience = 12,
  certifications = ARRAY['물리치료사 1급', '스포츠재활전문가', '노인운동지도사'],
  specialties = ARRAY['척추재활', '균형감각', '낙상예방'],
  bio = '12년 경력의 베테랑 트레이너입니다. 척추 질환과 균형 감각 향상, 낙상 예방 프로그램을 전문으로 합니다.',
  rating = 4.9,
  total_reviews = 87,
  home_visit_available = false,
  center_visit_available = true,
  service_areas = ARRAY['서울 강남구'],
  is_verified = true,
  is_active = true,
  education = '[{"school": "연세대학교", "major": "물리치료학", "degree": "학사", "year": "2010"}, {"school": "고려대학교", "major": "재활의학", "degree": "석사", "year": "2015"}]'::jsonb,
  show_education = true
WHERE profile_id IN (SELECT id FROM profiles WHERE email = 'trainer2@test.com');

UPDATE profiles SET
  phone = '010-2222-2222',
  address = '서울시 강남구 역삼동 456',
  address_detail = '센터 2층'
WHERE email = 'trainer2@test.com';

-- 트레이너 3: 이운동 (방문+센터) - 학력 비공개
-- 회원가입: trainer3@test.com / password123
UPDATE trainers SET
  years_experience = 5,
  certifications = ARRAY['물리치료사 2급', '재활운동전문가'],
  specialties = ARRAY['관절염', '근력강화', '보행훈련'],
  bio = '시니어 분들의 삶의 질 향상을 위해 노력하는 트레이너입니다. 관절염 관리와 근력 강화에 특화되어 있습니다.',
  rating = 4.7,
  total_reviews = 31,
  home_visit_available = true,
  center_visit_available = true,
  service_areas = ARRAY['서울 강남구', '서울 서초구'],
  is_verified = true,
  is_active = true,
  education = '[{"school": "한양대학교", "major": "스포츠과학", "degree": "학사", "year": "2018"}]'::jsonb,
  show_education = false
WHERE profile_id IN (SELECT id FROM profiles WHERE email = 'trainer3@test.com');

UPDATE profiles SET
  phone = '010-3333-3333',
  address = '서울시 서초구 반포대로 789',
  address_detail = '101동 1102호'
WHERE email = 'trainer3@test.com';

-- 트레이너 4: 최재활 (방문형) - 학력 공개
-- 회원가입: trainer4@test.com / password123
UPDATE trainers SET
  years_experience = 6,
  certifications = ARRAY['물리치료사 1급', '스포츠재활전문가'],
  specialties = ARRAY['중풍재활', '관절통증', '보행훈련'],
  bio = '중풍 환자 재활에 특화된 6년 경력 트레이너입니다. 환자분들의 빠른 회복을 위해 최선을 다합니다.',
  rating = 4.6,
  total_reviews = 28,
  home_visit_available = true,
  center_visit_available = false,
  service_areas = ARRAY['서울 강남구', '서울 강동구', '서울 송파구'],
  is_verified = true,
  is_active = true,
  education = '[{"school": "성균관대학교", "major": "의료재활학", "degree": "학사", "year": "2017"}]'::jsonb,
  show_education = true
WHERE profile_id IN (SELECT id FROM profiles WHERE email = 'trainer4@test.com');

UPDATE profiles SET
  phone = '010-4444-4444',
  address = '서울시 송파구 올림픽로 321',
  address_detail = 'A동 302호'
WHERE email = 'trainer4@test.com';

-- 트레이너 5: 정건강 (센터형) - 학력 공개 (박사)
-- 회원가입: trainer5@test.com / password123
UPDATE trainers SET
  years_experience = 10,
  certifications = ARRAY['물리치료사 1급', '재활운동전문가', '시니어케어전문가', '노인운동지도사'],
  specialties = ARRAY['척추재활', '균형감각', '낙상예방', '근력강화'],
  bio = '10년간 시니어 전문 센터를 운영해온 베테랑입니다. 체계적인 프로그램으로 안전하고 효과적인 재활을 제공합니다.',
  rating = 5.0,
  total_reviews = 103,
  home_visit_available = false,
  center_visit_available = true,
  service_areas = ARRAY['서울 강남구'],
  is_verified = true,
  is_active = true,
  education = '[{"school": "서울대학교", "major": "재활의학", "degree": "학사", "year": "2012"}, {"school": "서울대학교", "major": "재활의학", "degree": "석사", "year": "2014"}, {"school": "서울대학교", "major": "운동재활학", "degree": "박사", "year": "2018"}]'::jsonb,
  show_education = true
WHERE profile_id IN (SELECT id FROM profiles WHERE email = 'trainer5@test.com');

UPDATE profiles SET
  phone = '010-5555-5555',
  address = '서울시 강남구 선릉로 555',
  address_detail = '웰니스센터 3층'
WHERE email = 'trainer5@test.com';

-- 트레이너 6: 강운동 (방문형) - 학력 비공개
-- 회원가입: trainer6@test.com / password123
UPDATE trainers SET
  years_experience = 7,
  certifications = ARRAY['물리치료사 1급', '재활운동전문가'],
  specialties = ARRAY['관절염', '근력강화', '관절통증'],
  bio = '어르신들의 눈높이에 맞춘 친절한 설명과 체계적인 운동 프로그램으로 많은 분들의 사랑을 받고 있습니다.',
  rating = 4.8,
  total_reviews = 56,
  home_visit_available = true,
  center_visit_available = false,
  service_areas = ARRAY['서울 서초구', '서울 강남구', '서울 관악구'],
  is_verified = true,
  is_active = true,
  education = '[]'::jsonb,
  show_education = false
WHERE profile_id IN (SELECT id FROM profiles WHERE email = 'trainer6@test.com');

UPDATE profiles SET
  phone = '010-6666-6666',
  address = '서울시 서초구 강남대로 888',
  address_detail = '202호'
WHERE email = 'trainer6@test.com';

-- 트레이너 7: 윤재활 (방문+센터) - 학력 공개
-- 회원가입: trainer7@test.com / password123
UPDATE trainers SET
  years_experience = 9,
  certifications = ARRAY['물리치료사 1급', '스포츠재활전문가', '시니어케어전문가'],
  specialties = ARRAY['중풍재활', '척추재활', '보행훈련'],
  bio = '중풍과 척추 질환 재활 전문가입니다. 방문과 센터 모두에서 맞춤형 프로그램을 제공합니다.',
  rating = 4.9,
  total_reviews = 74,
  home_visit_available = true,
  center_visit_available = true,
  service_areas = ARRAY['서울 강남구', '서울 서초구', '서울 송파구'],
  is_verified = true,
  is_active = true,
  education = '[{"school": "경희대학교", "major": "체육학", "degree": "학사", "year": "2014"}, {"school": "서강대학교", "major": "스포츠재활", "degree": "석사", "year": "2018"}]'::jsonb,
  show_education = true
WHERE profile_id IN (SELECT id FROM profiles WHERE email = 'trainer7@test.com');

UPDATE profiles SET
  phone = '010-7777-7777',
  address = '서울시 송파구 송파대로 999',
  address_detail = '103동 1501호'
WHERE email = 'trainer7@test.com';

-- 트레이너 8: 임건강 (센터형) - 학력 공개
-- 회원가입: trainer8@test.com / password123
UPDATE trainers SET
  years_experience = 4,
  certifications = ARRAY['물리치료사 2급', '재활운동전문가'],
  specialties = ARRAY['균형감각', '낙상예방', '근력강화'],
  bio = '젊지만 열정적으로 시니어 재활에 임하고 있습니다. 최신 재활 기법을 적용한 프로그램을 제공합니다.',
  rating = 4.5,
  total_reviews = 19,
  home_visit_available = false,
  center_visit_available = true,
  service_areas = ARRAY['서울 강남구'],
  is_verified = true,
  is_active = true,
  education = '[{"school": "이화여대", "major": "운동과학", "degree": "학사", "year": "2020"}]'::jsonb,
  show_education = true
WHERE profile_id IN (SELECT id FROM profiles WHERE email = 'trainer8@test.com');

UPDATE profiles SET
  phone = '010-8888-8888',
  address = '서울시 강남구 테헤란로 777',
  address_detail = '피트니스센터 4층'
WHERE email = 'trainer8@test.com';
