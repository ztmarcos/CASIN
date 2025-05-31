# 📧 Newsletter Setup Guide

## 1. Create .env file

Create a `.env` file in your project root with:

```env
# Email Configuration
EMAIL_USER=casindb46@gmail.com
EMAIL_PASS=your_gmail_app_password_here
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587

# Test recipient
TEST_EMAIL=ztmarcos@gmail.com
```

## 2. Gmail App Password Setup

1. Go to your Google Account settings
2. Enable 2-factor authentication if not already enabled
3. Go to Security → App passwords
4. Generate a new app password for "Mail"
5. Use this password (not your regular Gmail password) in the .env file

## 3. Usage

### Send Test Newsletter
```bash
node newsletter-script.js
```

### Use in Code
```javascript
const { NewsletterService } = require('./newsletter-script');

const newsletter = new NewsletterService();

// Send to single recipient
await newsletter.sendNewsletter(content, 'recipient@email.com');

// Send to multiple recipients
await newsletter.sendNewsletter(content, ['email1@domain.com', 'email2@domain.com']);

// Send test email
await newsletter.sendTestNewsletter(content);
```

## 4. Content Format

Edit `docs/newsletter1` with markdown content:

```markdown
# Header 1
## Header 2  
### Header 3

**Bold text**
*Italic text*

- Bullet point
- Another point

1. Numbered list
2. Second item

---

Horizontal rule above
```

## 5. Features

✅ HTML and plain text versions  
✅ Beautiful email styling with colors and formatting  
✅ Responsive design for mobile  
✅ Error handling and connection verification  
✅ Support for markdown formatting  
✅ Professional email template with CASIN branding  

## 6. Troubleshooting

- **Authentication failed**: Check your app password
- **Connection refused**: Verify EMAIL_HOST and EMAIL_PORT
- **File not found**: Make sure `docs/newsletter1` exists
- **HTML not rendering**: Some email clients prefer plain text 