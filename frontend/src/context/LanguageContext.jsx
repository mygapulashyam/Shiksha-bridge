import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const LanguageContext = createContext(null);

const translations = {
  en: {
    welcome: "Welcome back 👋",
    signin_desc: "Sign in to your ShikshaBridge account",
    email: "Email Address",
    password: "Password",
    signin_btn: "Sign In",
    forgot_password: "Forgot Password?",
    forgot_password_title: "Forgot Password? 🔒",
    forgot_password_desc: "No worries! Enter your email below and we'll send you a secure 6-digit OTP code.",
    send_otp: "Send OTP Code",
    verify_title: "Verify Code 🛡️",
    verify_desc: "Enter the 6-digit OTP code sent to your email to verify your identity.",
    verify_btn: "Verify Code",
    reset_title: "Reset Password 🔑",
    reset_desc: "Security verification successful! Set your new password below.",
    new_password: "New Password",
    confirm_password: "Confirm New Password",
    reset_btn: "Reset Password",
    back_signin: "← Back to Sign In",
    cancel_signin: "Cancel & Back to Sign In",
    resend_otp: "Resend OTP Code",
    contact_admin: "Contact your school admin to get access",
    multilingual: "Multilingual Support",
    tagline: "Bridging learning gaps for every student in India's classrooms.",
    f1_title: "Diagnostic Quizzes",
    f1_desc: "Identify learning gaps instantly with concept-wise diagnostics.",
    f2_title: "Smart Recommendations",
    f2_desc: "Rule-based engine assigns the right practice to each student.",
    f3_title: "Track Progress",
    f3_desc: "Teachers see class-wide weak concepts at a glance.",
    signing_in: "⏳ Signing in...",
    sending_otp: "⏳ Sending OTP...",
    verifying: "⏳ Verifying Code...",
    resetting: "⏳ Resetting Password..."
  },
  hi: {
    welcome: "आपका स्वागत है 👋",
    signin_desc: "अपने शिक्षाब्रिज खाते में साइन इन करें",
    email: "ईमेल पता",
    password: "पासवर्ड",
    signin_btn: "साइन इन करें",
    forgot_password: "पासवर्ड भूल गए?",
    forgot_password_title: "पासवर्ड भूल गए? 🔒",
    forgot_password_desc: "चिंता न करें! नीचे अपना ईमेल दर्ज करें और हम आपको एक सुरक्षित 6-अंकीय ओटीपी कोड भेजेंगे।",
    send_otp: "ओटीपी कोड भेजें",
    verify_title: "कोड सत्यापित करें 🛡️",
    verify_desc: "अपनी पहचान सत्यापित करने के लिए अपने ईमेल पर भेजा गया 6-अंकीय ओटीपी कोड दर्ज करें।",
    verify_btn: "सत्यापित करें",
    reset_title: "पासवर्ड रीसेट करें 🔑",
    reset_desc: "सुरक्षा सत्यापन सफल! नीचे अपना नया पासवर्ड सेट करें।",
    new_password: "नया पासवर्ड",
    confirm_password: "नया पासवर्ड पुष्टि करें",
    reset_btn: "पासवर्ड रीसेट करें",
    back_signin: "← साइन इन पर वापस जाएं",
    cancel_signin: "रद्द करें और साइन इन पर वापस जाएं",
    resend_otp: "ओटीपी दोबारा भेजें",
    contact_admin: "पहुंच प्राप्त करने के लिए अपने स्कूल व्यवस्थापक से संपर्क करें",
    multilingual: "बहुभाषी सहायता",
    tagline: "भारत की कक्षाओं में हर छात्र के लिए सीखने के अंतराल को पाटना।",
    f1_title: "निदानात्मक क्विज़",
    f1_desc: "अवधारणा-वार निदान के साथ तुरंत सीखने के अंतराल की पहचान करें।",
    f2_title: "स्मार्ट सिफारिशें",
    f2_desc: "नियम-आधारित इंजन प्रत्येक छात्र को सही अभ्यास प्रदान करता है।",
    f3_title: "प्रगति ट्रैक करें",
    f3_desc: "शिक्षक एक नज़र में कक्षा-व्यापी कमजोर अवधारणाओं को देख सकते हैं।",
    signing_in: "⏳ साइन इन हो रहा है...",
    sending_otp: "⏳ ओटीपी भेजा जा रहा है...",
    verifying: "⏳ कोड सत्यापित किया जा रहा है...",
    resetting: "⏳ पासवर्ड रीसेट हो रहा है..."
  },
  mr: {
    welcome: "तुमचे स्वागत आहे 👋",
    signin_desc: "तुमच्या शिक्षाब्रिज खात्यात लॉग इन करा",
    email: "ईमेल पत्ता",
    password: "पासवर्ड",
    signin_btn: "साइन इन करा",
    forgot_password: "पासवर्ड विसरलात?",
    forgot_password_title: "पासवर्ड विसरलात? 🔒",
    forgot_password_desc: "काळजी करू नका! खाली तुमचा ईमेल प्रविष्ट करा आणि आम्ही तुम्हाला एक सुरक्षित 6-अंकी ओटीपी कोड पाठवू.",
    send_otp: "ओटीपी कोड पाठवा",
    verify_title: "कोड सत्यापित करा 🛡️",
    verify_desc: "तुमची ओळख सत्यापित करण्यासाठी तुमच्या ईमेलवर पाठवलेला 6-अंकी ओटीपी कोड प्रविष्ट करा.",
    verify_btn: "कोड सत्यापित करा",
    reset_title: "पासवर्ड रीसेट करा 🔑",
    reset_desc: "सुरक्षा पडताळणी यशस्वी! खाली तुमचा नवीन पासवर्ड सेट करा.",
    new_password: "नवीन पासवर्ड",
    confirm_password: "नवीन पासवर्डची पुष्टी करा",
    reset_btn: "पासवर्ड रीसेट करा",
    back_signin: "← साइन इनवर परत जा",
    cancel_signin: "रद्द करा आणि साइन इनवर परत जा",
    resend_otp: "ओटीपी पुन्हा पाठवा",
    contact_admin: "प्रवेश मिळवण्यासाठी तुमच्या शाळा प्रशासकाशी संपर्क साधा",
    multilingual: "बहुभाषिक समर्थन",
    tagline: "भारतातील वर्गांमधील प्रत्येक विद्यार्थ्यासाठी शिकण्याची दरी मिटवणे.",
    f1_title: "निदानात्मक चाचण्या",
    f1_desc: "संकल्पना-निहाय निदानासह त्वरित शिकण्याची दरी ओळखा.",
    f2_title: "स्मार्ट शिफारसी",
    f2_desc: "नियम-आधारित इंजिन प्रत्येक विद्यार्थ्याला योग्य सराव नियुक्त करते.",
    f3_title: "प्रगतीचा मागोवा घ्या",
    f3_desc: "शिक्षक एका दृष्टीक्षेपात वर्ग-व्यापी कमकुवत संकल्पना पाहतात.",
    signing_in: "⏳ साइन इन होत आहे...",
    sending_otp: "⏳ ओटीपी पाठवत आहे...",
    verifying: "⏳ कोड सत्यापित होत आहे...",
    resetting: "⏳ पासवर्ड रीसेट होत आहे..."
  },
  ta: {
    welcome: "நல்வரவு 👋",
    signin_desc: "உங்கள் சிக்ஷாபிரிட்ஜ் கணக்கில் உள்நுழையவும்",
    email: "மின்னஞ்சல் முகவரி",
    password: "கடவுச்சொல்",
    signin_btn: "உள்நுழை",
    forgot_password: "கடவுச்சொல் மறந்துவிட்டதா?",
    forgot_password_title: "கடவுச்சொல் மறந்துவிட்டதா? 🔒",
    forgot_password_desc: "கவலைப்பட வேண்டாம்! உங்கள் மின்னஞ்சலை உள்ளிடவும், நாங்கள் உங்களுக்கு 6 இலக்க OTP குறியீட்டை அனுப்புவோம்.",
    send_otp: "OTP குறியீட்டை அனுப்பு",
    verify_title: "குறியீட்டை சரிபார் 🛡️",
    verify_desc: "உங்கள் அடையாளத்தை சரிபார்க்க உங்கள் மின்னஞ்சலுக்கு அனுப்பப்பட்ட 6 இலக்க OTP குறியீட்டை உள்ளிடவும்.",
    verify_btn: "குறியீட்டை சரிபார்",
    reset_title: "கடவுச்சொல்லை மாற்று 🔑",
    reset_desc: "பாதுகாப்பு சரிபார்ப்பு வெற்றி! உங்கள் புதிய கடவுச்சொல்லை கீழே அமைக்கவும்.",
    new_password: "புதிய கடவுச்சொல்",
    confirm_password: "புதிய கடவுச்சொல்லை உறுதிப்படுத்து",
    reset_btn: "கடவுச்சொல்லை மாற்று",
    back_signin: "← உள்நுழைவுக்குச் செல்",
    cancel_signin: "ரத்துசெய்து உள்நுழைவுக்குச் செல்",
    resend_otp: "மீண்டும் OTP அனுப்பு",
    contact_admin: "அனுமதியைப் பெற உங்கள் பள்ளி நிர்வாகியைத் தொடர்பு கொள்ளவும்",
    multilingual: "பல்மொழி ஆதரவு",
    tagline: "இந்திய வகுப்பறைகளில் உள்ள ஒவ்வொரு மாணவருக்குமான கற்றல் இடைவெளிகளைக் குறைத்தல்.",
    f1_title: "கண்டறியும் வினாடி வினாக்கள்",
    f1_desc: "கருத்து வாரியான கண்டறிதல் மூலம் கற்றல் இடைவெளிகளை உடனே கண்டறியவும்.",
    f2_title: "ஸ்மார்ட் பரிந்துரைகள்",
    f2_desc: "விதி அடிப்படையிலான எஞ்சின் ஒவ்வொரு மாணவருக்கும் சரியான பயிற்சியை ஒதுக்குகிறது.",
    f3_title: "முன்னேற்றத்தைக் கண்காணி",
    f3_desc: "ஆசிரியர்கள் வகுப்பு முழுவதுமுள்ள பலவீனமான கருத்துகளை ஒரே பார்வையில் பார்க்க முடியும்.",
    signing_in: "⏳ உள்நுழைகிறது...",
    sending_otp: "⏳ OTP அனுப்பப்படுகிறது...",
    verifying: "⏳ குறியீடு சரிபார்க்கப்படுகிறது...",
    resetting: "⏳ கடவுச்சொல் மாற்றப்படுகிறது..."
  },
  te: {
    welcome: "స్వాగతం 👋",
    signin_desc: "మీ శిక్షాబ్రిడ్జ్ ఖాతాకు లాగిన్ అవ్వండి",
    email: "ఈమెయిల్ చిరునామా",
    password: "పాస్వర్డ్",
    signin_btn: "లాగిన్ అవ్వండి",
    forgot_password: "పాస్వర్డ్ మర్చిపోయారా?",
    forgot_password_title: "పాస్వర్డ్ మర్చిపోయారా? 🔒",
    forgot_password_desc: "ఆందోళన వద్దు! మీ ఈమెయిల్ నమోదు చేయండి, మేము మీకు 6 అంకెల OTP కోడ్‌ని పంపుతాము.",
    send_otp: "OTP కోడ్ పంపండి",
    verify_title: "కోడ్ ధృవీకరించండి 🛡️",
    verify_desc: "మీ గుర్తింపును ధృవీకరించడానికి మీ ఈమెయిల్‌కు పంపిన 6 అంకెల OTP కోడ్‌ను నమోదు చేయండి.",
    verify_btn: "కోడ్ ధృవీకరించండి",
    reset_title: "పాస్వర్డ్ రీసెట్ చేయండి 🔑",
    reset_desc: "భద్రతా ధృవీకరణ విజయవంతమైంది! మీ కొత్త పాస్‌వర్డ్‌ను క్రింద సెట్ చేయండి.",
    new_password: "కొత్త పాస్వర్డ్",
    confirm_password: "కొత్త పాస్వర్డ్ ధృవీకరించండి",
    reset_btn: "పాస్వర్డ్ రీసెట్ చేయండి",
    back_signin: "← లాగిన్‌కు తిరిగి వెళ్ళండి",
    cancel_signin: "రద్దు చేసి లాగిన్‌కు తిరిగి వెళ్ళండి",
    resend_otp: "OTPని మళ్లీ పంపండి",
    contact_admin: "యాక్సెస్ పొందడానికి మీ పాఠశాల అడ్మిన్‌ను సంప్రదించండి",
    multilingual: "బహుభాషా మద్దతు",
    tagline: "భారతీయ తరగతి గదులలోని ప్రతి విద్యార్థి యొక్క అభ్యాస వ్యత్యాసాలను పూరించడం.",
    f1_title: "డయాగ్నస్టిక్ క్విజ్‌లు",
    f1_desc: "భావనల వారీ డయాగ్నస్టిక్స్ తో అభ్యాస వ్యత్యాసాలను తక్షణమే గుర్తించండి.",
    f2_title: "స్మార్ట్ సిఫార్సులు",
    f2_desc: "రూల్ బేస్డ్ ఇంజిన్ ప్రతి విద్యార్థికి సరైన అభ్యాసాన్ని కేటాయిస్తుంది.",
    f3_title: "ప్రగతిని పర్యవేక్షించండి",
    f3_desc: "ఉపాధ్యాయులు తరగతి వ్యాప్తంగా బలహీనమైన భావనలను ఒకే చూపులో చూడగలరు.",
    signing_in: "⏳ లాగిన్ అవుతోంది...",
    sending_otp: "⏳ OTP పంపబడుతోంది...",
    verifying: "⏳ కోడ్ ధృవీకరించబడుతోంది...",
    resetting: "⏳ పాస్వర్డ్ రీసెట్ చేయబడుతోంది..."
  },
  kn: {
    welcome: "ಸ್ವಾಗತ 👋",
    signin_desc: "ನಿಮ್ಮ ಶಿಕ್ಷಾಬ್ರಿಡ್ಜ್ ಖಾತೆಗೆ ಲಾಗಿನ್ ಮಾಡಿ",
    email: "ಇಮೇಲ್ ವಿಳಾಸ",
    password: "ಪಾಸ್ವರ್ಡ್",
    signin_btn: "ಲಾಗಿನ್ ಮಾಡಿ",
    forgot_password: "ಪಾಸ್ವರ್ಡ್ ಮರೆತಿರಾ?",
    forgot_password_title: "ಪಾಸ್ವರ್ಡ್ ಮರೆತಿರಾ? 🔒",
    forgot_password_desc: "ಚಿಂತಿಸಬೇಡಿ! ನಿಮ್ಮ ಇಮೇಲ್ ನಮೂದಿಸಿ, ನಾವು ನಿಮಗೆ 6 ಅಂಕಿಯ OTP ಕೋಡ್ ಕಳುಹಿಸುತ್ತೇವೆ.",
    send_otp: "OTP ಕೋಡ್ ಕಳುಹಿಸಿ",
    verify_title: "ಕೋಡ್ ಪರಿಶೀಲಿಸಿ 🛡️",
    verify_desc: "ನಿಮ್ಮ ಗುರುತನ್ನು ಪರಿಶೀಲಿಸಲು ನಿಮ್ಮ ಇಮೇಲ್‌ಗೆ ಕಳುಹಿಸಲಾದ 6 ಅಂಕಿಯ OTP ಕೋಡ್ ಅನ್ನು ನಮೂದಿಸಿ.",
    verify_btn: "ಕೋಡ್ ಪರಿಶೀಲಿಸಿ",
    reset_title: "ಪಾಸ್ವರ್ಡ್ ರಿಸೆಟ್ ಮಾಡಿ 🔑",
    reset_desc: "ಭದ್ರತಾ ಪರಿಶೀಲನೆ ಯಶಸ್ವಿಯಾಗಿದೆ! ನಿಮ್ಮ ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ ಅನ್ನು ಕೆಳಗೆ ಹೊಂದಿಸಿ.",
    new_password: "ಹೊಸ ಪಾಸ್ವರ್ಡ್",
    confirm_password: "ಹೊಸ ಪಾಸ್ವರ್ಡ್ ದೃಢೀಕರಿಸಿ",
    reset_btn: "ಪಾಸ್ವರ್ಡ್ ರಿಸೆಟ್ ಮಾಡಿ",
    back_signin: "← ಲಾಗಿನ್‌ಗೆ ಹಿಂತಿರುಗಿ",
    cancel_signin: "ರದ್ದುಗೊಳಿಸಿ ಮತ್ತು ಲಾಗಿನ್‌ಗೆ ಹಿಂತಿರುಗಿ",
    resend_otp: "OTP ಅನ್ನು ಮತ್ತೊಮ್ಮೆ ಕಳುಹಿಸಿ",
    contact_admin: "ಪ್ರವೇಶ ಪಡೆಯಲು ನಿಮ್ಮ ಶಾಲಾ ನಿರ್ವಾಹಕರನ್ನು ಸಂಪರ್ಕಿಸಿ",
    multilingual: "ಬಹುಭಾಷಾ ಬೆಂಬಲ",
    tagline: "ಭಾರತೀಯ ತರಗತಿ ಕೊಠಡಿಗಳಲ್ಲಿ ಪ್ರತಿ ವಿದ್ಯಾರ್ಥಿಯ ಕಲಿಕೆಯ ಅಂತರವನ್ನು ನಿವಾರಿಸುವುದು.",
    f1_title: "ಡಯಾಗ್ನೋಸ್ಟಿಕ್ ರಸಪ್ರಶ್ನೆಗಳು",
    f1_desc: "ಪರಿಕಲ್ಪನೆ ಆಧಾರಿತ ರಸಪ್ರಶ್ನೆಗಳ ಮೂಲಕ ಕಲಿಕೆಯ ಅಂತರವನ್ನು ತಕ್ಷಣ ಗುರುತಿಸಿ.",
    f2_title: "ಸ್ಮಾರ್ಟ್ ಶಿಫಾರಸುಗಳು",
    f2_desc: "ನಿಯಮ ಆಧಾರಿತ ಎಂಜಿನ್ ಪ್ರತಿ ವಿದ್ಯಾರ್ಥಿಗೆ ಸರಿಯಾದ ಅಭ್ಯಾಸವನ್ನು ನಿಯೋಜಿಸುತ್ತದೆ.",
    f3_title: "ಪ್ರಗತಿಯನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ",
    f3_desc: "ಶಿಕ್ಷಕರು ಇಡೀ ತರಗತಿಯ ದೌರ್ಬಲ್ಯಗಳನ್ನು ಒಂದೇ ನೋಟದಲ್ಲಿ ನೋಡಬಹುದು.",
    signing_in: "⏳ ಲಾಗಿನ್ ಆಗುತ್ತಿದೆ...",
    sending_otp: "⏳ OTP ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ...",
    verifying: "⏳ ಕೋಡ್ ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...",
    resetting: "⏳ ಪಾಸ್ವರ್ಡ್ ರಿಸೆಟ್ ಮಾಡಲಾಗುತ್ತಿದೆ..."
  },
  bn: {
    welcome: "স্বাগতম 👋",
    signin_desc: "আপনার শিক্ষা ব্রিজ অ্যাকাউন্টে সাইন ইন করুন",
    email: "ইমেল ঠিকানা",
    password: "পাসওয়ার্ড",
    signin_btn: "সাইন ইন করুন",
    forgot_password: "পাসওয়ার্ড ভুলে গেছেন?",
    forgot_password_title: "পাসওয়ার্ড ভুলে গেছেন? 🔒",
    forgot_password_desc: "চিন্তা করবেন না! নিচে আপনার ইমেল লিখুন এবং আমরা আপনাকে একটি ৬-সংখ্যার ওটিপি পাঠাবো।",
    send_otp: "ওটিপি পাঠান",
    verify_title: "কোড যাচাই করুন 🛡️",
    verify_desc: "আপনার পরিচয় যাচাই করতে আপনার ইমেলে পাঠানো ৬-সংখ্যার ওটিপি কোডটি লিখুন।",
    verify_btn: "কোড যাচাই করুন",
    reset_title: "পাসওয়ার্ড রিসেট করুন 🔑",
    reset_desc: "সুরক্ষা যাচাইকরণ সফল! নিচে আপনার নতুন পাসওয়ার্ড সেট করুন।",
    new_password: "নতুন পাসওয়ার্ড",
    confirm_password: "নতুন পাসওয়ার্ড নিশ্চিত করুন",
    reset_btn: "পাসওয়ার্ড রিসেট করুন",
    back_signin: "← সাইন ইন এ ফিরে যান",
    cancel_signin: "বাতিল করুন এবং সাইন ইন এ ফিরে যান",
    resend_otp: "ওটিপি আবার পাঠান",
    contact_admin: "অ্যাক্সেস পেতে আপনার স্কুল অ্যাডমিনের সাথে যোগাযোগ করুন",
    multilingual: "বহুভাষী সমর্থন",
    tagline: "ভারতের ক্লাসরুমগুলিতে প্রতিটি শিক্ষার্থীর শেখার ঘাটতি দূর করা।",
    f1_title: "ডায়াগনস্টিক কুইজ",
    f1_desc: "ধারণা-ভিত্তিক ডায়াগনস্টিকসের সাথে অবিলম্বে শেখার ঘাটতি চিহ্নিত করুন।",
    f2_title: "স্মার্ট সুপারিশ",
    f2_desc: "নিয়ম-ভিত্তিক ইঞ্জিন প্রতিটি শিক্ষার্থীকে সঠিক অনুশীলন বরাদ্দ করে।",
    f3_title: "অগ্রগতি ট্র্যাক করুন",
    f3_desc: "শিক্ষকরা এক নজরে পুরো ক্লাসের দুর্বল ধারণাগুলি দেখতে পান।",
    signing_in: "⏳ সাইন ইন হচ্ছে...",
    sending_otp: "⏳ ওটিপি পাঠানো হচ্ছে...",
    verifying: "⏳ কোড যাচাই করা হচ্ছে...",
    resetting: "⏳ পাসওয়ার্ড রিসেট হচ্ছে..."
  }
};

