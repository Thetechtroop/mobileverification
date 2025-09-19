# Mobile OTP Verification System

A modern web application for mobile number verification using OTP (One-Time Password) with a clean, responsive UI.

## Features

- **Modern UI/UX**: Clean, responsive design with smooth animations
- **Mobile Number Validation**: Indian mobile number format validation (+91)
- **OTP Generation**: 6-digit OTP generation with expiry
- **Rate Limiting**: Protection against abuse and spam
- **Error Handling**: Comprehensive error messages and validation
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Backend API**: RESTful API for OTP generation and verification
- **Security**: Rate limiting, OTP expiry, and attempt limits

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Security**: express-rate-limit for API protection

## Installation

1. **Clone or download the project files**

2. **Install backend dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```
   Or for development with auto-restart:
   ```bash
   npm run dev
   ```

4. **Open your browser and navigate to:**
   ```
   http://localhost:3000
   ```

## API Endpoints

### Send OTP
- **POST** `/api/send-otp`
- **Body**: `{ "mobileNumber": "9876543210" }`
- **Rate Limit**: 5 requests per 15 minutes per IP

### Verify OTP
- **POST** `/api/verify-otp`
- **Body**: `{ "mobileNumber": "9876543210", "otp": "123456" }`
- **Rate Limit**: 10 requests per 15 minutes per IP

### Health Check
- **GET** `/api/health`

## Usage

1. **Enter Mobile Number**: Input a valid 10-digit Indian mobile number
2. **Send OTP**: Click "Send OTP" to receive the verification code
3. **Enter OTP**: Input the 6-digit OTP received on your mobile
4. **Verify**: Click "Verify OTP" to complete verification
5. **Success**: View success message upon successful verification

## Security Features

- **Rate Limiting**: Prevents abuse and spam attacks
- **OTP Expiry**: OTPs expire after 5 minutes
- **Attempt Limits**: Maximum 3 verification attempts per OTP
- **Input Validation**: Server-side validation for all inputs
- **CORS Protection**: Configured for cross-origin requests

## Customization

### Changing OTP Expiry Time
Modify the `otpExpiryTime` variable in `script.js` (frontend) and the expiry time in `server.js` (backend).

### Updating Mobile Number Format
Update the `validateMobileNumber` function in `server.js` to support different country formats.

### SMS Service Integration
Replace the `simulateSMSService` function in `server.js` with actual SMS provider integration (Twilio, Amazon SNS, etc.)

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development

### Project Structure
```
project/
├── index.html          # Main HTML file
├── styles.css          # CSS styles
├── script.js           # Frontend JavaScript
├── server.js           # Backend server
├── package.json        # Node.js dependencies
└── README.md          # This file
```

### Adding SMS Service Integration

To integrate with a real SMS service, modify the `simulateSMSService` function in `server.js`:

```javascript
// Example with Twilio
const twilio = require('twilio');
const client = twilio(accountSid, authToken);

function sendSMS(mobileNumber, otp) {
    return client.messages.create({
        body: `Your verification code is: ${otp}`,
        from: '+1234567890', // Your Twilio number
        to: `+91${mobileNumber}`
    });
}
```

## License

MIT License - feel free to use this project for your own applications.

## Support

For issues and questions, please check the code comments and error messages first. The application includes comprehensive error handling and logging.