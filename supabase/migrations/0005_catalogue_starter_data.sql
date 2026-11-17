-- Starter academic catalog and configurable demo plans. No user accounts or questions are seeded.
INSERT INTO public.classes(id,name,name_bn,slug,level_order,has_groups,is_active) VALUES
('cls-6','Class 6','শ্রেণি ৬','class-6',6,false,true),
('cls-7','Class 7','শ্রেণি ৭','class-7',7,false,true),
('cls-8','Class 8','শ্রেণি ৮','class-8',8,false,true),
('cls-9','Class 9','শ্রেণি ৯','class-9',9,true,true),
('cls-10','Class 10','শ্রেণি ১০','class-10',10,true,true)
ON CONFLICT(id) DO NOTHING;

INSERT INTO public.groups(id,class_id,name,name_bn,is_active) VALUES
('grp-science','cls-9','Science','বিজ্ঞান',true),
('grp-commerce','cls-9','Commerce','ব্যবসায় শিক্ষা',true),
('grp-arts','cls-9','Humanities','মানবিক',true),
('grp-science-10','cls-10','Science','বিজ্ঞান',true)
ON CONFLICT(id) DO NOTHING;

INSERT INTO public.subjects(id,class_id,group_id,name,name_bn,code,is_active) VALUES
('sub-6-math','cls-6',null,'Mathematics','গণিত','MATH-6',true),('sub-6-science','cls-6',null,'General Science','সাধারণ বিজ্ঞান','SCI-6',true),('sub-6-english','cls-6',null,'English','ইংরেজি','ENG-6',true),
('sub-7-math','cls-7',null,'Mathematics','গণিত','MATH-7',true),('sub-7-science','cls-7',null,'General Science','সাধারণ বিজ্ঞান','SCI-7',true),('sub-7-english','cls-7',null,'English','ইংরেজি','ENG-7',true),
('sub-8-math','cls-8',null,'Mathematics','গণিত','MATH-8',true),('sub-8-science','cls-8',null,'General Science','সাধারণ বিজ্ঞান','SCI-8',true),('sub-8-english','cls-8',null,'English','ইংরেজি','ENG-8',true),
('sub-9-math','cls-9',null,'Mathematics','গণিত','MATH-9',true),('sub-9-science','cls-9','grp-science','General Science','সাধারণ বিজ্ঞান','SCI-9',true),('sub-9-english','cls-9',null,'English','ইংরেজি','ENG-9',true),
('sub-10-math','cls-10',null,'Mathematics','গণিত','MATH-10',true),('sub-10-science','cls-10','grp-science-10','General Science','সাধারণ বিজ্ঞান','SCI-10',true),('sub-10-english','cls-10',null,'English','ইংরেজি','ENG-10',true)
ON CONFLICT(id) DO NOTHING;

INSERT INTO public.chapters(id,subject_id,chapter_number,name,name_bn,is_active)
SELECT 'ch-'||s.id||'-1',s.id,1,
  CASE WHEN s.code LIKE 'MATH-%' THEN 'Numbers and Operations' WHEN s.code LIKE 'SCI-%' THEN 'Living World' ELSE 'Reading Skills' END,
  CASE WHEN s.code LIKE 'MATH-%' THEN 'সংখ্যা ও প্রক্রিয়া' WHEN s.code LIKE 'SCI-%' THEN 'জীবজগৎ' ELSE 'পঠন দক্ষতা' END,true
FROM public.subjects s ON CONFLICT(id) DO NOTHING;
INSERT INTO public.topics(id,chapter_id,name,name_bn,is_active)
SELECT 'topic-'||c.id,c.id,'Introduction','পরিচিতি',true FROM public.chapters c ON CONFLICT(id) DO NOTHING;

INSERT INTO public.question_types(id,code,name,name_bn,default_marks,is_active) VALUES
('qt-mcq','mcq','Multiple Choice','বহুনির্বাচনি',1,true),
('qt-cq','cq','Creative Question','সৃজনশীল',10,true),
('qt-short','short','Short Answer','সংক্ষিপ্ত উত্তর',2,true),
('qt-fill','fill_blank','Fill in the Blank','শূন্যস্থান পূরণ',1,true),
('qt-true-false','true_false','True or False','সত্য বা মিথ্যা',1,true),
('qt-math','math','Mathematics','গাণিতিক সমস্যা',5,true),
('qt-image','image_based','Image Based','চিত্রভিত্তিক',2,true)
ON CONFLICT(id) DO NOTHING;
INSERT INTO public.difficulty_levels(code,name,name_bn,sort_order) VALUES
('easy','Easy','সহজ',1),('medium','Medium','মধ্যম',2),('hard','Hard','কঠিন',3)
ON CONFLICT(code) DO NOTHING;

INSERT INTO public.plans(id,name,name_bn,audience_label,description,price_bdt,original_price_bdt,currency,duration_days,is_active,display_order) VALUES
('plan-c6-monthly','Class 6 Monthly','ষষ্ঠ শ্রেণি মাসিক','Class 6','Class 6 question bank access for 30 days.',249,299,'BDT',30,true,1),
('plan-junior-bundle','Junior Bundle','জুনিয়র বান্ডেল','Classes 6–8','Access to classes 6, 7, and 8 for 30 days.',499,null,'BDT',30,true,2),
('plan-c8-monthly','Class 8 Monthly','অষ্টম শ্রেণি মাসিক','Class 8','Class 8 question bank access for 30 days.',249,null,'BDT',30,true,3)
ON CONFLICT(id) DO NOTHING;
INSERT INTO public.plan_classes(plan_id,class_id) VALUES
('plan-c6-monthly','cls-6'),('plan-junior-bundle','cls-6'),('plan-junior-bundle','cls-7'),('plan-junior-bundle','cls-8'),('plan-c8-monthly','cls-8')
ON CONFLICT DO NOTHING;
INSERT INTO public.plan_features(plan_id,feature_text,sort_order) VALUES
('plan-c6-monthly','Question bank access',0),('plan-c6-monthly','Custom paper creation',1),
('plan-junior-bundle','Three classes',0),('plan-junior-bundle','Custom paper creation',1),
('plan-c8-monthly','Question bank access',0),('plan-c8-monthly','Custom paper creation',1);

INSERT INTO public.payment_methods(id,name,account_number,account_type,instructions,is_active) VALUES
('pm-bkash','bKash','01XXXXXXXXX','Personal','ডেমো নির্দেশনা: অনুমোদিত merchant number বসানোর পরই অর্থ পাঠাবেন।',true),
('pm-nagad','Nagad','01XXXXXXXXX','Personal','ডেমো নির্দেশনা: অনুমোদিত merchant number বসানোর পরই অর্থ পাঠাবেন।',true)
ON CONFLICT(id) DO NOTHING;
INSERT INTO public.site_settings(id,brand_name,hero_headline,hero_subheadline,support_email,support_phone,office_address,renewal_rule_notice,demo_disclaimer)
VALUES(1,'প্রশ্নঘর','পরীক্ষার প্রস্তুতি হোক আরও সহজ','প্রশ্ন ব্যাংক থেকে নিজের মতো প্রশ্নপত্র তৈরি করুন।','','','','নতুন সাবস্ক্রিপশন অনুমোদনের সময় থেকেই কার্যকর হবে।','প্ল্যানের মূল্য নমুনা; কোনো বাস্তব পেমেন্ট gateway সংযুক্ত নয়।')
ON CONFLICT(id) DO NOTHING;