export const languagesList = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी (Hindi)' },
  { code: 'mr', label: 'मराठी (Marathi)' },
  { code: 'ta', label: 'தமிழ் (Tamil)' },
  { code: 'te', label: 'తెలుగు (Telugu)' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
  { code: 'bn', label: 'বাংলা (Bengali)' }
];

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setLanguageState] = useState(() => {
    // Check local storage first
    const stored = localStorage.getItem('sb_lang');
    if (stored) return stored;
    
    // Check if user object has preferences saved
    const userStr = localStorage.getItem('sb_user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        if (u.language) return u.language;
      } catch (e) {}
    }
    
    return 'en';
  });

  const changeLanguage = async (langCode) => {
    if (!translations[langCode]) return;
    setLanguageState(langCode);
    localStorage.setItem('sb_lang', langCode);
    
    // Proactively sync preference with the backend profile if logged in
    const token = localStorage.getItem('sb_token');
    if (token) {
      try {
        await api.put('/auth/profile', { language: langCode });
        // Sync user in localStorage
        const userStr = localStorage.getItem('sb_user');
        if (userStr) {
          const u = JSON.parse(userStr);
          u.language = langCode;
          localStorage.setItem('sb_user', JSON.stringify(u));
        }
      } catch (e) {
        console.error('Failed to sync language preference with backend:', e);
      }
    }
  };

  const t = (key) => {
    const langDict = translations[currentLanguage] || translations['en'];
    return langDict[key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
};
