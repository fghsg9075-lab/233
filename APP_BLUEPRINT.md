# 📱 NST AI App - Comprehensive Blueprint & User Guide

This document outlines the entire structure of the application, detailing every feature available for Students and Admins, where to find them, and how to use them.

---

## 🎓 1. Student App (The Learning Interface)
*Designed for simplicity and focus.*

### **🏠 Home Dashboard**
*   **Subject Cards:** Colorful cards for each subject (Physics, Math, etc.). Tapping one opens the **Chapter List**.
*   **Marquee Notice Board:** A scrolling bar at the top showing important announcements (managed by Admin).
*   **Support Button:** A "Headphone" icon at the top right.
    *   *Action:* Opens the user's email app to send a direct email to `nadim841442@gmail.com`.
*   **Featured Shortcuts:** Quick access buttons (e.g., "Daily Test", "New Video") configurable by Admin.

### **📚 Study Interface (Inside a Chapter)**
Once a student selects a chapter, they see three tabs:
1.  **PDF (Notes):**
    *   View Free or Premium PDF notes.
    *   *Premium Feature:* If a file is "Ultra Premium", it might cost Coins to open.
2.  **Video (Lectures):**
    *   Watch video lectures (YouTube/Drive).
    *   *Premium Feature:* Paid videos require Coins.
3.  **Practice (MCQ):**
    *   Take practice quizzes.
    *   **"Ans" Button:** Reveals the answer and explanation (costs Coins).

### **📊 Results & Marksheet**
*   **Location:** Bottom Navigation Bar -> "Results" icon.
*   **Features:**
    *   Shows history of all MCQ tests taken.
    *   **Share Button:** Generates a professional image of the result to share on WhatsApp.
    *   **Pagination:** easy navigation through history.

### **🎡 Spin Wheel (Gamification)**
*   **Location:** Bottom Navigation Bar -> "Game" icon.
*   **Features:**
    *   Spin to win **Coins** or **Subscriptions**.
    *   **Limits:** Daily spin limits based on user tier (Free vs. Premium).

### **👤 Profile & Settings**
*   **Location:** Bottom Navigation Bar -> "Profile" icon.
*   **Features:**
    *   View Credits balance.
    *   View Subscription Status (Free, Weekly, Monthly, etc.).
    *   **Referral Code:** Share code to earn bonuses.

---

## 🛠️ 2. Admin Panel (The Control Center)
*Where you manage everything.*

### **📍 Dashboard Overview**
The Admin Dashboard is a grid of cards. Here is what each one does:

#### **👥 User Management**
*   **Users:** View all registered students.
    *   *Edit User:* Change password, add credits manually.
    *   *Message:* Send a direct popup message to a specific student.
    *   *Delete:* Remove a user.
*   **Subscriptions:** See who has paid plans.
    *   *Grant:* Manually give a student a plan (e.g., "Give Rohan 1 Month Free").

#### **📝 Content Management (The Core)**
*   **Subjects Manager:** Add new subjects (e.g., "Biology", "History") and choose their icons.
*   **Syllabus Manager:** Create Chapters for a subject.
    *   *Lock/Unlock:* You can lock specific chapters so students can't open them yet.
*   **Content Managers (3 Types):**
    *   **PDF Material:** Paste Google Drive links for Notes.
        *   *Watermark Designer:* Add a dynamic watermark (e.g., Student's Name/Phone) to PDFs to prevent piracy.
    *   **Video Lectures:** Paste YouTube links. Set prices (0 for Free).
    *   **Practice MCQs:** Add questions manually or import from Excel.
        *   *AI Generator:* Click "Generate with AI" to automatically create questions for a topic.

#### **⚡ Bulk Tools (Time Savers)**
*   **Bulk Upload:** The fastest way to add content.
    1.  Select Subject.
    2.  You see a list of ALL chapters.
    3.  Paste PDF links next to them.
    4.  Click **"Save & Sync"**. *All students get the update instantly without an app update.*
*   **Google Sheet Import:** In MCQ/Test sections, you can paste 100s of questions directly from Excel.

#### **⚙️ Configuration (Settings)**
*   **General:** Change App Name, Logo, Scrolling Notice Text.
*   **Payment:** Enable/Disable "Buy" buttons. Set UPI ID.
*   **Game:** Configure Spin Wheel prizes (e.g., set probability of winning).
*   **Security:** Change Admin Password.
*   **Ads:** Enable a startup popup ad (e.g., "Join our Telegram").

#### **🚀 Deployment**
*   **Deploy App:**
    *   **Download Source (ZIP):** Click this after making changes. It gives you a ZIP file.
    *   **Upload to Vercel:** Upload this ZIP to Vercel to publish the changes to the web.
    *   *Note:* Simple data changes (like adding a PDF link) do **not** require redeploying. They sync automatically via Firebase.

---

## 📋 3. Common Workflows (How-To)

### **Scenario A: I want to add a new Chapter with Notes.**
1.  Go to **Admin** -> **Syllabus Manager**.
2.  Select Class & Subject.
3.  Click **"+ Add Chapter"**, name it (e.g., "Force & Motion"). Click Save.
4.  Go back to Dashboard -> **Bulk Upload**.
5.  Select Class & Subject.
6.  Find "Force & Motion" in the list.
7.  Paste your PDF Link in the "Premium Link" box.
8.  Click **Save**. *Done! Students can see it immediately.*

### **Scenario B: I want to run a Weekly Test.**
1.  Go to **Admin** -> **Weekly Tests**.
2.  Enter Test Name (e.g., "Sunday Physics Test").
3.  Set Duration (e.g., 60 mins).
4.  **Add Questions:**
    *   Option 1: Type manually.
    *   Option 2: Paste from Excel.
    *   Option 3: Use AI ("Generate 20 hard Physics questions").
5.  Click **Create Weekly Test**.
6.  The test will appear in the "Test Series" section of the Student App.

### **Scenario C: A student forgot their password.**
1.  Go to **Admin** -> **Users**.
2.  Search for the student's name.
3.  Click **Edit**.
4.  Type a new password in the "Password" box.
5.  Click **Save**. Tell the student the new password.

### **Scenario D: I want to disable the Chat/Support.**
1.  Go to **Admin** -> **General Config**.
2.  Find **Support Chat Cost**.
    *   Set it to a high number to discourage use, OR
    *   (New Update) The Chat tab is already replaced by Email Support. You can change the Support Email in settings.

---

## 🔄 Sync vs. Deploy
*   **Sync (Instant):** Adding chapters, PDF links, Videos, MCQs, Notices, changing Settings. *No new ZIP needed.*
*   **Deploy (ZIP):** Changing the App Icon, fundamental code logic, or if the "Sync" isn't showing up for some reason.

