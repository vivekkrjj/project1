# Student ID Card QR

The approved student's ID Card now generates a QR code automatically.

Scanning the QR opens `verify.html` and shows:
- Name
- Course
- Roll Number
- Registration ID
- Date of Birth
- Email
- Mobile
- Approval Status

The QR page is static and uses the details encoded when the ID card is generated, so it does not require a public Supabase table query.

Privacy note: anyone who can scan the ID card can read the details encoded in the QR.
