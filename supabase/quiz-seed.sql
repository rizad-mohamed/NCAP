-- Apply after the Learning seed and Quiz migration. Existing rows are preserved.
begin;
insert into public.quiz_definitions(id,module_id,title,slug,description,topic,difficulty,duration_seconds,passing_percent,eligibility_percent,question_count,status)
    values('q-fundamentals','m-fundamentals','Digital Safety Fundamentals','fundamentals','Everyday risk, safe habits and verifying unexpected requests.','Safe Browsing','Beginner',600,70,80,8,'Published')
    on conflict(id) do nothing;
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-fundamentals-qn-01','q-fundamentals','Which habit protects the largest number of your other accounts?','Safe Browsing','Beginner',1,'Email is used to reset most other accounts, so it is the highest-value account to secure first.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-fundamentals-qn-01',0,'Securing your email account',true
        where not exists(select 1 from public.quiz_options where question_id='m-fundamentals-qn-01' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-fundamentals-qn-01',1,'Clearing your browser history',false
        where not exists(select 1 from public.quiz_options where question_id='m-fundamentals-qn-01' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-fundamentals-qn-01',2,'Using incognito mode',false
        where not exists(select 1 from public.quiz_options where question_id='m-fundamentals-qn-01' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-fundamentals-qn-01',3,'Changing your wallpaper',false
        where not exists(select 1 from public.quiz_options where question_id='m-fundamentals-qn-01' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-fundamentals-qn-02','q-fundamentals','A website says your device is infected and offers a cleaning tool. What should you do?','Safe Browsing','Beginner',2,'Scare pages are advertising, not diagnostics. Close them and use tools you installed yourself.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-fundamentals-qn-02',0,'Install the tool immediately',false
        where not exists(select 1 from public.quiz_options where question_id='m-fundamentals-qn-02' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-fundamentals-qn-02',1,'Close the page and scan using software you already trust',true
        where not exists(select 1 from public.quiz_options where question_id='m-fundamentals-qn-02' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-fundamentals-qn-02',2,'Call the number shown',false
        where not exists(select 1 from public.quiz_options where question_id='m-fundamentals-qn-02' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-fundamentals-qn-02',3,'Enter your password to verify',false
        where not exists(select 1 from public.quiz_options where question_id='m-fundamentals-qn-02' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-fundamentals-qn-03','q-fundamentals','What is the safest response to an urgent, unexpected request?','Social Engineering','Beginner',3,'Out-of-band verification defeats almost all impersonation attempts.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-fundamentals-qn-03',0,'Act quickly to avoid the deadline',false
        where not exists(select 1 from public.quiz_options where question_id='m-fundamentals-qn-03' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-fundamentals-qn-03',1,'Verify through a channel you already trust',true
        where not exists(select 1 from public.quiz_options where question_id='m-fundamentals-qn-03' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-fundamentals-qn-03',2,'Reply and ask for identification',false
        where not exists(select 1 from public.quiz_options where question_id='m-fundamentals-qn-03' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-fundamentals-qn-03',3,'Ignore it permanently',false
        where not exists(select 1 from public.quiz_options where question_id='m-fundamentals-qn-03' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-fundamentals-qn-04','q-fundamentals','Why is ''I am not important enough to be targeted'' a risky belief?','Safe Browsing','Beginner',4,'Most attacks run automatically against huge lists rather than chosen individuals.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-fundamentals-qn-04',0,'Attacks are mostly automated and untargeted',true
        where not exists(select 1 from public.quiz_options where question_id='m-fundamentals-qn-04' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-fundamentals-qn-04',1,'Everyone is personally targeted',false
        where not exists(select 1 from public.quiz_options where question_id='m-fundamentals-qn-04' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-fundamentals-qn-04',2,'Attackers prefer small accounts',false
        where not exists(select 1 from public.quiz_options where question_id='m-fundamentals-qn-04' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-fundamentals-qn-04',3,'It is not risky',false
        where not exists(select 1 from public.quiz_options where question_id='m-fundamentals-qn-04' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-fundamentals-qn-05','q-fundamentals','Automatic updates are valuable mainly because they:','Device Security','Beginner',5,'Security patches fix documented weaknesses that attackers already know about.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-fundamentals-qn-05',0,'Add new features',false
        where not exists(select 1 from public.quiz_options where question_id='m-fundamentals-qn-05' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-fundamentals-qn-05',1,'Close flaws that are already publicly known',true
        where not exists(select 1 from public.quiz_options where question_id='m-fundamentals-qn-05' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-fundamentals-qn-05',2,'Free up storage',false
        where not exists(select 1 from public.quiz_options where question_id='m-fundamentals-qn-05' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-fundamentals-qn-05',3,'Improve battery life',false
        where not exists(select 1 from public.quiz_options where question_id='m-fundamentals-qn-05' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-fundamentals-qn-06','q-fundamentals','A message creates urgency and asks you to confirm details. This is:','Phishing','Beginner',6,'Manufactured urgency is one of the most reliable indicators of a scam.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-fundamentals-qn-06',0,'Normal customer service',false
        where not exists(select 1 from public.quiz_options where question_id='m-fundamentals-qn-06' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-fundamentals-qn-06',1,'A common phishing pattern',true
        where not exists(select 1 from public.quiz_options where question_id='m-fundamentals-qn-06' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-fundamentals-qn-06',2,'Required by regulation',false
        where not exists(select 1 from public.quiz_options where question_id='m-fundamentals-qn-06' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-fundamentals-qn-06',3,'A sign of a secure site',false
        where not exists(select 1 from public.quiz_options where question_id='m-fundamentals-qn-06' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-fundamentals-qn-07','q-fundamentals','Which is the better everyday practice?','Password Security','Beginner',7,'Uniqueness contains the damage of any single breach.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-fundamentals-qn-07',0,'One strong password everywhere',false
        where not exists(select 1 from public.quiz_options where question_id='m-fundamentals-qn-07' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-fundamentals-qn-07',1,'A unique password per important account',true
        where not exists(select 1 from public.quiz_options where question_id='m-fundamentals-qn-07' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-fundamentals-qn-07',2,'Rotating one password monthly',false
        where not exists(select 1 from public.quiz_options where question_id='m-fundamentals-qn-07' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-fundamentals-qn-07',3,'Writing passwords in a public note',false
        where not exists(select 1 from public.quiz_options where question_id='m-fundamentals-qn-07' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-fundamentals-qn-08','q-fundamentals','Which detail is most useful to someone trying to reset your account?','Privacy','Beginner',8,'Dates of birth are widely used in identity checks and account recovery.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-fundamentals-qn-08',0,'Your favourite colour posted publicly',false
        where not exists(select 1 from public.quiz_options where question_id='m-fundamentals-qn-08' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-fundamentals-qn-08',1,'Your date of birth',true
        where not exists(select 1 from public.quiz_options where question_id='m-fundamentals-qn-08' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-fundamentals-qn-08',2,'Your profile photo',false
        where not exists(select 1 from public.quiz_options where question_id='m-fundamentals-qn-08' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-fundamentals-qn-08',3,'Your username',false
        where not exists(select 1 from public.quiz_options where question_id='m-fundamentals-qn-08' and position=3);
insert into public.quiz_definitions(id,module_id,title,slug,description,topic,difficulty,duration_seconds,passing_percent,eligibility_percent,question_count,status)
    values('q-passwords','m-passwords','Passwords & MFA','passwords','Passphrases, password managers, reuse and second factors.','Password Security','Beginner',600,70,80,10,'Published')
    on conflict(id) do nothing;
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-passwords-qn-01','q-passwords','Which passphrase is strongest?','Password Security','Beginner',1,'Length and unpredictability matter far more than symbol substitutions.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-01',0,'Summer2026!',false
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-01' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-01',1,'amber-ladder-quiet-mango',true
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-01' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-01',2,'P@ssw0rd',false
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-01' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-01',3,'abcd1234',false
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-01' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-passwords-qn-02','q-passwords','Replacing letters with symbols, such as @ for a, mainly:','Password Security','Beginner',2,'Guessing tools include these substitutions by default.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-02',0,'Defeats modern guessing tools',false
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-02' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-02',1,'Adds very little strength',true
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-02' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-02',2,'Makes a password unbreakable',false
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-02' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-02',3,'Is required by most sites',false
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-02' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-passwords-qn-03','q-passwords','Credential stuffing is when attackers:','Password Security','Intermediate',3,'Reused credentials from one breach are tried automatically elsewhere.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-03',0,'Guess passwords one at a time',false
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-03' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-03',1,'Replay leaked email and password pairs across many sites',true
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-03' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-03',2,'Phone users for passwords',false
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-03' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-03',3,'Break encryption keys',false
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-03' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-passwords-qn-04','q-passwords','A password manager is protected by:','Password Security','Beginner',4,'The manager holds everything, so it deserves your strongest protection.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-04',0,'A four-digit PIN only',false
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-04' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-04',1,'A long unique passphrase plus a second factor',true
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-04' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-04',2,'Your email password',false
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-04' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-04',3,'Nothing, it is offline',false
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-04' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-passwords-qn-05','q-passwords','Your manager does not offer to autofill a familiar login page. This suggests:','Password Security','Intermediate',5,'Managers match on the exact address, so silence is a useful phishing signal.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-05',0,'The site was redesigned',false
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-05' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-05',1,'The address may not be the real site',true
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-05' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-05',2,'Your internet is slow',false
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-05' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-05',3,'The password expired',false
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-05' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-passwords-qn-06','q-passwords','Multi-factor authentication means:','MFA','Beginner',6,'A second, different kind of factor means a stolen password alone is not enough.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-06',0,'Two passwords',false
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-06' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-06',1,'A password plus something else you have or are',true
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-06' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-06',2,'A longer password',false
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-06' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-06',3,'A password changed twice a year',false
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-06' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-passwords-qn-07','q-passwords','Which second factor best resists phishing?','MFA','Intermediate',7,'Passkeys and keys verify the site''s real address, so lookalike sites gain nothing.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-07',0,'SMS code',false
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-07' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-07',1,'Email code',false
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-07' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-07',2,'Passkey or security key',true
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-07' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-07',3,'Memorable question',false
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-07' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-passwords-qn-08','q-passwords','A caller from ''support'' asks you to read out the code just sent to your phone. You should:','MFA','Intermediate',8,'One-time codes are login credentials; legitimate staff never need them.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-08',0,'Read it out',false
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-08' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-08',1,'Refuse and contact the organisation yourself',true
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-08' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-08',2,'Give half of it',false
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-08' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-08',3,'Request a new code first',false
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-08' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-passwords-qn-09','q-passwords','Recovery codes should be:','MFA','Intermediate',9,'They bypass MFA, so store them as carefully as a password.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-09',0,'Emailed to yourself',false
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-09' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-09',1,'Stored securely offline or in your password manager',true
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-09' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-09',2,'Posted in a group chat',false
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-09' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-09',3,'Discarded',false
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-09' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-passwords-qn-10','q-passwords','Which account should you secure first?','Password Security','Intermediate',10,'Email controls password resets for nearly everything else.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-10',0,'A shopping site',false
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-10' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-10',1,'Your primary email',true
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-10' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-10',2,'A news site',false
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-10' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-passwords-qn-10',3,'A gaming forum',false
        where not exists(select 1 from public.quiz_options where question_id='m-passwords-qn-10' and position=3);
insert into public.quiz_definitions(id,module_id,title,slug,description,topic,difficulty,duration_seconds,passing_percent,eligibility_percent,question_count,status)
    values('q-phishing','m-phishing','Phishing & Social Engineering','phishing','Links, attachments, OTP scams and influence tactics.','Phishing','Intermediate',600,70,80,10,'Published')
    on conflict(id) do nothing;
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-phishing-qn-01','q-phishing','The most reliable way to judge a link is to:','Phishing','Intermediate',1,'Display text can say anything; the destination is what matters.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-01',0,'Read the display text',false
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-01' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-01',1,'Check the real destination address',true
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-01' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-01',2,'Trust the logo',false
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-01' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-01',3,'Check the message length',false
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-01' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-phishing-qn-02','q-phishing','Which address is most likely to be a lookalike?','Phishing','Intermediate',2,'Extra words such as ''secure'' and ''verify'' bolted onto a brand are a classic phishing pattern.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-02',0,'mail.gov.example',false
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-02' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-02',1,'secure-bank-verify.example',true
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-02' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-02',2,'portal.university.example',false
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-02' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-02',3,'shop.example',false
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-02' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-phishing-qn-03','q-phishing','An unexpected invoice arrives as a .zip file. The safest action is:','Phishing','Intermediate',3,'Confirm out-of-band before opening any unexpected archive.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-03',0,'Open it to check the amount',false
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-03' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-03',1,'Verify with the sender through known contact details',true
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-03' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-03',2,'Forward it to colleagues',false
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-03' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-03',3,'Extract but do not open',false
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-03' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-phishing-qn-04','q-phishing','A document asks you to ''enable content'' to view it. This usually means:','Phishing','Intermediate',4,'Macros run code. Legitimate documents rarely require them.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-04',0,'The file is encrypted',false
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-04' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-04',1,'It wants to run macros, a common malware route',true
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-04' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-04',2,'Your software is outdated',false
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-04' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-04',3,'The file is corrupt',false
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-04' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-phishing-qn-05','q-phishing','A caller knows your name and recent purchase. This proves:','Social Engineering','Intermediate',5,'Knowing details is not identity; verify independently.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-05',0,'They are legitimate',false
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-05' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-05',1,'Nothing — such data is often leaked or guessed',true
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-05' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-05',2,'They work for the retailer',false
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-05' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-05',3,'The call is recorded',false
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-05' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-phishing-qn-06','q-phishing','Which pairing of tactic and counter is correct?','Social Engineering','Advanced',6,'Independent verification is the standard counter to claimed authority.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-06',0,'Urgency → act faster',false
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-06' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-06',1,'Authority → verify independently',true
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-06' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-06',2,'Scarcity → decide immediately',false
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-06' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-06',3,'Reciprocity → return the favour',false
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-06' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-phishing-qn-07','q-phishing','You clicked a phishing link but entered nothing. The best next step is:','Phishing','Intermediate',7,'A proportionate response: no credentials were given, but stay alert and patched.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-07',0,'Ignore it entirely',false
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-07' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-07',1,'Close the page, run an update and watch the account for unusual activity',true
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-07' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-07',2,'Reinstall your operating system',false
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-07' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-07',3,'Reply to the sender',false
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-07' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-phishing-qn-08','q-phishing','Spear phishing differs from ordinary phishing because it is:','Phishing','Advanced',8,'Personalisation makes spear phishing considerably more convincing.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-08',0,'Sent to millions',false
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-08' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-08',1,'Tailored using specific information about the recipient',true
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-08' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-08',2,'Always by SMS',false
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-08' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-08',3,'Always about money',false
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-08' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-phishing-qn-09','q-phishing','A ''wrong number'' chat that becomes friendly and later mentions an investment app is:','Social Engineering','Intermediate',9,'Long-form trust building followed by an investment pitch is a well-documented scam pattern.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-09',0,'A coincidence',false
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-09' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-09',1,'A recognised scam pattern',true
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-09' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-09',2,'Harmless',false
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-09' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-09',3,'A marketing survey',false
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-09' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-phishing-qn-10','q-phishing','Which is the best reason to report a phishing message at work or school?','Phishing','Intermediate',10,'Reporting turns one person''s caution into protection for everyone.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-10',0,'To get the sender banned',false
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-10' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-10',1,'So others can be warned and protected',true
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-10' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-10',2,'To prove you noticed',false
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-10' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-phishing-qn-10',3,'To delete it faster',false
        where not exists(select 1 from public.quiz_options where question_id='m-phishing-qn-10' and position=3);
insert into public.quiz_definitions(id,module_id,title,slug,description,topic,difficulty,duration_seconds,passing_percent,eligibility_percent,question_count,status)
    values('q-devices','m-devices','Safe Devices & Browsing','devices','Updates, public Wi-Fi, mobile hardening and backups.','Device Security','Intermediate',600,70,80,10,'Published')
    on conflict(id) do nothing;
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-devices-qn-01','q-devices','A pop-up says your browser is out of date and offers a download. You should:','Device Security','Beginner',1,'Fake update prompts are a common malware delivery method.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-01',0,'Download it',false
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-01' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-01',1,'Update from the browser or device settings instead',true
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-01' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-01',2,'Enter your password',false
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-01' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-01',3,'Restart the router',false
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-01' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-devices-qn-02','q-devices','The clearest sign of a rogue public hotspot is that it:','Safe Browsing','Intermediate',2,'Installing software or certificates lets the network inspect private traffic.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-02',0,'Is free',false
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-02' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-02',1,'Asks you to install an app or certificate',true
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-02' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-02',2,'Has a captive portal',false
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-02' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-02',3,'Has a long name',false
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-02' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-devices-qn-03','q-devices','On a shared network, the safest option for banking is:','Safe Browsing','Beginner',3,'Mobile data avoids the unknown network entirely.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-03',0,'Use the public Wi-Fi',false
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-03' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-03',1,'Use mobile data or wait',true
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-03' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-03',2,'Use a browser you rarely use',false
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-03' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-03',3,'Use private browsing',false
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-03' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-devices-qn-04','q-devices','Apps should generally be installed:','Mobile Security','Beginner',4,'Official stores apply review and signing checks that sideloaded files lack.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-04',0,'From any download link',false
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-04' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-04',1,'From the official app store',true
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-04' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-04',2,'From a friend''s transfer',false
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-04' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-04',3,'From an email attachment',false
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-04' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-devices-qn-05','q-devices','Which permission request deserves the most scepticism from a simple torch app?','Mobile Security','Beginner',5,'Permissions unrelated to the app''s function are a warning sign.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-05',0,'Camera flash',false
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-05' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-05',1,'Contacts and location',true
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-05' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-05',2,'Vibration',false
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-05' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-05',3,'Screen brightness',false
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-05' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-devices-qn-06','q-devices','Why is file sync alone not a backup?','Backups','Intermediate',6,'Without version history, a harmful change propagates to every copy.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-06',0,'It is too slow',false
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-06' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-06',1,'Deletion or encryption can be copied everywhere',true
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-06' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-06',2,'It costs more',false
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-06' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-06',3,'It only works on phones',false
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-06' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-devices-qn-07','q-devices','An external backup drive should be:','Backups','Intermediate',7,'A disconnected drive cannot be encrypted by ransomware running on the device.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-07',0,'Left connected permanently',false
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-07' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-07',1,'Disconnected between backups',true
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-07' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-07',2,'Shared over the network',false
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-07' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-07',3,'Stored inside the laptop bag only',false
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-07' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-devices-qn-08','q-devices','How do you know a backup works?','Backups','Intermediate',8,'A tested restore is the only real proof.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-08',0,'The software says complete',false
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-08' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-08',1,'You periodically restore a file and check it',true
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-08' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-08',2,'The drive light blinks',false
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-08' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-08',3,'The folder size grows',false
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-08' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-devices-qn-09','q-devices','A device that no longer receives security updates should ideally be:','Device Security','Beginner',9,'Unsupported devices accumulate unpatched, publicly known flaws.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-09',0,'Used as normal',false
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-09' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-09',1,'Retired from sensitive tasks such as banking',true
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-09' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-09',2,'Reset weekly',false
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-09' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-09',3,'Kept offline only at night',false
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-09' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-devices-qn-10','q-devices','Before your phone is lost, you should have enabled:','Mobile Security','Beginner',10,'Remote location and wipe must be set up in advance to be useful.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-10',0,'Screen rotation',false
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-10' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-10',1,'Find-my-device and remote wipe',true
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-10' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-10',2,'Airplane mode',false
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-10' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-devices-qn-10',3,'Auto-brightness',false
        where not exists(select 1 from public.quiz_options where question_id='m-devices-qn-10' and position=3);
insert into public.quiz_definitions(id,module_id,title,slug,description,topic,difficulty,duration_seconds,passing_percent,eligibility_percent,question_count,status)
    values('q-privacy','m-privacy','Privacy & Online Safety','privacy','Privacy settings, social media exposure and banking safety.','Privacy','Beginner',600,70,80,10,'Published')
    on conflict(id) do nothing;
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-privacy-qn-01','q-privacy','Which setting most reduces exposure to strangers?','Privacy','Beginner',1,'Audience controls directly limit who can collect information about you.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-01',0,'Limiting who can see your posts and friend list',true
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-01' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-01',1,'Changing your theme',false
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-01' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-01',2,'Turning off read receipts',false
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-01' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-01',3,'Muting notifications',false
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-01' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-privacy-qn-02','q-privacy','Photo location tagging can reveal:','Privacy','Beginner',2,'Location metadata builds a detailed picture of your routine.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-02',0,'Your camera model only',false
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-02' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-02',1,'Where you live, work or travel',true
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-02' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-02',2,'Nothing useful',false
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-02' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-02',3,'Only the date',false
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-02' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-privacy-qn-03','q-privacy','A duplicate of a friend''s account messages you asking for money. You should:','Social Media','Beginner',3,'Impersonation is common; confirm through a channel you already have.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-03',0,'Send a small amount',false
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-03' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-03',1,'Contact your friend through a known number and report the account',true
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-03' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-03',2,'Reply with questions',false
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-03' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-03',3,'Share the account with others',false
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-03' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-privacy-qn-04','q-privacy','Posting travel plans while away mainly increases the risk of:','Social Media','Beginner',4,'It signals absence and reveals personal detail useful for impersonation.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-04',0,'Slower internet',false
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-04' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-04',1,'Physical and account-recovery targeting',true
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-04' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-04',2,'Losing followers',false
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-04' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-04',3,'Battery drain',false
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-04' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-privacy-qn-05','q-privacy','The safest way to reach your bank''s website is:','Online Banking','Intermediate',5,'Sponsored results and message links are frequently impersonated.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-05',0,'A link in an SMS',false
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-05' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-05',1,'Your own bookmark or the official app',true
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-05' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-05',2,'A search advertisement',false
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-05' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-05',3,'A link from a friend',false
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-05' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-privacy-qn-06','q-privacy','Before paying a new supplier account, you should:','Online Banking','Intermediate',6,'Invoice interception is defeated by verbal confirmation of payee details.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-06',0,'Pay quickly to secure the price',false
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-06' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-06',1,'Confirm the details by voice using a known number',true
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-06' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-06',2,'Trust the invoice PDF',false
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-06' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-06',3,'Send a test payment to any account',false
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-06' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-privacy-qn-07','q-privacy','After suspected fraud, the first action is to:','Online Banking','Intermediate',7,'Speed matters, and the card itself carries a trustworthy number.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-07',0,'Post about it online',false
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-07' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-07',1,'Contact your bank using the number on your card and freeze the account',true
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-07' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-07',2,'Wait for the statement',false
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-07' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-07',3,'Change your email address',false
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-07' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-privacy-qn-08','q-privacy','Third-party apps connected to your accounts should be:','Privacy','Intermediate',8,'Unused integrations keep standing access to your data.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-08',0,'Left in place',false
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-08' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-08',1,'Reviewed and disconnected when unused',true
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-08' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-08',2,'Given full access',false
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-08' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-08',3,'Reinstalled monthly',false
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-08' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-privacy-qn-09','q-privacy','Which of these is safe to share publicly?','Privacy','Beginner',9,'Interests carry little identity value compared with identifiers and documents.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-09',0,'Your full date of birth',false
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-09' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-09',1,'A photo of your ID document',false
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-09' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-09',2,'A general interest or hobby',true
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-09' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-09',3,'Your home address',false
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-09' and position=3);
insert into public.quiz_questions(id,quiz_id,prompt,topic,difficulty,display_order,explanation,status)
      values('m-privacy-qn-10','q-privacy','Quiz-style posts asking for your first pet or street name are risky because:','Social Media','Intermediate',10,'The answers are frequently reused as account-recovery questions.','Published')
      on conflict(id) do nothing;
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-10',0,'They use data',false
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-10' and position=0);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-10',1,'They mirror common security questions',true
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-10' and position=1);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-10',2,'They are slow',false
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-10' and position=2);
insert into public.quiz_options(question_id,position,answer_text,is_correct)
        select 'm-privacy-qn-10',3,'They reduce reach',false
        where not exists(select 1 from public.quiz_options where question_id='m-privacy-qn-10' and position=3);
commit;
